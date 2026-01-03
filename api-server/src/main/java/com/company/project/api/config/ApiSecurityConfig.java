package com.company.project.api.config;

import com.company.project.security.service.EgovAuthenticationProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityCustomizer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class ApiSecurityConfig {

        private final EgovAuthenticationProvider egovAuthenticationProvider;

        public ApiSecurityConfig(@Lazy EgovAuthenticationProvider egovAuthenticationProvider) {
                this.egovAuthenticationProvider = egovAuthenticationProvider;
        }

        @Bean
        public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
                http
                                .authorizeHttpRequests(auth -> auth
                                                .requestMatchers(
                                                                "/css/**", "/js/**", "/images/**",
                                                                "/validator.do", "/cmm/fms/getImage.do",
                                                                "/uat/uia/egovLoginUsr.do", "/uat/uia/actionLogin.do",
                                                                "/uat/uia/actionLogout.do",
                                                                "/uat/uia/egovIdPasswordSearch.do",
                                                                "/uat/uia/searchId.do",
                                                                "/uat/uia/searchPassword.do",
                                                                "/index.jsp", "/")
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
                                .csrf(csrf -> csrf.disable()) // Disable CSRF for legacy compatibility or configure
                                                              // properly
                                .sessionManagement(session -> session
                                                .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED));

                return http.build();
        }

        @Bean
        public AuthenticationManager authenticationManager(HttpSecurity http) throws Exception {
                AuthenticationManagerBuilder authenticationManagerBuilder = http
                                .getSharedObject(AuthenticationManagerBuilder.class);
                authenticationManagerBuilder.authenticationProvider(egovAuthenticationProvider);
                return authenticationManagerBuilder.build();
        }

        @Bean
        public WebSecurityCustomizer webSecurityCustomizer() {
                return (web) -> web.ignoring().requestMatchers(
                                "/css/**", "/js/**", "/images/**", "/favicon.ico");
        }
}
