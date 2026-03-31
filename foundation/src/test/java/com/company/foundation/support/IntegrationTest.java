package com.company.foundation.support;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 통합 테스트를 위한 공통 애노테이션
 * 
 * - Testcontainers PostgreSQL 사용
 * - @SpringBootTest 통합 테스트
 * - 'test' 프로필 활성화
 * 
 * 사용 예:
 * &#64;IntegrationTest
 * class MyServiceIntegrationTest { ... }
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestcontainersConfig.class)
@ActiveProfiles("test")
public @interface IntegrationTest {
}
