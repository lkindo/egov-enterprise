package nuri.migration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import nuri.migration.adapter.EvidenceLevel;
import nuri.migration.adapter.SourceReadSessionPolicy;
import nuri.migration.archive.ArchiveOutcome;
import nuri.migration.archive.ArchiveRun;
import nuri.migration.artifact.MigrationExecutionArtifact;
import nuri.migration.discovery.CatalogObject;
import nuri.migration.discovery.CatalogObject.ObjectReference;
import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.ObjectKind;
import nuri.migration.discovery.SnapshotCapability;
import nuri.migration.domain.TargetValueGuard;
import nuri.migration.etl.EtlExecutor;
import nuri.migration.etl.EtlExecutor.TableResult;
import nuri.migration.etl.MigrationMode;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.CodeMap;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.DbConfig;
import nuri.migration.model.MappingSpec.Isolate;
import nuri.migration.model.MappingSpec.Lookup;
import nuri.migration.model.MappingSpec.LookupCardinality;
import nuri.migration.model.MappingSpec.LookupKey;
import nuri.migration.model.MappingSpec.RunContext;
import nuri.migration.model.MappingSpec.TableMapping;
import nuri.migration.model.MappingSpec.UnmappedPolicy;
import nuri.migration.model.MappingSpec.VerifyDeclaration;
import nuri.migration.model.MappingSpec.VerifyReference;
import nuri.migration.plan.MigrationPlan;
import nuri.migration.plan.MigrationPlanValidator;
import nuri.migration.plan.PlanCoverage;
import nuri.migration.postgres.PostgresCodeGroupReader;
import nuri.migration.postgres.PostgresReconciliationQueries;
import nuri.migration.postgres.PostgresStandardTermReader;
import nuri.migration.postgres.PostgresTargetSchemaFingerprinter;
import nuri.migration.postgres.TargetSchemaFingerprint;
import nuri.migration.source.SourceIntrospector;
import nuri.migration.state.RowChecksum;
import nuri.migration.transform.TransformerRegistry;
import nuri.migration.validate.CodeGroupState;
import nuri.migration.validate.CodeSetPrecheck;
import nuri.migration.validate.CodeSetPrecheck.PrecheckResult;
import nuri.migration.validate.CodeSetTarget;
import nuri.migration.validate.CodeSetTargets;
import nuri.migration.validate.MappingValidator;
import nuri.migration.validate.ProductCodeBindings;
import nuri.migration.validate.VerifyReferenceRules;
import nuri.migration.validate.ledger.TermLedger;
import nuri.migration.validate.ledger.TermLedger.ColumnRef;
import nuri.migration.validate.ledger.TermLedger.Conformance;
import nuri.migration.validate.ledger.TermLedger.Entry;
import nuri.migration.validate.ledger.TermLedger.Load;
import nuri.migration.validate.ledger.TermLedger.StandardTerm;
import nuri.migration.validate.ledger.TermLedger.Transition;
import nuri.migration.validate.ledger.TermLedgerValidator.StandardTermRecord;
import nuri.migration.validate.ledger.TermLedgerValidator.TermKey;
import nuri.migration.verify.ColumnCheck;
import nuri.migration.verify.ColumnReplay;
import nuri.migration.verify.CoverageReason;
import nuri.migration.verify.MigrationReport;
import nuri.migration.verify.MigrationReport.TableReport;
import nuri.migration.verify.MigrationVerifier;
import nuri.migration.verify.ReconciliationEvidence;
import nuri.migration.verify.ReconciliationEvidence.CheckRecord;
import nuri.migration.verify.ReconciliationEvidence.CodeSetRecord;
import nuri.migration.verify.ReconciliationEvidence.MappingRecord;
import nuri.migration.verify.ReconciliationPlan;
import nuri.migration.verify.ReconciliationPlanner;
import nuri.migration.verify.ReconciliationRun;
import nuri.migration.verify.SourceAggregates;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Types;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.entry;

/**
 * [ADR-0029 L4 D2·D7] load 안 대사를 실제 PostgreSQL 원천·대상에서 끝에서 끝까지 본다. 원천과 대상은 같은 DB 의 다른
 * schema 다. 실행 경로는 승인 workflow 의 load 와 같다 — bound fingerprint(제약 스냅숏 포함)와 inventory 로 대사 계획을
 * 만들고, 같은 수집 홀더를 실행기와 verifier 에 넘기며, 실행 증거(형식 5)를 인코딩한다. runner 의 배선은
 * {@code MigrationWorkflowRunnerTest} 가 대역으로 본다.
 *
 * <p>증거·보고 문구에는 행 값·코드값·합계·키가 없어야 한다. 원천에 탐침 값을 넣고 JSON 과 보고 요약에서 찾는다. 공통코드
 * 쓰기 전 게이트는 runner 없이 실제 대상의 공통코드 표를 읽어 돈다.</p>
 */
@Testcontainers
class ReconciliationPostgresIntegrationTest {

    @Container
    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:17-alpine");

    private static final AtomicInteger SEQUENCE = new AtomicInteger();
    private static final AtomicInteger ARCHIVES = new AtomicInteger();
    private static final Instant STARTED = Instant.parse("2026-10-15T00:00:00Z");
    private static final String PLACEHOLDER = "99991231";
    private static final SourceReadSessionPolicy SESSION =
            SourceReadSessionPolicy.repeatableRead(EvidenceLevel.UNVERIFIED, "reconciliation test");

    private final TransformerRegistry transformers = new TransformerRegistry();
    private final EtlExecutor executor = new EtlExecutor(new SourceIntrospector(), transformers);
    private final MigrationVerifier verifier = new MigrationVerifier();

    @TempDir
    Path temp;

    /**
     * 한 소스를 두 대상으로 나누고(같은 where — 원천 집계 문장 하나), 주 매핑이 고객 표를 at_most_one 으로 조회한다. 숫자·
     * 날짜·코드·8자리 날짜 문자 컬럼이 모두 맞고, 확장 표의 물리 FK 는 카탈로그로 증명된다. 증거에는 탐침 값이 없다.
     */
    @Test
    void aSplitAndLookupLoadPassesEveryCheckAndItsEvidenceCarriesNoValue() throws Exception {
        Fixture fixture = fixture();
        JdbcTemplate jdbc = jdbc();
        String item = fixture.src("legacy_item");
        jdbc.execute("CREATE TABLE " + item + " (item_id int PRIMARY KEY, amt numeric(12,2), qty int, reg_dt date,"
                + " sts varchar(2), end_ymd varchar(8), cust_no int, nm varchar(20))");
        jdbc.execute("CREATE TABLE " + fixture.src("legacy_cust") + " (cust_no int, cust_nm varchar(20))");
        jdbc.update("INSERT INTO " + item + " VALUES"
                + " (1, 918273000.00, 5, DATE '2024-01-31', '1', '20240131', 10, 'probe-7f3a-a'),"
                + " (2, 600.50, NULL, DATE '2024-02-29', '2', '20240229', 11, 'probe-7f3a-b'),"
                + " (3, 44.50, 7, NULL, '1', NULL, 99, NULL)");
        jdbc.update("INSERT INTO " + fixture.src("legacy_cust") + " VALUES (10, 'probe-cust-a'), (11, 'probe-cust-b')");
        jdbc.execute("CREATE TABLE " + fixture.tgt("tb_item") + " (item_id bigint PRIMARY KEY, amt numeric(12,2),"
                + " qty integer, reg_dt date, sts_cd varchar(2), end_ymd varchar(8), cust_nm varchar(20))");
        jdbc.execute("CREATE TABLE " + fixture.tgt("tb_item_ext") + " (item_id bigint PRIMARY KEY REFERENCES "
                + fixture.tgt("tb_item") + " (item_id), nm varchar(20))");
        term(jdbc, fixture, "END_YMD", "종료연월일", "연월일C8", 8, null);
        Lookup customer = new Lookup("cust", fixture.src("legacy_cust"), null, new LookupKey("cust_no", "cust_no"),
                LookupCardinality.AT_MOST_ONE, 5L);
        TableMapping main = new TableMapping(item, fixture.tgt("tb_item"), null, "item_id", List.of(), "item_id",
                List.of(plain("item_id", "item_id"), plain("amt", "amt"), plain("qty", "qty"),
                        plain("reg_dt", "reg_dt"), new ColumnMapping("sts", "sts_cd", null, null, "sts", null, null),
                        plain("end_ymd", "end_ymd"), plain("cust.cust_nm", "cust_nm")),
                null, null, List.of(), "main", List.of(customer));
        TableMapping extension = new TableMapping(item, fixture.tgt("tb_item_ext"), null, "item_id", List.of(),
                "item_id", List.of(plain("item_id", "item_id"), plain("nm", "nm")), null, null, List.of(), "ext");
        Map<String, CodeMap> codemaps = Map.of("sts", new CodeMap(ordered("1", "A", "2", "B"), UnmappedPolicy.FAIL,
                null));
        MappingSpec spec = spec(fixture, codemaps, main, extension);
        CatalogSnapshot inventory = inventory(fixture.source(), Map.of(
                "legacy_item", List.of(integer("item_id"), numeric("amt", 12, 2), integer("qty"), date("reg_dt"),
                        text("sts", 2), text("end_ymd", 8), integer("cust_no"), text("nm", 20)),
                "legacy_cust", List.of(integer("cust_no"), text("cust_nm", 20))));

        Loaded loaded = load(fixture, spec, inventory, List.of());

        assertThat(loaded.results()).extracting(TableResult::mappingId).containsExactly("main", "ext");
        assertThat(loaded.results()).allSatisfy(result -> assertThat(result.errors()).isEmpty());
        assertThat(loaded.results().getFirst().lookupMisses()).containsExactly(entry("cust", 1L));
        assertThat(loaded.run().aggregateGroups()).as("같은 소스·where 의 두 매핑은 원천 집계 문장 하나를 나눠 쓴다")
                .hasSize(1);
        MigrationReport report = loaded.report();
        assertThat(report.ok()).withFailMessage(summary(report)).isTrue();
        Map<String, String> mainChecks = verdicts(report, item, "main");
        assertThat(mainChecks).containsEntry("SOURCE_ROWS", "PASS")
                .containsEntry("NON_NULL/qty", "PASS").containsEntry("SUM/amt", "PASS")
                .containsEntry("MIN_MAX/amt", "PASS").containsEntry("MIN_MAX/reg_dt", "PASS")
                .containsEntry("CODE_DISTRIBUTION/sts_cd", "PASS").containsEntry("DOMAIN/end_ymd", "PASS")
                .containsEntry("LOOKUP_NULL_FLOOR/cust_nm", "PASS").containsEntry("SAMPLE", "PASS");
        assertThat(mainChecks.values()).containsOnly("PASS");
        assertThat(verdicts(report, item, "ext")).containsEntry("SOURCE_ROWS", "PASS")
                .containsEntry("NON_NULL/nm", "PASS").containsEntry("SAMPLE", "PASS")
                .extractingFromEntries(Map.Entry::getValue).containsOnly("PASS");
        ReconciliationEvidence evidence = report.reconciliation();
        assertThat(evidence.replicationRole()).isEqualTo("ORIGIN");
        assertThat(evidence.references()).singleElement().satisfies(reference -> {
            assertThat(reference.child()).isEqualTo(fixture.tgt("tb_item_ext"));
            assertThat(reference.parent()).isEqualTo(fixture.tgt("tb_item"));
            assertThat(reference.origin()).isEqualTo("PHYSICAL");
            assertThat(reference.method()).as("트리거가 켜진 origin 세션의 FK 는 카탈로그로 증명한다")
                    .isEqualTo("PROVEN");
            assertThat(reference.status()).isEqualTo("PASS");
        });
        assertThat(evidence.uniqueIndexes()).hasSize(2)
                .allSatisfy(index -> assertThat(index.status()).isEqualTo("PASS"));
        assertThat(evidence.orphanCandidates()).isEmpty();
        assertThat(evidence.codemapUse()).singleElement().satisfies(use -> {
            assertThat(use.mapped()).isEqualTo(3L);
            assertThat(use.unusedKeyPositions()).isEmpty();
        });

        JsonNode reconciliation = new ObjectMapper().readTree(loaded.artifact()).path("reconciliation");
        assertThat(loaded.artifact().contains("\"schemaVersion\":5")).as("실행 증거 형식 5").isTrue();
        assertThat(reconciliation.path("replicationRole").asText()).isEqualTo("ORIGIN");
        assertThat(reconciliation.path("mappings")).hasSize(2);
        Map<String, String> probes = Map.of("원천 문자", "probe-7f3a", "조회 문자", "probe-cust", "합계", "918273645",
                "최대", "918273000", "날짜", "2024-01-31", "8자리 날짜", "20240131", "코드값", "\"A\"");
        assertNoValues(loaded.artifact(), probes);
        assertNoValues(report.toSummary(), probes);
    }

