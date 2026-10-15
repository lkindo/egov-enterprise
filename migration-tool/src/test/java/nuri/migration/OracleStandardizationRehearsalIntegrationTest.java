package nuri.migration;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLMapper;
import nuri.migration.adapter.EvidenceLevel;
import nuri.migration.adapter.OracleSourceAdapter;
import nuri.migration.adapter.SourceReadSessionPolicy;
import nuri.migration.archive.ArchiveOutcome;
import nuri.migration.archive.ArchiveRun;
import nuri.migration.artifact.CanonicalArtifactDigest;
import nuri.migration.artifact.CatalogSnapshotArtifactCodec;
import nuri.migration.artifact.CollectionArtifactCodec;
import nuri.migration.artifact.MigrationExecutionArtifact;
import nuri.migration.artifact.MigrationPlanArtifactCodec;
import nuri.migration.artifact.SourceDriverEvidence;
import nuri.migration.discovery.CatalogObject;
import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.ObjectKind;
import nuri.migration.domain.DomainViolation;
import nuri.migration.domain.TargetValueGuard;
import nuri.migration.etl.EtlExecutor;
import nuri.migration.etl.EtlExecutor.TableResult;
import nuri.migration.etl.MigrationMode;
import nuri.migration.etl.TargetSequenceSynchronizer.Action;
import nuri.migration.isolate.IsolationTally.Isolation;
import nuri.migration.jdbc.JdbcLobReader;
import nuri.migration.jdbc.SourceJdbcEndpointFactory;
import nuri.migration.model.MappingLoader;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.CodeMap;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.Lookup;
import nuri.migration.model.MappingSpec.LookupCardinality;
import nuri.migration.model.MappingSpec.LookupKey;
import nuri.migration.model.MappingSpec.TableMapping;
import nuri.migration.model.MappingSpec.UnmappedPolicy;
import nuri.migration.plan.DispositionDecision;
import nuri.migration.plan.MigrationPlan;
import nuri.migration.plan.ObjectDisposition;
import nuri.migration.postgres.PostgresReconciliationQueries;
import nuri.migration.postgres.PostgresTargetSchemaFingerprinter;
import nuri.migration.postgres.TargetSchemaFingerprint;
import nuri.migration.profile.SourceProfile;
import nuri.migration.profile.SourceProfile.ColumnProfile;
import nuri.migration.profile.SourceProfile.TableProfile;
import nuri.migration.schema.MigrationSchemaManager;
import nuri.migration.source.SourceIntrospector;
import nuri.migration.suggest.LedgerDraftWriter;
import nuri.migration.suggest.SuggestionReport;
import nuri.migration.suggest.SuggestionReport.ColumnSuggestion;
import nuri.migration.transform.TransformerRegistry;
import nuri.migration.validate.CodeSetPrecheck;
import nuri.migration.validate.MappingValidator;
import nuri.migration.validate.ProductCodeBindings;
import nuri.migration.validate.ledger.LoadCapabilities;
import nuri.migration.validate.ledger.TermLedger;
import nuri.migration.validate.ledger.TermLedger.ApprovedExceptions;
import nuri.migration.validate.ledger.TermLedger.ColumnRef;
import nuri.migration.validate.ledger.TermLedger.Conformance;
import nuri.migration.validate.ledger.TermLedger.Entry;
import nuri.migration.validate.ledger.TermLedger.Load;
import nuri.migration.validate.ledger.TermLedger.NonStandardTarget;
import nuri.migration.validate.ledger.TermLedger.Transition;
import nuri.migration.validate.ledger.TermLedgerLoader;
import nuri.migration.validate.ledger.TermLedgerValidator;
import nuri.migration.verify.ColumnCheck;
import nuri.migration.verify.ColumnReplay;
import nuri.migration.verify.CoverageReason;
import nuri.migration.verify.MigrationReport;
import nuri.migration.verify.MigrationVerifier;
import nuri.migration.verify.ReconciliationEvidence;
import nuri.migration.verify.ReconciliationPlan;
import nuri.migration.verify.ReconciliationPlanner;
import nuri.migration.verify.ReconciliationRun;
import nuri.migration.verify.SourceAggregates;
import nuri.migration.workflow.WorkflowReview;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.sql.Savepoint;
import java.sql.Statement;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Properties;
import java.util.Set;
import java.util.TimeZone;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;

/**
 * Oracle Free 를 원천으로 표준화 이관 전체를 한 번 돌리는 리허설(ADR-0029 L4-B, DEC-OPS-323).
 *
 * <p>한글 코멘트와 더러운 값(자리표시·달력에 없는 날짜·공백·플래그 코드·공백으로 채운 CHAR 코드)이 든 합성 표를
 * discover → profile → term-suggest → 원장 확정(시험이 사람 역할) → mapping-generate → plan·review·validate → 공개 DRY_RUN
 * 으로 지난다. 공개 COMMIT 은 Oracle 이 {@code UNVERIFIED} 라 막히는 것을 보고, 승인 workflow 밑의 엔진으로 COMMIT·verify
 * 한다(기존 vendor 리허설·L3b 시험과 같은 길). 증거 등급은 바꾸지 않는다 — 합성 데이터·Free 이미지는 기관 증거가 아니다.</p>
 *
 * <p>[ADR-0029 L4 O2] 나눈 매핑(대리키 공유)·조회 조인·덤프만 하는 표의 보관 덤프와 load 안 대사(원천 집계·대상 누적·물리 FK
 * 증명·공통코드 허용값)를 같은 Oracle 원천에서 끝까지 돌리는 리허설도 이 클래스에 둔다.</p>
 *
 * <p>표준 출력과 JUnit XML 에는 클래스 이름·null 여부·건수만 남긴다. 값을 대조하는 단언은 다른 행의 키(순번)나 건수만
 * 실패 문구에 싣는다 — 행 값·코멘트 본문·접속 정보를 남기지 않는다.</p>
 */
class OracleStandardizationRehearsalIntegrationTest extends OraclePostgresTestSupport {

    private static final int ROWS = 1300;
    /** 달력에 없는 가입일(20240231) — 원장이 3행까지 격리를 승인한다. 마지막 행이 가장 큰 키다(시퀀스 재설정). */
    private static final List<Long> INVALID_DATES = List.of(10L, 600L, 1300L);
    /** 공백 8자 가입일 — nullify BLANK. */
    private static final List<Long> BLANK_DATES = List.of(7L, 207L, 407L, 807L, 1007L);
    /** 자리표시 가입일(00000000) — 50·150·…·1150 의 12행, nullify PLACEHOLDER_DATE. */
    private static final int PLACEHOLDERS = 12;
    /** 사용 여부 플래그 '1' — codemap 이 Y 로 정한다. */
    private static final List<Long> FLAG_ONE = List.of(3L, 333L, 666L, 999L);
    private static final List<String> COLUMNS = List.of("USER_NO", "USER_NM", "JOIN_YMD", "LAST_LOGIN", "END_DT",
            "USE_AT", "STAT_CD", "DEPT_CD", "PHOTO", "MEMO");
    private static final List<Transition> CONFIRMED = List.of(new Transition("REVIEWED", "검토자", "2026-10-15"),
            new Transition("CONFIRMED", "업무담당", "2026-10-15"));
    private static final List<Transition> IGNORED = List.of(new Transition("REVIEWED", "검토자", "2026-10-15"),
            new Transition("APPROVED_IGNORE", "업무담당", "2026-10-15"));
    private static final List<Transition> ARCHIVED = List.of(new Transition("REVIEWED", "검토자", "2026-10-15"),
            new Transition("ARCHIVE", "업무담당", "2026-10-15"));
    /** O2 직원 표의 행 수 — keyset page(500행) 셋에 걸친다. */
    private static final int EMPLOYEES = 1200;
    /** '' 로 넣은 직원명(MOD 97 = 0) — Oracle 은 NULL 로 저장한다. */
    private static final int EMPTY_NAMES = EMPLOYEES / 97;
    /** 자리표시 가입일(MOD 150 = 75) — nullify PLACEHOLDER_DATE. */
    private static final int O2_PLACEHOLDERS = 8;
    /** 이메일이 없는 직원(MOD 50 = 0). */
    private static final int NO_EMAIL = EMPLOYEES / 50;
    /** 부서 조회에 짝이 없는 키(D999)를 가진 직원 — maxMissing 과 같다. */
    private static final List<Long> UNKNOWN_DEPT = List.of(13L, 1013L);
    /** 덤프만 하는 옛 로그 표의 행 수와 기록 일시의 기준. */
    private static final int OLD_LOGS = 400;
    private static final LocalDateTime LOG_BASE = LocalDateTime.of(2019, 1, 1, 0, 0);
    private static final String RETAIN_UNTIL = "2031-12-31";
    /** 덤프 행 원문의 NUMBER(12,2) 토큰. */
    private static final Pattern AMOUNT_TOKEN = Pattern.compile("\"AMOUNT\":(-?[0-9][0-9.eE+-]*)");
    private static final String STOPPED = "이 chunk 는 기록하지 않고 적재를 멈췄습니다";
    private static final String ADAPTER = "oracle-catalog";
    private static final String ORACLE_DRIVER = "oracle.jdbc.OracleDriver";

    @TempDir
    Path temp;

    private final ObjectMapper json = new ObjectMapper();
    private final CatalogSnapshotArtifactCodec inventories = new CatalogSnapshotArtifactCodec();
    private final MigrationPlanArtifactCodec plans = new MigrationPlanArtifactCodec();
    private final CollectionArtifactCodec collections = new CollectionArtifactCodec();
    private final TransformerRegistry transformers = new TransformerRegistry();
    private final EtlExecutor executor = new EtlExecutor(new SourceIntrospector(), transformers);
    private final MigrationVerifier verifier = new MigrationVerifier();

    /**
     * 대상 표준 사전(V2_128 형태: 동의어·허용값·폐기 여부, 단어·도메인 그룹). 이 시험의 대상 컬럼 가운데 표준 용어가 있는
     * 것은 여섯이고, 나머지(일련번호·부서 코드·LOB)는 용어가 없어 비표준 대상(U1)으로 확정한다.
     */
    @BeforeAll
    static void standardDictionary() {
        JdbcTemplate target = targetJdbc();
        target.execute("CREATE TABLE IF NOT EXISTS public.meta_standard_terms (term_name varchar(255),"
                + " eng_abbr varchar(100), domain_name varchar(100), synonyms text, allowed_values text,"
                + " deprecated_yn varchar(1) NOT NULL DEFAULT 'N')");
        target.execute("CREATE TABLE IF NOT EXISTS public.meta_standard_words (word_name varchar(100),"
                + " eng_abbr varchar(100), rprs_yn varchar(1))");
        target.execute("CREATE TABLE IF NOT EXISTS public.meta_standard_domains (domain_group varchar(100),"
                + " domain_name varchar(100), data_type varchar(50), data_length integer)");
        if (target.queryForObject("SELECT count(*) FROM public.meta_standard_terms", Long.class) == 0) {
            target.update("INSERT INTO public.meta_standard_terms (term_name, eng_abbr, domain_name, synonyms,"
                    + " allowed_values) VALUES ('사용자명', 'USER_NM', '명V100', NULL, NULL),"
                    + " ('가입일자', 'JOIN_YMD', '연월일C8', '가입일', NULL),"
                    + " ('최종로그인일시', 'LAST_LOGIN_DT', '연월일시분초C14', NULL, NULL),"
                    + " ('종료일자', 'END_YMD', '연월일C8', NULL, NULL),"
                    + " ('사용여부', 'USE_YN', '여부C1', NULL, 'Y : 예, N : 아니오'),"
                    + " ('상태코드', 'STAT_CD', '코드C3', NULL, 'A01 : 정상, A02 : 휴면')");
            target.update("INSERT INTO public.meta_standard_domains VALUES ('명칭', '명V100', 'VARCHAR', 100),"
                    + " ('날짜/시간', '연월일C8', 'CHAR', 8), ('날짜/시간', '연월일시분초C14', 'CHAR', 14),"
                    + " ('코드', '여부C1', 'CHAR', 1), ('코드', '코드C3', 'CHAR', 3)");
        }
    }

    /**
     * 수정 R1·R2·R3 이 기대는 드라이버 사실과 R7(읽기 일관성)을 관측한다. 출력은 클래스 이름·null 여부·건수만이다.
     */
    @Test
    void probeRecordsTheDriverFactsTheRehearsalFixesRelyOn() throws Exception {
        String name = "LEG_PROBE_" + suffix();
        String table = owner() + "." + name;
        JdbcTemplate source = sourceJdbc();
        source.execute("CREATE TABLE " + table + " (ID NUMBER(10) PRIMARY KEY, D DATE, T TIMESTAMP(6),"
                + " TZ TIMESTAMP(6) WITH TIME ZONE, LTZ TIMESTAMP(6) WITH LOCAL TIME ZONE, C CHAR(3), NC NCHAR(3))");
        try {
            source.execute("COMMENT ON TABLE " + table + " IS '탐침 표'");
            source.execute("COMMENT ON COLUMN " + table + ".D IS '날짜'");
            source.execute("COMMENT ON COLUMN " + table + ".T IS '일시'");
            source.update("INSERT INTO " + table + " VALUES (1, DATE '2025-01-02',"
                    + " TIMESTAMP '2025-01-02 03:04:05.123456', TIMESTAMP '2025-01-02 03:04:05.123456 +09:00',"
                    + " TIMESTAMP '2025-01-02 03:04:05', 'A', 'B')");
            source.update("INSERT INTO " + table + " VALUES (2, DATE '2025-01-03', TIMESTAMP '2025-01-03 03:04:05',"
                    + " TIMESTAMP '2025-01-03 03:04:05 +09:00', TIMESTAMP '2025-01-03 03:04:05', 'D', 'E')");
            environment();

            // R1 — TIMESTAMP(n) 은 드라이버 고유 클래스로 오고, 같은 도우미가 java.sql.Timestamp 로 읽는다.
            try (Connection connection = ORACLE.createConnection("");
                 Statement statement = connection.createStatement();
                 ResultSet rows = statement.executeQuery("SELECT D, T, TZ, LTZ, C, NC FROM " + table
                         + " ORDER BY ID")) {
                ResultSetMetaData metadata = rows.getMetaData();
                assertThat(rows.next()).isTrue();
                for (int column = 1; column <= metadata.getColumnCount(); column++) {
                    Object raw = rows.getObject(column);
                    Object read = JdbcLobReader.scalar(rows, column);
                    System.out.printf("R1 probe: column=%s jdbcType=%d reported=%s getObject=%s scalar=%s%n",
                            metadata.getColumnName(column), metadata.getColumnType(column),
                            metadata.getColumnClassName(column), raw.getClass().getName(), read.getClass().getName());
                }
                // 단언은 클래스·길이만 비교한다 — 실패 문구에 값이 실리지 않게.
                assertThat(rows.getObject("D").getClass()).isEqualTo(Timestamp.class);
                assertThat(metadata.getColumnClassName(2)).doesNotStartWith("java.");
                assertThat(rows.getObject("T").getClass().getName()).doesNotStartWith("java.");
                assertThat(JdbcLobReader.scalar(rows, 2).getClass()).isEqualTo(Timestamp.class);
                assertThat(JdbcLobReader.scalar(rows, 3).getClass()).as("시간대 있는 값은 그대로 둔다")
                        .isEqualTo(rows.getObject("TZ").getClass());
                assertThat(JdbcLobReader.scalar(rows, 4).getClass()).isEqualTo(rows.getObject("LTZ").getClass());
                boolean fractionalSame = rows.getObject("T").toString()
                        .equals(JdbcLobReader.scalar(rows, 2).toString());
                // R3 — CHAR·NCHAR 은 선언 길이까지 공백으로 채워 온다.
                assertThat(padded(rows.getString("C"))).as("CHAR(3) 는 선언 길이까지 공백으로 채운다").isTrue();
                assertThat(padded(rows.getString("NC"))).as("NCHAR(3) 도 같다").isTrue();
                assertThat(rows.next()).isTrue();
                boolean wholeSame = rows.getObject("T").toString().equals(JdbcLobReader.scalar(rows, 2).toString());
                System.out.printf("R1 probe: toString same as Timestamp — fractional=%s whole=%s; R3 probe: CHAR·NCHAR"
                        + " padded=true%n", fractionalSame, wholeSame);
                // 정렬 경계 읽기를 되돌려도 리허설 경계 시험이 통과하는 이유(일광절약 간격 밖의 fixture)다 — 그 회귀는
                // EtlSourcePagingTest 가 지킨다.
                assertThat(fractionalSame).as("소수 초가 있는 값의 두 표기가 같다").isTrue();
                assertThat(wholeSame).as("정수 초 값의 두 표기가 같다").isTrue();
            }

            // R2 — 드라이버 기본 설정은 코멘트(REMARKS)를 주지 않고, 사전 뷰는 준다.
            int remarks = 0;
            int columns = 0;
            try (Connection connection = ORACLE.createConnection("")) {
                try (ResultSet tables = connection.getMetaData()
                        .getTables(null, owner(), name, new String[] {"TABLE"})) {
                    while (tables.next()) {
                        remarks += tables.getString("REMARKS") == null ? 0 : 1;
                    }
                }
                try (ResultSet described = connection.getMetaData().getColumns(null, owner(), name, null)) {
                    while (described.next()) {
                        columns++;
                        remarks += described.getString("REMARKS") == null ? 0 : 1;
                    }
                }
            }
            Long dictionary = source.queryForObject("SELECT (SELECT COUNT(*) FROM ALL_TAB_COMMENTS WHERE OWNER = ?"
                    + " AND TABLE_NAME = ? AND COMMENTS IS NOT NULL) + (SELECT COUNT(*) FROM ALL_COL_COMMENTS"
                    + " WHERE OWNER = ? AND TABLE_NAME = ? AND COMMENTS IS NOT NULL) FROM DUAL", Long.class,
                    owner(), name, owner(), name);
            System.out.printf("R2 probe: driver REMARKS %d of %d objects; dictionary comments %d%n",
                    remarks, columns + 1, dictionary);
            assertThat(columns).isEqualTo(7);
            assertThat(remarks).as("ojdbc 기본 설정은 REMARKS 를 주지 않는다 — 프로파일러가 사전 뷰를 읽는 이유").isZero();
            assertThat(dictionary).isEqualTo(3L);

            // R7 — 실행기 순서로 연 읽기 전용 READ COMMITTED 트랜잭션도 문장마다 새 스냅숏이다. 그래서 source freeze 가 필요하다.
            try (Connection reader = ORACLE.createConnection("")) {
                reader.setReadOnly(true);
                reader.setTransactionIsolation(Connection.TRANSACTION_READ_COMMITTED);
                reader.setAutoCommit(false);
                long before = count(reader, table);
                try (Connection writer = ORACLE.createConnection("");
                     Statement insert = writer.createStatement()) {
                    insert.executeUpdate("INSERT INTO " + table + " (ID) VALUES (3)");
                    if (!writer.getAutoCommit()) {
                        writer.commit();
                    }
                }
                long after = count(reader, table);
                reader.rollback();
                System.out.printf("R7 probe: COUNT in one read-only READ COMMITTED transaction %d -> %d%n",
                        before, after);
                assertThat(before).isEqualTo(2L);
                assertThat(after).as("다른 세션의 커밋이 같은 트랜잭션의 다음 문장에 보인다").isEqualTo(3L);
            }

            // R1 — JVM 기본 시간대에 없는 지역 일시(Asia/Seoul 1987-05-10 02:30)는 getTimestamp 가 한 시간 민다. 드라이버가
            // 준 지역 일시는 그대로이고, 같은 도우미는 바꾸지 않고 멈춘다. 지역 이름 대신 오프셋으로 세션 시간대를 보내
            // 시간대 파일 없이 연결한다.
            source.update("INSERT INTO " + table + " (ID, T) VALUES (9, TIMESTAMP '1987-05-10 02:30:00')");
            LocalDateTime gap = LocalDateTime.of(1987, 5, 10, 2, 30);
            TimeZone original = TimeZone.getDefault();
            try {
                TimeZone.setDefault(TimeZone.getTimeZone("Asia/Seoul"));
                Properties properties = new Properties();
                properties.setProperty("user", ORACLE.getUsername());
                properties.setProperty("password", ORACLE.getPassword());
                properties.setProperty("oracle.jdbc.timezoneAsRegion", "false");
                try (Connection connection = DriverManager.getConnection(ORACLE.getJdbcUrl(), properties);
                     Statement statement = connection.createStatement();
                     ResultSet rows = statement.executeQuery("SELECT T FROM " + table + " WHERE ID = 9")) {
                    assertThat(rows.next()).isTrue();
                    boolean driverLocal = gap.equals(rows.getObject(1, LocalDateTime.class));
                    boolean shifted = !gap.equals(rows.getTimestamp(1).toLocalDateTime());
                    String reason = null;
                    try {
                        JdbcLobReader.scalar(rows, 1);
                    } catch (JdbcLobReader.ContentReadException stopped) {
                        reason = stopped.reason();
                    }
                    System.out.printf("R1 gap probe: driver local exact=%s getTimestamp shifted=%s scalar=%s%n",
                            driverLocal, shifted, reason);
                    assertThat(driverLocal).as("드라이버가 준 지역 일시는 간격 안 시각 그대로다").isTrue();
                    assertThat(shifted).as("getTimestamp 는 간격 안 시각을 민다(전제)").isTrue();
                    assertThat(reason).isEqualTo("LOCAL_TIMESTAMP_IN_ZONE_GAP");
                }
            } finally {
                TimeZone.setDefault(original);
            }
        } finally {
            source.execute("DROP TABLE " + table + " PURGE");
        }
    }

