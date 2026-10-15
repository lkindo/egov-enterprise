package nuri.migration.artifact;

import com.fasterxml.jackson.databind.ObjectMapper;
import nuri.migration.archive.ArchiveFileWriter;
import nuri.migration.archive.ArchiveOutcome;
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
     * 보관 덤프·격리 키 반출(ADR-0029 L3e)은 파일 이름·행 수·SHA-256·보존 기한·개인정보 모양 수만 남기고, 덤프를 쓴 실행은
     * 가장 늦은 보존 기한까지의 keymap 보존 의무를 남긴다. dry-run 덤프는 파일이 없어 그 의무가 없다.
     */
    @Test
    void archiveEvidenceKeepsFileNamesCountsAndTheKeymapDutyOnly() throws Exception {
        ArchiveOutcome outcome = new ArchiveOutcome(true, List.of(
                new ArchiveOutcome.Dumped("user_dump", "legacy.user", false, 4, 4, "archive-user.jsonl", 120,
                        "f".repeat(64), "2031-12-31", List.of("U7"),
                        java.util.Map.of("ETC1", new ArchiveFileWriter.PersonalShapes(2, 0, 1)),
                        java.util.Map.of("USER_SN", new ArchiveFileWriter.PersonalShapes(4, 0, 0))),
                new ArchiveOutcome.Dumped("log_dump", "legacy.log", true, 3, 3, "archive-log.jsonl", 90,
                        "e".repeat(64), "2035-06-30", List.of("L2"), java.util.Map.of())),
                List.of(new ArchiveOutcome.KeyExport("legacy.user", 1, "isolated-legacy.user.jsonl", 40,
                        "d".repeat(64), java.util.Map.of("USER_SN", new ArchiveFileWriter.PersonalShapes(1, 0, 0)))),
                List.of());

        String json = MigrationExecutionArtifact.encode(plan(), MigrationMode.COMMIT, "PASS",
                Instant.parse("2026-10-15T00:00:00Z"), null, List.of(), outcome);

        MigrationExecutionArtifact artifact = new ObjectMapper().readValue(json, MigrationExecutionArtifact.class);
        assertThat(artifact.schemaVersion()).isEqualTo(3);
        assertThat(artifact.archives()).extracting(MigrationExecutionArtifact.ArchiveRecord::file)
                .containsExactly("archive-user.jsonl", "archive-log.jsonl");
        assertThat(artifact.archives().getFirst().personalData()).containsExactly(
                new MigrationExecutionArtifact.PersonalDataRecord("ETC1", 2, 0, 1));
        assertThat(artifact.archives().getFirst().keyPersonalData()).as("덤프 행의 정렬 키 원값도 센다(U2)")
                .containsExactly(new MigrationExecutionArtifact.PersonalDataRecord("USER_SN", 4, 0, 0));
        assertThat(artifact.isolatedKeyExports()).containsExactly(new MigrationExecutionArtifact.IsolatedKeyRecord(
                "legacy.user", "isolated-legacy.user.jsonl", 1, 40, "d".repeat(64),
                List.of(new MigrationExecutionArtifact.PersonalDataRecord("USER_SN", 1, 0, 0))));
        assertThat(artifact.keymapRetention()).as("가장 늦은 보존 기한").isEqualTo(
                new MigrationExecutionArtifact.KeymapRetention("2035-06-30", "keymap 은 덤프의 가장 늦은 retainUntil 까지 보존"));

        ArchiveOutcome counted = new ArchiveOutcome(false, List.of(new ArchiveOutcome.Dumped("user_dump",
                "legacy.user", false, 4, 4, null, 0, null, "2031-12-31", List.of("U7"), java.util.Map.of())),
                List.of(), List.of());
        MigrationExecutionArtifact dryRun = new ObjectMapper().readValue(MigrationExecutionArtifact.encode(plan(),
                MigrationMode.DRY_RUN, "PASS", Instant.parse("2026-10-15T00:00:00Z"), null, List.of(), counted),
                MigrationExecutionArtifact.class);
        assertThat(dryRun.archives()).singleElement().satisfies(record -> assertThat(record.file()).isNull());
        assertThat(dryRun.keymapRetention()).as("파일을 쓰지 않은 덤프는 보존 의무가 없다").isNull();
        assertThat(MigrationExecutionArtifact.encode(plan(), MigrationMode.COMMIT, "STARTED",
                Instant.parse("2026-10-15T00:00:00Z"), null))
                .contains("\"archives\":[]", "\"isolatedKeyExports\":[]", "\"keymapRetention\":null");
    }

    private static MigrationPlan plan() {
        PlanCoverage coverage = new PlanCoverage(0, 0, 0, 0);
        return new MigrationPlan(MigrationPlan.CURRENT_SCHEMA_VERSION, "b".repeat(64), "c".repeat(64),
                "d".repeat(64), "e".repeat(64), "PostgreSQL 17", List.of(), coverage,
                new MigrationPlanValidator().validate(List.of(), coverage));
    }
}