    /**
     * 적재 뒤 대상 숫자 한 행을 바꾼다. 행 checksum 이 먼저 잡고(그때 대상 패스가 멈춰 합은 판정하지 않는다), checkpoint 의
     * checksum 을 바뀐 행에 맞춰 다시 써도 합 대사가 잡는다.
     */
    @Test
    void aTargetValueChangedAfterLoadIsCaughtByTheChecksumAndStillBySumWhenTheChecksumIsRewritten() throws Exception {
        Fixture fixture = fixture();
        Case amounts = amounts(fixture);
        Loaded loaded = load(fixture, amounts.spec(), amounts.inventory(), List.of());
        assertThat(loaded.report().ok()).withFailMessage(summary(loaded.report())).isTrue();
        String source = fixture.src("legacy_amt");
        jdbc().update("UPDATE " + fixture.tgt("tb_amt") + " SET amt = amt + 1 WHERE id = 2");

        MigrationReport changed = reverify(loaded, loaded.results());

        assertThat(changed.ok()).isFalse();
        assertThat(table(changed, source).note().startsWith("run scoped checksum 불일치"))
                .as("행 checksum 이 먼저 잡는다").isTrue();
        assertThat(verdicts(changed, source, null)).as("대상 패스가 멈추면 대상 쪽 검사는 판정하지 않는다")
                .containsEntry("SUM/amt", "NOT_COVERED(TARGET_PASS_INCOMPLETE)");

        rewriteChecksum(fixture, amounts.spec().tables().getFirst(), "2");
        MigrationReport rewritten = reverify(loaded, loaded.results());

        assertThat(rewritten.ok()).isFalse();
        assertThat(table(rewritten, source).note()).isEqualTo("대사 불일치(" + source + ", column=amt, check=SUM)");
        assertThat(verdicts(rewritten, source, null)).containsEntry("SUM/amt", "FAIL")
                .containsEntry("NON_NULL/amt", "PASS").containsEntry("MIN_MAX/amt", "PASS");
        assertNoValues(rewritten.toSummary(), Map.of("바뀐 값", "21.00", "원천 합", "60.00", "대상 합", "61.00"));
    }

    /** 두 대상 행의 숫자를 맞바꾸고 checksum 을 맞춰 쓴다 — 합·최소최대·NULL 계정은 그대로라 표본 재계산만 잡는다. */
    @Test
    void swappingValuesBetweenTwoRowsKeepsEveryAggregateButFailsTheSample() throws Exception {
        Fixture fixture = fixture();
        Case amounts = amounts(fixture);
        Loaded loaded = load(fixture, amounts.spec(), amounts.inventory(), List.of());
        assertThat(loaded.report().ok()).withFailMessage(summary(loaded.report())).isTrue();
        String source = fixture.src("legacy_amt");
        jdbc().update("UPDATE " + fixture.tgt("tb_amt") + " SET amt = CASE id WHEN 1 THEN 20.00 ELSE 10.00 END"
                + " WHERE id IN (1, 2)");
        TableMapping table = amounts.spec().tables().getFirst();
        rewriteChecksum(fixture, table, "1");
        rewriteChecksum(fixture, table, "2");

        MigrationReport swapped = reverify(loaded, loaded.results());

        assertThat(swapped.ok()).isFalse();
        assertThat(verdicts(swapped, source, null)).containsEntry("NON_NULL/amt", "PASS")
                .containsEntry("SUM/amt", "PASS").containsEntry("MIN_MAX/amt", "PASS")
                .containsEntry("SAMPLE/amt", "FAIL[2]");
        assertThat(table(swapped, source).note()).isEqualTo("대사 불일치(" + source + ", column=amt, check=SAMPLE)");
    }

    /**
     * 실행이 원천 집계보다 적은 행을 읽었다고 보고하면 원천 행 수 대사가 잡는다. PostgreSQL 원천은 집계와 본 읽기가 같은 스냅숏이라
     * 실제로 어긋나게 할 수 없으므로 같은 실행의 결과에서 조회 수만 줄인다.
     */
    @Test
    void aRunThatReportsFewerRowsThanTheSourceAggregateFailsSourceRows() throws Exception {
        Fixture fixture = fixture();
        Case amounts = amounts(fixture);
        Loaded loaded = load(fixture, amounts.spec(), amounts.inventory(), List.of());
        assertThat(loaded.report().ok()).withFailMessage(summary(loaded.report())).isTrue();
        String source = fixture.src("legacy_amt");
        TableResult read = loaded.results().getFirst();
        TableResult fewer = new TableResult(read.sourceTable(), read.targetTable(), read.read() - 1, read.transformed(),
                read.written(), read.errors(), read.sequenceResets(), read.nullified(), read.mappingId(),
                read.lookupMisses(), read.isolated(), read.isolations());

        MigrationReport report = reverify(loaded, List.of(fewer));

        assertThat(report.ok()).isFalse();
        assertThat(verdicts(report, source, null)).containsEntry("SOURCE_ROWS", "FAIL[1]");
        assertThat(table(report, source).note()).isEqualTo("대사 불일치(" + source + ", check=SOURCE_ROWS)");
    }

    /**
     * 키를 그대로 쓰는 부모가 승인 위반 행 하나를 격리하고, 물리 FK 없는 자식이 그 키를 복사한다. 자식이 참조를 선언하면 대상 DB
     * 안 대조가 고아로 실패시킨다. 선언이 없고 부모가 '참조 없음'을 확인했으면 load 는 지나가고 같은 이름 컬럼의 후보 건수만
     * 남는다. 둘 다 없으면 plan 이 거부한다(P3).
     */
    @Test
    void aChildKeyCopiedFromAnIsolatedParentIsAnOrphanWhenDeclaredAndOnlyACandidateOtherwise() throws Exception {
        Fixture declared = fixture();
        Case withReference = isolatedParentAndChild(declared, true, null);
        assertThat(VerifyReferenceRules.violations(withReference.spec())).isEmpty();

        Loaded loaded = load(declared, withReference.spec(), withReference.inventory(), List.of());

        assertThat(VerifyReferenceRules.liveViolations(withReference.spec(), loaded.fingerprint())).isEmpty();
        assertThat(loaded.results()).allSatisfy(result -> assertThat(result.errors()).isEmpty());
        assertThat(loaded.results().getFirst().isolated()).isEqualTo(1);
        assertThat(loaded.results().get(1).written()).isEqualTo(3);
        MigrationReport report = loaded.report();
        assertThat(report.ok()).isFalse();
        assertThat(table(report, "<references>").note()).isEqualTo("고아 참조(" + declared.tgt("tb_child")
                + "(parent_id) → " + declared.tgt("tb_parent") + "): ORPHAN_REFERENCE 1건");
        assertThat(report.reconciliation().references()).singleElement().satisfies(reference -> {
            assertThat(reference.origin()).isEqualTo("DECLARED");
            assertThat(reference.method()).isEqualTo("SCANNED");
            assertThat(reference.orphans()).isEqualTo(1L);
            assertThat(reference.reason()).isEqualTo("ORPHAN_REFERENCE");
        });
        assertThat(report.reconciliation().orphanCandidates()).as("선언한 참조는 후보로 다시 세지 않는다").isEmpty();
        assertThat(report.reconciliation().mappings()).extracting(MappingRecord::status).containsOnly("PASS");

        Fixture unreferenced = fixture();
        assertThat(VerifyReferenceRules.violations(isolatedParentAndChild(unreferenced, false, null).spec()))
                .anyMatch(error -> error.contains("VERIFY_REFERENCES_REQUIRED"));
        Case confirmedNone = isolatedParentAndChild(unreferenced, false,
                new VerifyDeclaration(List.of(), "none", "이 키를 복사하는 표가 없다 — 업무 확인 2026-10"));
        assertThat(VerifyReferenceRules.violations(confirmedNone.spec())).isEmpty();

        Loaded candidate = load(unreferenced, confirmedNone.spec(), confirmedNone.inventory(), List.of());

        assertThat(candidate.report().ok()).as("이름이 같다는 것은 참조의 증거가 아니다 — 후보는 판정에 쓰지 않는다")
                .withFailMessage(summary(candidate.report())).isTrue();
        assertThat(candidate.report().reconciliation().references()).isEmpty();
        assertThat(candidate.report().reconciliation().orphanCandidates()).singleElement().satisfies(found -> {
            assertThat(found.parent()).isEqualTo(unreferenced.tgt("tb_parent"));
            assertThat(found.child()).isEqualTo(unreferenced.tgt("tb_child"));
            assertThat(found.column()).isEqualTo("parent_id");
            assertThat(found.rows()).isEqualTo(1L);
        });
        assertNoValues(candidate.artifact(), Map.of("격리 행 값", PLACEHOLDER));
    }