    /**
     * TIMESTAMP(6) 정렬 키가 page 경계(500행)를 넘을 때 keyset 이 값을 잃지 않고, 경계에 걸친 중복 키는 읽기를 멈춘다(R1 의
     * 정렬 경계 읽기). 소수 초까지 대상에 그대로 쓰이고, 같은 run 을 다시 돌려도 무중복이다.
     */
    @Test
    void aTimestampSortKeyCrossesPageBoundariesLosslesslyAndAStraddlingDuplicateStopsTheRead() throws Exception {
        String suffix = suffix();
        String source = owner() + ".LEG_EVT_" + suffix;
        String duplicate = owner() + ".LEG_EVT_DUP_" + suffix;
        String target = "public.tb_rh_evt_" + suffix.toLowerCase(Locale.ROOT);
        String events = " SELECT TIMESTAMP '2025-01-01 00:00:00' + NUMTODSINTERVAL(LEVEL + LEVEL / 1000000, 'SECOND'),"
                + " 'e' || LEVEL FROM DUAL CONNECT BY LEVEL <= 1001";
        JdbcTemplate oracle = sourceJdbc();
        oracle.execute("CREATE TABLE " + source + " (EVT_AT TIMESTAMP(6) PRIMARY KEY, NOTE VARCHAR2(20))");
        oracle.execute("CREATE TABLE " + duplicate + " (EVT_AT TIMESTAMP(6) NOT NULL, NOTE VARCHAR2(20))");
        try {
            oracle.update("INSERT INTO " + source + events);
            oracle.update("INSERT INTO " + duplicate + events);
            // 501번째 행의 키를 500번째와 같게 둔다 — 첫 page 경계에 걸친 중복이다.
            oracle.update("UPDATE " + duplicate + " SET EVT_AT = TIMESTAMP '2025-01-01 00:00:00'"
                    + " + NUMTODSINTERVAL(500 + 500 / 1000000, 'SECOND') WHERE NOTE = 'e501'");
            targetJdbc().execute("CREATE TABLE " + target + " (evt_at timestamp PRIMARY KEY, note varchar(20))");
            MappingSpec spec = events(source, target, "rehearsal-evt-" + suffix);

            List<TableResult> loaded = executor.execute(spec, MigrationMode.COMMIT, sourceJdbc(), targetJdbc(),
                    oraclePolicy(), true);

            assertThat(loaded).singleElement().satisfies(result -> {
                assertThat(result.errors()).isEmpty();
                assertThat(result.read()).isEqualTo(1001);
                assertThat(result.written()).isEqualTo(1001);
            });
            MigrationReport report = verifier.verify(spec, loaded, targetJdbc());
            assertThat(report.ok()).as(report.toSummary()).isTrue();
            List<String> written = targetJdbc().queryForList("SELECT to_char(evt_at, 'YYYY-MM-DD HH24:MI:SS.US') || '|'"
                    + " || note FROM " + target + " ORDER BY evt_at", String.class);
            List<String> original = oracle.queryForList("SELECT TO_CHAR(EVT_AT, 'YYYY-MM-DD HH24:MI:SS.FF6') || '|'"
                    + " || NOTE FROM " + source + " ORDER BY EVT_AT", String.class);
            assertThat(mismatches(original, written)).as("소수 초까지 같은 키·값으로 쓰인 행(어긋난 순번만 보인다)")
                    .isEmpty();

            List<TableResult> resumed = executor.execute(spec, MigrationMode.COMMIT, sourceJdbc(), targetJdbc(),
                    oraclePolicy(), true);
            assertThat(resumed.getFirst().errors()).isEmpty();
            assertThat(verifier.verify(spec, resumed, targetJdbc()).ok()).as("같은 run 을 다시 돌려도 무중복이다").isTrue();
            assertThat(targetJdbc().queryForObject("SELECT count(*) FROM " + target, Long.class)).isEqualTo(1001L);

            List<TableResult> straddling = executor.execute(events(duplicate, target, "rehearsal-dup-" + suffix),
                    MigrationMode.DRY_RUN, sourceJdbc(), null, oraclePolicy(), true);
            assertThat(straddling).singleElement().satisfies(result -> {
                assertThat(result.errors()).as("경계 미리보기가 같은 키를 알아보고 멈춘다 — 다음 page 가 그 행을 건너뛰지 않는다")
                        .containsExactly("이관 실패(" + duplicate + "): SQL_EXECUTION_FAILED");
                assertThat(result.transformed()).isZero();
            });
        } finally {
            oracle.execute("DROP TABLE " + source + " PURGE");
            oracle.execute("DROP TABLE " + duplicate + " PURGE");
        }
    }

    /**
     * [ADR-0029 L3c·L3d × L4-B R1·R3] 조회 표 행과 나눈 매핑의 행도 주 표와 같은 읽기 도우미({@link JdbcLobReader})로 읽는다.
     * 조회 표의 {@code TIMESTAMP(6)} 값과 나눈 매핑이 읽는 {@code TIMESTAMP(6)} 값이 {@code Timestamp} 로 와서 도메인 변환기가
     * 시각으로 본다(R1). 조회 표의 {@code CHAR(3)} 코드는 공백으로 채워 오므로 codemap 앞 trim 이 없으면 첫 행에서 멈춘다 —
     * 생성기와 coverage 가 조회 컬럼에도 trim 을 요구하는 이유다(R3). {@code TIMESTAMP} 조회 키는 승인 load 의 live 원천
     * 검사(조회 키 계열)가 실행 전에 거부하고, 실행기에 바로 넣어도 정규화가 어긋난 짝 대신 키 형식 실패로 멈춘다(심층 방어).
     * 1,001행이라 조회는 chunk(500행)마다 따로 돈다.
     */
    @Test
    void lookupAndSplitReadsShareTheTimestampReaderAndAPaddedLookupCodeNeedsTrim() throws Exception {
        String suffix = suffix();
        String users = owner() + ".LEG_LKU_" + suffix;
        String orders = owner() + ".LEG_ORD_" + suffix;
        String orderTarget = "public.tb_rh_ord_" + suffix.toLowerCase(Locale.ROOT);
        String historyTarget = "public.tb_rh_ord_h_" + suffix.toLowerCase(Locale.ROOT);
        JdbcTemplate oracle = sourceJdbc();
        oracle.execute("CREATE TABLE " + users + " (USER_NO NUMBER(10) PRIMARY KEY, JOINED_AT TIMESTAMP(6),"
                + " STAT_CD CHAR(3))");
        oracle.execute("CREATE TABLE " + orders + " (ORD_NO NUMBER(10) PRIMARY KEY, USER_NO NUMBER(10),"
                + " ORD_AT TIMESTAMP(6))");
        try {
            // 하루의 끝과 시작에 걸친 소수 초 — 시각을 시간대로 옮기면 날짜가 바뀐다.
            oracle.update("INSERT INTO " + users + " VALUES (1, TIMESTAMP '2025-03-04 23:59:59.999999', 'A')");
            oracle.update("INSERT INTO " + users + " VALUES (2, TIMESTAMP '2026-12-31 00:00:00.000001', 'D')");
            oracle.update("INSERT INTO " + orders + " SELECT LEVEL, MOD(LEVEL, 2) + 1, TIMESTAMP '2025-01-01"
                    + " 00:00:00.123456' + NUMTODSINTERVAL(LEVEL * 7, 'HOUR') FROM DUAL CONNECT BY LEVEL <= 1001");
            targetJdbc().execute("CREATE TABLE " + orderTarget + " (ord_no bigint PRIMARY KEY, join_ymd varchar(8),"
                    + " user_stat varchar(3))");
            targetJdbc().execute("CREATE TABLE " + historyTarget + " (ord_no bigint PRIMARY KEY,"
                    + " ord_ymd varchar(8))");
            String runId = "rehearsal-lku-" + suffix.toLowerCase(Locale.ROOT);
            MappingSpec spec = lookupAndSplit(orders, users, orderTarget, historyTarget, runId, "trim");

            List<TableResult> loaded = executor.execute(spec, MigrationMode.COMMIT, sourceJdbc(), targetJdbc(),
                    oraclePolicy(), true);

            assertThat(loaded).extracting(TableResult::mappingId).containsExactlyInAnyOrder("ord", "ord_h");
            assertThat(loaded).allSatisfy(result -> {
                assertThat(result.errors()).isEmpty();
                assertThat(result.read()).isEqualTo(1001);
                assertThat(result.written()).isEqualTo(1001);
                assertThat(result.lookupMisses()).isEmpty();
            });
            MigrationReport report = verifier.verify(spec, loaded, targetJdbc());
            assertThat(report.ok()).as(report.toSummary()).isTrue();
            List<String> expectedOrders = oracle.queryForList("SELECT o.ORD_NO || '|' || TO_CHAR(u.JOINED_AT,"
                    + " 'YYYYMMDD') || '|' || DECODE(TRIM(u.STAT_CD), 'A', 'A01', 'D', 'A02') FROM " + orders + " o"
                    + " JOIN " + users + " u ON u.USER_NO = o.USER_NO ORDER BY o.ORD_NO", String.class);
            List<String> writtenOrders = targetJdbc().queryForList("SELECT ord_no || '|' || join_ymd || '|' ||"
                    + " user_stat FROM " + orderTarget + " ORDER BY ord_no", String.class);
            assertThat(mismatches(expectedOrders, writtenOrders))
                    .as("조회 표의 TIMESTAMP·CHAR 값을 원천 계산과 같게 옮긴 행(어긋난 순번만 보인다)").isEmpty();
            List<String> expectedHistory = oracle.queryForList("SELECT ORD_NO || '|' || TO_CHAR(ORD_AT, 'YYYYMMDD')"
                    + " FROM " + orders + " ORDER BY ORD_NO", String.class);
            List<String> writtenHistory = targetJdbc().queryForList("SELECT ord_no || '|' || ord_ymd FROM "
                    + historyTarget + " ORDER BY ord_no", String.class);
            assertThat(mismatches(expectedHistory, writtenHistory))
                    .as("나눈 매핑이 읽은 TIMESTAMP 값을 원천 계산과 같게 옮긴 행").isEmpty();
            // 제어 스키마 V2 — 나눈 매핑은 같은 소스 키를 매핑마다 따로 기록한다.
            assertThat(targetJdbc().queryForList("SELECT mapping_id || ':' || count(*) FROM "
                    + MigrationSchemaManager.CONTROL_SCHEMA + ".tb_migration_checkpoint WHERE run_id = ?"
                    + " GROUP BY mapping_id ORDER BY mapping_id", String.class, runId))
                    .containsExactly("ord:1001", "ord_h:1001");

            // trim 없는 codemap 은 공백으로 채운 조회 코드('A  ')를 짝 짓지 못해 첫 행에서 멈춘다. 문구에 값이 없다.
            List<TableResult> untrimmed = executor.execute(lookupAndSplit(orders, users, orderTarget, historyTarget,
                    runId + "-bare", null), MigrationMode.DRY_RUN, sourceJdbc(), null, oraclePolicy(), true);
            TableResult bare = untrimmed.stream().filter(result -> "ord".equals(result.mappingId())).findFirst()
                    .orElseThrow();
            assertThat(bare.errors()).containsExactly("행 변환 실패(" + orders + "#ord, column=user_stat, row=1):"
                    + " ROW_TRANSFORM_FAILED:CODEMAP_UNMAPPED — " + STOPPED);

            // TIMESTAMP 조회 키 — 승인 load 는 실행 전 live 원천 검사가 조회 키 계열로 먼저 거부한다. 실행기에 바로 넣어도
            // 정규화가 어긋난 짝을 만들지 않고 행마다 키 형식 실패로 멈춘다(심층 방어).
            TableMapping byTime = new TableMapping(orders, orderTarget, null, "ORD_NO", List.of(), "ord_no",
                    List.of(new ColumnMapping("ORD_NO", "ord_no", null, null, null, null, null),
                            new ColumnMapping("usr.STAT_CD", "user_stat", "trim", null, "stat", null, null)),
                    null, null, List.of(), "ord_t", List.of(new Lookup("usr", users, null,
                    new LookupKey("ORD_AT", "JOINED_AT"), LookupCardinality.EXACTLY_ONE, null)));
            MappingSpec timeSpec = new MappingSpec(sourceConfig(), targetConfig(), List.of(byTime), spec.codemaps(),
                    new MappingSpec.RunContext(runId + "-time", "oracle-rehearsal-lookup"));
            assertThat(new MappingValidator(transformers, "db_columns.json").validateLiveSource(timeSpec, sourceJdbc())
                    .errors()).as("승인 load 의 live 원천 검사가 실행기보다 먼저 거부한다")
                    .anySatisfy(error -> assertThat(error).contains("lookups[usr]").contains("조회 키는 가변 길이 문자"));
            List<TableResult> timeKeyed = executor.execute(timeSpec, MigrationMode.DRY_RUN, sourceJdbc(), null,
                    oraclePolicy(), true);
            assertThat(timeKeyed).singleElement().satisfies(result -> assertThat(result.errors()).containsExactly(
                    "행 변환 실패(" + orders + "#ord_t, column=usr, row=1): ROW_TRANSFORM_FAILED:LOOKUP_KEY_TYPE — "
                            + STOPPED));
        } finally {
            oracle.execute("DROP TABLE " + orders + " PURGE");
            oracle.execute("DROP TABLE " + users + " PURGE");
        }
    }

