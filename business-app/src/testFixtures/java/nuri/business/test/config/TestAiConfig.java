package nuri.business.test.config;

import org.mockito.Mockito;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

/**
 * AI 관련 자동 설정을 대체하는 테스트용 모의(Mock) 빈 설정
 */
@TestConfiguration
public class TestAiConfig {

    @Bean
    @Primary
    public ChatModel chatModel() {
        return Mockito.mock(ChatModel.class);
    }

    @Bean
    @Primary
    public EmbeddingModel embeddingModel() {
        return Mockito.mock(EmbeddingModel.class);
    }
}