    /**
     * 앞 run 이 격리한 부모 키를 다음 run 의 자식이 가리킨다. 대조는 이번 run 의 키가 아니라 대상 DB 안의 자식 표 전체를 보므로
     * 다음 run 이 고아로 실패한다(INSERT 전용이라 앞 run 의 상태도 컷오버 상태다).
     */
    @Test
    void aChildOfThisRunPointingAtAParentIsolatedByAnEarlierRunIsAnOrphan() throws Exception {
        Fixture first = fixture();
        JdbcTemplate jdbc = jdbc();
        jdbc.execute("CREATE TABLE " + first.src("legacy_parent") + " (parent_id int PRIMARY KEY,"
                + " end_ymd varchar(10), batch_no int)");
        jdbc.execute("CREATE TABLE " + first.src("legacy_child") + " (child_id int PRIMARY KEY, parent_id int,"
                + " batch_no int)");
        jdbc.update("INSERT INTO " + first.src("legacy_parent") + " VALUES (1, '20240131', 1), (2, '" + PLACEHOLDER
                + "', 1)");
        jdbc.update("INSERT INTO " + first.src("legacy_child") + " VALUES (1, 1, 1), (2, 2, 2)");
        parentAndChildTargets(jdbc, first);
        CatalogSnapshot inventory = inventory(first.source(), Map.of(
                "legacy_parent", List.of(integer("parent_id"), text("end_ymd", 10), integer("batch_no")),
                "legacy_child", List.of(integer("child_id"), integer("parent_id"), integer("batch_no"))));

        Loaded earlier = load(first, batch(first, 1), inventory, List.of());

        assertThat(earlier.results().getFirst().isolated()).isEqualTo(1);
        assertThat(earlier.report().ok()).withFailMessage(summary(earlier.report())).isTrue();
        assertThat(earlier.report().reconciliation().references()).singleElement()
                .satisfies(reference -> assertThat(reference.status()).isEqualTo("PASS"));

        Fixture second = first.withRun(first.runId() + "-second");
        Loaded later = load(second, batch(second, 2), inventory, List.of());

        assertThat(later.results().getFirst().read()).as("이번 run 은 부모를 하나도 읽지 않는다").isZero();
        assertThat(later.results().get(1).written()).isEqualTo(1);
        assertThat(later.report().ok()).isFalse();
        assertThat(table(later.report(), "<references>").note()).isEqualTo("고아 참조(" + first.tgt("tb_child")
                + "(parent_id) → " + first.tgt("tb_parent") + "): ORPHAN_REFERENCE 1건");
        assertThat(later.report().reconciliation().orphanCandidates()).isEmpty();
    }

    /**
     * 물리 FK 의 자식 쪽 RI 트리거가 꺼졌거나(D) replica 전용(R)이면 origin 세션에서 발화하지 않는다. 카탈로그 증명이 실패해
     * 대상 DB 안 대조로 내려가고, 트리거 없이 들어간 고아 행을 센다.
     */
    @Test
    void foreignKeyTriggersThatDoNotFireInAnOriginSessionAreNotProofAndTheOrphanIsCounted() throws Exception {
        for (String state : List.of("D", "R")) {
            Fixture fixture = fixture();
            JdbcTemplate jdbc = jdbc();
            Case physical = physicalForeignKey(fixture);
            String child = fixture.tgt("tb_gc");
            if ("D".equals(state)) {
                jdbc.execute("ALTER TABLE " + child + " DISABLE TRIGGER ALL");
            } else {
                // ENABLE REPLICA 는 트리거 이름만 받는다 — FK 의 자식 쪽 내부 트리거를 하나씩 바꾼다.
                for (String trigger : foreignKeyTriggers(jdbc, child)) {
                    jdbc.execute("ALTER TABLE " + child + " ENABLE REPLICA TRIGGER \"" + trigger + "\"");
                }
            }
            assertThat(jdbc.queryForList("SELECT DISTINCT t.tgenabled::text FROM pg_trigger t JOIN pg_constraint c"
                    + " ON c.oid = t.tgconstraint WHERE c.contype = 'f' AND c.conrelid = ?::regclass"
                    + " AND t.tgrelid = c.conrelid", String.class, child)).as(state).containsExactly(state);

            Loaded loaded = load(fixture, physical.spec(), physical.inventory(), List.of());

            assertThat(loaded.results()).as(state).allSatisfy(result -> assertThat(result.errors()).isEmpty());
            assertThat(count(child)).as("트리거가 발화하지 않아 고아 행이 들어갔다").isEqualTo(2);
            assertThat(loaded.report().ok()).as(state).isFalse();
            assertThat(loaded.report().reconciliation().replicationRole()).isEqualTo("ORIGIN");
            assertThat(loaded.report().reconciliation().references()).as(state).singleElement()
                    .satisfies(reference -> {
                        assertThat(reference.origin()).isEqualTo("PHYSICAL");
                        assertThat(reference.method()).isEqualTo("SCANNED");
                        assertThat(reference.orphans()).isEqualTo(1L);
                        assertThat(reference.proofNote()).as("증명하지 못한 이유가 증거에 남는다")
                                .isEqualTo("TRIGGER_NOT_ENABLED");
                    });
            assertThat(table(loaded.report(), "<references>").note()).isEqualTo("고아 참조(" + child + "(gp_id) → "
                    + fixture.tgt("tb_gp") + "): ORPHAN_REFERENCE 1건");
        }
    }

    /**
     * 적재 시작(승인 fingerprint)과 끝의 트리거 상태가 모두 O 여도 그 사이 트리거를 껐다 켰으면 증명이 아니다 — 트리거 행이 다시
     * 쓰여 행 버전(xmin)이 바뀐다. 꺼진 동안 들어간 고아를 센다.
     */
    @Test
    void triggersDisabledAndReEnabledDuringTheLoadAreNotProof() throws Exception {
        Fixture fixture = fixture();
        JdbcTemplate jdbc = jdbc();
        Case physical = physicalForeignKey(fixture);
        String child = fixture.tgt("tb_gc");
        TargetSchemaFingerprint start = fingerprint(physical.spec(), fixture.target());
        jdbc.execute("ALTER TABLE " + child + " DISABLE TRIGGER ALL");
        ReconciliationRun run = ReconciliationRun.of(
                ReconciliationPlanner.plan(physical.spec(), physical.inventory(), start, List.of(), transformers),
                new ColumnReplay(transformers, physical.spec().codemaps()), new PostgresReconciliationQueries(jdbc));

        ArchiveRun archives = ArchiveRun.counting();
        List<TableResult> results = executor.execute(physical.spec(), MigrationMode.COMMIT, jdbc(), jdbc, SESSION,
                true, Map.of(), archives, false, run);
        jdbc.execute("ALTER TABLE " + child + " ENABLE TRIGGER ALL");
        MigrationReport report = verifier.verify(physical.spec(), results, jdbc, archives.outcome(), run);

        assertThat(results).allSatisfy(result -> assertThat(result.errors()).isEmpty());
        assertThat(count(child)).as("꺼진 동안 고아 행이 들어갔다").isEqualTo(2);
        assertThat(report.ok()).isFalse();
        assertThat(report.reconciliation().references()).singleElement().satisfies(reference -> {
            assertThat(reference.method()).as("시작·끝 상태는 같아도 행 버전이 다르다").isEqualTo("SCANNED");
            assertThat(reference.proofNote()).isEqualTo("CATALOG_ROW_CHANGED");
            assertThat(reference.orphans()).isEqualTo(1L);
        });
    }

    /**
     * {@code NOT VALID} 로 더한 FK(DEC-OPS-106)도 RI 트리거가 이번 run 의 쓰기를 검사하므로 증명한다. 그 전부터 있던 고아는
     * 검사하지 않았다는 메모만 남기고, 이번 run 이 쓰지 않은 그 행 때문에 load 가 실패하지 않는다.
     */
    @Test
    void aNotValidForeignKeyWithAnOlderOrphanIsProvenAndNoted() throws Exception {
        Fixture fixture = fixture();
        JdbcTemplate jdbc = jdbc();
        Case clean = foreignKeyCase(fixture, false);
        String child = fixture.tgt("tb_gc");
        jdbc.execute("ALTER TABLE " + child + " DROP CONSTRAINT " + foreignKeyName(jdbc, child));
        jdbc.update("INSERT INTO " + child + " VALUES (100, 999)");
        jdbc.execute("ALTER TABLE " + child + " ADD CONSTRAINT fk_gc_gp FOREIGN KEY (gp_id) REFERENCES "
                + fixture.tgt("tb_gp") + " (id) NOT VALID");

        Loaded loaded = load(fixture, clean.spec(), clean.inventory(), List.of());

        assertThat(loaded.report().ok()).withFailMessage(summary(loaded.report())).isTrue();
        assertThat(loaded.report().reconciliation().references()).singleElement().satisfies(reference -> {
            assertThat(reference.method()).isEqualTo("PROVEN");
            assertThat(reference.status()).isEqualTo("PASS");
            assertThat(reference.proofNote()).as("기존 행은 검사하지 않았다").isEqualTo("NOT_VALIDATED");
        });
    }

    /** 같은 runId 로 다시 적재하면 앞 실행이 쓴 행은 이번 실행의 카탈로그 스냅숏이 증명하지 못한다 — 고아를 센다. */
    @Test
    void aResumedRunCountsOrphansInsteadOfProvingTheForeignKey() throws Exception {
        Fixture fixture = fixture();
        Case clean = foreignKeyCase(fixture, false);

        Loaded first = load(fixture, clean.spec(), clean.inventory(), List.of());
        Loaded again = load(fixture, clean.spec(), clean.inventory(), List.of());

        assertThat(first.report().reconciliation().references()).singleElement()
                .satisfies(reference -> assertThat(reference.method()).isEqualTo("PROVEN"));
        assertThat(again.report().ok()).withFailMessage(summary(again.report())).isTrue();
        assertThat(again.report().reconciliation().references()).singleElement().satisfies(reference -> {
            assertThat(reference.method()).isEqualTo("SCANNED");
            assertThat(reference.proofNote()).isEqualTo("PRIOR_EXECUTION_ROWS");
            assertThat(reference.orphans()).isZero();
        });
    }

