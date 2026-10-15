package nuri.migration;

import nuri.migration.adapter.EvidenceLevel;
import nuri.migration.adapter.SourceReadSessionPolicy;
import nuri.migration.etl.EtlExecutor;
import nuri.migration.etl.MigrationMode;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.IdStrategy;
import nuri.migration.model.MappingSpec.TableMapping;
import nuri.migration.schema.ControlSchemaFixtures;
import nuri.migration.schema.MigrationSchemaManager;
import nuri.migration.source.SourceIntrospector;
import nuri.migration.transform.TransformerRegistry;
import nuri.migration.verify.MigrationReport;
import nuri.migration.verify.MigrationVerifier;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * [ADR-0029 L3c, DEC-OPS-319] 한 소스 표를 두 대상으로 나눈 매핑을 실제 PostgreSQL 에서 적재·재개한다. keymap 은 소스 단위로
 * 소유 매핑 하나가 만들고, 확장 매핑은 자기 소스를 fkRef 로 가리켜 같은 대리키를 쓴다. checkpoint 는 매핑마다 따로 남는다.
 */
@Testcontainers
class EtlSplitMappingPostgresIntegrationTest {

    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:17-alpine");

    private final EtlExecutor executor = new EtlExecutor(new SourceIntrospector(), new TransformerRegistry());
    private final MigrationVerifier verifier = new MigrationVerifier();

    @Test
    void oneSourceSplitsIntoTwoTargetsThatShareTheOwnersSurrogateKey() {
        Fixture fixture = fixture("split_share", "split-share-run");
        fixture.jdbc().update("INSERT INTO public.legacy_split_share VALUES ('M1', '김가', '서울'),"
                + " ('M2', '이나', '부산'), ('M3', '박다', '대구')");
        MappingSpec mapping = fixture.mapping(null, "addr");

        List<EtlExecutor.TableResult> results = executor.execute(mapping, MigrationMode.COMMIT);
        MigrationReport report = verifier.verify(mapping, results, fixture.jdbc());

        assertThat(report.ok()).withFailMessage(report.toSummary()).isTrue();
        // 선언은 확장 매핑이 먼저지만 keymap 소유 매핑이 먼저 실행된다.
        assertThat(results).extracting(EtlExecutor.TableResult::mappingId).containsExactly(null, "addr");
        assertThat(results).allSatisfy(result -> {
            assertThat(result.errors()).isEmpty();
            assertThat(result.written()).isEqualTo(3);
        });
        assertThat(report.tables()).extracting(MigrationReport.TableReport::label)
                .containsExactly("public.legacy_split_share", "public.legacy_split_share#addr");
        assertThat(fixture.count("SELECT count(*) FROM public.tb_split_share m JOIN public.tb_split_share_addr a"
                + " ON a.esntl_id = m.esntl_id")).isEqualTo(3);
        assertThat(fixture.checkpoints("")).isEqualTo(3);
        assertThat(fixture.checkpoints("addr")).isEqualTo(3);
        assertThat(fixture.count("SELECT count(*) FROM migration_control.tb_migration_key_map WHERE run_id='"
                + fixture.runId() + "'")).isEqualTo(3);
    }

