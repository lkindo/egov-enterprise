package nuri.migration.state;

import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.RunContext;
import nuri.migration.model.MappingSpec.TableMapping;
import nuri.migration.schema.MigrationSchemaManager;
import nuri.migration.state.MigrationStateStore.CheckpointEntry;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import java.sql.Connection;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** [ADR-0029 L3c] checkpoint 는 매핑 단위다 — 한 소스를 나눈 매핑은 같은 소스 키를 따로 기록하고 따로 재개한다. */
class MigrationStateStoreTest {

    private static final AtomicInteger SEQ = new AtomicInteger();
    private static final RunContext RUN = new RunContext("split-run", "legacy-ns");

    @Test
    void checkpointsAreScopedByMappingSoSplitMappingsReuseTheSameSourceKey() throws Exception {
        JdbcTemplate target = h2();
        MigrationStateStore state = new MigrationStateStore(RUN);
        state.initialize(target, List.of(mapping(null), mapping("detail")));

        write(target, state, List.of(
                new CheckpointEntry("LEGACY_USER", "1", "tb_user", "U1", "sum-main"),
                new CheckpointEntry("LEGACY_USER", "1", "tb_user_detail", "U1", "sum-detail", "detail"),
                new CheckpointEntry("LEGACY_USER", "2", "tb_user_detail", "U2", "sum-detail-2", "detail")));

        assertThat(state.count("legacy_user", "")).isEqualTo(1);
        assertThat(state.count("legacy_user", "detail")).isEqualTo(2);
        assertThat(state.count("legacy_user", "absent")).isZero();
        assertThat(state.find("legacy_user", "", "1").rowChecksum()).isEqualTo("sum-main");
        assertThat(state.find("legacy_user", "detail", "1").rowChecksum()).isEqualTo("sum-detail");
        assertThat(state.find("legacy_user", "", "2")).isNull();

        MigrationStateStore reloaded = new MigrationStateStore(RUN);
        reloaded.initialize(target, List.of(mapping(null), mapping("detail")));
        assertThat(reloaded.count("LEGACY_USER", "detail")).isEqualTo(2);
        assertThat(reloaded.find("legacy_user", "detail", "2").mappingId()).isEqualTo("detail");
        assertThat(MigrationStateStore.read(target, RUN, "legacy_user", "detail"))
                .extracting(CheckpointEntry::sourceKey).containsExactly("1", "2");
        assertThat(MigrationStateStore.read(target, RUN, "legacy_user"))
                .singleElement().satisfies(entry -> assertThat(entry.mappingId()).isEmpty());
        assertThat(target.queryForObject("SELECT count(*) FROM migration_control.tb_migration_checkpoint"
                + " WHERE mapping_id=''", Long.class)).isEqualTo(1L);
    }

    @Test
    void resumeStopsBeforeTouchingTheRunWhenARecordedMappingIdIsGoneFromItsSource() throws Exception {
        JdbcTemplate target = h2();
        MigrationStateStore state = new MigrationStateStore(RUN);
        state.initialize(target, List.of(mapping(null), mapping("detail")));
        write(target, state, List.of(
                new CheckpointEntry("legacy_user", "1", "tb_user_detail", "U1", "sum", "detail")));
        state.mark(target, "FAILED");

        assertThatThrownBy(() -> new MigrationStateStore(RUN)
                .initialize(target, List.of(mapping(null), mapping("renamed"))))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("재개 가드", "legacy_user#detail", "MAPPING_ID_CHANGED")
                .hasMessageNotContaining("U1");
        // 멈춘 시도는 run 상태를 RUNNING 으로 바꾸지 않는다.
        assertThat(status(target)).isEqualTo("FAILED");

        // 소스가 이번 mapping 에 아예 없으면 그 표를 다루지 않는 것이므로 막지 않는다. 매핑을 더하는 것도 막지 않는다.
        new MigrationStateStore(RUN).initialize(target, List.of(otherSource()));
        new MigrationStateStore(RUN).initialize(target, List.of(mapping(null), mapping("detail"), mapping("extra")));
        assertThat(status(target)).isEqualTo("RUNNING");
    }

    @Test
    void theDefaultMappingCheckpointIsTheEmptyMappingIdAndRenamingItIsAlsoGuarded() throws Exception {
        JdbcTemplate target = h2();
        MigrationStateStore state = new MigrationStateStore(RUN);
        state.initialize(target, List.of(mapping(null)));
        write(target, state, List.of(new CheckpointEntry("legacy_user", "1", "tb_user", "U1", "sum")));

        assertThatThrownBy(() -> new MigrationStateStore(RUN).initialize(target, List.of(mapping("main"))))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("legacy_user(기본 매핑)", "MAPPING_ID_CHANGED");
    }

