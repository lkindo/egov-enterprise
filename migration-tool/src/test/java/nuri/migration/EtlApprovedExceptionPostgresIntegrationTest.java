package nuri.migration;

import nuri.migration.adapter.EvidenceLevel;
import nuri.migration.adapter.SourceReadSessionPolicy;
import nuri.migration.archive.ArchiveRun;
import nuri.migration.artifact.MigrationExecutionArtifact;
import nuri.migration.discovery.CatalogObject;
import nuri.migration.discovery.CatalogObject.ObjectReference;
import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.ObjectKind;
import nuri.migration.discovery.SnapshotCapability;
import nuri.migration.domain.DomainViolation;
import nuri.migration.domain.TargetValueGuard;
import nuri.migration.etl.EtlExecutor;
import nuri.migration.etl.EtlExecutor.TableResult;
import nuri.migration.etl.MigrationMode;
import nuri.migration.etl.TargetSequenceSynchronizer.Action;
import nuri.migration.identity.IdentityValueType;
import nuri.migration.identity.TargetIdentityPolicy;
import nuri.migration.isolate.IsolationTally.Isolation;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.CompositeForeignKey;
import nuri.migration.model.MappingSpec.DbConfig;
import nuri.migration.model.MappingSpec.IdentityComponentSpec;
import nuri.migration.model.MappingSpec.IdStrategy;
import nuri.migration.model.MappingSpec.IdentityStrategy;
import nuri.migration.model.MappingSpec.Isolate;
import nuri.migration.model.MappingSpec.Nullify;
import nuri.migration.model.MappingSpec.RunContext;
import nuri.migration.model.MappingSpec.TableMapping;
import nuri.migration.plan.MigrationPlan;
import nuri.migration.plan.MigrationPlanValidator;
import nuri.migration.plan.PlanCoverage;
import nuri.migration.postgres.PostgresTargetSchemaFingerprinter;
import nuri.migration.postgres.TargetSchemaFingerprint;
import nuri.migration.source.SourceIntrospector;
import nuri.migration.transform.TransformerRegistry;
import nuri.migration.validate.MappingValidator;
import nuri.migration.validate.TargetStandardValidator;
import nuri.migration.verify.MigrationReport;
import nuri.migration.verify.MigrationVerifier;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.nio.file.Path;
import java.sql.Connection;
import java.sql.Types;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 원장이 승인한 위반으로만 실패한 행의 격리(ADR-0029 L3b)를 H2 소스 → 실제 PostgreSQL 대상으로 본다.
 *
 * <p>값 한계 가드는 승인 workflow 와 같은 길로 정한다 — live 대상 계약을 fingerprinter 로 읽고 {@code MappingValidator#rowGuards}
 * 가 한계를 정해 실행기에 넘긴다. 격리는 행 값·키를 남기지 않고 원장 행·컬럼·위반·행 순번만 남긴다.
 */
@Testcontainers
class EtlApprovedExceptionPostgresIntegrationTest {

    @Container
    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:17-alpine");

    private static final AtomicInteger SEQUENCE = new AtomicInteger();
    private static final String STOPPED = "이 chunk 는 기록하지 않고 적재를 멈췄습니다";
    private static final String PLACEHOLDER = "99991231";

    private final TransformerRegistry transformers = new TransformerRegistry();
    private final EtlExecutor executor = new EtlExecutor(new SourceIntrospector(), transformers);
    private final MigrationVerifier verifier = new MigrationVerifier();

    @TempDir
    Path archiveRoot;

    @Test
    void approvedPlaceholdersAreIsolatedWithinTheCapAndDryRunPredictsTheSamePositions() throws Exception {
        Fixture fixture = fixture("cap");
        String source = seedUsers(fixture);
        String target = fixture.targetTable("user");
        fixture.target().execute("CREATE TABLE " + target + " (id bigint PRIMARY KEY, end_ymd varchar(8),"
                + " nm varchar(20))");
        MappingSpec spec = fixture.spec(users(source, target, 3));
        CatalogSnapshot inventory = usersInventory(source);
        List<Isolation> expected = List.of(new Isolation("U4", "end_ymd", "PLACEHOLDER_DATE", 3,
                List.of(10L, 600L, 1201L)));

        TableResult predicted = single(run(fixture, spec, MigrationMode.DRY_RUN, inventory));

        assertThat(predicted.errors()).isEmpty();
        assertThat(predicted.read()).isEqualTo(1250);
        assertThat(predicted.transformed()).isEqualTo(1247);
        assertThat(predicted.written()).isZero();
        assertThat(predicted.isolated()).isEqualTo(3);
        assertThat(predicted.isolations()).as("dry-run 도 keyset 으로 읽어 같은 순번을 낸다").isEqualTo(expected);

        List<TableResult> results = run(fixture, spec, MigrationMode.COMMIT, inventory);
        TableResult loaded = single(results);

        assertThat(loaded.errors()).isEmpty();
        assertThat(loaded.read()).isEqualTo(1250);
        assertThat(loaded.transformed()).isEqualTo(1247);
        assertThat(loaded.written()).isEqualTo(1247);
        assertThat(loaded.isolated()).isEqualTo(3);
        assertThat(loaded.isolations()).isEqualTo(expected);
        assertThat(count(fixture, target)).isEqualTo(1247);
        assertThat(fixture.target().queryForObject("SELECT count(*) FROM " + target + " WHERE id IN (10, 600, 1201)",
                Long.class)).as("격리한 행은 적재하지 않는다").isZero();
        MigrationReport report = verifier.verify(spec, results, fixture.target());
        assertThat(report.ok()).as(report.toSummary()).isTrue();

        String artifact = MigrationExecutionArtifact.encode(plan(), MigrationMode.COMMIT, "PASS",
                Instant.parse("2026-10-15T00:00:00Z"), report, results);
        assertThat(artifact).contains("\"schemaVersion\":4", "\"isolated\":3", "\"ledgerEntry\":\"U4\"",
                "\"violation\":\"PLACEHOLDER_DATE\"", "\"ordinals\":[10,600,1201]");
        assertThat(artifact).as("격리 증거에는 값·키가 없다").doesNotContain(PLACEHOLDER, "n10", "n600", "n1201");
    }

    @Test
    void theRowBeyondTheLedgerCapStopsTheRunAndItsChunkIsNotWritten() throws Exception {
        Fixture fixture = fixture("over");
        String source = seedUsers(fixture);
        String target = fixture.targetTable("user");
        fixture.target().execute("CREATE TABLE " + target + " (id bigint PRIMARY KEY, end_ymd varchar(8),"
                + " nm varchar(20))");
        MappingSpec spec = fixture.spec(users(source, target, 2));
        CatalogSnapshot inventory = usersInventory(source);
        String stop = "격리 상한 초과(원장 행 U4, 상한 2): " + source + " row=1201 — ISOLATION_CAP_EXCEEDED, " + STOPPED;

        TableResult predicted = single(run(fixture, spec, MigrationMode.DRY_RUN, inventory));
        List<TableResult> results = run(fixture, spec, MigrationMode.COMMIT, inventory);
        TableResult stopped = single(results);

        assertThat(predicted.errors()).as("dry-run 도 같은 위치에서 멈춘다").containsExactly(stop);
        assertThat(stopped.errors()).containsExactly(stop);
        assertThat(stopped.written()).as("앞선 두 chunk 만 남는다").isEqualTo(998);
        assertThat(stopped.isolated()).isEqualTo(2);
        assertThat(count(fixture, target)).isEqualTo(998);
        assertThat(fixture.target().queryForObject("SELECT count(*) FROM " + target + " WHERE id > 1000",
                Long.class)).as("멈춘 chunk 는 한 행도 쓰지 않는다").isZero();
        assertThat(verifier.verify(spec, results, fixture.target()).ok()).isFalse();
    }

    @Test
    void anUnapprovedFailureStopsEvenOnARowWhoseOtherFailureIsApproved() throws Exception {
        Fixture fixture = fixture("unapproved");
        String source = fixture.sourceTable("ITEM");
        String target = fixture.targetTable("item");
        fixture.source().execute("CREATE TABLE " + source + " (ID int PRIMARY KEY, END_YMD varchar(10),"
                + " AMT varchar(10))");
        fixture.source().update("INSERT INTO " + source + " VALUES (1, '20240131', '5'), (2, '" + PLACEHOLDER
                + "', '7'), (3, '" + PLACEHOLDER + "', 'x')");
        fixture.target().execute("CREATE TABLE " + target + " (id bigint PRIMARY KEY, end_ymd varchar(8), amt bigint)");
        MappingSpec spec = fixture.spec(new TableMapping(source, target, null, "ID", "id", List.of(
                plain("ID", "id"),
                isolated("END_YMD", "end_ymd", "ymd8", "U4", 5, "PLACEHOLDER_DATE"),
                new ColumnMapping("AMT", "amt", null, "long", null, null, null)), null));
        CatalogSnapshot inventory = inventory(Map.of(source, columns("ID", Types.INTEGER, "END_YMD", Types.VARCHAR,
                "AMT", Types.VARCHAR)));

        TableResult stopped = single(run(fixture, spec, MigrationMode.COMMIT, inventory));

        assertThat(stopped.errors()).as("승인된 컬럼 위반 뒤의 승인 밖 실패가 행을 멈춘다").containsExactly(
                "행 변환 실패(" + source + ", column=amt, row=3): ROW_TRANSFORM_FAILED:TYPE_CONVERSION_FAILED"
                        + " — 격리하지 않음(NOT_DECLARED), " + STOPPED);
        assertThat(count(fixture, target)).isZero();

        Fixture invalid = fixture("not_approved");
        String invalidSource = invalid.sourceTable("ITEM");
        String invalidTarget = invalid.targetTable("item");
        invalid.source().execute("CREATE TABLE " + invalidSource + " (ID int PRIMARY KEY, END_YMD varchar(10))");
        invalid.source().update("INSERT INTO " + invalidSource + " VALUES (1, '" + PLACEHOLDER + "'), (2, '20241301')");
        invalid.target().execute("CREATE TABLE " + invalidTarget + " (id bigint PRIMARY KEY, end_ymd varchar(8))");
        MappingSpec invalidSpec = invalid.spec(new TableMapping(invalidSource, invalidTarget, null, "ID", "id", List.of(
                plain("ID", "id"), isolated("END_YMD", "end_ymd", "ymd8", "U4", 5, "PLACEHOLDER_DATE")), null));

        TableResult notApproved = single(run(invalid, invalidSpec, MigrationMode.COMMIT, inventory(Map.of(
                invalidSource, columns("ID", Types.INTEGER, "END_YMD", Types.VARCHAR)))));

        assertThat(notApproved.errors()).containsExactly("행 변환 실패(" + invalidSource
                + ", column=end_ymd, row=2): ROW_TRANSFORM_FAILED:DOMAIN_VIOLATION(INVALID_DATE)"
                + " — 격리하지 않음(NOT_APPROVED), " + STOPPED);
        assertThat(String.join("\n", notApproved.errors())).doesNotContain("20241301", PLACEHOLDER);
        assertThat(count(invalid, invalidTarget)).isZero();
    }

    @Test
    void anApprovedViolationDoesNotHideACompositeForeignKeyOrphanOnTheSameRow() throws Exception {
        Fixture fixture = fixture("orphan");
        String parentSource = fixture.sourceTable("PARENT");
        String childSource = fixture.sourceTable("CHILD");
        String parentTarget = fixture.targetTable("parent");
        String childTarget = fixture.targetTable("child");
        fixture.source().execute("CREATE TABLE " + parentSource + " (P_NO int PRIMARY KEY)");
        fixture.source().update("INSERT INTO " + parentSource + " VALUES (1)");
        fixture.source().execute("CREATE TABLE " + childSource + " (C_NO int PRIMARY KEY, P_NO int,"
                + " END_YMD varchar(10))");
        fixture.source().update("INSERT INTO " + childSource + " VALUES (1, 1, '20240131'), (2, 1, '" + PLACEHOLDER
                + "'), (3, 99, '" + PLACEHOLDER + "')");
        fixture.target().execute("CREATE TABLE " + parentTarget + " (p_no bigint PRIMARY KEY)");
        fixture.target().execute("CREATE TABLE " + childTarget + " (c_no bigint PRIMARY KEY, p_no bigint,"
                + " end_ymd varchar(8))");
        MappingSpec spec = fixture.spec(parent(parentSource, parentTarget, List.of()),
                child(childSource, childTarget, parentSource));
        CatalogSnapshot inventory = inventory(Map.of(parentSource, columns("P_NO", Types.INTEGER),
                childSource, columns("C_NO", Types.INTEGER, "P_NO", Types.INTEGER, "END_YMD", Types.VARCHAR)));

        List<TableResult> results = run(fixture, spec, MigrationMode.COMMIT, inventory);

        assertThat(results.getFirst().errors()).isEmpty();
        TableResult child = results.get(1);
        assertThat(child.errors()).as("승인된 컬럼 위반 뒤에 FK 고아가 숨지 않는다").containsExactly(
                "행 변환 실패(" + childSource + ", column=<foreignKeys>, row=3): ROW_TRANSFORM_FAILED:FK_REF_FAILED"
                        + " — 격리하지 않음(NOT_DECLARED), " + STOPPED);
        assertThat(child.isolated()).as("멈추기 전의 승인 행은 격리됐다").isEqualTo(1);
        assertThat(count(fixture, childTarget)).isZero();
    }

    @Test
    void aRowAlreadyCommittedIsNeverIsolatedWhenItFailsOnResume() throws Exception {
        Fixture fixture = fixture("durable");
        String source = fixture.sourceTable("USER");
        String target = fixture.targetTable("user");
        fixture.source().execute("CREATE TABLE " + source + " (ID int PRIMARY KEY, END_YMD varchar(10),"
                + " NM varchar(20))");
        fixture.source().update("INSERT INTO " + source + " VALUES (1, '20240131', 'a'), (2, '20240131', 'b'),"
                + " (3, '20240131', 'c')");
        fixture.target().execute("CREATE TABLE " + target + " (id bigint PRIMARY KEY, end_ymd varchar(8),"
                + " nm varchar(20))");
        MappingSpec spec = fixture.spec(users(source, target, 3));
        CatalogSnapshot inventory = usersInventory(source);
        assertThat(single(run(fixture, spec, MigrationMode.COMMIT, inventory)).written()).isEqualTo(3);

        fixture.source().update("UPDATE " + source + " SET END_YMD = '" + PLACEHOLDER + "' WHERE ID = 2");
        TableResult resumed = single(run(fixture, spec, MigrationMode.COMMIT, inventory));

        assertThat(resumed.errors()).containsExactly("행 변환 실패(" + source + ", column=end_ymd, row=2):"
                + " ROW_TRANSFORM_FAILED:DOMAIN_VIOLATION(PLACEHOLDER_DATE) — 격리하지 않음(ISOLATION_ON_DURABLE_ROW), "
                + STOPPED);
        assertThat(resumed.isolated()).as("이미 대상에 있는 행을 적재하지 않은 것으로 세지 않는다").isZero();
        assertThat(fixture.target().queryForObject("SELECT end_ymd FROM " + target + " WHERE id = 2", String.class))
                .isEqualTo("20240131");
    }

    @Test
    void aValueLongerThanTheTargetIsJudgedBeforeWritingAndIsolatedOnlyWhenApproved() throws Exception {
        Fixture fixture = fixture("length");
        String source = fixture.sourceTable("NAME");
        String target = fixture.targetTable("name");
        fixture.source().execute("CREATE TABLE " + source + " (ID int PRIMARY KEY, NM varchar(20))");
        fixture.source().update("INSERT INTO " + source + " VALUES (1, 'short'), (2, 'ninechars'), (3, NULL)");
        fixture.target().execute("CREATE TABLE " + target + " (id bigint PRIMARY KEY, nm varchar(8) NOT NULL)");
        CatalogSnapshot inventory = inventory(Map.of(source, columns("ID", Types.INTEGER, "NM", Types.VARCHAR)));
        MappingSpec missingOnly = fixture.spec(names(source, target, "REQUIRED_MISSING"));

        TableResult stopped = single(run(fixture, missingOnly, MigrationMode.COMMIT, inventory));

        assertThat(stopped.errors()).containsExactly("행 변환 실패(" + source + ", column=nm, row=2):"
                + " ROW_TRANSFORM_FAILED:DOMAIN_VIOLATION(LENGTH_EXCEEDED) — 격리하지 않음(NOT_APPROVED), " + STOPPED);
        assertThat(String.join("\n", stopped.errors())).as("쓰기 단계까지 가지 않는다")
                .doesNotContain("ATOMIC_WRITE_FAILED", "ninechars");
        assertThat(count(fixture, target)).isZero();

        Fixture approved = fixture.withRun("run_" + UUID.randomUUID());
        MappingSpec both = approved.spec(names(source, target, "LENGTH_EXCEEDED", "REQUIRED_MISSING"));
        List<TableResult> results = run(approved, both, MigrationMode.COMMIT, inventory);

        assertThat(single(results).errors()).isEmpty();
        assertThat(single(results).written()).isEqualTo(1);
        assertThat(single(results).isolations()).containsExactly(
                new Isolation("N1", "nm", "LENGTH_EXCEEDED", 1, List.of(2L)),
                new Isolation("N1", "nm", "REQUIRED_MISSING", 1, List.of(3L)));
        MigrationReport report = verifier.verify(both, results, approved.target());
        assertThat(report.ok()).as(report.toSummary()).isTrue();
    }

    @Test
    void aTextValueTypedAsDecimalIsGuardedInATargetGeneratedTableInsteadOfBeingRoundedSilently() throws Exception {
        Fixture fixture = fixture("precision");
        String source = fixture.sourceTable("ITEM");
        String target = fixture.targetTable("item");
        fixture.source().execute("CREATE TABLE " + source + " (CODE varchar(10) PRIMARY KEY, AMT varchar(20))");
        fixture.source().update("INSERT INTO " + source + " VALUES ('A', '12.34'), ('B', '123.456')");
        fixture.target().execute("CREATE TABLE " + target + " (item_id bigint GENERATED BY DEFAULT AS IDENTITY"
                + " PRIMARY KEY, code varchar(20), amt numeric(5,2))");
        MappingSpec spec = fixture.spec(new TableMapping(source, target, null, null, List.of("CODE"), null, List.of(
                plain("CODE", "code"),
                new ColumnMapping("AMT", "amt", null, "decimal", null, null, null)), null,
                new IdentityStrategy(TargetIdentityPolicy.TARGET_GENERATED,
                        List.of(component("CODE", IdentityValueType.TEXT)),
                        List.of(component("item_id", IdentityValueType.SIGNED_INTEGER))), List.of()));
        CatalogSnapshot inventory = inventory(Map.of(source, columns("CODE", Types.VARCHAR, "AMT", Types.VARCHAR)));

        assertThat(standardErrors(fixture, spec, inventory))
                .as("문자 소스의 decimal 정밀도는 정적으로 막지 않고 행 가드로 옮긴다").isEmpty();
        assertThat(guards(fixture, spec, inventory)).containsExactly(Map.entry(source,
                Map.of("amt", new TargetValueGuard.Limit(null, 3, 2, null, false))));

        TableResult stopped = single(run(fixture, spec, MigrationMode.COMMIT, inventory));

        assertThat(stopped.errors()).containsExactly("행 변환 실패(" + source + ", column=amt, row=2):"
                + " ROW_TRANSFORM_FAILED:DOMAIN_VIOLATION(PRECISION_EXCEEDED) — " + STOPPED);
        assertThat(count(fixture, target)).isZero();

        // 가드가 없으면 PostgreSQL 은 소수 셋째 자리를 오류 없이 반올림한다 — 행 가드를 두는 이유다.
        Fixture unguarded = fixture.withRun("run_" + UUID.randomUUID());
        List<TableResult> rounded = execute(unguarded, unguarded.spec(spec.tables().getFirst()), MigrationMode.COMMIT,
                Map.of());
        assertThat(single(rounded).errors()).isEmpty();
        assertThat(fixture.target().queryForObject("SELECT amt::text FROM " + target + " WHERE code = 'B'",
                String.class)).isEqualTo("123.46");
    }

    /**
     * [ADR-0029 L3c] 값 한계 가드는 매핑 라벨({@code source#id})로 넘겨진다. 한 소스를 나눈 두 매핑이 서로 다른 컬럼을
     * 가드받아도 각자의 가드를 쓴다 — 소스 이름으로 묶으면 뒤 매핑의 가드가 앞 매핑의 것을 덮거나 실행기가 찾지 못해, 앞
     * 매핑의 numeric 값이 조용히 반올림된다.
     */
    @Test
    void eachSplitMappingUsesTheGuardsOfItsOwnLabelSoAnOverPreciseValueStopsInsteadOfBeingRounded() throws Exception {
        Fixture fixture = fixture("split_guard");
        String source = fixture.sourceTable("ITEM");
        String mainTarget = fixture.targetTable("item");
        String extTarget = fixture.targetTable("item_ext");
        fixture.source().execute("CREATE TABLE " + source + " (CODE varchar(10) PRIMARY KEY, AMT varchar(20),"
                + " FEE varchar(20))");
        fixture.source().update("INSERT INTO " + source + " VALUES ('A', '12.34', '1.5'), ('B', '123.456', '2.25')");
        fixture.target().execute("CREATE TABLE " + mainTarget + " (code varchar(20) PRIMARY KEY, amt numeric(5,2))");
        fixture.target().execute("CREATE TABLE " + extTarget + " (code varchar(20) PRIMARY KEY, fee numeric(5,2))");
        TableMapping main = new TableMapping(source, mainTarget, null, "CODE", List.of(), "code", List.of(
                plain("CODE", "code"), new ColumnMapping("AMT", "amt", null, "decimal", null, null, null)), null, null,
                List.of(), "main");
        TableMapping extension = new TableMapping(source, extTarget, null, "CODE", List.of(), "code", List.of(
                plain("CODE", "code"), new ColumnMapping("FEE", "fee", null, "decimal", null, null, null)), null, null,
                List.of(), "ext");
        MappingSpec spec = fixture.spec(main, extension);
        CatalogSnapshot inventory = inventory(Map.of(source, columns("CODE", Types.VARCHAR, "AMT", Types.VARCHAR,
                "FEE", Types.VARCHAR)));

        assertThat(guards(fixture, spec, inventory)).containsExactly(
                Map.entry(source + "#main", Map.of("amt", new TargetValueGuard.Limit(null, 3, 2, null, false))),
                Map.entry(source + "#ext", Map.of("fee", new TargetValueGuard.Limit(null, 3, 2, null, false))));

        List<TableResult> results = run(fixture, spec, MigrationMode.COMMIT, inventory);

        assertThat(results).filteredOn(result -> "main".equals(result.mappingId())).singleElement()
                .satisfies(result -> assertThat(result.errors()).containsExactly("행 변환 실패(" + source
                        + "#main, column=amt, row=2): ROW_TRANSFORM_FAILED:DOMAIN_VIOLATION(PRECISION_EXCEEDED) — "
                        + STOPPED));
        assertThat(count(fixture, mainTarget)).as("반올림해 쓰지 않는다").isZero();
    }

    @Test
    void theSequenceMovesPastTheKeyOfAnIsolatedRowForPreserveAndRemap() throws Exception {
        for (TargetIdentityPolicy policy : List.of(TargetIdentityPolicy.PRESERVE, TargetIdentityPolicy.REMAP)) {
            Fixture fixture = fixture("sequence_" + policy.name().toLowerCase(Locale.ROOT));
            String source = fixture.sourceTable("DOC");
            String target = fixture.targetTable("doc");
            fixture.source().execute("CREATE TABLE " + source + " (ID int PRIMARY KEY, END_YMD varchar(10))");
            fixture.source().update("INSERT INTO " + source + " VALUES (1, '20240131'), (2, '20240131'),"
                    + " (3, '20240131'), (4, '20240131'), (5, '" + PLACEHOLDER + "')");
            fixture.target().execute("CREATE TABLE " + target + " (id bigint GENERATED BY DEFAULT AS IDENTITY"
                    + " PRIMARY KEY, end_ymd varchar(8))");
            List<ColumnMapping> columns = new ArrayList<>();
            if (policy == TargetIdentityPolicy.REMAP) {
                columns.add(plain("ID", "id"));
            }
            columns.add(isolated("END_YMD", "end_ymd", "ymd8", "S1", 1, "PLACEHOLDER_DATE"));
            MappingSpec spec = fixture.spec(new TableMapping(source, target, null, null, List.of("ID"), null, columns,
                    null, new IdentityStrategy(policy, List.of(component("ID", IdentityValueType.SIGNED_INTEGER)),
                    List.of(component("id", IdentityValueType.SIGNED_INTEGER))), List.of()));
            CatalogSnapshot inventory = inventory(Map.of(source, columns("ID", Types.INTEGER, "END_YMD", Types.VARCHAR)));

            TableResult loaded = single(run(fixture, spec, MigrationMode.COMMIT, inventory));

            assertThat(loaded.errors()).as(policy.name()).isEmpty();
            assertThat(loaded.written()).isEqualTo(4);
            assertThat(loaded.isolations()).containsExactly(new Isolation("S1", "end_ymd", "PLACEHOLDER_DATE", 1,
                    List.of(5L)));
            assertThat(loaded.sequenceResets()).singleElement()
                    .satisfies(reset -> assertThat(reset.action()).isEqualTo(Action.ADVANCED));
            assertThat(fixture.target().queryForObject("INSERT INTO " + target + " (end_ymd) VALUES ('20240201')"
                    + " RETURNING id", Long.class))
                    .as(policy.name() + ": 온라인 앱은 격리된 번호(5)를 다시 내주지 않는다").isEqualTo(6L);
        }
    }

    @Test
    void anApprovedViolationDoesNotHideAMissingTargetIdentityOnTheSameRow() throws Exception {
        Fixture fixture = fixture("identity");
        String source = fixture.sourceTable("ITEM");
        String target = fixture.targetTable("item");
        fixture.source().execute("CREATE TABLE " + source + " (ID int PRIMARY KEY, CD varchar(10), END_YMD varchar(10))");
        fixture.source().update("INSERT INTO " + source + " VALUES (1, 'A', '20240131'), (2, NULL, '" + PLACEHOLDER
                + "')");
        fixture.target().execute("CREATE TABLE " + target + " (item_id varchar(20) PRIMARY KEY, end_ymd varchar(8))");
        MappingSpec spec = fixture.spec(new TableMapping(source, target, null, "ID", null, List.of(
                isolated("END_YMD", "end_ymd", "ymd8", "U4", 5, "PLACEHOLDER_DATE")),
                new IdStrategy("item_id", "ITM", "CD")));
        CatalogSnapshot inventory = inventory(Map.of(source, columns("ID", Types.INTEGER, "CD", Types.VARCHAR,
                "END_YMD", Types.VARCHAR)));
        String stop = "행 변환 실패(" + source + ", column=item_id, row=2): ROW_TRANSFORM_FAILED:IDENTITY_FAILED"
                + " — 격리하지 않음(NOT_DECLARED), " + STOPPED;

        TableResult predicted = single(run(fixture, spec, MigrationMode.DRY_RUN, inventory));
        TableResult stopped = single(run(fixture, spec, MigrationMode.COMMIT, inventory));

        assertThat(predicted.errors()).as("dry-run 도 같은 행에서 멈춘다").containsExactly(stop);
        assertThat(stopped.errors()).as("소스 키가 NULL 이라 채번하지 못한 identity 가 승인 위반 뒤에 숨지 않는다")
                .containsExactly(stop);
        assertThat(stopped.isolated()).isZero();
        assertThat(count(fixture, target)).isZero();
    }

    @Test
    void anIsolatedRowWhoseUnknownKeyIsTheSequenceColumnStopsInsteadOfLeavingTheNumberToTheOnlineApp()
            throws Exception {
        Fixture fixture = fixture("seqkey");
        String source = fixture.sourceTable("ITEM");
        String target = fixture.targetTable("item");
        fixture.source().execute("CREATE TABLE " + source + " (ID int PRIMARY KEY, SN varchar(10), NM varchar(10))");
        // 마지막 행의 키는 12 를 뜻했지만 형식이 틀렸다 — 격리하면 그 번호를 모른 채 시퀀스가 2 에 멈춘다.
        fixture.source().update("INSERT INTO " + source + " VALUES (1, '1', 'a'), (2, '2', 'b'), (3, '0012x', 'c')");
        fixture.target().execute("CREATE TABLE " + target + " (item_sn bigint GENERATED BY DEFAULT AS IDENTITY"
                + " PRIMARY KEY, nm varchar(10))");
        MappingSpec spec = fixture.spec(new TableMapping(source, target, null, "ID", "item_sn", List.of(
                new ColumnMapping("SN", "item_sn", null, "bigint", null, null, null, null, List.of(),
                        new Isolate("K1", 1L, List.of("FORMAT"))),
                plain("NM", "nm")), null));
        CatalogSnapshot inventory = inventory(Map.of(source, columns("ID", Types.INTEGER, "SN", Types.VARCHAR,
                "NM", Types.VARCHAR)));

        List<TableResult> results = run(fixture, spec, MigrationMode.COMMIT, inventory);
        TableResult stopped = single(results);

        assertThat(stopped.errors()).containsExactly("행 변환 실패(" + source + ", column=item_sn, row=3):"
                + " ISOLATION_KEY_UNKNOWN — 격리 행이 시퀀스 컬럼에 쓸 키를 몰라 재설정 목표를 정할 수 없어"
                + " 이 chunk 는 기록하지 않고 적재를 멈췄습니다");
        assertThat(String.join("\n", stopped.errors())).doesNotContain("0012x");
        assertThat(count(fixture, target)).as("멈춘 chunk 는 한 행도 쓰지 않는다").isZero();
        assertThat(verifier.verify(spec, results, fixture.target()).ok()).isFalse();
    }

    @Test
    void isolateOnAParentMappingOrWithoutOrderKeysIsRefusedBeforeAnyRowIsRead() throws Exception {
        Fixture fixture = fixture("refused");
        String parentSource = fixture.sourceTable("PARENT");
        String childSource = fixture.sourceTable("CHILD");
        String parentTarget = fixture.targetTable("parent");
        String childTarget = fixture.targetTable("child");
        fixture.target().execute("CREATE TABLE " + parentTarget + " (p_no bigint PRIMARY KEY, nm varchar(8))");
        fixture.target().execute("CREATE TABLE " + childTarget + " (c_no bigint PRIMARY KEY, p_no bigint,"
                + " end_ymd varchar(8))");
        MappingSpec parentIsolates = fixture.spec(
                parent(parentSource, parentTarget, List.of(isolated("NM", "nm", null, "P1", 1, "LENGTH_EXCEEDED"))),
                child(childSource, childTarget, parentSource));
        TableMapping unordered = new TableMapping(childSource, childTarget, null, List.of(
                plain("C_NO", "c_no"), isolated("END_YMD", "end_ymd", "ymd8", "U4", 1, "PLACEHOLDER_DATE")), null);
        MappingSpec withoutOrder = fixture.spec(unordered);
        MappingValidator validator = new MappingValidator(transformers, "no-catalog-in-this-test.json");

        assertThat(validator.validate(parentIsolates).errors())
                .contains(parentSource + ": 다른 매핑이 부모로 참조하는 매핑에는 isolate 를 둘 수 없습니다");
        assertThat(validator.validate(withoutOrder).errors()).contains(childSource + ": isolate 가 있는 표에는"
                + " orderBy·orderByKeys 가 필요합니다 — 순서 없이 읽으면 격리 행의 순번이 정해지지 않습니다");
        assertThatThrownBy(() -> execute(fixture, parentIsolates, MigrationMode.COMMIT, Map.of()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage(parentSource + ": 다른 매핑이 부모로 참조하는 매핑에는 isolate 를 둘 수 없습니다");
        assertThatThrownBy(() -> execute(fixture, withoutOrder, MigrationMode.DRY_RUN, Map.of()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage(childSource + ": isolate 가 있는 표에는 orderBy·orderByKeys 가 필요합니다");

        // 값 한계 가드 없이 격리하면 쓰기 단계가 막을 위반을 셀 수 없다 — 승인 workflow 가 가드를 넘기지 않으면 시작하지 않는다.
        MappingSpec ordered = fixture.spec(users(childSource, childTarget, 1));
        assertThatThrownBy(() -> execute(fixture, ordered, MigrationMode.COMMIT, Map.of()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage(childSource + ".end_ymd: isolate 컬럼의 값 한계 가드가 없습니다 — 승인 workflow(load)가"
                        + " 대상 계약으로 정한 가드와 함께 실행하세요");
        MappingSpec nullified = fixture.spec(new TableMapping(childSource, childTarget, null, "C_NO", "c_no", List.of(
                plain("C_NO", "c_no"),
                new ColumnMapping("END_YMD", "end_ymd", "ymd8", null, null, null, null, null,
                        List.of(new Nullify(DomainViolation.PLACEHOLDER_DATE, 5L)),
                        new Isolate("U4", 1L, List.of("PLACEHOLDER_DATE")))), null));
        assertThatThrownBy(() -> execute(fixture, nullified, MigrationMode.COMMIT, Map.of()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage(childSource + ".end_ymd: nullify 가 NULL 로 바꾸는 위반은 isolate 에 둘 수 없습니다");
        assertThat(count(fixture, parentTarget) + count(fixture, childTarget)).as("행을 읽기 전에 멈춘다").isZero();
    }

    private List<TableResult> run(Fixture fixture, MappingSpec spec, MigrationMode mode, CatalogSnapshot inventory)
            throws Exception {
        return execute(fixture, spec, mode, guards(fixture, spec, inventory));
    }

    private List<TableResult> execute(Fixture fixture, MappingSpec spec, MigrationMode mode,
                                      Map<String, Map<String, TargetValueGuard.Limit>> guards) {
        // [ADR-0029 L3e] isolate 가 있는 COMMIT 은 격리 키를 반출할 보관 디렉터리 없이 시작하지 않는다.
        ArchiveRun archives;
        try {
            archives = mode == MigrationMode.COMMIT
                    ? ArchiveRun.writing(archiveRoot.toRealPath(), "b".repeat(64), "c".repeat(64))
                    : ArchiveRun.counting();
        } catch (java.io.IOException unreadable) {
            throw new IllegalStateException(unreadable);
        }
        return executor.execute(spec, mode, fixture.source(), mode == MigrationMode.COMMIT ? fixture.target() : null,
                SourceReadSessionPolicy.repeatableRead(EvidenceLevel.UNVERIFIED, "approved exception test"), true,
                guards, archives);
    }

    /** 승인 workflow 와 같은 길 — live 대상 계약으로 값 한계 가드를 정한다. */
    private Map<String, Map<String, TargetValueGuard.Limit>> guards(Fixture fixture, MappingSpec spec,
                                                                    CatalogSnapshot inventory) throws Exception {
        try (Connection connection = dataSource(fixture.targetConfig()).getConnection()) {
            TargetSchemaFingerprint target = new PostgresTargetSchemaFingerprinter()
                    .fingerprintBound(connection, spec, Set.of("public"));
            return new MappingValidator(transformers, "unused-db-columns.json").rowGuards(spec, target, inventory);
        }
    }

    private List<String> standardErrors(Fixture fixture, MappingSpec spec, CatalogSnapshot inventory) throws Exception {
        try (Connection connection = dataSource(fixture.targetConfig()).getConnection()) {
            TargetSchemaFingerprint target = new PostgresTargetSchemaFingerprinter()
                    .fingerprintBound(connection, spec, Set.of("public"));
            return new TargetStandardValidator(transformers::isBuiltin).validate(spec, target, inventory).errors();
        }
    }

    /** 1250행 중 ID 10·600·1201 의 종료일이 자리표시다 — 500행 chunk 셋에 하나씩 걸친다. */
    private static String seedUsers(Fixture fixture) {
        String source = fixture.sourceTable("USER");
        fixture.source().execute("CREATE TABLE " + source + " (ID int PRIMARY KEY, END_YMD varchar(10),"
                + " NM varchar(20))");
        fixture.source().update("INSERT INTO " + source + " (ID, END_YMD, NM) SELECT X, CASE WHEN X IN (10, 600, 1201)"
                + " THEN '" + PLACEHOLDER + "' ELSE '20240131' END, CONCAT('n', X) FROM SYSTEM_RANGE(1, 1250)");
        return source;
    }

    private static TableMapping users(String source, String target, long maxRows) {
        return new TableMapping(source, target, null, "ID", "id", List.of(
                plain("ID", "id"),
                isolated("END_YMD", "end_ymd", "ymd8", "U4", maxRows, "PLACEHOLDER_DATE"),
                plain("NM", "nm")), null);
    }

    private static CatalogSnapshot usersInventory(String source) {
        return inventory(Map.of(source, columns("ID", Types.INTEGER, "END_YMD", Types.VARCHAR, "NM", Types.VARCHAR)));
    }

    private static TableMapping names(String source, String target, String... violations) {
        return new TableMapping(source, target, null, "ID", "id", List.of(
                plain("ID", "id"), isolated("NM", "nm", null, "N1", 2, violations)), null);
    }

    private static TableMapping parent(String source, String target, List<ColumnMapping> columns) {
        return new TableMapping(source, target, null, null, List.of("P_NO"), null, columns, null,
                new IdentityStrategy(TargetIdentityPolicy.PRESERVE,
                        List.of(component("P_NO", IdentityValueType.SIGNED_INTEGER)),
                        List.of(component("p_no", IdentityValueType.SIGNED_INTEGER)),
                        Map.of("p_no", IdentityStrategy.NO_SEQUENCE)), List.of());
    }

    private static TableMapping child(String source, String target, String parentSource) {
        return new TableMapping(source, target, null, null, List.of("C_NO"), null,
                List.of(isolated("END_YMD", "end_ymd", "ymd8", "U9", 5, "PLACEHOLDER_DATE")), null,
                new IdentityStrategy(TargetIdentityPolicy.PRESERVE,
                        List.of(component("C_NO", IdentityValueType.SIGNED_INTEGER)),
                        List.of(component("c_no", IdentityValueType.SIGNED_INTEGER)),
                        Map.of("c_no", IdentityStrategy.NO_SEQUENCE)),
                List.of(new CompositeForeignKey(parentSource,
                        List.of(component("P_NO", IdentityValueType.SIGNED_INTEGER)),
                        List.of(component("p_no", IdentityValueType.SIGNED_INTEGER)))));
    }

    private static ColumnMapping plain(String source, String target) {
        return new ColumnMapping(source, target, null, null, null, null, null);
    }

    private static ColumnMapping isolated(String source, String target, String transform, String ledgerEntry,
                                          long maxRows, String... violations) {
        return new ColumnMapping(source, target, transform, null, null, null, null, null, List.of(),
                new Isolate(ledgerEntry, maxRows, List.of(violations)));
    }

    private static IdentityComponentSpec component(String column, IdentityValueType type) {
        return new IdentityComponentSpec(column, type);
    }

    private static TableResult single(List<TableResult> results) {
        assertThat(results).hasSize(1);
        return results.getFirst();
    }

    private static long count(Fixture fixture, String table) {
        Long rows = fixture.target().queryForObject("SELECT count(*) FROM " + table, Long.class);
        return rows == null ? 0L : rows;
    }

    private static Map<String, Integer> columns(Object... pairs) {
        Map<String, Integer> columns = new LinkedHashMap<>();
        for (int i = 0; i < pairs.length; i += 2) {
            columns.put((String) pairs[i], (Integer) pairs[i + 1]);
        }
        return columns;
    }

    /** H2 소스 표의 승인 inventory — 검증기가 읽는 jdbcType 선언만 둔다. */
    private static CatalogSnapshot inventory(Map<String, Map<String, Integer>> tables) {
        List<CatalogObject> objects = new ArrayList<>();
        for (Map.Entry<String, Map<String, Integer>> table : tables.entrySet()) {
            objects.add(new CatalogObject(ObjectKind.TABLE, "db", "PUBLIC", table.getKey(), false, null, null,
                    List.of(), Map.of()));
            for (Map.Entry<String, Integer> column : table.getValue().entrySet()) {
                objects.add(new CatalogObject(ObjectKind.COLUMN, "db", "PUBLIC",
                        table.getKey() + "." + column.getKey(), false, null, null,
                        List.of(new ObjectReference(ObjectKind.TABLE, "db", "PUBLIC", table.getKey())),
                        Map.of("parentTable", table.getKey(), "originalName", column.getKey(),
                                "jdbcType", Integer.toString(column.getValue()), "size", "19", "scale", "0")));
            }
        }
        return new CatalogSnapshot(CatalogSnapshot.CURRENT_SCHEMA_VERSION, Instant.parse("2026-10-15T00:00:00Z"),
                new CatalogSnapshot.DatabaseInfo("H2", "2", "driver", "1"),
                new CatalogSnapshot.EnvironmentInfo("db", "PUBLIC", "UTF-8", "C", "UTC"),
                SnapshotCapability.unknown(), objects, List.of());
    }

    private static MigrationPlan plan() {
        PlanCoverage coverage = new PlanCoverage(0, 0, 0, 0);
        return new MigrationPlan(MigrationPlan.CURRENT_SCHEMA_VERSION, "b".repeat(64), "c".repeat(64),
                "d".repeat(64), "e".repeat(64), "PostgreSQL 17", List.of(), coverage,
                new MigrationPlanValidator().validate(List.of(), coverage));
    }

    private static Fixture fixture(String prefix) {
        String suffix = prefix + "_" + SEQUENCE.incrementAndGet();
        DbConfig source = new DbConfig("jdbc:h2:mem:iso_" + suffix + ";DB_CLOSE_DELAY=-1", "sa", "", "org.h2.Driver");
        DbConfig target = new DbConfig(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword(),
                POSTGRES.getDriverClassName(), "disposable-postgres-target");
        return new Fixture(source, target, suffix, "run_" + UUID.randomUUID());
    }

    private static DriverManagerDataSource dataSource(DbConfig config) {
        DriverManagerDataSource dataSource = new DriverManagerDataSource(
                config.url(), config.username(), config.password());
        dataSource.setDriverClassName(config.driver());
        return dataSource;
    }

    private record Fixture(DbConfig sourceConfig, DbConfig targetConfig, String suffix, String runId) {

        JdbcTemplate source() {
            return new JdbcTemplate(dataSource(sourceConfig));
        }

        JdbcTemplate target() {
            return new JdbcTemplate(dataSource(targetConfig));
        }

        String sourceTable(String name) {
            return "LEGACY_" + name + "_" + suffix.toUpperCase(Locale.ROOT);
        }

        String targetTable(String name) {
            return "public.tb_" + name + "_" + suffix;
        }

        Fixture withRun(String run) {
            return new Fixture(sourceConfig, targetConfig, suffix, run);
        }

        MappingSpec spec(TableMapping... tables) {
            return new MappingSpec(sourceConfig, targetConfig, List.of(tables), Map.of(),
                    new RunContext(runId, sourceConfig.url()));
        }
    }
}
