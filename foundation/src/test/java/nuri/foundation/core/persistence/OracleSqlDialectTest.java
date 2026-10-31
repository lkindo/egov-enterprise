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
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/** 문장 모양은 여기서 고정하고, 실제 실행은 Oracle 위 앱 기동·통합 시험이 본다(ADR-0047). */
class OracleSqlDialectTest {

    private static final String INSERT_PERMIT = "INSERT INTO tb_sys_ledger_permit (permit_key) VALUES (?1)";
    private static final String DELETE_PERMIT = "DELETE FROM tb_sys_ledger_permit WHERE permit_key = ?1";

    private final OracleSqlDialect dialect = new OracleSqlDialect();
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
    @DisplayName("페이징은 정렬 뒤에 표준 절로 붙고 19c 가 받는다")
    void pagination() {
        assertThat(dialect.paginate("SELECT a FROM t ORDER BY a", 20, 40))
                .isEqualTo("SELECT a FROM t ORDER BY a OFFSET 40 ROWS FETCH NEXT 20 ROWS ONLY");
        assertThat(dialect.limit("SELECT a FROM t", 5)).isEqualTo("SELECT a FROM t FETCH FIRST 5 ROWS ONLY");
    }

    @Test
    @DisplayName("문자열 식은 Oracle 함수로 쓴다")
    void textExpressions() {
        assertThat(dialect.existsQuery("SELECT 1 FROM t WHERE a = ?"))
                .isEqualTo("SELECT CASE WHEN EXISTS (SELECT 1 FROM t WHERE a = ?) THEN 1 ELSE 0 END FROM DUAL");
        assertThat(dialect.concat("'/api/'", "m.id")).isEqualTo("'/api/' || m.id");
        assertThat(dialect.containsText(":keyword", "t.nm")).isEqualTo("INSTR(t.nm, :keyword)>0");
        assertThat(dialect.castToVarchar("m.menu_sn", 20)).isEqualTo("CAST(m.menu_sn AS VARCHAR2(20 CHAR))");
    }

    @Test
    @DisplayName("자식 FK 를 막지 않는 잠금 강도가 따로 없어 두 강도 모두 FOR UPDATE 다")
    void rowLocksUseForUpdate() {
        for (RowLock lock : RowLock.values()) {
            assertThat(dialect.selectForLock("menu_sn", "tb_menu_info", "WHERE menu_sn = ?", lock))
                    .isEqualTo("SELECT menu_sn FROM tb_menu_info WHERE menu_sn = ? FOR UPDATE");
            assertThat(dialect.selectForLock("menu_sn", "tb_menu_info", "", lock))
                    .isEqualTo("SELECT menu_sn FROM tb_menu_info FOR UPDATE");
        }
    }

    @Test
    @DisplayName("upsert 는 MERGE 로 누적하고 동시 입력의 중복 키는 카운터 더하기로 받는다")
    void upsertAddsCounters() {
        String sql = dialect.upsertAddingCounters("tb_user_log", "pk_tb_user_log",
                List.of(new UpsertColumn("ocrn_ymd", "ocrnYmd"), new UpsertColumn("srvc_nm", "srvcNm")),
                List.of(new UpsertColumn("crt_cnt", "crtCnt")), "crt_dt", "mdfcn_dt");

        assertThat(sql).isEqualTo("BEGIN MERGE INTO tb_user_log t USING (SELECT :ocrnYmd AS ocrn_ymd, :srvcNm AS srvc_nm,"
                + " :crtCnt AS crt_cnt FROM DUAL) s ON (t.ocrn_ymd = s.ocrn_ymd AND t.srvc_nm = s.srvc_nm)"
                + " WHEN MATCHED THEN UPDATE SET t.crt_cnt = COALESCE(t.crt_cnt, 0) + s.crt_cnt, t.mdfcn_dt = LOCALTIMESTAMP"
                + " WHEN NOT MATCHED THEN INSERT (ocrn_ymd, srvc_nm, crt_cnt, crt_dt, mdfcn_dt)"
                + " VALUES (s.ocrn_ymd, s.srvc_nm, s.crt_cnt, LOCALTIMESTAMP, LOCALTIMESTAMP);"
                + " EXCEPTION WHEN DUP_VAL_ON_INDEX THEN UPDATE tb_user_log SET crt_cnt = COALESCE(crt_cnt, 0) + :crtCnt,"
                + " mdfcn_dt = LOCALTIMESTAMP WHERE ocrn_ymd = :ocrnYmd AND srvc_nm = :srvcNm; END;");
    }

