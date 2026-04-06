package nuri.foundation.domain.config;

import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

/**
 * JPA Auditing 및 인프라 설정
 */
@Configuration
@EnableJpaAuditing(auditorAwareRef = "loginUserAuditorAware")
@EntityScan(basePackages = "nuri")
@EnableJpaRepositories(basePackages = "nuri")
public class JpaConfig {
}
