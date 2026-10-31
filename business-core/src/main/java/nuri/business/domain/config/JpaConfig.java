package nuri.business.domain.config;

import nuri.foundation.core.persistence.VendorSqlConfig;
import org.springframework.boot.persistence.autoconfigure.EntityScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

/**
 * JPA Auditing 및 인프라 설정
 */
@Configuration
@EnableJpaAuditing(auditorAwareRef = "loginUserAuditorAware")
@EntityScan(basePackages = "nuri")
@EnableJpaRepositories(basePackages = "nuri")
@Import(VendorSqlConfig.class)
public class JpaConfig {
}
