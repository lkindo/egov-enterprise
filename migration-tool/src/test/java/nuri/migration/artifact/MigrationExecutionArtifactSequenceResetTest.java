package nuri.migration.artifact;

import com.fasterxml.jackson.databind.ObjectMapper;
import nuri.migration.etl.EtlExecutor;
import nuri.migration.etl.MigrationMode;
import nuri.migration.etl.TargetSequenceSynchronizer.Action;
import nuri.migration.etl.TargetSequenceSynchronizer.SequenceReset;
import nuri.migration.plan.MigrationPlan;
import nuri.migration.plan.MigrationPlanValidator;
import nuri.migration.plan.PlanCoverage;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** 실행 artifact 가 시퀀스 재설정(DEC-OPS-306)과 nullify 건수를 이름과 결과로만 남기는지 확인한다. */
class MigrationExecutionArtifactSequenceResetTest {

    @Test
    void sequenceResetsAreRecordedByNameAndActionOnly() throws Exception {
        EtlExecutor.TableResult loaded = new EtlExecutor.TableResult("legacy_item", "tb_item", 4, 4, 4, List.of(),
                List.of(new SequenceReset("tb_item", "id", "public.tb_item_id_seq", Action.ADVANCED),
                        new SequenceReset("tb_item", "code", null, Action.DECLARED_NONE)));
        EtlExecutor.TableResult untouched = new EtlExecutor.TableResult("legacy_note", "tb_note", 1, 1, 1, List.of());

        String json = MigrationExecutionArtifact.encode(
                plan(), MigrationMode.COMMIT, "PASS", Instant.parse("2026-10-13T00:00:00Z"), null,
                List.of(loaded, untouched));

        MigrationExecutionArtifact artifact = new ObjectMapper().readValue(json, MigrationExecutionArtifact.class);
        assertThat(artifact.sequenceResets()).containsExactly(
                new MigrationExecutionArtifact.SequenceResetRecord("tb_item", "id", "public.tb_item_id_seq", "ADVANCED"),
                new MigrationExecutionArtifact.SequenceResetRecord("tb_item", "code", null, "DECLARED_NONE"));
        assertThat(MigrationExecutionArtifact.encode(
                plan(), MigrationMode.COMMIT, "STARTED", Instant.parse("2026-10-13T00:00:00Z"), null))
                .contains("\"sequenceResets\":[]");
    }

    /** nullify 로 NULL 이 된 값은 대상 테이블·컬럼별 행 수로만 남긴다(ADR-0029 L3a-1). */
    @Test
    void nullifiedRowsAreRecordedByTargetColumnAndCountOnly() throws Exception {
        EtlExecutor.TableResult cleaned = new EtlExecutor.TableResult("legacy_item", "tb_item", 4, 4, 4, List.of(),
                List.of(), new java.util.LinkedHashMap<>(java.util.Map.of("end_ymd", 3L)));
        EtlExecutor.TableResult untouched = new EtlExecutor.TableResult("legacy_note", "tb_note", 1, 1, 1, List.of());

        String json = MigrationExecutionArtifact.encode(
                plan(), MigrationMode.COMMIT, "PASS", Instant.parse("2026-10-13T00:00:00Z"), null,
                List.of(cleaned, untouched));

        MigrationExecutionArtifact artifact = new ObjectMapper().readValue(json, MigrationExecutionArtifact.class);
        assertThat(artifact.nullified()).containsExactly(
                new MigrationExecutionArtifact.NullifiedRecord("tb_item", "end_ymd", 3));
        assertThat(json).contains("\"nullified\":[{\"target\":\"tb_item\",\"column\":\"end_ymd\",\"rows\":3}]");
        assertThat(MigrationExecutionArtifact.encode(
                plan(), MigrationMode.COMMIT, "STARTED", Instant.parse("2026-10-13T00:00:00Z"), null))
                .contains("\"nullified\":[]");
    }