    @Test
    void failureOfTheSecondMappingStopsItAndTheSameRunResumesWithoutDuplicates() {
        Fixture fixture = fixture("split_resume", "split-resume-run");
        fixture.jdbc().update("INSERT INTO public.legacy_split_resume VALUES ('M1', '김가', '서울'),"
                + " ('M2', '이나', 'bad'), ('M3', '박다', '대구')");
        fixture.jdbc().execute("ALTER TABLE public.tb_split_resume_addr ADD CONSTRAINT ck_split_resume CHECK (addr <> 'bad')");
        MappingSpec mapping = fixture.mapping(null, "addr");

        List<EtlExecutor.TableResult> failed = executor.execute(mapping, MigrationMode.COMMIT);

        assertThat(failed.getFirst().written()).isEqualTo(3);
        assertThat(failed.get(1).written()).isZero();
        assertThat(failed.get(1).errors()).singleElement().asString()
                .startsWith("행 쓰기 실패(public.legacy_split_resume#addr, target=public.tb_split_resume_addr, row=2):"
                        + " ATOMIC_WRITE_FAILED")
                .doesNotContain("bad", "이나");
        assertThat(verifier.verify(mapping, failed, fixture.jdbc()).ok()).isFalse();
        assertThat(fixture.checkpoints("")).isEqualTo(3);
        assertThat(fixture.checkpoints("addr")).isZero();

        fixture.jdbc().update("UPDATE public.legacy_split_resume SET addr='광주' WHERE member_no='M2'");
        List<EtlExecutor.TableResult> resumed = executor.execute(mapping, MigrationMode.COMMIT);
        MigrationReport report = verifier.verify(mapping, resumed, fixture.jdbc());

        assertThat(report.ok()).withFailMessage(report.toSummary()).isTrue();
        assertThat(fixture.count("SELECT count(*) FROM public.tb_split_resume")).isEqualTo(3);
        assertThat(fixture.count("SELECT count(*) FROM public.tb_split_resume_addr")).isEqualTo(3);
        assertThat(fixture.checkpoints("")).isEqualTo(3);
        assertThat(fixture.checkpoints("addr")).isEqualTo(3);
    }

    /** 매핑 id 를 바꾼 채 재개하면 새 id 의 매핑이 이미 적재한 행을 다시 쓴다 — 행을 읽거나 쓰기 전에 멈춘다. */
    @Test
    void changingAMappingIdAndResumingStopsBeforeAnyWrite() {
        Fixture fixture = fixture("split_rename", "split-rename-run");
        fixture.jdbc().update("INSERT INTO public.legacy_split_rename VALUES ('M1', '김가', '서울'), ('M2', '이나', '부산')");
        List<EtlExecutor.TableResult> first = executor.execute(fixture.mapping(null, "addr"), MigrationMode.COMMIT);
        assertThat(first).allSatisfy(result -> assertThat(result.errors()).isEmpty());
        fixture.jdbc().update("INSERT INTO public.legacy_split_rename VALUES ('M3', '박다', '대구')");

        assertThatThrownBy(() -> executor.execute(fixture.mapping(null, "address"), MigrationMode.COMMIT))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("재개 가드", "public.legacy_split_rename#addr", "MAPPING_ID_CHANGED");

        assertThat(fixture.count("SELECT count(*) FROM public.tb_split_rename")).isEqualTo(2);
        assertThat(fixture.count("SELECT count(*) FROM public.tb_split_rename_addr")).isEqualTo(2);
        assertThat(fixture.checkpoints("address")).isZero();
        assertThat(fixture.jdbc().queryForObject("SELECT run_stts_cd FROM migration_control.tb_migration_run"
                + " WHERE run_id=?", String.class, fixture.runId())).isEqualTo("LOADED");
    }

    /**
     * 나누지 않은 매핑(기본 id '')으로 적재한 run 을, 소유 매핑에 id 'main' 을 주고 기본 id 를 확장 매핑에 넘긴 채 재개한다.
     * 기록된 id '' 는 그대로 있지만 이제 다른 대상 표에 쓴다 — 'main' 이 이미 적재한 행을 다시 쓰기 전에 멈춘다.
     */
    @Test
    void handingTheDefaultMappingIdToAnotherTargetAndResumingStopsBeforeAnyWrite() {
        Fixture fixture = fixture("split_default", "split-default-run");
        fixture.jdbc().update("INSERT INTO public.legacy_split_default VALUES ('M1', '김가', '서울'), ('M2', '이나', '부산')");
        List<EtlExecutor.TableResult> first = executor.execute(fixture.ownerOnly(), MigrationMode.COMMIT);
        assertThat(first).singleElement().satisfies(result -> assertThat(result.errors()).isEmpty());
        assertThat(fixture.checkpoints("")).isEqualTo(2);
        fixture.jdbc().update("INSERT INTO public.legacy_split_default VALUES ('M3', '박다', '대구')");

        assertThatThrownBy(() -> executor.execute(fixture.mapping("main", null), MigrationMode.COMMIT))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("재개 가드", "public.legacy_split_default(기본 매핑)", "다른 대상 표",
                        "MAPPING_ID_CHANGED");

        assertThat(fixture.count("SELECT count(*) FROM public.tb_split_default")).isEqualTo(2);
        assertThat(fixture.count("SELECT count(*) FROM public.tb_split_default_addr")).isZero();
        assertThat(fixture.checkpoints("main")).isZero();
        assertThat(fixture.jdbc().queryForObject("SELECT run_stts_cd FROM migration_control.tb_migration_run"
                + " WHERE run_id=?", String.class, fixture.runId())).isEqualTo("LOADED");
    }

