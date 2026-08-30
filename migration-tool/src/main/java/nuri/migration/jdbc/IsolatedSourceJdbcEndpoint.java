package nuri.migration.jdbc;

import nuri.migration.artifact.SourceDriverEvidence;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;
import java.net.URLClassLoader;

/** connection, loader, staged JAR를 역순에 가까운 best-effort로 모두 정리한다. */
final class IsolatedSourceJdbcEndpoint implements SourceJdbcEndpoint {

    private final JdbcTemplate jdbc;
    private final ExternalDriverDataSource dataSource;
    private final SourceDriverEvidence evidence;
    private final URLClassLoader loader;
    private final StagedDriverJars staged;
    private boolean closed;

    IsolatedSourceJdbcEndpoint(
            JdbcTemplate jdbc,
            ExternalDriverDataSource dataSource,
            SourceDriverEvidence evidence,
            URLClassLoader loader,
            StagedDriverJars staged
    ) {
        this.jdbc = jdbc;
        this.dataSource = dataSource;
        this.evidence = evidence;
        this.loader = loader;
        this.staged = staged;
    }

    @Override
    public JdbcTemplate jdbc() {
        return jdbc;
    }

    @Override
    public DataSource dataSource() {
        return dataSource;
    }

    @Override
    public SourceDriverEvidence evidence() {
        return evidence;
    }

    @Override
    public void close() {
        if (closed) {
            return;
        }
        closed = true;
        boolean clean = true;
        Throwable fatal = null;
        try {
            clean = dataSource.closeConnections();
        } catch (Throwable failure) {
            clean = false;
            if (JvmFailureBoundary.isFatal(failure)) {
                fatal = failure;
            }
        }
        try {
            loader.close();
        } catch (Throwable failure) {
            clean = false;
            if (fatal == null && JvmFailureBoundary.isFatal(failure)) {
                fatal = failure;
            }
        }
        try {
            staged.close();
        } catch (Throwable failure) {
            clean = false;
            if (fatal == null && JvmFailureBoundary.isFatal(failure)) {
                fatal = failure;
            }
        }
        if (fatal != null) {
            JvmFailureBoundary.rethrowIfFatal(fatal);
        }
        if (!clean) {
            throw SourceDriverException.cleanup();
        }
    }

    @Override
    public String toString() {
        return "SourceJdbcEndpoint[values=<redacted>]";
    }
}
