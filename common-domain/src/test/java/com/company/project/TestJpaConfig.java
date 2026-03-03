package com.company.project;

import com.company.project.domain.TestQuerydslConfig;
import org.springframework.context.annotation.Import;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import com.company.project.core.config.FullBeanNameGenerator;

/**
 * common-domain 모듈의 테스트용 JPA 설정 클래스
 */
@SpringBootApplication(nameGenerator = FullBeanNameGenerator.class)
@Import(TestQuerydslConfig.class)
@EntityScan(basePackages = "com.company.project.domain")
@EnableJpaRepositories(basePackages = "com.company.project.domain")
public class TestJpaConfig {
}
