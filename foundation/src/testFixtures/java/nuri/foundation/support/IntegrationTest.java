package nuri.foundation.support;

import nuri.foundation.FoundationTestApplication;
import nuri.foundation.security.config.TestSecurityConfig;
import nuri.foundation.core.config.TestMessagingConfig;
import nuri.foundation.core.config.QuerydslConfig;
import nuri.foundation.core.config.TestCacheConfig;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
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
@SpringBootTest(classes = FoundationTestApplication.class, webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@Import({ TestSecurityConfig.class, TestMessagingConfig.class, QuerydslConfig.class, TestCacheConfig.class })
@ActiveProfiles("test")
@Transactional
public @interface IntegrationTest {
}
