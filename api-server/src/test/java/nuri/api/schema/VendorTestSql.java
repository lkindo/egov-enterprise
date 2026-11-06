package nuri.api.schema;

import static org.assertj.core.api.Assertions.assertThat;

import com.zaxxer.hikari.HikariDataSource;
import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.SQLTimeoutException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.LockSupport;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import nuri.foundation.core.persistence.CubridSqlDialect;
import nuri.foundation.core.persistence.MariaDbSqlDialect;
import nuri.foundation.core.persistence.MySqlSqlDialect;
import nuri.foundation.core.persistence.OracleSqlDialect;
import nuri.foundation.core.persistence.PostgresqlSqlDialect;
import nuri.foundation.core.persistence.SqlServerSqlDialect;
import nuri.foundation.core.persistence.VendorErrorCodes;
import nuri.foundation.core.persistence.VendorSqlDialect;
import org.springframework.core.env.Environment;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.ArgumentPreparedStatementSetter;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;
import org.springframework.jdbc.support.GeneratedKeyHolder;

/**
 * 통합 시험이 벤더마다 달리 써야 하는 문장을 모은다(ADR-0047 D-10). 시나리오와 단언은 벤더 공통이고, 픽스처와 세션 관측만 여기서 갈린다.
 * 벤더는 실행 도구가 시험 JVM 에 준 값({@code APP_DATABASE_VENDOR})이고, 연결한 DB 제품과 맞는지 한 번 대조한다. 벤더 실행이 아니면 PostgreSQL 이다.
 * 한 시험 JVM 은 한 DB 만 본다. 모르는 벤더는 PostgreSQL 로 넘기지 않고 멈춘다 — 넘기면 PostgreSQL 문장이 다른 DB 에서 엉뚱하게 실패하거나 통과한다.
 */
final class VendorTestSql {

    /** 시험이 붙는 DB. {@code product} 는 JDBC 드라이버가 답하는 제품명에 든 글자다. */
    enum Vendor {
        POSTGRESQL("postgresql", "PostgreSQL", null),
        ORACLE("oracle", "Oracle", "jdbc:oracle:thin:@//127.0.0.1:"),
        MARIADB("mariadb", "MariaDB", "jdbc:mariadb://127.0.0.1:"),
        MYSQL("mysql", "MySQL", "jdbc:mysql://127.0.0.1:"),
        MSSQL("mssql", "Microsoft SQL Server", "jdbc:sqlserver://127.0.0.1:"),
        CUBRID("cubrid", "CUBRID", "jdbc:cubrid:127.0.0.1:");

        private final String id;
        private final String product;
        /** 실행 도구가 띄운 일회용 DB 의 주소 앞부분. 다른 주소의 DB 에는 쓰지 않는다. */
        private final String disposableUrlPrefix;

        Vendor(String id, String product, String disposableUrlPrefix) {
            this.id = id;
            this.product = product;
            this.disposableUrlPrefix = disposableUrlPrefix;
        }

        /** MySQL·MariaDB. 저장 엔진(InnoDB)의 잠금·FK 검사·트리거 문법이 같다. */
        boolean innoDb() {
            return this == MARIADB || this == MYSQL;
        }

        VendorSqlDialect dialect() {
            return switch (this) {
                case POSTGRESQL -> new PostgresqlSqlDialect();
                case ORACLE -> new OracleSqlDialect();
                case MARIADB -> new MariaDbSqlDialect();
                case MYSQL -> new MySqlSqlDialect();
                case MSSQL -> new SqlServerSqlDialect();
                case CUBRID -> new CubridSqlDialect();
            };
        }

        /** JDBC 키 조회가 표의 식별 컬럼 값만 돌려주는 벤더. 시퀀스·UUID 기본값 키는 다른 길로 받는다. */
        boolean identityOnlyKeys() {
            return innoDb() || this == MSSQL || this == CUBRID;
        }
    }

    /** 행 잠금을 기다리는 세션. {@code session} 은 {@link #nameSession} 으로 붙인 이름이고 {@code statement} 는 소문자다. */
    record LockWait(String session, long id, String statement, Set<Long> blockers) {
        boolean blockedBy(long session) {
            return blockers.contains(session);
        }

        boolean touches(String table) {
            return statement != null && statement.contains(table);
        }
    }

    /** 이름 없는 세션이 받는 이름. Oracle·MySQL 의 관측 문장과 같게 빈칸 하나로 두어 {@code %} 에만 맞는다. */
    private static final String UNNAMED_SESSION = " ";

    /**
     * MariaDB 의 INNODB_* 표는 어느 세션이든 약 100ms 안에 다시 읽으면 앞 값을 그대로 돌려준다. 20ms 간격으로 물으면 2초 동안 대기자를 끝내 보지 못했고,
     * 150ms 간격이면 보였다(2026-11-04 실측). 읽기 사이를 이만큼 띄운다 — 띄우지 않으면 대기 단언은 시간 초과로, 대기 부재 단언은 낡은 값으로 판정된다.
     */
    private static final long MARIADB_LOCK_VIEW_REFRESH_NANOS = TimeUnit.MILLISECONDS.toNanos(150);
    private static final Object MARIADB_LOCK_VIEW = new Object();
    private static long mariaDbLockViewReadAt = System.nanoTime() - MARIADB_LOCK_VIEW_REFRESH_NANOS;
    /**
     * MariaDB·SQL Server 는 다른 세션이 읽을 수 있는 세션 이름이 없다. 시험 JVM 이 연결 번호(CONNECTION_ID·@@SPID)마다 붙인 이름을 기억한다.
     * 한 시험 JVM 은 한 DB 만 보므로 두 벤더가 섞이지 않는다.
     */
    private static final Map<Long, String> MARIADB_SESSION_NAMES = new ConcurrentHashMap<>();
    /**
     * 시험의 {@code FOR UPDATE [NOWAIT | SKIP LOCKED]} 잠금 조회. 시험 문장은 PostgreSQL 표기이고 SQL Server 는 표 힌트로 잠근다. 표 별칭은 받지 않는다 —
     * 힌트가 별칭 앞에 들어가 문법 오류로 드러난다.
     */
    private static final Pattern FOR_UPDATE = Pattern.compile("(?is)^(\\s*SELECT\\s+.+?\\s+FROM\\s+\\w+)(\\s.*?)?\\s+FOR\\s+UPDATE(\\s+NOWAIT|\\s+SKIP\\s+LOCKED)?\\s*$");
    private static final Pattern INSERT_VALUES = Pattern.compile("(?is)^(\\s*INSERT\\s+INTO\\s+\\w+\\s*\\(.*?\\))(\\s*VALUES\\s*\\(.*)$");
    /** 식별 컬럼 하나만 기본값으로 넣는 입력. SQL Server 는 식별 컬럼에 DEFAULT 를 적지 못하고 DEFAULT VALUES 로 쓴다(339). */
    private static final Pattern INSERT_ONLY_DEFAULT = Pattern.compile("(?is)^\\s*INSERT\\s+INTO\\s+(\\w+)\\s*\\(\\s*\\w+\\s*\\)\\s*VALUES\\s*\\(\\s*DEFAULT\\s*\\)\\s*$");
    /** SQL Server 매개변수 문장 앞의 선언. 괄호 한 단계(nvarchar(4000))를 품는다. */
    private static final Pattern SQL_SERVER_PARAMETERS = Pattern.compile("^\\((?:[^()]|\\([^()]*\\))*\\)");
    /** 현재 시각에서 정수 간격을 더하고 빼는 표준 식. SQL Server 에는 INTERVAL 이 없다. */
    private static final Pattern SQL_SERVER_INTERVAL = Pattern.compile("(?i)CURRENT_TIMESTAMP\\s*([-+])\\s*INTERVAL\\s*'(\\d+)'\\s*(SECOND|MINUTE|HOUR|DAY)\\b");

    private static final Pattern NEXTVAL = Pattern.compile("nextval\\('(\\w+)'\\)");
    private static final Pattern INSERT_COLUMNS = Pattern.compile("(?is)^(\\s*INSERT\\s+INTO\\s+(\\w+)\\s*\\()(.*?\\)\\s*VALUES\\s*\\()(.*)$");

    private static volatile Vendor verified;

    private VendorTestSql() {
    }

    /** 실행 도구가 벤더 DB 를 준 실행인가. 빌드 시점이 아니라 실행 시점 값이라 시험을 고르는 데도 쓴다. */
    static boolean vendorRun() {
        String url = System.getenv("VENDOR_TEST_URL");
        return url != null && !url.isBlank();
    }

    /** 이 실행의 벤더. DB 에 묻지 않으므로 시험 인자를 고르는 정적 문맥에서도 쓴다. */
    static Vendor vendor() {
        if (!vendorRun()) {
            return Vendor.POSTGRESQL;
        }
        String id = System.getenv("APP_DATABASE_VENDOR");
        for (Vendor vendor : Vendor.values()) {
            if (vendor != Vendor.POSTGRESQL && vendor.id.equals(id)) {
                return vendor;
            }
        }
        throw new IllegalStateException("벤더 실행의 APP_DATABASE_VENDOR 를 모른다: " + id
                + ". PostgreSQL 로 넘기지 않는다 — 새 벤더는 VendorTestSql 에 문장을 더한다");
    }

    /** 이 DB 의 벤더. 실행 도구가 준 값이 연결한 제품과 다르면 멈춘다. */
    static Vendor vendor(JdbcTemplate jdbc) {
        Vendor expected = vendor();
        if (verified != expected) {
            String product = jdbc.execute((ConnectionCallback<String>) connection -> connection.getMetaData().getDatabaseProductName());
            if (product == null || !product.contains(expected.product)) {
                throw new IllegalStateException("벤더 " + expected.id + " 로 돌리는데 연결한 DB 는 " + product + " 다");
            }
            verified = expected;
        }
        return expected;
    }

    static boolean isPostgresql(JdbcTemplate jdbc) {
        return vendor(jdbc) == Vendor.POSTGRESQL;
    }

    static Connection openVendorConnection() throws SQLException {
        Connection connection = DriverManager.getConnection(System.getenv("VENDOR_TEST_URL"),
                System.getenv("SPRING_DATASOURCE_USERNAME"), System.getenv("SPRING_DATASOURCE_PASSWORD"));
        // 운영 풀은 READ COMMITTED 다(VendorSqlConfig). InnoDB 의 기본은 REPEATABLE READ 라 시험이 직접 연 연결도 같게 둔다.
        if (vendor().innoDb()) {
            connection.setTransactionIsolation(Connection.TRANSACTION_READ_COMMITTED);
        }
        // CUBRID 의 잠금 대기는 기본이 무한이다. 앱이 연결마다 거는 세션 상한을 같게 건다(VendorSqlConfig).
        if (vendor() == Vendor.CUBRID) {
            try (var statement = connection.createStatement()) {
                statement.execute(CubridSqlDialect.SESSION_LOCK_WAIT_SQL);
            }
        }
        return connection;
    }

    /** 쿼리마다 연결을 여는 시험의 벤더 풀. Oracle 리스너는 그 속도로 세션을 만들지 못한다(ORA-12516). 운영도 풀을 쓴다. */
    static HikariDataSource vendorPool() {
        var pool = new HikariDataSource();
        pool.setJdbcUrl(System.getenv("VENDOR_TEST_URL"));
        pool.setUsername(System.getenv("SPRING_DATASOURCE_USERNAME"));
        pool.setPassword(System.getenv("SPRING_DATASOURCE_PASSWORD"));
        pool.setMaximumPoolSize(6);
        if (vendor().innoDb()) {
            pool.setTransactionIsolation("TRANSACTION_READ_COMMITTED");
        }
        if (vendor() == Vendor.CUBRID) {
            pool.setConnectionInitSql(CubridSqlDialect.SESSION_LOCK_WAIT_SQL);
        }
        return pool;
    }