    /**
     * PostgreSQL 은 실패한 문장 하나가 읽기 트랜잭션 전체를 막는다(25P02). 원천 집계가 실패하면 savepoint 로 되돌려 COUNT 전용
     * 문장으로 물러나고, 행은 그대로 읽는다 — 합·최소·최대만 판정하지 않는다.
     */
    @Test
    void aFailedSourceAggregateRollsBackToItsSavepointAndFallsBackToCounts() throws Exception {
        Fixture fixture = fixture();
        JdbcTemplate jdbc = jdbc();
        jdbc.execute("CREATE TABLE " + fixture.src("legacy_nm") + " (id int PRIMARY KEY, nm varchar(10))");
        jdbc.update("INSERT INTO " + fixture.src("legacy_nm") + " VALUES (1, 'a'), (2, 'b'), (3, NULL)");
        jdbc.execute("CREATE TABLE " + fixture.tgt("tb_nm") + " (id bigint PRIMARY KEY, nm varchar(10))");
        MappingSpec spec = spec(fixture, Map.of(), new TableMapping(fixture.src("legacy_nm"), fixture.tgt("tb_nm"),
                null, "id", List.of(), "id", List.of(plain("id", "id"), plain("nm", "nm")), null, null, List.of()));
        ReconciliationPlan planned = ReconciliationPlanner.plan(spec, inventory(fixture.source(), Map.of("legacy_nm",
                List.of(integer("id"), text("nm", 10)))), fingerprint(spec, fixture.target()), List.of(), transformers);
        ReconciliationPlan.MappingPlan only = planned.mappings().getFirst();
        // 문자 컬럼을 정수 합으로 계획해 원천 집계 문장의 캐스트가 실행 중에 실패하게 한다.
        ColumnCheck forced = new ColumnCheck("nm", "nm", new ColumnCheck.SourceColumnType(Types.BIGINT, "int8", 19L,
                0), ColumnCheck.Aggregate.NUM, true, false, null, false, null, null, false, null, List.of());
        ReconciliationRun run = ReconciliationRun.of(new ReconciliationPlan(true, List.of(
                new ReconciliationPlan.MappingPlan(only.label(), only.source(), only.mappingId(), only.where(),
                        only.target(), List.of(forced), only.targetPrimaryKey(), only.preservedKey(), only.isolates(),
                        only.generatedIdentity())), List.of(), null, List.of(), List.of()),
                new ColumnReplay(transformers, spec.codemaps()), null);

        List<TableResult> results = executor.execute(spec, MigrationMode.DRY_RUN, jdbc(), null, SESSION, true,
                Map.of(), ArchiveRun.counting(), false, run);

        assertThat(results).singleElement().satisfies(result -> {
            assertThat(result.errors()).as("되돌린 뒤 COUNT 전용 문장과 본 읽기가 같은 트랜잭션에서 계속된다").isEmpty();
            assertThat(result.read()).isEqualTo(3);
        });
        SourceAggregates aggregates = run.source(run.plan().mappings().getFirst().aggregateGroup());
        assertThat(aggregates.rows()).isEqualTo(3);
        assertThat(aggregates.nonNull("nm")).isEqualTo(2);
        assertThat(aggregates.aggregateGap("nm")).isEqualTo(CoverageReason.SOURCE_AGGREGATE_FAILED);
    }

    /** replica 세션에서는 RI 트리거가 발화하지 않는다 — 쓰기 연결의 역할이 origin 이 아니면 그 표를 한 행도 쓰지 않는다. */
    @Test
    void aWriteSessionInReplicaRoleIsRefusedBeforeAnyRowIsWritten() throws Exception {
        Fixture fixture = fixture();
        Case physical = physicalForeignKey(fixture);
        JdbcTemplate replica = new JdbcTemplate(new DriverManagerDataSource(
                POSTGRES.getJdbcUrl() + "&options=-c%20session_replication_role%3Dreplica",
                POSTGRES.getUsername(), POSTGRES.getPassword()));
        assertThat(replica.queryForObject("SELECT current_setting('session_replication_role')", String.class))
                .isEqualTo("replica");

        Loaded loaded = execute(physical.spec(), physical.inventory(),
                fingerprint(physical.spec(), fixture.target()), List.of(), replica, MigrationMode.COMMIT);

        assertThat(loaded.results().getFirst().errors()).containsExactly("이관 실패(" + fixture.src("legacy_gp")
                + "): SESSION_REPLICATION_ROLE_NOT_ORIGIN");
        assertThat(loaded.results().getFirst().written()).isZero();
        assertThat(count(fixture.tgt("tb_gp")) + count(fixture.tgt("tb_gc"))).isZero();
        assertThat(loaded.report().ok()).isFalse();
        assertThat(loaded.report().reconciliation().replicationRole()).isEqualTo("NOT_ORIGIN");
    }

    /**
     * plan 뒤 FK 를 지우면 bound digest 가 바뀌어 load 가 쓰기 전에 멈춘다(runner 의 target schema digest 대조). digest 를 지나친
     * 낡은 계획으로 실행해도 증명은 정의가 바뀐 FK 를 증명하지 않고 대조로 내려간다.
     */
    @Test
    void droppingAForeignKeyAfterPlanChangesTheBoundDigestAndAStalePlanFallsBackToCounting() throws Exception {
        Fixture fixture = fixture();
        JdbcTemplate jdbc = jdbc();
        Case physical = physicalForeignKey(fixture);
        TargetSchemaFingerprint planned = fingerprint(physical.spec(), fixture.target());
        String constraint = jdbc.queryForObject("SELECT conname FROM pg_constraint WHERE contype = 'f'"
                + " AND conrelid = ?::regclass", String.class, fixture.tgt("tb_gc"));
        jdbc.execute("ALTER TABLE " + fixture.tgt("tb_gc") + " DROP CONSTRAINT \"" + constraint + "\"");

        TargetSchemaFingerprint loadTime = fingerprint(physical.spec(), fixture.target());

        assertThat(loadTime.digest().equals(planned.digest()))
                .as("제약이 빠지면 승인 digest 와 달라 load 가 쓰기 전에 멈춘다").isFalse();
        assertThat(loadTime.constraints()).isNotEqualTo(planned.constraints());
        assertThat(loadTime.tables()).isEqualTo(planned.tables());

        Loaded stale = execute(physical.spec(), physical.inventory(), planned, List.of(), jdbc, MigrationMode.COMMIT);

        assertThat(stale.report().reconciliation().references()).singleElement().satisfies(reference -> {
            assertThat(reference.origin()).isEqualTo("PHYSICAL");
            assertThat(reference.method()).as("시작과 끝의 정의가 다르면 증명이 아니다").isEqualTo("SCANNED");
            assertThat(reference.status()).isEqualTo("FAIL");
            assertThat(reference.orphans()).isEqualTo(1L);
        });
    }

    /** 표준 용어가 8자리 날짜(연월일C8)인 문자 컬럼에 변환 없이 옮긴 달력에 없는 날짜는 도메인 대사가 실패시킨다. */
    @Test
    void anInvalidCalendarDateCopiedIntoADate8ColumnFailsDomainConformance() throws Exception {
        Fixture fixture = fixture();
        JdbcTemplate jdbc = jdbc();
        String source = fixture.src("legacy_ymd");
        jdbc.execute("CREATE TABLE " + source + " (id int PRIMARY KEY, end_ymd varchar(8))");
        jdbc.update("INSERT INTO " + source + " VALUES (1, '20240131'), (2, '20240230'), (3, NULL)");
        jdbc.execute("CREATE TABLE " + fixture.tgt("tb_ymd") + " (id bigint PRIMARY KEY, end_ymd varchar(8))");
        term(jdbc, fixture, "END_YMD", "종료연월일", "연월일C8", 8, null);
        MappingSpec spec = spec(fixture, Map.of(), new TableMapping(source, fixture.tgt("tb_ymd"), null, "id",
                List.of(), "id", List.of(plain("id", "id"), plain("end_ymd", "end_ymd")), null, null, List.of()));

        Loaded loaded = load(fixture, spec, inventory(fixture.source(), Map.of("legacy_ymd",
                List.of(integer("id"), text("end_ymd", 8)))), List.of());

        assertThat(loaded.results().getFirst().written()).as("변환 없는 직접 복사는 행을 막지 않는다").isEqualTo(3);
        assertThat(loaded.report().ok()).isFalse();
        assertThat(verdicts(loaded.report(), source, null)).containsEntry("DOMAIN/end_ymd", "FAIL(INVALID_DATE)")
                .containsEntry("SAMPLE", "PASS");
        assertThat(loaded.report().reconciliation().mappings().getFirst().checks())
                .filteredOn(check -> "DOMAIN".equals(check.check())).singleElement()
                .satisfies(check -> assertThat(check.rows()).isEqualTo(1L));
        assertThat(table(loaded.report(), source).note()).isEqualTo("대사 불일치(" + source
                + ", column=end_ymd, check=DOMAIN)");
        assertNoValues(loaded.artifact(), Map.of("위반 값", "20240230"));
    }