    @Test
    @DisplayName("트랜잭션 잠금 대기 설정은 없어 실행해도 아무 일이 없는 문장이고, 잘못된 값은 거부한다")
    void transactionLockWait() {
        assertThat(dialect.transactionLockWaitSql(Duration.ofSeconds(2))).isEqualTo("BEGIN NULL; END;");
        assertThatThrownBy(() -> dialect.transactionLockWaitSql(Duration.ZERO))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("응용 잠금은 키를 슬롯으로 접어 그 행을 대기 상한과 함께 잠근다")
    void applicationLocksHoldASlotRow() throws Exception {
        JdbcOperations jdbc = mock(JdbcOperations.class);

        dialect.lockForTransaction(jdbc, Long.MIN_VALUE + 7);
        dialect.lockForTransaction(jdbc, Long.MIN_VALUE + 7);
        dialect.lockForTransaction(jdbc, -5, 3);

        ArgumentCaptor<PreparedStatementSetter> binder = ArgumentCaptor.forClass(PreparedStatementSetter.class);
        verify(jdbc, times(3)).query(
                eq("SELECT lock_slot_no FROM tb_sys_lock_slot WHERE lock_slot_no = ? FOR UPDATE WAIT 10"),
                binder.capture(), any(RowCallbackHandler.class));
        List<Integer> slots = new ArrayList<>();
        for (PreparedStatementSetter setter : binder.getAllValues()) {
            PreparedStatement statement = mock(PreparedStatement.class);
            setter.setValues(statement);
            ArgumentCaptor<Integer> slot = ArgumentCaptor.forClass(Integer.class);
            verify(statement).setInt(eq(1), slot.capture());
            slots.add(slot.getValue());
        }
        assertThat(slots).allSatisfy(slot -> assertThat(slot).isBetween(0, OracleSqlDialect.LOCK_SLOTS - 1));
        assertThat(slots.get(0)).as("같은 키는 같은 슬롯이다").isEqualTo(slots.get(1));
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
    @DisplayName("트랜잭션이 끝나면 다음 트랜잭션은 허가를 새로 낸다")
    void nextTransactionRequestsAFreshPermit() {
        beginTransaction();
        dialect.permitLedgerDeletion(entityManager, LedgerDeletionPermit.AUDIT_RETENTION);
        synchronizations().getFirst().afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK);
        TransactionSynchronizationManager.clear();

        beginTransaction();
        dialect.permitLedgerDeletion(entityManager, LedgerDeletionPermit.AUDIT_RETENTION);

        verify(insertPermit, times(2)).executeUpdate();
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
    @DisplayName("표 수 조회는 현재 계정의 표를 소문자로 대조한다")
    void countsTablesOfTheCurrentUser() {
        assertThat(dialect.countTablesQuery(List.of("tb_a", "tb_b")))
                .isEqualTo("SELECT count(*) FROM user_tables WHERE LOWER(table_name) IN ('tb_a','tb_b')");
        assertThat(dialect.databaseProductName()).isEqualTo("Oracle");
    }

    @Test
    @DisplayName("커밋된 채 남은 허가가 있으면 기동을 멈춘다")
    void startupRejectsAnOpenPermit() {
        JdbcOperations jdbc = mock(JdbcOperations.class);
        when(jdbc.queryForObject(anyString(), eq(Integer.class))).thenReturn(0);
        assertThatCode(() -> dialect.assertNoOpenLedgerPermit(jdbc)).doesNotThrowAnyException();

        when(jdbc.queryForObject(anyString(), eq(Integer.class))).thenReturn(1);
        assertThatThrownBy(() -> dialect.assertNoOpenLedgerPermit(jdbc)).isInstanceOf(IllegalStateException.class);

        when(jdbc.queryForObject(anyString(), eq(Integer.class))).thenReturn(null);
        assertThatThrownBy(() -> dialect.assertNoOpenLedgerPermit(jdbc)).isInstanceOf(IllegalStateException.class);
    }
}
