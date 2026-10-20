package nuri.config.websocket;

import tools.jackson.databind.json.JsonMapper;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.security.jwt.JwtTokenProvider;
import nuri.foundation.security.service.CustomUserDetails;
import org.springframework.http.server.PathContainer;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.authentication.AccountStatusUserDetailsChecker;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.AuthenticationServiceException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UserDetailsChecker;
import org.springframework.security.web.authentication.AuthenticationConverter;
import org.springframework.security.web.authentication.AuthenticationFilter;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.web.util.pattern.PathPattern;
import org.springframework.web.util.pattern.PathPatternParser;

/**
 * Browser SockJS authentication reads HttpOnly cookies only on the explicitly supported transport paths.
 *
 * <p>Spring Security 의 표준 인증 파이프라인을 쓴다 — 전송 경로 매처가 대상을 고르고, 변환기가 Origin 과 자격을 읽고,
 * 인증 제공자가 토큰·주체·계정 상태를 판정한다. 성공하면 필터가 새 보안 컨텍스트를 저장하고 전송을 잇고, 실패하면
 * 컨텍스트를 비운 뒤 실패 처리기가 응답을 쓴다(Origin 403, 자격 401, 인증 저장소 장애 503).
 */
public final class WebSocketCookieAuthenticationFilter extends AuthenticationFilter {

    private static final JsonMapper JSON = JsonMapper.builder().configureForJackson2().build(); // 거절 본문 형식 유지(ADR-0024)
    private static final List<PathPattern> GET_PATHS = patterns(List.of(
            "/ws", "/ws/info", "/ws/websocket", "/ws/{server}/{session}/websocket"));
    private static final List<PathPattern> POST_PATHS = patterns(List.of(
            "/ws/{server}/{session}/xhr", "/ws/{server}/{session}/xhr_streaming", "/ws/{server}/{session}/xhr_send"));

    public WebSocketCookieAuthenticationFilter(JwtTokenProvider tokens, List<String> allowedOrigins) {
        super(tokenAuthentication(tokens), new TransportCredentials(tokens, explicitOrigins(allowedOrigins)));
        setRequestMatcher(TRANSPORTS);
        setSuccessHandler((request, response, authentication) -> { });
        setFailureHandler(WebSocketCookieAuthenticationFilter::reject);
    }

    private static final RequestMatcher TRANSPORTS = request -> {
        PathContainer path = PathContainer.parsePath(path(request));
        String method = request.getMethod();
        List<PathPattern> allowed = "GET".equals(method) || "HEAD".equals(method) ? GET_PATHS
                : "POST".equals(method) ? POST_PATHS : List.of();
        return allowed.stream().anyMatch(pattern -> pattern.matches(path));
    };

    private static List<String> explicitOrigins(List<String> allowedOrigins) {
        List<String> origins = allowedOrigins == null ? List.of()
                : allowedOrigins.stream().map(String::trim).filter(origin -> !origin.isEmpty()).toList();
        if (origins.isEmpty() || origins.contains("*")) {
            throw new IllegalArgumentException("WebSocket origins must be an explicit allow-list");
        }
        return origins;
    }

    private static ProviderManager tokenAuthentication(JwtTokenProvider tokens) {
        ProviderManager manager = new ProviderManager(new TokenVerification(tokens));
        // 검증된 인증 객체를 그대로 컨텍스트에 둔다 — 공유될 수 있는 주체의 자격 필드를 지우지 않는다.
        manager.setEraseCredentialsAfterAuthentication(false);
        return manager;
    }

