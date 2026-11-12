package nuri.config;

import java.nio.charset.StandardCharsets;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.web.filter.CharacterEncodingFilter;

@Configuration
public class EncodingConfig {

    // CharacterEncodingFilter 타입으로 직접 등록해 Boot HttpEncodingAutoConfiguration 의
    // @ConditionalOnMissingBean(CharacterEncodingFilter.class) 백오프를 정상 작동시키고(중복 빈 방지),
    // RFC 8259 JSON Content-Type(application/json)이 ';charset=UTF-8' 로 변형되지 않도록 요청 인코딩만 강제한다.
    @Bean
    @Order(Ordered.HIGHEST_PRECEDENCE)
    public CharacterEncodingFilter characterEncodingFilter() {
        CharacterEncodingFilter characterEncodingFilter = new CharacterEncodingFilter();
        characterEncodingFilter.setEncoding(StandardCharsets.UTF_8.name());
        characterEncodingFilter.setForceRequestEncoding(true);
        characterEncodingFilter.setForceResponseEncoding(false);
        return characterEncodingFilter;
    }
}
