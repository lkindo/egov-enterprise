package com.company.foundation.support;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;

import javax.sql.DataSource;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * PostgreSQL Testcontainers 기본 작동 및 Spring Boot 연동 테스트
 */
@SpringBootTest
@Testcontainers
@ActiveProfiles("docker-test")
class PostgresContainerTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16")
            .withDatabaseName("testdb")
            .withUsername("test")
            .withPassword("test");

    @Test
    void testContainerIsRunning() {
        // Given & When: 컨테이너 설정 확인
        // Then: 컨테이너가 생성되고 실행 중이어야 함
        assertThat(postgres.isCreated()).isTrue();
        assertThat(postgres.isRunning()).isTrue();
    }

    @Test
    void canAccessDatabaseViaSpring(@Autowired DataSource dataSource) throws Exception {
        // Given: Spring 주입 DataSource
        try (Connection connection = dataSource.getConnection();
             Statement statement = connection.createStatement();
             ResultSet resultSet = statement.executeQuery("SELECT version()")) {
            
            resultSet.next();
            String version = resultSet.getString(1);

            // Then: PostgreSQL 버전 확인
            assertThat(version).contains("PostgreSQL");
        }
    }
}
