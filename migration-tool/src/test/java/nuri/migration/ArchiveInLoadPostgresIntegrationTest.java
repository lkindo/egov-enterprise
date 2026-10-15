package nuri.migration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import nuri.migration.adapter.EvidenceLevel;
import nuri.migration.adapter.SourceReadSessionPolicy;
import nuri.migration.archive.ArchiveFileWriter.PersonalShapes;
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
import nuri.migration.model.MappingSpec.ArchiveDump;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.DbConfig;
import nuri.migration.model.MappingSpec.Isolate;
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
import nuri.migration.verify.MigrationReport;
import nuri.migration.verify.MigrationVerifier;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Types;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 같은 원천 읽기 세션의 보관 덤프와 격리 키 반출(ADR-0029 L3e)을 H2 소스 → 실제 PostgreSQL 대상으로 본다.
 *
 * <p>매핑된 표는 읽은 행을 모두(재개로 건너뛴 행·격리한 행 포함) 덤프하고, 덤프만 하는 표는 같은 세션에서 매핑된 표들
 * 다음에 읽는다. 덤프 행 수 = 조회 수를 검증이 대조하고, 실행 증거에는 파일 이름·행 수·SHA-256·개인정보 모양 수만 남는다
 * — 값·키·디렉터리 경로는 남지 않는다. 주민등록번호 모양 값은 덤프에 그대로 두고 컬럼별 수만 보고한다(DEC-OPS-321 U2).</p>
 */
@Testcontainers
class ArchiveInLoadPostgresIntegrationTest {

    @Container
    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:17-alpine");

    private static final AtomicInteger SEQUENCE = new AtomicInteger();
    private static final String PLAN = "b".repeat(64);
    private static final String MAPPING = "c".repeat(64);
    private static final String PLACEHOLDER = "99991231";
    private static final String RRN = "9101011234567";
    private static final String EMAIL = "kim@example.org";
    private static final String PHONE = "010-1234-5678";
    private static final String USER_DUMP = "legacy_user_20311231";
    private static final String LOG_DUMP = "legacy_log_20291231";
    private static final ObjectMapper JSON = new ObjectMapper();

    private final TransformerRegistry transformers = new TransformerRegistry();
    private final EtlExecutor executor = new EtlExecutor(new SourceIntrospector(), transformers);
    private final MigrationVerifier verifier = new MigrationVerifier();

    @TempDir
    Path temp;

