package nuri.business.security.config;

import nuri.foundation.security.filter.CredentialRequestTargetFilter;
import nuri.foundation.security.filter.OriginValidationFilter;
import nuri.foundation.security.jwt.JwtAuthenticationFilter;
import nuri.foundation.security.jwt.JwtTokenProvider;
import nuri.business.security.service.EgovPasswordEncoder;
import nuri.business.security.service.PasswordEncoders;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity(prePostEnabled = true)
@org.springframework.context.annotation.Profile("!mock-security & !mock-security-test")
@org.springframework.boot.autoconfigure.condition.ConditionalOnMissingClass("nuri.api.config.ApiSecurityConfig")
public class SecurityConfig {
        private final JwtTokenProvider jwtTokenProvider;

        public SecurityConfig(@org.springframework.context.annotation.Lazy JwtTokenProvider jwtTokenProvider) {
                this.jwtTokenProvider = jwtTokenProvider;
        }

        @Bean
        public PasswordEncoder passwordEncoder() {
                return PasswordEncoders.create();
        }

        @Bean
        public EgovPasswordEncoder egovPasswordEncoder() {
                return new EgovPasswordEncoder();
        }

        @Bean
        public org.springframework.security.authentication.AuthenticationManager authenticationManager(org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration authenticationConfiguration) throws Exception {
                return authenticationConfiguration.getAuthenticationManager();
        }

        @Bean
        @org.springframework.core.annotation.Order(2)
        public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
                http
                                .csrf(csrf -> csrf.disable())
                                .sessionManagement(session -> session
                                                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                                .authorizeHttpRequests(auth -> auth
                                                .requestMatchers("/css/**", "/js/**", "/images/**", "/resource/**",
                                                                "/static/**")
                                                .permitAll()
                                                .requestMatchers("/api/v1/**", "/actuator/**").access(
                                                        new nuri.business.security.authorization.OperationAuthorizationManager(
                                                                new nuri.business.security.authorization.PermissionPolicy()))
                                                .requestMatchers("/uat/uia/**", "/auth/**").permitAll()
                                                .requestMatchers("/sym/mms/**").permitAll()      
                                                .requestMatchers("/connection").permitAll()      
                                                .requestMatchers("/WEB-INF/**", "/upload/**").permitAll()
                                                .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                                                .anyRequest().authenticated())
                                .addFilterBefore(new CredentialRequestTargetFilter(),
                                                org.springframework.web.filter.CorsFilter.class)
                                .addFilterBefore(new OriginValidationFilter(java.util.List.of("http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:8080")),
                                                UsernamePasswordAuthenticationFilter.class)
                                .addFilterBefore(new JwtAuthenticationFilter(jwtTokenProvider),  
                                                UsernamePasswordAuthenticationFilter.class);     

                http.headers(headers -> headers
                                .frameOptions(frameOptions -> frameOptions.sameOrigin())
                                .contentTypeOptions(Customizer.withDefaults())
                                .xssProtection(xss -> xss.headerValue(
                                                org.springframework.security.web.header.writers.XXssProtectionHeaderWriter.HeaderValue.ENABLED_MODE_BLOCK))
                                .contentSecurityPolicy(csp -> csp
                                                .policyDirectives("default-src 'self'; " +
                                                                "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
                                                                "style-src 'self' 'unsafe-inline'; " +
                                                                "img-src 'self' data: blob:; " +
                                                                "connect-src 'self' http://localhost:8080 http://localhost:3000 http://localhost:3001; " +
                                                                "frame-ancestors 'self';"))
                                .httpStrictTransportSecurity(hsts -> hsts
                                                .maxAgeInSeconds(31536000L)
                                                .includeSubDomains(true)
                                                .preload(true))
                                .cacheControl(Customizer.withDefaults())
                                .referrerPolicy(referrer -> referrer.policy(
                                                org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN)));

                return http.build();
        }
}