    @Test
    void standardizationRehearsalRunsFromProfileThroughTheLedgerToADryRunAndAnEngineCommit() throws Exception {
        Rehearsal r = rehearsal();

        // 2. discover — 소유자 범위, 가시성 결과 없음, 번들 ojdbc 의 JAR 바이트에 결속된 드라이버 증거.
        r.command("discover");
        var inventoryEnvelope = inventories.readEnvelope(Files.readString(r.inventory()));
        CatalogSnapshot inventory = inventoryEnvelope.payload().toSnapshot();
        assertThat(inventory.visibilityFindings()).isEmpty();
        assertThat(inventory.objects()).anySatisfy(object -> {
            assertThat(object.kind()).isEqualTo(ObjectKind.TABLE);
            assertThat(object.name()).isEqualTo(r.sourceName());
        });
        String driverJar = ojdbcSha256();
        assertThat(inventoryEnvelope.sourceDriverEvidence())
                .isEqualTo(SourceDriverEvidence.bundled(ORACLE_DRIVER, driverJar));
        System.out.printf("Rehearsal: ojdbc JAR SHA-256 %s bound as BUNDLED source driver evidence%n", driverJar);

        // 3. profile — 위반 수가 fixture 와 정확히 같다. TIMESTAMP 는 시간형으로 세고(R1), 코멘트는 사전 뷰에서 온다(R2).
        r.command("profile", "--profile=" + r.profile());
        SourceProfile profile = collections.readProfile(Files.readString(r.profile())).payload();
        TableProfile users = profile.tables().stream().filter(table -> table.name().equals(r.sourceName()))
                .findFirst().orElseThrow();
        assertThat(users.status()).isEqualTo("PROFILED");
        assertThat(users.rowsScanned()).isEqualTo(ROWS);
        assertThat("레거시 사용자".equals(users.comment().text())).as("표 코멘트가 사전 뷰에서 온다(R2)").isTrue();
        assertThat(users.comment().inventoryMatch()).as("탐색은 REMARKS 만 읽어 inventory 에 코멘트 해시가 없다")
                .isEqualTo("NOT_IN_INVENTORY");
        ColumnProfile joined = column(users, "JOIN_YMD");
        assertThat(joined.patternMatches()).containsEntry("PLACEHOLDER_DATE", (long) PLACEHOLDERS);
        assertThat(joined.ymd8Invalid()).isEqualTo(INVALID_DATES.size());
        assertThat(joined.blanks()).isEqualTo(BLANK_DATES.size());
        ColumnProfile ended = column(users, "END_DT");
        assertThat(ended.temporalValues()).as("Oracle TIMESTAMP(6) 를 시간형으로 센다(R1)").isEqualTo(ROWS);
        assertThat(ended.otherValues()).isZero();
        assertThat(ended.minYear()).isEqualTo(2025);
        assertThat(ended.maxYear()).isEqualTo(2028);
        assertThat(column(users, "STAT_CD").trailingSpaces()).as("CHAR(3) 코드는 공백으로 채워 온다(R3)")
                .isEqualTo(ROWS);
        assertThat("최종로그인일시".equals(column(users, "LAST_LOGIN").comment().text()))
                .as("컬럼 코멘트도 사전 뷰에서 온다(R2)").isTrue();
        assertThat(column(users, "PHOTO").lobValues()).isEqualTo(3);

        // 4. term-suggest — 이름이 표준 약어와 다른 컬럼도 코멘트(용어명)로 EXACT 후보를 받는다(R2 의 실질 판정).
        r.command("term-suggest", "--profile=" + r.profile(), "--suggestions=" + r.suggestions(),
                "--ledger-draft=" + r.draft());
        SuggestionReport report = collections.readSuggestions(Files.readString(r.suggestions())).payload();
        for (Map.Entry<String, String> named : Map.of("LAST_LOGIN", "LAST_LOGIN_DT", "END_DT", "END_YMD",
                "USE_AT", "USE_YN").entrySet()) {
            ColumnSuggestion suggestion = suggestion(report, r, named.getKey());
            assertThat(suggestion.grade()).isEqualTo("EXACT");
            assertThat(suggestion.candidates().getFirst().engAbbr()).isEqualTo(named.getValue());
            assertThat(suggestion.candidates().getFirst().evidence()).containsExactly("COMMENT_TERM_NAME");
        }
        assertThat(suggestion(report, r, "JOIN_YMD").candidates().getFirst().conformance().violations())
                .extracting(SuggestionReport.Violation::type, SuggestionReport.Violation::rows)
                .containsExactly(org.assertj.core.groups.Tuple.tuple("INVALID_DATE", 3L),
                        org.assertj.core.groups.Tuple.tuple("PLACEHOLDER_DATE", (long) PLACEHOLDERS),
                        org.assertj.core.groups.Tuple.tuple("BLANK", 5L));
        for (Path artifact : List.of(r.profile(), r.suggestions(), r.draft())) {
            assertThat(leaks(Files.readString(artifact), forbidden()))
                    .as(artifact.getFileName() + " 에 나온 원시 값·접속 정보의 종류").isEmpty();
        }

        // 5. 원장 확정 — 시험이 검토자·업무담당 역할을 한다. 초안의 용어·등급·적합성 추정을 그대로 쓰고 load 를 정한다.
        TermLedger draft = new TermLedgerLoader().load(Files.readString(r.draft()));
        Map<String, Entry> rows = new LinkedHashMap<>();
        draft.entries().stream().filter(entry -> entry.source().table().equalsIgnoreCase(r.sourceTable()))
                .forEach(entry -> rows.put(entry.source().column().toUpperCase(Locale.ROOT), entry));
        assertThat(rows.keySet()).containsExactlyInAnyOrderElementsOf(COLUMNS);
        TermLedger ledger = confirmed(r, rows, 3L, true);
        Files.writeString(r.ledger(), new LedgerDraftWriter().write(ledger), StandardCharsets.UTF_8);

        // 6. mapping-generate — 결과를 원장과 양방향으로 대조한다(바이트는 고정하지 않는다).
        r.command("mapping-generate", "--skeleton=" + r.skeleton(), "--ledger=" + r.ledger(),
                "--mapping=" + r.mapping());
        String generated = Files.readString(r.mapping());
        assertThat(leaks(generated, forbidden())).as("만든 mapping 에 나온 원시 값·접속 정보의 종류").isEmpty();
        assertThat(generated.contains("${RH_SOURCE_URL}") && generated.contains("${RH_TARGET_PASSWORD}"))
                .as("접속 자리표시가 풀리지 않고 남는다").isTrue();
        MappingSpec spec = r.loader().load(r.mapping());
        assertThat(loads(spec)).as("mapping 컬럼과 원장 확정 행의 load·isolate 가 대상 컬럼마다 같다")
                .isEqualTo(loads(ledger));
        assertThat(spec.ledger().sha256()).isEqualTo(sha256(Files.readAllBytes(r.ledger())));

        // 7. plan → review → plan → validate. 공개 COMMIT 은 보관 디렉터리가 없으면, 있어도 UNVERIFIED 라 막힌다.
        reviewAndValidate(r);
        Path dumps = Files.createDirectory(temp.resolve("dumps")).toRealPath();
        assertThatThrownBy(() -> r.command("load", "--mode=commit", "--ack-adapter=" + ADAPTER, "--ack-source-freeze"))
                .isInstanceOf(MigrationExecutionException.class).hasMessageContaining("--archive-dir 가 필요합니다");
        assertThatThrownBy(() -> r.command("load", "--mode=commit", "--ack-adapter=" + ADAPTER, "--ack-source-freeze",
                "--archive-dir=" + dumps))
                .isInstanceOf(MigrationExecutionException.class).hasMessageContaining("UNVERIFIED source adapter");
        assertThat(new OracleSourceAdapter().identity().evidenceLevel()).isEqualTo(EvidenceLevel.UNVERIFIED);
        assertThat(executionArtifacts(r)).isEmpty();
        assertThat(targetRows(r)).isZero();
        assertThat(entries(dumps)).isEmpty();

        // 8. 공개 DRY_RUN — 승인 workflow 로 끝까지 판정하고 대상에는 쓰지 않는다.
        r.command("load", "--mode=dry-run", "--ack-adapter=" + ADAPTER, "--ack-source-freeze");
        List<Path> artifacts = executionArtifacts(r);
        assertThat(artifacts).hasSize(1);
        String dryRunText = Files.readString(artifacts.getFirst());
        MigrationExecutionArtifact dryRun = json.readValue(dryRunText, MigrationExecutionArtifact.class);
        String ledgerEntry = rows.get("JOIN_YMD").id();
        assertThat(dryRun.mode()).isEqualTo("DRY_RUN");
        assertThat(dryRun.status()).isEqualTo("PASS");
        // 실행 JSON 형식 5(ADR-0029 L3c·L3d·L4 D2) — 기본 매핑은 매핑 id 를, DRY_RUN 은 제어 스키마 기록을, 조회가 없으면 짝
        //   없는 행 기록을 싣지 않는다. 승인 load 의 DRY_RUN 은 Oracle 원천 집계로 조회 행 수만 대사하고 쓰기 세션은 검사하지
        //   않는다.
        assertThat(dryRun.schemaVersion()).isEqualTo(MigrationExecutionArtifact.CURRENT_SCHEMA_VERSION).isEqualTo(5);
        assertThat(dryRun.controlSchema()).isNull();
        assertThat(dryRun.lookupMisses()).isEmpty();
        assertThat(dryRunText).doesNotContain("\"controlSchema\"", "\"lookupMisses\"", "\"mapping\":");
        assertThat(dryRun.reconciliation()).isNotNull();
        assertThat(dryRun.reconciliation().replicationRole()).isEqualTo("NOT_CHECKED");
        assertThat(dryRun.reconciliation().mappings()).singleElement().satisfies(mapping -> {
            assertThat(mapping.source()).isEqualTo(r.sourceTable());
            assertThat(mapping.target()).isEqualTo(r.targetTable());
            assertThat(mapping.status()).isEqualTo("PASS");
            assertThat(mapping.checks()).extracting(ReconciliationEvidence.CheckRecord::check,
                    ReconciliationEvidence.CheckRecord::status).containsExactly(
                    org.assertj.core.groups.Tuple.tuple("SOURCE_ROWS", "PASS"));
        });
        // codemap 결과 종류 — 격리한 3행은 세지 않고, 미매핑 그대로 쓰기·대체값이 없으며 모든 키가 한 번 이상 맞았다.
        assertThat(dryRun.reconciliation().codemapUse()).containsExactly(
                new ReconciliationEvidence.CodemapUseRecord(r.targetTable(), "use_yn", "use_at",
                        ROWS - INVALID_DATES.size(), 0, 0, 0, List.of()),
                new ReconciliationEvidence.CodemapUseRecord(r.targetTable(), "stat_cd", "stat_cd",
                        ROWS - INVALID_DATES.size(), 0, 0, 0, List.of()));
        assertThat(dryRun.reconciliation().references()).isEmpty();
        assertThat(dryRun.reconciliation().codeSets()).as("DRY_RUN 은 대상 쪽 대사를 하지 않는다").isEmpty();
        assertThat(dryRun.tables()).singleElement().satisfies(table -> {
            assertThat(table.mapping()).isNull();
            assertThat(table.read()).isEqualTo(ROWS);
            assertThat(table.written()).isZero();
            assertThat(table.errors()).isZero();
            assertThat(table.isolated()).isEqualTo(INVALID_DATES.size());
            assertThat(table.status()).isEqualTo("PASS");
        });
        assertThat(dryRun.nullified()).containsExactly(new MigrationExecutionArtifact.NullifiedRecord(r.targetTable(),
                "join_ymd", PLACEHOLDERS + BLANK_DATES.size()));
        assertThat(dryRun.isolations()).containsExactly(new MigrationExecutionArtifact.IsolationRecord(
                r.sourceTable(), r.targetTable(), ledgerEntry, "join_ymd", "INVALID_DATE", 3, INVALID_DATES));
        assertThat(leaks(dryRunText, forbidden())).as("DRY_RUN 실행 JSON 에 나온 원시 값·접속 정보의 종류").isEmpty();
        assertThat(targetRows(r)).isZero();

        // 9. 부정 — 상한 2 는 셋째 격리 행에서, 생성기를 우회한 trim 없는 codemap 은 첫 행에서 멈춘다. 생성기는 그런 원장을 거부한다.
        MappingSpec capped = regenerate(r, rows, "cap", 2L, true);
        assertThat(single(engine(r, capped, MigrationMode.DRY_RUN, inventory, null)).errors()).containsExactly(
                "격리 상한 초과(원장 행 " + ledgerEntry + ", 상한 2): " + r.sourceTable() + " row=1300"
                        + " — ISOLATION_CAP_EXCEEDED, " + STOPPED);
        assertThatThrownBy(() -> regenerate(r, rows, "no-trim", 3L, false))
                .isInstanceOf(MigrationExecutionException.class)
                .hasMessageContaining(rows.get("STAT_CD").id() + " " + r.sourceTable() + ".STAT_CD(CONFIRMED):"
                        + " 고정 길이 문자(CHAR·NCHAR) 소스의 codemap 앞에는 transform: trim 이 필요합니다");
        assertThat(r.directory().resolve("no-trim").resolve("mapping.yml")).doesNotExist();
        assertThat(new TermLedgerValidator().coverage(confirmed(r, rows, 3L, false), withoutTrim(spec, "stat_cd"),
                inventory)).as("손으로 쓴 같은 mapping 도 plan 의 원장 대응 검사가 같은 판정으로 막는다")
                .containsExactly(r.sourceTable() + ".STAT_CD(원장 행 " + rows.get("STAT_CD").id() + "): "
                        + LoadCapabilities.FIXED_WIDTH_TRIM_REQUIRED);
        TableResult untrimmed = single(engine(r, withoutTrim(spec, "stat_cd"), MigrationMode.DRY_RUN, inventory, null));
        assertThat(untrimmed.errors()).singleElement().asString()
                .startsWith("행 변환 실패(" + r.sourceTable() + ", column=stat_cd, row=1): ")
                .contains("CODEMAP_UNMAPPED", STOPPED);
        assertThat(untrimmed.errors().getFirst().contains("A  ")).as("실패 문구에 공백 채운 코드 값이 없다").isFalse();

        // 10. 엔진 COMMIT + verify — 승인 workflow 와 같은 값 한계 가드, 격리 키는 저장소 밖 보관 디렉터리로 반출한다.
        MigrationPlan plan = plans.read(Files.readString(r.plan()));
        ArchiveRun archives = ArchiveRun.writing(dumps, CanonicalArtifactDigest.sha256(plan), plan.mappingDigest());
        // 승인 workflow 처럼 적재 전후 제어 스키마 버전을 본다(ADR-0029 L3c). 같은 대상을 쓰는 다른 시험이 먼저 만들었으면 V2
        //   그대로이고, 처음이면 none 에서 V2 가 된다 — 어느 쪽이든 올릴 버전이 남지 않는다.
        MigrationSchemaManager controlSchemas = new MigrationSchemaManager();
        MigrationSchemaManager.ControlSchemaStatus before = controlSchemas.inspect(targetJdbc());
        assertThat(before.upgradeRequired()).isFalse();
        List<TableResult> results = engine(r, spec, MigrationMode.COMMIT, inventory, archives);
        MigrationSchemaManager.ControlSchemaStatus after = controlSchemas.inspect(targetJdbc());
        assertThat(after).isEqualTo(new MigrationSchemaManager.ControlSchemaStatus("2", false));
        assertThat(targetJdbc().queryForList("SELECT DISTINCT mapping_id FROM " + MigrationSchemaManager.CONTROL_SCHEMA
                + ".tb_migration_checkpoint WHERE run_id = ?", String.class, spec.run().runId()))
                .as("기본 매핑의 checkpoint 는 매핑 id '' 로 기록한다(제어 스키마 V2)")
                .containsExactly(TableMapping.DEFAULT_ID);
        TableResult loaded = single(results);
        assertThat(loaded.errors()).isEmpty();
        assertThat(loaded.read()).isEqualTo(ROWS);
        assertThat(loaded.transformed()).isEqualTo(ROWS - INVALID_DATES.size());
        assertThat(loaded.written()).isEqualTo(ROWS - INVALID_DATES.size());
        assertThat(loaded.nullified()).containsExactly(Map.entry("join_ymd", (long) PLACEHOLDERS + BLANK_DATES.size()));
        assertThat(loaded.isolations()).containsExactly(new Isolation(ledgerEntry, "join_ymd", "INVALID_DATE", 3,
                INVALID_DATES));
        assertThat(loaded.sequenceResets()).singleElement().satisfies(reset -> {
            assertThat(reset.column()).isEqualTo("user_no");
            assertThat(reset.action()).isEqualTo(Action.ADVANCED);
        });
        ArchiveOutcome outcome = archives.outcome();
        assertThat(outcome.errors()).isEmpty();
        assertThat(outcome.dumps()).isEmpty();
        assertThat(outcome.keyExports()).singleElement().satisfies(export -> {
            assertThat(export.source()).isEqualTo(r.sourceTable());
            assertThat(export.rows()).isEqualTo(INVALID_DATES.size());
        });
        List<String> exported = new ArrayList<>();
        List<String> keyLines = Files.readAllLines(dumps.resolve(outcome.keyExports().getFirst().fileName()));
        for (String line : keyLines.subList(1, keyLines.size())) {
            var exportedRow = json.readTree(line);
            exported.add(exportedRow.get("ordinal").asLong() + "|" + exportedRow.get("k") + "|"
                    + exportedRow.get("violations"));
        }
        // 정렬 키(USER_NO)는 fixture 의 일련번호라 민감 값이 아니다. 고칠 행을 가리키는 것이 반출의 목적이다.
        assertThat(exported).as("격리 키 반출은 격리한 행의 순번·정렬 키·위반이다").containsExactlyElementsOf(
                INVALID_DATES.stream().map(key -> key + "|[" + key + "]|[{\"ledgerEntry\":\"" + ledgerEntry
                        + "\",\"column\":\"join_ymd\",\"violation\":\"INVALID_DATE\"}]").toList());
        MigrationReport verified = verifier.verify(spec, results, targetJdbc(), outcome);
        assertThat(verified.ok()).as(verified.toSummary()).isTrue();
        String commitText = MigrationExecutionArtifact.encode(plan, MigrationMode.COMMIT, "PASS", Instant.now(),
                verified, results, outcome, new MigrationExecutionArtifact.ControlSchemaRecord(
                        before.appliedVersion() == null ? "none" : before.appliedVersion(), after.appliedVersion()));
        // 대사 수집 없이 부른 엔진 경로라 형식 5 의 reconciliation 블록이 없다 — 대사는 O2 리허설이 엔진 경로로 본다.
        assertThat(commitText).contains("\"isolated\":3", "\"ordinals\":[10,600,1300]", "\"action\":\"ADVANCED\"",
                "\"schemaVersion\":5", "\"after\":\"2\"}").doesNotContain("\"reconciliation\"");
        Map<String, String> commitForbidden = forbidden();
        commitForbidden.put("보관 디렉터리", dumps.toString());
        commitForbidden.put("보관 디렉터리(/ 구분)", dumps.toString().replace('\\', '/'));
        assertThat(leaks(commitText, commitForbidden)).as("COMMIT 실행 JSON 에 나온 원시 값·경로·접속 정보의 종류")
                .isEmpty();

        // 대상 값은 원천에서 따로 계산한 표준화 결과와 같다. 어긋나면 그 위치만 보인다.
        assertThat(mismatches(expectedStandardRows(r), actualStandardRows(r)))
                .as("표준화한 행(키|가입일|최종로그인|종료일|사용여부|상태|부서)이 원천 계산과 다른 위치").isEmpty();
        assertThat(targetJdbc().queryForObject("SELECT count(*) FROM " + r.targetTable()
                + " WHERE user_nm IS DISTINCT FROM '사용자' || user_no", Long.class)).isZero();
        assertThat(targetJdbc().queryForObject("SELECT count(*) FROM " + r.targetTable()
                + " WHERE photo IS NOT NULL", Long.class)).isEqualTo(3L);
        assertThat(targetJdbc().queryForObject("SELECT count(*) FROM " + r.targetTable() + " WHERE user_no <= 3"
                + " AND photo = '\\x89504e47'::bytea AND memo_cn = '메모 ' || user_no", Long.class)).isEqualTo(3L);
        assertThat(targetJdbc().queryForObject("INSERT INTO " + r.targetTable() + " (user_nm) VALUES ('온라인')"
                + " RETURNING user_no", Long.class))
                .as("온라인 앱의 다음 번호는 격리한 마지막 키(1300) 뒤다 — 정밀도 없는 NUMBER 키의 시퀀스 재설정").isEqualTo(1301L);
    }

