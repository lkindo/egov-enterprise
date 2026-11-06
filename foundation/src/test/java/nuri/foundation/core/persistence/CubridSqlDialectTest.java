package nuri.foundation.core.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import java.sql.PreparedStatement;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import nuri.foundation.core.persistence.VendorSqlDialect.LedgerDeletionPermit;
import nuri.foundation.core.persistence.VendorSqlDialect.RowLock;
import nuri.foundation.core.persistence.VendorSqlDialect.UpsertColumn;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.springframework.jdbc.core.JdbcOperations;
import org.springframework.jdbc.core.PreparedStatementSetter;
import org.springframework.jdbc.core.ResultSetExtractor;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/** 문장 모양은 여기서 고정하고, 실제 실행은 CUBRID 위 통합 시험이 본다(ADR-0047 단계 5). */
class CubridSqlDialectTest {

    private static final String INSERT_PERMIT = "INSERT INTO tb_sys_ledger_permit (permit_key) VALUES (?1)";
    private static final String DELETE_PERMIT = "DELETE FROM tb_sys_ledger_permit WHERE permit_key = ?1";

    private final CubridSqlDialect dialect = new CubridSqlDialect();
    private final EntityManager entityManager = mock(EntityManager.class);
    private final Query insertPermit = mock(Query.class);
    private final Query deletePermit = mock(Query.class);

    @BeforeEach
    void givenPermitStatements() {
        when(entityManager.createNativeQuery(INSERT_PERMIT)).thenReturn(insertPermit);
        when(entityManager.createNativeQuery(DELETE_PERMIT)).thenReturn(deletePermit);
        when(insertPermit.setParameter(anyInt(), any())).thenReturn(insertPermit);
        when(deletePermit.setParameter(anyInt(), any())).thenReturn(deletePermit);
        when(deletePermit.executeUpdate()).thenReturn(1);
    }

    @AfterEach
    void clearTransaction() {
        TransactionSynchronizationManager.clear();
        for (Object key : new ArrayList<>(TransactionSynchronizationManager.getResourceMap().keySet())) {
            TransactionSynchronizationManager.unbindResourceIfPossible(key);
        }
    }

    private static void beginTransaction() {
        TransactionSynchronizationManager.initSynchronization();
        TransactionSynchronizationManager.setActualTransactionActive(true);
    }

    private static List<TransactionSynchronization> synchronizations() {
        return TransactionSynchronizationManager.getSynchronizations();
    }

    @Test
    @DisplayName("페이징은 정렬 뒤의 LIMIT·OFFSET 이고, 있음 조회는 FROM 없는 CASE 다")
    void pagination() {
        assertThat(dialect.paginate("SELECT a FROM t ORDER BY a", 10, 20)).isEqualTo("SELECT a FROM t ORDER BY a LIMIT 10 OFFSET 20");
        assertThat(dialect.limit("SELECT a FROM t", 5)).isEqualTo("SELECT a FROM t LIMIT 5");
        assertThat(dialect.existsQuery("SELECT 1 FROM t")).isEqualTo("SELECT CASE WHEN EXISTS (SELECT 1 FROM t) THEN 1 ELSE 0 END");
    }

    @Test
    @DisplayName("문자열 식은 || 연결과 INSTR 이고, 길이를 정한 변환은 넘치는 값을 거부하지 않고 자른다")
    void textExpressions() {
        assertThat(dialect.concat("a", "'-'", "b")).isEqualTo("a || '-' || b");
        assertThat(dialect.containsText(":needle", "t.url")).isEqualTo("INSTR(t.url, :needle)>0");
        assertThat(dialect.castToVarchar("t.no", 10)).isEqualTo("CAST(SUBSTRING(CAST(t.no AS VARCHAR), 1, 10) AS VARCHAR(10))");
    }

