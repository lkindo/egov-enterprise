package nuri.business.core.config;

import org.mockito.Mockito;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.messaging.simp.SimpMessagingTemplate;

@TestConfiguration
public class TestMessagingConfig {

    @Bean
    @Primary
    public SimpMessagingTemplate simpMessagingTemplate() {
        return Mockito.mock(SimpMessagingTemplate.class);
    }
}