    /**
     * 결재 본표의 업무 구분(COM075, 쓰기 검증)은 쓰기 전 게이트가 실제 대상의 공통코드 표로 판정한다. codemap 출력이 사용 안
     * 함(A02)이거나 미등록이면, codemap 이 없거나 미매핑을 그대로 쓰면, 그룹 헤더가 없으면 오류를 낸다 — runner 는 그 오류로
     * 행을 쓰기 전에 멈춘다. 표시 바인딩은 헤더가 없어도 지나가고 대사가 그 사실을 남긴다. 문구에는 코드값이 없다.
     */
    @Test
    void theCom075GateRefusesInactiveOrUnregisteredOutputAndAColumnWithoutACodemapBeforeAnyWrite() throws Exception {
        Fixture fixture = fixture();
        JdbcTemplate jdbc = jdbc();
        commonCodes(jdbc, fixture, true);
        String target = fixture.tgt("tb_ifml_atrz_info");
        jdbc.execute("CREATE TABLE " + target + " (ifml_atrz_sn bigint PRIMARY KEY, task_se_cd varchar(20))");
        String label = target + ".task_se_cd";

        assertThat(precheck(fixture, approvals(fixture, "task", ordered("X1", "A01"), UnmappedPolicy.FAIL)).errors())
                .as("사용 중 상세코드로 옮기면 통과한다").isEmpty();
        for (String output : List.of("A02", "ZQ9")) {
            assertThat(precheck(fixture, approvals(fixture, "task", ordered("X1", output), UnmappedPolicy.FAIL))
                    .errors()).as(output).containsExactly(label + ": codemap task 의 values 위치 1 의 표준 코드가 공통코드"
                    + " 그룹(COM075)의 사용 중 상세코드가 아닙니다(CODE_OUTPUT_NOT_ACTIVE)");
        }
        String codemapRequired = label + ": 쓰기 검증하는 공통코드 컬럼(COM075)은 codemap(미매핑 그대로 쓰기 아님)이나 상수로"
                + " 채웁니다(VALIDATE_BINDING_CODEMAP_REQUIRED)";
        assertThat(precheck(fixture, approvals(fixture, null, null, null)).errors())
                .as("원장이 codemap 없이 확정한 업무 구분(U1·U3)도 쓰기 전 게이트를 지난다").containsExactly(codemapRequired);
        assertThat(precheck(fixture, approvals(fixture, "task", ordered("X1", "A01"), UnmappedPolicy.PASSTHROUGH))
                .errors()).containsExactly(codemapRequired);

        Fixture headless = fixture();
        commonCodes(jdbc, headless, false);
        jdbc.execute("CREATE TABLE " + headless.tgt("tb_ifml_atrz_info")
                + " (ifml_atrz_sn bigint PRIMARY KEY, task_se_cd varchar(20))");
        jdbc.execute("CREATE TABLE " + headless.tgt("tb_ifml_atrz_hstry")
                + " (hstry_sn bigint PRIMARY KEY, task_se_cd varchar(20))");
        Map<String, CodeMap> codemaps = Map.of("task", new CodeMap(ordered("X1", "A01"), UnmappedPolicy.FAIL, null));
        PrecheckResult absent = precheck(headless, spec(headless, codemaps,
                approvalTable(headless.src("legacy_atrz"), headless.tgt("tb_ifml_atrz_info"), "task"),
                approvalTable(headless.src("legacy_hstry"), headless.tgt("tb_ifml_atrz_hstry"), "task")));
        assertThat(absent.errors()).containsExactly(headless.tgt("tb_ifml_atrz_info") + ".task_se_cd: 공통코드"
                + " 그룹(COM075)이 대상에 없습니다(CODE_GROUP_ABSENT) — 참조 데이터(DEC-OPS-262)를 먼저 넣으세요");
        assertThat(absent.groupAbsent(headless.tgt("tb_ifml_atrz_hstry"), "task_se_cd")).isTrue();
    }

    /**
     * 앞 run 이 남긴 미등록 업무 구분 행이 있으면 이번 run 의 행이 모두 맞아도 공통코드 대사가 load 를 실패시킨다. 코드를 등록한
     * 뒤 같은 runId 로 다시 적재하면 쓴 행은 건너뛰고 대사를 처음부터 다시 해 PASS 이고, run 은 COMPLETED 로 끝난다.
     */
    @Test
    void anUnregisteredCodeLeftByAnEarlierRunFailsUntilItIsRegisteredAndTheSameRunIsLoadedAgain() throws Exception {
        Fixture fixture = fixture();
        JdbcTemplate jdbc = jdbc();
        commonCodes(jdbc, fixture, true);
        String source = fixture.src("legacy_atrz");
        String target = fixture.tgt("tb_ifml_atrz_info");
        jdbc.execute("CREATE TABLE " + source + " (atrz_no int PRIMARY KEY, task_cd varchar(2))");
        jdbc.update("INSERT INTO " + source + " VALUES (1, 'X1'), (2, 'X1')");
        jdbc.execute("CREATE TABLE " + target + " (ifml_atrz_sn bigint PRIMARY KEY, task_se_cd varchar(20))");
        jdbc.update("INSERT INTO " + target + " VALUES (100, 'ZQ9')");
        MappingSpec spec = approvals(fixture, "task", ordered("X1", "A01"), UnmappedPolicy.FAIL);
        CatalogSnapshot inventory = inventory(fixture.source(), Map.of("legacy_atrz",
                List.of(integer("atrz_no"), text("task_cd", 2))));

        Loaded first = load(fixture, spec, inventory, codeSets(fixture, spec, null, Map.of()));

        assertThat(first.results().getFirst().written()).isEqualTo(2);
        assertThat(first.report().ok()).isFalse();
        assertThat(table(first.report(), "<code-sets>").note()).isEqualTo("공통코드 대사 불일치(" + target
                + ".task_se_cd, source=COMMON_CODE(COM075)): CODE_MISSING 1건");
        assertThat(codeSet(first.report(), "task_se_cd")).satisfies(record -> {
            assertThat(record.status()).isEqualTo("FAIL");
            assertThat(record.use()).isEqualTo("VALIDATE");
            assertThat(record.nonNullRows()).isEqualTo(3L);
            assertThat(record.missingRows()).isEqualTo(1L);
            assertThat(record.missingDistinct()).isEqualTo(1L);
            assertThat(record.inactiveRows()).isZero();
        });
        assertThat(verdicts(first.report(), source, null).values()).as("이번 run 의 행 대사는 모두 맞다")
                .containsOnly("PASS");
        assertThat(runStatus(fixture)).isEqualTo("FAILED");
        assertNoValues(first.artifact(), Map.of("미등록 코드", "ZQ9"));

        jdbc.update("INSERT INTO " + fixture.tgt("tb_com_dtl_cd") + " VALUES ('COM075', 'ZQ9', 'Y')");
        Loaded again = load(fixture, spec, inventory, codeSets(fixture, spec, null, Map.of()));

        assertThat(again.results().getFirst().written()).as("쓴 행은 checkpoint 로 건너뛴다").isEqualTo(2);
        assertThat(count(target)).isEqualTo(3);
        assertThat(again.report().ok()).withFailMessage(summary(again.report())).isTrue();
        assertThat(codeSet(again.report(), "task_se_cd").status()).isEqualTo("PASS");
        assertThat(verdicts(again.report(), source, null)).as("같은 runId 재적재도 원천 집계·표본을 다시 잰다")
                .containsEntry("SOURCE_ROWS", "PASS").containsEntry("SAMPLE", "PASS");
        assertThat(runStatus(fixture)).isEqualTo("COMPLETED");
    }

    /** 이력 표의 업무 구분은 표시 바인딩이다 — 사용 안 함 코드도 load 를 실패시키지 않고 건수만 남는다. */
    @Test
    void anInactiveCodeInTheHistoryTableIsOnlyRecordedBecauseTheBindingIsDisplay() throws Exception {
        Fixture fixture = fixture();
        JdbcTemplate jdbc = jdbc();
        commonCodes(jdbc, fixture, true);
        String source = fixture.src("legacy_hstry");
        String target = fixture.tgt("tb_ifml_atrz_hstry");
        jdbc.execute("CREATE TABLE " + source + " (atrz_no int PRIMARY KEY, task_cd varchar(2))");
        jdbc.update("INSERT INTO " + source + " VALUES (1, 'X1'), (2, 'X1')");
        jdbc.execute("CREATE TABLE " + target + " (hstry_sn bigint PRIMARY KEY, task_se_cd varchar(20))");
        Map<String, CodeMap> codemaps = Map.of("task", new CodeMap(ordered("X1", "A02"), UnmappedPolicy.FAIL, null));
        MappingSpec spec = spec(fixture, codemaps, approvalTable(source, target, "task"));
        assertThat(precheck(fixture, spec).errors()).isEmpty();

        Loaded loaded = load(fixture, spec, inventory(fixture.source(), Map.of("legacy_hstry",
                List.of(integer("atrz_no"), text("task_cd", 2)))), codeSets(fixture, spec, null, Map.of()));

        assertThat(loaded.report().ok()).withFailMessage(summary(loaded.report())).isTrue();
        assertThat(codeSet(loaded.report(), "task_se_cd")).satisfies(record -> {
            assertThat(record.status()).isEqualTo("RECORDED");
            assertThat(record.use()).isEqualTo("DISPLAY");
            assertThat(record.inactiveRows()).isEqualTo(2L);
            assertThat(record.missingRows()).isZero();
        });
    }

