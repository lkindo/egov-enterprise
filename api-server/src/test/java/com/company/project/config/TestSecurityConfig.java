package com.company.project.config;

import com.company.project.security.jwt.JwtTokenProvider;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import javax.sql.DataSource;

/**
 * ?ŒìŠ¤???˜ê²½??Security ?¤ì •
 * - ëª¨ë“  ?”ì²­ ?ˆìš© (?ŒìŠ¤???©ì´??
 * - ê¸°ì¡´ SecurityConfigë¥??„ì „???€ì²?
 */
@TestConfiguration
public class TestSecurityConfig {
    private final JwtTokenProvider jwtTokenProvider;

    public TestSecurityConfig(JwtTokenProvider jwtTokenProvider) {
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @Bean(name = "egov.dataSource")
    public DataSource egovDataSource(DataSource dataSource) {
        return dataSource;
    }

    @Bean
    @Primary
    public SecurityFilterChain testSecurityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .exceptionHandling(ex -> ex.authenticationEntryPoint(
                        new org.springframework.security.web.authentication.HttpStatusEntryPoint(
                                org.springframework.http.HttpStatus.UNAUTHORIZED)))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/v1/auth/login", "/api/v1/users/signup").permitAll()
                        .requestMatchers("/api/v1/boards/**", "/api/v1/files/**", "/api/v1/users/**").authenticated()
                        .anyRequest().permitAll())
                .addFilterBefore(new com.company.project.security.jwt.JwtAuthenticationFilter(jwtTokenProvider),
                        org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    @Primary
    public PasswordEncoder testPasswordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public org.springframework.security.authentication.AuthenticationManager authenticationManager(
            org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration authenticationConfiguration)
            throws Exception {
        return authenticationConfiguration.getAuthenticationManager();
    }
}
