package nuri.foundation;

import nuri.foundation.core.config.QuerydslConfig;
import nuri.foundation.core.config.TestCacheConfig;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Import;

@SpringBootApplication
@Import({QuerydslConfig.class, TestCacheConfig.class})
public class FoundationTestApplication {
    static {
        // 윈도우 환경에서 src/main/webapp 자동 감지 시 끝에 슬래시 누락으로 인한 에러 방어
        // 명시적으로 슬래시를 붙여서 등록함
        System.setProperty("spring.web.resources.static-locations", "classpath:/static/,classpath:/public/,classpath:/resources/,classpath:/META-INF/resources/,file:src/main/webapp/,file:api-server/src/main/webapp/");
    }
}
