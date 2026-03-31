package com.company.foundation.support;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Profile;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

/**
 * Testcontainers PostgreSQL 설정
 *
 * 통합 테스트 시 실제 PostgreSQL 인스턴스를 컨테이너로 실행합니다.
 */
@TestConfiguration(proxyBeanMethods = false)
@Testcontainers
@Profile("test")
public class TestcontainersConfig {

    @Bean
    public PostgreSQLContainer<?> postgresContainer() {
        return new PostgreSQLContainer<>(DockerImageName.parse("postgres:16"))
                .withDatabaseName("testdb")
                .withUsername("test")
                .withPassword("test");
    }
}