    /**
     * [ADR-0029 L4 O2] 표준화 이관의 나머지 경로를 Oracle 원천에서 끝까지 돌린다. 한 원천 표를 대리키를 채번하는 기본 매핑과
     * EMAIL·PHOTO 를 옮기는 확장 매핑으로 나누고(L3c — 확장 매핑은 자기 원천을 fkRef 로 가리켜 같은 대리키를 쓴다), 두 조회
     * 조인(VARCHAR2 키, NUMBER(3)↔NUMBER(10,0) 키 — 짝 없음 2행 ≤ maxMissing)으로 값을 모으며(L3d — 두 NUMBER 키는 드라이버가
     * 모두 scale 0 값으로 주므로 키 정규화를 가리지는 않는다. 정규화는 LookupResolver 단위 시험이 본다), 적재하지 않는 옛 로그
     * 표를 같은 원천 읽기 세션에서 덤프한다(L3e — TIMESTAMP(6)·RAW·NUMBER(12,2) 값). 원장 확정(분할 id·via·ARCHIVE)과
     * mapping-generate, plan·review·validate, 공개 DRY_RUN 을 지나 승인 workflow 밑의 엔진으로 COMMIT 하고, load 안 대사(L4 D2·D7)를
     * Oracle 원천 집계로 판정한다 — 정밀도 없는 NUMBER 합({@code SUM(col)}, 소수가 든 비율), 정밀도 있는 NUMBER 합
     * ({@code DECIMAL(38,s)}), DATE·TIMESTAMP(6)(R1) 최소·최대, {@code ''} 를 NULL 로 저장하는 Oracle 의 NULL 계정, 표본 재계산,
     * 날짜와 일시의 종류만 바꾸는 옮김의 판정 사유. 원천 집계 문장이 실패하면 같은 읽기 트랜잭션에서 COUNT 전용 문장으로 물러나는
     * 길(Oracle 읽기 전용 트랜잭션의 savepoint)도 본다. 접속 사용자 이름을 Oracle 이 저장한 대문자로 적은 설정도 discover 를
     * 통과하는지 본다(DEC-OPS-326).
     *
     * <p>공개 COMMIT 은 Oracle 이 {@code UNVERIFIED} 라 막힌다(위 O1 리허설이 본다). 증거 등급은 바꾸지 않는다. fixture 는 수천 행이라
     * ORA-01555(snapshot too old)는 재지 않는다 — 운영 규모 검증 몫이다. 값은 단언에만 쓰고 출력하지 않는다.</p>
     */
    @Test
    void splitLookupDumpAndReconciliationRehearsalRunsOnAnOracleSource() throws Exception {
        O2 o = o2Rehearsal();
        Rehearsal r = o.rehearsal();
        try {
            // 1. discover·profile·term-suggest — O1 과 같은 길이다. 조회 표·덤프만 하는 표도 같은 owner 범위에 있다.
            r.command("discover");
            CatalogSnapshot inventory = inventories.readEnvelope(Files.readString(r.inventory())).payload().toSnapshot();
            assertThat(inventory.visibilityFindings()).isEmpty();
            assertThat(inventory.objects()).filteredOn(object -> object.kind() == ObjectKind.TABLE)
                    .extracting(CatalogObject::name)
                    .contains(r.sourceName(), o.deptName(), o.gradeName(), o.logName());
            // 접속 설정의 사용자 이름을 Oracle 이 저장한 꼴(대문자)로 적어도 discover 가 통과한다(DEC-OPS-326) — 원천 사용자
            //   이름이 원천 schema(owner) 이름과 대소문자 없이 같으면 산출물이 늘 싣는 schema 이름으로 보고 사용자 이름
            //   검사에서 뺀다. 같은 원천이므로 inventory 의 객체도 같다. 비밀번호·URL·endpointId 는 그대로 막는다(러너 단위 시험).
            Rehearsal upperUser = withSourceUser(r, sourceConfig().username().toUpperCase(Locale.ROOT));
            upperUser.command("discover");
            assertThat(inventories.readEnvelope(Files.readString(upperUser.inventory())).payload().toSnapshot()
                    .objects()).extracting(CatalogObject::stableId)
                    .containsExactlyInAnyOrderElementsOf(inventory.objects().stream().map(CatalogObject::stableId).toList());
            r.command("profile", "--profile=" + r.profile());
            r.command("term-suggest", "--profile=" + r.profile(), "--suggestions=" + r.suggestions(),
                    "--ledger-draft=" + r.draft());
            for (Path artifact : List.of(r.profile(), r.suggestions(), r.draft())) {
                String text = Files.readString(artifact);
                assertThat(leaks(text, o2Forbidden())).as(artifact.getFileName() + " 에 나온 원시 값·접속 정보의 종류")
                        .isEmpty();
                assertThat(userNameLeaks(text)).as(artifact.getFileName() + " 에서 schema 한정 이름 밖의 사용자 이름")
                        .isZero();
            }

            // 2. 원장 확정 — 시험이 검토자·업무담당 역할을 한다. 분할 id(emp·emp_ext), 조회 경로(via), 외부 보관(ARCHIVE),
            //   조회·정렬 키만 쓰는 컬럼의 이관 제외.
            TermLedger draft = new TermLedgerLoader().load(Files.readString(r.draft()));
            Map<String, String> roles = Map.of(r.sourceTable(), "EMP", o.deptTable(), "DEPT", o.gradeTable(), "GRADE",
                    o.logTable(), "LOG");
            Map<String, Entry> rows = new LinkedHashMap<>();
            for (Entry entry : draft.entries()) {
                roles.entrySet().stream().filter(role -> role.getKey().equalsIgnoreCase(entry.source().table()))
                        .findFirst().ifPresent(role -> rows.put(role.getValue() + "."
                                + entry.source().column().toUpperCase(Locale.ROOT), entry));
            }
            assertThat(rows.keySet()).containsExactlyInAnyOrder("EMP.EMP_NO", "EMP.EMP_NM", "EMP.JOIN_YMD",
                    "EMP.HIRED_DT", "EMP.SALARY", "EMP.STAT_CD", "EMP.DEPT_CD", "EMP.GRADE_NO", "EMP.EMAIL", "EMP.PHOTO",
                    "EMP.UPDATED_AT", "EMP.RATE", "EMP.CONTRACT_DT", "DEPT.DEPT_CD", "DEPT.DEPT_NM", "GRADE.GRADE_NO",
                    "GRADE.GRADE_NM", "LOG.LOG_NO", "LOG.LOG_AT", "LOG.RAW_DATA", "LOG.AMOUNT");
            TermLedger ledger = o2Ledger(o, rows);
            Files.writeString(r.ledger(), new LedgerDraftWriter().write(ledger), StandardCharsets.UTF_8);

            // 3. mapping-generate — 나눈 두 매핑(대리키 공유), 기본 매핑의 두 조회, 덤프만 하는 표의 보관 선언.
            r.command("mapping-generate", "--skeleton=" + r.skeleton(), "--ledger=" + r.ledger(),
                    "--mapping=" + r.mapping());
            String generated = Files.readString(r.mapping());
            assertThat(leaks(generated, o2Forbidden())).as("만든 mapping 에 나온 원시 값·접속 정보의 종류").isEmpty();
            assertThat(userNameLeaks(generated)).as("만든 mapping 에서 schema 한정 이름 밖의 사용자 이름(보관 id 등)")
                    .isZero();
            MappingSpec spec = r.loader().load(r.mapping());
            assertThat(spec.tables()).extracting(TableMapping::id, TableMapping::source, TableMapping::target)
                    .containsExactly(tuple("emp", r.sourceTable(), r.targetTable()),
                            tuple("emp_ext", r.sourceTable(), o.extTarget()));
            TableMapping employees = spec.tables().getFirst();
            assertThat(employees.idStrategy()).isEqualTo(new MappingSpec.IdStrategy("emp_id", "EMP_", "EMP_NO"));
            assertThat(employees.lookups()).containsExactly(
                    new Lookup("dept", o.deptTable(), null, new LookupKey("DEPT_CD", "DEPT_CD"),
                            LookupCardinality.AT_MOST_ONE, (long) UNKNOWN_DEPT.size()),
                    new Lookup("grade", o.gradeTable(), null, new LookupKey("GRADE_NO", "GRADE_NO"),
                            LookupCardinality.EXACTLY_ONE, null));
            assertThat(employees.columns()).extracting(ColumnMapping::source, ColumnMapping::target)
                    .contains(tuple("dept.DEPT_NM", "dept_nm"), tuple("grade.GRADE_NM", "grade_nm"));
            assertThat(spec.tables().get(1).columns())
                    .extracting(ColumnMapping::source, ColumnMapping::target, ColumnMapping::fkRef)
                    .containsExactlyInAnyOrder(tuple("EMP_NO", "emp_id", r.sourceTable()),
                            tuple("EMAIL", "email_addr", null), tuple("PHOTO", "photo", null));
            assertThat(spec.archives()).singleElement().satisfies(dump -> {
                assertThat(dump.source()).isEqualTo(o.logTable());
                assertThat(dump.orderByKeys()).containsExactly("LOG_NO");
                assertThat(dump.columns()).containsExactly("LOG_AT", "RAW_DATA", "AMOUNT");
                assertThat(dump.ledgerEntries()).containsExactly(rows.get("LOG.LOG_AT").id(),
                        rows.get("LOG.RAW_DATA").id(), rows.get("LOG.AMOUNT").id());
                assertThat(dump.retainUntil()).isEqualTo(RETAIN_UNTIL);
            });
            assertThat(new TermLedgerValidator().coverage(ledger, spec, inventory)).isEmpty();

            // 4. plan → review → validate. 조회만 하는 표는 LOOKUP_INPUT, 덤프만 하는 표는 EXPORT_ONLY 다.
            reviewAndValidate(r, null, Set.of(o.deptName(), o.gradeName()));

            // 5. 공개 DRY_RUN — 두 매핑의 원천 행 수를 Oracle 원천 집계로 대사하고, 조회 짝 없음과 덤프할 행을 센다. 대상에 쓰지
            //   않는다.
            r.command("load", "--mode=dry-run", "--ack-adapter=" + ADAPTER, "--ack-source-freeze");
            List<Path> artifacts = executionArtifacts(r);
            assertThat(artifacts).hasSize(1);
            String dryRunText = Files.readString(artifacts.getFirst());
            MigrationExecutionArtifact dryRun = json.readValue(dryRunText, MigrationExecutionArtifact.class);
            assertThat(dryRun.mode()).isEqualTo("DRY_RUN");
            assertThat(dryRun.status()).isEqualTo("PASS");
            assertThat(dryRun.schemaVersion()).isEqualTo(5);
            assertThat(dryRun.tables()).extracting(MigrationExecutionArtifact.TableCounts::mapping,
                            MigrationExecutionArtifact.TableCounts::read, MigrationExecutionArtifact.TableCounts::written,
                            MigrationExecutionArtifact.TableCounts::errors,
                            MigrationExecutionArtifact.TableCounts::isolated, MigrationExecutionArtifact.TableCounts::status)
                    .containsExactly(tuple("emp", (long) EMPLOYEES, 0L, 0L, 0L, "PASS"),
                            tuple("emp_ext", (long) EMPLOYEES, 0L, 0L, 0L, "PASS"));
            assertThat(dryRun.lookupMisses()).containsExactly(new MigrationExecutionArtifact.LookupMissRecord(
                    r.sourceTable(), "emp", "dept", UNKNOWN_DEPT.size()));
            assertThat(dryRun.archives()).singleElement().satisfies(archive -> {
                assertThat(archive.dumpOnly()).isTrue();
                assertThat(archive.source()).isEqualTo(o.logTable());
                assertThat(archive.rows()).isEqualTo(OLD_LOGS);
                assertThat(archive.file()).as("DRY_RUN 은 덤프 파일을 쓰지 않는다").isNull();
            });
            assertThat(dryRun.reconciliation().replicationRole()).isEqualTo("NOT_CHECKED");
            assertThat(dryRun.reconciliation().mappings()).extracting(ReconciliationEvidence.MappingRecord::mapping,
                    ReconciliationEvidence.MappingRecord::status).containsExactly(tuple("emp", "PASS"),
                    tuple("emp_ext", "PASS"));
            assertThat(dryRun.reconciliation().mappings()).allSatisfy(mapping -> assertThat(mapping.checks())
                    .extracting(ReconciliationEvidence.CheckRecord::check, ReconciliationEvidence.CheckRecord::status,
                            ReconciliationEvidence.CheckRecord::rows)
                    .as("DRY_RUN 은 Oracle 원천 집계로 조회 행 수만 대사한다")
                    .containsExactly(tuple("SOURCE_ROWS", "PASS", (long) EMPLOYEES)));
            assertThat(leaks(dryRunText, o2Forbidden())).as("DRY_RUN 실행 JSON 에 나온 원시 값·접속 정보의 종류").isEmpty();
            assertThat(userNameLeaks(dryRunText)).as("DRY_RUN 실행 JSON 에서 schema 한정 이름 밖의 사용자 이름").isZero();
            assertThat(rowsOf(r.targetTable()) + rowsOf(o.extTarget())).isZero();

            // 6. 엔진 COMMIT — 승인 load 처럼 승인 fingerprint 의 대상 계약으로 값 한계 가드·대사 계획을 만들고, 덤프는 저장소 밖
            //   보관 디렉터리에 같은 원천 읽기 세션으로 쓴다(공개 COMMIT 은 UNVERIFIED 라 막힌다).
            MigrationPlan plan = plans.read(Files.readString(r.plan()));
            Path dumps = Files.createDirectory(temp.resolve("dumps")).toRealPath();
            ArchiveRun archives = ArchiveRun.writing(dumps, CanonicalArtifactDigest.sha256(plan), plan.mappingDigest());
            MigrationSchemaManager controlSchemas = new MigrationSchemaManager();
            MigrationSchemaManager.ControlSchemaStatus before = controlSchemas.inspect(targetJdbc());
            assertThat(before.upgradeRequired()).isFalse();
            ReconciledEngine engine = reconciledEngine(r, spec, inventory, plan, archives);
            MigrationSchemaManager.ControlSchemaStatus after = controlSchemas.inspect(targetJdbc());
            // 나눈 두 매핑은 같은 (원천, where) 라 원천 집계 문장 하나를 나눠 쓴다.
            assertThat(engine.reconciliation().aggregateGroups()).singleElement()
                    .satisfies(group -> assertThat(group.labels()).hasSize(2));
            List<TableResult> results = engine.results();
            assertThat(results).extracting(TableResult::mappingId).containsExactly("emp", "emp_ext");
            assertThat(results).allSatisfy(result -> {
                assertThat(result.errors()).isEmpty();
                assertThat(result.read()).isEqualTo(EMPLOYEES);
                assertThat(result.transformed()).isEqualTo(EMPLOYEES);
                assertThat(result.written()).isEqualTo(EMPLOYEES);
                assertThat(result.isolated()).isZero();
            });
            assertThat(results.getFirst().lookupMisses()).containsExactly(Map.entry("dept", (long) UNKNOWN_DEPT.size()));
            assertThat(results.getFirst().nullified()).containsExactly(Map.entry("join_ymd", (long) O2_PLACEHOLDERS));
            assertThat(results.get(1).lookupMisses()).isEmpty();

            // 덤프 — 덤프한 행 수 = 원천에서 읽은 행 수이고, TIMESTAMP(6)(R1 — 드라이버 고유 값을 Timestamp 로)·RAW·NUMBER(12,2)
            //   값이 원천 fixture 와 같게 쓰였다.
            ArchiveOutcome outcome = archives.outcome();
            assertThat(outcome.errors()).isEmpty();
            assertThat(outcome.keyExports()).isEmpty();
            assertThat(outcome.dumps()).singleElement().satisfies(dump -> {
                assertThat(dump.dumpOnly()).isTrue();
                assertThat(dump.source()).isEqualTo(o.logTable());
                assertThat(dump.sourceRows()).isEqualTo(OLD_LOGS);
                assertThat(dump.rows()).isEqualTo(OLD_LOGS);
                assertThat(dump.retainUntil()).isEqualTo(RETAIN_UNTIL);
                assertThat(dump.ledgerEntries()).containsExactly(rows.get("LOG.LOG_AT").id(),
                        rows.get("LOG.RAW_DATA").id(), rows.get("LOG.AMOUNT").id());
            });
            assertThat(dumpMismatches(dumps.resolve(outcome.dumps().getFirst().fileName())))
                    .as("덤프 행(정렬 키|LOG_AT|RAW_DATA|AMOUNT)이 원천 fixture 와 다른 위치").isEmpty();

            // 7. verify — 적재 대조와 대사(L4 D2·D7)를 함께 판정한다.
            MigrationReport verified = verifier.verify(spec, results, targetJdbc(), outcome, engine.reconciliation());
            assertThat(verified.ok()).as(verified.toSummary()).isTrue();
            ReconciliationEvidence evidence = verified.reconciliation();
            assertThat(evidence.replicationRole()).isEqualTo("ORIGIN");
            assertThat(evidence.mappings()).extracting(ReconciliationEvidence.MappingRecord::source,
                    ReconciliationEvidence.MappingRecord::mapping, ReconciliationEvidence.MappingRecord::target,
                    ReconciliationEvidence.MappingRecord::status).containsExactly(
                    tuple(r.sourceTable(), "emp", r.targetTable(), "PASS"),
                    tuple(r.sourceTable(), "emp_ext", o.extTarget(), "PASS"));
            // 집계 실패로 물러난 판정이 없다 — Oracle 집계 문장(정밀도 없는 NUMBER 는 SUM(col) 이라 소수가 든 비율의 합이 맞고,
            //   정밀도 있는 NUMBER 는 DECIMAL(38,s) 캐스트)과 DATE·TIMESTAMP(6) 최소·최대 값을 그대로 판정했다. TIMESTAMP(6) 의
            //   원천 최소·최대는 드라이버 고유 값이라 집계 결과도 R1 을 지나야 판정된다.
            assertThat(evidence.mappings().getFirst().checks()).extracting(ReconciliationEvidence.CheckRecord::check,
                    ReconciliationEvidence.CheckRecord::column, ReconciliationEvidence.CheckRecord::status)
                    .containsExactlyInAnyOrder(
                            tuple("SOURCE_ROWS", null, "PASS"),
                            tuple("NON_NULL", "emp_no", "PASS"), tuple("SUM", "emp_no", "PASS"),
                            tuple("MIN_MAX", "emp_no", "PASS"),
                            tuple("NON_NULL", "emp_nm", "PASS"),
                            tuple("NON_NULL", "join_ymd", "PASS"), tuple("DOMAIN", "join_ymd", "PASS"),
                            tuple("NON_NULL", "hired_dt", "PASS"), tuple("MIN_MAX", "hired_dt", "PASS"),
                            tuple("NON_NULL", "salary_amt", "PASS"), tuple("SUM", "salary_amt", "PASS"),
                            tuple("MIN_MAX", "salary_amt", "PASS"),
                            tuple("NON_NULL", "stat_cd", "PASS"), tuple("CODE_DISTRIBUTION", "stat_cd", "PASS"),
                            tuple("NON_NULL", "dept_cd", "PASS"),
                            tuple("LOOKUP_NULL_FLOOR", "dept_nm", "PASS"),
                            tuple("NON_NULL", "updated_at", "PASS"), tuple("MIN_MAX", "updated_at", "PASS"),
                            tuple("NON_NULL", "rate", "PASS"), tuple("SUM", "rate", "PASS"),
                            tuple("MIN_MAX", "rate", "PASS"),
                            tuple("NON_NULL", "contract_dt", "PASS"),
                            tuple("SAMPLE", null, "PASS"));
            assertThat(evidence.mappings().getFirst().checks())
                    .filteredOn(check -> List.of("NON_NULL", "LOOKUP_NULL_FLOOR", "SAMPLE").contains(check.check()))
                    .extracting(ReconciliationEvidence.CheckRecord::check, ReconciliationEvidence.CheckRecord::column,
                            ReconciliationEvidence.CheckRecord::rows)
                    .as("Oracle 이 '' 를 NULL 로 둔 직원명·nullify 한 가입일·짝 없는 부서의 NULL 계정")
                    .contains(tuple("NON_NULL", "emp_nm", (long) (EMPLOYEES - EMPTY_NAMES)),
                            tuple("NON_NULL", "join_ymd", (long) (EMPLOYEES - O2_PLACEHOLDERS)),
                            tuple("LOOKUP_NULL_FLOOR", "dept_nm", (long) UNKNOWN_DEPT.size()));
            assertThat(evidence.mappings().getFirst().checks()).filteredOn(check -> "SAMPLE".equals(check.check()))
                    .singleElement().satisfies(sample -> {
                        assertThat(sample.columns()).as("직접·type·trim+codemap 컬럼만 재계산한다(nullify·조회·생성 키 제외)")
                                .isEqualTo(9);
                        assertThat(sample.rows()).isEqualTo(240L);
                    });
            // 판정하지 않은 검사는 설계상 대상 밖(조회·문자 합·비표준 도메인)과, 값은 그대로인데 날짜와 일시의 종류만 바뀌는
            //   계약 날짜의 최소·최대뿐이다 — 집계 실패·원천 타입 모름 같은 물러남 사유는 없다. nullify 한 가입일의 표본은 설계상
            //   사유 없이 빠진다(표본은 실행기의 NULL 대체를 다시 하지 않는다).
            assertThat(evidence.mappings().getFirst().notCovered()).extracting(ReconciliationEvidence.GapRecord::column,
                            ReconciliationEvidence.GapRecord::check, ReconciliationEvidence.GapRecord::reason)
                    .containsExactlyInAnyOrder(
                            tuple("emp_no", "DOMAIN", "NON_STANDARD_TARGET"),
                            tuple("emp_nm", "DOMAIN", "NON_STANDARD_TARGET"), tuple("emp_nm", "SUM", "TEXT_DEFERRED"),
                            tuple("emp_nm", "MIN_MAX", "TEXT_DEFERRED"),
                            tuple("hired_dt", "DOMAIN", "NON_STANDARD_TARGET"),
                            tuple("salary_amt", "DOMAIN", "NON_STANDARD_TARGET"),
                            tuple("dept_cd", "DOMAIN", "NON_STANDARD_TARGET"), tuple("dept_cd", "SUM", "TEXT_DEFERRED"),
                            tuple("dept_cd", "MIN_MAX", "TEXT_DEFERRED"),
                            tuple("dept_nm", "DOMAIN", "NON_STANDARD_TARGET"), tuple("dept_nm", "NON_NULL", "LOOKUP"),
                            tuple("dept_nm", "SAMPLE", "LOOKUP"),
                            tuple("grade_nm", "DOMAIN", "NON_STANDARD_TARGET"), tuple("grade_nm", "NON_NULL", "LOOKUP"),
                            tuple("grade_nm", "SAMPLE", "LOOKUP"),
                            tuple("updated_at", "DOMAIN", "NON_STANDARD_TARGET"),
                            tuple("rate", "DOMAIN", "NON_STANDARD_TARGET"),
                            tuple("contract_dt", "DOMAIN", "NON_STANDARD_TARGET"),
                            tuple("contract_dt", "MIN_MAX", "UNSUPPORTED_VALUE_TYPE"));
            assertThat(evidence.mappings().get(1).checks()).extracting(ReconciliationEvidence.CheckRecord::check,
                            ReconciliationEvidence.CheckRecord::column, ReconciliationEvidence.CheckRecord::status,
                            ReconciliationEvidence.CheckRecord::rows)
                    .containsExactlyInAnyOrder(tuple("SOURCE_ROWS", null, "PASS", (long) EMPLOYEES),
                            tuple("NON_NULL", "email_addr", "PASS", (long) (EMPLOYEES - NO_EMAIL)),
                            tuple("SAMPLE", null, "PASS", 240L));
            assertThat(evidence.mappings().get(1).checks()).filteredOn(check -> "SAMPLE".equals(check.check()))
                    .singleElement().satisfies(sample -> assertThat(sample.columns()).as("이메일만 재계산한다").isEqualTo(1));
            assertThat(evidence.mappings().get(1).notCovered()).extracting(ReconciliationEvidence.GapRecord::column,
                            ReconciliationEvidence.GapRecord::check, ReconciliationEvidence.GapRecord::reason)
                    .containsExactlyInAnyOrder(
                            tuple("emp_id", "DOMAIN", "NON_STANDARD_TARGET"), tuple("emp_id", "NON_NULL", "FKREF"),
                            tuple("emp_id", "SUM", "FKREF"), tuple("emp_id", "MIN_MAX", "FKREF"),
                            tuple("emp_id", "SAMPLE", "FKREF"),
                            tuple("email_addr", "DOMAIN", "NON_STANDARD_TARGET"),
                            tuple("email_addr", "SUM", "TEXT_DEFERRED"), tuple("email_addr", "MIN_MAX", "TEXT_DEFERRED"),
                            tuple("photo", "DOMAIN", "NON_STANDARD_TARGET"), tuple("photo", "NON_NULL", "LOB"),
                            tuple("photo", "SAMPLE", "LOB"));
            // 확장 표의 fkRef 는 물리 FK 로 증명된다(쓰기 세션이 origin 이고 RI 트리거가 켜져 있었다).
            assertThat(evidence.references()).extracting(ReconciliationEvidence.ReferenceRecord::child,
                            ReconciliationEvidence.ReferenceRecord::columns, ReconciliationEvidence.ReferenceRecord::parent,
                            ReconciliationEvidence.ReferenceRecord::method, ReconciliationEvidence.ReferenceRecord::status)
                    .containsExactly(tuple(o.extTarget(), List.of("emp_id"), r.targetTable(), "PROVEN", "PASS"));
            assertThat(evidence.uniqueIndexes()).hasSize(2)
                    .allSatisfy(index -> assertThat(index.status()).isEqualTo("PASS"));
            assertThat(evidence.orphanCandidates()).isEmpty();
            // D7 — 메타 허용값이 있는 상태 코드는 대상 컬럼 전체를 허용값과 대조하고, 대조 원천이 없는 비표준 코드는 서명 대상이다.
            assertThat(evidence.codeSets()).extracting(ReconciliationEvidence.CodeSetRecord::column,
                            ReconciliationEvidence.CodeSetRecord::source, ReconciliationEvidence.CodeSetRecord::status,
                            ReconciliationEvidence.CodeSetRecord::ledgerEntry)
                    .containsExactlyInAnyOrder(tuple("stat_cd", "ALLOWED_VALUES", "PASS", rows.get("EMP.STAT_CD").id()),
                            tuple("dept_cd", "UNRECONCILED", "UNRECONCILED", rows.get("EMP.DEPT_CD").id()));
            assertThat(evidence.codeSets()).extracting(ReconciliationEvidence.CodeSetRecord::column,
                            ReconciliationEvidence.CodeSetRecord::nonNullRows,
                            ReconciliationEvidence.CodeSetRecord::missingRows)
                    .as("대상 컬럼 전체(1,200행)를 대조했다 — 0행 대조의 공허한 PASS 가 아니다")
                    .containsExactlyInAnyOrder(tuple("stat_cd", (long) EMPLOYEES, null),
                            tuple("dept_cd", (long) EMPLOYEES, null));
            assertThat(evidence.codemapUse()).containsExactly(new ReconciliationEvidence.CodemapUseRecord(
                    r.targetTable(), "stat_cd", "stat_cd", EMPLOYEES, 0, 0, 0, List.of()));

            // 8. 실행 JSON 형식 5 — 대사 기록을 그대로 싣고 값·경로·접속 정보는 싣지 않는다.
            String commitText = MigrationExecutionArtifact.encode(plan, MigrationMode.COMMIT, "PASS", Instant.now(),
                    verified, results, outcome, new MigrationExecutionArtifact.ControlSchemaRecord(
                            before.appliedVersion() == null ? "none" : before.appliedVersion(), after.appliedVersion()));
            MigrationExecutionArtifact commit = json.readValue(commitText, MigrationExecutionArtifact.class);
            assertThat(commit.schemaVersion()).isEqualTo(5);
            assertThat(commit.reconciliation()).as("실행 JSON 이 대사 기록을 그대로 싣는다").isEqualTo(evidence);
            assertThat(commit.lookupMisses()).containsExactly(new MigrationExecutionArtifact.LookupMissRecord(
                    r.sourceTable(), "emp", "dept", UNKNOWN_DEPT.size()));
            assertThat(commit.archives()).singleElement().satisfies(archive -> {
                assertThat(archive.dumpOnly()).isTrue();
                assertThat(archive.rows()).isEqualTo(OLD_LOGS);
                assertThat(archive.file()).isEqualTo(outcome.dumps().getFirst().fileName());
            });
            Map<String, String> commitForbidden = o2Forbidden();
            commitForbidden.put("보관 디렉터리", dumps.toString());
            commitForbidden.put("보관 디렉터리(/ 구분)", dumps.toString().replace('\\', '/'));
            assertThat(leaks(commitText, commitForbidden)).as("COMMIT 실행 JSON 에 나온 원시 값·경로·접속 정보의 종류")
                    .isEmpty();
            assertThat(userNameLeaks(commitText)).as("COMMIT 실행 JSON 에서 schema 한정 이름 밖의 사용자 이름(덤프 파일 이름 등)")
                    .isZero();

            // 9. 대상 값 — 원천에서 따로 계산한 결과와 같다(어긋나면 위치만 보인다). 확장 표는 기본 표와 같은 대리키를 쓴다.
            assertThat(mismatches(expectedEmployeeRows(o), actualEmployeeRows(o)))
                    .as("표준화한 직원 행(번호|이름|가입일|입사일시|급여|상태|부서|부서명|직급명|변경시각|비율|계약일)이 원천 계산과"
                            + " 다른 위치").isEmpty();
            assertThat(sourceJdbc().queryForObject("SELECT COUNT(EMP_NM) FROM " + r.sourceTable(), Long.class))
                    .as("Oracle 은 '' 를 NULL 로 저장한다").isEqualTo(EMPLOYEES - EMPTY_NAMES);
            assertThat(targetJdbc().queryForObject("SELECT count(*) FROM " + r.targetTable() + " WHERE emp_nm IS NULL",
                    Long.class)).isEqualTo(EMPTY_NAMES);
            assertThat(targetJdbc().queryForObject("SELECT count(*) FROM " + r.targetTable()
                    + " WHERE dept_nm IS NULL AND dept_cd = 'D999'", Long.class)).isEqualTo(UNKNOWN_DEPT.size());
            assertThat(rowsOf(o.extTarget())).isEqualTo(EMPLOYEES);
            String sameRow = "SELECT count(*) FROM " + o.extTarget() + " e JOIN " + r.targetTable()
                    + " m ON m.emp_id = e.emp_id WHERE e.email_addr IS NOT DISTINCT FROM CASE WHEN %s %% 50 = 0 THEN NULL"
                    + " ELSE 'emp' || %s || '@example.test' END";
            assertThat(targetJdbc().queryForObject(sameRow.formatted("m.emp_no", "m.emp_no"), Long.class))
                    .as("확장 행은 같은 원천 행의 기본 행과 대리키를 함께 쓴다").isEqualTo(EMPLOYEES);
            assertThat(targetJdbc().queryForObject(sameRow.formatted("(m.emp_no + 1)", "(m.emp_no + 1)"), Long.class))
                    .as("대조군 — 다른 원천 행과 짝 지으면 맞는 행이 없다").isZero();
            assertThat(targetJdbc().queryForObject("SELECT count(*) FROM " + MigrationSchemaManager.CONTROL_SCHEMA
                    + ".tb_migration_key_map WHERE run_id = ? AND source_namespace = ?", Long.class,
                    spec.run().runId(), spec.run().sourceNamespace())).as("대리키는 원천 행마다 한 번 채번한다")
                    .isEqualTo(EMPLOYEES);
            assertThat(targetJdbc().queryForObject("SELECT count(*) FROM " + r.targetTable() + " WHERE emp_id NOT IN"
                    + " (SELECT new_key FROM " + MigrationSchemaManager.CONTROL_SCHEMA + ".tb_migration_key_map"
                    + " WHERE run_id = ? AND source_namespace = ?)", Long.class, spec.run().runId(),
                    spec.run().sourceNamespace())).isZero();
            assertThat(targetJdbc().queryForObject("SELECT count(*) FROM " + o.extTarget()
                    + " WHERE photo = '\\x89504e47'::bytea", Long.class)).isEqualTo(3L);
            assertThat(targetJdbc().queryForObject("SELECT count(*) FROM " + o.extTarget()
                    + " WHERE photo IS NOT NULL", Long.class)).isEqualTo(3L);

            // 10. 원천 집계 문장이 실패하면 COUNT 전용으로 물러난다. 실행기 순서(읽기 전용 → READ COMMITTED → autocommit 끔)로 연
            //   Oracle 트랜잭션에서 savepoint 를 만들고 되돌릴 수 있는지, 실패한 문장 뒤 같은 세션이 이어지는지 탐침이 관측하고
            //   (출력은 지원 여부·SQLSTATE·건수뿐), 실행기에 수치로 더할 수 없는 문자 컬럼의 합을 끼운 대사 계획을 넣어 본다.
            String table = r.sourceTable();
            try (Connection reader = ORACLE.createConnection("")) {
                reader.setReadOnly(true);
                reader.setTransactionIsolation(Connection.TRANSACTION_READ_COMMITTED);
                reader.setAutoCommit(false);
                Savepoint mark = null;
                String savepoint;
                try {
                    mark = reader.setSavepoint();
                    savepoint = "set";
                } catch (SQLException rejected) {
                    savepoint = "rejected(SQLSTATE=" + rejected.getSQLState() + ")";
                }
                String failedState = null;
                try (Statement statement = reader.createStatement();
                     ResultSet summed = statement.executeQuery("SELECT SUM(CAST(EMP_NM AS DECIMAL(38,0))) FROM " + table)) {
                    summed.next();
                } catch (SQLException failed) {
                    failedState = failed.getSQLState();
                }
                String rollback = "none";
                if (mark != null) {
                    try {
                        reader.rollback(mark);
                        rollback = "ok";
                    } catch (SQLException rejected) {
                        rollback = "rejected(SQLSTATE=" + rejected.getSQLState() + ")";
                    }
                }
                long continued = count(reader, table);
                String release = "none";
                if (mark != null) {
                    try {
                        reader.releaseSavepoint(mark);
                        release = "ok";
                    } catch (SQLException rejected) {
                        release = rejected.getClass().getSimpleName() + "(SQLSTATE=" + rejected.getSQLState() + ")";
                    }
                }
                reader.rollback();
                System.out.printf("O2 savepoint probe: read-only READ COMMITTED savepoint=%s failed aggregate SQLSTATE=%s"
                        + " rollback-to-savepoint=%s COUNT after=%d release=%s%n", savepoint, failedState, rollback,
                        continued, release);
                // 실행기의 물러남이 기대는 드라이버 사실을 고정한다 — 바뀌면 문서(readiness O2)와 함께 다시 판정한다.
                assertThat(savepoint).as("읽기 전용 READ COMMITTED 트랜잭션에서 savepoint 를 만든다").isEqualTo("set");
                assertThat(failedState).as("문자 컬럼의 수치 합은 Oracle 이 실행 중에 거절한다").isEqualTo("42000");
                assertThat(rollback).as("실패한 문장 뒤 savepoint 로 되돌린다").isEqualTo("ok");
                assertThat(release).as("savepoint 해제는 드라이버가 지원하지 않는다(실행기는 무시한다)")
                        .startsWith("SQLFeatureNotSupportedException");
                // Oracle 은 문장 단위로 되돌리므로 savepoint 가 없어도 이 수는 같다 — 세션이 살아 있다는 것만 보인다.
                assertThat(continued).as("실패한 문장 뒤에도 같은 읽기 트랜잭션이 이어진다").isEqualTo(EMPLOYEES);
            }
            ReconciliationPlan real = engine.reconciliation().plan();
            ReconciliationPlan.MappingPlan employeePlan = real.mappings().getFirst();
            List<ColumnCheck> probeColumns = new ArrayList<>(employeePlan.columns());
            probeColumns.add(new ColumnCheck("probe_sum", "emp_nm", new ColumnCheck.SourceColumnType(Types.VARCHAR,
                    "VARCHAR2", 50L, null), ColumnCheck.Aggregate.NUM, false, false, null, false, null, null, false, null,
                    List.of()));
            ReconciliationPlan.MappingPlan probePlan = new ReconciliationPlan.MappingPlan(employeePlan.label(),
                    employeePlan.source(), employeePlan.mappingId(), employeePlan.where(), employeePlan.target(),
                    probeColumns, employeePlan.targetPrimaryKey(), employeePlan.preservedKey(), employeePlan.isolates(),
                    employeePlan.generatedIdentity());
            ReconciliationRun fallback = ReconciliationRun.of(new ReconciliationPlan(true,
                            List.of(probePlan, real.mappings().get(1)), real.references(), real.startConstraints(),
                            real.mappedTables(), real.codeSets()),
                    new ColumnReplay(transformers, spec.codemaps()), null);
            ArchiveRun countedDumps = ArchiveRun.counting();
            List<TableResult> counted = executor.execute(spec, MigrationMode.DRY_RUN, sourceJdbc(), null, oraclePolicy(),
                    true, Map.of(), countedDumps, false, fallback);
            assertThat(counted).allSatisfy(result -> {
                assertThat(result.errors()).as("COUNT 전용으로 물러나 행을 읽는다").isEmpty();
                assertThat(result.read()).isEqualTo(EMPLOYEES);
            });
            SourceAggregates measured = fallback.source(probePlan.aggregateGroup());
            assertThat(measured.rows()).isEqualTo(EMPLOYEES);
            assertThat(measured.nonNull("emp_nm")).as("NULL 계정은 COUNT 전용 문장이 잰다").isEqualTo(EMPLOYEES - EMPTY_NAMES);
            assertThat(measured.aggregateGap("salary")).as("같은 묶음의 합·최소·최대는 판정하지 않는다")
                    .isEqualTo(CoverageReason.SOURCE_AGGREGATE_FAILED);
            assertThat(measured.aggregateGap("hired_dt")).isEqualTo(CoverageReason.SOURCE_AGGREGATE_FAILED);
            MigrationReport countedReport = verifier.verify(spec, counted, null, countedDumps.outcome(), fallback);
            assertThat(countedReport.ok()).as(countedReport.toSummary()).isTrue();
            assertThat(countedReport.reconciliation().mappings()).flatExtracting(ReconciliationEvidence.MappingRecord::checks)
                    .extracting(ReconciliationEvidence.CheckRecord::check, ReconciliationEvidence.CheckRecord::status)
                    .containsExactly(tuple("SOURCE_ROWS", "PASS"), tuple("SOURCE_ROWS", "PASS"));
        } finally {
            for (String table : List.of(r.sourceTable(), o.deptTable(), o.gradeTable(), o.logTable())) {
                sourceJdbc().execute("DROP TABLE " + table + " PURGE");
            }
        }
    }

