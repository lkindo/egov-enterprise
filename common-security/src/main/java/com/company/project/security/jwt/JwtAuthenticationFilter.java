package com.company.project.security.jwt;

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

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getServletPath();
        String method = request.getMethod();

        // 디버깅을 위한 무조건적인 로그 추가
        log.debug(">>> [JwtFilter] Processing request: {} {}", method, path);

        try {
            String token = jwtTokenProvider.resolveToken(request);

            if (token != null) {
                log.debug(">>> [JwtFilter] Found token in header for path: {}", path);
                if (jwtTokenProvider.validateToken(token)) {
                    Authentication auth = jwtTokenProvider.getAuthentication(token);
                    SecurityContextHolder.getContext().setAuthentication(auth);
                    log.debug(">>> [JwtFilter] Successfully authenticated user: {}", auth.getName());
                } else {
                    log.warn(">>> [JwtFilter] Token validation failed for path: {}", path);
                }
            } else {
                // 토큰이 없는 경우 (로그인 등 허용된 경로는 정상, 그 외엔 나중에 401 발생)
                log.debug(">>> [JwtFilter] No token found in request header for path: {}", path);
            }
        } catch (Exception e) {
            log.error(">>> [JwtFilter] Error during authentication: {}", e.getMessage(), e);
        }

        filterChain.doFilter(request, response);
    }
}