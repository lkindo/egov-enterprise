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
import java.sql.ResultSet;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import nuri.foundation.core.persistence.VendorSqlDialect.LedgerDeletionPermit;
import nuri.foundation.core.persistence.VendorSqlDialect.RowLock;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.springframework.jdbc.core.JdbcOperations;
import org.springframework.jdbc.core.PreparedStatementSetter;
import org.springframework.jdbc.core.ResultSetExtractor;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * MySQL·MariaDB 가 함께 지키는 문장 모양. 실제 실행은 각 벤더 위 통합 시험이 본다(ADR-0047 단계 3).
 * 문장은 두 엔진의 실측(설계서 단계 3 실측 기록)에서 동작을 확인한 모양 그대로 고정한다.
 */
abstract class InnoDbSqlDialectContract {

    private static final String INSERT_PERMIT =
            "INSERT INTO tb_sys_ledger_permit (permit_key, permit_conn) VALUES (?1, CONNECTION_ID())";
    private static final String DELETE_PERMIT =
            "DELETE FROM tb_sys_ledger_permit WHERE permit_key = ?1 AND permit_conn = CONNECTION_ID()";

    private final EntityManager entityManager = mock(EntityManager.class);
    private final Query insertPermit = mock(Query.class);
    private final Query deletePermit = mock(Query.class);

    abstract InnoDbSqlDialect dialect();

    /** 슬롯 행 하나를 대기 상한과 함께 잠그는 이 벤더의 문장. */
    abstract String expectedLockSql();

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
    @DisplayName("페이징과 상한은 정렬 뒤에 LIMIT 로 붙는다")
    void pagination() {
        assertThat(dialect().paginate("SELECT a FROM t ORDER BY a", 20, 40))
                .isEqualTo("SELECT a FROM t ORDER BY a LIMIT 20 OFFSET 40");
        assertThat(dialect().limit("SELECT a FROM t", 5)).isEqualTo("SELECT a FROM t LIMIT 5");
    }

    @Test
    @DisplayName("연결은 CONCAT 이다 — 기본 설정의 || 는 논리 OR 라 모든 행과 일치한다")
    void textExpressions() {
        assertThat(dialect().existsQuery("SELECT 1 FROM t WHERE a = ?"))
                .isEqualTo("SELECT CASE WHEN EXISTS (SELECT 1 FROM t WHERE a = ?) THEN 1 ELSE 0 END");
        assertThat(dialect().concat("'/api/'", "m.id")).isEqualTo("CONCAT('/api/', m.id)");
        assertThat(dialect().concat("'/a/'", "m.id", "'/b'")).isEqualTo("CONCAT('/a/', m.id, '/b')");
        assertThat(dialect().castToVarchar("m.menu_sn", 20)).isEqualTo("CAST(m.menu_sn AS CHAR(20))");
    }

    @Test
    @DisplayName("부분 일치는 INSTR(찾을 곳, 찾을 값) 순서다 — LOCATE 와 인자 순서가 반대다")
    void containsTextSearchesTheHaystack() {
        assertThat(dialect().containsText(":keyword", "group_row.authrt_nm"))
                .isEqualTo("INSTR(group_row.authrt_nm, :keyword)>0");
    }

    @Test
    @DisplayName("자식 FK 를 막지 않는 잠금 강도가 따로 없어 두 강도 모두 FOR UPDATE 다")
    void rowLocksUseForUpdate() {
        for (RowLock lock : RowLock.values()) {
            assertThat(dialect().selectForLock("menu_sn", "tb_menu_info", "WHERE menu_sn = ?", lock))
                    .isEqualTo("SELECT menu_sn FROM tb_menu_info WHERE menu_sn = ? FOR UPDATE");
            assertThat(dialect().selectForLock("menu_sn", "tb_menu_info", "", lock))
                    .isEqualTo("SELECT menu_sn FROM tb_menu_info FOR UPDATE");
        }
    }

