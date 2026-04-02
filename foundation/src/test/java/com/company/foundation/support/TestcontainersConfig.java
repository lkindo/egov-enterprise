package com.company.foundation.support;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Profile;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

/**
 * Testcontainers PostgreSQL ?¤ì •
 *
 * ?µí•© ?ŒìŠ¤?????¤ì œ PostgreSQL ?¸ìŠ¤?´ìŠ¤ë¥?ì»¨í…Œ?´ë„ˆë¡??¤í–‰?©ë‹ˆ??
 */
@TestConfiguration(proxyBeanMethods = false)
@Testcontainers
@Profile("docker-test")
public class TestcontainersConfig {

    @Bean(destroyMethod = "stop")
    @SuppressWarnings("resource")
    public PostgreSQLContainer<?> postgresContainer() {
        return new PostgreSQLContainer<>(DockerImageName.parse("postgres:16"))
                .withDatabaseName("testdb")
                .withUsername("test")
                .withPassword("test");
    }
}
