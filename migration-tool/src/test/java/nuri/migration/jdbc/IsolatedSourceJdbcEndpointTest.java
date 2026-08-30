package nuri.migration.jdbc;

import nuri.migration.artifact.SourceDriverEvidence;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.net.URLClassLoader;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class IsolatedSourceJdbcEndpointTest {

    @Test
    void nonFatalConnectionCleanupErrorDoesNotSkipLoaderOrStagedJarCleanup() throws Exception {
        ExternalDriverDataSource dataSource = mock(ExternalDriverDataSource.class);
        URLClassLoader loader = mock(URLClassLoader.class);
        StagedDriverJars staged = mock(StagedDriverJars.class);
        given(dataSource.closeConnections()).willThrow(
                new AssertionError("sentinel-private-cleanup"));
        IsolatedSourceJdbcEndpoint endpoint = new IsolatedSourceJdbcEndpoint(
                mock(JdbcTemplate.class),
                dataSource,
                SourceDriverEvidence.isolated(
                        "vendor.jdbc.Driver", List.of("a".repeat(64))),
                loader,
                staged);

        assertThatThrownBy(endpoint::close)
                .isInstanceOf(SourceDriverException.class)
                .hasNoCause()
                .hasMessageNotContaining("sentinel");

        verify(loader).close();
        verify(staged).close();
    }
}