    /**
     * 사용자 결정 L4-P2(DEC-OPS-325): 원장이 확정한 코드 컬럼에 대조할 원천(쓰기 검증 바인딩·읽을 수 있는 메타 허용값)이 없으면
     * load 는 지나가고 원장 행 id 를 붙인 UNRECONCILED 로 남긴다 — 컷오버 전에 업무 소유자가 확인·서명한다. 허용값을 읽을 수
     * 있으면 그 밖의 코드(앞 run 이 남긴 행 포함)가 load 를 실패시킨다.
     */
    @Test
    void aConfirmedCodeColumnWithoutASourceIsUnreconciledAndWithReadableAllowedValuesIsJudged() throws Exception {
        Fixture unverified = fixture();
        JdbcTemplate jdbc = jdbc();
        String gradeSource = unverified.src("legacy_grd");
        String gradeTarget = unverified.tgt("tb_grd");
        jdbc.execute("CREATE TABLE " + gradeSource + " (id int PRIMARY KEY, grd varchar(2))");
        jdbc.update("INSERT INTO " + gradeSource + " VALUES (1, '01'), (2, '02')");
        jdbc.execute("CREATE TABLE " + gradeTarget + " (id bigint PRIMARY KEY, grd_cd varchar(2))");
        jdbc.update("INSERT INTO " + gradeTarget + " VALUES (100, 'Q7')");
        term(jdbc, unverified, "GRD_CD", "등급코드", "코드C2", 2, "01: 가, 02: 나, 03: 다 …");
        MappingSpec grades = spec(unverified, Map.of(), new TableMapping(gradeSource, gradeTarget, null, "id", List.of(),
                "id", List.of(plain("id", "id"), plain("grd", "grd_cd")), null, null, List.of()));
        TermLedger gradeLedger = new TermLedger(TermLedger.CURRENT_SCHEMA_VERSION, List.of(
                confirmed("U3", gradeSource, "grd", gradeTarget, "grd_cd", "등급코드", "GRD_CD", "코드C2", null)));

        Loaded signed = load(unverified, grades, inventory(unverified.source(), Map.of("legacy_grd",
                List.of(integer("id"), text("grd", 2)))), codeSets(unverified, grades, gradeLedger,
                terms(unverified, "GRD_CD")));

        assertThat(signed.report().ok()).as("원천이 없으면 load 는 지나간다")
                .withFailMessage(summary(signed.report())).isTrue();
        assertThat(codeSet(signed.report(), "grd_cd")).satisfies(record -> {
            assertThat(record.source()).isEqualTo("UNRECONCILED");
            assertThat(record.status()).isEqualTo("UNRECONCILED");
            assertThat(record.ledgerEntry()).isEqualTo("U3");
            assertThat(record.nonNullRows()).isEqualTo(3L);
            assertThat(record.distinct()).isEqualTo(3L);
        });
        assertThat(signed.artifact().contains("\"ledgerEntry\":\"U3\"")).as("서명할 원장 행 id").isTrue();
        assertNoValues(signed.artifact(), Map.of("앞 run 코드", "Q7"));

        Fixture readable = fixture();
        String levelSource = readable.src("legacy_lvl");
        String levelTarget = readable.tgt("tb_lvl");
        jdbc.execute("CREATE TABLE " + levelSource + " (id int PRIMARY KEY, lvl varchar(2))");
        jdbc.update("INSERT INTO " + levelSource + " VALUES (1, '1'), (2, '2')");
        jdbc.execute("CREATE TABLE " + levelTarget + " (id bigint PRIMARY KEY, lvl_cd varchar(2))");
        jdbc.update("INSERT INTO " + levelTarget + " VALUES (100, 'Z8')");
        term(jdbc, readable, "LVL_CD", "수준코드", "코드C2", 2, "01: 상, 02: 하");
        MappingSpec levels = spec(readable, Map.of("lvl", new CodeMap(ordered("1", "01", "2", "02"),
                UnmappedPolicy.FAIL, null)), new TableMapping(levelSource, levelTarget, null, "id", List.of(), "id",
                List.of(plain("id", "id"), new ColumnMapping("lvl", "lvl_cd", null, null, "lvl", null, null)),
                null, null, List.of()));
        TermLedger levelLedger = new TermLedger(TermLedger.CURRENT_SCHEMA_VERSION, List.of(
                confirmed("L1", levelSource, "lvl", levelTarget, "lvl_cd", "수준코드", "LVL_CD", "코드C2", "lvl")));

        Loaded judged = load(readable, levels, inventory(readable.source(), Map.of("legacy_lvl",
                List.of(integer("id"), text("lvl", 2)))), codeSets(readable, levels, levelLedger,
                terms(readable, "LVL_CD")));

        assertThat(judged.report().ok()).as("원천이 있으면 밖의 코드가 load 를 실패시킨다").isFalse();
        assertThat(table(judged.report(), "<code-sets>").note()).isEqualTo("공통코드 대사 불일치(" + levelTarget
                + ".lvl_cd, source=ALLOWED_VALUES): CODE_OUTSIDE_ALLOWED 1건");
        assertThat(codeSet(judged.report(), "lvl_cd")).satisfies(record -> {
            assertThat(record.ledgerEntry()).isEqualTo("L1");
            assertThat(record.outsideRows()).isEqualTo(1L);
        });
        assertThat(verdicts(judged.report(), levelSource, null).values()).containsOnly("PASS");
        assertNoValues(judged.artifact(), Map.of("허용값 밖 코드", "Z8"));
    }

    /**
     * 정렬 키가 NULL 인 행이 마지막 page 뒤에 있으면 keyset 이 그 행을 다시 읽지 못한다. 지금은 어느 모드든 행을 읽기 전에
     * {@code ORDER_KEY_NULL} 로 멈춰(ADR-0029 L3e 검토) 원천 집계도 재지 않는다. where 로 그 행을 빼면 집계도 같은 where 로 세어
     * 원천 행 수가 맞는다.
     */
    @Test
    void aNullSortKeyAfterTheLastPageStopsBeforeAnyRowIsReadAndAWhereThatExcludesItLoadsWithMatchingRows()
            throws Exception {
        Fixture fixture = fixture();
        JdbcTemplate jdbc = jdbc();
        String source = fixture.src("legacy_ord");
        String target = fixture.tgt("tb_ord");
        jdbc.execute("CREATE TABLE " + source + " (item_id int PRIMARY KEY, ord_no int, nm varchar(10))");
        // NULL 은 오름차순 맨 끝이다. 첫 page 의 미리 보기 행(501번째)도 아니고, 둘째 page 부터의 keyset 조건(ord_no > 마지막
        // 값)은 NULL 을 읽지 못한다 — 사전 확인이 없으면 이 행은 조용히 빠진다.
        jdbc.update("INSERT INTO " + source + " SELECT x, CASE WHEN x = 1001 THEN NULL ELSE x END, 'n'"
                + " FROM generate_series(1, 1001) AS x");
        jdbc.execute("CREATE TABLE " + target + " (item_id bigint PRIMARY KEY, nm varchar(10))");
        CatalogSnapshot inventory = inventory(fixture.source(), Map.of("legacy_ord",
                List.of(integer("item_id"), integer("ord_no"), text("nm", 10))));
        String stopped = "이관 실패(" + source + "): ORDER_KEY_NULL";

        for (MigrationMode mode : List.of(MigrationMode.DRY_RUN, MigrationMode.COMMIT)) {
            MappingSpec all = spec(fixture, Map.of(), nullableOrderKey(source, target, null));
            Loaded loaded = execute(all, inventory, fingerprint(all, fixture.target()), List.of(), jdbc, mode);

            assertThat(verdicts(loaded.report(), source, null)).as(mode.name())
                    .containsEntry("SOURCE_ROWS", "FAIL(RECONCILIATION_INPUT_MISSING)");
            assertThat(loaded.results()).as(mode.name()).singleElement().satisfies(result -> {
                assertThat(result.errors()).containsExactly(stopped);
                assertThat(result.read()).isZero();
            });
            assertThat(loaded.report().ok()).isFalse();
        }
        assertThat(count(target)).isZero();

        MappingSpec keyed = spec(fixture.withRun(fixture.runId() + "-keyed"), Map.of(),
                nullableOrderKey(source, target, "ord_no IS NOT NULL"));
        Loaded loaded = load(fixture, keyed, inventory, List.of());

        assertThat(loaded.report().ok()).withFailMessage(summary(loaded.report())).isTrue();
        assertThat(loaded.results().getFirst().read()).isEqualTo(1000);
        assertThat(loaded.report().reconciliation().mappings().getFirst().checks())
                .filteredOn(check -> "SOURCE_ROWS".equals(check.check())).singleElement()
                .satisfies(check -> {
                    assertThat(check.status()).isEqualTo("PASS");
                    assertThat(check.rows()).isEqualTo(1000L);
                });
    }

    private record Fixture(String source, String target, String runId) {

        String src(String table) {
            return source + "." + table;
        }

        String tgt(String table) {
            return target + "." + table;
        }

        Fixture withRun(String run) {
            return new Fixture(source, target, run);
        }
    }

    private record Case(MappingSpec spec, CatalogSnapshot inventory) {}

    private record Loaded(MappingSpec spec, TargetSchemaFingerprint fingerprint, ReconciliationRun run,
                          List<TableResult> results, MigrationReport report, String artifact, ArchiveOutcome archives,
                          JdbcTemplate target) {}

    private record Column(String name, int jdbcType, String nativeType, int size, int scale) {}

    /** 원천·대상 schema 를 새로 만들고 대상 schema 에 빈 표준 메타를 둔다. */
    private static Fixture fixture() {
        int number = SEQUENCE.incrementAndGet();
        Fixture fixture = new Fixture("rcs_" + number, "rct_" + number, "reconcile-run-" + number);
        JdbcTemplate jdbc = jdbc();
        jdbc.execute("CREATE SCHEMA " + fixture.source());
        jdbc.execute("CREATE SCHEMA " + fixture.target());
        StandardMetaFixture.create(jdbc, fixture.target());
        return fixture;
    }

    /** 승인 workflow 의 load 와 같은 길 — live 대상 계약으로 bound fingerprint 를 읽고 대사 계획을 만들어 적재·검증한다. */
    private Loaded load(Fixture fixture, MappingSpec spec, CatalogSnapshot inventory, List<CodeSetTarget> codeSets)
            throws Exception {
        return execute(spec, inventory, fingerprint(spec, fixture.target()), codeSets, jdbc(), MigrationMode.COMMIT);
    }

    private Loaded execute(MappingSpec spec, CatalogSnapshot inventory, TargetSchemaFingerprint fingerprint,
                           List<CodeSetTarget> codeSets, JdbcTemplate target, MigrationMode mode) throws Exception {
        boolean commit = mode == MigrationMode.COMMIT;
        Map<String, Map<String, TargetValueGuard.Limit>> guards =
                new MappingValidator(transformers, "unused-db-columns.json").rowGuards(spec, fingerprint, inventory);
        ReconciliationPlan plan = ReconciliationPlanner.plan(spec, inventory, fingerprint, codeSets, transformers);
        ReconciliationRun run = ReconciliationRun.of(plan, new ColumnReplay(transformers, spec.codemaps()),
                commit ? new PostgresReconciliationQueries(target) : null);
        ArchiveRun archives = commit && ArchiveRun.required(spec)
                ? ArchiveRun.writing(archiveDirectory(), "b".repeat(64), "c".repeat(64))
                : ArchiveRun.counting();
        List<TableResult> results = executor.execute(spec, mode, jdbc(), commit ? target : null, SESSION, true,
                guards, archives, false, run);
        MigrationReport report = verifier.verify(spec, results, commit ? target : null, archives.outcome(), run);
        String artifact = MigrationExecutionArtifact.encode(migrationPlan(), mode, report.ok() ? "PASS" : "FAIL",
                STARTED, report, results, archives.outcome());
        return new Loaded(spec, fingerprint, run, results, report, artifact, archives.outcome(),
                commit ? target : null);
    }

    /** 같은 실행의 결과·대사 홀더로 verify 만 다시 한다. 대상 쪽 누적은 verify 마다 새로 만든다. */
    private MigrationReport reverify(Loaded loaded, List<TableResult> results) {
        return verifier.verify(loaded.spec(), results, loaded.target(), loaded.archives(), loaded.run());
    }