    /** 이 DB 의 SQL 포트. */
    static VendorSqlDialect dialect(JdbcTemplate jdbc) {
        return vendor(jdbc).dialect();
    }

    /** 처리기가 쓰는 이 벤더의 오류 번호 표. 운영 문맥과 같은 표로 응답을 대조한다. */
    static VendorErrorCodes errorCodes() {
        return vendor().dialect().errorCodes();
    }

    /** 시험이 따로 쥔 연결에서 문장을 돌린다. 연결은 닫지 않는다. */
    static JdbcTemplate on(Connection connection) {
        return new JdbcTemplate(new SingleConnectionDataSource(connection, true));
    }

    /**
     * 일회용 시험 DB 인지 본다. 시험이 쓰고 지우는 행이 다른 DB 에 닿지 않게 한다. 벤더 DB 는 주소만으로 알 수 없어, 실행 도구가 자기가 띄운
     * DB 에 남긴 토큰을 대조한다.
     */
    static void assertDisposable(Environment environment, JdbcTemplate jdbc) {
        String url = environment.getProperty("spring.datasource.url", "");
        if (isPostgresql(jdbc)) {
            assertThat(url).startsWith("jdbc:tc:postgresql:17:");
            return;
        }
        assertOwned(url, environment.getProperty("vendor.test.owner"), jdbc);
    }

    /** 스프링 문맥 없이 벤더 DB 를 쓰는 시험의 같은 확인. */
    static void assertOwnedVendorDatabase(JdbcTemplate jdbc) {
        assertOwned(System.getenv("VENDOR_TEST_URL"), System.getenv("VENDOR_TEST_OWNER"), jdbc);
    }

    private static void assertOwned(String url, String owner, JdbcTemplate jdbc) {
        Vendor vendor = vendor(jdbc);
        assertThat(vendor).as("벤더 실행의 DB 다").isNotEqualTo(Vendor.POSTGRESQL);
        assertThat(url).startsWith(vendor.disposableUrlPrefix);
        assertThat(owner).as("벤더 시험은 실행 도구로 돌린다").isNotBlank();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM vendor_test_owner WHERE token = ?", Integer.class, owner)).isEqualTo(1);
    }

    /** 시험 문장의 벤더 차이를 바꾼다. PostgreSQL 문장은 그대로 지나간다. */
    static String sql(JdbcTemplate jdbc, String statement) {
        return switch (vendor(jdbc)) {
            case POSTGRESQL -> statement;
            case ORACLE -> statement
                    .replaceAll("(\\w+)::jsonb->>'(\\w+)'", "JSON_VALUE($1, '\\$.$2')")
                    .replaceAll("nextval\\('(\\w+)'\\)", "$1.NEXTVAL")
                    .replaceAll("(\\w+_id)::text", "LOWER(REGEXP_REPLACE(RAWTOHEX($1), '^(.{8})(.{4})(.{4})(.{4})(.{12})\\$', '\\\\1-\\\\2-\\\\3-\\\\4-\\\\5'))")
                    .replaceAll("(\\w+)::text", "TO_CHAR($1)");
            // MariaDB 의 UUID 타입은 CHAR 로 바꾸면 PostgreSQL 의 uuid::text 와 같은 소문자 표기다. MySQL 의 UUID 컬럼은 BINARY(16) 이라
            // BIN_TO_UUID 로 읽는다(Oracle 처럼 _id 로 끝나는 ::text 를 UUID 로 본다). CAST 의 정수형 이름은 SIGNED 다.
            case MARIADB -> innoDb(statement).replaceAll("nextval\\('(\\w+)'\\)", "NEXTVAL($1)");
            case MYSQL -> {
                if (NEXTVAL.matcher(statement).find()) {
                    throw new IllegalStateException("MySQL 은 시퀀스가 없다(표 흉내). nextval 은 insertKey 가 값을 먼저 받아 넣는다: " + statement);
                }
                yield innoDb(statement.replaceAll("(\\w+_id)::text", "BIN_TO_UUID($1)"));
            }
            case MSSQL -> sqlServer(statement);
            case CUBRID -> cubrid(statement);
        };
    }

    /**
     * CUBRID 차이. UUID 는 CHAR(36) 문자열이라 그대로 읽는다. CURRENT_TIMESTAMP 는 초 단위 TIMESTAMP 라 서버 시계(한국 시간, 밀리초)인
     * SYS_DATETIME 으로 쓴다 — 앱의 현재 시각(CubridSqlDialect)과 같다. 간격 덧셈 식이 없어 DATE_ADD 다. JSON 은 STRING 이고 JSON_VALUE 가 없다
     * (2026-11-06 실측).
     */
    private static String cubrid(String statement) {
        Matcher interval = SQL_SERVER_INTERVAL.matcher(statement);
        StringBuilder shifted = new StringBuilder();
        while (interval.find()) {
            interval.appendReplacement(shifted, "DATE_ADD(SYS_DATETIME, INTERVAL " + ("-".equals(interval.group(1)) ? "-" : "") + interval.group(2) + " "
                    + interval.group(3).toUpperCase(Locale.ROOT) + ")");
        }
        interval.appendTail(shifted);
        return shifted.toString()
                .replaceAll("(?i)\\bTIMESTAMP\\s+'([0-9: .-]+)'", "DATETIME'$1'")
                .replaceAll("(?i)\\bCURRENT_TIMESTAMP\\b", "SYS_DATETIME")
                .replaceAll("(\\w+)::jsonb->>'(\\w+)'", "JSON_UNQUOTE(JSON_EXTRACT($1, '\\$.$2'))")
                .replaceAll("nextval\\('(\\w+)'\\)", "$1.NEXT_VALUE")
                .replaceAll("(\\w+_id)::text", "$1")
                .replaceAll("(\\w+)::text", "CAST($1 AS VARCHAR)")
                .transform(VendorTestSql::cubridRowLock);
    }

    /**
     * SQL Server 차이. UUID 는 UNIQUEIDENTIFIER 라 문자열이 대문자다 — PostgreSQL 의 uuid::text 처럼 소문자로 읽는다. CURRENT_DATE 가 없어
     * 서버 시계(한국 시간, SqlServerSqlDialect.assertSession)의 날짜로 쓴다. 잠금 조회는 dialect 의 FOR_UPDATE 와 같은 표 힌트다.
     */
    private static String sqlServer(String statement) {
        Matcher interval = SQL_SERVER_INTERVAL.matcher(statement);
        StringBuilder shifted = new StringBuilder();
        while (interval.find()) {
            interval.appendReplacement(shifted, "DATEADD(" + interval.group(3).toUpperCase(Locale.ROOT) + ", "
                    + ("-".equals(interval.group(1)) ? "-" : "") + interval.group(2) + ", SYSDATETIME())");
        }
        interval.appendTail(shifted);
        String translated = shifted.toString()
                // ANSI 날짜·시각 리터럴이 없다. 문자열은 ISO 형식이라 로캘을 타지 않는다.
                .replaceAll("(?i)\\bTIMESTAMP\\s+'([0-9: .-]+)'", "CAST('$1' AS DATETIME2)")
                .replaceAll("(?i)\\bDATE\\s+'([0-9-]+)'", "CAST('$1' AS DATE)")
                // 글자 수 함수는 LEN 이다. 끝 공백을 세지 않는다(뒤 공백 저하) — 시험 값에는 끝 공백이 없다.
                .replaceAll("(?i)\\bLENGTH\\(", "LEN(")
                .replaceAll("(?i)to_char\\(CURRENT_DATE,\\s*'YYYYMMDD'\\)", "CONVERT(NVARCHAR(8), SYSDATETIME(), 112)")
                .replaceAll("(?i)\\bCURRENT_DATE\\b", "CAST(SYSDATETIME() AS DATE)")
                .replaceAll("(\\w+)::jsonb->>'(\\w+)'", "JSON_VALUE($1, '\\$.$2')")
                .replaceAll("nextval\\('(\\w+)'\\)", "NEXT VALUE FOR $1")
                .replaceAll("(\\w+_id)::text", "LOWER(CONVERT(NVARCHAR(36), $1))")
                .replaceAll("(\\w+)::text", "CAST($1 AS NVARCHAR(4000))");
        return sqlServerRowLock(translated);
    }

    /**
     * 다른 연결로 행을 잡아 두는 시험의 PostgreSQL 잠금 조회를 이 벤더 문장으로 바꾼다. JdbcTemplate 없이 연결을 직접 쓰는 시험도 부르므로 DB 에 묻지 않는다.
     * 다른 벤더는 같은 표기를 받는다.
     */
    static String rowLock(String forUpdate) {
        return switch (vendor()) {
            case MSSQL -> sqlServerRowLock(forUpdate);
            case CUBRID -> cubridRowLock(forUpdate);
            default -> forUpdate;
        };
    }

    /**
     * CUBRID 에는 NOWAIT·SKIP LOCKED 가 없다(문법 오류, 2026-11-06 실측). 수식어를 떼고 세션 대기 상한(5초)에 맡긴다 — 행이 비어 있으면 같은 결과이고,
     * 잠겨 있으면 건너뛰거나 바로 실패하는 대신 상한 뒤 -75 로 실패한다. 잠긴 행을 건너뛰기를 기대하는 시험은 이 벤더에서 붉다.
     */
    private static String cubridRowLock(String statement) {
        return statement.replaceAll("(?i)\\bFOR\\s+UPDATE\\s+(NOWAIT|SKIP\\s+LOCKED)\\b", "FOR UPDATE");
    }

    /**
     * 배타 잠금(XLOCK)은 PostgreSQL 의 FOR UPDATE 처럼 다른 잠금 조회와 자식 FK 입력을 막는다(SqlServerSqlDialect 와 같다, 2026-11-04 실측).
     * NOWAIT 은 같은 이름의 힌트, SKIP LOCKED 는 잠긴 행을 건너뛰는 READPAST 다. 잠금 절이 있는데 모양을 못 읽으면 그대로 보내지 않고 멈춘다.
     */
    private static String sqlServerRowLock(String statement) {
        Matcher lock = FOR_UPDATE.matcher(statement);
        if (!lock.matches()) {
            if (Pattern.compile("(?i)\\bFOR\\s+UPDATE\\b").matcher(statement).find()) {
                throw new IllegalArgumentException("SQL Server 잠금 힌트로 옮길 수 없는 잠금 조회다: " + statement);
            }
            return statement;
        }
        String mode = lock.group(3) == null ? "" : lock.group(3).trim().toUpperCase(Locale.ROOT).startsWith("NOWAIT") ? ", NOWAIT" : ", READPAST";
        return lock.group(1) + " WITH (XLOCK, ROWLOCK" + mode + ")" + (lock.group(2) == null ? "" : lock.group(2));
    }

    /** MySQL 계열의 공통 차이. MySQL 에는 to_char 가 없어 오늘 날짜는 DATE_FORMAT 으로 쓴다. 세션 시간대가 +09:00 이라 CURRENT_DATE 가 한국 날짜다. */
    private static String innoDb(String statement) {
        return statement
                .replaceAll("(?i)to_char\\(CURRENT_DATE,\\s*'YYYYMMDD'\\)", "DATE_FORMAT(CURRENT_DATE, '%Y%m%d')")
                .replaceAll("(\\w+)::jsonb->>'(\\w+)'", "JSON_VALUE($1, '\\$.$2')")
                .replaceAll("(\\w+)::text", "CAST($1 AS CHAR)")
                .replaceAll("(?i)\\bAS\\s+INTEGER\\s*\\)", "AS SIGNED)");
    }

    /** 입력이 만든 키를 돌려준다. RETURNING 절 대신 JDBC 키 조회를 쓴다. */
    static long insertKey(JdbcTemplate jdbc, String statement, String keyColumn, Object... arguments) {
        return ((Number) generatedKey(jdbc, statement, keyColumn, arguments)).longValue();
    }

