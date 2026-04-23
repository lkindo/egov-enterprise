package nuri.foundation.security.config;

import nuri.foundation.security.jwt.JwtAuthenticationFilter;
import nuri.foundation.security.jwt.JwtTokenProvider;
import nuri.foundation.security.service.EgovPasswordEncoder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.DelegatingPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import java.util.HashMap;
import java.util.Map;

@Configuration
@EnableWebSecurity
@org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity(prePostEnabled = true)
@org.springframework.context.annotation.Profile("!mock-security & !mock-security-test")
public class SecurityConfig {
        private final JwtTokenProvider jwtTokenProvider;

        public SecurityConfig(@org.springframework.context.annotation.Lazy JwtTokenProvider jwtTokenProvider,
                        Environment environment) {
                this.jwtTokenProvider = jwtTokenProvider;
        }

        @Bean
        @SuppressWarnings("deprecation")
        public PasswordEncoder passwordEncoder() {
                String encodingId = "bcrypt";
                Map<String, PasswordEncoder> encoders = new HashMap<>();
                encoders.put("bcrypt", new BCryptPasswordEncoder());
                encoders.put("egov", org.springframework.security.crypto.password.NoOpPasswordEncoder.getInstance());
                return new DelegatingPasswordEncoder(encodingId, encoders);
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
                                .csrf(AbstractHttpConfigurer::disable)
                                .sessionManagement(session -> session
                                                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                                .authorizeHttpRequests(auth -> auth
                                                .requestMatchers("/css/**", "/js/**", "/images/**", "/resource/**",
                                                                "/static/**")
                                                .permitAll()
                                                .requestMatchers("/uat/uia/**", "/auth/**", "/api/v1/auth/**").permitAll()
                                                .requestMatchers("/sym/mms/**").permitAll()      
                                                .requestMatchers("/connection").permitAll()      
                                                .requestMatchers("/WEB-INF/**", "/upload/**").permitAll()
                                                .requestMatchers("/api/v1/public/**").permitAll()
                                                .requestMatchers("/api/v1/menus/**").permitAll()
                                                .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                                                .anyRequest().authenticated())
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
