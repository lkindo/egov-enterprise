package nuri.api.integration.sms;

import nuri.business.service.sms.SmsSender;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.ObjectMapper;

/** 공급자를 명시적으로 선택한 배포에만 실제 발송 어댑터를 조립한다. */
@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(prefix = "nuri.sms", name = "provider", havingValue = "sens")
@EnableConfigurationProperties(NaverSensSmsProperties.class)
public class NaverSensSmsConfiguration {
    @Bean
    SmsSender naverSensSmsSender(NaverSensSmsProperties properties, ObjectMapper objectMapper) {
        return new NaverSensSmsSender(properties, objectMapper);
    }
}