    private Path archiveDirectory() throws IOException {
        return Files.createDirectory(temp.toRealPath().resolve("archive-" + ARCHIVES.incrementAndGet()));
    }

    private static TargetSchemaFingerprint fingerprint(MappingSpec spec, String schema) throws SQLException {
        try (Connection connection = connection()) {
            return new PostgresTargetSchemaFingerprinter().fingerprintBound(connection, spec, Set.of(schema));
        }
    }

    /** 숫자 표 — 세 행, 한 소스·한 대상. */
    private static Case amounts(Fixture fixture) {
        JdbcTemplate jdbc = jdbc();
        jdbc.execute("CREATE TABLE " + fixture.src("legacy_amt") + " (id int PRIMARY KEY, amt numeric(10,2))");
        jdbc.update("INSERT INTO " + fixture.src("legacy_amt") + " VALUES (1, 10.00), (2, 20.00), (3, 30.00)");
        jdbc.execute("CREATE TABLE " + fixture.tgt("tb_amt") + " (id bigint PRIMARY KEY, amt numeric(10,2))");
        MappingSpec spec = spec(fixture, Map.of(), new TableMapping(fixture.src("legacy_amt"), fixture.tgt("tb_amt"),
                null, "id", List.of(), "id", List.of(plain("id", "id"), plain("amt", "amt")), null, null, List.of()));
        return new Case(spec, inventory(fixture.source(), Map.of("legacy_amt",
                List.of(integer("id"), numeric("amt", 10, 2)))));
    }

    /**
     * 키를 그대로 쓰는 부모(종료일 자리표시 한 행을 격리)와 그 키를 물리 FK 없이 복사하는 자식. 자식 셋 가운데 하나가 격리된
     * 부모를 가리킨다. {@code declare} 면 자식이 참조를 선언하고, {@code parentVerify} 는 부모의 대사 선언이다.
     */
    private static Case isolatedParentAndChild(Fixture fixture, boolean declare, VerifyDeclaration parentVerify) {
        JdbcTemplate jdbc = jdbc();
        if (!exists(jdbc, fixture.src("legacy_parent"))) {
            jdbc.execute("CREATE TABLE " + fixture.src("legacy_parent") + " (parent_id int PRIMARY KEY,"
                    + " end_ymd varchar(10))");
            jdbc.execute("CREATE TABLE " + fixture.src("legacy_child") + " (child_id int PRIMARY KEY, parent_id int)");
            jdbc.update("INSERT INTO " + fixture.src("legacy_parent") + " VALUES (1, '20240131'), (2, '" + PLACEHOLDER
                    + "'), (3, '20240229')");
            jdbc.update("INSERT INTO " + fixture.src("legacy_child") + " VALUES (1, 1), (2, 3), (3, 2)");
            parentAndChildTargets(jdbc, fixture);
        }
        VerifyDeclaration childVerify = declare ? new VerifyDeclaration(List.of(new VerifyReference(
                List.of("parent_id"), fixture.tgt("tb_parent"), List.of("parent_id"))), null, null) : null;
        MappingSpec spec = spec(fixture, Map.of(), parent(fixture, null, parentVerify), child(fixture, null, childVerify));
        return new Case(spec, inventory(fixture.source(), Map.of(
                "legacy_parent", List.of(integer("parent_id"), text("end_ymd", 10)),
                "legacy_child", List.of(integer("child_id"), integer("parent_id")))));
    }

    /** 앞 run(batch 1)과 다음 run(batch 2)이 같은 표를 나눠 적재한다. 자식은 늘 부모 참조를 선언한다. */
    private static MappingSpec batch(Fixture fixture, int batch) {
        VerifyDeclaration childVerify = new VerifyDeclaration(List.of(new VerifyReference(List.of("parent_id"),
                fixture.tgt("tb_parent"), List.of("parent_id"))), null, null);
        return spec(fixture, Map.of(), parent(fixture, "batch_no = " + batch, null),
                child(fixture, "batch_no = " + batch, childVerify));
    }

    private static TableMapping parent(Fixture fixture, String where, VerifyDeclaration verify) {
        return new TableMapping(fixture.src("legacy_parent"), fixture.tgt("tb_parent"), where, "parent_id", List.of(),
                "parent_id", List.of(plain("parent_id", "parent_id"),
                new ColumnMapping("end_ymd", "end_ymd", "ymd8", null, null, null, null, null, List.of(),
                        new Isolate("P1", 2L, List.of("PLACEHOLDER_DATE")))),
                null, null, List.of(), null, List.of(), verify);
    }

    private static TableMapping child(Fixture fixture, String where, VerifyDeclaration verify) {
        return new TableMapping(fixture.src("legacy_child"), fixture.tgt("tb_child"), where, "child_id", List.of(),
                "child_id", List.of(plain("child_id", "child_id"), plain("parent_id", "parent_id")),
                null, null, List.of(), null, List.of(), verify);
    }

    private static void parentAndChildTargets(JdbcTemplate jdbc, Fixture fixture) {
        jdbc.execute("CREATE TABLE " + fixture.tgt("tb_parent") + " (parent_id bigint PRIMARY KEY,"
                + " end_ymd varchar(8))");
        jdbc.execute("CREATE TABLE " + fixture.tgt("tb_child") + " (child_id bigint PRIMARY KEY, parent_id bigint)");
    }

    /** 물리 FK 로 묶인 부모(하나)와 자식(둘, 하나는 없는 부모를 가리킨다). */
    private static Case physicalForeignKey(Fixture fixture) {
        return foreignKeyCase(fixture, true);
    }

    private static String foreignKeyName(JdbcTemplate jdbc, String child) {
        return jdbc.queryForObject("SELECT conname FROM pg_constraint WHERE contype = 'f' AND conrelid = ?::regclass",
                String.class, child);
    }

    /** 물리 FK 로 묶인 부모(하나)와 자식. {@code orphan} 이면 자식 하나가 없는 부모를 가리킨다. */
    private static Case foreignKeyCase(Fixture fixture, boolean orphan) {
        JdbcTemplate jdbc = jdbc();
        jdbc.execute("CREATE TABLE " + fixture.src("legacy_gp") + " (id int PRIMARY KEY)");
        jdbc.execute("CREATE TABLE " + fixture.src("legacy_gc") + " (id int PRIMARY KEY, gp_id int)");
        jdbc.update("INSERT INTO " + fixture.src("legacy_gp") + " VALUES (1)");
        jdbc.update("INSERT INTO " + fixture.src("legacy_gc") + " VALUES (1, 1), (2, " + (orphan ? 99 : 1) + ")");
        jdbc.execute("CREATE TABLE " + fixture.tgt("tb_gp") + " (id bigint PRIMARY KEY)");
        jdbc.execute("CREATE TABLE " + fixture.tgt("tb_gc") + " (id bigint PRIMARY KEY, gp_id bigint REFERENCES "
                + fixture.tgt("tb_gp") + " (id))");
        MappingSpec spec = spec(fixture, Map.of(),
                new TableMapping(fixture.src("legacy_gp"), fixture.tgt("tb_gp"), null, "id", List.of(), "id",
                        List.of(plain("id", "id")), null, null, List.of()),
                new TableMapping(fixture.src("legacy_gc"), fixture.tgt("tb_gc"), null, "id", List.of(), "id",
                        List.of(plain("id", "id"), plain("gp_id", "gp_id")), null, null, List.of()));
        return new Case(spec, inventory(fixture.source(), Map.of(
                "legacy_gp", List.of(integer("id")),
                "legacy_gc", List.of(integer("id"), integer("gp_id")))));
    }

    private static List<String> foreignKeyTriggers(JdbcTemplate jdbc, String child) {
        return jdbc.queryForList("SELECT t.tgname FROM pg_trigger t JOIN pg_constraint c ON c.oid = t.tgconstraint"
                + " WHERE c.contype = 'f' AND c.conrelid = ?::regclass AND t.tgrelid = c.conrelid", String.class, child);
    }

    /** 결재 본표 매핑. {@code codemap} 이 없으면 업무 구분을 그대로 옮긴다. */
    private static MappingSpec approvals(Fixture fixture, String codemap, Map<String, String> values,
                                         UnmappedPolicy unmapped) {
        Map<String, CodeMap> codemaps = codemap == null ? Map.of()
                : Map.of(codemap, new CodeMap(values, unmapped, null));
        return spec(fixture, codemaps, approvalTable(fixture.src("legacy_atrz"), fixture.tgt("tb_ifml_atrz_info"),
                codemap));
    }

    private static TableMapping approvalTable(String source, String target, String codemap) {
        String key = target.endsWith("hstry") ? "hstry_sn" : "ifml_atrz_sn";
        return new TableMapping(source, target, null, "atrz_no", List.of(), key,
                List.of(plain("atrz_no", key), new ColumnMapping("task_cd", "task_se_cd", null, null, codemap, null,
                        null)), null, null, List.of());
    }

    /** 공통코드 표 — COM075 의 A01(사용)·A02(사용 안 함). {@code header} 가 아니면 그룹 헤더가 없다. */
    private static void commonCodes(JdbcTemplate jdbc, Fixture fixture, boolean header) {
        jdbc.execute("CREATE TABLE " + fixture.tgt("tb_com_cd") + " (cd_id varchar(6) PRIMARY KEY)");
        jdbc.execute("CREATE TABLE " + fixture.tgt("tb_com_dtl_cd") + " (cd_id varchar(6), dtl_cd varchar(20),"
                + " use_yn varchar(1), PRIMARY KEY (cd_id, dtl_cd))");
        if (header) {
            jdbc.update("INSERT INTO " + fixture.tgt("tb_com_cd") + " VALUES ('COM075')");
            jdbc.update("INSERT INTO " + fixture.tgt("tb_com_dtl_cd") + " VALUES ('COM075', 'A01', 'Y'),"
                    + " ('COM075', 'A02', 'N')");
        }
    }

    /** runner 의 쓰기 전 게이트와 같은 길 — 바인딩 컬럼의 그룹만 읽기 전용 연결로 읽는다. */
    private static PrecheckResult precheck(Fixture fixture, MappingSpec spec) throws SQLException {
        Map<String, Set<String>> required = CodeSetPrecheck.requiredGroups(spec, ProductCodeBindings.ALL,
                fixture.target());
        Map<String, Map<String, CodeGroupState>> groups = new LinkedHashMap<>();
        try (Connection connection = connection()) {
            connection.setReadOnly(true);
            for (Map.Entry<String, Set<String>> schema : required.entrySet()) {
                groups.put(schema.getKey(), new PostgresCodeGroupReader().read(connection, schema.getKey(),
                        schema.getValue()));
            }
        }
        return CodeSetPrecheck.check(spec, ProductCodeBindings.ALL, groups, fixture.target());
    }