    /** Origin 을 먼저 보고, 헤더가 있으면 헤더만, 없으면 하나뿐인 accessToken 쿠키만 자격으로 읽는다. */
    private record TransportCredentials(JwtTokenProvider tokens, List<String> allowedOrigins)
            implements AuthenticationConverter {

        @Override
        public Authentication convert(HttpServletRequest request) {
            if (!validOrigin(request)) {
                throw new OriginRejected();
            }
            String token = request.getHeader("Authorization") != null ? tokens.resolveToken(request) : cookieToken(request);
            if (token == null) {
                throw new BadCredentialsException("Missing transport credentials");
            }
            return new TransportCredential(token);
        }

        private boolean validOrigin(HttpServletRequest request) {
            List<String> origins = Collections.list(request.getHeaders("Origin"));
            if (origins.size() == 1) return allowedOrigins.contains(origins.get(0));
            if (!origins.isEmpty()) return false;
            // Browser same-origin GET /info need not send Origin. These two paths contain no user messages;
            // cookie authentication is still mandatory. Every data-bearing transport requires allowed Origin.
            return ("GET".equals(request.getMethod()) || "HEAD".equals(request.getMethod()))
                    && ("/ws/info".equals(path(request)) || "/ws".equals(path(request)))
                    && !"cross-site".equals(request.getHeader("Sec-Fetch-Site"));
        }

        private static String cookieToken(HttpServletRequest request) {
            Cookie[] cookies = request.getCookies();
            if (cookies == null) return null;
            List<Cookie> access = Arrays.stream(cookies).filter(cookie -> "accessToken".equals(cookie.getName())).toList();
            return access.size() == 1 && !access.get(0).getValue().isBlank() ? access.get(0).getValue() : null;
        }
    }

    /** 토큰 서명·만료, 인증 객체·주체 형식, 권한 스냅숏 버전, 계정 상태를 판정한다. */
    private record TokenVerification(JwtTokenProvider tokens) implements AuthenticationProvider {

        private static final UserDetailsChecker ACCOUNT_STATUS = new AccountStatusUserDetailsChecker();

        @Override
        public Authentication authenticate(Authentication credential) {
            Authentication verified = verify((String) credential.getCredentials());
            if (!(verified.getPrincipal() instanceof CustomUserDetails current)
                    || current.getAuthorizationVersion() == null || current.getAuthorizationVersion().isBlank()) {
                throw new BadCredentialsException("Unsupported transport principal");
            }
            ACCOUNT_STATUS.check(current);
            return verified;
        }

        private Authentication verify(String token) {
            try {
                Authentication verified = tokens.validateToken(token) ? tokens.getAuthentication(token) : null;
                if (verified == null || !verified.isAuthenticated()) {
                    throw new BadCredentialsException("Invalid transport token");
                }
                return verified;
            } catch (org.springframework.dao.DataAccessException
                     | org.springframework.transaction.TransactionException unavailable) {
                throw new AuthenticationServiceException("Authentication store unavailable", unavailable);
            } catch (AuthenticationException rejected) {
                throw rejected;
            } catch (RuntimeException rejected) {
                throw new BadCredentialsException("Invalid transport token", rejected);
            }
        }

        @Override
        public boolean supports(Class<?> authentication) {
            return TransportCredential.class.isAssignableFrom(authentication);
        }
    }

    /** 아직 검증하지 않은 전송 자격. */
    private static final class TransportCredential extends AbstractAuthenticationToken {

        private final String token;

        private TransportCredential(String token) {
            super(List.of());
            this.token = token;
        }

        @Override
        public Object getCredentials() {
            return token;
        }

        @Override
        public Object getPrincipal() {
            return null;
        }
    }

    /** 허용 목록 밖의 Origin. 자격을 읽기 전에 거부한다. */
    private static final class OriginRejected extends AuthenticationException {

        private OriginRejected() {
            super("Origin is not allowed for cookie transports");
        }
    }

    private static void reject(HttpServletRequest request, HttpServletResponse response, AuthenticationException failure)
            throws IOException {
        CommonErrorCode error;
        if (failure instanceof OriginRejected) {
            error = CommonErrorCode.ACCESS_DENIED;
        } else if (failure instanceof AuthenticationServiceException) {
            response.setHeader("Retry-After", "5");
            error = CommonErrorCode.SERVER_OVERLOAD;
        } else {
            error = CommonErrorCode.INVALID_TOKEN;
        }
        response.setStatus(error.getStatus().value());
        response.setContentType("application/json;charset=UTF-8");
        JSON.writeValue(response.getWriter(), ApiResponse.error(error));
    }

    private static String path(HttpServletRequest request) {
        return request.getRequestURI().substring(request.getContextPath().length());
    }

    private static List<PathPattern> patterns(List<String> paths) {
        return paths.stream().map(PathPatternParser.defaultInstance::parse).toList();
    }
}
