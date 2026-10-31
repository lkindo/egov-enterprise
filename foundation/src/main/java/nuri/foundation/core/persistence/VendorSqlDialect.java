package nuri.foundation.core.persistence;

import jakarta.persistence.EntityManager;
import java.time.Duration;
import java.util.List;
import org.springframework.jdbc.core.JdbcOperations;

/**
 * DB 제품마다 달라야 하는 SQL 의 경계(ADR-0047).
 *
 * <p>Hibernate 가 HQL 로 대신 처리할 수 있는 차이는 여기에 두지 않는다. 이 포트는 벤더마다 문법이 다르거나 벤더 기능을 불러야 하는
 * 일만 맡는다. 포트 밖의 네이티브 SQL·JDBC 문자열에 PostgreSQL 전용 구문을 쓰면 {@code VendorSqlPortabilityLinterTest} 가 막는다.
 *
 * <p>모든 메서드의 식별자·식은 코드에 고정된 문자열만 받는다. 요청 값은 바인딩 자리표시자로만 넘긴다.
 */
public interface VendorSqlDialect {

    /** 행 잠금의 강도. 자식 FK 입력을 함께 막아야 하면 {@link #FOR_UPDATE}, 막지 않아야 하면 {@link #FOR_NO_KEY_UPDATE} 다. */
    enum RowLock { FOR_UPDATE, FOR_NO_KEY_UPDATE }

    /** 파기 경로만 지나는 불변 원장. 키는 트랜잭션 지역 표시의 이름이다. */
    enum LedgerDeletionPermit {
        AUDIT_RETENTION("app.audit_retention"),
        CMS_PURGE("nuri.cms_purge");

        private final String key;

        LedgerDeletionPermit(String key) {
            this.key = key;
        }

        public String key() {
            return key;
        }
    }

    /** upsert 의 한 컬럼과 그 바인딩 이름. */
    record UpsertColumn(String column, String parameter) { }

    /** 정렬이 끝난 조회에 행 수 상한과 건너뛸 수를 붙인다. 두 값은 정수라 문장에 그대로 싣는다. */
    String paginate(String orderedSelect, long limit, long offset);

    /** 조회 결과의 앞 {@code limit} 행만 남긴다. */
    String limit(String select, long limit);

    /** 하위 조회에 행이 있는지 한 행 한 컬럼으로 돌려주는 문장. 결과는 {@code ResultSet#getBoolean} 으로 읽을 수 있다. */
    String existsQuery(String subquery);

    /** 문자열 연결식. 피연산자는 코드에 고정된 SQL 식이다. */
    String concat(String... operands);

    /** {@code haystack} 안에 {@code needle} 이 있으면 참인 조건식. LIKE 와 달리 패턴 문자를 해석하지 않는다. */
    String containsText(String needle, String haystack);

    /** 값을 지정 길이의 문자열로 바꾸는 식. */
    String castToVarchar(String expression, int length);

    /**
     * 행을 잠그며 읽는 문장.
     *
     * @param columns 조회 컬럼
     * @param table   표 이름. 표에 잠금 힌트를 붙이는 벤더가 있어 따로 받는다.
     * @param tail    {@code WHERE}·{@code ORDER BY} 절. 없으면 빈 문자열이다.
     */
    String selectForLock(String columns, String table, String tail, RowLock lock);

    /**
     * 행이 없으면 넣고 있으면 카운터를 더하는 단일 문장. 경합을 DB 가 직렬화한다.
     *
     * @param primaryKeyConstraint 충돌 대상 제약. 컬럼 목록으로 쓰면 PK 순서가 바뀔 때 다른 인덱스를 잡을 수 있다.
     */
    String upsertAddingCounters(String table, String primaryKeyConstraint, List<UpsertColumn> keys,
            List<UpsertColumn> counters, String createdAtColumn, String modifiedAtColumn);

    /** 이후 잠금 대기를 이 트랜잭션 안에서만 제한하는 문장. 커넥션 풀로 새지 않는다. */
    String transactionLockWaitSql(Duration wait);

    /** 트랜잭션이 끝나면 풀리는 응용 잠금. 충돌은 작업을 직렬화할 뿐이다. */
    void lockForTransaction(JdbcOperations jdbc, long key);

    /** {@link #lockForTransaction(JdbcOperations, long)} 과 키 공간이 겹치지 않는 두 정수 키 잠금. */
    void lockForTransaction(JdbcOperations jdbc, int namespace, int key);

    /** 이 트랜잭션에서만 불변 원장의 삭제를 허용한다. 호출자는 쓰기 트랜잭션 안에 있어야 한다. */
    void permitLedgerDeletion(EntityManager entityManager, LedgerDeletionPermit permit);

    /** 현재 스키마에 있는 표의 수를 세는 문장. 이름은 코드에 고정된 소문자 값만 받는다. */
    String countTablesQuery(List<String> tables);

    /** JDBC 제품명에 든 이름. 설정과 실제 DB 가 다르면 기동을 멈춘다. */
    String databaseProductName();

    /** 불변 원장 삭제 허가가 커밋된 채 남지 않았는지 기동 때 본다. 트랜잭션 지역 설정을 쓰는 벤더는 남을 수 없다. */
    default void assertNoOpenLedgerPermit(JdbcOperations jdbc) {
    }
}