    /**
     * 숫자가 아닌 키. Oracle 의 UUID 컬럼은 RAW(16) 이다. MySQL·MariaDB 의 JDBC 키 조회는 AUTO_INCREMENT 값만 돌려주므로 DB 기본값 대신
     * 시험이 만든 UUID 를 키 컬럼에 넣는다.
     */
    static String insertTextKey(JdbcTemplate jdbc, String statement, String keyColumn, Object... arguments) {
        if (vendor(jdbc).identityOnlyKeys()) {
            Matcher insert = INSERT_COLUMNS.matcher(statement);
            if (!insert.matches()) {
                throw new IllegalArgumentException("키 컬럼을 더할 INSERT 형태가 아니다: " + statement);
            }
            String key = UUID.randomUUID().toString();
            Object[] withKey = new Object[arguments.length + 1];
            withKey[0] = key;
            System.arraycopy(arguments, 0, withKey, 1, arguments.length);
            // MySQL 의 UUID 컬럼은 Hibernate 기본 매핑에 맞춘 BINARY(16) 이다. 같은 바이트 순서로 바꿔 넣는다.
            String placeholder = vendor(jdbc) == Vendor.MYSQL ? "UUID_TO_BIN(?), " : "?, ";
            jdbc.update(sql(jdbc, insert.group(1) + keyColumn + ", " + insert.group(3) + placeholder + insert.group(4)), withKey);
            return key;
        }
        Object key = generatedKey(jdbc, statement, keyColumn, arguments);
        if (key instanceof byte[] raw && raw.length == 16) {
            var bytes = java.nio.ByteBuffer.wrap(raw);
            return new java.util.UUID(bytes.getLong(), bytes.getLong()).toString();
        }
        return String.valueOf(key);
    }

    private static Object generatedKey(JdbcTemplate jdbc, String statement, String keyColumn, Object[] arguments) {
        Vendor vendor = vendor(jdbc);
        if (vendor == Vendor.MSSQL) {
            return sqlServerInsertedKey(jdbc, statement, keyColumn, arguments);
        }
        if (vendor.innoDb() || vendor == Vendor.CUBRID) {
            // JDBC 키 조회는 AUTO_INCREMENT 값만 돌려준다. 시퀀스로 키를 정하는 입력은 값을 먼저 받아 넣고 그 값을 키로 돌려준다.
            List<String> sequences = NEXTVAL.matcher(statement).results().map(match -> match.group(1)).toList();
            if (sequences.size() > 1) {
                throw new IllegalArgumentException("시퀀스 값이 둘 이상인 입력은 키를 정할 수 없다: " + statement);
            }
            if (sequences.size() == 1) {
                long value = nextSequenceValue(jdbc, vendor, sequences.get(0));
                jdbc.update(sql(jdbc, NEXTVAL.matcher(statement).replaceFirst(Long.toString(value))), arguments);
                return value;
            }
            assertAutoIncrement(jdbc, statement, keyColumn);
            if (vendor == Vendor.CUBRID) {
                return cubridInsertedKey(jdbc, sql(jdbc, statement), arguments);
            }
        }
        String column = vendor == Vendor.ORACLE ? keyColumn.toUpperCase(Locale.ROOT) : keyColumn;
        var keys = new GeneratedKeyHolder();
        String translated = sql(jdbc, statement);
        jdbc.update(connection -> {
            PreparedStatement prepared = connection.prepareStatement(translated, new String[] {column});
            new ArgumentPreparedStatementSetter(arguments).setValues(prepared);
            return prepared;
        }, keys);
        Map<String, Object> row = keys.getKeys();
        if (row == null || row.isEmpty()) {
            throw new IllegalStateException("입력이 키를 돌려주지 않았다: " + keyColumn);
        }
        return row.values().iterator().next();
    }

    /**
     * SQL Server 의 JDBC 키 조회는 식별 컬럼(SCOPE_IDENTITY)만 돌려준다. 시퀀스·UUID 기본값 키도 받도록 OUTPUT 으로 넣은 행의 키를 읽는다.
     * 트리거가 있는 표는 INTO 없는 OUTPUT 을 받지 않아 표 변수로 받는다. NOCOUNT 는 결과 앞의 행 수를 없애고, 끝에 되돌려 풀 연결에 남기지 않는다.
     */
    private static Object sqlServerInsertedKey(JdbcTemplate jdbc, String statement, String keyColumn, Object[] arguments) {
        String translated = sql(jdbc, statement);
        Matcher onlyDefault = INSERT_ONLY_DEFAULT.matcher(translated);
        Matcher insert = INSERT_VALUES.matcher(translated);
        String output = " OUTPUT INSERTED." + keyColumn + " INTO @nuri_key";
        String inserting;
        if (onlyDefault.matches()) {
            inserting = "INSERT INTO " + onlyDefault.group(1) + output + " DEFAULT VALUES";
        } else if (insert.matches()) {
            inserting = insert.group(1) + output + insert.group(2);
        } else {
            throw new IllegalArgumentException("키를 돌려받을 INSERT ... VALUES 형태가 아니다: " + statement);
        }
        Object key = jdbc.queryForObject("SET NOCOUNT ON; DECLARE @nuri_key TABLE (k SQL_VARIANT); " + inserting
                + "; SELECT k FROM @nuri_key; SET NOCOUNT OFF", Object.class, arguments);
        if (key == null) {
            throw new IllegalStateException("입력이 키를 돌려주지 않았다: " + keyColumn);
        }
        return key;
    }

    /**
     * CUBRID 드라이버의 getGeneratedKeys 는 OID 를 재사용하는 표에서 -983 을 내거나 키 없이 끝난다(2026-11-06 실측). 같은 연결에서 입력한 뒤
     * LAST_INSERT_ID() 를 읽는다 — 앱(NuriCubridDialect)도 같은 길로 받는다.
     */
    private static long cubridInsertedKey(JdbcTemplate jdbc, String translated, Object[] arguments) {
        return jdbc.execute((ConnectionCallback<Long>) connection -> {
            try (PreparedStatement insert = connection.prepareStatement(translated)) {
                new ArgumentPreparedStatementSetter(arguments).setValues(insert);
                insert.executeUpdate();
            }
            try (var read = connection.createStatement(); ResultSet key = read.executeQuery("SELECT LAST_INSERT_ID() FROM db_root")) {
                if (!key.next() || key.getObject(1) == null) {
                    throw new IllegalStateException("입력이 키를 돌려주지 않았다: " + translated);
                }
                return key.getLong(1);
            }
        });
    }

    /** 드라이버는 요청한 컬럼과 상관없이 그 표의 AUTO_INCREMENT 값을 돌려준다. 다른 컬럼을 키로 달라면 엉뚱한 값을 받으므로 멈춘다. */
    private static void assertAutoIncrement(JdbcTemplate jdbc, String statement, String keyColumn) {
        Matcher insert = INSERT_COLUMNS.matcher(statement);
        if (!insert.matches()) {
            throw new IllegalArgumentException("키를 돌려받을 INSERT 형태가 아니다: " + statement);
        }
        // CUBRID 의 AUTO_INCREMENT 는 그 컬럼에 매인 시리얼이다(db_serial 의 class_name·attr_name).
        Integer automatic = vendor(jdbc) == Vendor.CUBRID
                ? jdbc.queryForObject("SELECT count(*) FROM db_serial WHERE class_name = ? AND attr_name = ?", Integer.class, insert.group(2), keyColumn)
                : jdbc.queryForObject("SELECT count(*) FROM information_schema.columns WHERE table_schema = DATABASE()"
                + " AND table_name = ? AND column_name = ? AND extra LIKE '%auto_increment%'", Integer.class, insert.group(2), keyColumn);
        if (automatic == null || automatic != 1) {
            throw new IllegalStateException(insert.group(2) + "." + keyColumn + " 은 AUTO_INCREMENT 가 아니라 JDBC 키 조회로 받을 수 없다");
        }
    }

    /**
     * 시퀀스의 다음 값을 받는다. MySQL 은 시퀀스 대신 Hibernate 와 같은 모양의 표(next_val 한 컬럼)이고 next_val 이 다음에 줄 값이다.
     * 읽고 올리기를 한 문장으로 하고 그 값은 같은 연결의 LAST_INSERT_ID() 로 읽어 다른 세션과 겹치지 않는다.
     */
    private static long nextSequenceValue(JdbcTemplate jdbc, Vendor vendor, String sequence) {
        if (vendor == Vendor.MARIADB) {
            return jdbc.queryForObject("SELECT NEXTVAL(" + sequence + ")", Long.class);
        }
        if (vendor == Vendor.CUBRID) {
            return jdbc.queryForObject("SELECT " + sequence + ".NEXT_VALUE FROM db_root", Long.class);
        }
        return jdbc.execute((ConnectionCallback<Long>) connection -> {
            try (var update = connection.createStatement()) {
                update.executeUpdate("UPDATE " + sequence + " SET next_val = LAST_INSERT_ID(next_val + 1)");
                try (ResultSet allocated = update.executeQuery("SELECT LAST_INSERT_ID() - 1")) {
                    allocated.next();
                    return allocated.getLong(1);
                }
            }
        });
    }

    static int sessionId(JdbcTemplate jdbc) {
        return switch (vendor(jdbc)) {
            case POSTGRESQL -> jdbc.queryForObject("SELECT pg_backend_pid()", Integer.class);
            case ORACLE -> jdbc.queryForObject("SELECT TO_NUMBER(SYS_CONTEXT('USERENV', 'SID')) FROM DUAL", Integer.class);
            case MARIADB, MYSQL -> jdbc.queryForObject("SELECT CONNECTION_ID()", Integer.class);
            case MSSQL -> jdbc.queryForObject("SELECT @@SPID", Integer.class);
            case CUBRID -> jdbc.execute((ConnectionCallback<Integer>) VendorTestSql::cubridProcess);
        };
    }

    /**
     * CUBRID 에는 SQL 로 읽는 세션 번호가 없다. 이 연결을 맡은 브로커 CAS 프로세스 번호를 드라이버에서 읽는다 — tranlist 의 Process id 와 같은
     * 값이다(2026-11-06 실측). 드라이버는 실행 중인 연결의 이 값을 문장이 끝날 때까지 내주지 않으므로 기다리기 전에 읽는다. 드라이버는 시험 실행 때만
     * 경로에 있어 반사로 읽는다.
     */
    private static int cubridProcess(Connection connection) throws SQLException {
        try {
            Class<?> type = Class.forName("cubrid.jdbc.driver.CUBRIDConnection");
            Object cubrid = connection.unwrap(type);
            Object session = type.getMethod("getUConnection").invoke(cubrid);
            return session.getClass().getField("casProcessId").getInt(session);
        } catch (ReflectiveOperationException failure) {
            throw new IllegalStateException("CUBRID 연결의 CAS 번호를 읽지 못했다", failure);
        }
    }

    /**
     * 다른 세션에서 찾을 수 있게 이 트랜잭션의 세션에 이름을 붙인다. PostgreSQL 만 트랜잭션이 끝나면 풀리고, 나머지는 그 연결에 남는다 — 이름은 시험마다
     * 다르게 짓는다.
     */
    static void nameSession(JdbcTemplate jdbc, String name) {
        switch (vendor(jdbc)) {
            case POSTGRESQL -> jdbc.queryForObject("SELECT set_config('application_name', ?, true)", String.class, name);
            case ORACLE -> jdbc.update("BEGIN DBMS_SESSION.SET_IDENTIFIER(?); END;", name);
            case MARIADB -> MARIADB_SESSION_NAMES.put(jdbc.queryForObject("SELECT CONNECTION_ID()", Long.class), name);
            // 다른 세션은 performance_schema.user_variables_by_thread 로 읽는다(2026-11-04 실측).
            case MYSQL -> jdbc.update("SET @egov_session = ?", name);
            case MSSQL -> MARIADB_SESSION_NAMES.put(jdbc.queryForObject("SELECT CAST(@@SPID AS BIGINT)", Long.class), name);
            case CUBRID -> MARIADB_SESSION_NAMES.put((long) sessionId(jdbc), name);
        }
    }