    /**
     * [ADR-0029 L3c] 나눈 매핑은 표 집계에 매핑 id 를, COMMIT 은 제어 스키마 버전의 적용 전후를 남긴다. 기본 매핑과 두 값이
     * 없는 실행의 증거에는 그 필드가 없다(종전과 같은 바이트).
     */
    @Test
    void splitMappingIdAndControlSchemaVersionsAppearOnlyWhenPresent() throws Exception {
        var report = new nuri.migration.verify.MigrationReport(List.of(
                new nuri.migration.verify.MigrationReport.TableReport("legacy_user", "tb_user", 2, 2, 2, 0, 2,
                        nuri.migration.verify.MigrationReport.Status.PASS, ""),
                new nuri.migration.verify.MigrationReport.TableReport("legacy_user", "tb_user_addr", 2, 2, 2, 0, 2,
                        nuri.migration.verify.MigrationReport.Status.PASS, "", "addr")),
                nuri.migration.verify.MigrationReport.Status.PASS);

        String json = MigrationExecutionArtifact.encode(plan(), MigrationMode.COMMIT, "PASS",
                Instant.parse("2026-10-15T00:00:00Z"), report, List.of(),
                new MigrationExecutionArtifact.ControlSchemaRecord("1", "2"));

        assertThat(json).contains("\"target\":\"tb_user_addr\",\"read\":2", "\"mapping\":\"addr\"",
                "\"controlSchema\":{\"before\":\"1\",\"after\":\"2\"}");
        assertThat(json.split("\"mapping\"", -1)).hasSize(2);
        String started = MigrationExecutionArtifact.encode(plan(), MigrationMode.COMMIT, "STARTED",
                Instant.parse("2026-10-15T00:00:00Z"), null, null, new MigrationExecutionArtifact.ControlSchemaRecord("none", null));
        assertThat(started).contains("\"controlSchema\":{\"before\":\"none\"}");
        assertThat(MigrationExecutionArtifact.encode(plan(), MigrationMode.DRY_RUN, "PASS",
                Instant.parse("2026-10-15T00:00:00Z"), report, List.of())).doesNotContain("controlSchema");
    }

    /**
     * [ADR-0029 L3d] at_most_one 조회의 짝 없는 행은 소스·매핑 id·별칭·행 수로만 남긴다(키·값 없음). 짝 없는 행이 없는 실행의
     * 증거에는 그 필드가 없다(종전과 같은 바이트).
     */
    @Test
    void lookupMissesAreRecordedBySourceMappingAndAliasOnlyWhenPresent() throws Exception {
        EtlExecutor.TableResult orders = new EtlExecutor.TableResult("legacy_orders", "tb_order", 3, 3, 3, List.of(),
                List.of(), java.util.Map.of(), "orders", new java.util.LinkedHashMap<>(java.util.Map.of("cust", 2L)));
        EtlExecutor.TableResult untouched = new EtlExecutor.TableResult("legacy_note", "tb_note", 1, 1, 1, List.of());

        String json = MigrationExecutionArtifact.encode(
                plan(), MigrationMode.COMMIT, "PASS", Instant.parse("2026-10-15T00:00:00Z"), null,
                List.of(orders, untouched));

        MigrationExecutionArtifact artifact = new ObjectMapper().readValue(json, MigrationExecutionArtifact.class);
        assertThat(artifact.lookupMisses()).containsExactly(
                new MigrationExecutionArtifact.LookupMissRecord("legacy_orders", "orders", "cust", 2));
        assertThat(json).contains(
                "\"lookupMisses\":[{\"source\":\"legacy_orders\",\"mapping\":\"orders\",\"lookup\":\"cust\",\"rows\":2}]");
        assertThat(MigrationExecutionArtifact.encode(
                plan(), MigrationMode.COMMIT, "PASS", Instant.parse("2026-10-15T00:00:00Z"), null,
                List.of(untouched))).doesNotContain("lookupMisses");
        assertThat(MigrationExecutionArtifact.encode(
                plan(), MigrationMode.COMMIT, "STARTED", Instant.parse("2026-10-15T00:00:00Z"), null))
                .doesNotContain("lookupMisses");
    }

    private static MigrationPlan plan() {
        PlanCoverage coverage = new PlanCoverage(0, 0, 0, 0);
        return new MigrationPlan(MigrationPlan.CURRENT_SCHEMA_VERSION, "b".repeat(64), "c".repeat(64),
                "d".repeat(64), "e".repeat(64), "PostgreSQL 17", List.of(), coverage,
                new MigrationPlanValidator().validate(List.of(), coverage));
    }
}