    @Test
    @DisplayName("두 행 잠금 강도 모두 FOR UPDATE 다 — 약한 잠금이 없다")
    void rowLocks() {
        assertThat(dialect.selectForLock("id", "tb_a", "WHERE id = ?", RowLock.FOR_UPDATE)).isEqualTo("SELECT id FROM tb_a WHERE id = ? FOR UPDATE");
        assertThat(dialect.selectForLock("id", "tb_a", "", RowLock.FOR_NO_KEY_UPDATE)).isEqualTo("SELECT id FROM tb_a FOR UPDATE");
    }

    @Test
    @DisplayName("upsert 는 ON DUPLICATE KEY UPDATE 한 문장으로 누적하고 더할 값은 같은 바인딩 이름을 다시 쓴다")
    void upsertAddsCounters() {
        String sql = dialect.upsertAddingCounters("tb_stat", "pk_tb_stat", List.of(new UpsertColumn("day_ymd", "day")),
                List.of(new UpsertColumn("hits", "hits"), new UpsertColumn("errs", "errs")), "created_at", "updated_at");
        assertThat(sql).isEqualTo("INSERT INTO tb_stat (day_ymd, hits, errs, created_at, updated_at) VALUES (:day, :hits, :errs, SYS_DATETIME, SYS_DATETIME)"
                + " ON DUPLICATE KEY UPDATE hits = COALESCE(tb_stat.hits, 0) + :hits, errs = COALESCE(tb_stat.errs, 0) + :errs, updated_at = SYS_DATETIME");
    }