    /** 이 트랜잭션의 잠금 대기를 묶는다. Oracle·MySQL·MariaDB 에는 트랜잭션 범위 설정이 없고 잠금 문장의 대기가 맡는다. */
    static void boundLockWait(JdbcTemplate jdbc, String postgresqlValue) {
        if (isPostgresql(jdbc)) {
            jdbc.queryForObject("SELECT set_config('lock_timeout', ?, true)", String.class, postgresqlValue);
        }
    }

    /**
     * 시험이 따로 열고 닫는 연결의 잠금 대기를 짧게 묶는다. 세션 설정이라 커넥션 풀의 연결에는 쓰지 않는다 — MySQL·MariaDB 는 커밋 뒤에도
     * 남아 다음 대여자에게 샌다(2026-11-04 실측). Oracle 은 세션 범위 상한이 없어 잠금 문장의 WAIT 가 맡는다.
     */
    static void boundSessionLockWait(JdbcTemplate dedicated) {
        switch (vendor(dedicated)) {
            case POSTGRESQL -> dedicated.execute("SET lock_timeout = '300ms'");
            case MARIADB, MYSQL -> dedicated.execute("SET SESSION innodb_lock_wait_timeout = 1");
            case MSSQL -> dedicated.execute("SET LOCK_TIMEOUT 1000");
            case CUBRID -> dedicated.execute("SET TRANSACTION LOCK TIMEOUT 1");
            case ORACLE -> {
            }
        }
    }

    /**
     * 시험이 따로 쥔 연결의 행 잠금 문장에 대기 상한을 단다. Oracle·MariaDB 는 문장의 {@code WAIT n} 이고, MySQL 은 문장에 달 수 없어 그 연결의
     * 세션 값으로 묶는다(연결을 닫는 시험만 쓴다). PostgreSQL 은 {@link #boundLockWait} 의 트랜잭션 설정이 맡아 문장을 그대로 둔다.
     */
    static String withRowLockWait(JdbcTemplate dedicated, String forUpdate, int seconds) {
        return switch (vendor(dedicated)) {
            case POSTGRESQL -> forUpdate;
            case ORACLE, MARIADB -> forUpdate + " WAIT " + seconds;
            case MYSQL -> {
                dedicated.execute("SET SESSION innodb_lock_wait_timeout = " + seconds);
                yield forUpdate;
            }
            // 세션 값이라 커밋 뒤에도 남는다(실측). 연결을 닫는 시험만 쓴다.
            case MSSQL -> {
                dedicated.execute("SET LOCK_TIMEOUT " + seconds * 1000);
                yield forUpdate;
            }
            // 세션 값이라 커밋 뒤에도 남는다(실측). 연결을 닫는 시험만 쓴다.
            case CUBRID -> {
                dedicated.execute("SET TRANSACTION LOCK TIMEOUT " + seconds);
                yield forUpdate;
            }
        };
    }

    /** 이름이 패턴에 맞고 잠금을 기다리는 세션들. 패턴은 SQL LIKE 다. */
    static List<LockWait> lockWaits(JdbcTemplate jdbc, String sessionPattern) {
        List<LockWait> waits = new ArrayList<>();
        switch (vendor(jdbc)) {
            case POSTGRESQL -> jdbc.query("""
                    SELECT application_name, pid, lower(query) AS statement, pg_blocking_pids(pid) AS blockers
                    FROM pg_stat_activity
                    WHERE datname=current_database() AND wait_event_type='Lock' AND application_name LIKE ?
                    """, (RowCallbackHandler) row -> waits.add(new LockWait(row.getString("application_name"), row.getLong("pid"),
                    row.getString("statement"), Arrays.stream((Integer[]) row.getArray("blockers").getArray())
                            .map(Integer::longValue).collect(Collectors.toSet()))), sessionPattern);
            case ORACLE -> jdbc.query("""
                    SELECT s.client_identifier AS session_name, s.sid AS session_id, LOWER(q.sql_text) AS statement,
                           s.blocking_session
                    FROM v$session s LEFT JOIN v$sql q ON q.sql_id = s.sql_id AND q.child_number = s.sql_child_number
                    WHERE s.state = 'WAITING' AND s.event LIKE 'enq: %' AND NVL(s.client_identifier, ' ') LIKE ?
                    """, (RowCallbackHandler) row -> {
                long blocker = row.getLong("blocking_session");
                Set<Long> blockers = row.wasNull() ? Set.of() : Set.of(blocker);
                waits.add(new LockWait(row.getString("session_name"), row.getLong("session_id"), row.getString("statement"), blockers));
            }, sessionPattern);
            // 대기 하나가 막는 세션마다 한 행이다. 세션별로 묶어야 대기 세션 수가 맞다(2026-11-04 실측).
            case MYSQL -> {
                Map<Long, LockWait> bySession = new LinkedHashMap<>();
                jdbc.query("""
                        SELECT CAST(v.VARIABLE_VALUE AS CHAR(200)) AS session_name, rt.PROCESSLIST_ID AS session_id,
                               LOWER(rt.PROCESSLIST_INFO) AS statement, bt.PROCESSLIST_ID AS blocker
                        FROM performance_schema.data_lock_waits w
                        JOIN performance_schema.threads rt ON rt.THREAD_ID = w.REQUESTING_THREAD_ID
                        JOIN performance_schema.threads bt ON bt.THREAD_ID = w.BLOCKING_THREAD_ID
                        LEFT JOIN performance_schema.user_variables_by_thread v
                               ON v.THREAD_ID = rt.THREAD_ID AND v.VARIABLE_NAME = 'egov_session'
                        WHERE COALESCE(CAST(v.VARIABLE_VALUE AS CHAR(200)), ' ') LIKE ?
                        """, (RowCallbackHandler) row -> collect(bySession, row.getString("session_name"), row.getLong("session_id"),
                        row.getString("statement"), row.getLong("blocker")), sessionPattern);
                waits.addAll(bySession.values());
            }
            case MARIADB -> {
                Map<Long, LockWait> bySession = new LinkedHashMap<>();
                Pattern names = likePattern(sessionPattern);
                readMariaDbLockViews(() -> jdbc.query("""
                        SELECT r.trx_mysql_thread_id AS session_id, LOWER(r.trx_query) AS statement, b.trx_mysql_thread_id AS blocker
                        FROM information_schema.INNODB_LOCK_WAITS w
                        JOIN information_schema.INNODB_TRX r ON r.trx_id = w.requesting_trx_id
                        JOIN information_schema.INNODB_TRX b ON b.trx_id = w.blocking_trx_id
                        """, (RowCallbackHandler) row -> {
                    long session = row.getLong("session_id");
                    String name = MARIADB_SESSION_NAMES.getOrDefault(session, UNNAMED_SESSION);
                    if (names.matcher(name).matches()) {
                        collect(bySession, name, session, row.getString("statement"), row.getLong("blocker"));
                    }
                }));
                waits.addAll(bySession.values());
            }
            // 요청 하나가 막는 세션 하나를 낸다(blocking_session_id). 응용 잠금(sp_getapplock)도 같은 잠금 대기로 보인다. 앱 계정의 VIEW SERVER STATE 가 필요하다.
            case MSSQL -> {
                Map<Long, LockWait> bySession = new LinkedHashMap<>();
                Pattern names = likePattern(sessionPattern);
                jdbc.query("""
                        SELECT r.session_id, LOWER(t.text) AS statement, r.blocking_session_id
                        FROM sys.dm_exec_requests r CROSS APPLY sys.dm_exec_sql_text(r.sql_handle) t
                        WHERE r.blocking_session_id <> 0 AND r.wait_type LIKE 'LCK[_]%' AND r.database_id = DB_ID()
                        """, (RowCallbackHandler) row -> {
                    long session = row.getLong("session_id");
                    String name = MARIADB_SESSION_NAMES.getOrDefault(session, UNNAMED_SESSION);
                    if (names.matcher(name).matches()) {
                        // 매개변수 문장은 앞에 선언이 붙는다: "(@p0 bigint,@p1 nvarchar(4000))delete ...". 다른 벤더처럼 문장부터 둔다.
                        String statement = row.getString("statement");
                        collect(bySession, name, session, statement == null ? null : SQL_SERVER_PARAMETERS.matcher(statement).replaceFirst(""),
                                row.getLong("blocking_session_id"));
                    }
                });
                waits.addAll(bySession.values());
            }
            // SQL 로는 막는 세션·문장을 볼 수 없다(SHOW TRANSACTION TABLES 는 DBA 전용이고 대기 여부만 낸다). tranlist 가 둘을 낸다.
            case CUBRID -> {
                Pattern names = likePattern(sessionPattern);
                Map<Integer, CubridTranlist.Transaction> transactions = cubridTransactions();
                for (CubridTranlist.Transaction transaction : transactions.values()) {
                    String name = MARIADB_SESSION_NAMES.getOrDefault((long) transaction.process(), UNNAMED_SESSION);
                    if (transaction.holders().isEmpty() || !names.matcher(name).matches()) {
                        continue;
                    }
                    Set<Long> blockers = transaction.holders().stream().map(transactions::get).filter(java.util.Objects::nonNull)
                            .map(holder -> (long) holder.process()).collect(Collectors.toSet());
                    waits.add(new LockWait(name, transaction.process(), transaction.statement(), blockers));
                }
            }
        }
        return waits;
    }

    /**
     * 실행 도구가 띄운 컨테이너의 {@code cubrid tranlist -f} 를 읽는다. 시험 JVM 에서 docker 로 부른다 — 한 번에 약 0.2초다. 모르는 모양의 행은
     * 건너뛰지 않고 멈춘다. 건너뛰면 대기를 보지 못한 채 "기다리지 않는다" 로 판정된다.
     */
    static Map<Integer, CubridTranlist.Transaction> cubridTransactions() {
        String container = System.getenv("VENDOR_TEST_CONTAINER");
        if (container == null || container.isBlank()) {
            throw new IllegalStateException("CUBRID 잠금 관측은 실행 도구가 준 VENDOR_TEST_CONTAINER 가 필요하다");
        }
        // jdbc:cubrid:<호스트>:<포트>:<DB>:::?...
        String database = System.getenv("VENDOR_TEST_URL").split(":")[4];
        String output;
        java.nio.file.Path capture = null;
        try {
            // 출력은 파일로 받는다. 파이프를 끝까지 읽고 나서 기다리면 docker 가 출력을 연 채 멈췄을 때 시간 제한에 닿지 못한다.
            capture = java.nio.file.Files.createTempFile("cubrid-tranlist-", ".txt");
            Process process = new ProcessBuilder("docker", "exec", "-u", "cubrid", container, "cubrid", "tranlist", "-f", database)
                    .redirectErrorStream(true).redirectOutput(capture.toFile()).start();
            if (!process.waitFor(30, TimeUnit.SECONDS)) {
                process.destroyForcibly();
                throw new IllegalStateException("cubrid tranlist 가 30초 안에 끝나지 않았다");
            }
            output = java.nio.file.Files.readString(capture, java.nio.charset.StandardCharsets.UTF_8);
            if (process.exitValue() != 0) {
                throw new IllegalStateException("cubrid tranlist 실패: " + output.strip());
            }
        } catch (java.io.IOException failure) {
            throw new IllegalStateException("cubrid tranlist 를 부르지 못했다", failure);
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("cubrid tranlist 를 기다리다 중단됐다", interrupted);
        } finally {
            if (capture != null) {
                capture.toFile().delete();
            }
        }
        return CubridTranlist.parse(output);
    }

    private static void collect(Map<Long, LockWait> bySession, String name, long session, String statement, long blocker) {
        bySession.computeIfAbsent(session, id -> new LockWait(name, id, statement, new HashSet<>())).blockers().add(blocker);
    }

