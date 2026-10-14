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

    private static MigrationPlan plan() {
        PlanCoverage coverage = new PlanCoverage(0, 0, 0, 0);
        return new MigrationPlan(MigrationPlan.CURRENT_SCHEMA_VERSION, "b".repeat(64), "c".repeat(64),
                "d".repeat(64), "e".repeat(64), "PostgreSQL 17", List.of(), coverage,
                new MigrationPlanValidator().validate(List.of(), coverage));
    }
}
