package nuri.foundation.security.jwt;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.lang.NonNull;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;

@Slf4j
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;

    private static final String UNAVAILABLE_BODY = "{\"success\":false,\"status\":503,\"code\":\"S002\","
            + "\"message\":\"일시적으로 인증 정보를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.\",\"data\":null}";

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain)
            throws ServletException, IOException {

        String path = nuri.foundation.security.util.SafeLog.text(request.getServletPath());
        String method = nuri.foundation.security.util.SafeLog.text(request.getMethod());

        // 디버깅을 위한 무조건적인 로그 추가
        log.debug(">>> [JwtFilter] Processing request: {} {}", method, path);

        try {
            String token = jwtTokenProvider.resolveToken(request);

            if (token != null) {
                log.debug(">>> [JwtFilter] Found token in header for path: {}", path);
                if (jwtTokenProvider.validateToken(token)) {
                    Authentication auth = jwtTokenProvider.getAuthentication(token);
                    SecurityContextHolder.getContext().setAuthentication(auth);
                    log.debug(">>> [JwtFilter] Successfully authenticated request: {} {}", method, path);
                } else {
                    log.warn(">>> [JwtFilter] Token validation failed for path: {}", path);
                }
            } else {
                // 토큰이 없는 경우 (로그인 등 허용된 경로는 정상, 그 외엔 나중에 401 발생)
                log.debug(">>> [JwtFilter] No token found in request header for path: {}", path);
            }
        } catch (org.springframework.dao.DataAccessException
                | org.springframework.transaction.TransactionException
                | org.springframework.security.authentication.AuthenticationServiceException unavailable) {
            // The token is valid but its identity store is unavailable. An anonymous continuation
            // becomes 401 and makes clients discard a valid session during a transient DB outage.
            SecurityContextHolder.clearContext();
            log.warn(">>> [JwtFilter] Identity store unavailable; request will return 503");
            response.setStatus(HttpServletResponse.SC_SERVICE_UNAVAILABLE);
            response.setHeader("Retry-After", "5");
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write(UNAVAILABLE_BODY);
            return;
        } catch (Exception rejected) {
            SecurityContextHolder.clearContext();
            log.warn(">>> [JwtFilter] Authentication rejected ({})", rejected.getClass().getSimpleName());
        }

        filterChain.doFilter(request, response);
    }
}
