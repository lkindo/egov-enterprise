package com.company.project.api.config;

import com.company.project.foundation.security.iam.EgovAuthenticationProvider;
import com.company.project.foundation.security.jwt.JwtAuthenticationFilter;
import com.company.project.foundation.security.jwt.JwtTokenProvider;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.context.annotation.Lazy;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.DelegatingPasswordEncoder;
import org.springframework.security.crypto.password.NoOpPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import com.company.project.foundation.security.service.EgovPasswordEncoder;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Configuration
@Profile({"default", "local", "dev", "prod", "security-test", 
    "test & !mock-security-test & !minimal-test-security & !stress-test & !security-vulnerability-test & !bottleneck-test & !security-headers-test"})
@EnableWebSecurity
@Slf4j
public class ApiSecurityConfig {
        private final EgovAuthenticationProvider egovAuthenticationProvider;
        private final JwtTokenProvider jwtTokenProvider;

        public ApiSecurityConfig(@Lazy EgovAuthenticationProvider egovAuthenticationProvider,
                        JwtTokenProvider jwtTokenProvider) {
                this.egovAuthenticationProvider = egovAuthenticationProvider;
                this.jwtTokenProvider = jwtTokenProvider;
        }

        @Bean
        public SecurityContextRepository securityContextRepository() {
                return new HttpSessionSecurityContextRepository();
        }

        @Bean
        public PasswordEncoder passwordEncoder() {
                String encodingId = "bcrypt";
                Map<String, PasswordEncoder> encoders = new HashMap<>();
                encoders.put("bcrypt", new BCryptPasswordEncoder());
                @SuppressWarnings("deprecation")
                PasswordEncoder noOp = NoOpPasswordEncoder.getInstance();
                encoders.put("egov", noOp);
                return new DelegatingPasswordEncoder(encodingId, encoders);
        }

        @Bean
        public EgovPasswordEncoder egovPasswordEncoder() {
                return new EgovPasswordEncoder();
        }

        @Bean
        public CorsConfigurationSource corsConfigurationSource() {
                CorsConfiguration configuration = new CorsConfiguration();
                configuration.setAllowedOrigins(List.of("http://localhost:3000", "http://127.0.0.1:3000",
                                "http://localhost:3001", "http://127.0.0.1:3001"));
                configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
                configuration.setAllowedHeaders(List.of("*"));
                configuration.setAllowCredentials(true);
                UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
                source.registerCorsConfiguration("/**", configuration);
                return source;
        }

        @Bean
        @Order(1)
        public SecurityFilterChain apiSecurityFilterChain(HttpSecurity http) throws Exception {
                http
                                .securityMatcher(AntPathRequestMatcher.antMatcher("/api/v1/**"))
                                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                                .csrf(AbstractHttpConfigurer::disable)
                                .authorizeHttpRequests(auth -> auth
                                                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/v1/health"),
                                                                AntPathRequestMatcher.antMatcher("/api/v1/auth/**"),
                                                                AntPathRequestMatcher.antMatcher("/api/v1/public/**"),
                                                                AntPathRequestMatcher.antMatcher("/api/v1/menus/**"),
                                                                AntPathRequestMatcher.antMatcher("/api/v1/images/**"),
                                                                AntPathRequestMatcher.antMatcher("/api/v1/users/signup"),
                                                                AntPathRequestMatcher.antMatcher("/api/v1/users/check-id"))
                                                .permitAll()
                                                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/v1/admin/**")).hasAnyRole("ADMIN", "SYSTEM")
                                                .anyRequest().authenticated())
                                .exceptionHandling(ex -> ex
                                                .authenticationEntryPoint(
                                                                new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
                                                .accessDeniedHandler((request, response, accessDeniedException) -> {
                                                        log.warn(">>> Access denied to {}: {}", request.getRequestURI(), accessDeniedException.getMessage());
                                                        response.setContentType("application/json;charset=UTF-8");
                                                        response.setStatus(HttpStatus.FORBIDDEN.value());
                                                        response.getWriter().write("{\"success\":false,\"status\":403,\"code\":\"C010\",\"message\":\"Access Denied (CSRF verification failed or Insufficient privileges)\"}");
                                                }))
                                .sessionManagement(session -> session
                                                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                                .addFilterBefore(new JwtAuthenticationFilter(jwtTokenProvider),
                                                UsernamePasswordAuthenticationFilter.class);
                return http.build();
        }

        @Bean
        @Order(2)
        public SecurityFilterChain legacySecurityFilterChain(HttpSecurity http) throws Exception {
                http
                                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                                .csrf(csrf -> csrf
                                                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                                                .ignoringRequestMatchers(AntPathRequestMatcher.antMatcher("/uat/uia/actionLogin.do")))
                                .authorizeHttpRequests(auth -> auth
                                                .requestMatchers(
                                                                AntPathRequestMatcher.antMatcher("/css/**"),
                                                                AntPathRequestMatcher.antMatcher("/js/**"),
                                                                AntPathRequestMatcher.antMatcher("/images/**"),
                                                                AntPathRequestMatcher.antMatcher("/validator.do"),
                                                                AntPathRequestMatcher.antMatcher("/cmm/fms/getImage.do"),
                                                                AntPathRequestMatcher.antMatcher("/uat/uia/egovLoginUsr.do"),
                                                                AntPathRequestMatcher.antMatcher("/uat/uia/actionLogin.do"),
                                                                AntPathRequestMatcher.antMatcher("/uat/uia/actionLogout.do"),
                                                                AntPathRequestMatcher.antMatcher("/ws/**"),
                                                                AntPathRequestMatcher.antMatcher("/index.jsp"),
                                                                AntPathRequestMatcher.antMatcher("/"),
                                                                AntPathRequestMatcher.antMatcher("/uss/olp/qri/**"),
                                                                AntPathRequestMatcher.antMatcher("/favicon.ico"),
                                                                AntPathRequestMatcher.antMatcher("/v3/api-docs/**"),
                                                                AntPathRequestMatcher.antMatcher("/swagger-ui/**"),
                                                                AntPathRequestMatcher.antMatcher("/error"))
                                                .permitAll()
                                                .anyRequest().authenticated())
                                .formLogin(form -> form.disable())
                                .logout(logout -> logout.disable())
                                .exceptionHandling(ex -> ex
                                                .authenticationEntryPoint(
                                                                new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
                                .sessionManagement(session -> session
                                                .sessionCreationPolicy(SessionCreationPolicy.STATELESS));
                return http.build();
        }

        @Bean
        public AuthenticationManager authenticationManager() {
                return new ProviderManager(egovAuthenticationProvider);
        }
}
