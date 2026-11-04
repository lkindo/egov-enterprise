package nuri.foundation.core.persistence;

import jakarta.persistence.EntityManager;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.springframework.jdbc.core.JdbcOperations;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * SQL Server 구현. 기준은 2022 다(ADR-0047 단계 4). 아래 동작은 2026-11-04 SQL Server 2022 CU27·mssql-jdbc 13.6 실측이다.
 *
 * <p>DB 는 {@code READ_COMMITTED_SNAPSHOT} 과 {@code ALLOW_SNAPSHOT_ISOLATION} 이 켜져 있어야 한다({@link #assertSession}).
 * 앞의 것이 꺼지면 READ COMMITTED 읽기가 쓰기 잠금을 기다려 PostgreSQL 과 다르게 막히고, 뒤의 것이 꺼지면 REPEATABLE READ 를
 * 바꾼 스냅숏 격리(VendorSqlConfig)가 3952 로 실패한다.
 *
 * <p>응용 잠금은 {@code sp_getapplock} 의 트랜잭션 소유 잠금이다. 슬롯 표가 필요 없고 트랜잭션이 끝나면 풀린다. 다만 JDBC 의
 * 수동 커밋은 암시적 트랜잭션이라 표를 읽기 전에는 트랜잭션이 없어 -999 로 거부된다. 시스템 표를 읽는 식으로 트랜잭션을 연 뒤
 * 잠근다 — {@code BEGIN TRANSACTION} 은 암시적 트랜잭션과 겹쳐 중첩 수가 2 가 되고, 드라이버의 커밋이 하나만 닫아 잠금이 남는다.
 *
 * <p>행 잠금 대기는 접속 인자 {@code lockTimeout}(앱의 잠금 조회 상한과 같은 5초)이 묶고 넘기면 1222 다. {@code SET LOCK_TIMEOUT} 은
 * 커밋 뒤에도 세션에 남아 커넥션 풀로 샌다. 응용 잠금은 그 인자를 따르지 않고 자기 상한을 쓴다.
 *
 * <p>DB 가 채우는 시각은 서버 시계다. 세션 시간대가 없어 서버(컨테이너는 {@code TZ})가 한국 시간이어야 한다(CTX-025).
 */
public class SqlServerSqlDialect implements VendorSqlDialect {

    static final int LOCK_WAIT_MILLIS = 10_000;
    /** 응용 잠금을 잡지 못했다(대기 초과 -1·취소 -2·교착 희생 -3). 잠금 충돌이라 409 다. */
    static final int APPLICATION_LOCK_NOT_GRANTED = 51002;
    /** 트랜잭션 밖에서 응용 잠금을 불렀다(-999). 호출 결함이라 500 이다. */
    static final int APPLICATION_LOCK_OUTSIDE_TRANSACTION = 51003;
    /**
     * 실패는 DB 오류로 올린다. 교착 희생(-3)이어도 트랜잭션이 남으므로 오류로 되돌려야 하고, 다른 벤더처럼 원인 체인에 벤더 오류 번호가 남는다.
     */
    private static final String LOCK_SQL = "DECLARE @nuri_open INT = (SELECT COUNT(*) FROM sys.objects WHERE 1 = 0); DECLARE @nuri_lock INT; "
            + "EXEC @nuri_lock = sp_getapplock @Resource = ?, @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = "
            + LOCK_WAIT_MILLIS + "; IF @nuri_lock = -999 THROW " + APPLICATION_LOCK_OUTSIDE_TRANSACTION
            + ", N'application lock requires a transaction', 1; IF @nuri_lock < 0 THROW " + APPLICATION_LOCK_NOT_GRANTED
            + ", N'application lock not granted', 1; SELECT @nuri_lock";
    static final String INSERT_PERMIT = "INSERT INTO tb_sys_ledger_permit (permit_key, permit_conn) VALUES (?1, @@SPID)";
    static final String DELETE_PERMIT = "DELETE FROM tb_sys_ledger_permit WHERE permit_key = ?1 AND permit_conn = @@SPID";
    private static final String NOW = "SYSDATETIME()";
    private static final int KOREAN_OFFSET_MINUTES = 540;
    private static final Pattern SELECT_HEAD = Pattern.compile("(?is)^\\s*SELECT\\s+(DISTINCT\\s+)?");
    /**
     * 무결성 위반은 SQLState 23000 이고, 길이 초과(2628)·형식(241·245)·범위(8115)는 S0001·S0002 라 번호로 갈라야 400 이다.
     * CHECK 와 FK 는 같은 547 이라 번호로는 가를 수 없다. 메시지의 제약 종류 낱말(CHECK·FOREIGN KEY·REFERENCE)은 서버 메시지 언어가
     * 한국어여도 영어로 남는다(실측). 스냅숏 갱신 충돌(3960)은 S0002, 대기 초과(1222)는 S0051 이다.
     */
    private static final VendorErrorCodes ERROR_CODES = new VendorErrorCodes(
            Set.of(515, 2628, 8152, 241, 242, 245, 8114, 8115), Set.of(), Set.of(1222, 1205, 3960, APPLICATION_LOCK_NOT_GRANTED),
            Set.of(), Set.of(), Map.of(547, Pattern.compile(" CHECK ")));

    @Override
    public String paginate(String orderedSelect, long limit, long offset) {
        return orderedSelect + " OFFSET " + offset + " ROWS FETCH NEXT " + limit + " ROWS ONLY";
    }

    /** {@code OFFSET ... FETCH} 는 ORDER BY 가 있어야 한다. 정렬 없는 조회에도 쓰이므로 {@code TOP} 으로 묶는다. */
    @Override
    public String limit(String select, long limit) {
        var head = SELECT_HEAD.matcher(select);
        if (!head.lookingAt()) {
            throw new IllegalArgumentException("SELECT 로 시작하는 조회만 행 수를 묶는다");
        }
        String distinct = head.group(1) == null ? "" : "DISTINCT ";
        return "SELECT " + distinct + "TOP (" + limit + ") " + select.substring(head.end());
    }

    @Override
    public String existsQuery(String subquery) {
        return "SELECT CASE WHEN EXISTS (" + subquery + ") THEN 1 ELSE 0 END";
    }

    /** {@code CONCAT()} 은 NULL 을 빈 문자열로 이어 PostgreSQL 의 {@code ||} 와 다르다. {@code +} 는 NULL 을 낸다(실측). 피연산자는 문자열이어야 한다. */
    @Override
    public String concat(String... operands) {
        return String.join(" + ", operands);
    }

    @Override
    public String containsText(String needle, String haystack) {
        return "CHARINDEX(" + needle + ", " + haystack + ")>0";
    }

    @Override
    public String castToVarchar(String expression, int length) {
        return "CAST(" + expression + " AS NVARCHAR(" + length + "))";
    }

    /**
     * 갱신 잠금(U)은 FK 검사의 공유 잠금과 어울려 자식 입력을 막지 않는다 — PostgreSQL 의 {@code FOR NO KEY UPDATE} 와 같다. 배타 잠금(X)은 자식 입력을
     * 막아 {@code FOR UPDATE} 와 같다(실측). 둘 다 다른 잠금 조회는 막고 스냅숏 읽기는 막지 않는다.
     */
    @Override
    public String selectForLock(String columns, String table, String tail, RowLock lock) {
        String middle = tail.isEmpty() ? "" : " " + tail;
        String hint = lock == RowLock.FOR_UPDATE ? " WITH (XLOCK, ROWLOCK)" : " WITH (UPDLOCK, ROWLOCK)";
        return "SELECT " + columns + " FROM " + table + hint + middle;
    }

    /**
     * MERGE 는 {@code HOLDLOCK} 이 있어야 같은 키의 동시 입력을 직렬화한다(8개 연결 1,200회 경합에서 오류 0, 실측). 문장은 세미콜론으로 끝나야 한다.
     * 시각은 서버 시계로 채운다.
     */
    @Override
    public String upsertAddingCounters(String table, String primaryKeyConstraint, List<UpsertColumn> keys,
            List<UpsertColumn> counters, String createdAtColumn, String modifiedAtColumn) {
        List<UpsertColumn> inserted = Stream.concat(keys.stream(), counters.stream()).toList();
        String source = inserted.stream().map(column -> ":" + column.parameter() + " AS " + column.column())
                .collect(Collectors.joining(", "));
        String on = keys.stream().map(column -> "t." + column.column() + " = s." + column.column())
                .collect(Collectors.joining(" AND "));
        String additions = counters.stream()
                .map(column -> column.column() + " = COALESCE(t." + column.column() + ", 0) + s." + column.column())
                .collect(Collectors.joining(", "));
        String columns = inserted.stream().map(UpsertColumn::column).collect(Collectors.joining(", "));
        String values = inserted.stream().map(column -> "s." + column.column()).collect(Collectors.joining(", "));
        return "MERGE INTO " + table + " WITH (HOLDLOCK) AS t USING (SELECT " + source + ") AS s ON (" + on + ")"
                + " WHEN MATCHED THEN UPDATE SET " + additions + ", " + modifiedAtColumn + " = " + NOW
                + " WHEN NOT MATCHED THEN INSERT (" + columns + ", " + createdAtColumn + ", " + modifiedAtColumn + ")"
                + " VALUES (" + values + ", " + NOW + ", " + NOW + ");";
    }

    /** 트랜잭션 범위의 잠금 대기 설정이 없다. 세션 설정은 풀로 새므로 실행해도 아무 일이 없는 문장을 돌려준다. */
    @Override
    public String transactionLockWaitSql(Duration wait) {
        if (wait.toMillis() <= 0) {
            throw new IllegalArgumentException("잠금 대기는 1ms 이상이어야 한다");
        }
        return "DECLARE @nuri_lock_wait INT";
    }

    @Override
    public void lockForTransaction(JdbcOperations jdbc, long key) {
        lock(jdbc, "nuri:" + key);
    }

    @Override
    public void lockForTransaction(JdbcOperations jdbc, int namespace, int key) {
        lock(jdbc, "nuri:" + namespace + ":" + key);
    }

    /** 0·1 은 잡았다는 뜻이다. 실패는 문장이 DB 오류로 올린다. 결과가 없으면 문장이 바뀐 것이라 멈춘다. */
    private static void lock(JdbcOperations jdbc, String resource) {
        Integer result = jdbc.queryForObject(LOCK_SQL, Integer.class, resource);
        if (result == null || result < 0) {
            throw new IllegalStateException("응용 잠금 결과를 읽지 못했다(" + result + "): " + resource);
        }
    }

    /**
     * 허가 표의 미커밋 행은 다른 세션에 보이지 않아 트랜잭션 범위가 되고, 롤백하면 함께 사라진다. 지우지 않고 커밋하면 허가가 열린 채
     * 남으므로 커밋 직전에 지운다. 같은 트랜잭션의 두 번째 호출은 이미 열린 허가를 쓴다.
     * 키에 세션 번호가 있고 트리거·회수도 자기 세션의 행만 찾는다. 키만 두면 바깥 트랜잭션이 중단된 채 안쪽이 같은 허가를 넣을 때 바깥의 미커밋 키를
     * 기다린다(실측). 트리거는 {@code WITH (READCOMMITTED)} 로 읽어 READ UNCOMMITTED 세션도 남의 허가를 보지 못한다.
     */
    @Override
    public void permitLedgerDeletion(EntityManager entityManager, LedgerDeletionPermit permit) {
        if (!TransactionSynchronizationManager.isActualTransactionActive()) {
            throw new IllegalStateException("불변 원장 삭제 허가는 쓰기 트랜잭션 안에서만 낼 수 있다");
        }
        String resource = SqlServerSqlDialect.class.getName() + ":" + permit.key();
        if (TransactionSynchronizationManager.hasResource(resource)) {
            return;
        }
        entityManager.createNativeQuery(INSERT_PERMIT).setParameter(1, permit.key()).executeUpdate();
        TransactionSynchronizationManager.bindResource(resource, permit);
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void beforeCommit(boolean readOnly) {
                entityManager.flush();
                int removed = entityManager.createNativeQuery(DELETE_PERMIT).setParameter(1, permit.key()).executeUpdate();
                if (removed != 1) {
                    throw new IllegalStateException("불변 원장 삭제 허가를 회수하지 못했다: " + permit.key());
                }
            }

            /** 표식은 이 트랜잭션의 것이다. 중단되면 안쪽 트랜잭션은 자기 연결로 허가를 새로 내야 한다. */
            @Override
            public void suspend() {
                TransactionSynchronizationManager.unbindResourceIfPossible(resource);
            }

            @Override
            public void resume() {
                TransactionSynchronizationManager.bindResource(resource, permit);
            }

            @Override
            public void afterCompletion(int status) {
                TransactionSynchronizationManager.unbindResourceIfPossible(resource);
            }
        });
    }

    @Override
    public String countTablesQuery(List<String> tables) {
        String names = tables.stream().map(table -> "'" + table + "'").collect(Collectors.joining(","));
        return "SELECT count(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = SCHEMA_NAME() AND TABLE_TYPE = 'BASE TABLE'"
                + " AND LOWER(TABLE_NAME) IN (" + names + ")";
    }

    @Override
    public String databaseProductName() {
        return "Microsoft SQL Server";
    }

    @Override
    public VendorErrorCodes errorCodes() {
        return ERROR_CODES;
    }

    /**
     * 세 가지를 본다. 스냅숏 두 설정이 꺼지면 읽기가 쓰기를 기다리거나 일관 조회가 실패한다. 서버 시계가 한국 시간(+09:00)이 아니면 DB 가 채우는
     * 시각과 날짜(upsert 의 시각, 컬럼 기본값)가 9시간 어긋난다(CTX-025). 두 시각은 같은 문장에서 읽는다.
     */
    @Override
    public void assertSession(JdbcOperations jdbc) {
        Integer snapshot = jdbc.queryForObject("SELECT CASE WHEN is_read_committed_snapshot_on = 1 AND snapshot_isolation_state = 1"
                + " THEN 1 ELSE 0 END FROM sys.databases WHERE name = DB_NAME()", Integer.class);
        if (snapshot == null || snapshot != 1) {
            throw new IllegalStateException("SQL Server database must have READ_COMMITTED_SNAPSHOT ON and ALLOW_SNAPSHOT_ISOLATION ON");
        }
        Integer offset = jdbc.queryForObject("SELECT DATEDIFF(MINUTE, SYSUTCDATETIME(), SYSDATETIME())", Integer.class);
        if (offset == null || offset != KOREAN_OFFSET_MINUTES) {
            throw new IllegalStateException("SQL Server clock must be Korea Standard Time (+09:00, server time zone): offset "
                    + offset + " minutes");
        }
    }

    /** 세션 번호는 다시 쓰인다. 회수되지 않고 커밋된 허가가 다른 연결에 넘어가지 않게 기동 때 막는다. */
    @Override
    public void assertNoOpenLedgerPermit(JdbcOperations jdbc) {
        Integer open = jdbc.queryForObject("SELECT count(*) FROM tb_sys_ledger_permit", Integer.class);
        if (open == null || open != 0) {
            throw new IllegalStateException("불변 원장 삭제 허가가 열린 채 남아 있다: tb_sys_ledger_permit");
        }
    }
}
