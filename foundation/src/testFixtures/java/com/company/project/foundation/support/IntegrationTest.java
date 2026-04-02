package com.company.project.foundation.support;

import com.company.project.TestApplication;
import com.company.project.foundation.security.config.TestSecurityConfig;
import com.company.project.foundation.core.config.TestMessagingConfig;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 통합 테스트를 위한 공공 애노테이션
 * 
 * - TestApplication(com.company.project 스캔) 사용
 * - @SpringBootTest 통합 테스트
 * - 'test' 프로필 활성화
 * - 공통 테스트 설정 (Security, Messaging) 포함
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@SpringBootTest(classes = TestApplication.class, webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@Import({ TestSecurityConfig.class, TestMessagingConfig.class })
@ActiveProfiles("test")
public @interface IntegrationTest {
}
