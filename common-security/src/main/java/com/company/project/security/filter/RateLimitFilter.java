package com.company.project.security.filter;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Enterprise Rate Limiting Filter
 * Limits requests per IP address to prevent brute-force and DoS attacks.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RateLimitFilter implements Filter {

    private static final int MAX_REQUESTS_PER_MINUTE = 200;
    private final Map<String, UserRequests> requestCache = new ConcurrentHashMap<>();

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        
        if (!(request instanceof HttpServletRequest httpRequest)) {
            chain.doFilter(request, response);
            return;
        }

        String clientIp = getClientIp(httpRequest);
        long currentTime = System.currentTimeMillis();

        UserRequests userRequests = requestCache.compute(clientIp, (key, value) -> {
            if (value == null || (currentTime - value.startTime) > 60000) {
                return new UserRequests(currentTime, new AtomicInteger(1));
            }
            value.count.incrementAndGet();
            return value;
        });

        if (userRequests.count.get() > MAX_REQUESTS_PER_MINUTE) {
            HttpServletResponse httpResponse = (HttpServletResponse) response;
            httpResponse.setStatus(429); // Too Many Requests
            httpResponse.setContentType("application/json;charset=UTF-8");
            httpResponse.getWriter().write("{\"success\":false,\"code\":\"C429\",\"message\":\"Rate limit exceeded. Please try again after 1 minute.\"}");
            return;
        }

        chain.doFilter(request, response);
    }

    private String getClientIp(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isEmpty()) {
            return xf.split(",")[0];
        }
        return request.getRemoteAddr();
    }

    private static class UserRequests {
        private final long startTime;
        private final AtomicInteger count;

        public UserRequests(long startTime, AtomicInteger count) {
            this.startTime = startTime;
            this.count = count;
        }
    }
}