    @Test
    void aCommitDumpsEveryReadRowAndTheDumpOnlyTableInTheSameSessionAndExportsIsolatedKeys() throws Exception {
        Fixture fixture = fixture("dump");
        Path dumps = dumpDirectory();
        MappingSpec spec = archivedSpec(fixture, 3);
        CatalogSnapshot inventory = inventory(fixture);
        ArchiveRun archives = ArchiveRun.writing(dumps, PLAN, MAPPING);
        AtomicInteger connections = new AtomicInteger();

        List<TableResult> results = executor.execute(spec, MigrationMode.COMMIT,
                counting(fixture.sourceConfig(), connections), fixture.target(), policy(), true,
                guards(fixture, spec, inventory), archives);
        ArchiveOutcome outcome = archives.outcome();
        TableResult users = single(results);
        assertThat(connections.get()).as("매핑된 표와 덤프만 하는 표를 원천 연결 하나(한 읽기 세션)로 읽는다")
                .isEqualTo(1);

        // 증거에는 값·키·디렉터리 경로가 없다 — 덤프 결과가 무엇을 담든 다른 단언보다 먼저 본다.
        assertThat(MigrationExecutionArtifact.encode(plan(), MigrationMode.COMMIT, "PASS",
                Instant.parse("2026-10-15T00:00:00Z"), null, results, outcome))
                .doesNotContain(RRN, EMAIL, PHONE, "memo1", "log1", "n10", dumps.toString(),
                        dumps.toString().replace('\\', '/'), dumps.toString().replace("\\", "\\\\"));
        assertThat(users.errors()).isEmpty();
        assertThat(users.read()).isEqualTo(1250);
        assertThat(users.transformed()).isEqualTo(1247);
        assertThat(users.isolated()).isEqualTo(3);
        assertThat(outcome.errors()).isEmpty();
        assertThat(outcome.dumps()).extracting(ArchiveOutcome.Dumped::id).containsExactly(USER_DUMP, LOG_DUMP);
        ArchiveOutcome.Dumped userDump = outcome.dumps().getFirst();
        ArchiveOutcome.Dumped logDump = outcome.dumps().get(1);
        assertThat(userDump.rows()).as("격리한 행도 읽은 행이라 덤프한다").isEqualTo(1250);
        assertThat(userDump.sourceRows()).isEqualTo(users.read());
        assertThat(userDump.dumpOnly()).isFalse();
        assertThat(logDump.rows()).isEqualTo(30);
        assertThat(logDump.sourceRows()).isEqualTo(30);
        assertThat(logDump.dumpOnly()).as("덤프만 하는 표도 같은 실행이 읽는다").isTrue();
        assertThat(userDump.personalShapes()).as("주민등록번호 모양은 가리지 않고 컬럼별로 센다(U2)").containsExactly(
                Map.entry("ETC1", new PersonalShapes(2, 0, 0)), Map.entry("RMRK2", new PersonalShapes(0, 0, 1)));
        assertThat(logDump.personalShapes()).containsExactly(Map.entry("MEMO", new PersonalShapes(0, 1, 0)));
        assertThat(userDump.keyPersonalShapes()).as("덤프 행마다 실리는 정렬 키 원값도 센다(U2)")
                .containsExactly(Map.entry("ID", new PersonalShapes(0, 0, 0)));
        assertThat(logDump.keyPersonalShapes()).containsExactly(Map.entry("LOG_NO", new PersonalShapes(0, 0, 0)));
        assertThat(outcome.keyExports()).singleElement().satisfies(export -> {
            assertThat(export.source()).isEqualTo(fixture.sourceTable("USER"));
            assertThat(export.rows()).isEqualTo(3);
        });
        try (Stream<Path> files = Files.list(dumps)) {
            assertThat(files.map(path -> path.getFileName().toString()))
                    .as("덤프 둘과 격리 키 하나만 남고 임시 파일은 없다")
                    .containsExactlyInAnyOrder(userDump.fileName(), logDump.fileName(),
                            outcome.keyExports().getFirst().fileName());
        }

        byte[] userBytes = Files.readAllBytes(dumps.resolve(userDump.fileName()));
        assertThat(userDump.bytes()).isEqualTo(userBytes.length);
        assertThat(userDump.sha256()).as("SHA-256 은 nonce 가 든 머리를 포함한 파일 전체다")
                .isEqualTo(HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(userBytes)));
        List<JsonNode> userLines = lines(userBytes);
        JsonNode header = userLines.getFirst();
        assertThat(header.get("format").asText()).isEqualTo("nuri-migration-archive");
        assertThat(header.get("nonce").asText()).matches("[0-9a-f]{32}");
        assertThat(header.get("archiveId").asText()).isEqualTo(USER_DUMP);
        assertThat(header.get("keyColumns").toString()).isEqualTo("[\"ID\"]");
        assertThat(header.get("columns").toString()).isEqualTo("[\"ETC1\",\"RMRK2\"]");
        assertThat(header.get("retainUntil").asText()).isEqualTo("2031-12-31");
        assertThat(header.get("planDigest").asText()).isEqualTo(PLAN);
        assertThat(userLines).hasSize(1251);
        assertThat(userLines.get(10).toString()).as("격리한 ID 10 행도 원시 값으로 덤프한다")
                .isEqualTo("{\"k\":[10],\"v\":{\"ETC1\":\"memo10\",\"RMRK2\":null}}");
        assertThat(userLines.get(7).toString()).as("주민등록번호 모양 값은 덤프에 그대로 둔다(U2)")
                .isEqualTo("{\"k\":[7],\"v\":{\"ETC1\":\"" + RRN + "\",\"RMRK2\":null}}");
        List<JsonNode> logLines = lines(Files.readAllBytes(dumps.resolve(logDump.fileName())));
        assertThat(logLines).hasSize(31);
        assertThat(logLines.get(3).toString()).isEqualTo("{\"k\":[3],\"v\":{\"MEMO\":\"call " + PHONE + "\"}}");

        List<JsonNode> keyLines = lines(Files.readAllBytes(dumps.resolve(outcome.keyExports().getFirst().fileName())));
        assertThat(keyLines.getFirst().get("format").asText()).isEqualTo("nuri-migration-isolated-keys");
        assertThat(keyLines.subList(1, keyLines.size()).stream().map(JsonNode::toString)).containsExactly(
                isolatedKey(10), isolatedKey(600), isolatedKey(1201));

        MigrationReport report = verifier.verify(spec, results, fixture.target(), outcome);
        assertThat(report.ok()).as(report.toSummary()).isTrue();

