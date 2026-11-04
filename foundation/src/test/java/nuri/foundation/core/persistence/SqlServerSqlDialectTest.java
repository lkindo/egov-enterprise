package nuri.foundation.core.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
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
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InOrder;
import org.springframework.jdbc.core.JdbcOperations;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/** 문장 모양은 여기서 고정하고, 실제 실행은 SQL Server 위 통합 시험이 본다(ADR-0047 단계 4). */
class SqlServerSqlDialectTest {

    private static final String INSERT_PERMIT = "INSERT INTO tb_sys_ledger_permit (permit_key, permit_conn) VALUES (?1, @@SPID)";
    private static final String DELETE_PERMIT = "DELETE FROM tb_sys_ledger_permit WHERE permit_key = ?1 AND permit_conn = @@SPID";

    private final SqlServerSqlDialect dialect = new SqlServerSqlDialect();
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
    @DisplayName("페이징은 정렬 뒤의 OFFSET·FETCH 이고, 정렬 없는 조회의 행 수 상한은 TOP 이다")
    void pagination() {
        assertThat(dialect.paginate("SELECT a FROM t ORDER BY a", 20, 40))
                .isEqualTo("SELECT a FROM t ORDER BY a OFFSET 40 ROWS FETCH NEXT 20 ROWS ONLY");
        assertThat(dialect.limit("SELECT a FROM t WHERE b = 1", 5)).isEqualTo("SELECT TOP (5) a FROM t WHERE b = 1");
        assertThat(dialect.limit("  select distinct a FROM t", 3)).isEqualTo("SELECT DISTINCT TOP (3) a FROM t");
        assertThatThrownBy(() -> dialect.limit("WITH x AS (SELECT 1) SELECT * FROM x", 1))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("문자열 식은 NULL 을 그대로 전파하는 + 와 CHARINDEX 로 쓴다")
    void textExpressions() {
        assertThat(dialect.existsQuery("SELECT 1 FROM t WHERE a = ?"))
                .isEqualTo("SELECT CASE WHEN EXISTS (SELECT 1 FROM t WHERE a = ?) THEN 1 ELSE 0 END");
        assertThat(dialect.concat("'/api/'", "m.id")).isEqualTo("'/api/' + m.id");
        assertThat(dialect.containsText(":keyword", "t.nm")).isEqualTo("CHARINDEX(:keyword, t.nm)>0");
        assertThat(dialect.castToVarchar("m.menu_sn", 20)).isEqualTo("CAST(m.menu_sn AS NVARCHAR(20))");
    }

    @Test
    @DisplayName("FOR UPDATE 는 자식 FK 입력을 막는 배타 잠금, FOR NO KEY UPDATE 는 막지 않는 갱신 잠금이다")
    void rowLockHints() {
        assertThat(dialect.selectForLock("menu_sn", "tb_menu_info", "WHERE menu_sn = ?", RowLock.FOR_UPDATE))
                .isEqualTo("SELECT menu_sn FROM tb_menu_info WITH (XLOCK, ROWLOCK) WHERE menu_sn = ?");
        assertThat(dialect.selectForLock("menu_sn", "tb_menu_info", "", RowLock.FOR_NO_KEY_UPDATE))
                .isEqualTo("SELECT menu_sn FROM tb_menu_info WITH (UPDLOCK, ROWLOCK)");
    }

    @Test
    @DisplayName("upsert 는 HOLDLOCK MERGE 한 문장으로 누적하고 세미콜론으로 끝난다")
    void upsertAddsCounters() {
        String sql = dialect.upsertAddingCounters("tb_user_log", "pk_tb_user_log",
                List.of(new UpsertColumn("ocrn_ymd", "ocrnYmd"), new UpsertColumn("srvc_nm", "srvcNm")),
                List.of(new UpsertColumn("crt_cnt", "crtCnt")), "crt_dt", "mdfcn_dt");

        assertThat(sql).isEqualTo("MERGE INTO tb_user_log WITH (HOLDLOCK) AS t USING (SELECT :ocrnYmd AS ocrn_ymd, :srvcNm AS srvc_nm,"
                + " :crtCnt AS crt_cnt) AS s ON (t.ocrn_ymd = s.ocrn_ymd AND t.srvc_nm = s.srvc_nm)"
                + " WHEN MATCHED THEN UPDATE SET crt_cnt = COALESCE(t.crt_cnt, 0) + s.crt_cnt, mdfcn_dt = SYSDATETIME()"
                + " WHEN NOT MATCHED THEN INSERT (ocrn_ymd, srvc_nm, crt_cnt, crt_dt, mdfcn_dt)"
                + " VALUES (s.ocrn_ymd, s.srvc_nm, s.crt_cnt, SYSDATETIME(), SYSDATETIME());");
    }

    @Test
    @DisplayName("트랜잭션 잠금 대기 설정은 없어 실행해도 아무 일이 없는 문장이고, 잘못된 값은 거부한다")
    void transactionLockWait() {
        assertThat(dialect.transactionLockWaitSql(Duration.ofSeconds(2))).isEqualTo("DECLARE @nuri_lock_wait INT");
        assertThatThrownBy(() -> dialect.transactionLockWaitSql(Duration.ZERO))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("응용 잠금은 트랜잭션을 연 뒤 트랜잭션 소유 sp_getapplock 을 대기 상한과 함께 잡고, 두 키 공간은 겹치지 않는다")
    void applicationLocksUseTransactionOwnedAppLocks() {
        JdbcOperations jdbc = mock(JdbcOperations.class);
        when(jdbc.queryForObject(anyString(), eq(Integer.class), anyString())).thenReturn(0);

        dialect.lockForTransaction(jdbc, -7L);
        dialect.lockForTransaction(jdbc, 3, 4);

        String sql = "DECLARE @nuri_open INT = (SELECT COUNT(*) FROM sys.objects WHERE 1 = 0); DECLARE @nuri_lock INT; "
                + "EXEC @nuri_lock = sp_getapplock @Resource = ?, @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 10000;"
                + " IF @nuri_lock = -999 THROW 51003, N'application lock requires a transaction', 1;"
                + " IF @nuri_lock < 0 THROW 51002, N'application lock not granted', 1; SELECT @nuri_lock";
        verify(jdbc).queryForObject(sql, Integer.class, "nuri:-7");
        verify(jdbc).queryForObject(sql, Integer.class, "nuri:3:4");
    }

    @Test
    @DisplayName("잡지 못한 응용 잠금은 DB 오류(51002)로 오고 잠금 충돌(409)이다 — 트랜잭션 밖 호출(51003)은 충돌이 아니다")
    void failedApplicationLockIsAConflict() {
        assertThat(dialect.errorCodes().lockFailures()).contains(51002).doesNotContain(51003);
    }

    @ParameterizedTest
    @ValueSource(ints = {-1, -999})
    @DisplayName("문장이 실패를 오류로 올리지 않고 음수를 돌려주면 바뀐 문장이라 멈춘다")
    void negativeResultWithoutAnErrorStops(int result) {
        JdbcOperations jdbc = mock(JdbcOperations.class);
        when(jdbc.queryForObject(anyString(), eq(Integer.class), anyString())).thenReturn(result);

        assertThatThrownBy(() -> dialect.lockForTransaction(jdbc, 1L)).isInstanceOf(IllegalStateException.class);
        when(jdbc.queryForObject(anyString(), eq(Integer.class), anyString())).thenReturn(1);
        assertThatCode(() -> dialect.lockForTransaction(jdbc, 1L)).as("1 은 기다린 뒤 잡았다는 뜻이다").doesNotThrowAnyException();
    }

    @Test
    @DisplayName("원장 삭제 허가는 쓰기 트랜잭션 밖에서 낼 수 없다")
    void permitRequiresATransaction() {
        assertThatThrownBy(() -> dialect.permitLedgerDeletion(entityManager, LedgerDeletionPermit.AUDIT_RETENTION))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("허가는 세션 번호와 함께 트랜잭션마다 한 번 넣고, 커밋 직전 쌓인 삭제를 내보낸 뒤 자기 세션 행만 회수한다")
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
    @DisplayName("표 수 조회는 현재 스키마의 기본 표를 소문자로 대조한다")
    void countsTablesOfTheCurrentSchema() {
        assertThat(dialect.countTablesQuery(List.of("tb_a", "tb_b")))
                .isEqualTo("SELECT count(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = SCHEMA_NAME() AND TABLE_TYPE = 'BASE TABLE'"
                        + " AND LOWER(TABLE_NAME) IN ('tb_a','tb_b')");
        assertThat(dialect.databaseProductName()).isEqualTo("Microsoft SQL Server");
    }

    @Test
    @DisplayName("547 은 CHECK 위반만 입력 오류다 — 같은 번호의 FK 위반은 409 로 남는다. 메시지 언어가 한국어여도 제약 종류 낱말은 영어다")
    void checkAndForeignKeyShareOneNumber() {
        VendorErrorCodes codes = dialect.errorCodes();
        assertThat(codes.rejectsValue(547, "The INSERT statement conflicted with the CHECK constraint \"ck_tb_a_b\".")).isTrue();
        assertThat(codes.rejectsValue(547, "INSERT 문이 CHECK 제약 조건 \"ck_tb_a_b\"과(와) 충돌했습니다.")).isTrue();
        assertThat(codes.rejectsValue(547, "The INSERT statement conflicted with the FOREIGN KEY constraint \"fk_tb_a_b\".")).isFalse();
        assertThat(codes.rejectsValue(547, "The DELETE statement conflicted with the REFERENCE constraint \"fk_tb_a_b\".")).isFalse();
        assertThat(codes.rejectsValue(547, null)).isFalse();
        assertThat(codes.rejectsValue(2628, "String or binary data would be truncated")).isTrue();
        assertThat(codes.lockFailures()).contains(1222, 1205, 3960);
    }

    @Test
    @DisplayName("스냅숏 두 설정이 꺼졌거나 서버 시계가 한국 시간이 아니면 기동을 멈춘다")
    void sessionRequiresSnapshotsAndKoreanClock() {
        JdbcOperations jdbc = mock(JdbcOperations.class);
        when(jdbc.queryForObject(contains("sys.databases"), eq(Integer.class))).thenReturn(1);
        when(jdbc.queryForObject(contains("DATEDIFF"), eq(Integer.class))).thenReturn(540);
        assertThatCode(() -> dialect.assertSession(jdbc)).doesNotThrowAnyException();

        when(jdbc.queryForObject(contains("DATEDIFF"), eq(Integer.class))).thenReturn(0);
        assertThatThrownBy(() -> dialect.assertSession(jdbc)).isInstanceOf(IllegalStateException.class).hasMessageContaining("Korea");

        when(jdbc.queryForObject(contains("sys.databases"), eq(Integer.class))).thenReturn(0);
        assertThatThrownBy(() -> dialect.assertSession(jdbc)).isInstanceOf(IllegalStateException.class).hasMessageContaining("SNAPSHOT");
        when(jdbc.queryForObject(contains("sys.databases"), eq(Integer.class))).thenReturn(null);
        assertThatThrownBy(() -> dialect.assertSession(jdbc)).isInstanceOf(IllegalStateException.class);
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
