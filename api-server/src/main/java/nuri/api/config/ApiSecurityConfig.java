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
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;
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
        private final org.springframework.beans.factory.ObjectProvider<org.springframework.jdbc.core.JdbcTemplate> jdbcTemplateProvider;

        @org.springframework.beans.factory.annotation.Value("${rbac.shadow.enabled:false}")
        private boolean rbacShadowEnabled;

        @org.springframework.beans.factory.annotation.Value("${rbac.db-auth.enabled:false}")
        private boolean rbacDbAuthEnabled;

        @org.springframework.beans.factory.annotation.Value("${rbac.db-auth.secure-paths:#{T(java.util.Collections).emptyList()}}")
        private List<String> securePaths;

        /**
         * 관리(actuator) 서버 포트. 미설정이면 애플리케이션 포트와 동일 컨텍스트다.
         * @see #managementPortSeparated()
         */
        @org.springframework.beans.factory.annotation.Value("${management.server.port:}")
        private String managementServerPort;

        @org.springframework.beans.factory.annotation.Value("${server.port:8080}")
        private String serverPort;

        /**
         * 관리 엔드포인트가 <b>애플리케이션 포트에서 분리</b>됐는지 여부. [W1-12 보완]
         *
         * <p>[왜 이 판정이 필요한가] 원장 D-3 의 결정은 "인가가 아니라 <b>네트워크로</b> 푼다" 였다.
         * 그런데 포트만 옮기고 인가는 그대로 두면 <b>스크레이프 불가라는 원래 문제가 그대로 남는다</b> —
         * Boot 는 관리 자식 컨텍스트에 부모의 {@code springSecurityFilterChain} 을 그대로 등록하므로
         * ({@code ServletManagementChildContextConfiguration.ServletManagementContextSecurityConfiguration}
         * 이 부모 BeanFactory 에서 그 빈을 꺼내 {@code DelegatingFilterProxyRegistrationBean} 으로 다시 건다),
         * 미인증 Prometheus 스크레이퍼는 {@code api:9090/actuator/prometheus} 에서도 여전히 401 을 받는다.
         * 이중 차단 중 절반만 제거된 상태였다.
         *
         * <p>[왜 이 완화가 안전한가] 분리된 관리 포트는 compose 에서 <b>호스트로 노출되지 않는다</b>
         * (docker-compose.prod.yml 에 {@code ports:} 매핑 없음 — 스크레이퍼는 egov-net 안에서 접근).
         * 그리고 포트를 분리하면 {@code /actuator/**} 는 <b>애플리케이션 포트(8080)에서 사라지므로</b>,
         * 이 permitAll 은 8080 의 표면을 넓히지 않는다. 분리되지 않은 형상(dev·local·e2e)에서는
         * 조건이 거짓이라 종전대로 ROLE_ADMIN 이 요구된다 — 개발 형상의 인가는 완화되지 않는다.
         *
         * <p>이 안전 논거는 전적으로 "관리 포트가 호스트에 노출되지 않는다" 에 의존한다.
         * 그 전제는 {@code ConfigSafetyLinterTest} 가 compose 파일을 스캔해 기계로 고정한다(AGENTS.md Evidence guardrails H5).
         */
        private boolean managementPortSeparated() {
                return managementServerPort != null
                                && !managementServerPort.isBlank()
                                && !managementServerPort.equals(serverPort)
                                && !"-1".equals(managementServerPort);
        }

        public ApiSecurityConfig(
                JwtTokenProvider jwtTokenProvider,
                org.springframework.beans.factory.ObjectProvider<org.springframework.jdbc.core.JdbcTemplate> jdbcTemplateProvider) {
                this.jwtTokenProvider = jwtTokenProvider;
                this.jdbcTemplateProvider = jdbcTemplateProvider;
        }

        @Bean
        public nuri.business.security.authorization.DbUrlAuthorizationManager dbUrlAuthorizationManager() {
                return new nuri.business.security.authorization.DbUrlAuthorizationManager(jdbcTemplateProvider.getIfAvailable(), securePaths);
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
                configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
                configuration.setAllowedHeaders(List.of("*"));
                configuration.setAllowCredentials(true);
                UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
                source.registerCorsConfiguration("/**", configuration);
                return source;
        }

        /**
         * 경로 패턴 매처. Spring Security 6.5 에서 {@code AntPathRequestMatcher} 가 제거 예정이 되어
         * {@code PathPatternRequestMatcher} 로 전환했다(2026-08-05, Boot 3.5.16 동반).
         *
         * <p><b>두 매처는 의미가 완전히 같지 않다</b> — 후행 슬래시와 경로 파라미터 해석이 갈린다.
         * 전환 전에 이 저장소가 쓰는 패턴 44개(정적 23 · whitelist 9 · secure-paths 12)를 전수 분류해
         * <b>전부 단순 접두({@code /x/**})이거나 정확 경로</b>임을 확인했고(중간 {@code **} · 정규식 없음),
         * 갈릴 수 있는 축은 {@code RequestMatcherBoundaryTest} 가 현행 기준으로 동결한다.
         */
        private static RequestMatcher pathMatcher(String pattern) {
                return PathPatternRequestMatcher.withDefaults().matcher(pattern);
        }

        @Bean
        @Order(1)
        public SecurityFilterChain apiSecurityFilterChain(HttpSecurity http, EgovAuthenticationProvider egovAuthenticationProvider) throws Exception {
                http
                                .securityMatchers(matchers -> matchers.requestMatchers(
                                                pathMatcher("/api/v1/**"),
                                                pathMatcher("/actuator/**"),
                                                pathMatcher("/ws"),
                                                pathMatcher("/ws/**")))
                                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                                .csrf(csrf -> csrf.disable())
                                .httpBasic(httpBasic -> httpBasic.disable())
                                .formLogin(formLogin -> formLogin.disable())
                                .logout(logout -> logout.disable())
                                .authorizeHttpRequests(auth -> {
                                                auth.requestMatchers(whitelist.stream()
                                                                .map(ApiSecurityConfig::pathMatcher)
                                                                .toArray(RequestMatcher[]::new))
                                                                .permitAll();

                                                // [W1-12 보완] 관리 포트가 분리된 형상에서만 스크레이프 경로를 연다.
                                                //   securePaths 보다 **먼저** 선언해야 한다 — authorizeHttpRequests 는
                                                //   선언 순서로 매칭하므로, 뒤에 두면 `/actuator/**` 규칙이 먼저 걸려 무효가 된다.
                                                //   판단 근거는 managementPortSeparated() javadoc 참조.
                                                if (managementPortSeparated()) {
                                                        log.info(">>> [W1-12] 관리 포트 분리 감지(server={}, management={}) — /actuator/prometheus 스크레이프 허용(내부망 한정)",
                                                                        serverPort, managementServerPort);
                                                        auth.requestMatchers(pathMatcher("/actuator/prometheus"))
                                                                        .permitAll();
                                                }

                                                if (rbacDbAuthEnabled) {
                                                        // Phase 3: DB 인가 적용 (enforce)
                                                        auth.requestMatchers(securePaths.stream()
                                                                        .map(ApiSecurityConfig::pathMatcher)
                                                                        .toArray(RequestMatcher[]::new))
                                                                .access(dbUrlAuthorizationManager());
                                                } else if (rbacShadowEnabled) {
                                                        // Phase 2: 섀도우 모드 (병행 평가 및 로깅, enforce는 하드코딩)
                                                        var adminEnforce = org.springframework.security.authorization.AuthorityAuthorizationManager.<org.springframework.security.web.access.intercept.RequestAuthorizationContext>hasAnyRole(
                                                                nuri.business.security.AuthorityConstants.ROLE_ADMIN,
                                                                nuri.business.security.AuthorityConstants.ROLE_SYSTEM
                                                        );
                                                        var shadowLogger = new nuri.business.security.authorization.ShadowAuthorizationLogger(
                                                                adminEnforce,
                                                                dbUrlAuthorizationManager(),
                                                                true
                                                        );
                                                        auth.requestMatchers(securePaths.stream()
                                                                        .map(ApiSecurityConfig::pathMatcher)
                                                                        .toArray(RequestMatcher[]::new))
                                                                .access(shadowLogger);
                                                } else {
                                                        // 기존 하드코딩 동작
                                                        auth.requestMatchers(pathMatcher("/api/v1/admin/**"))
                                                                .hasAnyRole(nuri.business.security.AuthorityConstants.ROLE_ADMIN, nuri.business.security.AuthorityConstants.ROLE_SYSTEM)
                                                                .requestMatchers(pathMatcher("/actuator/**"))
                                                                .hasAnyRole(nuri.business.security.AuthorityConstants.ROLE_ADMIN, nuri.business.security.AuthorityConstants.ROLE_SYSTEM);
                                                }

                                                auth.anyRequest().authenticated();
                                })
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
                                .addFilterBefore(new nuri.foundation.security.filter.OriginValidationFilter(allowedOrigins),
                                                UsernamePasswordAuthenticationFilter.class)
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
                                                pathMatcher("/uat/uia/actionLogin.do")))
                                .httpBasic(httpBasic -> httpBasic.disable())
                                .formLogin(formLogin -> formLogin.disable())
                                .logout(logout -> logout.disable())
                                .authorizeHttpRequests(auth -> {
                                                auth.requestMatchers(
                                                                pathMatcher("/css/**"),
                                                                pathMatcher("/js/**"),
                                                                pathMatcher("/images/**"),
                                                                pathMatcher("/validator.do"),
                                                                pathMatcher("/cmm/fms/getImage.do"),
                                                                pathMatcher("/uat/uia/egovLoginUsr.do"),
                                                                pathMatcher("/uat/uia/actionLogin.do"),
                                                                pathMatcher("/uat/uia/actionLogout.do"),
                                                                pathMatcher("/index.jsp"),
                                                                pathMatcher("/"),
                                                                pathMatcher("/uss/olp/qri/**"),
                                                                pathMatcher("/favicon.ico"),
                                                                pathMatcher("/error"))
                                                                .permitAll();
                                                // [보안 H4] Swagger/OpenAPI 문서는 운영(prod)에서 인증(ADMIN/SYSTEM) 뒤로 숨긴다
                                                // (미인증 전체 API 스펙 노출 = 공격 표면 지도 제공 방지). dev/local 등은 편의상 공개 유지.
                                                RequestMatcher[] docs = {
                                                                pathMatcher("/v3/api-docs/**"),
                                                                pathMatcher("/swagger-ui/**"),
                                                                pathMatcher("/swagger-ui.html")
                                                };
                                                if (environment.acceptsProfiles(org.springframework.core.env.Profiles.of("prod"))) {
                                                        auth.requestMatchers(docs).hasAnyRole(nuri.business.security.AuthorityConstants.ROLE_ADMIN, nuri.business.security.AuthorityConstants.ROLE_SYSTEM);
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