    /** SQL LIKE 패턴을 정규식으로 바꾼다. {@code %} 는 아무 글자열, {@code _} 는 한 글자다. */
    private static Pattern likePattern(String like) {
        StringBuilder regex = new StringBuilder("(?s)");
        StringBuilder literal = new StringBuilder();
        for (char c : like.toCharArray()) {
            if (c == '%' || c == '_') {
                regex.append(Pattern.quote(literal.toString())).append(c == '%' ? ".*" : ".");
                literal.setLength(0);
            } else {
                literal.append(c);
            }
        }
        return Pattern.compile(regex.append(Pattern.quote(literal.toString())).toString());
    }

    /** 앞 읽기에서 캐시가 새로 채워질 만큼 지난 뒤에 읽는다. 시험 JVM 의 모든 관측을 한 줄로 세워 서로의 읽기가 캐시를 붙잡지 않게 한다. */
    private static void readMariaDbLockViews(Runnable read) {
        synchronized (MARIADB_LOCK_VIEW) {
            long wait;
            while ((wait = mariaDbLockViewReadAt + MARIADB_LOCK_VIEW_REFRESH_NANOS - System.nanoTime()) > 0) {
                LockSupport.parkNanos(wait);
            }
            try {
                read.run();
            } finally {
                mariaDbLockViewReadAt = System.nanoTime();
            }
        }
    }

    static int waitingSessions(JdbcTemplate jdbc, String sessionPattern) {
        return lockWaits(jdbc, sessionPattern).size();
    }

    /** 이름 붙은 세션이 {@code blocker} 세션을 기다리는가. {@code table} 이 있으면 그 표를 건드리는 문장이어야 한다. */
    static boolean waitsOn(JdbcTemplate jdbc, String session, long blocker, String table) {
        return lockWaits(jdbc, session).stream()
                .anyMatch(wait -> wait.blockedBy(blocker) && (table == null || wait.touches(table)));
    }

    /** {@code blocker} 뒤에 줄 선 세션 수. 기다리는 세션을 기다리는 세션도 센다. */
    static int waitersBehind(JdbcTemplate jdbc, long blocker) {
        List<LockWait> waits = lockWaits(jdbc, "%");
        Set<Long> chain = new HashSet<>(Set.of(blocker));
        boolean grew = true;
        while (grew) {
            grew = false;
            for (LockWait wait : waits) {
                if (!chain.contains(wait.id()) && wait.blockers().stream().anyMatch(chain::contains)) {
                    grew = chain.add(wait.id());
                }
            }
        }
        return chain.size() - 1;
    }

