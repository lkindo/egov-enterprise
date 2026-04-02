package com.company.project.config;

import org.mockito.Mockito;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;

/**
 * api-server 테스트 환경에서 공통으로 사용하는 빈 설정
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
