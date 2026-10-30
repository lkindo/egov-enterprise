package nuri.foundation.core.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.time.Duration;
import java.util.List;
import nuri.foundation.core.persistence.VendorSqlDialect.LedgerDeletionPermit;
import nuri.foundation.core.persistence.VendorSqlDialect.RowLock;
import nuri.foundation.core.persistence.VendorSqlDialect.UpsertColumn;
import org.hibernate.Session;
import org.hibernate.jdbc.ReturningWork;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcOperations;
import org.springframework.jdbc.core.PreparedStatementSetter;
import org.springframework.jdbc.core.RowCallbackHandler;

/** PostgreSQL 문장은 포트를 만들기 전의 SQL 과 같아야 한다 — 이 시험이 그 문장을 글자 그대로 고정한다(ADR-0047). */
class PostgresqlSqlDialectTest {

    private final VendorSqlDialect dialect = new PostgresqlSqlDialect();

    @Test
    @DisplayName("페이징과 상한은 정렬 뒤에 붙는다")
    void pagination() {
        assertThat(dialect.paginate("SELECT a FROM t ORDER BY a", 20, 40)).isEqualTo("SELECT a FROM t ORDER BY a LIMIT 20 OFFSET 40");
        assertThat(dialect.limit("SELECT a FROM t", 5)).isEqualTo("SELECT a FROM t LIMIT 5");
    }

    @Test
    @DisplayName("문자열 식은 PostgreSQL 연산자를 그대로 쓴다")
    void textExpressions() {
        assertThat(dialect.existsQuery("SELECT 1 FROM t WHERE a = ?")).isEqualTo("SELECT EXISTS (SELECT 1 FROM t WHERE a = ?)");
        assertThat(dialect.concat("'/api/'", "m.id")).isEqualTo("'/api/' || m.id");
        assertThat(dialect.containsText(":keyword", "t.nm")).isEqualTo("POSITION(:keyword IN t.nm)>0");
        assertThat(dialect.castToVarchar("menu.menu_sn", 20)).isEqualTo("CAST(menu.menu_sn AS varchar(20))");
    }

    @Test
    @DisplayName("행 잠금은 강도를 지키고 빈 꼬리 절에 공백을 남기지 않는다")
    void rowLocks() {
        assertThat(dialect.selectForLock("a,b", "t", "ORDER BY a", RowLock.FOR_NO_KEY_UPDATE))
                .isEqualTo("SELECT a,b FROM t ORDER BY a FOR NO KEY UPDATE");
        assertThat(dialect.selectForLock("a", "t", "WHERE a=?", RowLock.FOR_UPDATE)).isEqualTo("SELECT a FROM t WHERE a=? FOR UPDATE");
        assertThat(dialect.selectForLock("a", "t", "", RowLock.FOR_UPDATE)).isEqualTo("SELECT a FROM t FOR UPDATE");
    }

    @Test
    @DisplayName("upsert 는 제약 이름으로 충돌을 잡고 NULL 카운터를 0 으로 보고 더한다")
    void upsertAddsCounters() {
        assertThat(dialect.upsertAddingCounters("tb_user_log", "pk_tb_user_log",
                List.of(new UpsertColumn("ocrn_ymd", "ocrnYmd")),
                List.of(new UpsertColumn("crt_cnt", "crtCnt"), new UpsertColumn("err_cnt", "errCnt")), "crt_dt", "mdfcn_dt"))
                .isEqualTo("INSERT INTO tb_user_log (ocrn_ymd, crt_cnt, err_cnt, crt_dt, mdfcn_dt)"
                        + " VALUES (:ocrnYmd, :crtCnt, :errCnt, now(), now())"
                        + " ON CONFLICT ON CONSTRAINT pk_tb_user_log DO UPDATE SET"
                        + " crt_cnt = COALESCE(tb_user_log.crt_cnt, 0) + EXCLUDED.crt_cnt,"
                        + " err_cnt = COALESCE(tb_user_log.err_cnt, 0) + EXCLUDED.err_cnt,"
                        + " mdfcn_dt = now()");
    }

    @Test
    @DisplayName("잠금 대기 상한은 트랜잭션 지역이다")
    void lockWaitIsTransactionLocal() {
        assertThat(dialect.transactionLockWaitSql(Duration.ofSeconds(5))).isEqualTo("SET LOCAL lock_timeout = '5000ms'");
        assertThat(dialect.transactionLockWaitSql(Duration.ofMillis(500))).isEqualTo("SET LOCAL lock_timeout = '500ms'");
    }

    @Test
    @DisplayName("잠금 대기 0 은 PostgreSQL 에서 무제한이라 받지 않는다")
    void lockWaitRejectsValuesThatMeanNoLimit() {
        assertThatThrownBy(() -> dialect.transactionLockWaitSql(Duration.ZERO)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> dialect.transactionLockWaitSql(Duration.ofNanos(1))).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("응용 잠금은 트랜잭션 잠금 함수를 키와 함께 부른다")
    void advisoryLocksBindKeys() throws SQLException {
        JdbcOperations jdbc = mock(JdbcOperations.class);
        ArgumentCaptor<PreparedStatementSetter> setter = ArgumentCaptor.forClass(PreparedStatementSetter.class);

        dialect.lockForTransaction(jdbc, 7L);
        verify(jdbc).query(eq("SELECT pg_advisory_xact_lock(?)"), setter.capture(), any(RowCallbackHandler.class));
        PreparedStatement single = mock(PreparedStatement.class);
        setter.getValue().setValues(single);
        verify(single).setLong(1, 7L);

        dialect.lockForTransaction(jdbc, 3, 4);
        verify(jdbc).query(eq("SELECT pg_advisory_xact_lock(?, ?)"), setter.capture(), any(RowCallbackHandler.class));
        PreparedStatement pair = mock(PreparedStatement.class);
        setter.getValue().setValues(pair);
        verify(pair).setInt(1, 3);
        verify(pair).setInt(2, 4);
    }

    @Test
    @DisplayName("원장 허가는 PostgreSQL 에서만 트랜잭션 지역 표시를 켠다 — 트리거가 없는 H2 는 건너뛴다")
    void ledgerPermitIsPostgresOnly() throws SQLException {
        EntityManager postgres = entityManagerOn("PostgreSQL");
        Query query = mock(Query.class);
        when(postgres.createNativeQuery("SELECT set_config('nuri.cms_purge', 'on', true)")).thenReturn(query);
        dialect.permitLedgerDeletion(postgres, LedgerDeletionPermit.CMS_PURGE);
        verify(query).getSingleResult();

        EntityManager h2 = entityManagerOn("H2");
        dialect.permitLedgerDeletion(h2, LedgerDeletionPermit.AUDIT_RETENTION);
        verify(h2, never()).createNativeQuery(anyString());
        assertThat(LedgerDeletionPermit.AUDIT_RETENTION.key()).isEqualTo("app.audit_retention");
    }

    @SuppressWarnings("unchecked")
    private static EntityManager entityManagerOn(String product) throws SQLException {
        EntityManager entityManager = mock(EntityManager.class);
        Session session = mock(Session.class);
        Connection connection = mock(Connection.class);
        DatabaseMetaData metaData = mock(DatabaseMetaData.class);
        when(entityManager.unwrap(Session.class)).thenReturn(session);
        when(connection.getMetaData()).thenReturn(metaData);
        when(metaData.getDatabaseProductName()).thenReturn(product);
        when(session.doReturningWork(any(ReturningWork.class)))
                .thenAnswer(call -> call.<ReturningWork<Boolean>>getArgument(0).execute(connection));
        return entityManager;
    }
}