    // ---------------------------------------------------------------------------------------------------------------

    private record Rehearsal(String sourceName, String sourceTable, String targetTable, Path directory,
                             MappingLoader loader, MigrationWorkflowRunner runner) {

        Path skeleton() {
            return directory.resolve("skeleton.yml");
        }

        Path inventory() {
            return directory.resolve("inventory.json");
        }

        Path profile() {
            return directory.resolve("profile.json");
        }

        Path suggestions() {
            return directory.resolve("suggestions.json");
        }

        Path draft() {
            return directory.resolve("term-ledger.draft.yml");
        }

        Path ledger() {
            return directory.resolve("term-ledger.yml");
        }

        Path mapping() {
            return directory.resolve("mapping.yml");
        }

        Path plan() {
            return directory.resolve("plan.json");
        }

        Path review() {
            return directory.resolve("review.yml");
        }

        /**
         * 승인 workflow 명령 하나. 원천 명령은 skeleton(생성 전)이나 만든 mapping(생성 뒤)을 접속 선언으로 쓴다 — 둘의
         * 접속 자리표시가 같아 inventory 의 원천 결속이 그대로다.
         */
        void command(String command, String... extra) {
            List<String> arguments = new ArrayList<>(List.of("--command=" + command));
            boolean generated = Files.exists(mapping()) && !command.equals("mapping-generate");
            Path declared = generated ? mapping() : skeleton();
            switch (command) {
                case "discover", "profile", "plan", "load" -> arguments.addAll(List.of("--mapping=" + declared,
                        "--inventory=" + inventory(), "--source-adapter=" + ADAPTER, "--schemas=" + owner(),
                        "--object-kinds=TABLE,COLUMN,PRIMARY_KEY"));
                case "term-suggest" -> arguments.add("--mapping=" + skeleton());
                case "mapping-generate" -> arguments.add("--inventory=" + inventory());
                default -> {
                    // validate 는 plan 만 받는다.
                }
            }
            if (List.of("plan", "validate", "load").contains(command)) {
                arguments.add("--plan=" + plan());
            }
            arguments.addAll(List.of(extra));
            runner.run(new DefaultApplicationArguments(arguments.toArray(String[]::new)));
        }
    }

