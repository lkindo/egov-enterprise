package nuri.business.support;

import nuri.business.TestApplication;
import nuri.business.security.config.TestSecurityConfig;
import nuri.business.core.config.TestMessagingConfig;
import nuri.business.core.config.QuerydslConfig;
import nuri.business.core.config.TestCacheConfig;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.web.WebAppConfiguration;
import org.springframework.transaction.annotation.Transactional;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 통합 테스트를 위한 공공 애노테이션
 * 
 * - @SpringBootTest 통합 테스트
 * - 'test' 프로필 활성화
 * - 공통 테스트 설정 (Security, Messaging, Querydsl) 포함
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@WebAppConfiguration("")
@SpringBootTest(classes = TestApplication.class, webEnvironment = SpringBootTest.WebEnvironment.MOCK, properties = {
    "spring.web.resources.static-locations=classpath:/static/",
    "spring.main.allow-bean-definition-overriding=true"
})
@AutoConfigureMockMvc
@Import({ TestSecurityConfig.class, TestMessagingConfig.class, QuerydslConfig.class, TestCacheConfig.class })
@ActiveProfiles(value = { "test", "mock-security" }) 
@Transactional
public @interface IntegrationTest {
}
