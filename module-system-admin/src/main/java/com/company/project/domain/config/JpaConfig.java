package com.company.project.domain.config;
import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import lombok.experimental.SuperBuilder;

import org.springframework.context.annotation.Configuration;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

/**
 * JPA Auditing ??뽮쉐????쇱젟
 */
@Configuration
@EnableJpaAuditing(auditorAwareRef = "loginUserAuditorAware")
@EntityListeners(AuditingEntityListener.class)
@EntityScan(basePackages = "com.company.project")
@EnableJpaRepositories(basePackages = "com.company.project")
@SuperBuilder
public class JpaConfig extends BaseEntity {
}
