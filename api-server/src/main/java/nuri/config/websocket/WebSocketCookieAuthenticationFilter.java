package nuri.config.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
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
import org.springframework.security.authentication.AccountStatusUserDetailsChecker;
import org.springframework.security.authentication.AuthenticationServiceException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.pattern.PathPattern;
import org.springframework.web.util.pattern.PathPatternParser;

/** Browser SockJS authentication reads HttpOnly cookies only on the explicitly supported transport paths. */
public final class WebSocketCookieAuthenticationFilter extends OncePerRequestFilter {

    private static final ObjectMapper JSON = new ObjectMapper().findAndRegisterModules();
    private static final List<PathPattern> GET_PATHS = patterns(List.of(
            "/ws", "/ws/info", "/ws/websocket", "/ws/{server}/{session}/websocket"));
    private static final List<PathPattern> POST_PATHS = patterns(List.of(
            "/ws/{server}/{session}/xhr", "/ws/{server}/{session}/xhr_streaming", "/ws/{server}/{session}/xhr_send"));

    private final JwtTokenProvider tokens;
    private final List<String> allowedOrigins;

    public WebSocketCookieAuthenticationFilter(JwtTokenProvider tokens, List<String> allowedOrigins) {
        this.tokens = tokens;
        this.allowedOrigins = allowedOrigins == null ? List.of()
                : allowedOrigins.stream().map(String::trim).filter(origin -> !origin.isEmpty()).toList();
        if (this.allowedOrigins.isEmpty() || this.allowedOrigins.contains("*")) {
            throw new IllegalArgumentException("WebSocket origins must be an explicit allow-list");
        }
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        PathContainer path = PathContainer.parsePath(path(request));
        String method = request.getMethod();
        List<PathPattern> allowed = "GET".equals(method) || "HEAD".equals(method) ? GET_PATHS
                : "POST".equals(method) ? POST_PATHS : List.of();
        return allowed.stream().noneMatch(pattern -> pattern.matches(path));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (!validOrigin(request)) {
            reject(response, CommonErrorCode.ACCESS_DENIED);
            return;
        }
        try {
            String token = token(request);
            if (token == null || !tokens.validateToken(token)) {
                reject(response, CommonErrorCode.INVALID_TOKEN);
                return;
            }
            var authentication = tokens.getAuthentication(token);
            if (authentication == null || !authentication.isAuthenticated()
                    || !(authentication.getPrincipal() instanceof CustomUserDetails current)
                    || current.getAuthorizationVersion() == null || current.getAuthorizationVersion().isBlank()) {
                reject(response, CommonErrorCode.INVALID_TOKEN);
                return;
            }
            new AccountStatusUserDetailsChecker().check(current);
            SecurityContextHolder.getContext().setAuthentication(authentication);
        } catch (org.springframework.dao.DataAccessException | org.springframework.transaction.TransactionException
                 | AuthenticationServiceException unavailable) {
            response.setHeader("Retry-After", "5");
            reject(response, CommonErrorCode.SERVER_OVERLOAD);
            return;
        } catch (RuntimeException rejected) {
            reject(response, CommonErrorCode.INVALID_TOKEN);
            return;
        }
        chain.doFilter(request, response);
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

    private String token(HttpServletRequest request) {
        if (request.getHeader("Authorization") != null) return tokens.resolveToken(request);
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return null;
        List<Cookie> access = Arrays.stream(cookies).filter(cookie -> "accessToken".equals(cookie.getName())).toList();
        return access.size() == 1 && !access.get(0).getValue().isBlank() ? access.get(0).getValue() : null;
    }

    private static void reject(HttpServletResponse response, CommonErrorCode error) throws IOException {
        SecurityContextHolder.clearContext();
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
