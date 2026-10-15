package nuri.migration;

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
import nuri.migration.validate.MappingValidator;
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
import nuri.migration.verify.MigrationReport;
import nuri.migration.verify.MigrationVerifier;
import nuri.migration.workflow.WorkflowReview;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.jdbc.core.JdbcTemplate;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Properties;
import java.util.Set;
import java.util.TimeZone;
import java.util.UUID;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Oracle Free 를 원천으로 표준화 이관 전체를 한 번 돌리는 리허설(ADR-0029 L4-B, DEC-OPS-323).
 *
 * <p>한글 코멘트와 더러운 값(자리표시·달력에 없는 날짜·공백·플래그 코드·공백으로 채운 CHAR 코드)이 든 합성 표를
 * discover → profile → term-suggest → 원장 확정(시험이 사람 역할) → mapping-generate → plan·review·validate → 공개 DRY_RUN
 * 으로 지난다. 공개 COMMIT 은 Oracle 이 {@code UNVERIFIED} 라 막히는 것을 보고, 승인 workflow 밑의 엔진으로 COMMIT·verify
 * 한다(기존 vendor 리허설·L3b 시험과 같은 길). 증거 등급은 바꾸지 않는다 — 합성 데이터·Free 이미지는 기관 증거가 아니다.</p>
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
     * 생성기와 coverage 가 조회 컬럼에도 trim 을 요구하는 이유다(R3). {@code TIMESTAMP} 는 조회 키로 쓸 수 없어 정규화가
     * 어긋나는 대신 키 형식 실패로 멈춘다. 1,001행이라 조회는 chunk(500행)마다 따로 돈다.
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

            // TIMESTAMP 를 조회 키로 쓰면 행마다 키 형식 실패다 — 정규화가 어긋난 짝을 만들지 않는다.
            TableMapping byTime = new TableMapping(orders, orderTarget, null, "ORD_NO", List.of(), "ord_no",
                    List.of(new ColumnMapping("ORD_NO", "ord_no", null, null, null, null, null),
                            new ColumnMapping("usr.STAT_CD", "user_stat", "trim", null, "stat", null, null)),
                    null, null, List.of(), "ord_t", List.of(new Lookup("usr", users, null,
                    new LookupKey("ORD_AT", "JOINED_AT"), LookupCardinality.EXACTLY_ONE, null)));
            List<TableResult> timeKeyed = executor.execute(new MappingSpec(sourceConfig(), targetConfig(),
                    List.of(byTime), spec.codemaps(), new MappingSpec.RunContext(runId + "-time",
                    "oracle-rehearsal-lookup")), MigrationMode.DRY_RUN, sourceJdbc(), null, oraclePolicy(), true);
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
        // 실행 JSON 형식 4(ADR-0029 L3c·L3d) — 기본 매핑은 매핑 id 를, DRY_RUN 은 제어 스키마 기록을, 조회가 없으면 짝 없는
        //   행 기록을 싣지 않는다.
        assertThat(dryRun.schemaVersion()).isEqualTo(MigrationExecutionArtifact.CURRENT_SCHEMA_VERSION).isEqualTo(4);
        assertThat(dryRun.controlSchema()).isNull();
        assertThat(dryRun.lookupMisses()).isEmpty();
        assertThat(dryRunText).doesNotContain("\"controlSchema\"", "\"lookupMisses\"", "\"mapping\":");
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
        assertThat(commitText).contains("\"isolated\":3", "\"ordinals\":[10,600,1300]", "\"action\":\"ADVANCED\"",
                "\"schemaVersion\":4", "\"after\":\"2\"}");
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
        assertThat(draft.term()).as(draft.source().column() + " 의 초안 용어").isNotNull();
        assertThat(draft.term().engAbbr()).isEqualToIgnoringCase(targetColumn);
        Conformance estimate = draft.conformance();
        Conformance conformance = new Conformance(estimate.rate(), estimate.unmeasured(), estimate.transform(),
                estimate.violations(), exceptions);
        return new Entry(draft.id(), draft.source(), null, null, new ColumnRef(r.targetTable(), targetColumn),
                draft.term(), null, draft.grade(), "CONFIRMED", load, conformance, null, note, CONFIRMED);
    }

    private static Entry nonStandard(Rehearsal r, Entry draft, String targetColumn, Load load, String reason) {
        return new Entry(draft.id(), draft.source(), null, null, new ColumnRef(r.targetTable(), targetColumn), null,
                new NonStandardTarget(reason), draft.grade(), "CONFIRMED", load, null, null, null, CONFIRMED);
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
        r.command("plan");
        MigrationPlan draft = plans.read(Files.readString(r.plan()));
        assertThat(draft.commitReady()).isFalse();
        assertThatThrownBy(() -> r.command("validate"))
                .isInstanceOf(MigrationExecutionException.class).hasMessageContaining("commitReady=false");
        CatalogSnapshot snapshot = inventories.readEnvelope(Files.readString(r.inventory())).payload().toSnapshot();
        Map<String, DispositionDecision> decisions = new LinkedHashMap<>();
        for (CatalogObject object : snapshot.objects()) {
            boolean mapped = object.kind() == ObjectKind.TABLE && object.name().equals(r.sourceName());
            decisions.put(object.stableId(), new DispositionDecision(
                    mapped ? ObjectDisposition.AUTO_DATA_LOAD : ObjectDisposition.EXPORT_ONLY,
                    mapped ? r.targetTable() : null, true, "Disposable Oracle standardization rehearsal review"));
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

    /** 생성기를 거치지 않고 한 컬럼의 trim 을 뺀 mapping(R3 가 막는 조합). */
    private static MappingSpec withoutTrim(MappingSpec spec, String targetColumn) {
        TableMapping table = spec.tables().getFirst();
        List<ColumnMapping> columns = table.columns().stream().map(column -> !column.target().equals(targetColumn)
                ? column : new ColumnMapping(column.source(), column.target(), null, column.type(), column.codemap(),
                column.fkRef(), column.constant(), column.encrypt(), column.nullify(), column.isolate())).toList();
        TableMapping changed = new TableMapping(table.source(), table.target(), table.where(), table.orderBy(),
                table.orderByKeys(), table.targetKey(), columns, table.idStrategy(), table.identity(),
                table.foreignKeys());
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