    /**
     * 합성 원천 표(약 1,300행, 한글 COMMENT ON)와 대상 표, skeleton·실행기를 만든다. DDL·DML 은 19c 에도 있는 구문만
     * 썼다(19c 에서는 실행하지 않았다).
     *
     * <ul>
     *   <li>JOIN_YMD CHAR(8) — 자리표시 00000000 12행, 달력에 없는 20240231 3행(ID 10·600·1300), 공백 8자 5행</li>
     *   <li>LAST_LOGIN DATE — 자정이 아닌 시각, END_DT TIMESTAMP(6) — 소수 초가 든 시각</li>
     *   <li>USE_AT CHAR(1) — '1' 4행, STAT_CD CHAR(3) — 공백으로 채운 A·D, DEPT_CD — 짝 없는 D999 2행</li>
     *   <li>USER_NO 정밀도 없는 NUMBER 키, PHOTO BLOB·MEMO CLOB 은 앞 3행만 값이 있다</li>
     * </ul>
     */
    private Rehearsal rehearsal() throws Exception {
        String suffix = suffix();
        String sourceName = "LEG_USER_" + suffix;
        String sourceTable = owner() + "." + sourceName;
        String targetName = "tb_rh_user_" + suffix.toLowerCase(Locale.ROOT);
        String targetTable = "public." + targetName;
        JdbcTemplate oracle = sourceJdbc();
        oracle.execute("CREATE TABLE " + sourceTable + " (USER_NO NUMBER PRIMARY KEY, USER_NM VARCHAR2(50 CHAR),"
                + " JOIN_YMD CHAR(8), LAST_LOGIN DATE, END_DT TIMESTAMP(6), USE_AT CHAR(1), STAT_CD CHAR(3),"
                + " DEPT_CD VARCHAR2(10), PHOTO BLOB, MEMO CLOB)");
        oracle.update("INSERT INTO " + sourceTable
                + " (USER_NO, USER_NM, JOIN_YMD, LAST_LOGIN, END_DT, USE_AT, STAT_CD, DEPT_CD)"
                + " SELECT LEVEL, '사용자' || LEVEL,"
                + " CASE WHEN LEVEL IN (" + csv(INVALID_DATES) + ") THEN '20240231'"
                + " WHEN MOD(LEVEL, 100) = 50 AND LEVEL <= 1150 THEN '00000000'"
                + " WHEN LEVEL IN (" + csv(BLANK_DATES) + ") THEN '        '"
                + " ELSE TO_CHAR(DATE '2020-01-01' + LEVEL, 'YYYYMMDD') END,"
                + " DATE '2024-01-01' + LEVEL + (1 + MOD(LEVEL, 23)) / 24 + 7 / 1440,"
                + " TIMESTAMP '2025-01-01 00:00:00' + NUMTODSINTERVAL(LEVEL, 'DAY')"
                + " + NUMTODSINTERVAL(1 + MOD(LEVEL, 23), 'HOUR') + NUMTODSINTERVAL(0.25, 'SECOND'),"
                + " CASE WHEN LEVEL IN (" + csv(FLAG_ONE) + ") THEN '1' WHEN MOD(LEVEL, 10) = 0 THEN 'N' ELSE 'Y' END,"
                + " CASE WHEN MOD(LEVEL, 7) = 0 THEN 'D' ELSE 'A' END,"
                + " CASE WHEN LEVEL IN (11, 1111) THEN 'D999' ELSE 'D00' || TO_CHAR(MOD(LEVEL, 5) + 1) END"
                + " FROM DUAL CONNECT BY LEVEL <= " + ROWS);
        oracle.update("UPDATE " + sourceTable + " SET PHOTO = HEXTORAW('89504E47'), MEMO = TO_CLOB('메모 ' || USER_NO)"
                + " WHERE USER_NO <= 3");
        oracle.execute("COMMENT ON TABLE " + sourceTable + " IS '레거시 사용자'");
        Map<String, String> comments = Map.of("USER_NO", "사용자번호", "USER_NM", "사용자명", "JOIN_YMD", "가입일자",
                "LAST_LOGIN", "최종로그인일시", "END_DT", "종료일자", "USE_AT", "사용여부", "STAT_CD", "상태코드",
                "DEPT_CD", "부서코드", "PHOTO", "사진", "MEMO", "메모");
        for (Map.Entry<String, String> comment : comments.entrySet()) {
            oracle.execute("COMMENT ON COLUMN " + sourceTable + "." + comment.getKey() + " IS '" + comment.getValue()
                    + "'");
        }
        targetJdbc().execute("CREATE TABLE " + targetTable + " (user_no bigint GENERATED BY DEFAULT AS IDENTITY"
                + " PRIMARY KEY, user_nm varchar(100), join_ymd varchar(8), last_login_dt varchar(14),"
                + " end_ymd varchar(8), use_yn varchar(1), stat_cd varchar(3), dept_cd varchar(10), photo bytea,"
                + " memo_cn text)");

        Path directory = Files.createDirectory(temp.resolve("rehearsal"));
        Files.writeString(directory.resolve("skeleton.yml"), """
                source:
                  url: ${RH_SOURCE_URL}
                  username: ${RH_SOURCE_USER}
                  password: ${RH_SOURCE_PASSWORD}
                  driver: oracle.jdbc.OracleDriver
                  endpointId: disposable-oracle-source
                target:
                  url: ${RH_TARGET_URL}
                  username: ${RH_TARGET_USER}
                  password: ${RH_TARGET_PASSWORD}
                  driver: org.postgresql.Driver
                  endpointId: disposable-postgres-target
                run:
                  runId: %s
                  sourceNamespace: oracle-rehearsal-fixture
                tables:
                  - source: %s
                    target: %s
                    orderBy: USER_NO
                    targetKey: user_no
                    verify: {referencedBy: none, reason: 리허설 대상 키를 복사하는 표가 없다}
                codemaps:
                  use_at:
                    values: {"Y": "Y", "N": "N", "1": "Y"}
                  stat_cd:
                    values: {"A": "A01", "D": "A02"}
                """.formatted("rehearsal-" + suffix.toLowerCase(Locale.ROOT), sourceTable, targetTable),
                StandardCharsets.UTF_8);
        MappingSpec.DbConfig source = sourceConfig();
        MappingSpec.DbConfig target = targetConfig();
        Map<String, String> environment = Map.of(
                "RH_SOURCE_URL", source.url(), "RH_SOURCE_USER", source.username(),
                "RH_SOURCE_PASSWORD", source.password(), "RH_TARGET_URL", target.url(),
                "RH_TARGET_USER", target.username(), "RH_TARGET_PASSWORD", target.password());
        MappingLoader loader = new MappingLoader(environment::get);
        Path columns = directory.resolve("db-columns.json");
        json.writeValue(columns.toFile(), targetJdbc().queryForList(
                "SELECT table_schema || '.' || table_name AS table_name, column_name"
                        + " FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ?"
                        + " ORDER BY ordinal_position", targetName));
        SourceIntrospector introspector = new SourceIntrospector();
        MigrationWorkflowRunner runner = new MigrationWorkflowRunner(loader,
                new MappingValidator(transformers, columns.toString()), new EtlExecutor(introspector, transformers),
                new MigrationVerifier(), introspector, new SourceJdbcEndpointFactory(introspector), transformers);
        return new Rehearsal(sourceName, sourceTable, targetTable, directory, loader, runner);
    }

    /**
     * 초안 행을 확정한다. 표준 용어가 있는 컬럼은 초안의 용어·등급·적합성 추정을 그대로 쓰고, 용어가 없는 컬럼은 비표준
     * 대상(U1)이다. {@code maxRows} 는 달력에 없는 가입일의 승인 예외 상한이고, {@code trimCodes} 가 거짓이면 CHAR(3)
     * 상태 코드의 codemap 앞 trim 을 빼 둔다(R3 거부 시험). CHAR(1) 사용 여부는 선언 길이 1 이라 공백이 붙지 않아 늘 codemap
     * 만 쓴다.
     */
    private static TermLedger confirmed(Rehearsal r, Map<String, Entry> rows, long maxRows, boolean trimCodes) {
        String code = trimCodes ? "trim" : null;
        List<Entry> entries = List.of(
                nonStandard(r, rows.get("USER_NO"), "user_no", new Load(null, "long", null, List.of()),
                        "레거시 사용자 일련번호 — 표준 용어가 없는 대상 키"),
                standard(r, rows.get("USER_NM"), "user_nm", empty(), null, null),
                standard(r, rows.get("JOIN_YMD"), "join_ymd", new Load("ymd8", null, null, List.of(
                                new MappingSpec.Nullify(DomainViolation.PLACEHOLDER_DATE, (long) PLACEHOLDERS),
                                new MappingSpec.Nullify(DomainViolation.BLANK, (long) BLANK_DATES.size()))),
                        new ApprovedExceptions(maxRows, "달력에 없는 가입일 — 원천을 확인해 따로 정정한다",
                                List.of("INVALID_DATE")),
                        "자리표시·공백 가입일은 값이 없는 것으로 본다"),
                standard(r, rows.get("LAST_LOGIN"), "last_login_dt", new Load("ymdhms14", null, null, List.of()),
                        null, null),
                standard(r, rows.get("END_DT"), "end_ymd", new Load("ymd8-truncate", null, null, List.of()), null,
                        "종료 시각은 버리고 날짜만 둔다"),
                standard(r, rows.get("USE_AT"), "use_yn", new Load(null, null, "use_at", List.of()), null,
                        "레거시 플래그 1 은 사용(Y)으로 본다"),
                standard(r, rows.get("STAT_CD"), "stat_cd", new Load(code, null, "stat_cd", List.of()), null, null),
                nonStandard(r, rows.get("DEPT_CD"), "dept_cd", empty(), "부서 코드 — 표준 용어가 없는 대상"),
                nonStandard(r, rows.get("PHOTO"), "photo", empty(), "사진 — 표준 용어가 없는 대상"),
                nonStandard(r, rows.get("MEMO"), "memo_cn", new Load(null, "text", null, List.of()),
                        "메모 — 표준 용어가 없는 대상"));
        return new TermLedger(TermLedger.CURRENT_SCHEMA_VERSION, entries);
    }

    private static Entry standard(Rehearsal r, Entry draft, String targetColumn, Load load,
                                  ApprovedExceptions exceptions, String note) {
        return standard(draft, null, r.targetTable(), targetColumn, load, exceptions, note);
    }

    /** 초안의 용어·등급·적합성 추정을 그대로 쓰는 확정 행. {@code mapping} 은 나눈 매핑의 id 다(기본 매핑은 null). */
    private static Entry standard(Entry draft, String mapping, String targetTable, String targetColumn, Load load,
                                  ApprovedExceptions exceptions, String note) {
        assertThat(draft.term()).as(draft.source().column() + " 의 초안 용어").isNotNull();
        assertThat(draft.term().engAbbr()).isEqualToIgnoringCase(targetColumn);
        Conformance estimate = draft.conformance();
        Conformance conformance = new Conformance(estimate.rate(), estimate.unmeasured(), estimate.transform(),
                estimate.violations(), exceptions);
        return new Entry(draft.id(), draft.source(), mapping, null, new ColumnRef(targetTable, targetColumn),
                draft.term(), null, draft.grade(), "CONFIRMED", load, conformance, null, note, CONFIRMED);
    }

    private static Entry nonStandard(Rehearsal r, Entry draft, String targetColumn, Load load, String reason) {
        return nonStandard(draft, null, null, r.targetTable(), targetColumn, load, reason);
    }

    /** 비표준 대상(U1) 확정 행. {@code mapping} 은 나눈 매핑의 id, {@code via} 는 조회 경로다(둘 중 하나만 둔다). */
    private static Entry nonStandard(Entry draft, String mapping, TermLedger.Via via, String targetTable,
                                     String targetColumn, Load load, String reason) {
        return new Entry(draft.id(), draft.source(), mapping, via, new ColumnRef(targetTable, targetColumn), null,
                new NonStandardTarget(reason), draft.grade(), "CONFIRMED", load, null, null, null, CONFIRMED);
    }

    /** 이관 제외 — 조회 키·정렬 키로만 쓰는 컬럼. */
    private static Entry ignored(Entry draft, String note) {
        return new Entry(draft.id(), draft.source(), null, null, null, null, null, draft.grade(), "APPROVED_IGNORE",
                null, null, null, note, IGNORED);
    }

    /** 외부 보관 — 덤프 전체(정렬 키 값 포함)의 개인정보 모양 확인을 함께 둔다. */
    private static Entry archived(Entry draft) {
        return new Entry(draft.id(), draft.source(), null, null, null, null, null, draft.grade(), "ARCHIVE", null, null,
                new TermLedger.Archive(RETAIN_UNTIL, TermLedger.Archive.PERSONAL_DATA_ACKNOWLEDGED), null, ARCHIVED);
    }

    /**
     * O2 원장. 직원 번호는 기본 매핑에서 정수 값으로 옮기고, 확장 매핑에서는 대리키를 함께 쓰는 fkRef 컬럼이 된다 — 같은 원천
     * 컬럼의 확정 행이 매핑마다 하나씩이라 둘째 행은 초안 id 에 {@code .ext} 를 붙인다. 표준 용어는 가입일자·상태코드뿐이고
     * 나머지는 비표준 대상(U1)이다.
     */
    private static TermLedger o2Ledger(O2 o, Map<String, Entry> rows) {
        String main = o.rehearsal().targetTable();
        String ext = o.extTarget();
        Entry key = rows.get("EMP.EMP_NO");
        Entry sharedKey = new Entry(key.id() + ".ext", key.source(), null, null, null, null, null, key.grade(),
                "PROPOSED", null, null, null, null, List.of());
        List<Entry> entries = List.of(
                nonStandard(key, "emp", null, main, "emp_no", new Load(null, "long", null, List.of()),
                        "직원 번호 — 표준 용어가 없는 대상"),
                nonStandard(sharedKey, "emp_ext", null, ext, "emp_id", empty(),
                        "확장 표가 기본 표와 함께 쓰는 대리키 — 표준 용어가 없는 대상 키"),
                nonStandard(rows.get("EMP.EMP_NM"), "emp", null, main, "emp_nm", empty(),
                        "직원 이름 — 표준 용어가 없는 대상"),
                standard(rows.get("EMP.JOIN_YMD"), "emp", main, "join_ymd", new Load("ymd8", null, null, List.of(
                                new MappingSpec.Nullify(DomainViolation.PLACEHOLDER_DATE, (long) O2_PLACEHOLDERS))),
                        null, "자리표시 가입일은 값이 없는 것으로 본다"),
                nonStandard(rows.get("EMP.HIRED_DT"), "emp", null, main, "hired_dt", empty(),
                        "입사 일시 — 표준 용어가 없는 대상"),
                nonStandard(rows.get("EMP.SALARY"), "emp", null, main, "salary_amt", empty(),
                        "급여 — 표준 용어가 없는 대상"),
                standard(rows.get("EMP.STAT_CD"), "emp", main, "stat_cd", new Load("trim", null, "stat_cd", List.of()),
                        null, null),
                nonStandard(rows.get("EMP.DEPT_CD"), "emp", null, main, "dept_cd", empty(),
                        "부서 코드 — 표준 용어가 없는 대상"),
                ignored(rows.get("EMP.GRADE_NO"), "직급 조회의 키로만 쓴다"),
                nonStandard(rows.get("EMP.EMAIL"), "emp_ext", null, ext, "email_addr", empty(),
                        "이메일 — 확장 표로 나눈다, 표준 용어가 없는 대상"),
                nonStandard(rows.get("EMP.PHOTO"), "emp_ext", null, ext, "photo", empty(),
                        "사진 — 확장 표로 나눈다, 표준 용어가 없는 대상"),
                nonStandard(rows.get("EMP.UPDATED_AT"), "emp", null, main, "updated_at", empty(),
                        "변경 시각 — 표준 용어가 없는 대상"),
                nonStandard(rows.get("EMP.RATE"), "emp", null, main, "rate", empty(),
                        "배분 비율 — 표준 용어가 없는 대상"),
                nonStandard(rows.get("EMP.CONTRACT_DT"), "emp", null, main, "contract_dt",
                        new Load(null, "date", null, List.of()), "계약 날짜 — 표준 용어가 없는 대상"),
                ignored(rows.get("DEPT.DEPT_CD"), "부서 조회의 키로만 쓴다"),
                nonStandard(rows.get("DEPT.DEPT_NM"), null, new TermLedger.Via("emp", "dept"), main, "dept_nm",
                        empty(), "부서 이름 — 조회로 모은다, 표준 용어가 없는 대상"),
                ignored(rows.get("GRADE.GRADE_NO"), "직급 조회의 키로만 쓴다"),
                nonStandard(rows.get("GRADE.GRADE_NM"), null, new TermLedger.Via("emp", "grade"), main, "grade_nm",
                        empty(), "직급 이름 — 조회로 모은다, 표준 용어가 없는 대상"),
                ignored(rows.get("LOG.LOG_NO"), "덤프 행의 정렬 키로만 쓴다"),
                archived(rows.get("LOG.LOG_AT")),
                archived(rows.get("LOG.RAW_DATA")),
                archived(rows.get("LOG.AMOUNT")));
        return new TermLedger(TermLedger.CURRENT_SCHEMA_VERSION, entries);
    }

    private static Load empty() {
        return new Load(null, null, null, List.of());
    }

    /** 원장만 바꿔 다른 디렉터리에서 mapping 을 다시 만든다. 생성기가 거부하면 그 실패가 그대로 나간다. */
    private MappingSpec regenerate(Rehearsal r, Map<String, Entry> rows, String name, long maxRows, boolean trimCodes)
            throws Exception {
        Path directory = Files.createDirectory(r.directory().resolve(name));
        Path ledger = directory.resolve("term-ledger.yml");
        Files.writeString(ledger, new LedgerDraftWriter().write(confirmed(r, rows, maxRows, trimCodes)),
                StandardCharsets.UTF_8);
        Path mapping = directory.resolve("mapping.yml");
        r.runner().run(new DefaultApplicationArguments(new String[] {"--command=mapping-generate",
                "--skeleton=" + r.skeleton(), "--ledger=" + ledger, "--inventory=" + r.inventory(),
                "--mapping=" + mapping}));
        return r.loader().load(mapping);
    }

    private void reviewAndValidate(Rehearsal r) throws Exception {
        reviewAndValidate(r, r.targetTable(), Set.of());
    }

