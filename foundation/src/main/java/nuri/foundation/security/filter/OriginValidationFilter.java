package nuri.foundation.security.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.net.URI;
import java.util.List;
import java.util.Set;

/**
 * Filter reinforcing Zero-Trust Origin & Referer validation on state-changing requests.
 */
@Slf4j
public class OriginValidationFilter extends OncePerRequestFilter {

    private static final Set<String> STATE_CHANGING_METHODS = Set.of("POST", "PUT", "DELETE", "PATCH");

    private final List<String> allowedOrigins;

    public OriginValidationFilter(List<String> allowedOrigins) {
        this.allowedOrigins = allowedOrigins != null ? allowedOrigins : List.of();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String method = request.getMethod();

        if (STATE_CHANGING_METHODS.contains(method.toUpperCase())) {
            String origin = request.getHeader("Origin");
            String referer = request.getHeader("Referer");

            String source = origin;
            if ((source == null || source.isBlank()) && referer != null && !referer.isBlank()) {
                try {
                    URI refererUri = new URI(referer.trim());
                    String scheme = refererUri.getScheme();
                    String authority = refererUri.getAuthority();
                    if (scheme == null || authority == null || authority.isBlank()
                            || (!"http".equalsIgnoreCase(scheme) && !"https".equalsIgnoreCase(scheme))) {
                        log.warn(">>> [OriginValidationFilter] Blocked invalid Referer scheme/authority for URI: {}",
                                nuri.foundation.security.util.SafeLog.text(request.getRequestURI()));
                        rejectInvalidOrigin(response);
                        return;
                    }
                    source = scheme + "://" + authority;
                } catch (Exception e) {
                    log.warn(">>> [OriginValidationFilter] Blocked malformed Referer header for URI: {}",
                            nuri.foundation.security.util.SafeLog.text(request.getRequestURI()));
                    rejectInvalidOrigin(response);
                    return;
                }
            }

            if (source != null && !source.isBlank() && !isAllowedOrigin(source, request)) {
                log.warn(">>> [OriginValidationFilter] Blocked state-changing request with invalid origin/referer for URI: {}",
                        nuri.foundation.security.util.SafeLog.text(request.getRequestURI()));
                rejectInvalidOrigin(response);
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private static void rejectInvalidOrigin(HttpServletResponse response) throws IOException {
        response.setStatus(HttpStatus.FORBIDDEN.value());
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write(
                "{\"success\":false,\"status\":403,\"code\":\"INVALID_ORIGIN\",\"message\":\"Access denied: untrusted Origin or Referer header\"}");
    }

    private boolean isAllowedOrigin(String sourceOrigin, HttpServletRequest request) {
        if (allowedOrigins.contains("*")) {
            return true;
        }

        // Check configured allowed origins
        for (String allowed : allowedOrigins) {
            if (allowed.equalsIgnoreCase(sourceOrigin)) {
                return true;
            }
        }

        // Check if same origin as request host
        String serverName = request.getServerName();
        int serverPort = request.getServerPort();
        String httpScheme = request.getScheme();

        boolean isDefaultPort = ("http".equalsIgnoreCase(httpScheme) && serverPort == 80)
                || ("https".equalsIgnoreCase(httpScheme) && serverPort == 443);
        String sameOriginHttp = httpScheme + "://" + serverName + (isDefaultPort ? "" : ":" + serverPort);
        if (sameOriginHttp.equalsIgnoreCase(sourceOrigin)) {
            return true;
        }

        // Localhost / 127.0.0.1 equivalence for dev/test.
        // 부분문자열(contains) 비교는 `https://localhost.attacker.com` 같은 접미사 도메인을 통과시키므로
        // Origin 을 파싱해 host 를 정확히 비교한다.
        String sourceHost = extractHost(sourceOrigin);
        return isLoopback(sourceHost) && isLoopback(serverName);
    }

    /** Origin/Referer 문자열에서 host 만 추출한다. 파싱 불가 시 null. */
    private String extractHost(String origin) {
        try {
            return URI.create(origin).getHost();
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private boolean isLoopback(String host) {
        return "localhost".equalsIgnoreCase(host) || "127.0.0.1".equals(host) || "[::1]".equals(host)
                || "::1".equals(host);
    }
}
