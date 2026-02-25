package com.company.project.api.config;

import com.company.project.security.service.EgovAuthenticationProvider;
import com.company.project.security.jwt.JwtAuthenticationFilter;
import com.company.project.security.jwt.JwtTokenProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
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
import com.company.project.security.service.EgovPasswordEncoder;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Configuration
@EnableWebSecurity
public class ApiSecurityConfig {
    private final EgovAuthenticationProvider egovAuthenticationProvider;
    private final JwtTokenProvider jwtTokenProvider;

    public ApiSecurityConfig(@Lazy EgovAuthenticationProvider egovAuthenticationProvider, JwtTokenProvider jwtTokenProvider) {
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
        configuration.setAllowedOrigins(List.of("http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001", "http://127.0.0.1:3001"));
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
            .securityMatcher("/api/v1/**")
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                .ignoringRequestMatchers("/api/v1/auth/login", "/api/v1/users/signup"))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/v1/auth/login", "/api/v1/auth/me", "/api/v1/auth/reissue", "/api/v1/auth/logout",
                        "/api/v1/users/signup",
                        "/api/v1/menu/**", "/api/v1/health",
                        "/api/v1/images/**", "/api/v1/dashboard",
                        "/api/v1/bbs/**", "/api/v1/community/**",
                        "/api/v1/deptjob/**", "/api/v1/addressbook/**",
                        "/api/v1/schedule/**", "/api/v1/scrap/**")
                .permitAll()
                .anyRequest().authenticated())
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .addFilterBefore(new JwtAuthenticationFilter(jwtTokenProvider), UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    @Order(2)
    public SecurityFilterChain legacySecurityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                .ignoringRequestMatchers("/uat/uia/actionLogin.do"))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                        "/css/**", "/js/**", "/images/**",
                        "/validator.do", "/cmm/fms/getImage.do",
                        "/uat/uia/egovLoginUsr.do", "/uat/uia/actionLogin.do",
                        "/uat/uia/actionLogout.do",
                        "/index.jsp", "/", "/uss/olp/qri/**",
                        "/favicon.ico")
                .permitAll()
                .anyRequest().authenticated())
            .formLogin(form -> form
                .loginPage("/uat/uia/egovLoginUsr.do")
                .usernameParameter("id")
                .passwordParameter("password")
                .permitAll())
            .logout(logout -> logout
                .logoutUrl("/uat/uia/actionLogout.do")
                .logoutSuccessUrl("/uat/uia/egovLoginUsr.do"))
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS));
        return http.build();
    }

    @Bean
    public AuthenticationManager authenticationManager() {
        return new ProviderManager(egovAuthenticationProvider);
    }
}
