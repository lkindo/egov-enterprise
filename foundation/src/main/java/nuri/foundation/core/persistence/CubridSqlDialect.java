package nuri.foundation.core.persistence;

import jakarta.persistence.EntityManager;
import java.sql.ResultSet;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.springframework.jdbc.core.JdbcOperations;
import org.springframework.jdbc.core.ResultSetExtractor;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * CUBRID 구현. 기준은 11.4 다(ADR-0047 단계 5, 제한 지원). 아래 동작은 2026-11-05~06 CUBRID 11.4.6·cubrid-jdbc 11.3.2 실측이다.
 *
 * <p>행 잠금 대기의 기본값이 무한이고 문장 단위 상한이 없다. {@code SET TRANSACTION LOCK TIMEOUT} 은 커밋 뒤에도 세션에 남는다. 그래서
 * 연결을 열 때 한 번 앱의 잠금 조회 상한과 같은 {@value #LOCK_WAIT_SECONDS}초를 걸어 두고(VendorSqlConfig), 넘기면 -75 다.
 *
 * <p>응용 잠금은 Oracle·MySQL 계열처럼 슬롯 표의 행 잠금이다. 슬롯 수와 키를 접는 식이 같다. CUBRID 에는 응용 잠금 함수가 없다.
 *
 * <p>MVCC 라 일반 읽기는 쓰기 잠금을 기다리지 않는다. 불변 원장 허가의 트리거·회수도 다른 세션의 미커밋 허가를 기다리지 않는다(실측).
 *
 * <p>DB 가 채우는 시각({@code SYS_DATETIME})은 서버 시계다. 세션 시간대 설정은 그 값을 바꾸지 않으므로 서버(컨테이너는 {@code TZ})가
 * 한국 시간이어야 한다(CTX-025, {@link #assertSession}).
 */
public class CubridSqlDialect implements VendorSqlDialect {

    /** 응용 잠금 슬롯 수. 벤더 어댑터가 같은 수의 행을 만든다. */
    static final int LOCK_SLOTS = 65_536;
    /** 연결마다 거는 행 잠금 대기 상한(초). 앱의 잠금 조회 상한(jakarta.persistence.lock.timeout 5초)과 같다. */
    public static final int LOCK_WAIT_SECONDS = 5;
    /** 연결을 열 때 거는 문장. 세션에 남는다. */
    public static final String SESSION_LOCK_WAIT_SQL = "SET TRANSACTION LOCK TIMEOUT " + LOCK_WAIT_SECONDS;
    static final String LOCK_SLOT_SQL = "SELECT lock_slot_no FROM tb_sys_lock_slot WHERE lock_slot_no = ? FOR UPDATE";
    static final String INSERT_PERMIT = "INSERT INTO tb_sys_ledger_permit (permit_key) VALUES (?1)";
    static final String DELETE_PERMIT = "DELETE FROM tb_sys_ledger_permit WHERE permit_key = ?1";
    private static final String NOW = "SYS_DATETIME";
    private static final int KOREAN_OFFSET_MINUTES = 540;
    private static final DateTimeFormatter CLOCK = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    /**
     * SQLState 가 비어 오는 드라이버라 번호로만 가른다. NOT NULL 은 -631, 중복은 -670, FK 부모 없음은 -922, FK 삭제·수정 제한은 -924,
     * 대기 초과는 -75, 교착 희생은 -72, 0 나누기는 -539 다.
     *
     * <p>두 번호는 메시지로 가른다. 바인딩 값의 길이·범위·날짜 형식 위반은 일반 의미 오류 -494 이고 메시지가
     * {@code Cannot coerce host var to type} 이다 — 같은 번호가 SQL 결함에도 쓰여 번호만으로 400 이 될 수 없다. CHECK 는 엔진이 집행하지
     * 않아 트리거 거부(-517)로 옮겼고(벤더 어댑터), 원장 보호 트리거도 같은 번호라 트리거 이름이 CHECK 제약 이름({@code ck_})일 때만 입력 오류다.
     */
    private static final VendorErrorCodes ERROR_CODES = new VendorErrorCodes(
            Set.of(-631), Set.of(-670, -922, -924), Set.of(-75, -72), Set.of(), Set.of(-539),
            Map.of(-494, Pattern.compile("^Semantic: Cannot coerce host var to type "),
                    -517, Pattern.compile("^The operation has been rejected by trigger \"[^\".]+\\.ck_")));

    @Override
    public String paginate(String orderedSelect, long limit, long offset) {
        return orderedSelect + " LIMIT " + limit + " OFFSET " + offset;
    }

    @Override
    public String limit(String select, long limit) {
        return select + " LIMIT " + limit;
    }

    @Override
    public String existsQuery(String subquery) {
        return "SELECT CASE WHEN EXISTS (" + subquery + ") THEN 1 ELSE 0 END";
    }

    @Override
    public String concat(String... operands) {
        return String.join(" || ", operands);
    }

    /** {@code INSTR(문자열, 찾을 값)} 순서다. 패턴 문자를 해석하지 않는다. */
    @Override
    public String containsText(String needle, String haystack) {
        return "INSTR(" + haystack + ", " + needle + ")>0";
    }

    /** {@code CAST ... AS VARCHAR(n)} 은 넘치는 값을 자르지 않고 -427 로 거부한다. PostgreSQL 처럼 잘라서 바꾼다(실측). */
    @Override
    public String castToVarchar(String expression, int length) {
        return "CAST(SUBSTRING(CAST(" + expression + " AS VARCHAR), 1, " + length + ") AS VARCHAR(" + length + "))";
    }

    /**
     * {@code FOR NO KEY UPDATE} 가 없다. 부모 행의 {@code FOR UPDATE} 와 갱신은 자식 FK 입력도 기다리게 한다(실측) — MySQL 계열과 같이
     * 두 강도 모두 {@code FOR UPDATE} 다. 없는 키를 잠그면 그 키의 입력은 막지 않는다.
     */
    @Override
    public String selectForLock(String columns, String table, String tail, RowLock lock) {
        String middle = tail.isEmpty() ? "" : " " + tail;
        return "SELECT " + columns + " FROM " + table + middle + " FOR UPDATE";
    }

    /**
     * {@code ON DUPLICATE KEY UPDATE} 는 같은 키에 8개 연결이 1,200번 경합해도 오류 없이 모두 더했다. {@code MERGE} 는 같은 경합에서
     * 중복(-670)으로 실패한 문장이 남았다(실측). 충돌한 키를 고를 수 없어 PK 외 UNIQUE 가 없는 표에만 쓴다. 더할 값은 같은 바인딩
     * 이름을 다시 쓴다.
     */
    @Override
    public String upsertAddingCounters(String table, String primaryKeyConstraint, List<UpsertColumn> keys,
            List<UpsertColumn> counters, String createdAtColumn, String modifiedAtColumn) {
        List<UpsertColumn> inserted = Stream.concat(keys.stream(), counters.stream()).toList();
        String columns = inserted.stream().map(UpsertColumn::column).collect(Collectors.joining(", "));
        String values = inserted.stream().map(column -> ":" + column.parameter()).collect(Collectors.joining(", "));
        String additions = counters.stream()
                .map(column -> column.column() + " = COALESCE(" + table + "." + column.column() + ", 0) + :" + column.parameter())
                .collect(Collectors.joining(", "));
        return "INSERT INTO " + table + " (" + columns + ", " + createdAtColumn + ", " + modifiedAtColumn + ")"
                + " VALUES (" + values + ", " + NOW + ", " + NOW + ")"
                + " ON DUPLICATE KEY UPDATE " + additions + ", " + modifiedAtColumn + " = " + NOW;
    }

    /**
     * 트랜잭션 범위의 잠금 대기 설정이 없다. 요청한 값을 걸면 커밋 뒤에도 세션에 남아 풀로 새므로, 연결이 열릴 때 건 기본 상한을 다시
     * 거는 문장을 돌려준다(같은 값이라 아무것도 바꾸지 않는다).
     */
    @Override
    public String transactionLockWaitSql(Duration wait) {
        if (wait.toMillis() <= 0) {
            throw new IllegalArgumentException("잠금 대기는 1ms 이상이어야 한다");
        }
        return SESSION_LOCK_WAIT_SQL;
    }

    @Override
    public void lockForTransaction(JdbcOperations jdbc, long key) {
        lockSlot(jdbc, Math.floorMod(Long.hashCode(key), LOCK_SLOTS));
    }

    @Override
    public void lockForTransaction(JdbcOperations jdbc, int namespace, int key) {
        lockSlot(jdbc, Math.floorMod(31 * namespace + key, LOCK_SLOTS));
    }

    /** 없는 행의 잠금 조회는 아무것도 잠그지 않고 지나가므로 슬롯 행이 없으면 멈춘다. */
    private static void lockSlot(JdbcOperations jdbc, int slot) {
        Boolean held = jdbc.query(LOCK_SLOT_SQL, statement -> statement.setInt(1, slot), (ResultSetExtractor<Boolean>) ResultSet::next);
        if (!Boolean.TRUE.equals(held)) {
            throw new IllegalStateException("응용 잠금 슬롯 행이 없다: tb_sys_lock_slot " + slot);
        }
    }

    /**
     * 허가 표의 미커밋 행은 다른 세션에 보이지 않아 트랜잭션 범위가 되고, 롤백하면 함께 사라진다. 지우지 않고 커밋하면 허가가 열린 채
     * 남으므로 커밋 직전에 지운다. 같은 트랜잭션의 두 번째 호출은 이미 열린 허가를 쓴다. 행마다 고유 토큰이 키에 들어 있어(벤더 어댑터)
     * 바깥 트랜잭션이 중단된 채 안쪽이 같은 허가를 내도 서로 기다리지 않는다(실측).
     */
    @Override
    public void permitLedgerDeletion(EntityManager entityManager, LedgerDeletionPermit permit) {
        if (!TransactionSynchronizationManager.isActualTransactionActive()) {
            throw new IllegalStateException("불변 원장 삭제 허가는 쓰기 트랜잭션 안에서만 낼 수 있다");
        }
        String resource = CubridSqlDialect.class.getName() + ":" + permit.key();
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

            /** 표식은 이 트랜잭션의 것이다. 중단되면 안쪽 트랜잭션은 자기 허가를 새로 내야 한다. */
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
        return "SELECT COUNT(*) FROM db_class WHERE is_system_class = 'NO' AND owner_name = CURRENT_USER AND LOWER(class_name) IN ("
                + names + ")";
    }

    @Override
    public String databaseProductName() {
        return "CUBRID";
    }

    @Override
    public VendorErrorCodes errorCodes() {
        return ERROR_CODES;
    }

    /**
     * 서버 시계가 한국 시간(+09:00)인지 본다. 아니면 DB 가 채우는 시각과 날짜가 어긋난다(CTX-025). {@code TIMESTAMPDIFF} 가 없어 서버
     * 시계와 UTC 를 같은 문장에서 읽어 비교한다.
     */
    @Override
    public void assertSession(JdbcOperations jdbc) {
        String[] clocks = jdbc.queryForObject("SELECT TO_CHAR(SYS_DATETIME, 'YYYY-MM-DD HH24:MI:SS'), TO_CHAR(UTC_DATE(), 'YYYY-MM-DD')"
                + " || ' ' || TO_CHAR(UTC_TIME(), 'HH24:MI:SS') FROM db_root", (row, index) -> new String[] {row.getString(1), row.getString(2)});
        long offset = Math.round(Duration.between(LocalDateTime.parse(clocks[1], CLOCK), LocalDateTime.parse(clocks[0], CLOCK)).toSeconds() / 60.0);
        if (offset != KOREAN_OFFSET_MINUTES) {
            throw new IllegalStateException("CUBRID server clock must be +09:00 (server time zone, TZ for the container): offset "
                    + offset + " minutes");
        }
    }

    @Override
    public void assertNoOpenLedgerPermit(JdbcOperations jdbc) {
        Integer open = jdbc.queryForObject("SELECT count(*) FROM tb_sys_ledger_permit", Integer.class);
        if (open == null || open != 0) {
            throw new IllegalStateException("불변 원장 삭제 허가가 열린 채 남아 있다: tb_sys_ledger_permit");
        }
    }
}
