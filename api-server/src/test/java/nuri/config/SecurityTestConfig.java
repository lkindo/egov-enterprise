package nuri.config;

import nuri.business.security.jwt.JwtAuthenticationFilter;
import nuri.business.security.jwt.JwtTokenProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;

@Configuration
@EnableWebSecurity
@org.springframework.context.annotation.Profile("mock-security-test")
public class SecurityTestConfig {

        @org.springframework.core.annotation.Order(org.springframework.core.Ordered.HIGHEST_PRECEDENCE)
        @Bean
        @Primary
        public SecurityFilterChain securityFilterChain(HttpSecurity http, JwtTokenProvider jwtTokenProvider)
                        throws Exception {
                http
                                .securityMatcher(AntPathRequestMatcher.antMatcher("/api/v1/**"))
                                .csrf(AbstractHttpConfigurer::disable)
                                .sessionManagement(session -> session
                                                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                                .authorizeHttpRequests(auth -> auth
                                                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/v1/auth/**"))
                                                .permitAll()
                                                .requestMatchers(AntPathRequestMatcher
                                                                .antMatcher("/api/v1/users/signup"))
                                                .permitAll()
                                                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/v1/admin/**"))
                                                .hasRole("ADMIN")
                                                .anyRequest().authenticated())
                                .exceptionHandling(ex -> ex
                                                .authenticationEntryPoint(
                                                                new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
                                .addFilterBefore(new JwtAuthenticationFilter(jwtTokenProvider),
                                                UsernamePasswordAuthenticationFilter.class);
                return http.build();
        }

        @Bean
        public org.springframework.security.crypto.password.PasswordEncoder passwordEncoder() {
                return new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder();
        }
        @Bean
        public nuri.business.security.service.EgovPasswordEncoder egovPasswordEncoder() {
                return new nuri.business.security.service.EgovPasswordEncoder();
        }
}
