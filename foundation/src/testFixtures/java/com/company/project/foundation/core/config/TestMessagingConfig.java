package com.company.project.foundation.core.config;

import org.mockito.Mockito;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.messaging.simp.SimpMessagingTemplate;

@TestConfiguration
public class TestMessagingConfig {

    @Bean
    public SimpMessagingTemplate simpMessagingTemplate() {
        return Mockito.mock(SimpMessagingTemplate.class);
    }
}