    /**
     * 이전 도구(V1 제어 스키마)가 남긴 run — 확인 없이 COMMIT 하면 아무것도 바꾸지 않고 멈춘다. 확인하면 V2 로 올린 뒤 같은
     * run 이 앞서 기록한 행을 기본 매핑('')의 checkpoint 로 대조해 건너뛰고 나머지만 쓴다.
     */
    @Test
    void existingV1RunNeedsAcknowledgementThenResumesInTheSameRunWithoutDuplicates() {
        JdbcTemplate jdbc = jdbc();
        jdbc.execute("DROP SCHEMA IF EXISTS migration_control CASCADE");
        jdbc.execute("CREATE TABLE public.legacy_v1_resume (id bigint PRIMARY KEY, nm varchar(20))");
        jdbc.execute("CREATE TABLE public.tb_v1_resume (id bigint PRIMARY KEY, nm varchar(20))");
        jdbc.update("INSERT INTO public.legacy_v1_resume VALUES (1, 'a'), (2, 'b')");
        TableMapping table = new TableMapping("public.legacy_v1_resume", "public.tb_v1_resume", null, "id", "id",
                List.of(new ColumnMapping("id", "id", null, null, null, null, null),
                        new ColumnMapping("nm", "nm", null, null, null, null, null)), null);
        MappingSpec mapping = new MappingSpec(endpoint(), endpoint(), List.of(table), Map.of(),
                new MappingSpec.RunContext("v1-resume-run", "synthetic-source"));
        assertThat(executor.execute(mapping, MigrationMode.COMMIT))
                .singleElement().satisfies(result -> assertThat(result.errors()).isEmpty());
        // 같은 행을 이전 도구가 기록한 것처럼 V1 제어 스키마로 되돌린다(mapping_id 없는 checkpoint).
        List<Map<String, Object>> checkpoints = jdbc.queryForList("SELECT source_table, source_key, target_table,"
                + " target_key, row_checksum FROM migration_control.tb_migration_checkpoint WHERE run_id='v1-resume-run'");
        jdbc.execute("DROP SCHEMA migration_control CASCADE");
        ControlSchemaFixtures.createV1(jdbc, "migration_control");
        jdbc.update("INSERT INTO migration_control.tb_migration_run (run_id, source_namespace, run_stts_cd)"
                + " VALUES ('v1-resume-run', 'synthetic-source', 'FAILED')");
        for (Map<String, Object> row : checkpoints) {
            jdbc.update("INSERT INTO migration_control.tb_migration_checkpoint (run_id, source_namespace,"
                    + " source_table, source_key, target_table, target_key, row_checksum) VALUES"
                    + " ('v1-resume-run', 'synthetic-source', ?, ?, ?, ?, ?)", row.get("source_table"),
                    row.get("source_key"), row.get("target_table"), row.get("target_key"), row.get("row_checksum"));
        }
        jdbc.update("INSERT INTO public.legacy_v1_resume VALUES (3, 'c')");

        assertThatThrownBy(() -> executor.execute(mapping, MigrationMode.COMMIT))
                .isInstanceOf(MigrationSchemaManager.ControlSchemaUpgradeRequired.class)
                .hasMessageContaining("--ack-control-schema-upgrade");
        assertThat(ControlSchemaFixtures.appliedVersion(jdbc)).isEqualTo("1");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM public.tb_v1_resume", Long.class)).isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT run_stts_cd FROM migration_control.tb_migration_run"
                + " WHERE run_id='v1-resume-run'", String.class)).isEqualTo("FAILED");

        List<EtlExecutor.TableResult> resumed = executor.execute(mapping, MigrationMode.COMMIT, jdbc, jdbc,
                SourceReadSessionPolicy.repeatableRead(EvidenceLevel.UNVERIFIED, "split mapping drill"), true, true);
        MigrationReport report = verifier.verify(mapping, resumed, jdbc);

        assertThat(report.ok()).withFailMessage(report.toSummary()).isTrue();
        assertThat(ControlSchemaFixtures.appliedVersion(jdbc)).isEqualTo("2");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM public.tb_v1_resume", Long.class)).isEqualTo(3);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM migration_control.tb_migration_checkpoint"
                + " WHERE run_id='v1-resume-run' AND mapping_id=''", Long.class)).isEqualTo(3);
    }

    private Fixture fixture(String name, String runId) {
        JdbcTemplate jdbc = jdbc();
        jdbc.execute("CREATE TABLE public.legacy_" + name + " (member_no varchar(10) PRIMARY KEY,"
                + " member_nm varchar(50), addr varchar(100))");
        jdbc.execute("CREATE TABLE public.tb_" + name + " (esntl_id varchar(30) PRIMARY KEY, member_nm varchar(50))");
        jdbc.execute("CREATE TABLE public.tb_" + name + "_addr (esntl_id varchar(30) PRIMARY KEY, addr varchar(100))");
        return new Fixture(jdbc, name, runId);
    }

    private static JdbcTemplate jdbc() {
        return new JdbcTemplate(new DriverManagerDataSource(
                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword()));
    }

    private static MappingSpec.DbConfig endpoint() {
        return new MappingSpec.DbConfig(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(),
                POSTGRES.getPassword(), "org.postgresql.Driver");
    }

    private record Fixture(JdbcTemplate jdbc, String name, String runId) {

        /** 확장 매핑을 먼저 선언한다 — 실행 순서는 keymap 소유 매핑이 먼저여야 한다. */
        MappingSpec mapping(String ownerId, String extensionId) {
            String source = "public.legacy_" + name;
            TableMapping owner = new TableMapping(source, "public.tb_" + name, null, "member_no", List.of(), null,
                    List.of(new ColumnMapping("member_nm", "member_nm", null, null, null, null, null)),
                    new IdStrategy("esntl_id", "MBR", "member_no"), null, List.of(), ownerId);
            TableMapping extension = new TableMapping(source, "public.tb_" + name + "_addr", null, "member_no",
                    List.of(), "esntl_id",
                    List.of(new ColumnMapping("member_no", "esntl_id", null, null, null, source, null),
                            new ColumnMapping("addr", "addr", null, null, null, null, null)),
                    null, null, List.of(), extensionId);
            return new MappingSpec(endpoint(), endpoint(), List.of(extension, owner), Map.of(),
                    new MappingSpec.RunContext(runId, "synthetic-source"));
        }

        /** 나누지 않은 매핑 — 소유 매핑 하나(id 생략)만 있다. */
        MappingSpec ownerOnly() {
            TableMapping owner = mapping(null, "addr").tables().get(1);
            return new MappingSpec(endpoint(), endpoint(), List.of(owner), Map.of(),
                    new MappingSpec.RunContext(runId, "synthetic-source"));
        }

        long checkpoints(String mappingId) {
            return count("SELECT count(*) FROM migration_control.tb_migration_checkpoint WHERE run_id='" + runId
                    + "' AND mapping_id='" + mappingId + "'");
        }

        long count(String sql) {
            Long value = jdbc.queryForObject(sql, Long.class);
            return value == null ? 0L : value;
        }
    }
}