    /**
     * plan → review → plan → validate. 매핑한 원천 표는 AUTO_DATA_LOAD({@code mappedTarget} 이 null 이면 플래너가 매핑의 대상을
     * 쓴다 — 나눈 매핑은 둘), {@code lookups} 에 이름이 있는 표는 LOOKUP_INPUT, 나머지 객체는 EXPORT_ONLY 다.
     */
    private void reviewAndValidate(Rehearsal r, String mappedTarget, Set<String> lookups) throws Exception {
        r.command("plan");
        MigrationPlan draft = plans.read(Files.readString(r.plan()));
        assertThat(draft.commitReady()).isFalse();
        assertThatThrownBy(() -> r.command("validate"))
                .isInstanceOf(MigrationExecutionException.class).hasMessageContaining("commitReady=false");
        CatalogSnapshot snapshot = inventories.readEnvelope(Files.readString(r.inventory())).payload().toSnapshot();
        Map<String, DispositionDecision> decisions = new LinkedHashMap<>();
        for (CatalogObject object : snapshot.objects()) {
            boolean table = object.kind() == ObjectKind.TABLE;
            boolean mapped = table && object.name().equals(r.sourceName());
            boolean lookup = table && lookups.contains(object.name());
            decisions.put(object.stableId(), new DispositionDecision(
                    mapped ? ObjectDisposition.AUTO_DATA_LOAD
                            : lookup ? ObjectDisposition.LOOKUP_INPUT : ObjectDisposition.EXPORT_ONLY,
                    mapped ? mappedTarget : null, true, "Disposable Oracle standardization rehearsal review"));
        }
        new YAMLMapper().writeValue(r.review().toFile(), new WorkflowReview(WorkflowReview.CURRENT_SCHEMA_VERSION,
                draft.sourceInventoryDigest(), draft.targetSchemaDigest(), draft.mappingDigest(),
                draft.executionContractDigest(), decisions));
        r.command("plan", "--review=" + r.review());
        MigrationPlan reviewed = plans.read(Files.readString(r.plan()));
        assertThat(reviewed.readiness().blockers()).isEmpty();
        assertThat(reviewed.commitReady()).isTrue();
        r.command("validate");
    }

    /** 승인 workflow 밑의 엔진 — load 와 같은 live 대상 계약으로 값 한계 가드를 정한다. */
    private List<TableResult> engine(Rehearsal r, MappingSpec spec, MigrationMode mode, CatalogSnapshot inventory,
                                     ArchiveRun archives) throws Exception {
        Map<String, Map<String, TargetValueGuard.Limit>> guards;
        try (Connection connection = targetJdbc().getDataSource().getConnection()) {
            TargetSchemaFingerprint target = new PostgresTargetSchemaFingerprinter()
                    .fingerprintBound(connection, spec, Set.of("public"));
            guards = new MappingValidator(transformers, r.directory().resolve("db-columns.json").toString())
                    .rowGuards(spec, target, inventory);
        }
        return executor.execute(spec, mode, sourceJdbc(), mode == MigrationMode.COMMIT ? targetJdbc() : null,
                oraclePolicy(), true, guards, archives == null ? ArchiveRun.counting() : archives);
    }

    /** 엔진 COMMIT 의 결과와 그 실행의 대사 수집. */
    private record ReconciledEngine(List<TableResult> results, ReconciliationRun reconciliation) {}

    /**
     * 대사를 켠 엔진 COMMIT — 승인 load 와 같은 순서다. 승인 plan 의 대상 fingerprint(제약 스냅숏 포함)를 다시 읽어 같은지 보고,
     * 그 live 계약으로 값 한계 가드를, 승인 load 와 같은 조립({@link MigrationWorkflowRunner#approvedReconciliationPlan} —
     * 원장 검증·live 표준 용어·공통코드 쓰기 전 게이트 → {@link ReconciliationPlanner})으로 대사 계획을 만든다. 대상 질의는
     * PostgreSQL 대상에 보낸다.
     */
    private ReconciledEngine reconciledEngine(Rehearsal r, MappingSpec spec, CatalogSnapshot inventory,
                                              MigrationPlan plan, ArchiveRun archives) throws Exception {
        Map<String, Map<String, TargetValueGuard.Limit>> guards;
        TargetSchemaFingerprint target;
        try (Connection connection = targetJdbc().getDataSource().getConnection()) {
            target = new PostgresTargetSchemaFingerprinter().fingerprintBound(connection, spec, Set.of("public"));
            assertThat(target.digest()).as("승인 plan 의 대상 fingerprint 와 같다").isEqualTo(plan.targetSchemaDigest());
            guards = new MappingValidator(transformers, r.directory().resolve("db-columns.json").toString())
                    .rowGuards(spec, target, inventory);
        }
        assertThat(CodeSetPrecheck.requiredGroups(spec, ProductCodeBindings.ALL, "public"))
                .as("제품 공통코드 바인딩 컬럼을 쓰지 않는다").isEmpty();
        WorkflowCliOptions options = WorkflowCliOptions.parse(new DefaultApplicationArguments(new String[] {
                "--command=load", "--mapping=" + r.mapping(), "--inventory=" + r.inventory(), "--plan=" + r.plan(),
                "--mode=commit"}));
        ReconciliationPlan reconciliation = r.runner().approvedReconciliationPlan(options, spec, inventory, target);
        ReconciliationRun run = ReconciliationRun.of(reconciliation, new ColumnReplay(transformers, spec.codemaps()),
                new PostgresReconciliationQueries(targetJdbc()));
        List<TableResult> results = executor.execute(spec, MigrationMode.COMMIT, sourceJdbc(), targetJdbc(),
                oraclePolicy(), true, guards, archives, false, run);
        return new ReconciledEngine(results, run);
    }

    /**
     * 같은 skeleton·대상 계약으로 접속 사용자 이름만 바꾼 리허설(새 디렉터리). 원천 접속은 같은 계정이다 — Oracle 은 따옴표 없이
     * 만든 사용자 이름을 대소문자 없이 받는다.
     */
    private Rehearsal withSourceUser(Rehearsal r, String username) throws Exception {
        Path directory = Files.createDirectory(r.directory().resolveSibling(r.directory().getFileName() + "-user"));
        Files.copy(r.skeleton(), directory.resolve("skeleton.yml"));
        MappingSpec.DbConfig source = sourceConfig();
        MappingSpec.DbConfig target = targetConfig();
        Map<String, String> environment = Map.of(
                "RH_SOURCE_URL", source.url(), "RH_SOURCE_USER", username,
                "RH_SOURCE_PASSWORD", source.password(), "RH_TARGET_URL", target.url(),
                "RH_TARGET_USER", target.username(), "RH_TARGET_PASSWORD", target.password());
        MappingLoader loader = new MappingLoader(environment::get);
        SourceIntrospector introspector = new SourceIntrospector();
        MigrationWorkflowRunner runner = new MigrationWorkflowRunner(loader,
                new MappingValidator(transformers, r.directory().resolve("db-columns.json").toString()),
                new EtlExecutor(introspector, transformers), new MigrationVerifier(), introspector,
                new SourceJdbcEndpointFactory(introspector), transformers);
        return new Rehearsal(r.sourceName(), r.sourceTable(), r.targetTable(), directory, loader, runner);
    }

    /** O2 리허설 — 직원 표(나누고 조회한다)·부서·직급(조회만 한다)·옛 로그(덤프만 한다) 원천과 두 대상 표. */
    private record O2(Rehearsal rehearsal, String extTarget, String deptName, String deptTable, String gradeName,
                      String gradeTable, String logName, String logTable) {}

    /**
     * O2 원천 표 넷(한글 COMMENT ON)과 대상 표 둘, skeleton·실행기를 만든다. DDL·DML 은 19c 에도 있는 구문만 썼다(19c 에서는
     * 실행하지 않았다).
     *
     * <ul>
     *   <li>LEG_EMP — 정밀도 없는 NUMBER 키, '' 로 넣은 이름 12행(Oracle 은 NULL 로 저장), 자리표시 가입일 8행, 자정이 아닌 DATE,
     *       NUMBER(12,2) 급여, 공백으로 채운 CHAR(3) 상태, 짝 없는 부서 코드(D999) 2행, NUMBER(3) 직급 번호, 이메일 없는 24행,
     *       앞 3행만 값이 있는 BLOB, 마이크로초가 든 TIMESTAMP(6)(원천 최소·최대가 R1 을 지난다), 소수가 든 정밀도 없는
     *       NUMBER(합이 캐스트 없는 {@code SUM(col)} 이어야 맞는다), 자정인 DATE({@code type: date} 로 date 에 옮긴다)</li>
     *   <li>LEG_DEPT(VARCHAR2 키)·LEG_GRADE(NUMBER(10,0) 키) — 조회만 한다</li>
     *   <li>LEG_LOG_OLD — TIMESTAMP(6)·RAW·NUMBER(12,2), 적재하지 않고 덤프만 한다</li>
     * </ul>
     *
     * <p>대상 확장 표는 기본 표의 대리키를 물리 FK 로 가리킨다.</p>
     */
    private O2 o2Rehearsal() throws Exception {
        String suffix = suffix();
        String lower = suffix.toLowerCase(Locale.ROOT);
        String empName = "LEG_EMP_" + suffix;
        String deptName = "LEG_DEPT_" + suffix;
        String gradeName = "LEG_GRADE_" + suffix;
        String logName = "LEG_LOG_OLD_" + suffix;
        String emp = owner() + "." + empName;
        String dept = owner() + "." + deptName;
        String grade = owner() + "." + gradeName;
        String log = owner() + "." + logName;
        String empTarget = "public.tb_rh_emp_" + lower;
        String extTarget = "public.tb_rh_emp_ext_" + lower;
        JdbcTemplate oracle = sourceJdbc();
        oracle.execute("CREATE TABLE " + dept + " (DEPT_CD VARCHAR2(10) PRIMARY KEY, DEPT_NM VARCHAR2(50 CHAR))");
        oracle.update("INSERT INTO " + dept + " SELECT 'D00' || LEVEL, '부서D00' || LEVEL FROM DUAL CONNECT BY LEVEL <= 5");
        oracle.execute("CREATE TABLE " + grade + " (GRADE_NO NUMBER(10,0) PRIMARY KEY, GRADE_NM VARCHAR2(30 CHAR))");
        oracle.update("INSERT INTO " + grade + " SELECT LEVEL, '직급' || LEVEL FROM DUAL CONNECT BY LEVEL <= 9");
        oracle.execute("CREATE TABLE " + emp + " (EMP_NO NUMBER PRIMARY KEY, EMP_NM VARCHAR2(50 CHAR), JOIN_YMD CHAR(8),"
                + " HIRED_DT DATE, SALARY NUMBER(12,2), STAT_CD CHAR(3), DEPT_CD VARCHAR2(10), GRADE_NO NUMBER(3),"
                + " EMAIL VARCHAR2(100), PHOTO BLOB, UPDATED_AT TIMESTAMP(6), RATE NUMBER, CONTRACT_DT DATE)");
        oracle.update("INSERT INTO " + emp
                + " (EMP_NO, EMP_NM, JOIN_YMD, HIRED_DT, SALARY, STAT_CD, DEPT_CD, GRADE_NO, EMAIL, UPDATED_AT, RATE,"
                + " CONTRACT_DT)"
                + " SELECT LEVEL, CASE WHEN MOD(LEVEL, 97) = 0 THEN '' ELSE '직원' || LEVEL END,"
                + " CASE WHEN MOD(LEVEL, 150) = 75 THEN '00000000'"
                + " ELSE TO_CHAR(DATE '2015-01-01' + LEVEL, 'YYYYMMDD') END,"
                + " DATE '2010-03-01' + LEVEL * 3 + (1 + MOD(LEVEL, 23)) / 24 + 11 / 1440,"
                + " LEVEL * 1000 + MOD(LEVEL, 100) / 100,"
                + " CASE WHEN MOD(LEVEL, 7) = 0 THEN 'D' ELSE 'A' END,"
                + " CASE WHEN LEVEL IN (" + csv(UNKNOWN_DEPT) + ") THEN 'D999' ELSE 'D00' || TO_CHAR(MOD(LEVEL, 5) + 1) END,"
                + " MOD(LEVEL, 9) + 1,"
                + " CASE WHEN MOD(LEVEL, 50) = 0 THEN NULL ELSE 'emp' || LEVEL || '@example.test' END,"
                + " TIMESTAMP '2020-06-01 00:00:00' + NUMTODSINTERVAL(LEVEL * 53, 'MINUTE')"
                + " + NUMTODSINTERVAL(LEVEL / 1000000, 'SECOND'),"
                + " LEVEL / 8,"
                + " DATE '2018-01-01' + LEVEL"
                + " FROM DUAL CONNECT BY LEVEL <= " + EMPLOYEES);
        oracle.update("UPDATE " + emp + " SET PHOTO = HEXTORAW('89504E47') WHERE EMP_NO <= 3");
        oracle.execute("CREATE TABLE " + log + " (LOG_NO NUMBER(10) PRIMARY KEY, LOG_AT TIMESTAMP(6), RAW_DATA RAW(16),"
                + " AMOUNT NUMBER(12,2))");
        oracle.update("INSERT INTO " + log + " SELECT LEVEL, TIMESTAMP '2019-01-01 00:00:00'"
                + " + NUMTODSINTERVAL(LEVEL * 37, 'MINUTE') + NUMTODSINTERVAL(LEVEL / 1000000, 'SECOND'),"
                + " HEXTORAW(LPAD(TO_CHAR(LEVEL, 'FMXXXXXXXX'), 8, '0')), LEVEL * 10.25"
                + " FROM DUAL CONNECT BY LEVEL <= " + OLD_LOGS);
        Map<String, Map<String, String>> comments = new LinkedHashMap<>();
        comments.put(emp, Map.of("", "레거시 직원", "EMP_NO", "직원번호", "EMP_NM", "직원명", "JOIN_YMD", "가입일자",
                "HIRED_DT", "입사일시", "SALARY", "급여", "STAT_CD", "상태코드", "DEPT_CD", "부서코드", "GRADE_NO",
                "직급번호", "EMAIL", "이메일"));
        comments.put(dept, Map.of("", "레거시 부서", "DEPT_CD", "부서코드", "DEPT_NM", "부서명"));
        comments.put(grade, Map.of("", "레거시 직급", "GRADE_NO", "직급번호", "GRADE_NM", "직급명"));
        comments.put(log, Map.of("", "레거시 옛 접속 로그", "LOG_NO", "로그번호", "LOG_AT", "기록일시", "RAW_DATA",
                "원시자료", "AMOUNT", "금액"));
        for (Map.Entry<String, Map<String, String>> table : comments.entrySet()) {
            for (Map.Entry<String, String> comment : table.getValue().entrySet()) {
                oracle.execute(comment.getKey().isEmpty()
                        ? "COMMENT ON TABLE " + table.getKey() + " IS '" + comment.getValue() + "'"
                        : "COMMENT ON COLUMN " + table.getKey() + "." + comment.getKey() + " IS '" + comment.getValue()
                        + "'");
            }
        }
        for (Map.Entry<String, String> comment : Map.of("PHOTO", "사진", "UPDATED_AT", "변경시각", "RATE", "배분비율",
                "CONTRACT_DT", "계약날짜").entrySet()) {
            oracle.execute("COMMENT ON COLUMN " + emp + "." + comment.getKey() + " IS '" + comment.getValue() + "'");
        }
        targetJdbc().execute("CREATE TABLE " + empTarget + " (emp_id varchar(20) PRIMARY KEY, emp_no bigint,"
                + " emp_nm varchar(50), join_ymd varchar(8), hired_dt timestamp, salary_amt numeric(12,2),"
                + " stat_cd varchar(3), dept_cd varchar(10), dept_nm varchar(50), grade_nm varchar(30),"
                + " updated_at timestamp(6), rate numeric, contract_dt date)");
        targetJdbc().execute("CREATE TABLE " + extTarget + " (emp_id varchar(20) PRIMARY KEY REFERENCES " + empTarget
                + " (emp_id), email_addr varchar(100), photo bytea)");

        Path directory = Files.createDirectory(temp.resolve("rehearsal"));
        Files.writeString(directory.resolve("skeleton.yml"), """
                source:
                  url: ${RH_SOURCE_URL}
                  username: ${RH_SOURCE_USER}
                  password: ${RH_SOURCE_PASSWORD}
                  driver: oracle.jdbc.OracleDriver
                  endpointId: disposable-oracle-source
                target:
                  url: ${RH_TARGET_URL}
                  username: ${RH_TARGET_USER}
                  password: ${RH_TARGET_PASSWORD}
                  driver: org.postgresql.Driver
                  endpointId: disposable-postgres-target
                run:
                  runId: rehearsal-o2-%1$s
                  sourceNamespace: oracle-rehearsal-o2-fixture
                tables:
                  - source: %2$s
                    id: emp
                    target: %3$s
                    orderBy: EMP_NO
                    idStrategy: {column: emp_id, generator: EMP_, sourceKey: EMP_NO}
                    lookups:
                      - {alias: dept, source: %4$s, key: {from: DEPT_CD, to: DEPT_CD}, cardinality: at_most_one, maxMissing: 2}
                      - {alias: grade, source: %5$s, key: {from: GRADE_NO, to: GRADE_NO}, cardinality: exactly_one}
                  - source: %2$s
                    id: emp_ext
                    target: %6$s
                    orderBy: EMP_NO
                    targetKey: emp_id
                    columns:
                      - {source: EMP_NO, target: emp_id, fkRef: %2$s}
                archives:
                  - {source: %7$s, orderByKeys: [LOG_NO]}
                codemaps:
                  stat_cd:
                    values: {"A": "A01", "D": "A02"}
                """.formatted(lower, emp, empTarget, dept, grade, extTarget, log), StandardCharsets.UTF_8);
        MappingSpec.DbConfig source = sourceConfig();
        MappingSpec.DbConfig target = targetConfig();
        Map<String, String> environment = Map.of(
                "RH_SOURCE_URL", source.url(), "RH_SOURCE_USER", source.username(),
                "RH_SOURCE_PASSWORD", source.password(), "RH_TARGET_URL", target.url(),
                "RH_TARGET_USER", target.username(), "RH_TARGET_PASSWORD", target.password());
        MappingLoader loader = new MappingLoader(environment::get);
        Path columns = directory.resolve("db-columns.json");
        json.writeValue(columns.toFile(), targetJdbc().queryForList(
                "SELECT table_schema || '.' || table_name AS table_name, column_name"
                        + " FROM information_schema.columns WHERE table_schema = 'public' AND table_name IN (?, ?)"
                        + " ORDER BY table_name, ordinal_position", "tb_rh_emp_" + lower, "tb_rh_emp_ext_" + lower));
        SourceIntrospector introspector = new SourceIntrospector();
        MigrationWorkflowRunner runner = new MigrationWorkflowRunner(loader,
                new MappingValidator(transformers, columns.toString()), new EtlExecutor(introspector, transformers),
                new MigrationVerifier(), introspector, new SourceJdbcEndpointFactory(introspector), transformers);
        return new O2(new Rehearsal(empName, emp, empTarget, directory, loader, runner), extTarget, deptName, dept,
                gradeName, grade, logName, log);
    }