    /**
     * 이 세션을 기다리는 세션이 있는가. 잠금을 쥔 트랜잭션 안에서 되풀이해 묻는 시험용이다. PostgreSQL 의 pg_stat_activity 는 트랜잭션 안에서
     * 첫 조회 값을 재사용해 늦게 줄 선 세션을 보지 못하므로 실시간인 pg_locks 를 본다. MySQL 의 performance_schema 는 트랜잭션 안에서도 실시간이다.
     */
    static boolean hasWaiters(JdbcTemplate jdbc, long blocker) {
        return isPostgresql(jdbc)
                ? Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM pg_locks WHERE NOT granted AND ?=ANY(pg_blocking_pids(pid)))",
                        Boolean.class, blocker))
                : waitersBehind(jdbc, blocker) > 0;
    }

    /**
     * 응용 잠금을 기다리는 세션 수. PostgreSQL 은 advisory 잠금, 나머지는 슬롯 행이다. SQL Server 는 sp_getapplock 의 대기를 잠금 관리자에서 읽는다 —
     * 시스템 프로시저를 도는 요청은 문장 텍스트로 찾을 수 없다.
     */
    static int waitingOnApplicationLock(JdbcTemplate jdbc, String session) {
        if (isPostgresql(jdbc)) {
            return jdbc.queryForObject("SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() "
                    + "AND application_name=? AND wait_event_type='Lock' AND wait_event='advisory'", Integer.class, session);
        }
        if (vendor(jdbc) == Vendor.MSSQL) {
            Pattern names = likePattern(session);
            return (int) jdbc.queryForList("SELECT CAST(request_session_id AS BIGINT) FROM sys.dm_tran_locks WHERE resource_type = 'APPLICATION'"
                    + " AND request_status = 'WAIT' AND resource_database_id = DB_ID()", Long.class).stream()
                    .filter(id -> names.matcher(MARIADB_SESSION_NAMES.getOrDefault(id, UNNAMED_SESSION)).matches()).count();
        }
        return (int) lockWaits(jdbc, session).stream().filter(wait -> wait.touches("tb_sys_lock_slot")).count();
    }

    /**
     * 행 잠금 조회 문장의 표기. 관측한 대기 문장이 잠금 조회인지 볼 때 쓴다. SQL Server 는 잠금 절 대신 표 힌트다(Hibernate 방언·포트 모두,
     * {@code (@p0 nvarchar(4000))select ... with (updlock,rowlock)}).
     */
    static String lockingReadPattern() {
        return vendor() == Vendor.MSSQL ? "with \\((updlock|xlock)" : "for (no key )?update";
    }

    /** 시험을 묶는 문장 대기 상한. 다른 벤더에는 트랜잭션 범위 설정이 없다. */
    static void boundStatement(JdbcTemplate jdbc, String postgresqlValue) {
        if (isPostgresql(jdbc)) {
            jdbc.queryForObject("SELECT set_config('statement_timeout', ?, true)", String.class, postgresqlValue);
        }
    }

    /**
     * 실패를 주입하는 시험 트리거. 조건의 {@code NEW.}·{@code OLD.} 는 모든 벤더가 이 표기로 쓴다. MySQL 계열의 SQLSTATE 45000 은 PostgreSQL 의
     * RAISE EXCEPTION(P0001)처럼 무결성 위반으로 읽히지 않는 사용자 오류다.
     */
    static void failingTrigger(JdbcTemplate jdbc, String name, String timing, String table, String condition, String message) {
        switch (vendor(jdbc)) {
            case POSTGRESQL -> {
                jdbc.execute("CREATE FUNCTION " + name + "() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF " + condition
                        + " THEN RAISE EXCEPTION '" + message + "'; END IF; RETURN NEW; END $$");
                jdbc.execute("CREATE TRIGGER " + name + " " + timing + " ON " + table + " FOR EACH ROW EXECUTE FUNCTION " + name + "()");
            }
            case ORACLE -> jdbc.execute("CREATE OR REPLACE TRIGGER " + name + " " + timing + " ON " + table + " FOR EACH ROW BEGIN IF "
                    + condition.replaceAll("\\b(NEW|OLD)\\.", ":$1.") + " THEN RAISE_APPLICATION_ERROR(-20099, '" + message + "'); END IF; END;");
            case MARIADB, MYSQL -> jdbc.execute("CREATE TRIGGER " + name + " " + timing + " ON " + table + " FOR EACH ROW BEGIN IF "
                    + condition + " THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '" + message + "'; END IF; END");
            case MSSQL -> jdbc.execute(sqlServerTrigger(name, timing, table, condition,
                    "THROW 50099, '" + message + "', 1;"));
            case CUBRID -> jdbc.execute(cubridRejectTrigger(name, timing, table, condition));
        }
    }

    /**
     * 감사 원장 보호 트리거(tr_<표>_chg_prhb)의 거부가 메시지에 남기는 글자. 다른 벤더는 PostgreSQL 과 같은 append-only 문구를 낸다. CUBRID 트리거는 문구를
     * 정할 수 없고 메시지에 트리거 이름({@code tr_<표>_chg_prhb_u}·{@code _d})이 든다(2026-11-06 실측).
     */
    static String appendOnlyRejection() {
        return vendor() == Vendor.CUBRID ? "_chg_prhb_" : "append-only";
    }

    /** 이 벤더가 저장하는 시각. CUBRID 는 밀리초 아래 자리를 버린다(CubridJdbcDataSource 가 바인딩에서 자른다). */
    static java.time.LocalDateTime storedTime(java.time.LocalDateTime value) {
        return vendor() == Vendor.CUBRID && value != null ? value.truncatedTo(java.time.temporal.ChronoUnit.MILLIS) : value;
    }

    /** CUBRID 의 DATETIME 은 밀리초(3자리)다. PostgreSQL 정밀도 {@code requested} 를 그 벤더가 담는 자리수로 돌려준다(원장의 시각 정밀도 저하). */
    static int storedTimestampPrecision(int requested) {
        return vendor() == Vendor.CUBRID ? Math.min(requested, 3) : requested;
    }

    /**
     * {@link #failingTrigger} 의 실패가 오류 메시지에 남기는 글자. CUBRID 는 문구를 정할 수 없고 메시지에 트리거 이름이 든다
     * ({@code The operation has been rejected by trigger "<owner>.<name>"}, 2026-11-06 실측).
     */
    static String failingTriggerText(JdbcTemplate jdbc, String name, String message) {
        return vendor(jdbc) == Vendor.CUBRID ? name : message;
    }

    /**
     * CUBRID 트리거의 동작은 SQL 한 문장이고 오류 문구를 정할 수 없다 — REJECT 가 -517 로 문장을 되돌린다. 이름이 ck_ 로 시작하지 않아 CHECK 위반으로
     * 읽히지 않는 사용자 오류다(CubridSqlDialect). REJECT 는 BEFORE 트리거에서만 쓴다. BEFORE 의 새 행은 new, 바뀌기 전 행은 obj 다.
     */
    private static String cubridRejectTrigger(String name, String timing, String table, String condition) {
        String event = timing.replaceFirst("(?i)^(BEFORE|AFTER)\\s+", "").toUpperCase(Locale.ROOT);
        return "CREATE TRIGGER " + name + " BEFORE " + event + " ON " + table + " IF (" + cubridRows(condition) + ") EXECUTE REJECT";
    }

    private static String cubridRows(String condition) {
        return condition.replaceAll("\\bNEW\\.", "new.").replaceAll("\\bOLD\\.", "obj.");
    }

    /** 없으면 지울 것도 없다. CUBRID 에는 DROP TRIGGER IF EXISTS 가 없다(2026-11-06 실측). */
    private static void dropQuietly(JdbcTemplate jdbc, String statement) {
        try {
            jdbc.execute(statement);
        } catch (org.springframework.dao.DataAccessException absent) {
            // 없으면 지울 것도 없다.
        }
    }

    /**
     * SQL Server 트리거는 문장 단위의 AFTER 트리거다. BEFORE 가 없어 행이 들어간 뒤 오류로 문장을 되돌리고, 행 조건은 inserted·deleted 를 NEW·OLD
     * 별칭으로 읽는다. 조건이 둘을 함께 읽는 시험은 없다.
     */
    private static String sqlServerTrigger(String name, String timing, String table, String condition, String body) {
        String event = timing.replaceFirst("(?i)^(BEFORE|AFTER)\\s+", "");
        String rows = condition.contains("OLD.") ? "deleted AS OLD" : "inserted AS NEW";
        if (condition.contains("OLD.") && condition.contains("NEW.")) {
            throw new IllegalArgumentException("NEW·OLD 를 함께 읽는 조건은 지원하지 않는다: " + condition);
        }
        return "CREATE TRIGGER " + name + " ON " + table + " AFTER " + event + " AS BEGIN SET NOCOUNT ON; IF EXISTS (SELECT 1 FROM "
                + rows + " WHERE " + condition + ") BEGIN " + body + " END END";
    }

    /**
     * 조건에 맞는 둘째 행 삭제에서 실패한다. PostgreSQL 은 시험이 자기 표를 세는 트리거를 쓴다. Oracle 의 행 트리거는 자기 표를 읽지 못해(ORA-04091)
     * 시퀀스로 세고, MySQL 계열은 삭제하는 세션의 사용자 변수로 센다 — 서비스의 삭제는 한 트랜잭션, 한 연결이다.
     */
    static void failingSecondDelete(JdbcTemplate jdbc, String name, String table, String condition, String message) {
        switch (vendor(jdbc)) {
            case ORACLE -> {
                jdbc.execute("CREATE SEQUENCE " + name + "_n");
                jdbc.execute("CREATE OR REPLACE TRIGGER " + name + " BEFORE DELETE ON " + table + " FOR EACH ROW BEGIN IF "
                        + condition.replaceAll("\\bOLD\\.", ":OLD.") + " AND " + name + "_n.NEXTVAL > 1 THEN RAISE_APPLICATION_ERROR(-20099, '"
                        + message + "'); END IF; END;");
            }
            case MARIADB, MYSQL -> jdbc.execute("CREATE TRIGGER " + name + " BEFORE DELETE ON " + table + " FOR EACH ROW BEGIN IF "
                    + condition + " THEN SET @" + name + "_n = COALESCE(@" + name + "_n, 0) + 1; IF @" + name
                    + "_n > 1 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '" + message + "'; END IF; END IF; END");
            // 문장 단위 트리거라 지운 행 수를 세션 문맥에 쌓는다(MySQL 계열의 사용자 변수와 같다). 한 문장이 둘을 지워도 둘째에서 실패한다.
            case MSSQL -> jdbc.execute("CREATE TRIGGER " + name + " ON " + table + " AFTER DELETE AS BEGIN SET NOCOUNT ON;"
                    + " DECLARE @n INT = COALESCE(CAST(SESSION_CONTEXT(N'" + name + "_n') AS INT), 0)"
                    + " + (SELECT COUNT(*) FROM deleted AS OLD WHERE " + condition + ");"
                    + " EXEC sp_set_session_context N'" + name + "_n', @n;"
                    + " IF @n > 1 THROW 50099, '" + message + "', 1; END");
            // AFTER DELETE 트리거는 지운 행을 읽지 못한다(old 미정의, 2026-11-06 실측). 지우기 전에 계수 표에 한 행을 넣고, 계수 표의 입력 트리거가
            // 둘째 행을 거부한다 — 그 거부가 삭제 문장을 되돌린다. 계수 표는 트랜잭션과 함께 되돌려진다.
            case CUBRID -> {
                jdbc.execute("CREATE TABLE " + name + "_n (n INT)");
                jdbc.execute("CREATE TRIGGER " + name + "_n BEFORE INSERT ON " + name + "_n IF ((SELECT COUNT(*) FROM " + name + "_n) > 0) EXECUTE REJECT");
                jdbc.execute("CREATE TRIGGER " + name + " BEFORE DELETE ON " + table + " IF (" + cubridRows(condition) + ") EXECUTE INSERT INTO "
                        + name + "_n VALUES (1)");
            }
            case POSTGRESQL -> throw new IllegalStateException("PostgreSQL 은 시험이 자기 표를 세는 트리거를 쓴다");
        }
    }

    static void dropSecondDeleteTrigger(JdbcTemplate jdbc, String name) {
        switch (vendor(jdbc)) {
            case ORACLE -> {
                jdbc.execute("DROP TRIGGER " + name);
                jdbc.execute("DROP SEQUENCE " + name + "_n");
            }
            case MARIADB, MYSQL, MSSQL -> jdbc.execute("DROP TRIGGER IF EXISTS " + name);
            case CUBRID -> {
                dropQuietly(jdbc, "DROP TRIGGER " + name);
                dropQuietly(jdbc, "DROP TRIGGER " + name + "_n");
                dropQuietly(jdbc, "DROP TABLE IF EXISTS " + name + "_n");
            }
            case POSTGRESQL -> throw new IllegalStateException("PostgreSQL 은 시험이 자기 트리거를 지운다");
        }
    }

    static void dropFailingTrigger(JdbcTemplate jdbc, String name, String table) {
        switch (vendor(jdbc)) {
            case POSTGRESQL -> {
                jdbc.execute("DROP TRIGGER IF EXISTS " + name + " ON " + table);
                jdbc.execute("DROP FUNCTION IF EXISTS " + name + "()");
            }
            case ORACLE -> {
                try {
                    jdbc.execute("DROP TRIGGER " + name);
                } catch (org.springframework.dao.DataAccessException absent) {
                    // 없으면 지울 것도 없다.
                }
            }
            case MARIADB, MYSQL, MSSQL -> jdbc.execute("DROP TRIGGER IF EXISTS " + name);
            case CUBRID -> dropQuietly(jdbc, "DROP TRIGGER " + name);
        }
    }

    static boolean tableExists(JdbcTemplate jdbc, String table) {
        return switch (vendor(jdbc)) {
            case POSTGRESQL -> Boolean.TRUE.equals(jdbc.queryForObject("SELECT to_regclass('public.' || ?) IS NOT NULL", Boolean.class, table));
            case ORACLE -> jdbc.queryForObject("SELECT count(*) FROM user_tables WHERE table_name = UPPER(?)", Integer.class, table) > 0;
            case MARIADB, MYSQL -> jdbc.queryForObject("SELECT count(*) FROM information_schema.tables WHERE table_schema = DATABASE()"
                    + " AND table_name = ?", Integer.class, table) > 0;
            case MSSQL -> jdbc.queryForObject("SELECT count(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = SCHEMA_NAME()"
                    + " AND TABLE_NAME = ?", Integer.class, table) > 0;
            case CUBRID -> jdbc.queryForObject("SELECT count(*) FROM db_class WHERE class_name = ? AND owner_name = CURRENT_USER",
                    Integer.class, table) > 0;
        };
    }

    /** 문자 컬럼인가. MySQL 계열 어댑터는 문자열을 길이 그대로 VARCHAR 로 옮긴다. */
    static boolean isTextColumn(JdbcTemplate jdbc, String table, String column) {
        return switch (vendor(jdbc)) {
            case POSTGRESQL -> List.of("character varying").equals(jdbc.queryForList("SELECT data_type FROM information_schema.columns"
                    + " WHERE table_schema = current_schema() AND table_name = ? AND column_name = ?", String.class, table, column));
            case ORACLE -> jdbc.queryForObject("SELECT count(*) FROM user_tab_columns WHERE table_name = UPPER(?) AND column_name = UPPER(?)"
                    + " AND data_type IN ('VARCHAR2', 'CLOB')", Integer.class, table, column) == 1;
            case MARIADB, MYSQL -> List.of("varchar").equals(jdbc.queryForList("SELECT LOWER(data_type) FROM information_schema.columns"
                    + " WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?", String.class, table, column));
            // 어댑터는 문자열을 NVARCHAR(n)·NVARCHAR(MAX) 로 옮긴다.
            case MSSQL -> List.of("nvarchar").equals(jdbc.queryForList("SELECT LOWER(DATA_TYPE) FROM INFORMATION_SCHEMA.COLUMNS"
                    + " WHERE TABLE_SCHEMA = SCHEMA_NAME() AND TABLE_NAME = ? AND COLUMN_NAME = ?", String.class, table, column));
            // VARCHAR(n)·STRING 은 카탈로그에서 모두 STRING 이다.
            case CUBRID -> List.of("STRING").equals(jdbc.queryForList("SELECT data_type FROM db_attribute WHERE class_name = ? AND attr_name = ?",
                    String.class, table, column));
        };
    }

    static Integer timestampPrecision(JdbcTemplate jdbc, String table, String column) {
        return switch (vendor(jdbc)) {
            case POSTGRESQL -> jdbc.queryForObject("SELECT datetime_precision FROM information_schema.columns "
                    + "WHERE table_schema=current_schema() AND table_name=? AND column_name=?", Integer.class, table, column);
            case ORACLE -> jdbc.queryForObject("SELECT data_scale FROM user_tab_columns WHERE table_name = UPPER(?) AND column_name = UPPER(?)",
                    Integer.class, table, column);
            case MARIADB, MYSQL -> jdbc.queryForObject("SELECT datetime_precision FROM information_schema.columns "
                    + "WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?", Integer.class, table, column);
            case MSSQL -> jdbc.queryForObject("SELECT DATETIME_PRECISION FROM INFORMATION_SCHEMA.COLUMNS "
                    + "WHERE TABLE_SCHEMA = SCHEMA_NAME() AND TABLE_NAME = ? AND COLUMN_NAME = ?", Integer.class, table, column);
            // DATETIME 은 밀리초(소수 3자리)다.
            case CUBRID -> jdbc.queryForObject("SELECT scale FROM db_attribute WHERE class_name = ? AND attr_name = ?", Integer.class, table, column);
        };
    }

    /** 이름이 같은 제약의 수. MySQL·MariaDB 의 기본 키 이름은 늘 PRIMARY 라 기본 키는 {@link #upsertConflictKeys} 로 본다. */
    static Integer constraintCount(JdbcTemplate jdbc, String constraint) {
        return switch (vendor(jdbc)) {
            case POSTGRESQL -> jdbc.queryForObject("SELECT count(*) FROM pg_constraint WHERE conname=?", Integer.class, constraint);
            case ORACLE -> jdbc.queryForObject("SELECT count(*) FROM user_constraints WHERE constraint_name = UPPER(?)", Integer.class, constraint);
            case MARIADB, MYSQL -> jdbc.queryForObject("SELECT count(*) FROM information_schema.table_constraints WHERE constraint_schema = DATABASE()"
                    + " AND constraint_name = ?", Integer.class, constraint);
            // NULL 을 허용하는 유일 키는 어댑터가 필터 유일 인덱스로 옮겨 제약 표에 없다. 같은 유일성 집행이라 함께 센다.
            case MSSQL -> jdbc.queryForObject("SELECT (SELECT count(*) FROM sys.objects WHERE name = ? AND type IN ('PK','UQ','F','C'))"
                    + " + (SELECT count(*) FROM sys.indexes WHERE name = ? AND is_unique = 1 AND is_primary_key = 0 AND is_unique_constraint = 0)",
                    Integer.class, constraint, constraint);
            // 키·FK 는 인덱스 이름이다. CHECK 는 어댑터가 <이름>_i·_u 트리거 한 쌍으로 옮긴다 — 둘이 다 있어야 한 제약이다.
            case CUBRID -> jdbc.queryForObject("SELECT (SELECT count(*) FROM db_index WHERE index_name = ?)"
                    + " + (SELECT CASE WHEN count(*) = 2 THEN 1 ELSE 0 END FROM db_trig WHERE trigger_name IN (? || '_i', ? || '_u'))"
                    + " FROM db_root", Integer.class, constraint, constraint, constraint);
        };
    }

    /**
     * upsert 가 충돌로 보는 키. PostgreSQL·Oracle 은 문장이 이름으로 고른 기본 키 하나다. MySQL·MariaDB 의 ON DUPLICATE KEY UPDATE 는 키를
     * 고르지 못하고 그 표의 모든 유일 키에 반응하므로 표의 유일 키 전부를 돌려준다. 기본 키 이름이 늘 PRIMARY 라 그 이름은 {@code primaryKey} 로 읽는다.
     */
    static List<String> upsertConflictKeys(JdbcTemplate jdbc, String table, String primaryKey) {
        // CUBRID 의 ON DUPLICATE KEY UPDATE 도 표의 모든 유일 키에 반응한다. 기본 키 이름은 정의한 이름 그대로다.
        if (vendor(jdbc) == Vendor.CUBRID) {
            return jdbc.queryForList("SELECT index_name FROM db_index WHERE class_name = ? AND is_unique = 'YES' ORDER BY index_name", String.class, table);
        }
        if (!vendor(jdbc).innoDb()) {
            return constraintCount(jdbc, primaryKey) == 1 ? List.of(primaryKey) : List.of();
        }
        return jdbc.queryForList("SELECT constraint_name FROM information_schema.table_constraints WHERE constraint_schema = DATABASE()"
                        + " AND table_name = ? AND constraint_type IN ('PRIMARY KEY', 'UNIQUE') ORDER BY constraint_name", String.class, table)
                .stream().map(name -> "PRIMARY".equals(name) ? primaryKey : name).toList();
    }

    /** 제약이 켜져 있고 기존 행까지 검증됐는가. 제약이 없으면 실패한다. MySQL·MariaDB 의 제약은 만들 때 기존 행을 검사하고 검증 보류 상태가 없다. */
    static boolean constraintValidated(JdbcTemplate jdbc, String constraint) {
        return switch (vendor(jdbc)) {
            case POSTGRESQL -> Boolean.TRUE.equals(jdbc.queryForObject("SELECT convalidated FROM pg_constraint WHERE conname = ?", Boolean.class, constraint));
            case ORACLE -> "ENABLEDVALIDATED".equals(jdbc.queryForObject("SELECT status || validated FROM user_constraints WHERE constraint_name = UPPER(?)",
                    String.class, constraint));
            case MARIADB, MYSQL -> jdbc.queryForObject("SELECT constraint_type FROM information_schema.table_constraints"
                    + " WHERE constraint_schema = DATABASE() AND constraint_name = ?", String.class, constraint) != null;
            // CHECK·FK 는 꺼졌거나(is_disabled) 기존 행을 검사하지 않았으면(is_not_trusted) 검증되지 않은 것이다. 키·유일 인덱스는 만들 때 검사한다.
            case MSSQL -> jdbc.queryForObject("SELECT CASE WHEN EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = ? AND is_disabled = 0 AND is_not_trusted = 0)"
                    + " OR EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = ? AND is_disabled = 0 AND is_not_trusted = 0)"
                    + " OR EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = ?)"
                    + " OR EXISTS (SELECT 1 FROM sys.indexes WHERE name = ? AND is_unique = 1 AND is_disabled = 0) THEN 1 ELSE 0 END",
                    Integer.class, constraint, constraint, constraint, constraint) == 1;
            // 키·FK 는 만들 때 기존 행을 검사한다. CHECK 트리거는 기존 행을 보지 않지만 번역 기준선은 빈 표에 만든다.
            case CUBRID -> constraintCount(jdbc, constraint) == 1;
        };
    }

    static boolean indexExists(JdbcTemplate jdbc, String index) {
        return (switch (vendor(jdbc)) {
            case POSTGRESQL -> jdbc.queryForObject("SELECT count(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname = ?", Integer.class, index);
            case ORACLE -> jdbc.queryForObject("SELECT count(*) FROM user_indexes WHERE index_name = UPPER(?)", Integer.class, index);
            // 인덱스는 컬럼마다 한 행이다. 표 기준으로 센다.
            case MARIADB, MYSQL -> jdbc.queryForObject("SELECT count(DISTINCT table_name) FROM information_schema.statistics"
                    + " WHERE table_schema = DATABASE() AND index_name = ?", Integer.class, index);
            case MSSQL -> jdbc.queryForObject("SELECT count(*) FROM sys.indexes WHERE name = ?", Integer.class, index);
            case CUBRID -> jdbc.queryForObject("SELECT count(DISTINCT class_name) FROM db_index WHERE index_name = ?", Integer.class, index);
        }) == 1;
    }

    /** 표의 외래 키 컬럼 이름. 소문자다. */
    static List<String> foreignKeyColumns(JdbcTemplate jdbc, String table) {
        return switch (vendor(jdbc)) {
            case POSTGRESQL -> jdbc.queryForList("""
                    SELECT a.attname FROM pg_constraint c
                    JOIN unnest(c.conkey) AS k(attnum) ON TRUE
                    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
                    WHERE c.conrelid = ?::regclass AND c.contype = 'f'
                    """, String.class, table);
            case ORACLE -> jdbc.queryForList("""
                    SELECT LOWER(k.column_name) FROM user_constraints c
                    JOIN user_cons_columns k ON k.constraint_name = c.constraint_name
                    WHERE c.table_name = UPPER(?) AND c.constraint_type = 'R'
                    """, String.class, table);
            case MARIADB, MYSQL -> jdbc.queryForList("""
                    SELECT LOWER(column_name) FROM information_schema.key_column_usage
                    WHERE table_schema = DATABASE() AND table_name = ? AND referenced_table_name IS NOT NULL
                    """, String.class, table);
            case MSSQL -> jdbc.queryForList("""
                    SELECT LOWER(c.name) FROM sys.foreign_key_columns k
                    JOIN sys.columns c ON c.object_id = k.parent_object_id AND c.column_id = k.parent_column_id
                    WHERE k.parent_object_id = OBJECT_ID(?)
                    """, String.class, table);
            case CUBRID -> jdbc.queryForList("""
                    SELECT LOWER(k.key_attr_name) FROM db_index i
                    JOIN db_index_key k ON k.index_name = i.index_name AND k.class_name = i.class_name
                    WHERE i.class_name = ? AND i.is_foreign_key = 'YES'
                    """, String.class, table);
        };
    }

    /** 컬럼 기본값의 정의 문자열. */
    static String columnDefault(JdbcTemplate jdbc, String table, String column) {
        return switch (vendor(jdbc)) {
            case POSTGRESQL -> jdbc.queryForObject("SELECT column_default FROM information_schema.columns WHERE table_name = ? AND column_name = ?",
                    String.class, table, column);
            case ORACLE -> jdbc.queryForObject("SELECT data_default FROM user_tab_columns WHERE table_name = UPPER(?) AND column_name = UPPER(?)",
                    String.class, table, column);
            case MARIADB, MYSQL -> jdbc.queryForObject("SELECT column_default FROM information_schema.columns WHERE table_schema = DATABASE()"
                    + " AND table_name = ? AND column_name = ?", String.class, table, column);
            case MSSQL -> jdbc.queryForObject("SELECT COLUMN_DEFAULT FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = SCHEMA_NAME()"
                    + " AND TABLE_NAME = ? AND COLUMN_NAME = ?", String.class, table, column);
            case CUBRID -> jdbc.queryForObject("SELECT default_value FROM db_attribute WHERE class_name = ? AND attr_name = ?", String.class, table, column);
        };
    }

    /**
     * 한국 날짜(yyyyMMdd) 기본값의 정의인가. MySQL 계열 어댑터는 시간대 표 없이 UTC 에 9시간을 더한다. SQL Server 어댑터는 Windows 시간대 이름과
     * 날짜 스타일 112(yyyyMMdd)다. 카탈로그가 식을 소문자로 다시 쓰므로 소문자로 대조한다.
     */
    static void assertKoreanDateDefault(JdbcTemplate jdbc, String definition) {
        if (vendor(jdbc).innoDb()) {
            assertThat(definition.toLowerCase(Locale.ROOT)).contains("utc_timestamp()", "interval 9 hour", "%y%m%d");
        } else if (vendor(jdbc) == Vendor.MSSQL) {
            assertThat(definition.toLowerCase(Locale.ROOT)).contains("korea standard time", "112");
        } else if (vendor(jdbc) == Vendor.CUBRID) {
            // 서버 시계가 한국 시간이다(CubridSqlDialect.assertSession 이 기동 때 UTC 차이를 본다).
            assertThat(definition.toLowerCase(Locale.ROOT)).contains("sys_date", "yyyymmdd");
        } else {
            assertThat(definition).contains("Asia/Seoul").contains("YYYYMMDD");
        }
    }

    /** DB 가 계산한 한국 날짜(yyyyMMdd). MySQL 계열은 어댑터의 기본값과 같은 식이다. */
    static String koreanToday(JdbcTemplate jdbc) {
        return jdbc.queryForObject(switch (vendor(jdbc)) {
            case POSTGRESQL -> "SELECT to_char((now() AT TIME ZONE 'Asia/Seoul'), 'YYYYMMDD')";
            case ORACLE -> "SELECT TO_CHAR(SYSTIMESTAMP AT TIME ZONE 'Asia/Seoul', 'YYYYMMDD') FROM DUAL";
            case MARIADB, MYSQL -> "SELECT DATE_FORMAT(UTC_TIMESTAMP() + INTERVAL 9 HOUR, '%Y%m%d')";
            case MSSQL -> "SELECT CONVERT(NVARCHAR(8), SYSDATETIMEOFFSET() AT TIME ZONE 'Korea Standard Time', 112)";
            case CUBRID -> "SELECT TO_CHAR(SYS_DATE, 'YYYYMMDD') FROM db_root";
        }, String.class);
    }

    /**
     * JdbcTemplate 문장의 CHECK 위반이 오는 예외. MySQL 의 3819 는 SQLState 가 HY000 이라 Spring 이 분류하지 못한다. 앱 응답은
     * GlobalExceptionHandler 의 벤더 번호 표가 400 으로 맞춘다.
     */
    static Class<? extends org.springframework.dao.DataAccessException> jdbcCheckViolation(JdbcTemplate jdbc) {
        // CUBRID 의 CHECK 트리거 거부(-517)는 SQLState 가 없어 분류되지 않는다(2026-11-06 실측).
        return vendor(jdbc) == Vendor.MYSQL || vendor(jdbc) == Vendor.CUBRID
                ? org.springframework.jdbc.UncategorizedSQLException.class : DataIntegrityViolationException.class;
    }

    /** 시간대 없는 UTC 현재 시각 식. MySQL 계열에는 {@code AT TIME ZONE} 이 없다. */
    static String utcNowExpression(JdbcTemplate jdbc) {
        return switch (vendor(jdbc)) {
            case POSTGRESQL, ORACLE -> "(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')";
            case MARIADB, MYSQL -> "UTC_TIMESTAMP(6)";
            case MSSQL -> "SYSUTCDATETIME()";
            // UTC_TIMESTAMP() 는 초 단위다. 서버 시계(한국 시간, 밀리초)에서 9시간을 뺀다 — 한국은 일광 절약 시간이 없다.
            case CUBRID -> "DATE_ADD(SYS_DATETIME, INTERVAL -9 HOUR)";
        };
    }

    /** 한 행을 읽는다. 정수는 컬럼 타입과 상관없이 Long 이다. Oracle 은 정수 컬럼도 NUMBER 로 돌려준다. */
    static Map<String, Object> row(JdbcTemplate jdbc, String statement, Object... arguments) {
        Map<String, Object> row = jdbc.queryForMap(statement, arguments);
        row.replaceAll((column, value) -> value instanceof Number number && isIntegral(number) ? (Object) number.longValue() : value);
        return row;
    }

    private static boolean isIntegral(Number number) {
        return !(number instanceof BigDecimal decimal) || decimal.stripTrailingZeros().scale() <= 0;
    }

    /** 빈 문자열로 저장한 값을 읽으면 나오는 값. Oracle 은 빈 문자열이 NULL 이다. */
    static String storedEmptyText(JdbcTemplate jdbc) {
        return stored(jdbc, "");
    }

    /** 이 값을 저장하고 읽으면 나오는 값. */
    static String stored(JdbcTemplate jdbc, String value) {
        return vendor(jdbc) == Vendor.ORACLE && value != null && value.isEmpty() ? null : value;
    }

    /** 외래 키 위반의 SQLState. Oracle·MySQL·MariaDB 는 무결성 위반이 모두 23000 이다. */
    static String foreignKeyState(JdbcTemplate jdbc) {
        // CUBRID 는 SQLState 가 없어 번호다(observedState). 부모 없는 자식 입력은 -922 다(2026-11-05 실측).
        return vendor(jdbc) == Vendor.CUBRID ? "-922" : isPostgresql(jdbc) ? "23503" : "23000";
    }

    /**
     * 시험이 실제 DB 오류였음을 대조할 때 쓰는 값. SQLState 이고, SQLState 를 주지 않는 CUBRID 는 오류 번호다 — 비어 있는 값끼리 대조하면 아무 오류나
     * 통과한다.
     */
    static String observedState(SQLException failure) {
        return vendor() == Vendor.CUBRID ? Integer.toString(failure.getErrorCode()) : failure.getSQLState();
    }

    /**
     * 부모 행을 잠근 트랜잭션이 있으면 자식의 FK 입력이 기다리는가. PostgreSQL 과 InnoDB 는 FK 검사가 부모 행에 공유 잠금을 걸어 기다린다
     * (2026-11-04 MySQL·MariaDB 실측). Oracle 은 기다리지 않는다(설계서 §6.1).
     */
    /**
     * 부모 행을 FOR UPDATE 로 잠근 트랜잭션이 있으면 자식 행의 갱신이 FK 컬럼을 바꾸지 않아도 기다리는가. CUBRID 는 기다린다(2026-11-06 실측,
     * 원장의 parent-lock-wait 저하). PostgreSQL 은 FK 컬럼을 바꾸지 않는 갱신에서 부모를 보지 않는다.
     */
    static boolean childUpdateWaitsForParentLock() {
        return vendor() == Vendor.CUBRID;
    }

    static boolean foreignKeyCheckWaitsForParentLock(JdbcTemplate jdbc) {
        return vendor(jdbc) != Vendor.ORACLE;
    }

    /** DB 오류를 시험이 대조하는 값. PostgreSQL 은 SQLState, 나머지는 오류 번호다 — Oracle·MySQL·MariaDB 의 SQLState 는 뜻을 가르지 못한다. */
    static String errorIdentity(SQLException failure) {
        return vendor() == Vendor.POSTGRESQL ? failure.getSQLState() : Integer.toString(failure.getErrorCode());
    }

    /** 실패를 진단할 수 있게 오류 번호와 SQLState 를 함께 적는다. */
    static String describe(SQLException failure) {
        return failure == null ? "DB 오류 없음" : failure.getClass().getSimpleName() + " " + failure.getErrorCode() + "/" + failure.getSQLState();
    }

    /**
     * 응용 잠금(lockForTransaction)이 대기 상한을 넘었는가. Oracle 은 23 이 ORA-00054(61000), 19c 가 ORA-30006(99999)으로 답한다.
     * MariaDB 는 슬롯 문장의 WAIT 가 1205(HY000)를 낸다. MySQL 은 접속 인자의 세션 잠금 대기(5초)가 먼저 끊어 1205 이고, 그 인자가 빠진
     * 설정에서는 슬롯 문장의 MAX_EXECUTION_TIME 힌트(10초)가 3024(HY000)로 끊는다(2026-11-04 실측).
     */
    static boolean isApplicationLockTimeout(JdbcTemplate jdbc, SQLException failure) {
        return failure != null && switch (vendor(jdbc)) {
            case POSTGRESQL -> "55P03".equals(failure.getSQLState());
            case ORACLE -> List.of("61000", "99999").contains(failure.getSQLState());
            case MARIADB -> failure.getErrorCode() == 1205;
            case MYSQL -> failure.getErrorCode() == 1205 || failure.getErrorCode() == 3024;
            // sp_getapplock 의 -1 을 잠금 문장이 51002 로 올린다(SqlServerSqlDialect).
            case MSSQL -> failure.getErrorCode() == 51002;
            // 슬롯 행 잠금이 세션 상한(SET TRANSACTION LOCK TIMEOUT)에 걸린다.
            case CUBRID -> failure.getErrorCode() == -75;
        };
    }

    /** 행 잠금 대기가 상한을 넘었는가. MySQL·MariaDB 는 1205 다 — SQLState 는 드라이버마다 다르다(MariaDB HY000, MySQL 40001). */
    static boolean isRowLockTimeout(JdbcTemplate jdbc, SQLException failure) {
        return failure != null && switch (vendor(jdbc)) {
            case POSTGRESQL -> "55P03".equals(failure.getSQLState());
            case ORACLE -> failure.getErrorCode() == 54 || failure.getErrorCode() == 30006;
            case MARIADB, MYSQL -> failure.getErrorCode() == 1205;
            case MSSQL -> failure.getErrorCode() == 1222;
            case CUBRID -> failure.getErrorCode() == -75;
        };
    }

    /**
     * 문장 시간 초과로 취소됐는가. 두 MySQL 계열 드라이버는 SQLTimeoutException 으로 올린다 — MariaDB 는 1969, MySQL 은 번호가 없다
     * (2026-11-04 실측).
     */
    static boolean isStatementTimeout(JdbcTemplate jdbc, SQLException failure) {
        return failure != null && switch (vendor(jdbc)) {
            case POSTGRESQL -> "57014".equals(failure.getSQLState());
            case ORACLE -> failure.getErrorCode() == 1013;
            case MARIADB -> failure instanceof SQLTimeoutException && failure.getErrorCode() == 1969;
            // mssql-jdbc 는 시간 초과를 번호 없이 HY008 로 올린다(2026-11-04 실측).
            case MYSQL, MSSQL -> failure instanceof SQLTimeoutException;
            // 드라이버의 문장 시간 초과는 -4 Has been interrupted. 다(2026-11-06 실측).
            case CUBRID -> failure.getErrorCode() == -4;
        };
    }

    /**
     * 실제 DB 오류를 내는 조회. 실패시킬 값(0)을 바인딩으로 받는다. PostgreSQL·Oracle 은 0 나누기다. MySQL 계열은 SELECT 의 0 나누기가 NULL 과
     * 경고뿐이라(2026-11-04 실측) 두 행을 돌려주는 스칼라 부분 질의로 실패시킨다. Oracle 19c 는 FROM 없는 SELECT 를 받지 않는다.
     */
    static String failingQuery(JdbcTemplate jdbc) {
        return switch (vendor(jdbc)) {
            case POSTGRESQL, MSSQL -> "SELECT 1 / CAST(? AS INTEGER)";
            case ORACLE -> "SELECT 1 / CAST(? AS INTEGER) FROM DUAL";
            case MARIADB, MYSQL -> "SELECT (SELECT 1 UNION ALL SELECT ?) FROM DUAL";
            case CUBRID -> "SELECT 1 / CAST(? AS INTEGER) FROM db_root";
        };
    }

    /** {@link #failingQuery} 의 SQLState. 0 나누기는 22012 이고 mssql-jdbc 는 S0001(8134)로 올린다(2026-11-04 실측). 여러 행 부분 질의는 21000 이다. */
    static String failingQueryState(JdbcTemplate jdbc) {
        // CUBRID 의 0 나누기는 -539 이고 SQLState 가 없어 번호로 대조한다(observedState, 2026-11-06 실측).
        return vendor(jdbc) == Vendor.CUBRID ? "-539" : vendor(jdbc).innoDb() ? "21000" : vendor(jdbc) == Vendor.MSSQL ? "S0001" : "22012";
    }

    static boolean isUniqueViolation(DataIntegrityViolationException failure) {
        Throwable cause = failure.getMostSpecificCause();
        // PostgreSQL 은 23505, MySQL·MariaDB·SQL Server 는 무결성 위반이 모두 23000 이라 중복 번호(1062, 2627 제약·2601 유일 인덱스)로 본다.
        // CUBRID 는 SQLState 없이 -670 이다.
        return cause instanceof SQLException sql && ("23505".equals(sql.getSQLState())
                        || Set.of(1062, 2627, 2601).contains(sql.getErrorCode()) && "23000".equals(sql.getSQLState())
                        || vendor() == Vendor.CUBRID && sql.getErrorCode() == -670)
                || String.valueOf(cause.getMessage()).contains("ORA-00001");
    }

    /** 다른 벤더에서는 볼 것이 없다. PostgreSQL 은 운영과 같은 17 이상이어야 한다. */
    static void assertPostgresql17(JdbcTemplate jdbc) {
        if (isPostgresql(jdbc)) {
            assertThat(jdbc.queryForObject("SELECT current_setting('server_version_num')::int", Integer.class))
                    .as("운영과 같은 PostgreSQL 17 이상").isGreaterThanOrEqualTo(170000);
        }
    }

    /** 트랜잭션 잠금 대기 상한이 실제로 걸렸는가. 다른 벤더는 잠금 문장의 대기가 맡는다. */
    static void assertPostgresqlLockTimeout(JdbcTemplate jdbc, int milliseconds) {
        if (isPostgresql(jdbc)) {
            assertThat(jdbc.queryForObject("SELECT setting::int FROM pg_settings WHERE name='lock_timeout'", Integer.class))
                    .isEqualTo(milliseconds);
        }
    }

    /** Oracle 의 기본 격리는 READ COMMITTED 이고 세션에서 읽을 수단이 없다. MySQL·MariaDB 는 앱이 연결마다 정한 값을 세션 변수로 읽는다. */
    static void assertReadCommitted(JdbcTemplate jdbc) {
        switch (vendor(jdbc)) {
            case POSTGRESQL -> assertThat(jdbc.queryForObject("SELECT current_setting('transaction_isolation')", String.class)).isEqualTo("read committed");
            case MARIADB, MYSQL -> assertThat(jdbc.queryForObject("SELECT @@SESSION.transaction_isolation", String.class)).isEqualTo("READ-COMMITTED");
            // 2 가 READ COMMITTED 다. DB 의 READ_COMMITTED_SNAPSHOT 이 읽기를 스냅숏으로 만든다(SqlServerSqlDialect.assertSession).
            case MSSQL -> assertThat(jdbc.queryForObject("SELECT CAST(transaction_isolation_level AS INT) FROM sys.dm_exec_sessions"
                    + " WHERE session_id = @@SPID", Integer.class)).isEqualTo(2);
            // 앱이 정한 값을 드라이버가 기억한다. CUBRID 의 기본도 READ COMMITTED 다(2026-11-05 실측).
            case CUBRID -> assertThat(jdbc.execute((ConnectionCallback<Integer>) Connection::getTransactionIsolation))
                    .isEqualTo(Connection.TRANSACTION_READ_COMMITTED);
            case ORACLE -> {
            }
        }
    }

    /**
     * 감사 원장 행을 지울 허가를 이 트랜잭션에 낸다. 같은 트랜잭션에서 {@link #revokeLedgerPermit} 로 거둔다. MySQL 계열의 허가 행은 연결 번호를
     * 키에 넣는다 — 트리거가 자기 연결의 행만 찾아야 다른 트랜잭션의 미커밋 허가를 기다리지 않는다(InnoDbSqlDialect 와 같다).
     */
    static void permitLedgerDeletion(JdbcTemplate jdbc, String key) {
        switch (vendor(jdbc)) {
            case POSTGRESQL -> jdbc.queryForObject("SELECT set_config(?, 'on', true)", String.class, key);
            // 행마다 고유 토큰(AUTO_INCREMENT)이 키다 — 트리거는 보이는 행만 센다(CubridSqlDialect, Oracle 과 같다).
            case ORACLE, CUBRID -> jdbc.update("INSERT INTO tb_sys_ledger_permit (permit_key) VALUES (?)", key);
            case MARIADB, MYSQL -> jdbc.update("INSERT INTO tb_sys_ledger_permit (permit_key, permit_conn) VALUES (?, CONNECTION_ID())", key);
            case MSSQL -> jdbc.update("INSERT INTO tb_sys_ledger_permit (permit_key, permit_conn) VALUES (?, @@SPID)", key);
        }
    }

    /** 커밋 전에 허가를 거둔다. PostgreSQL 은 트랜잭션 지역 설정이라 할 일이 없다. 다른 벤더는 커밋하면 허가가 남으므로 정확히 한 행을 지운다. */
    static void revokeLedgerPermit(JdbcTemplate jdbc, String key) {
        switch (vendor(jdbc)) {
            case POSTGRESQL -> {
            }
            case ORACLE, CUBRID -> jdbc.update("DELETE FROM tb_sys_ledger_permit WHERE permit_key = ?", key);
            case MARIADB, MYSQL, MSSQL -> {
                String connection = vendor(jdbc) == Vendor.MSSQL ? "@@SPID" : "CONNECTION_ID()";
                int removed = jdbc.update("DELETE FROM tb_sys_ledger_permit WHERE permit_key = ? AND permit_conn = " + connection, key);
                if (removed != 1) {
                    throw new IllegalStateException("감사 원장 삭제 허가를 회수하지 못했다: " + key + " (" + removed + "행)");
                }
            }
        }
    }
}