    /** load 가 대사 계획에 싣는 공통코드·허용값 대상. 게이트를 지나야 한다. */
    private static List<CodeSetTarget> codeSets(Fixture fixture, MappingSpec spec, TermLedger ledger,
                                                Map<TermKey, StandardTermRecord> terms) throws SQLException {
        PrecheckResult gate = precheck(fixture, spec);
        assertThat(gate.errors()).isEmpty();
        return CodeSetTargets.of(spec, ledger, terms, fixture.target(), ProductCodeBindings.ALL, gate);
    }

    /** 원장 검증이 읽는 live 표준 용어((대상 schema, 영문약어) 키). */
    private static Map<TermKey, StandardTermRecord> terms(Fixture fixture, String... abbreviations)
            throws SQLException {
        Map<TermKey, StandardTermRecord> terms = new HashMap<>();
        try (Connection connection = connection()) {
            new PostgresStandardTermReader().read(connection, fixture.target(), Set.of(abbreviations))
                    .forEach((abbreviation, record) -> terms.put(new TermKey(fixture.target(), abbreviation), record));
        }
        return terms;
    }

    /** 원장 확정 행 — 표준 용어로 확정했고 허용값을 확인하지 못했다(U3). */
    private static Entry confirmed(String id, String sourceTable, String sourceColumn, String targetTable,
                                   String targetColumn, String name, String abbreviation, String domain,
                                   String codemap) {
        return new Entry(id, new ColumnRef(sourceTable, sourceColumn), null, null,
                new ColumnRef(targetTable, targetColumn), new StandardTerm(name, abbreviation, domain), null,
                "INFERRED", "CONFIRMED", new Load(null, null, codemap, List.of()),
                new Conformance(null, List.of("ALLOWED_VALUES_UNVERIFIED"), null, List.of(), null), null,
                "허용값 원문이 잘려 있다 — 컷오버 전 업무 소유자 확인",
                List.of(new Transition("PROPOSED", "도구", "2026-10-01"), new Transition("REVIEWED", "검토자", "2026-10-01"),
                        new Transition("CONFIRMED", "업무담당", "2026-10-02")));
    }

    /** 대상 schema 의 표준 용어와 그 도메인 한 행. */
    private static void term(JdbcTemplate jdbc, Fixture fixture, String abbreviation, String name, String domain,
                             int length, String allowedValues) {
        jdbc.update("INSERT INTO " + fixture.tgt("meta_standard_domains") + " (domain_name, data_type, data_length)"
                + " SELECT ?, 'VARCHAR', ? WHERE NOT EXISTS (SELECT 1 FROM " + fixture.tgt("meta_standard_domains")
                + " WHERE domain_name = ?)", domain, length, domain);
        jdbc.update("INSERT INTO " + fixture.tgt("meta_standard_terms") + " (term_name, eng_abbr, domain_name,"
                + " allowed_values) VALUES (?, ?, ?, ?)", name, abbreviation, domain, allowedValues);
    }

    /** 정렬 키가 NULL 일 수 있는 표의 매핑. */
    private static TableMapping nullableOrderKey(String source, String target, String where) {
        return new TableMapping(source, target, where, "ord_no", List.of(), "item_id",
                List.of(plain("item_id", "item_id"), plain("nm", "nm")), null, null, List.of());
    }

    /** 바뀐 대상 행에 맞춰 checkpoint 의 행 checksum 을 다시 쓴다 — checksum 대조만으로는 못 잡는 경우를 만든다. */
    private static void rewriteChecksum(Fixture fixture, TableMapping table, String key) {
        JdbcTemplate jdbc = jdbc();
        List<String> columns = EtlExecutor.canonicalTargetColumns(table);
        Map<String, Object> row = jdbc.queryForMap("SELECT " + String.join(", ", columns) + " FROM " + table.target()
                + " WHERE " + table.targetKey() + " = " + key);
        int updated = jdbc.update("UPDATE migration_control.tb_migration_checkpoint SET row_checksum = ?"
                        + " WHERE run_id = ? AND mapping_id = ? AND target_key = ?",
                RowChecksum.calculate(columns, row), fixture.runId(), table.effectiveId(), key);
        assertThat(updated).isEqualTo(1);
    }

    /** 매핑 하나의 검사 판정 — "검사[/컬럼]" → "상태[(사유)][[불일치 수]]". */
    private static Map<String, String> verdicts(MigrationReport report, String source, String mapping) {
        MappingRecord record = report.reconciliation().mappings().stream()
                .filter(candidate -> candidate.source().equals(source) && Objects.equals(candidate.mapping(), mapping))
                .findFirst().orElseThrow();
        Map<String, String> verdicts = new LinkedHashMap<>();
        for (CheckRecord check : record.checks()) {
            verdicts.put(check.check() + (check.column() == null ? "" : "/" + check.column()),
                    check.status() + (check.reason() == null ? "" : "(" + check.reason() + ")")
                            + (check.mismatches() == null ? "" : "[" + check.mismatches() + "]"));
        }
        return verdicts;
    }

    /** 문구에 값이 없는지 본다. 실패 문구에는 값이 아니라 탐침 이름만 싣는다. */
    private static void assertNoValues(String text, Map<String, String> probes) {
        List<String> leaked = probes.entrySet().stream().filter(probe -> text.contains(probe.getValue()))
                .map(Map.Entry::getKey).sorted().toList();
        assertThat(leaked).as("증거·보고에는 행 값·합계·최소최대·코드값이 없다").isEmpty();
    }

    /** 실패 문구용 보고 요약 — scoped 대조 문구의 키 digest 는 가린다. */
    private static String summary(MigrationReport report) {
        return report.toSummary().replaceAll("(?i)digest=[0-9a-f]+", "digest=<redacted>");
    }

    private static TableReport table(MigrationReport report, String label) {
        return report.tables().stream().filter(table -> table.label().equals(label)).findFirst().orElseThrow();
    }

    private static CodeSetRecord codeSet(MigrationReport report, String column) {
        return report.reconciliation().codeSets().stream().filter(record -> record.column().equals(column))
                .findFirst().orElseThrow();
    }

    private static String runStatus(Fixture fixture) {
        return jdbc().queryForObject("SELECT run_stts_cd FROM migration_control.tb_migration_run WHERE run_id = ?",
                String.class, fixture.runId());
    }

    private static long count(String table) {
        Long rows = jdbc().queryForObject("SELECT count(*) FROM " + table, Long.class);
        return rows == null ? 0L : rows;
    }

    private static boolean exists(JdbcTemplate jdbc, String table) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT to_regclass(?) IS NOT NULL", Boolean.class, table));
    }

    private static ColumnMapping plain(String source, String target) {
        return new ColumnMapping(source, target, null, null, null, null, null);
    }

    /** 키 순서를 지키는 codemap values(위치가 증거에 실린다). */
    private static Map<String, String> ordered(String... pairs) {
        Map<String, String> values = new LinkedHashMap<>();
        for (int i = 0; i < pairs.length; i += 2) {
            values.put(pairs[i], pairs[i + 1]);
        }
        return values;
    }

    private static MappingSpec spec(Fixture fixture, Map<String, CodeMap> codemaps, TableMapping... tables) {
        return new MappingSpec(sourceConfig(), targetConfig(), List.of(tables), codemaps,
                new RunContext(fixture.runId(), "synthetic-source"));
    }

    private static Column integer(String name) {
        return new Column(name, Types.INTEGER, "int4", 10, 0);
    }

    private static Column numeric(String name, int size, int scale) {
        return new Column(name, Types.NUMERIC, "numeric", size, scale);
    }

    private static Column text(String name, int size) {
        return new Column(name, Types.VARCHAR, "varchar", size, 0);
    }

    private static Column date(String name) {
        return new Column(name, Types.DATE, "date", 13, 0);
    }

    /** PostgreSQL 원천 schema 표의 승인 inventory — 분류기가 읽는 jdbcType·nativeType·size·scale 을 둔다. */
    private static CatalogSnapshot inventory(String schema, Map<String, List<Column>> tables) {
        List<CatalogObject> objects = new ArrayList<>();
        for (Map.Entry<String, List<Column>> table : tables.entrySet()) {
            objects.add(new CatalogObject(ObjectKind.TABLE, "db", schema, table.getKey(), false, null, null,
                    List.of(), Map.of()));
            int ordinal = 0;
            for (Column column : table.getValue()) {
                ordinal++;
                objects.add(new CatalogObject(ObjectKind.COLUMN, "db", schema, table.getKey() + "." + column.name(),
                        false, null, null, List.of(new ObjectReference(ObjectKind.TABLE, "db", schema, table.getKey())),
                        Map.of("parentTable", table.getKey(), "originalName", column.name(),
                                "jdbcType", Integer.toString(column.jdbcType()), "nativeType", column.nativeType(),
                                "size", Integer.toString(column.size()), "scale", Integer.toString(column.scale()),
                                "ordinal", Integer.toString(ordinal))));
            }
        }
        return new CatalogSnapshot(CatalogSnapshot.CURRENT_SCHEMA_VERSION, STARTED,
                new CatalogSnapshot.DatabaseInfo("PostgreSQL", "17", "driver", "1"),
                new CatalogSnapshot.EnvironmentInfo("db", "public", "UTF-8", "C", "UTC"),
                SnapshotCapability.unknown(), objects, List.of());
    }

    private static MigrationPlan migrationPlan() {
        PlanCoverage coverage = new PlanCoverage(0, 0, 0, 0);
        return new MigrationPlan(MigrationPlan.CURRENT_SCHEMA_VERSION, "b".repeat(64), "c".repeat(64),
                "d".repeat(64), "e".repeat(64), "PostgreSQL 17", List.of(), coverage,
                new MigrationPlanValidator().validate(List.of(), coverage));
    }

    private static Connection connection() throws SQLException {
        return DriverManager.getConnection(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
    }

    private static JdbcTemplate jdbc() {
        return new JdbcTemplate(new DriverManagerDataSource(
                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword()));
    }

    private static DbConfig sourceConfig() {
        return new DbConfig(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword(),
                POSTGRES.getDriverClassName());
    }

    private static DbConfig targetConfig() {
        return new DbConfig(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword(),
                POSTGRES.getDriverClassName(), "disposable-postgres-target");
    }
}