    /**
     * O2 산출물에 나오면 안 되는 문자열 — 원시 값(이름·이메일·부서명·직급명·자리표시 가입일, 키 7 행의 급여·입사 일시와 덤프만
     * 하는 표의 기록 일시·RAW)과 일회용 접속 정보. 접속 사용자 이름은 {@link #userNameLeaks} 가 따로 본다.
     */
    private static Map<String, String> o2Forbidden() {
        Map<String, String> probes = new LinkedHashMap<>();
        probes.put("직원 이름", "직원7");
        probes.put("이메일", "emp7@example.test");
        probes.put("부서 이름", "부서D001");
        probes.put("직급 이름", "직급3");
        probes.put("자리표시 가입일", "00000000");
        probes.put("급여", "7000.07");
        probes.put("입사 일시(ISO)", "2010-03-22T08:11");
        probes.put("입사 일시", "2010-03-22 08:11");
        probes.put("덤프 기록 일시", LOG_BASE.plusMinutes(37L * 7).plusNanos(7000L).toString());
        probes.put("덤프 RAW", Base64.getEncoder().encodeToString(ByteBuffer.allocate(4).putInt(7).array()));
        probes.put("원천 JDBC URL", ORACLE.getJdbcUrl());
        probes.put("원천 비밀번호", ORACLE.getPassword());
        probes.put("대상 JDBC URL", POSTGRES.getJdbcUrl());
        probes.put("대상 비밀번호", POSTGRES.getPassword());
        return probes;
    }

    /**
     * 접속 사용자 이름이 나온 곳의 수(대소문자 무시). Oracle 은 owner 로 로그인해야 가시성을 증명하므로 schema 식별자 — Oracle 이
     * 저장한 대문자 그대로, 앞뒤에 식별자 문자가 없는 것({@code OWNER.표}, 그 꼴로 시작하는 원장 행 id, 프로파일의 schema 값) —
     * 에는 사용자 이름이 늘 있다. 그 꼴만 빼고 센다. 보관 id 처럼 다른 대소문자로 바꾸거나 다른 이름에 이어 붙인 사본은 남아서
     * 센다. 승인 workflow 의 credential 검사는 설정에 적은 그대로(대소문자 구분) 찾으므로 이 검사가 더 엄격하다(GAP-MIG-001).
     */
    private static int userNameLeaks(String text) {
        String schema = "(?<![\\p{L}\\p{N}_$#])" + Pattern.quote(owner()) + "(?![\\p{L}\\p{N}_$#])";
        String rest = Pattern.compile(schema).matcher(text).replaceAll("");
        return (int) Pattern.compile("(?i)" + Pattern.quote(sourceConfig().username())).matcher(rest).results().count();
    }

    /**
     * 덤프 파일을 원천 fixture 와 대조해 어긋난 위치(1부터, 최대 5개)를 돌려준다. 값은 싣지 않는다. 기록 일시는 ISO 지역 일시,
     * RAW 는 {@code {"$base64": …}}, NUMBER(12,2) 는 지수 없는 수로 써야 한다.
     */
    private static List<String> dumpMismatches(Path file) throws Exception {
        ObjectMapper exact = new ObjectMapper().enable(DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS);
        List<String> lines = Files.readAllLines(file, StandardCharsets.UTF_8);
        List<String> problems = new ArrayList<>();
        List<String> header = new ArrayList<>();
        exact.readTree(lines.getFirst()).path("columns").forEach(name -> header.add(name.asText()));
        if (!header.equals(List.of("LOG_AT", "RAW_DATA", "AMOUNT"))) {
            problems.add("header columns");
        }
        if (lines.size() != OLD_LOGS + 1) {
            problems.add("rows " + (lines.size() - 1) + " != " + OLD_LOGS);
        }
        for (int index = 1; index < lines.size() && problems.size() < 5; index++) {
            JsonNode row = exact.readTree(lines.get(index));
            long key = row.path("k").path(0).asLong();
            JsonNode values = row.path("v");
            JsonNode amount = values.path("AMOUNT");
            // 원문 토큰 — 4100 처럼 끝이 0 인 값을 드라이버가 음수 scale 로 주면 지수 표기가 될 수 있다.
            Matcher amountToken = AMOUNT_TOKEN.matcher(lines.get(index));
            boolean same = key == index
                    && amountToken.find() && amountToken.group(1).chars().noneMatch(c -> c == 'e' || c == 'E')
                    && LOG_BASE.plusMinutes(37L * key).plusNanos(key * 1000L).toString()
                    .equals(values.path("LOG_AT").asText(null))
                    && Base64.getEncoder().encodeToString(ByteBuffer.allocate(4).putInt((int) key).array())
                    .equals(values.path("RAW_DATA").path("$base64").asText(null))
                    && amount.isNumber()
                    && amount.decimalValue().compareTo(BigDecimal.valueOf(key).multiply(new BigDecimal("10.25"))) == 0;
            if (!same) {
                problems.add("position " + index);
            }
        }
        return problems;
    }

    /** 원천에서 계산한 직원 표준화 결과 — 자리표시 가입일과 짝 없는 부서명은 NULL, 상태 코드는 codemap 결과다. */
    private static List<String> expectedEmployeeRows(O2 o) {
        return sourceJdbc().queryForList("SELECT e.EMP_NO || '|' || NVL(e.EMP_NM, 'NULL') || '|'"
                + " || CASE WHEN e.JOIN_YMD = '00000000' THEN 'NULL' ELSE e.JOIN_YMD END || '|'"
                + " || TO_CHAR(e.HIRED_DT, 'YYYY-MM-DD HH24:MI:SS') || '|' || TO_CHAR(e.SALARY, 'FM9999999990.00')"
                + " || '|' || DECODE(TRIM(e.STAT_CD), 'A', 'A01', 'D', 'A02') || '|' || e.DEPT_CD"
                + " || '|' || NVL(d.DEPT_NM, 'NULL') || '|' || g.GRADE_NM"
                + " || '|' || TO_CHAR(e.UPDATED_AT, 'YYYY-MM-DD HH24:MI:SS.FF6') || '|' || TO_CHAR(e.RATE, 'FM9999990.000')"
                + " || '|' || TO_CHAR(e.CONTRACT_DT, 'YYYY-MM-DD') FROM " + o.rehearsal().sourceTable() + " e"
                + " LEFT JOIN " + o.deptTable() + " d ON d.DEPT_CD = e.DEPT_CD"
                + " JOIN " + o.gradeTable() + " g ON g.GRADE_NO = e.GRADE_NO ORDER BY e.EMP_NO", String.class);
    }

    private static List<String> actualEmployeeRows(O2 o) {
        return targetJdbc().queryForList("SELECT emp_no || '|' || coalesce(emp_nm, 'NULL') || '|'"
                + " || coalesce(join_ymd, 'NULL') || '|' || to_char(hired_dt, 'YYYY-MM-DD HH24:MI:SS') || '|'"
                + " || to_char(salary_amt, 'FM9999999990.00') || '|' || stat_cd || '|' || dept_cd"
                + " || '|' || coalesce(dept_nm, 'NULL') || '|' || grade_nm"
                + " || '|' || to_char(updated_at, 'YYYY-MM-DD HH24:MI:SS.US') || '|' || to_char(rate, 'FM9999990.000')"
                + " || '|' || to_char(contract_dt, 'YYYY-MM-DD') FROM " + o.rehearsal().targetTable()
                + " ORDER BY emp_no", String.class);
    }

    private static long rowsOf(String table) {
        return targetJdbc().queryForObject("SELECT count(*) FROM " + table, Long.class);
    }

    /** 생성기를 거치지 않고 한 컬럼의 trim 을 뺀 mapping(R3 가 막는 조합). */
    private static MappingSpec withoutTrim(MappingSpec spec, String targetColumn) {
        TableMapping table = spec.tables().getFirst();
        List<ColumnMapping> columns = table.columns().stream().map(column -> !column.target().equals(targetColumn)
                ? column : new ColumnMapping(column.source(), column.target(), null, column.type(), column.codemap(),
                column.fkRef(), column.constant(), column.encrypt(), column.nullify(), column.isolate())).toList();
        TableMapping changed = new TableMapping(table.source(), table.target(), table.where(), table.orderBy(),
                table.orderByKeys(), table.targetKey(), columns, table.idStrategy(), table.identity(),
                table.foreignKeys(), table.id(), table.lookups(), table.verify());
        return new MappingSpec(spec.source(), spec.target(), List.of(changed), spec.codemaps(), spec.run(),
                spec.ledger(), spec.archives());
    }

    /** 대상 컬럼마다 mapping 의 처리(변환·type·codemap·nullify·isolate). */
    private static Map<String, String> loads(MappingSpec spec) {
        Map<String, String> loads = new LinkedHashMap<>();
        for (ColumnMapping column : spec.tables().getFirst().columns()) {
            loads.put(column.target(), describe(column.transform(), column.type(), column.codemap(), column.nullify(),
                    column.isolate()));
        }
        return loads;
    }

    /** 대상 컬럼마다 원장 확정 행의 load 와 그 행이 낼 isolate — 생성기·coverage 와 같은 판정({@link LoadCapabilities}). */
    private static Map<String, String> loads(TermLedger ledger) {
        Map<String, String> loads = new LinkedHashMap<>();
        for (Entry entry : ledger.entries()) {
            Load load = entry.load();
            loads.put(entry.target().column(), describe(load.transform(), load.type(), load.codemap(), load.nullify(),
                    LoadCapabilities.isolate(entry)));
        }
        return loads;
    }

    private static String describe(String transform, String type, String codemap, List<MappingSpec.Nullify> nullify,
                                   MappingSpec.Isolate isolate) {
        return transform + "|" + type + "|" + codemap + "|" + nullify + "|" + isolate;
    }

    /** 원천에서 계산한 표준화 결과 — 격리 행을 빼고, 자리표시·공백 가입일은 NULL, 시각은 버리거나 14자리로 쓴다. */
    private static List<String> expectedStandardRows(Rehearsal r) {
        return sourceJdbc().queryForList("SELECT USER_NO || '|' || CASE WHEN TRIM(JOIN_YMD) IS NULL"
                + " OR JOIN_YMD = '00000000' THEN 'NULL' ELSE JOIN_YMD END || '|'"
                + " || TO_CHAR(LAST_LOGIN, 'YYYYMMDDHH24MISS') || '|' || TO_CHAR(END_DT, 'YYYYMMDD') || '|'"
                + " || DECODE(TRIM(USE_AT), '1', 'Y', TRIM(USE_AT))"
                + " || '|' || DECODE(TRIM(STAT_CD), 'A', 'A01', 'D', 'A02')"
                + " || '|' || DEPT_CD FROM " + r.sourceTable() + " WHERE USER_NO NOT IN (" + csv(INVALID_DATES) + ")"
                + " ORDER BY USER_NO", String.class);
    }

    private static List<String> actualStandardRows(Rehearsal r) {
        return targetJdbc().queryForList("SELECT user_no || '|' || coalesce(join_ymd, 'NULL') || '|' || last_login_dt"
                + " || '|' || end_ymd || '|' || use_yn || '|' || stat_cd || '|' || dept_cd FROM " + r.targetTable()
                + " ORDER BY user_no", String.class);
    }

    /**
     * 산출물에 나오면 안 되는 문자열 — 원시 값(달력 오류·자리표시 가입일, 이름, 메모)과 일회용 접속 정보. 단언은 나온 것의
     * 종류 이름만 싣는다({@link #leaks}).
     */
    private static Map<String, String> forbidden() {
        Map<String, String> probes = new LinkedHashMap<>();
        probes.put("달력 오류 가입일", "20240231");
        probes.put("자리표시 가입일", "00000000");
        probes.put("사용자 이름", "사용자1");
        probes.put("메모 본문", "메모 1");
        probes.put("원천 JDBC URL", ORACLE.getJdbcUrl());
        probes.put("원천 비밀번호", ORACLE.getPassword());
        probes.put("대상 JDBC URL", POSTGRES.getJdbcUrl());
        probes.put("대상 비밀번호", POSTGRES.getPassword());
        return probes;
    }

    private static List<String> leaks(String text, Map<String, String> probes) {
        return probes.entrySet().stream().filter(probe -> text.contains(probe.getValue())).map(Map.Entry::getKey)
                .toList();
    }

    /** 선언 길이(3)까지 끝 공백으로 채워 왔는가. */
    private static boolean padded(String value) {
        return value != null && value.length() == 3 && value.endsWith("  ");
    }

    /** 두 정렬 목록의 행 수 차이와 어긋나는 위치(최대 5개). 값은 싣지 않는다. */
    private static List<String> mismatches(List<String> expected, List<String> actual) {
        List<String> keys = new ArrayList<>();
        if (expected.size() != actual.size()) {
            keys.add("rows " + expected.size() + " != " + actual.size());
        }
        for (int index = 0; index < Math.min(expected.size(), actual.size()) && keys.size() < 5; index++) {
            if (!expected.get(index).equals(actual.get(index))) {
                keys.add("position " + (index + 1));
            }
        }
        return keys;
    }

    private static MappingSpec events(String source, String target, String runId) {
        TableMapping table = new TableMapping(source, target, null, "EVT_AT", "evt_at", List.of(
                new ColumnMapping("EVT_AT", "evt_at", null, null, null, null, null),
                new ColumnMapping("NOTE", "note", null, null, null, null, null)), null);
        return new MappingSpec(sourceConfig(), targetConfig(), List.of(table), Map.of(),
                new MappingSpec.RunContext(runId, "oracle-rehearsal-events"));
    }

    /**
     * 주문을 둘로 나눈 매핑 — {@code ord} 는 사용자 표를 별칭 {@code usr} 로 조회해 가입일(ymd8-truncate)·상태 코드(codemap)를
     * 옮기고, {@code ord_h} 는 같은 주문의 주문 일시(ymd8-truncate)를 옮긴다. {@code codeTransform} 은 상태 코드 codemap 앞
     * 변환이다(null 이면 없음).
     */
    private static MappingSpec lookupAndSplit(String orders, String users, String orderTarget, String historyTarget,
                                              String runId, String codeTransform) {
        TableMapping order = new TableMapping(orders, orderTarget, null, "ORD_NO", List.of(), "ord_no", List.of(
                new ColumnMapping("ORD_NO", "ord_no", null, null, null, null, null),
                new ColumnMapping("usr.JOINED_AT", "join_ymd", "ymd8-truncate", null, null, null, null),
                new ColumnMapping("usr.STAT_CD", "user_stat", codeTransform, null, "stat", null, null)),
                null, null, List.of(), "ord", List.of(new Lookup("usr", users, null,
                new LookupKey("USER_NO", "USER_NO"), LookupCardinality.EXACTLY_ONE, null)));
        TableMapping history = new TableMapping(orders, historyTarget, null, "ORD_NO", List.of(), "ord_no", List.of(
                new ColumnMapping("ORD_NO", "ord_no", null, null, null, null, null),
                new ColumnMapping("ORD_AT", "ord_ymd", "ymd8-truncate", null, null, null, null)),
                null, null, List.of(), "ord_h");
        // 나눈 매핑을 먼저 둔다 — 주 표 읽기만 하는 ord_h 가 조회를 하는 ord 보다 먼저 돌아 두 읽기 경로를 따로 판정한다.
        return new MappingSpec(sourceConfig(), targetConfig(), List.of(history, order),
                Map.of("stat", new CodeMap(Map.of("A", "A01", "D", "A02"), UnmappedPolicy.FAIL, null)),
                new MappingSpec.RunContext(runId, "oracle-rehearsal-lookup"));
    }

    private static SourceReadSessionPolicy oraclePolicy() {
        return new OracleSourceAdapter().sourceReadSessionPolicy();
    }

    private static ColumnProfile column(TableProfile table, String name) {
        return table.columns().stream().filter(column -> column.name().equals(name)).findFirst().orElseThrow();
    }

    private static ColumnSuggestion suggestion(SuggestionReport report, Rehearsal r, String column) {
        return report.columns().stream()
                .filter(candidate -> candidate.table().equalsIgnoreCase(r.sourceTable())
                        && candidate.column().equals(column))
                .findFirst().orElseThrow();
    }

    private static List<Path> executionArtifacts(Rehearsal r) throws Exception {
        try (Stream<Path> paths = Files.list(r.directory())) {
            return paths.filter(path -> path.getFileName().toString().startsWith("plan.json.load-")).toList();
        }
    }

    private static List<Path> entries(Path directory) throws Exception {
        try (Stream<Path> paths = Files.list(directory)) {
            return paths.toList();
        }
    }

    private static long targetRows(Rehearsal r) {
        return targetJdbc().queryForObject("SELECT count(*) FROM " + r.targetTable(), Long.class);
    }

    private static TableResult single(List<TableResult> results) {
        assertThat(results).hasSize(1);
        return results.getFirst();
    }

    private static long count(Connection connection, String table) throws Exception {
        try (Statement statement = connection.createStatement();
             ResultSet rows = statement.executeQuery("SELECT COUNT(*) FROM " + table)) {
            assertThat(rows.next()).isTrue();
            return rows.getLong(1);
        }
    }

    /** 리허설 환경 기록(readiness). 버전·문자셋·드라이버뿐이다. 버전은 일반 계정이 읽는 PRODUCT_COMPONENT_VERSION 에서 읽는다. */
    private static void environment() throws Exception {
        try (Connection connection = ORACLE.createConnection("")) {
            String versionFull = sourceJdbc().queryForObject("SELECT VERSION_FULL FROM PRODUCT_COMPONENT_VERSION"
                    + " WHERE PRODUCT LIKE 'Oracle%' AND ROWNUM = 1", String.class);
            String charset = sourceJdbc().queryForObject("SELECT VALUE FROM NLS_DATABASE_PARAMETERS"
                    + " WHERE PARAMETER = 'NLS_CHARACTERSET'", String.class);
            String nationalCharset = sourceJdbc().queryForObject("SELECT VALUE FROM NLS_DATABASE_PARAMETERS"
                    + " WHERE PARAMETER = 'NLS_NCHAR_CHARACTERSET'", String.class);
            try (Connection target = POSTGRES.createConnection("")) {
                System.out.printf("Rehearsal environment: image=%s; product=%s; versionFull=%s; charset=%s/%s;"
                                + " driver=%s; target=%s %s%n",
                        ORACLE instanceof Oracle19cContainer ? "MIGRATION_ORACLE19C_IMAGE" : ORACLE_FREE_IMAGE,
                        connection.getMetaData().getDatabaseProductVersion()
                                .replace('\n', ' '), versionFull, charset, nationalCharset,
                        connection.getMetaData().getDriverVersion(), target.getMetaData().getDatabaseProductName(),
                        target.getMetaData().getDatabaseProductVersion());
            }
        }
    }

    private static String ojdbcSha256() throws Exception {
        Path jar = Path.of(Class.forName(ORACLE_DRIVER).getProtectionDomain().getCodeSource().getLocation().toURI());
        return sha256(Files.readAllBytes(jar));
    }

    private static String sha256(byte[] bytes) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
    }

    private static String owner() {
        return ORACLE.getUsername().toUpperCase(Locale.ROOT);
    }

    private static String suffix() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase(Locale.ROOT);
    }

    private static String csv(List<Long> values) {
        return String.join(", ", values.stream().map(String::valueOf).toList());
    }
}
