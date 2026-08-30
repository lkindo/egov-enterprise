package nuri.migration.jdbc;

import nuri.migration.artifact.SourceDriverEvidence;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;

/** 기존 application classpath DataSource는 별도 close 소유권이 없는 endpoint로 감싼다. */
record BundledSourceJdbcEndpoint(
        JdbcTemplate jdbc,
        DataSource dataSource,
        SourceDriverEvidence evidence
) implements SourceJdbcEndpoint {

    @Override
    public void close() {
        // Existing DriverManagerDataSource has no owned close lifecycle.
    }
}
