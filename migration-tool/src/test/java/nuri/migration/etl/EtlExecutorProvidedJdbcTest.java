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

    /**
     * [ADR-0029 L3c·L3e] 한 소스를 나눈 매핑 가운데 keymap 소유 매핑도 id 를 생략한 매핑도 없으면 보관 컬럼을 붙일 읽기를 정할
     * 수 없다 — 정적 검증을 거치지 않는 직접 호출도 연결을 열기 전에 멈춘다. 둘 중 하나가 있으면 그 읽기에 붙는다.
     */
    @Test
    void anArchiveOfASplitSourceWithoutAnOwnerOrADefaultMappingIsRefusedBeforeAnyConnection() {
        MappingSpec.TableMapping first = new MappingSpec.TableMapping("legacy.user_mst", "public.tb_user_info", null,
                null, List.of("USER_SN"), "esntl_id", List.of(), null, null, List.of(), "main");
        MappingSpec.TableMapping second = new MappingSpec.TableMapping("legacy.user_mst", "public.tb_user_addr", null,
                null, List.of("USER_SN"), "esntl_id", List.of(), null, null, List.of(), "addr");
        MappingSpec.TableMapping defaulted = new MappingSpec.TableMapping("legacy.user_mst", "public.tb_user_addr",
                null, null, List.of("USER_SN"), "esntl_id", List.of(), null, null, List.of(), null);
        MappingSpec.ArchiveDump dump = new MappingSpec.ArchiveDump("legacy_user_mst_20311231", "LEGACY.USER_MST", null,
                List.of(), List.of("ETC1"), List.of("U7"), "2031-12-31");
        MappingSpec ambiguous = new MappingSpec(null, null, List.of(first, second), Map.of(), null, null, List.of(dump));
        MappingSpec withDefault = new MappingSpec(null, null, List.of(first, defaulted), Map.of(), null, null,
                List.of(dump));

        assertThatThrownBy(() -> EtlExecutor.requireArchiveRules(ambiguous, nuri.migration.archive.ArchiveRun.counting(),
                false)).isInstanceOf(IllegalArgumentException.class).hasMessage("LEGACY.USER_MST: 분할한 소스의 보관을 붙일"
                + " 읽기(keymap 소유 매핑이나 id 를 생략한 매핑)가 없습니다");
        assertThat(withDefault.mappedTableOf("legacy.user_mst")).isSameAs(defaulted);
        EtlExecutor.requireArchiveRules(withDefault, nuri.migration.archive.ArchiveRun.counting(), false);
    }
}
