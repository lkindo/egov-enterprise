package nuri.api.config;

import nuri.business.security.iam.EgovAuthenticationProvider;
import nuri.foundation.security.jwt.JwtAuthenticationFilter;
import nuri.foundation.security.jwt.JwtTokenProvider;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
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
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.DelegatingPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import nuri.business.security.service.EgovPasswordEncoder;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Configuration
@Profile("!mock-security & !mock-security-test & (default | local | dev | prod | security-test | e2e | test)")
@EnableWebSecurity
@org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity(prePostEnabled = true)
@Slf4j
public class ApiSecurityConfig {
        private final JwtTokenProvider jwtTokenProvider;

        public ApiSecurityConfig(JwtTokenProvider jwtTokenProvider) {
                this.jwtTokenProvider = jwtTokenProvider;
        }

        @Bean
        public PasswordEncoder passwordEncoder() {
                String encodingId = "bcrypt";
                Map<String, PasswordEncoder> encoders = new HashMap<>();
                encoders.put("bcrypt", new BCryptPasswordEncoder());
                return new DelegatingPasswordEncoder(encodingId, encoders);
        }

        @Bean
        public EgovPasswordEncoder egovPasswordEncoder() {
                return new EgovPasswordEncoder();
        }

        @org.springframework.beans.factory.annotation.Value("${cors.allowed-origins}")
        private List<String> allowedOrigins;

        @org.springframework.beans.factory.annotation.Value("${security.whitelist}")
        private List<String> whitelist;

        @Bean
        public CorsConfigurationSource corsConfigurationSource() {
                CorsConfiguration configuration = new CorsConfiguration();
                configuration.setAllowedOrigins(allowedOrigins);
                configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
                configuration.setAllowedHeaders(List.of("*"));
                configuration.setAllowCredentials(true);
                UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
                source.registerCorsConfiguration("/**", configuration);
                return source;
        }

        @Bean
        @Order(1)
        public SecurityFilterChain apiSecurityFilterChain(HttpSecurity http, EgovAuthenticationProvider egovAuthenticationProvider) throws Exception {
                http
                                .securityMatchers(matchers -> matchers.requestMatchers(
                                                AntPathRequestMatcher.antMatcher("/api/v1/**"),
                                                AntPathRequestMatcher.antMatcher("/actuator/**")))
                                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                                .csrf(AbstractHttpConfigurer::disable)
                                .httpBasic(AbstractHttpConfigurer::disable)
                                .formLogin(AbstractHttpConfigurer::disable)
                                .logout(AbstractHttpConfigurer::disable)
                                .authorizeHttpRequests(auth -> auth
                                                .requestMatchers(whitelist.stream()
                                                                .map(AntPathRequestMatcher::antMatcher)
                                                                .toArray(AntPathRequestMatcher[]::new))
                                                .permitAll()
                                                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/v1/admin/**")).hasAnyRole("ADMIN", "SYSTEM")
                                                .requestMatchers(AntPathRequestMatcher.antMatcher("/actuator/**")).hasAnyRole("ADMIN", "SYSTEM")
                                                .anyRequest().authenticated())
                                .exceptionHandling(ex -> ex
                                                .authenticationEntryPoint(
                                                                new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
                                                .accessDeniedHandler((request, response, accessDeniedException) -> {
                                                        log.warn(">>> Access denied to {}: {}", request.getRequestURI(), accessDeniedException.getMessage());
                                                        response.setContentType("application/json;charset=UTF-8");
                                                        response.setStatus(HttpStatus.FORBIDDEN.value());
                                                        // 이 체인은 CSRF 비활성(STATELESS+JWT)이라 403은 권한 부족만을 의미 — 오해 소지의 CSRF 문구 제거.
                                                        response.getWriter().write("{\"success\":false,\"status\":403,\"code\":\"C010\",\"message\":\"Access Denied - Insufficient privileges\"}");
                                                }))
                                .sessionManagement(session -> session
                                                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                                // [보안 H3] 활성 체인에 보안 응답 헤더 부여(HSTS/CSP/Referrer/frameOptions 등).
                                // 이 헤더를 정의한 business-suite SecurityConfig는 @ConditionalOnMissingClass(ApiSecurityConfig)라
                                // api-server 구동 시 항상 비활성이므로, 여기서 동등 세트를 직접 적용한다.
                                .headers(headers -> headers
                                                .frameOptions(frame -> frame.sameOrigin())
                                                .contentTypeOptions(org.springframework.security.config.Customizer.withDefaults())
                                                .xssProtection(xss -> xss.headerValue(
                                                                org.springframework.security.web.header.writers.XXssProtectionHeaderWriter.HeaderValue.ENABLED_MODE_BLOCK))
                                                .httpStrictTransportSecurity(hsts -> hsts
                                                                .maxAgeInSeconds(31536000L)
                                                                .includeSubDomains(true)
                                                                .preload(true))
                                                .referrerPolicy(referrer -> referrer.policy(
                                                                org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN)))
                                .authenticationProvider(egovAuthenticationProvider)
                                .addFilterBefore(new JwtAuthenticationFilter(jwtTokenProvider),
                                                UsernamePasswordAuthenticationFilter.class);
                return http.build();
        }

        @Bean
        @Order(2)
        public SecurityFilterChain legacySecurityFilterChain(HttpSecurity http,
                        org.springframework.core.env.Environment environment) throws Exception {
                http
                                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                                .csrf(csrf -> csrf
                                                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                                                .ignoringRequestMatchers(
                                                AntPathRequestMatcher.antMatcher("/uat/uia/actionLogin.do"),
                                                AntPathRequestMatcher.antMatcher("/ws/**")))
                                .httpBasic(AbstractHttpConfigurer::disable)
                                .formLogin(AbstractHttpConfigurer::disable)
                                .logout(AbstractHttpConfigurer::disable)
                                .authorizeHttpRequests(auth -> {
                                                auth.requestMatchers(
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
                                                                AntPathRequestMatcher.antMatcher("/error"))
                                                                .permitAll();
                                                // [보안 H4] Swagger/OpenAPI 문서는 운영(prod)에서 인증(ADMIN/SYSTEM) 뒤로 숨긴다
                                                // (미인증 전체 API 스펙 노출 = 공격 표면 지도 제공 방지). dev/local 등은 편의상 공개 유지.
                                                AntPathRequestMatcher[] docs = {
                                                                AntPathRequestMatcher.antMatcher("/v3/api-docs/**"),
                                                                AntPathRequestMatcher.antMatcher("/swagger-ui/**"),
                                                                AntPathRequestMatcher.antMatcher("/swagger-ui.html")
                                                };
                                                if (environment.acceptsProfiles(org.springframework.core.env.Profiles.of("prod"))) {
                                                        auth.requestMatchers(docs).hasAnyRole("ADMIN", "SYSTEM");
                                                } else {
                                                        auth.requestMatchers(docs).permitAll();
                                                }
                                                auth.anyRequest().authenticated();
                                })
                                .exceptionHandling(ex -> ex
                                                .authenticationEntryPoint(
                                                                new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
                                .sessionManagement(session -> session
                                                .sessionCreationPolicy(SessionCreationPolicy.STATELESS));
                return http.build();
        }

        @Bean
        public AuthenticationManager authenticationManager(org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration authenticationConfiguration) throws Exception {
                return authenticationConfiguration.getAuthenticationManager();
        }
}
