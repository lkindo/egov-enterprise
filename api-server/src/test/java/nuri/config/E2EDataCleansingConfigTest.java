package nuri.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.SimpleTransactionStatus;
import org.springframework.transaction.support.TransactionTemplate;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("E2E 테스트 데이터 정리 SQL 계약")
class E2EDataCleansingConfigTest {

    private static final String E2E_POLL_PREDICATE =
            "SELECT POLL_SN FROM TB_ONLN_POLL_MANAGE "
                    + "WHERE POLL_NM LIKE 'E2E %' OR FRST_RGTR_ID = 'E2E_USER'";
    private static final String BOARD_SQL =
            "UPDATE TB_BBS_ITEM SET USE_YN = 'N' "
                    + "WHERE PST_TTL LIKE 'E2E %' OR FRST_RGTR_ID = 'E2E_USER'";
    private static final String POLL_RESULT_SQL =
            "DELETE FROM TB_ONLN_POLL_RSLT WHERE POLL_SN IN (" + E2E_POLL_PREDICATE + ")";
    private static final String POLL_ARTICLE_SQL =
            "DELETE FROM TB_ONLN_POLL_ARTCL WHERE POLL_SN IN (" + E2E_POLL_PREDICATE + ")";
    private static final String POLL_MANAGE_SQL =
            "DELETE FROM TB_ONLN_POLL_MANAGE "
                    + "WHERE POLL_NM LIKE 'E2E %' OR FRST_RGTR_ID = 'E2E_USER'";
    private static final String POPUP_SQL =
            "DELETE FROM TB_POPUP_INFO "
                    + "WHERE POPUP_TTL_NM LIKE 'E2E %' OR FRST_RGTR_ID = 'E2E_USER'";
    private static final String BANNER_SQL =
            "DELETE FROM TB_BNR_INFO "
                    + "WHERE BNR_NM LIKE 'E2E %' OR FRST_RGTR_ID = 'E2E_USER'";

    @Test
    @DisplayName("현재 숫자 FK 순서로 전체 정리를 수행한 뒤 트랜잭션을 commit한다")
    void cleansPollGraphInForeignKeyOrderAndCommits() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        TransactionHarness transaction = transactionHarness();
        E2EDataCleansingConfig config =
                new E2EDataCleansingConfig(jdbcTemplate, transaction.template());

        config.cleanseTestData();

        InOrder order = inOrder(transaction.manager(), jdbcTemplate);
        order.verify(transaction.manager()).getTransaction(any(TransactionDefinition.class));
        order.verify(jdbcTemplate).update(BOARD_SQL);
        order.verify(jdbcTemplate).update(POLL_RESULT_SQL);
        order.verify(jdbcTemplate).update(POLL_ARTICLE_SQL);
        order.verify(jdbcTemplate).update(POLL_MANAGE_SQL);
        order.verify(jdbcTemplate).update(POPUP_SQL);
        order.verify(jdbcTemplate).update(BANNER_SQL);
        order.verify(transaction.manager()).commit(transaction.status());
        order.verifyNoMoreInteractions();
        verify(transaction.manager(), never()).rollback(any());
    }

    @Test
    @DisplayName("중간 정리 SQL 실패 시 rollback하고 동일 예외를 E2E 부팅 호출자에게 전파한다")
    void rollsBackAndPropagatesCleanupFailure() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        TransactionHarness transaction = transactionHarness();
        DataAccessResourceFailureException failure =
                new DataAccessResourceFailureException("cleanup failed");
        when(jdbcTemplate.update(anyString())).thenReturn(1);
        doThrow(failure).when(jdbcTemplate).update(POLL_RESULT_SQL);
        E2EDataCleansingConfig config =
                new E2EDataCleansingConfig(jdbcTemplate, transaction.template());

        assertThatThrownBy(config::cleanseTestData).isSameAs(failure);

        InOrder order = inOrder(transaction.manager(), jdbcTemplate);
        order.verify(transaction.manager()).getTransaction(any(TransactionDefinition.class));
        order.verify(jdbcTemplate).update(BOARD_SQL);
        order.verify(jdbcTemplate).update(POLL_RESULT_SQL);
        order.verify(transaction.manager()).rollback(transaction.status());
        order.verifyNoMoreInteractions();
        verify(transaction.manager(), never()).commit(any());
    }

    private static TransactionHarness transactionHarness() {
        PlatformTransactionManager manager = mock(PlatformTransactionManager.class);
        SimpleTransactionStatus status = new SimpleTransactionStatus();
        when(manager.getTransaction(any(TransactionDefinition.class))).thenReturn(status);
        return new TransactionHarness(manager, status, new TransactionTemplate(manager));
    }

    private record TransactionHarness(
            PlatformTransactionManager manager,
            SimpleTransactionStatus status,
            TransactionTemplate template) {
    }
}
