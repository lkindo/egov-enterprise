package com.company.project.domain.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

/**
 * JPA Auditing 활성화 설정
 */
@Configuration
@EnableJpaAuditing(auditorAwareRef = "loginUserAuditorAware")
@EntityScan(basePackages = "com.company.project")
@EnableJpaRepositories(basePackages = "com.company.project")
public class JpaConfig {
}