    @Test
    @DisplayName("트랜잭션 잠금 대기 설정은 없어 실행해도 아무 일이 없는 문장이고, 잘못된 값은 거부한다 — 세션 설정은 풀로 샌다")
    void transactionLockWait() {
        assertThat(dialect().transactionLockWaitSql(Duration.ofSeconds(2))).isEqualTo("DO 0");
        assertThatThrownBy(() -> dialect().transactionLockWaitSql(Duration.ZERO)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> dialect().transactionLockWaitSql(Duration.ofMillis(-1)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("응용 잠금은 키를 Oracle 과 같은 식으로 슬롯에 접어 그 행을 대기 상한과 함께 잠근다")
    @SuppressWarnings("unchecked")
    void applicationLocksHoldASlotRow() throws Exception {
        JdbcOperations jdbc = slotRowsExist(true);

        dialect().lockForTransaction(jdbc, Long.MIN_VALUE + 7);
        dialect().lockForTransaction(jdbc, Long.MIN_VALUE + 7);
        dialect().lockForTransaction(jdbc, -5, 3);

        ArgumentCaptor<PreparedStatementSetter> binder = ArgumentCaptor.forClass(PreparedStatementSetter.class);
        verify(jdbc, times(3)).query(eq(expectedLockSql()), binder.capture(), any(ResultSetExtractor.class));
        List<Integer> slots = new ArrayList<>();
        for (PreparedStatementSetter setter : binder.getAllValues()) {
            PreparedStatement statement = mock(PreparedStatement.class);
            setter.setValues(statement);
            ArgumentCaptor<Integer> slot = ArgumentCaptor.forClass(Integer.class);
            verify(statement).setInt(eq(1), slot.capture());
            slots.add(slot.getValue());
        }
        assertThat(slots).allSatisfy(slot -> assertThat(slot).isBetween(0, InnoDbSqlDialect.LOCK_SLOTS - 1));
        assertThat(slots.get(0)).as("같은 키는 같은 슬롯이다").isEqualTo(slots.get(1));
        assertThat(slots).as("Oracle 과 같은 슬롯 식이다 — 어댑터가 같은 수의 행을 만든다")
                .containsExactly(Math.floorMod(Long.hashCode(Long.MIN_VALUE + 7), 65_536),
                        Math.floorMod(Long.hashCode(Long.MIN_VALUE + 7), 65_536), Math.floorMod(31 * -5 + 3, 65_536));
        assertThat(InnoDbSqlDialect.LOCK_SLOTS).isEqualTo(OracleSqlDialect.LOCK_SLOTS);
    }

    @Test
    @DisplayName("슬롯 행이 없으면 멈춘다 — READ COMMITTED 의 잠금 읽기는 없는 행에서 아무것도 잠그지 않는다")
    @SuppressWarnings("unchecked")
    void missingSlotRowStopsInsteadOfSilentlyNotLocking() throws Exception {
        JdbcOperations empty = slotRowsExist(false);
        assertThatThrownBy(() -> dialect().lockForTransaction(empty, 42L))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("tb_sys_lock_slot");

        JdbcOperations jdbc = slotRowsExist(true);
        dialect().lockForTransaction(jdbc, 42L);
        ArgumentCaptor<ResultSetExtractor<Boolean>> reader = ArgumentCaptor.forClass(ResultSetExtractor.class);
        verify(jdbc).query(anyString(), any(PreparedStatementSetter.class), reader.capture());
        ResultSet found = mock(ResultSet.class);
        when(found.next()).thenReturn(true);
        ResultSet none = mock(ResultSet.class);
        assertThat(reader.getValue().extractData(found)).isTrue();
        assertThat(reader.getValue().extractData(none)).isFalse();
    }

    @SuppressWarnings("unchecked")
    private static JdbcOperations slotRowsExist(boolean exists) {
        JdbcOperations jdbc = mock(JdbcOperations.class);
        when(jdbc.query(anyString(), any(PreparedStatementSetter.class), any(ResultSetExtractor.class))).thenReturn(exists);
        return jdbc;
    }

    @Test
    @DisplayName("원장 삭제 허가는 쓰기 트랜잭션 밖에서 낼 수 없다")
    void permitRequiresATransaction() {
        assertThatThrownBy(() -> dialect().permitLedgerDeletion(entityManager, LedgerDeletionPermit.AUDIT_RETENTION))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("허가는 자기 연결 번호로 트랜잭션마다 한 번 넣고, 커밋 직전 쌓인 삭제를 내보낸 뒤 자기 연결의 행만 회수한다")
    void permitIsInsertedOnceAndRevokedBeforeCommit() {
        beginTransaction();

        dialect().permitLedgerDeletion(entityManager, LedgerDeletionPermit.AUDIT_RETENTION);
        dialect().permitLedgerDeletion(entityManager, LedgerDeletionPermit.AUDIT_RETENTION);

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
    @DisplayName("허가 행을 정확히 하나 회수하지 못하면 커밋을 멈춘다 — 열린 허가가 남으면 불변 보호가 풀린다")
    void commitStopsWhenThePermitCannotBeRevoked() {
        for (int removed : new int[] {0, 2}) {
            when(deletePermit.executeUpdate()).thenReturn(removed);
            beginTransaction();
            dialect().permitLedgerDeletion(entityManager, LedgerDeletionPermit.CMS_PURGE);

            assertThatThrownBy(() -> synchronizations().getFirst().beforeCommit(false))
                    .isInstanceOf(IllegalStateException.class).hasMessageContaining(LedgerDeletionPermit.CMS_PURGE.key());
            clearTransaction();
        }
    }

    @Test
    @DisplayName("트랜잭션이 끝나면 다음 트랜잭션은 허가를 새로 낸다")
    void nextTransactionRequestsAFreshPermit() {
        beginTransaction();
        dialect().permitLedgerDeletion(entityManager, LedgerDeletionPermit.AUDIT_RETENTION);
        synchronizations().getFirst().afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK);
        TransactionSynchronizationManager.clear();

        beginTransaction();
        dialect().permitLedgerDeletion(entityManager, LedgerDeletionPermit.AUDIT_RETENTION);

        verify(insertPermit, times(2)).executeUpdate();
    }

    @Test
    @DisplayName("바깥 트랜잭션이 중단되면 안쪽은 허가를 새로 내고, 돌아오면 바깥 허가를 다시 쓴다")
    void suspendedPermitDoesNotLeakIntoTheInnerTransaction() {
        beginTransaction();
        dialect().permitLedgerDeletion(entityManager, LedgerDeletionPermit.CMS_PURGE);
        TransactionSynchronization outer = synchronizations().getFirst();

        outer.suspend();
        TransactionSynchronizationManager.clear();
        beginTransaction();
        dialect().permitLedgerDeletion(entityManager, LedgerDeletionPermit.CMS_PURGE);
        verify(insertPermit, times(2)).executeUpdate();

        synchronizations().getFirst().afterCompletion(TransactionSynchronization.STATUS_COMMITTED);
        TransactionSynchronizationManager.clear();
        beginTransaction();
        outer.resume();
        dialect().permitLedgerDeletion(entityManager, LedgerDeletionPermit.CMS_PURGE);
        verify(insertPermit, times(2)).executeUpdate();
    }

    @Test
    @DisplayName("표 수 조회는 연결한 스키마의 표를 소문자로 대조한다")
    void countsTablesOfTheConnectedSchema() {
        assertThat(dialect().countTablesQuery(List.of("tb_a", "tb_b"))).isEqualTo("SELECT count(*) FROM information_schema.tables"
                + " WHERE table_schema = DATABASE() AND LOWER(table_name) IN ('tb_a','tb_b')");
    }

    @Test
    @DisplayName("커밋된 채 남은 허가가 있으면 기동을 멈춘다 — 연결 번호는 다시 쓰인다")
    void startupRejectsAnOpenPermit() {
        JdbcOperations jdbc = mock(JdbcOperations.class);
        when(jdbc.queryForObject(anyString(), eq(Integer.class))).thenReturn(0);
        assertThatCode(() -> dialect().assertNoOpenLedgerPermit(jdbc)).doesNotThrowAnyException();
        verify(jdbc).queryForObject("SELECT count(*) FROM tb_sys_ledger_permit", Integer.class);

        when(jdbc.queryForObject(anyString(), eq(Integer.class))).thenReturn(1);
        assertThatThrownBy(() -> dialect().assertNoOpenLedgerPermit(jdbc)).isInstanceOf(IllegalStateException.class);

        when(jdbc.queryForObject(anyString(), eq(Integer.class))).thenReturn(null);
        assertThatThrownBy(() -> dialect().assertNoOpenLedgerPermit(jdbc)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("Oracle 의 오류 번호를 쓰지 않는다 — 같은 번호가 이 벤더에서는 다른 오류다")
    void doesNotBorrowOracleErrorNumbers() {
        VendorErrorCodes oracle = new OracleSqlDialect().errorCodes();
        VendorErrorCodes codes = dialect().errorCodes();
        assertThat(codes.invalidValues()).doesNotContainAnyElementsOf(oracle.invalidValues());
        assertThat(codes.duplicates()).doesNotContainAnyElementsOf(oracle.duplicates());
        assertThat(codes.lockFailures()).doesNotContainAnyElementsOf(oracle.lockFailures());
        assertThat(codes.cancelled()).doesNotContainAnyElementsOf(oracle.cancelled());
    }
}
