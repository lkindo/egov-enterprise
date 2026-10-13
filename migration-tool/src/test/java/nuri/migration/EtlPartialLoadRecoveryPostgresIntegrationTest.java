package nuri.migration;

import nuri.migration.etl.EtlExecutor;
import nuri.migration.etl.MigrationMode;
import nuri.migration.model.MappingSpec;
import nuri.migration.source.SourceIntrospector;
import nuri.migration.transform.TransformerRegistry;
import nuri.migration.verify.MigrationVerifier;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
class EtlPartialLoadRecoveryPostgresIntegrationTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:17-alpine");

    @Test
    void committedFirstChunkSurvivesFailureAndResumeReconcilesWithoutDuplicatingRows() {
        var endpoint = new MappingSpec.DbConfig(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(),
                POSTGRES.getPassword(), "org.postgresql.Driver");
        JdbcTemplate jdbc = new JdbcTemplate(new DriverManagerDataSource(
                endpoint.url(), endpoint.username(), endpoint.password()));
        jdbc.execute("CREATE TABLE public.legacy_resume (id bigint PRIMARY KEY, payload varchar(50))");
        jdbc.execute("INSERT INTO public.legacy_resume SELECT n, 'original' FROM generate_series(1,501) n");
        jdbc.execute("CREATE TABLE public.tb_resume (id bigint PRIMARY KEY, payload varchar(50), "
                + "CONSTRAINT ck_second_chunk CHECK (id < 501 OR payload='fixed'))");
        var table = new MappingSpec.TableMapping("public.legacy_resume", "public.tb_resume", null,
                "id", "id", List.of(
                new MappingSpec.ColumnMapping("id", "id", null, null, null, null, null),
                new MappingSpec.ColumnMapping("payload", "payload", null, null, null, null, null)), null);
        var mapping = new MappingSpec(endpoint, endpoint, List.of(table), Map.of(),
                new MappingSpec.RunContext("partial-load-drill", "synthetic-source"));
        var executor = new EtlExecutor(new SourceIntrospector(), new TransformerRegistry());
        var verifier = new MigrationVerifier();

        var partial = executor.execute(mapping, MigrationMode.COMMIT);
        assertThat(verifier.verify(mapping, partial, jdbc).ok()).isFalse();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM public.tb_resume", Long.class)).isEqualTo(500);
        // 같은 컨테이너의 다른 시험 run 과 섞이지 않도록 run 으로 좁혀 센다.
        assertThat(checkpoints(jdbc, "partial-load-drill")).isEqualTo(500);

        // 실패한 행만 정정한다. 이미 커밋된 source/checkpoint는 바꾸지 않는다.
        jdbc.update("UPDATE public.legacy_resume SET payload='fixed' WHERE id=501");
        var resumed = executor.execute(mapping, MigrationMode.COMMIT);
        var resumedReport = verifier.verify(mapping, resumed, jdbc);
        assertThat(resumedReport.ok()).withFailMessage(resumedReport.toSummary()).isTrue();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM public.tb_resume", Long.class)).isEqualTo(501);
        assertThat(checkpoints(jdbc, "partial-load-drill")).isEqualTo(501);
        assertThat(verifier.verify(mapping, executor.execute(mapping, MigrationMode.COMMIT), jdbc).ok()).isTrue();

        jdbc.update("UPDATE public.tb_resume SET payload='tampered' WHERE id=1");
        assertThat(verifier.verify(mapping, executor.execute(mapping, MigrationMode.COMMIT), jdbc).ok()).isFalse();
    }

    /**
     * [2026-10-13 DEC-OPS-309] 행 변환 실패(미매핑 코드)는 그 chunk 를 한 행도 쓰지 않고 run 을 멈춘다.
     * 실제 PostgreSQL 에서 실패 chunk 의 행·keymap·checkpoint 가 하나도 남지 않고, mapping 을 고친 뒤
     * 같은 run 을 재개하면 마지막 커밋 checkpoint 다음부터 중복 없이 끝까지 적재되는 것을 증명한다.
     * 원천 코드는 char(24) 라 PostgreSQL 이 공백을 채워 돌려준다 — trim 이 codemap 보다 먼저여야 대응한다.
     */
    @Test
    void rowConversionFailureWritesNothingFromItsChunkAndResumeAfterTheMappingFixCompletesWithoutDuplicates() {
        var endpoint = new MappingSpec.DbConfig(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(),
                POSTGRES.getPassword(), "org.postgresql.Driver");
        JdbcTemplate jdbc = new JdbcTemplate(new DriverManagerDataSource(
                endpoint.url(), endpoint.username(), endpoint.password()));
        jdbc.execute("CREATE TABLE public.legacy_codes (id bigint PRIMARY KEY, stat char(24), memo varchar(50))");
        jdbc.execute("INSERT INTO public.legacy_codes SELECT n, CASE WHEN n = 750 THEN 'LEGACY-UNMAPPED-CODE'"
                + " WHEN n % 2 = 0 THEN 'A' ELSE 'B' END, 'memo-' || n FROM generate_series(1,1250) n");
        jdbc.execute("CREATE TABLE public.legacy_after (id bigint PRIMARY KEY, memo varchar(50))");
        jdbc.execute("INSERT INTO public.legacy_after SELECT n, 'after-' || n FROM generate_series(1,3) n");
        jdbc.execute("CREATE TABLE public.tb_codes (code_id varchar(20) PRIMARY KEY, legacy_id bigint NOT NULL,"
                + " stts_cd varchar(1) NOT NULL, memo varchar(50))");
        jdbc.execute("CREATE TABLE public.tb_after (id bigint PRIMARY KEY, memo varchar(50))");
        var codes = new MappingSpec.TableMapping("public.legacy_codes", "public.tb_codes", null,
                "id", null, List.of(
                new MappingSpec.ColumnMapping("id", "legacy_id", null, "long", null, null, null),
                new MappingSpec.ColumnMapping("stat", "stts_cd", "trim", null, "stat_code", null, null),
                new MappingSpec.ColumnMapping("memo", "memo", null, null, null, null, null)),
                new MappingSpec.IdStrategy("code_id", "CODE", "id"));
        var after = new MappingSpec.TableMapping("public.legacy_after", "public.tb_after", null,
                "id", "id", List.of(
                new MappingSpec.ColumnMapping("id", "id", null, null, null, null, null),
                new MappingSpec.ColumnMapping("memo", "memo", null, null, null, null, null)), null);
        var run = new MappingSpec.RunContext("row-failure-drill", "synthetic-source");
        var mapping = new MappingSpec(endpoint, endpoint, List.of(codes, after),
                Map.of("stat_code", MappingSpec.CodeMap.of(Map.of("A", "Y", "B", "N"))), run);
        var executor = new EtlExecutor(new SourceIntrospector(), new TransformerRegistry());
        var verifier = new MigrationVerifier();

        var failed = executor.execute(mapping, MigrationMode.COMMIT);

        assertThat(failed).hasSize(2);
        assertThat(failed.getFirst().written()).isEqualTo(500);
        assertThat(failed.getFirst().errors()).containsExactly("행 변환 실패(public.legacy_codes, column=stts_cd,"
                + " row=750): ROW_TRANSFORM_FAILED:CODEMAP_UNMAPPED — 이 chunk 는 기록하지 않고 적재를 멈췄습니다");
        assertThat(failed.get(1).read()).isZero();
        assertThat(failed.get(1).errors()).singleElement().asString().contains("RUN_STOPPED_BY_ROW_FAILURE");
        var failedReport = verifier.verify(mapping, failed, jdbc);
        assertThat(failedReport.ok()).isFalse();
        assertThat(failedReport.toSummary()).contains("row=750").doesNotContain("LEGACY-UNMAPPED-CODE");
        // 첫 chunk(1~500)만 남는다. 실패 행이 있던 chunk(501~1000)와 그 뒤(1001~1250)는 한 행도 없다.
        assertThat(jdbc.queryForObject("SELECT count(*) FROM public.tb_codes", Long.class)).isEqualTo(500);
        assertThat(jdbc.queryForObject("SELECT max(legacy_id) FROM public.tb_codes", Long.class)).isEqualTo(500);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM public.tb_after", Long.class)).isZero();
        assertThat(checkpoints(jdbc, "row-failure-drill")).isEqualTo(500);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM migration_control.tb_migration_key_map"
                + " WHERE run_id='row-failure-drill'", Long.class)).isEqualTo(500);
        assertThat(jdbc.queryForObject("SELECT run_stts_cd FROM migration_control.tb_migration_run"
                + " WHERE run_id='row-failure-drill'", String.class)).isEqualTo("FAILED");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM public.tb_codes WHERE stts_cd NOT IN ('Y','N')",
                Long.class)).isZero();
        Map<Long, String> committedKeys = keysByLegacyId(jdbc);

        // 미매핑 코드를 승인된 표준 코드로 대응시킨 mapping 으로 같은 run 을 재개한다.
        var fixed = new MappingSpec(endpoint, endpoint, mapping.tables(), Map.of("stat_code",
                MappingSpec.CodeMap.of(Map.of("A", "Y", "B", "N", "LEGACY-UNMAPPED-CODE", "N"))), run);
        var resumed = executor.execute(fixed, MigrationMode.COMMIT);
        var resumedReport = verifier.verify(fixed, resumed, jdbc);

        assertThat(resumedReport.ok()).withFailMessage(resumedReport.toSummary()).isTrue();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM public.tb_codes", Long.class)).isEqualTo(1250);
        assertThat(jdbc.queryForObject("SELECT count(DISTINCT legacy_id) FROM public.tb_codes", Long.class))
                .isEqualTo(1250);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM public.tb_after", Long.class)).isEqualTo(3);
        assertThat(checkpoints(jdbc, "row-failure-drill")).isEqualTo(1253);
        assertThat(jdbc.queryForObject("SELECT stts_cd FROM public.tb_codes WHERE legacy_id=750", String.class))
                .isEqualTo("N");
        // 재개는 커밋된 1~500 행을 다시 쓰지 않고 같은 대리키를 그대로 둔다.
        assertThat(keysByLegacyId(jdbc)).containsAllEntriesOf(committedKeys);
        assertThat(jdbc.queryForObject("SELECT run_stts_cd FROM migration_control.tb_migration_run"
                + " WHERE run_id='row-failure-drill'", String.class)).isEqualTo("COMPLETED");

        var rerun = verifier.verify(fixed, executor.execute(fixed, MigrationMode.COMMIT), jdbc);
        assertThat(rerun.ok()).withFailMessage(rerun.toSummary()).isTrue();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM public.tb_codes", Long.class)).isEqualTo(1250);
    }

    private static long checkpoints(JdbcTemplate jdbc, String runId) {
        return jdbc.queryForObject("SELECT count(*) FROM migration_control.tb_migration_checkpoint WHERE run_id=?",
                Long.class, runId);
    }

    private static Map<Long, String> keysByLegacyId(JdbcTemplate jdbc) {
        Map<Long, String> keys = new HashMap<>();
        jdbc.query("SELECT legacy_id, code_id FROM public.tb_codes", (org.springframework.jdbc.core.RowCallbackHandler)
                resultSet -> keys.put(resultSet.getLong(1), resultSet.getString(2)));
        return keys;
    }
}
