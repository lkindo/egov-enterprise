package com.company.foundation.support;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Testcontainers PostgreSQL ?�합 ?�스?? * - Docker 컨테?�너 ?�작/?��? ?�스?? * - ?�제 PostgreSQL 쿼리 ?�행 ?�스?? */
@Testcontainers
@SpringBootTest
@ActiveProfiles("test")
class PostgresContainerTest {

    @Container
    @SuppressWarnings("resource")
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16")
            .withDatabaseName("testdb")
            .withUsername("test")
            .withPassword("test");

    @Test
    void containerStartsAndStops() {
        // Then: 컨테?�너가 ?�행 중임
        assertThat(postgres.isCreated()).isTrue();
        assertThat(postgres.isRunning()).isTrue();
    }

    @Test
    void canExecuteQuery() throws Exception {
        // Given: PostgreSQL 컨테?�너가 ?�행 �?        try (Connection connection = postgres.createConnection("");
                Statement statement = connection.createStatement();
                ResultSet resultSet = statement.executeQuery("SELECT 1")) {
            resultSet.next();
            int result = resultSet.getInt(1);

            // Then: 쿼리 결과 ?�인
            assertThat(result).isEqualTo(1);
        }
    }

    @Test
    void canAccessDatabaseViaSpring(@Autowired DataSource dataSource) throws Exception {
        // Given: Spring ??주입??DataSource
        try (Connection connection = dataSource.getConnection();
                Statement statement = connection.createStatement();
                ResultSet resultSet = statement.executeQuery("SELECT version()")) {
            resultSet.next();
            String version = resultSet.getString(1);

            // Then: PostgreSQL 버전 ?�인
            assertThat(version).contains("PostgreSQL");
        }
    }
}
