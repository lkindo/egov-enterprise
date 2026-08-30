package nuri.migration.jdbc;

import nuri.migration.artifact.SourceDriverEvidence;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;

/** 한 workflow command 동안 source driver/DataSource/classloader 수명을 함께 소유한다. */
public interface SourceJdbcEndpoint extends AutoCloseable {

    JdbcTemplate jdbc();

    DataSource dataSource();

    SourceDriverEvidence evidence();

    @Override
    void close();
}
