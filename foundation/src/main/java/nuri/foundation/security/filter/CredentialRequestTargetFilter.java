package nuri.foundation.security.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

/**
 * URL query parameter 이름에 자격증명 계열이 있으면 요청을 조기에 거부한다.
 *
 * <p>query 값은 추출하거나 decode하지 않으며 로그와 응답에도 복제하지 않는다.
 */
public final class CredentialRequestTargetFilter extends OncePerRequestFilter {

    private static final String REJECTION_BODY = "{\"success\":false,\"status\":400,"
            + "\"code\":\"CREDENTIAL_QUERY_NOT_ALLOWED\","
            + "\"message\":\"Credential parameters are not allowed in the URL query\"}";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        if (hasForbiddenOrMalformedQueryName(request.getQueryString())) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write(REJECTION_BODY);
            return;
        }

        filterChain.doFilter(request, response);
    }

    private static boolean hasForbiddenOrMalformedQueryName(String query) {
        if (query == null || query.isEmpty()) {
            return false;
        }

        int segmentStart = 0;
        while (segmentStart <= query.length()) {
            int segmentEnd = query.indexOf('&', segmentStart);
            if (segmentEnd < 0) {
                segmentEnd = query.length();
            }

            int equals = query.indexOf('=', segmentStart);
            int nameEnd = equals >= segmentStart && equals < segmentEnd ? equals : segmentEnd;
            String encodedName = query.substring(segmentStart, nameEnd);
            try {
                String decodedName = URLDecoder.decode(encodedName, StandardCharsets.UTF_8);
                if (CredentialRequestTargetPolicy.isForbiddenName(decodedName)) {
                    return true;
                }
            } catch (IllegalArgumentException malformedEncoding) {
                return true;
            }

            if (segmentEnd == query.length()) {
                return false;
            }
            segmentStart = segmentEnd + 1;
        }
        return false;
    }
}