    /**
     * 기록된 id 가 그대로 있어도 그 매핑이 다른 대상 표에 쓰면 개명이다 — 기본 id 를 확장 매핑에 넘기고 소유 매핑에 새 id 를
     * 준 재개는 run 상태를 바꾸기 전에 멈춘다. 대상 표기는 대소문자를 가리지 않는다.
     */
    @Test
    void resumeStopsWhenARecordedMappingIdNowWritesAnotherTarget() throws Exception {
        JdbcTemplate target = h2();
        MigrationStateStore state = new MigrationStateStore(RUN);
        state.initialize(target, List.of(mapping(null)));
        write(target, state, List.of(new CheckpointEntry("legacy_user", "1", "tb_user", "U1", "sum")));
        state.mark(target, "FAILED");

        assertThatThrownBy(() -> new MigrationStateStore(RUN)
                .initialize(target, List.of(mapping("main"), targeting(null, "tb_user_addr"))))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("재개 가드", "legacy_user(기본 매핑)", "다른 대상 표", "MAPPING_ID_CHANGED")
                .hasMessageNotContaining("U1");
        assertThat(status(target)).isEqualTo("FAILED");

        new MigrationStateStore(RUN).initialize(target, List.of(targeting(null, "TB_USER"), mapping("detail")));
        assertThat(status(target)).isEqualTo("RUNNING");
    }

    /** 한 범위의 checkpoint 가 두 대상 표를 가리키면 어느 쪽을 선언해도 재개할 수 없다. */
    @Test
    void aScopeWhoseCheckpointsNameTwoTargetsCannotResume() throws Exception {
        JdbcTemplate target = h2();
        MigrationStateStore state = new MigrationStateStore(RUN);
        state.initialize(target, List.of(mapping("detail")));
        write(target, state, List.of(
                new CheckpointEntry("legacy_user", "1", "tb_user_detail", "U1", "sum", "detail"),
                new CheckpointEntry("legacy_user", "2", "tb_user_other", "U2", "sum", "detail")));

        assertThatThrownBy(() -> new MigrationStateStore(RUN).initialize(target, List.of(mapping("detail"))))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("legacy_user#detail", "다른 대상 표", "MAPPING_ID_CHANGED");
    }

    private static void write(JdbcTemplate target, MigrationStateStore state, List<CheckpointEntry> entries)
            throws Exception {
        try (Connection connection = target.getDataSource().getConnection()) {
            connection.setAutoCommit(false);
            state.write(connection, entries);
            connection.commit();
        }
        state.accept(entries);
    }

    private static String status(JdbcTemplate target) {
        return target.queryForObject("SELECT run_stts_cd FROM migration_control.tb_migration_run"
                + " WHERE run_id=? AND source_namespace=?", String.class, RUN.runId(), RUN.sourceNamespace());
    }

    private static TableMapping mapping(String id) {
        return new TableMapping("LEGACY_USER", id == null ? "tb_user" : "tb_user_" + id, null, "USER_ID",
                List.of(), "user_id", List.of(new ColumnMapping("USER_ID", "user_id", null, null, null, null, null)),
                null, null, List.of(), id);
    }

    private static TableMapping targeting(String id, String targetTable) {
        return new TableMapping("LEGACY_USER", targetTable, null, "USER_ID", List.of(), "user_id",
                List.of(new ColumnMapping("USER_ID", "user_id", null, null, null, null, null)),
                null, null, List.of(), id);
    }

    private static TableMapping otherSource() {
        return new TableMapping("LEGACY_DEPT", "tb_dept", null, "DEPT_ID", List.of(), "dept_id",
                List.of(new ColumnMapping("DEPT_ID", "dept_id", null, null, null, null, null)),
                null, null, List.of(), null);
    }

    private static JdbcTemplate h2() {
        DriverManagerDataSource dataSource = new DriverManagerDataSource(
                "jdbc:h2:mem:state_" + SEQ.incrementAndGet() + ";MODE=PostgreSQL;DB_CLOSE_DELAY=-1", "sa", "");
        dataSource.setDriverClassName("org.h2.Driver");
        JdbcTemplate target = new JdbcTemplate(dataSource);
        new MigrationSchemaManager().migrateAndValidate(target);
        return target;
    }
}
