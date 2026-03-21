package com.company.project.domain.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/**
 * JPA Auditing 및 인프라 설정
 */
@Configuration
@EnableJpaAuditing(auditorAwareRef = "loginUserAuditorAware")
// @EntityScan(basePackages = "com.company.project")
// @EnableJpaRepositories(basePackages = "com.company.project")
public class JpaConfig {
}
