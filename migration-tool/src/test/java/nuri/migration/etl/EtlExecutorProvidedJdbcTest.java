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

    /**
     * [ADR-0029 L3c·L3e] 덤프는 읽는 매핑의 where 로 걸러진 행만 담는다. 읽는 매핑에 where 가 있는데 다른 매핑이 다른 where 로
     * 읽으면 그 매핑이 적재한 행의 보관 값이 덤프에서 빠진다 — 정적 검증을 거치지 않는 직접 호출도 연결을 열기 전에 멈춘다.
     * 읽는 매핑에 where 가 없거나 모든 매핑의 where 가 같으면 받는다.
     */
    @Test
    void anArchiveOfASplitSourceWhoseReaderDoesNotReadEveryMappingsRowsIsRefusedBeforeAnyConnection() {
        MappingSpec.ArchiveDump dump = new MappingSpec.ArchiveDump("legacy_user_mst_20311231", "legacy.user_mst", null,
                List.of(), List.of("ETC1"), List.of("U7"), "2031-12-31");
        String refusal = "legacy.user_mst: 분할한 소스의 보관은 읽는 매핑에 where 가 없거나 그 소스의 모든 매핑이 같은"
                + " where 를 써야 합니다 — 다른 where 로 적재한 행의 보관 컬럼이 덤프에서 빠집니다";

        for (String[] wheres : List.of(new String[] {"KIND = 'P'", "KIND = 'C'"}, new String[] {"KIND = 'P'", null},
                new String[] {"KIND = 'P'", "KIND='P'"})) {
            MappingSpec spec = splitArchive(wheres[0], wheres[1], dump);
            assertThatThrownBy(() -> EtlExecutor.requireArchiveRules(spec,
                    nuri.migration.archive.ArchiveRun.counting(), false))
                    .as(String.join(" / ", java.util.Arrays.asList(wheres)))
                    .isInstanceOf(IllegalArgumentException.class).hasMessage(refusal);
        }
        for (String[] wheres : List.of(new String[] {null, "KIND = 'C'"}, new String[] {" ", "KIND = 'C'"},
                new String[] {" KIND = 'P' ", "KIND = 'P'"})) {
            EtlExecutor.requireArchiveRules(splitArchive(wheres[0], wheres[1], dump),
                    nuri.migration.archive.ArchiveRun.counting(), false);
        }
    }

    /** id 를 생략한 매핑(보관을 읽는다)과 id 'corp' 매핑으로 나눈 소스 하나와 그 보관. */
    private static MappingSpec splitArchive(String readerWhere, String siblingWhere, MappingSpec.ArchiveDump dump) {
        MappingSpec.TableMapping reader = new MappingSpec.TableMapping("legacy.user_mst", "public.tb_user_info",
                readerWhere, null, List.of("USER_SN"), "esntl_id", List.of(), null, null, List.of(), null);
        MappingSpec.TableMapping sibling = new MappingSpec.TableMapping("legacy.user_mst", "public.tb_corp_info",
                siblingWhere, null, List.of("USER_SN"), "esntl_id", List.of(), null, null, List.of(), "corp");
        return new MappingSpec(null, null, List.of(sibling, reader), Map.of(), null, null, List.of(dump));
    }
}
