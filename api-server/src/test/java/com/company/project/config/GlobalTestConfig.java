package com.company.project.config;

import org.mockito.Mockito;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;

/**
 * api-server ?뚯뒪???섍꼍?먯꽌 怨듯넻?쇰줈 ?ъ슜?섎뒗 鍮??ㅼ젙
 */
@TestConfiguration
@Profile("mock-test")
public class GlobalTestConfig {

    @Bean
    @Primary
    public org.springframework.messaging.simp.SimpMessagingTemplate simpMessagingTemplate() {
        return Mockito.mock(org.springframework.messaging.simp.SimpMessagingTemplate.class);
    }
}