    @Test
    @DisplayName("트랜잭션 잠금 대기 설정은 세션에 남아 풀로 새므로 연결의 기본 상한을 다시 거는 문장이고, 잘못된 값은 거부한다")
    void transactionLockWait() {
        assertThat(dialect.transactionLockWaitSql(Duration.ofSeconds(2))).isEqualTo("SET TRANSACTION LOCK TIMEOUT 5").isEqualTo(CubridSqlDialect.SESSION_LOCK_WAIT_SQL);
        assertThatThrownBy(() -> dialect.transactionLockWaitSql(Duration.ZERO)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("응용 잠금은 슬롯 표 행 잠금이고 두 키 공간을 같은 식으로 접는다. 슬롯 행이 없으면 멈춘다")
    @SuppressWarnings("unchecked")
    void applicationLocksUseSlotRows() throws Exception {
        JdbcOperations jdbc = mock(JdbcOperations.class);
        when(jdbc.query(eq(CubridSqlDialect.LOCK_SLOT_SQL), any(PreparedStatementSetter.class), any(ResultSetExtractor.class))).thenReturn(Boolean.TRUE);
        dialect.lockForTransaction(jdbc, 70_000L);
        dialect.lockForTransaction(jdbc, 2, 5);
        ArgumentCaptor<PreparedStatementSetter> setters = ArgumentCaptor.forClass(PreparedStatementSetter.class);
        verify(jdbc, times(2)).query(eq("SELECT lock_slot_no FROM tb_sys_lock_slot WHERE lock_slot_no = ? FOR UPDATE"), setters.capture(), any(ResultSetExtractor.class));
        PreparedStatement statement = mock(PreparedStatement.class);
        setters.getAllValues().get(0).setValues(statement);
        setters.getAllValues().get(1).setValues(statement);
        verify(statement).setInt(1, Math.floorMod(Long.hashCode(70_000L), 65_536));
        verify(statement).setInt(1, 31 * 2 + 5);

        when(jdbc.query(eq(CubridSqlDialect.LOCK_SLOT_SQL), any(PreparedStatementSetter.class), any(ResultSetExtractor.class))).thenReturn(Boolean.FALSE);
        assertThatThrownBy(() -> dialect.lockForTransaction(jdbc, 1L)).isInstanceOf(IllegalStateException.class).hasMessageContaining("tb_sys_lock_slot");
    }

    @Test
    @DisplayName("원장 삭제 허가는 쓰기 트랜잭션 밖에서 낼 수 없다")
    void permitRequiresATransaction() {
        assertThatThrownBy(() -> dialect.permitLedgerDeletion(entityManager, LedgerDeletionPermit.AUDIT_RETENTION))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("허가는 트랜잭션마다 한 번 넣고, 커밋 직전 쌓인 삭제를 내보낸 뒤 회수한다")
    void permitIsInsertedOnceAndRevokedBeforeCommit() {
        beginTransaction();

        dialect.permitLedgerDeletion(entityManager, LedgerDeletionPermit.AUDIT_RETENTION);
        dialect.permitLedgerDeletion(entityManager, LedgerDeletionPermit.AUDIT_RETENTION);

        verify(insertPermit).setParameter(1, LedgerDeletionPermit.AUDIT_RETENTION.key());
        verify(insertPermit).executeUpdate();
        assertThat(synchronizations()).hasSize(1);

        synchronizations().getFirst().beforeCommit(false);

        InOrder order = inOrder(entityManager, deletePermit);
        order.verify(entityManager).flush();
        order.verify(deletePermit).setParameter(1, LedgerDeletionPermit.AUDIT_RETENTION.key());
        order.verify(deletePermit).executeUpdate();
    }

    @Test
    @DisplayName("허가 행을 회수하지 못하면 커밋을 멈춘다 — 열린 허가가 남으면 불변 보호가 풀린다")
    void commitStopsWhenThePermitCannotBeRevoked() {
        when(deletePermit.executeUpdate()).thenReturn(0);
        beginTransaction();
        dialect.permitLedgerDeletion(entityManager, LedgerDeletionPermit.AUDIT_RETENTION);

        assertThatThrownBy(() -> synchronizations().getFirst().beforeCommit(false))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("바깥 트랜잭션이 중단되면 안쪽은 허가를 새로 내고, 돌아오면 바깥 허가를 다시 쓴다")
    void suspendedPermitDoesNotLeakIntoTheInnerTransaction() {
        beginTransaction();
        dialect.permitLedgerDeletion(entityManager, LedgerDeletionPermit.CMS_PURGE);
        TransactionSynchronization outer = synchronizations().getFirst();

        outer.suspend();
        TransactionSynchronizationManager.clear();
        beginTransaction();
        dialect.permitLedgerDeletion(entityManager, LedgerDeletionPermit.CMS_PURGE);
        verify(insertPermit, times(2)).executeUpdate();

        synchronizations().getFirst().afterCompletion(TransactionSynchronization.STATUS_COMMITTED);
        TransactionSynchronizationManager.clear();
        beginTransaction();
        outer.resume();
        dialect.permitLedgerDeletion(entityManager, LedgerDeletionPermit.CMS_PURGE);
        verify(insertPermit, times(2)).executeUpdate();
    }

    @Test
    @DisplayName("표 수 조회는 현재 사용자의 사용자 표를 소문자로 대조한다")
    void countsTablesOfTheCurrentUser() {
        assertThat(dialect.countTablesQuery(List.of("tb_a", "tb_b")))
                .isEqualTo("SELECT COUNT(*) FROM db_class WHERE is_system_class = 'NO' AND owner_name = CURRENT_USER AND LOWER(class_name) IN ('tb_a','tb_b')");
        assertThat(dialect.databaseProductName()).isEqualTo("CUBRID");
    }

    @Test
    @DisplayName("시각은 밀리초까지 저장한다 — 표준 스키마(다른 벤더)는 마이크로초다")
    void storesTimestampsToTheMillisecond() {
        java.time.LocalDateTime value = java.time.LocalDateTime.of(2026, 11, 6, 12, 53, 26, 132_101_999);
        assertThat(dialect.storedTimestamp(value)).isEqualTo(java.time.LocalDateTime.of(2026, 11, 6, 12, 53, 26, 132_000_000));
        assertThat(new PostgresqlSqlDialect().storedTimestamp(value)).isEqualTo(java.time.LocalDateTime.of(2026, 11, 6, 12, 53, 26, 132_101_000));
    }

    @Test
    @DisplayName("SQLState 가 비어 와서 번호로 가른다. -494 는 바인딩 값 변환 실패만, -517 은 CHECK 트리거(ck_) 거부만 입력 오류다")
    void errorCodesSplitSharedNumbersByMessage() {
        VendorErrorCodes codes = dialect.errorCodes();
        assertThat(codes.rejectsValue(-631, "SQL statement violated NOT NULL constraint.")).isTrue();
        assertThat(codes.rejectsValue(-205, "Execute: Putting value 'NULL' into attribute 'v' returned: Attribute \"v\" cannot be made NULL.")).as("트리거가 있는 표의 NOT NULL 위반").isTrue();
        assertThat(codes.cancelled()).as("문장 시간 초과(Has been interrupted.)").containsExactly(-4);
        assertThat(codes.rejectsValue(-494, "Semantic: Cannot coerce host var to type char varying. [CAS INFO-127.0.0.1:33000,1,52]")).isTrue();
        assertThat(codes.rejectsValue(-494, "Semantic: before ' FROM t' Attempt to divide by zero.")).as("같은 번호의 SQL 결함은 입력 오류가 아니다").isFalse();
        assertThat(codes.rejectsValue(-494, "Semantic: Unknown class \"egov.tb_x\". Cannot coerce host var to type x")).as("문장 머리만 본다").isFalse();
        assertThat(codes.rejectsValue(-517, "The operation has been rejected by trigger \"egov.ck_tb_sys_job_job_no_i\".")).isTrue();
        assertThat(codes.rejectsValue(-517, "The operation has been rejected by trigger \"egov.tr_tb_adt_log_append_only_d\".")).as("원장 보호 거부는 입력 오류가 아니다").isFalse();
        assertThat(codes.rejectsValue(-517, "The operation has been rejected by trigger \"egov.tr_sync_ck_x_u\".")).as("이름 머리만 본다").isFalse();
        assertThat(codes.rejectsValue(-517, null)).isFalse();
        assertThat(codes.duplicates()).containsExactlyInAnyOrder(-670, -922, -924);
        assertThat(codes.lockFailures()).containsExactlyInAnyOrder(-75, -72);
        assertThat(codes.serverFaults()).containsExactly(-539);
    }

    @Test
    @DisplayName("서버 시계가 한국 시간이 아니면 기동을 멈춘다 — 같은 문장에서 읽은 서버 시계와 UTC 를 비교한다")
    @SuppressWarnings("unchecked")
    void sessionRequiresKoreanClock() {
        JdbcOperations jdbc = mock(JdbcOperations.class);
        when(jdbc.queryForObject(anyString(), any(RowMapper.class))).thenReturn(new String[] {"2026-11-06 09:30:00", "2026-11-06 00:30:00"});
        assertThatCode(() -> dialect.assertSession(jdbc)).doesNotThrowAnyException();

        when(jdbc.queryForObject(anyString(), any(RowMapper.class))).thenReturn(new String[] {"2026-11-06 00:30:00", "2026-11-06 00:30:00"});
        assertThatThrownBy(() -> dialect.assertSession(jdbc)).isInstanceOf(IllegalStateException.class).hasMessageContaining("+09:00").hasMessageContaining("offset 0");

        when(jdbc.queryForObject(anyString(), any(RowMapper.class))).thenReturn(new String[] {"2026-11-07 00:00:00", "2026-11-06 15:00:00"});
        assertThatCode(() -> dialect.assertSession(jdbc)).as("날짜가 넘어가도 차이로 본다").doesNotThrowAnyException();
    }

    @Test
    @DisplayName("커밋된 채 남은 허가가 있으면 기동을 멈춘다")
    void startupRejectsAnOpenPermit() {
        JdbcOperations jdbc = mock(JdbcOperations.class);
        when(jdbc.queryForObject(anyString(), eq(Integer.class))).thenReturn(0);
        assertThatCode(() -> dialect.assertNoOpenLedgerPermit(jdbc)).doesNotThrowAnyException();

        when(jdbc.queryForObject(anyString(), eq(Integer.class))).thenReturn(1);
        assertThatThrownBy(() -> dialect.assertNoOpenLedgerPermit(jdbc)).isInstanceOf(IllegalStateException.class);
    }
}
