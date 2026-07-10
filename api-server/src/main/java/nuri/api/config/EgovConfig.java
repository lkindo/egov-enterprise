package nuri.api.config;

import org.springframework.context.annotation.Bean;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import java.util.Arrays;
import java.util.List;

@Configuration
@Profile("!test")
public class EgovConfig {

    // [context-whitelist.xml] Whitelists
    @Bean
    public List<String> egovRSSWhitelist() {
        return Arrays.asList("bbs", "board");
    }

    @Bean
    public List<String> egovNextUrlWhitelist() {
        return Arrays.asList("/");
    }

    @Bean
    public List<String> egovPageLinkWhitelist() {
        return Arrays.asList("main/mainPage");
    }

    // [정리] 하드코딩 SMTP 자격증명(smtp.test.com/test/test)을 담은 레거시 모니터링 메일 빈
    // (mntrngMailSender/mntrngMessage)을 제거했다. 참조처가 없어 데드 코드였고, 무조건 등록되던 이
    // JavaMailSender 빈이 Spring Boot mail auto-config(spring.mail.*)를 가려 실제 메일 발송 구현
    // (business-suite RealEmailSender, @ConditionalOnProperty("spring.mail.host"))을 오염시키는
    // 잠재 결함이 있었다. 메일 발송이 필요하면 spring.mail.* 프로퍼티로 표준 auto-config에 위임한다.

}