        String artifact = MigrationExecutionArtifact.encode(plan(), MigrationMode.COMMIT, "PASS",
                Instant.parse("2026-10-15T00:00:00Z"), report, results, outcome);
        assertThat(artifact).contains("\"schemaVersion\":4", "\"file\":\"" + userDump.fileName() + "\"",
                "\"sha256\":\"" + userDump.sha256() + "\"", "\"rows\":1250", "\"retainUntil\":\"2031-12-31\"",
                "{\"column\":\"ETC1\",\"rrn\":2,\"phone\":0,\"email\":0}",
                "\"keyPersonalData\":[{\"column\":\"ID\",\"rrn\":0,\"phone\":0,\"email\":0}]",
                "\"keymapRetention\":{\"retainUntil\":\"2031-12-31\","
                        + "\"duty\":\"keymap 은 덤프의 가장 늦은 retainUntil 까지 보존\"}",
                "\"isolatedKeyExports\":[{\"source\":\"" + fixture.sourceTable("USER") + "\"");
        assertThat(artifact).as("증거에는 값·키·디렉터리 경로가 없다").doesNotContain(RRN, EMAIL, PHONE, "memo1",
                "n10", dumps.toString(), dumps.toString().replace('\\', '/'), dumps.toString().replace("\\", "\\\\"));

