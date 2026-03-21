package com.company.project.config;

import org.springframework.context.annotation.Profile;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import com.company.project.security.jwt.JwtTokenProvider;
import com.querydsl.jpa.impl.JPAQueryFactory;
import org.mockito.Mockito;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;

@TestConfiguration
@Profile("mock-security-test")
@EnableWebSecurity
public class TestSecurityConfig {

    @Bean
    @Primary
    public SecurityFilterChain testSecurityFilterChain(HttpSecurity http) throws Exception {
        http.csrf(AbstractHttpConfigurer::disable)
            .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
        return http.build();
    }

    @Bean
    @Primary
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    @Primary
    public JwtTokenProvider jwtTokenProvider() {
        return Mockito.mock(JwtTokenProvider.class);
    }

    @Bean
    @Primary
    public JPAQueryFactory jpaQueryFactory() {
        return Mockito.mock(JPAQueryFactory.class);
    }

    @Bean
    @Primary
    public EntityManager entityManager() {
        return Mockito.mock(EntityManager.class);
    }

    @Bean(name = "entityManagerFactory")
    @Primary
    public EntityManagerFactory entityManagerFactory() {
        return Mockito.mock(EntityManagerFactory.class);
    }
}
