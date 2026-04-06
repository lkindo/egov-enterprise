package nuri.api.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
@Profile("!test")
public class EgovOAuthConfig {
    // OAuthVO 클래스는 common-legacy-support 모듈과 함께 제거되어 잠시 비워둡니다
    // 추후 신규 OAuth2 방식으로 재구성이 필요합니다
}