        // 덤프 행 수 = 읽은 행 수 = 표의 조회 수를 검증이 대조한다. 반출 행 수 = 격리 수도 같다.
        assertThat(archiveNote(spec, results, fixture, replace(outcome, userDump, 1249, 1250)))
                .isEqualTo("보관 덤프 행(1249) ≠ 읽은 행(1250): " + USER_DUMP);
        assertThat(archiveNote(spec, results, fixture, replace(outcome, userDump, 1249, 1249)))
                .isEqualTo("보관 덤프 행(1249) ≠ 조회(1250): " + USER_DUMP);
        assertThat(archiveNote(spec, results, fixture, new ArchiveOutcome(true, outcome.dumps(), List.of(), List.of())))
                .isEqualTo("격리 키 반출(0) ≠ 격리(3): " + fixture.sourceTable("USER"));
        assertThat(archiveNote(spec, results, fixture,
                new ArchiveOutcome(true, List.of(userDump), outcome.keyExports(), List.of())))
                .isEqualTo("보관 덤프 결과 없음: " + LOG_DUMP);
    }

    @Test
    void aResumedCommitDumpsTheSkippedRowsAgainIntoNewFilesAndKeepsTheEarlierOnes() throws Exception {
        Fixture fixture = fixture("resume");
        Path dumps = dumpDirectory();
        MappingSpec spec = archivedSpec(fixture, 3);
        CatalogSnapshot inventory = inventory(fixture);
        ArchiveRun first = ArchiveRun.writing(dumps, PLAN, MAPPING);
        run(fixture, spec, MigrationMode.COMMIT, inventory, first);
        ArchiveRun second = ArchiveRun.writing(dumps, PLAN, MAPPING);

        List<TableResult> results = run(fixture, spec, MigrationMode.COMMIT, inventory, second);

        TableResult users = single(results);
        assertThat(users.errors()).isEmpty();
        assertThat(users.written()).as("이미 커밋된 행은 다시 쓰지 않는다").isEqualTo(1247);
        ArchiveOutcome.Dumped again = second.outcome().dumps().getFirst();
        assertThat(again.rows()).as("재개로 건너뛴 행도 같은 읽기의 행이라 덤프한다").isEqualTo(1250);
        assertThat(again.fileName()).isNotEqualTo(first.outcome().dumps().getFirst().fileName());
        try (Stream<Path> files = Files.list(dumps)) {
            assertThat(files.count()).as("실행마다 새 파일을 쓰고 이전 파일은 지우지 않는다").isEqualTo(6);
        }
        assertThat(verifier.verify(spec, results, fixture.target(), second.outcome()).ok()).isTrue();
    }

    @Test
    void aStoppedTableKeepsNoDumpAndTheMissingDumpFailsVerification() throws Exception {
        Fixture fixture = fixture("stop");
        Path dumps = dumpDirectory();
        MappingSpec spec = archivedSpec(fixture, 2);
        ArchiveRun archives = ArchiveRun.writing(dumps, PLAN, MAPPING);

        List<TableResult> results = run(fixture, spec, MigrationMode.COMMIT, inventory(fixture), archives);

        assertThat(single(results).errors()).singleElement().asString().contains("ISOLATION_CAP_EXCEEDED");
        try (Stream<Path> files = Files.list(dumps)) {
            assertThat(files).as("멈춘 표의 덤프·격리 키·임시 파일과 읽지 않은 덤프만 하는 표의 파일이 남지 않는다").isEmpty();
        }
        assertThat(archives.outcome().dumps()).isEmpty();
        MigrationReport report = verifier.verify(spec, results, fixture.target(), archives.outcome());
        assertThat(report.ok()).isFalse();
        assertThat(report.tables().getLast().source()).isEqualTo("<archives>");
        assertThat(report.tables().getLast().note()).isEqualTo("보관 덤프 결과 없음: " + USER_DUMP);
    }

    @Test
    void aDryRunCountsTheDumpWithoutWritingAnyFile() throws Exception {
        Fixture fixture = fixture("dry");
        Path dumps = dumpDirectory();
        MappingSpec spec = archivedSpec(fixture, 3);
        ArchiveRun archives = ArchiveRun.counting();

        List<TableResult> results = run(fixture, spec, MigrationMode.DRY_RUN, inventory(fixture), archives);

        assertThat(single(results).isolated()).isEqualTo(3);
        assertThat(archives.outcome().dumps()).extracting(ArchiveOutcome.Dumped::rows).containsExactly(1250L, 30L);
        assertThat(archives.outcome().dumps()).allSatisfy(dump -> assertThat(dump.fileName()).isNull());
        assertThat(archives.outcome().dumps().getFirst().personalShapes())
                .containsEntry("ETC1", new PersonalShapes(2, 0, 0));
        assertThat(archives.outcome().keyExports()).isEmpty();
        try (Stream<Path> files = Files.list(dumps)) {
            assertThat(files).isEmpty();
        }
        MigrationReport report = verifier.verify(spec, results, null, archives.outcome());
        assertThat(report.ok()).as(report.toSummary()).isTrue();
        assertThat(MigrationExecutionArtifact.encode(plan(), MigrationMode.DRY_RUN, "PASS",
                Instant.parse("2026-10-15T00:00:00Z"), report, results, archives.outcome()))
                .contains("\"file\":null", "\"keymapRetention\":null").doesNotContain(RRN);
    }

    @Test
    void aCommitWithoutAnArchiveDirectoryOrWithOnlyArchivesStopsBeforeAnyRowIsRead() throws Exception {
        Fixture fixture = fixture("gate");
        Path dumps = dumpDirectory();
        MappingSpec spec = archivedSpec(fixture, 3);
        MappingSpec isolatesOnly = fixture.spec(List.of(users(fixture, 3)), List.of());
        MappingSpec archivesOnly = fixture.spec(List.of(), spec.archives());
        String needed = "commit 에서 보관 선언(archives)이나 격리(isolate)가 있으면 보관 디렉터리(--archive-dir)가"
                + " 필요합니다 — 덤프·격리 키 없이 적재하지 않습니다";

        assertThatThrownBy(() -> run(fixture, spec, MigrationMode.COMMIT, inventory(fixture), ArchiveRun.counting()))
                .isInstanceOf(IllegalArgumentException.class).hasMessage(needed);
        assertThatThrownBy(() -> run(fixture, isolatesOnly, MigrationMode.COMMIT, inventory(fixture),
                ArchiveRun.counting()))
                .isInstanceOf(IllegalArgumentException.class).hasMessage(needed);
        assertThatThrownBy(() -> run(fixture, spec, MigrationMode.DRY_RUN, inventory(fixture),
                ArchiveRun.writing(dumps, PLAN, MAPPING)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("dry-run 은 보관 파일을 쓰지 않습니다 — 보관 디렉터리는 commit 에서만 씁니다");
        assertThat(new MappingValidator(transformers, "no-catalog-in-this-test.json").validate(archivesOnly).errors())
                .contains("보관(archives)만 있는 mapping 은 실행할 수 없습니다 — 보관은 적재 run 과 같은 읽기 세션에서 씁니다");
        assertThatThrownBy(() -> executor.execute(archivesOnly, MigrationMode.COMMIT, fixture.source(),
                fixture.target(), policy(), true, Map.of(), ArchiveRun.writing(dumps, PLAN, MAPPING)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("보관 선언만 있는 mapping 은 실행할 수 없습니다 — 보관은 적재 run 과 함께 합니다");
        assertThat(count(fixture, fixture.targetTable("user"))).as("행을 읽거나 쓰기 전에 멈춘다").isZero();
        try (Stream<Path> files = Files.list(dumps)) {
            assertThat(files).isEmpty();
        }
    }

    @Test
    void aDumpOnlyTableWhoseSortKeyIsNotUniqueStopsBeforeAnyRowIsWritten() throws Exception {
        Fixture fixture = fixture("dup");
        Path dumps = dumpDirectory();
        MappingSpec spec = archivedSpec(fixture, 3);
        fixture.source().update("INSERT INTO " + fixture.sourceTable("LOG") + " (LOG_NO, MEMO) VALUES (5, 'again')");
        ArchiveRun archives = ArchiveRun.writing(dumps, PLAN, MAPPING);

        List<TableResult> results = run(fixture, spec, MigrationMode.COMMIT, inventory(fixture), archives);

        assertThat(results).isEmpty();
        assertThat(archives.outcome().errors()).containsExactly("보관 덤프 정렬 키 유일성 확인 실패("
                + fixture.sourceTable("LOG") + "): ORDER_TUPLE_UNIQUENESS_UNPROVEN");
        assertThat(count(fixture, fixture.targetTable("user"))).isZero();
        try (Stream<Path> files = Files.list(dumps)) {
            assertThat(files).isEmpty();
        }
        assertThat(verifier.verify(spec, results, fixture.target(), archives.outcome()).ok()).isFalse();
    }

    @Test
    void aNullSortKeyPastTheFirstPageStopsTheRunBeforeAnyRowIsReadOrWritten() throws Exception {
        // NULL 을 뒤로 정렬하는 원천(PostgreSQL·Oracle)에서는 keyset 의 다음 page 조건이 NULL 키 행을 다시 읽지 못한다 —
        //   첫 page 밖이면 덤프·적재에서 조용히 빠지고, 읽은 행으로 센 수끼리 대조하는 검증도 그 손실을 보지 못한다.
        Fixture fixture = fixture("null", ";DEFAULT_NULL_ORDERING=HIGH");
        Path dumps = dumpDirectory();
        MappingSpec spec = archivedSpec(fixture, 3);
        String logs = fixture.sourceTable("LOG");
        fixture.source().update("INSERT INTO " + logs + " (LOG_NO, MEMO) SELECT X, CONCAT('log', X)"
                + " FROM SYSTEM_RANGE(31, 600)");
        fixture.source().update("INSERT INTO " + logs + " (LOG_NO, MEMO) VALUES (NULL, 'last')");
        ArchiveRun archives = ArchiveRun.writing(dumps, PLAN, MAPPING);

        List<TableResult> results = run(fixture, spec, MigrationMode.COMMIT, inventory(fixture), archives);

        assertThat(archives.outcome().errors()).containsExactly("보관 덤프 정렬 키 확인 실패(" + logs + "): ORDER_KEY_NULL");
        assertThat(results).isEmpty();
        assertThat(count(fixture, fixture.targetTable("user"))).as("행을 읽거나 쓰기 전에 멈춘다").isZero();
        try (Stream<Path> files = Files.list(dumps)) {
            assertThat(files).isEmpty();
        }
        assertThat(verifier.verify(spec, results, fixture.target(), archives.outcome()).ok()).isFalse();

        // 매핑된 표도 같다 — 어느 모드든 행을 읽기 전에 멈춘다.
        String keyed = fixture.sourceTable("NK");
        fixture.source().execute("CREATE TABLE " + keyed + " (K int, V varchar(10))");
        fixture.source().update("INSERT INTO " + keyed + " (K, V) SELECT X, CONCAT('v', X) FROM SYSTEM_RANGE(1, 600)");
        fixture.source().update("INSERT INTO " + keyed + " (K, V) VALUES (NULL, 'last')");
        fixture.target().execute("CREATE TABLE " + fixture.targetTable("nk") + " (k bigint PRIMARY KEY, v varchar(10))");
        MappingSpec mapped = fixture.spec(List.of(new TableMapping(keyed, fixture.targetTable("nk"), null, "K", "k",
                List.of(new ColumnMapping("K", "k", null, null, null, null, null),
                        new ColumnMapping("V", "v", null, null, null, null, null)), null)), List.of());
        for (MigrationMode mode : MigrationMode.values()) {
            List<TableResult> stopped = executor.execute(mapped, mode, fixture.source(),
                    mode == MigrationMode.COMMIT ? fixture.target() : null, policy(), true, Map.of(),
                    ArchiveRun.counting());
            assertThat(stopped).as(mode.name()).singleElement().satisfies(result -> {
                assertThat(result.errors()).containsExactly("이관 실패(" + keyed + "): ORDER_KEY_NULL");
                assertThat(result.read()).isZero();
            });
        }
        assertThat(count(fixture, fixture.targetTable("nk"))).isZero();
    }

    /**
     * [ADR-0029 L3c·L3e] 나눈 소스의 보관은 id 를 생략한 매핑의 읽기에 붙는다. 그 매핑에 where 가 없으면 where 로 일부만 읽는
     * 다른 매핑(법인 회원)이 적재한 행까지 덤프가 덮는다 — 덤프 행 = 그 매핑의 조회 = 소스 전체다. 읽는 매핑에만 where 가
     * 있으면 다른 매핑이 적재할 행의 보관 값이 빠지므로 행을 읽기 전에 멈춘다.
     */
    @Test
    void aSplitSourcesDumpCoversEveryRowAnyOfItsMappingsReadAndANarrowerReaderStopsBeforeReading() throws Exception {
        Fixture fixture = fixture("split");
        Path dumps = dumpDirectory();
        String members = fixture.sourceTable("MEMBER");
        fixture.source().execute("CREATE TABLE " + members + " (ID int PRIMARY KEY, KIND varchar(1), NM varchar(20),"
                + " ETC1 varchar(40))");
        fixture.source().update("INSERT INTO " + members + " (ID, KIND, NM, ETC1) SELECT X, CASE WHEN MOD(X, 3) = 0"
                + " THEN 'C' ELSE 'P' END, CONCAT('n', X), CONCAT('memo', X) FROM SYSTEM_RANGE(1, 12)");
        fixture.target().execute("CREATE TABLE " + fixture.targetTable("member")
                + " (id bigint PRIMARY KEY, nm varchar(20))");
        fixture.target().execute("CREATE TABLE " + fixture.targetTable("corp")
                + " (id bigint PRIMARY KEY, kind varchar(1))");
        TableMapping corp = new TableMapping(members, fixture.targetTable("corp"), "KIND = 'C'", "ID", List.of(), "id",
                List.of(new ColumnMapping("ID", "id", null, null, null, null, null),
                        new ColumnMapping("KIND", "kind", null, null, null, null, null)), null, null, List.of(), "corp");
        ArchiveDump dump = new ArchiveDump("legacy_member_20311231", members, null, List.of(), List.of("ETC1"),
                List.of("M9"), "2031-12-31");
        MappingSpec spec = fixture.spec(List.of(corp, members(fixture, null)), List.of(dump));
        CatalogSnapshot inventory = inventoryOf(Map.of(members, Map.of("ID", Types.INTEGER, "KIND", Types.VARCHAR,
                "NM", Types.VARCHAR, "ETC1", Types.VARCHAR)));
        ArchiveRun archives = ArchiveRun.writing(dumps, PLAN, MAPPING);

        List<TableResult> results = run(fixture, spec, MigrationMode.COMMIT, inventory, archives);

        assertThat(results).allSatisfy(result -> assertThat(result.errors()).isEmpty());
        assertThat(results).filteredOn(result -> result.mappingId() == null).singleElement()
                .satisfies(result -> assertThat(result.read()).isEqualTo(12));
        assertThat(results).filteredOn(result -> "corp".equals(result.mappingId())).singleElement()
                .satisfies(result -> assertThat(result.read()).isEqualTo(4));
        ArchiveOutcome.Dumped dumped = archives.outcome().dumps().getFirst();
        assertThat(archives.outcome().dumps()).hasSize(1);
        assertThat(dumped.rows()).as("법인 회원 4행을 포함한 소스 전체").isEqualTo(12);
        List<JsonNode> lines = lines(Files.readAllBytes(dumps.resolve(dumped.fileName())));
        assertThat(lines.subList(1, lines.size()).stream().map(line -> line.get("k").get(0).asInt()))
                .as("다른 매핑이 적재한 3·6·9·12 의 보관 값도 덤프에 있다").containsExactly(1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
                        11, 12);
        assertThat(verifier.verify(spec, results, fixture.target(), archives.outcome()).ok()).isTrue();

        Path narrowedDumps = dumpDirectory();
        MappingSpec narrowed = fixture.spec(List.of(corp, members(fixture, "KIND = 'P'")), List.of(dump));
        assertThatThrownBy(() -> run(fixture, narrowed, MigrationMode.COMMIT, inventory,
                ArchiveRun.writing(narrowedDumps, PLAN, MAPPING)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage(members + ": 분할한 소스의 보관은 읽는 매핑에 where 가 없거나 그 소스의 모든 매핑이 같은 where"
                        + " 를 써야 합니다 — 다른 where 로 적재한 행의 보관 컬럼이 덤프에서 빠집니다");
        try (Stream<Path> files = Files.list(narrowedDumps)) {
            assertThat(files).as("행을 읽기 전에 멈춘다").isEmpty();
        }
    }

    /** 나눈 소스의 id 를 생략한 매핑 — 보관 덤프를 읽는다. */
    private static TableMapping members(Fixture fixture, String where) {
        return new TableMapping(fixture.sourceTable("MEMBER"), fixture.targetTable("member"), where, "ID", List.of(),
                "id", List.of(new ColumnMapping("ID", "id", null, null, null, null, null),
                        new ColumnMapping("NM", "nm", null, null, null, null, null)), null, null, List.of(), null);
    }

    private String archiveNote(MappingSpec spec, List<TableResult> results, Fixture fixture, ArchiveOutcome outcome) {
        MigrationReport report = verifier.verify(spec, results, fixture.target(), outcome);
        assertThat(report.ok()).isFalse();
        return report.tables().getLast().note();
    }

    private static ArchiveOutcome replace(ArchiveOutcome outcome, ArchiveOutcome.Dumped dump, long rows,
                                          long sourceRows) {
        List<ArchiveOutcome.Dumped> dumps = new ArrayList<>(outcome.dumps());
        dumps.set(dumps.indexOf(dump), new ArchiveOutcome.Dumped(dump.id(), dump.source(), dump.dumpOnly(), sourceRows,
                rows, dump.fileName(), dump.bytes(), dump.sha256(), dump.retainUntil(), dump.ledgerEntries(),
                dump.personalShapes()));
        return new ArchiveOutcome(outcome.writesFiles(), dumps, outcome.keyExports(), outcome.errors());
    }

    private static String isolatedKey(int id) {
        return "{\"k\":[" + id + "],\"ordinal\":" + id + ",\"violations\":[{\"ledgerEntry\":\"U4\","
                + "\"column\":\"end_ymd\",\"violation\":\"PLACEHOLDER_DATE\"}]}";
    }

    private static List<JsonNode> lines(byte[] bytes) throws Exception {
        List<JsonNode> lines = new ArrayList<>();
        for (String line : new String(bytes, StandardCharsets.UTF_8).split("\n")) {
            lines.add(JSON.readTree(line));
        }
        return lines;
    }

    private List<TableResult> run(Fixture fixture, MappingSpec spec, MigrationMode mode, CatalogSnapshot inventory,
                                  ArchiveRun archives) throws Exception {
        return executor.execute(spec, mode, fixture.source(), mode == MigrationMode.COMMIT ? fixture.target() : null,
                policy(), true, guards(fixture, spec, inventory), archives);
    }

    private static SourceReadSessionPolicy policy() {
        return SourceReadSessionPolicy.repeatableRead(EvidenceLevel.UNVERIFIED, "archive dump test");
    }

    /** 승인 workflow 와 같은 길 — live 대상 계약으로 값 한계 가드를 정한다. */
    private Map<String, Map<String, TargetValueGuard.Limit>> guards(Fixture fixture, MappingSpec spec,
                                                                    CatalogSnapshot inventory) throws Exception {
        if (spec.tables().isEmpty()) {
            return Map.of();
        }
        try (Connection connection = dataSource(fixture.targetConfig()).getConnection()) {
            TargetSchemaFingerprint target = new PostgresTargetSchemaFingerprinter()
                    .fingerprintBound(connection, spec, Set.of("public"));
            return new MappingValidator(transformers, "unused-db-columns.json").rowGuards(spec, target, inventory);
        }
    }

    /** 덤프 디렉터리 — 이 시험만의 빈 실제 경로다. */
    private Path dumpDirectory() throws Exception {
        return Files.createDirectory(temp.toRealPath().resolve("dumps-" + SEQUENCE.incrementAndGet()));
    }

    /**
     * 사용자 표 1250행(ID 10·600·1201 종료일 자리표시 — 격리, ID 7·700 의 ETC1 주민등록번호 모양, ID 8 의 RMRK2 이메일)과
     * 덤프만 하는 로그 표 30행(LOG_NO 3 의 MEMO 전화번호)을 만들고, 사용자 표의 ETC1·RMRK2 와 로그 표의 MEMO 를 보관한다.
     */
    private static MappingSpec archivedSpec(Fixture fixture, long maxRows) {
        String users = fixture.sourceTable("USER");
        String logs = fixture.sourceTable("LOG");
        fixture.source().execute("CREATE TABLE " + users + " (ID int PRIMARY KEY, END_YMD varchar(10), NM varchar(20),"
                + " ETC1 varchar(40), RMRK2 varchar(40))");
        fixture.source().update("INSERT INTO " + users + " (ID, END_YMD, NM, ETC1, RMRK2) SELECT X,"
                + " CASE WHEN X IN (10, 600, 1201) THEN '" + PLACEHOLDER + "' ELSE '20240131' END, CONCAT('n', X),"
                + " CASE WHEN X IN (7, 700) THEN '" + RRN + "' ELSE CONCAT('memo', X) END,"
                + " CASE WHEN X = 8 THEN '" + EMAIL + "' ELSE NULL END FROM SYSTEM_RANGE(1, 1250)");
        fixture.source().execute("CREATE TABLE " + logs + " (LOG_NO int, MEMO varchar(40))");
        fixture.source().update("INSERT INTO " + logs + " (LOG_NO, MEMO) SELECT X,"
                + " CASE WHEN X = 3 THEN 'call " + PHONE + "' ELSE CONCAT('log', X) END FROM SYSTEM_RANGE(1, 30)");
        fixture.target().execute("CREATE TABLE " + fixture.targetTable("user")
                + " (id bigint PRIMARY KEY, end_ymd varchar(8), nm varchar(20))");
        return fixture.spec(List.of(users(fixture, maxRows)), List.of(
                new ArchiveDump(USER_DUMP, users, null, List.of(), List.of("ETC1", "RMRK2"), List.of("U7", "U8"),
                        "2031-12-31"),
                new ArchiveDump(LOG_DUMP, logs, null, List.of("LOG_NO"), List.of("MEMO"), List.of("L2"),
                        "2029-12-31")));
    }

    private static TableMapping users(Fixture fixture, long maxRows) {
        return new TableMapping(fixture.sourceTable("USER"), fixture.targetTable("user"), null, "ID", "id", List.of(
                new ColumnMapping("ID", "id", null, null, null, null, null),
                new ColumnMapping("END_YMD", "end_ymd", "ymd8", null, null, null, null, null, List.of(),
                        new Isolate("U4", maxRows, List.of("PLACEHOLDER_DATE"))),
                new ColumnMapping("NM", "nm", null, null, null, null, null)), null);
    }

    private static CatalogSnapshot inventory(Fixture fixture) {
        Map<String, Map<String, Integer>> tables = new LinkedHashMap<>();
        tables.put(fixture.sourceTable("USER"), Map.of("ID", Types.INTEGER, "END_YMD", Types.VARCHAR,
                "NM", Types.VARCHAR, "ETC1", Types.VARCHAR, "RMRK2", Types.VARCHAR));
        tables.put(fixture.sourceTable("LOG"), Map.of("LOG_NO", Types.INTEGER, "MEMO", Types.VARCHAR));
        return inventoryOf(tables);
    }

    /** H2 소스 표의 승인 inventory — 검증기가 읽는 jdbcType 선언만 둔다. */
    private static CatalogSnapshot inventoryOf(Map<String, Map<String, Integer>> tables) {
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
        return new MigrationPlan(MigrationPlan.CURRENT_SCHEMA_VERSION, PLAN, MAPPING,
                "d".repeat(64), "e".repeat(64), "PostgreSQL 17", List.of(), coverage,
                new MigrationPlanValidator().validate(List.of(), coverage));
    }

    private static TableResult single(List<TableResult> results) {
        assertThat(results).hasSize(1);
        return results.getFirst();
    }

    private static long count(Fixture fixture, String table) {
        Long rows = fixture.target().queryForObject("SELECT count(*) FROM " + table, Long.class);
        return rows == null ? 0L : rows;
    }

    private static Fixture fixture(String prefix) {
        return fixture(prefix, "");
    }

    /** {@code settings} 는 H2 URL 설정이다(예: NULL 을 뒤로 정렬하는 원천). */
    private static Fixture fixture(String prefix, String settings) {
        String suffix = prefix + "_" + SEQUENCE.incrementAndGet();
        DbConfig source = new DbConfig("jdbc:h2:mem:arc_" + suffix + ";DB_CLOSE_DELAY=-1" + settings, "sa", "",
                "org.h2.Driver");
        DbConfig target = new DbConfig(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword(),
                POSTGRES.getDriverClassName(), "disposable-postgres-target");
        return new Fixture(source, target, suffix, "run_" + UUID.randomUUID());
    }

    /** 원천 연결을 여는 수를 센다 — 한 실행이 읽기 세션 하나만 여는지 본다. */
    private static JdbcTemplate counting(DbConfig config, AtomicInteger connections) {
        DriverManagerDataSource dataSource = new DriverManagerDataSource(
                config.url(), config.username(), config.password()) {
            @Override
            public Connection getConnection() throws SQLException {
                connections.incrementAndGet();
                return super.getConnection();
            }
        };
        dataSource.setDriverClassName(config.driver());
        return new JdbcTemplate(dataSource);
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

        MappingSpec spec(List<TableMapping> tables, List<ArchiveDump> archives) {
            return new MappingSpec(sourceConfig, targetConfig, tables, Map.of(),
                    new RunContext(runId, sourceConfig.url()), null, archives);
        }
    }
}
