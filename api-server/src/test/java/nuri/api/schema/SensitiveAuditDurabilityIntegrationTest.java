package nuri.api.schema;

import java.util.UUID;
import nuri.business.domain.log.PrivacyLog;
import nuri.business.domain.log.PrivacyLogRepository;
import nuri.foundation.core.audit.SensitiveAuditPort;
import nuri.foundation.core.exception.BusinessException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.IllegalTransactionStateException;
import org.springframework.transaction.support.TransactionTemplate;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;

/** Real PostgreSQL/Flyway: durability is not inferred from an H2 schema or mocked flush. */
@Tag("schema-validation")
@SpringBootTest
@org.springframework.context.annotation.Import(AuthorizationSchemaRehearsalTestConfiguration.class)
@ActiveProfiles({"test", "tc"})
class SensitiveAuditDurabilityIntegrationTest {
    @Autowired private SensitiveAuditPort audit;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private PlatformTransactionManager transactionManager;
    @MockitoSpyBean private PrivacyLogRepository privacy;
    private SensitiveAuditPort.Context context;

    @BeforeEach
    void fixture() {
        String fixture = "D13" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        context = new SensitiveAuditPort.Context(UUID.randomUUID().toString(), "SensitiveAuditTest#read", fixture,
                null, "127.0.0.1", "테스트 개인정보 조회", null);
    }

    @AfterEach
    void cleanupOnlyThisTest() {
        if (context == null) return;
        jdbc.update("DELETE FROM tb_privacy_log WHERE dmnd_user_id=?", context.actorLoginId());
        jdbc.update("DELETE FROM tb_sys_adt_log WHERE dmnd_idntfr=?", context.requestId());
    }

    @Test
    void attemptSurvivesAnOuterBusinessRollbackAndDoesNotClaimSuccess() {
        var transaction = new TransactionTemplate(transactionManager);
        assertThatThrownBy(() -> transaction.executeWithoutResult(status -> {
            audit.attempted(context);
            throw new IllegalStateException("business aborted");
        })).isInstanceOf(IllegalStateException.class);
        assertThat(stages()).containsExactly("ATTEMPTED");
        assertThat(privacyCount()).isZero();
    }

    @Test
    void projectionFailureRollsBackPreparationButKeepsDurableAttempt() {
        audit.attempted(context);
        doThrow(new IllegalStateException("projection storage unavailable")).when(privacy).saveAndFlush(any(PrivacyLog.class));
        assertThatThrownBy(() -> audit.prepared(context)).isInstanceOf(BusinessException.class);
        assertThat(stages()).containsExactly("ATTEMPTED");
        assertThat(privacyCount()).isZero();
    }

    @Test
    void preparedWithoutTerminalRecordRemainsExplicitlyUnresolved() {
        audit.attempted(context);
        audit.prepared(context);
        assertThat(stages()).containsExactly("ATTEMPTED", "PREPARED");
        assertThat(privacyCount()).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT inq_info FROM tb_privacy_log WHERE dmnd_user_id=?", String.class,
                context.actorLoginId())).startsWith("[PREPARED]");
    }

    @Test
    void deniedAttemptIsDurableWithoutPrivacyPreparation() {
        audit.attempted(context);
        audit.completed(context, SensitiveAuditPort.Outcome.DENIED, 403);
        assertThat(stages()).containsExactly("ATTEMPTED", "DENIED");
        assertThat(privacyCount()).isZero();
    }

    @Test
    void mutationAuditRequiresTheExistingBusinessTransaction() {
        assertThatThrownBy(() -> audit.recordMutation("TEST_MUTATION", "fixture-target"))
                .isInstanceOf(IllegalTransactionStateException.class);
    }

    private java.util.List<String> stages() {
        return jdbc.queryForList("SELECT prcs_stts_nm FROM tb_sys_adt_log WHERE dmnd_idntfr=? ORDER BY log_sn",
                String.class, context.requestId());
    }

    private int privacyCount() {
        return jdbc.queryForObject("SELECT count(*) FROM tb_privacy_log WHERE dmnd_user_id=?", Integer.class, context.actorLoginId());
    }
}
