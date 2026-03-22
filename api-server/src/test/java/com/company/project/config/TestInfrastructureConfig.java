package com.company.project.config;

import org.mockito.Mockito;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.authentication.AuthenticationManager;
import com.company.project.security.service.EgovPasswordEncoder;

@Configuration
@Profile("test")
public class TestInfrastructureConfig {

    @Bean
    @Primary
    public SimpMessagingTemplate simpMessagingTemplate() {
        return Mockito.mock(SimpMessagingTemplate.class);
    }

    @Bean
    @Primary
    public PasswordEncoder testPasswordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    @Primary
    public AuthenticationManager authenticationManager() {
        return Mockito.mock(AuthenticationManager.class);
    }

    @Bean
    public EgovPasswordEncoder egovPasswordEncoder() {
        return new EgovPasswordEncoder();
    }
}
