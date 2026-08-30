package nuri.migration.etl;

import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.DbConfig;
import nuri.migration.source.SourceIntrospector;
import nuri.migration.transform.TransformerRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

class EtlExecutorProvidedJdbcTest {

    @Test
    void suppliedJdbcBoundaryPreventsSourceRecreation() {
        SourceIntrospector introspector = mock(SourceIntrospector.class);
        JdbcTemplate source = mock(JdbcTemplate.class);
        given(source.getDataSource()).willReturn(mock(DataSource.class));
        MappingSpec spec = new MappingSpec(
                new DbConfig("jdbc:external:source", "user", "password", "driver"),
                null, List.of(), Map.of());
        EtlExecutor executor = new EtlExecutor(introspector, new TransformerRegistry());

        assertThat(executor.execute(spec, MigrationMode.DRY_RUN, source, null)).isEmpty();

        verifyNoInteractions(introspector);
    }

    @Test
    void suppliedJdbcBoundaryFailsClosedWhenRequiredDataSourceIsMissing() {
        SourceIntrospector introspector = mock(SourceIntrospector.class);
        JdbcTemplate source = mock(JdbcTemplate.class);
        MappingSpec spec = new MappingSpec(
                new DbConfig("jdbc:external:source", "user", "password", "driver"),
                null, List.of(), Map.of());
        EtlExecutor executor = new EtlExecutor(introspector, new TransformerRegistry());

        assertThatThrownBy(() -> executor.execute(spec, MigrationMode.DRY_RUN, source, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("source JDBC");
    }
}
