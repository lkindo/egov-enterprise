package nuri.migration.artifact;

import com.fasterxml.jackson.databind.ObjectMapper;
import nuri.migration.archive.ArchiveFileWriter;
import nuri.migration.archive.ArchiveOutcome;
import nuri.migration.etl.EtlExecutor;
import nuri.migration.etl.MigrationMode;
import nuri.migration.etl.TargetSequenceSynchronizer.Action;
import nuri.migration.etl.TargetSequenceSynchronizer.SequenceReset;
import nuri.migration.model.MappingSpec;
import nuri.migration.plan.MigrationPlan;
import nuri.migration.plan.MigrationPlanValidator;
import nuri.migration.plan.PlanCoverage;
import nuri.migration.postgres.TargetStandardSnapshot;
import nuri.migration.transform.CodeTranslator;
import nuri.migration.transform.TransformerRegistry;
import nuri.migration.verify.CodeSetReconciler;
import nuri.migration.verify.ColumnCheck;
import nuri.migration.verify.ColumnClassifier;
import nuri.migration.verify.ColumnReplay;
import nuri.migration.verify.ReconciliationEvidence;
import nuri.migration.verify.ReconciliationJudge;
import nuri.migration.verify.ReconciliationPlan;
import nuri.migration.verify.ReconciliationRun;
import nuri.migration.verify.ReconciliationVerdict;
import nuri.migration.verify.SourceAggregates;
import nuri.migration.verify.TargetTally;
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
        assertThat(artifact.schemaVersion()).isEqualTo(MigrationExecutionArtifact.CURRENT_SCHEMA_VERSION).isEqualTo(5);
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

    /**
     * 형식 4(ADR-0029 L3b~L3e 통합)는 앞 형식의 증거도 읽는다 — 형식 3 증거에는 매핑 id·제어 스키마·짝 없는 행이 없고 그
     * 값은 비어 있다.
     */
    @Test
    void formatFourStillReadsAFormatThreeEvidence() throws Exception {
        String formatThree = "{\"schemaVersion\":3,\"planDigest\":\"a\",\"mappingDigest\":\"b\",\"targetDigest\":\"c\","
                + "\"mode\":\"COMMIT\",\"status\":\"PASS\",\"startedAt\":\"2026-10-15T00:00:00Z\",\"updatedAt\":\"2026-10-15T00:00:01Z\","
                + "\"tables\":[{\"source\":\"legacy_user\",\"target\":\"tb_user\",\"read\":2,\"written\":2,\"errors\":0,"
                + "\"targetRows\":2,\"status\":\"PASS\",\"isolated\":0}],\"sequenceResets\":[],\"nullified\":[],"
                + "\"isolations\":[],\"archives\":[],\"isolatedKeyExports\":[],\"keymapRetention\":null}";

        MigrationExecutionArtifact read = new ObjectMapper().readValue(formatThree, MigrationExecutionArtifact.class);

        assertThat(MigrationExecutionArtifact.CURRENT_SCHEMA_VERSION).isEqualTo(5);
        assertThat(read.schemaVersion()).isEqualTo(3);
        assertThat(read.tables()).singleElement().satisfies(table -> assertThat(table.mapping()).isNull());
        assertThat(read.controlSchema()).isNull();
        assertThat(read.lookupMisses()).isEmpty();
        assertThat(read.reconciliation()).isNull();
    }

    /** 형식 5(ADR-0029 L4 D2·D7)는 형식 4 증거도 읽는다 — 대사 기록이 없고 그 값은 null 이다. */
    @Test
    void formatFiveStillReadsAFormatFourEvidence() throws Exception {
        String formatFour = "{\"schemaVersion\":4,\"planDigest\":\"a\",\"mappingDigest\":\"b\",\"targetDigest\":\"c\","
                + "\"mode\":\"COMMIT\",\"status\":\"PASS\",\"startedAt\":\"2026-10-15T00:00:00Z\",\"updatedAt\":\"2026-10-15T00:00:01Z\","
                + "\"tables\":[{\"source\":\"legacy_user\",\"target\":\"tb_user\",\"read\":2,\"written\":2,\"errors\":0,"
                + "\"targetRows\":2,\"status\":\"PASS\",\"isolated\":0,\"mapping\":\"addr\"}],\"sequenceResets\":[],\"nullified\":[],"
                + "\"isolations\":[],\"archives\":[],\"isolatedKeyExports\":[],\"keymapRetention\":null,"
                + "\"controlSchema\":{\"before\":\"1\",\"after\":\"2\"},"
                + "\"lookupMisses\":[{\"source\":\"legacy_orders\",\"mapping\":\"orders\",\"lookup\":\"cust\",\"rows\":2}]}";

        MigrationExecutionArtifact read = new ObjectMapper().readValue(formatFour, MigrationExecutionArtifact.class);

        assertThat(read.schemaVersion()).isEqualTo(4);
        assertThat(read.tables()).singleElement().satisfies(table -> assertThat(table.mapping()).isEqualTo("addr"));
        assertThat(read.controlSchema()).isEqualTo(new MigrationExecutionArtifact.ControlSchemaRecord("1", "2"));
        assertThat(read.reconciliation()).isNull();
        assertThat(MigrationExecutionArtifact.encode(plan(), MigrationMode.COMMIT, "STARTED",
                Instant.parse("2026-10-15T00:00:00Z"), null)).as("대사를 하지 않은 실행은 싣지 않는다")
                .doesNotContain("reconciliation");
    }

    /**
     * [ADR-0029 L4 D2·D7] 대사 기록은 검사 이름·결과·건수·사유 코드만 싣는다. 원천 합·최소·최대와 codemap 의 원값·결과값은
     * 판정에 쓰였어도 증거에 없다 — 판정 값은 직렬화하지 않는 홀더에만 있다.
     */
    @Test
    void reconciliationEvidenceCarriesVerdictsAndCountsButNoValues() throws Exception {
        MappingSpec.CodeMap codemap = MappingSpec.CodeMap.of(java.util.Map.of("probe-7f3a", "probe-out-9c1d"));
        ColumnCheck amount = ColumnClassifier.classify(new ColumnClassifier.ColumnFacts("amt",
                ColumnClassifier.Origin.SOURCE, "AMT", null, null, false, false, false, false,
                new ColumnCheck.SourceColumnType(java.sql.Types.BIGINT, "int8", 19L, 0), null,
                ColumnClassifier.TransformKind.NONE, null, false, null, false,
                new TargetStandardSnapshot.ColumnContract("amt", 1, "bigint", null, 64, 0, true, false, null, false,
                        null)));
        ColumnCheck status = ColumnClassifier.classify(new ColumnClassifier.ColumnFacts("stts_cd",
                ColumnClassifier.Origin.SOURCE, "STTS", null, null, false, false, false, false,
                new ColumnCheck.SourceColumnType(java.sql.Types.VARCHAR, "varchar", 20L, 0), null,
                ColumnClassifier.TransformKind.NONE, "status", false, null, false,
                new TargetStandardSnapshot.ColumnContract("stts_cd", 2, "character varying", 20, null, null, true,
                        false, null, false, null)));
        ReconciliationPlan.MappingPlan mapping = new ReconciliationPlan.MappingPlan("legacy.t", "legacy.t", null, null,
                "public.t", List.of(amount, status), List.of("amt"), true, false, false);
        ReconciliationRun run = ReconciliationRun.of(new ReconciliationPlan(true, List.of(mapping), List.of(), null,
                List.of(), List.of()), new ColumnReplay(new TransformerRegistry(), java.util.Map.of("status", codemap)),
                null);
        ReconciliationRun.AggregateGroup group = run.aggregateGroups().iterator().next();
        SourceAggregates source = group.query().parse(new Object[]{2L, 2L, 2L,
                new java.math.BigDecimal("918273645"), 1L, 918273644L}, true);
        run.recordSource(group.key(), source);
        for (int row = 0; row < 2; row++) {
            run.table("legacy.t").codes(List.of(new ReconciliationRun.CodeHit("stts_cd", "status",
                    CodeTranslator.translate(codemap, "probe-7f3a"))));
        }
        TargetTally target = run.targetTally("legacy.t");
        target.observe(java.util.Map.of("amt", 1L, "stts_cd", "probe-out-9c1d"), "1");
        target.observe(java.util.Map.of("amt", 918273644L, "stts_cd", "probe-out-9c1d"), "918273644");
        ReconciliationJudge.MappingReconciliation judged = ReconciliationJudge.judge(mapping, source,
                run.table("legacy.t"), target, new ReconciliationJudge.ExecutionTotals(2, 0, java.util.Map.of(),
                        java.util.Map.of()), true);
        assertThat(judged.status()).isEqualTo(ReconciliationVerdict.PASS);
        var report = new nuri.migration.verify.MigrationReport(List.of(new nuri.migration.verify.MigrationReport.TableReport(
                "legacy.t", "public.t", 2, 2, 2, 0, 2, nuri.migration.verify.MigrationReport.Status.PASS, "")),
                nuri.migration.verify.MigrationReport.Status.PASS, new ReconciliationEvidence("ORIGIN",
                List.of(ReconciliationEvidence.MappingRecord.of("legacy.t", null, "public.t", judged)), List.of(),
                List.of(), List.of(), List.of(), CodeSetReconciler.codemapUse(run)));

        String json = MigrationExecutionArtifact.encode(plan(), MigrationMode.COMMIT, "PASS",
                Instant.parse("2026-10-15T00:00:00Z"), report, List.of());

        assertThat(json).contains("\"schemaVersion\":5", "\"reconciliation\":{\"replicationRole\":\"ORIGIN\"",
                        "\"check\":\"SUM\",\"column\":\"amt\",\"status\":\"PASS\"",
                        "\"check\":\"CODE_DISTRIBUTION\",\"column\":\"stts_cd\",\"status\":\"PASS\"",
                        "\"codemapUse\":[{\"target\":\"public.t\",\"column\":\"stts_cd\",\"codemap\":\"status\",\"mapped\":2")
                .doesNotContain("probe-7f3a", "probe-out-9c1d", "918273645", "918273644");
        MigrationExecutionArtifact read = new ObjectMapper().readValue(json, MigrationExecutionArtifact.class);
        assertThat(read.reconciliation().mappings()).singleElement()
                .satisfies(record -> assertThat(record.status()).isEqualTo("PASS"));
    }

    private static MigrationPlan plan() {
        PlanCoverage coverage = new PlanCoverage(0, 0, 0, 0);
        return new MigrationPlan(MigrationPlan.CURRENT_SCHEMA_VERSION, "b".repeat(64), "c".repeat(64),
                "d".repeat(64), "e".repeat(64), "PostgreSQL 17", List.of(), coverage,
                new MigrationPlanValidator().validate(List.of(), coverage));
    }
}
