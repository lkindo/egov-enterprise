package nuri.api.schema;

import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.core.env.Environment;

/** TC 스키마 테스트가 실제 전환 SQL을 JPA 초기화 전에 명시적으로 리허설한다. */
@TestConfiguration(proxyBeanMethods = false)
@org.springframework.context.annotation.Profile("tc")
public class AuthorizationSchemaRehearsalTestConfiguration {
    @Bean
    FlywayMigrationStrategy authorizationTestCutover(Environment environment) {
        String url=environment.getProperty("spring.datasource.url","");
        if (!url.startsWith("jdbc:tc:postgresql:17:")) {
            throw new IllegalStateException("Authorization schema rehearsal requires its disposable Testcontainers datasource");
        }
        return flyway -> {
            try {
                AuthorizationCutoverTestSupport.migrate(flyway);
            } catch (java.sql.SQLException failure) {
                throw new IllegalStateException("Explicit authorization schema rehearsal failed",failure);
            }
        };
    }
}
