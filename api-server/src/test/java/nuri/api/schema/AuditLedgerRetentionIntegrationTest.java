package nuri.api.schema;

import nuri.business.domain.log.PrivacyLogRepository;
import nuri.business.domain.log.SensitiveAuditLogRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 감사 원장 보호(V2_132) 아래에서 실제 보존 정리 코드가 계속 돌고, 그 밖의 수정·삭제는 DB 가 거부하는지 실제 PostgreSQL 로 본다.
 *
 * <p>[왜 필요한가] 트리거가 DELETE 를 막으므로, 보존 정리 저장소가 삭제 선언을 같은 트랜잭션에서 하지 않으면 보존 기간이 지난 접근
 * 기록이 영영 지워지지 않는다(매일 04:00 정리가 조용히 실패한다). 반대로 그 선언이 다른 경로로 새면 보호가 사라진다. 저장소의 실제
 * 정리 메서드({@code PrivacyLogRepository#deleteOldLogs}·{@code SensitiveAuditLogRepository#deleteBefore} — LogRetentionScheduler
 * 가 부르는 그것)로 만료 행은 지워지고 기간 안의 행은 남는지, 같은 행을 앱 계정의 임의 SQL 로는 고치거나 지울 수 없는지 함께 고정한다.
 */
@Tag("schema-validation")
@SpringBootTest
@Import(AuthorizationSchemaRehearsalTestConfiguration.class)
@ActiveProfiles({"test", "tc"})
@DisplayName("감사 원장 보존 정리와 수정·삭제 차단 (PostgreSQL)")
class AuditLedgerRetentionIntegrationTest {

    private static final int RETENTION_MONTHS = 24;

    @Autowired private JdbcTemplate jdbc;
    @Autowired private PrivacyLogRepository privacyLogs;
    @Autowired private SensitiveAuditLogRepository sensitiveAuditLogs;

    private String suffix;

    @BeforeEach
    void seedExpiredAndCurrentRows() {
        suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        LocalDateTime expired = LocalDateTime.now().minusMonths(RETENTION_MONTHS + 6);
        LocalDateTime current = LocalDateTime.now().minusDays(1);
        jdbc.update("INSERT INTO tb_privacy_log (dmnd_id, inq_dt, dmnd_user_id) VALUES (?, ?, 'retention')", "RX" + suffix, expired);
        jdbc.update("INSERT INTO tb_privacy_log (dmnd_id, inq_dt, dmnd_user_id) VALUES (?, ?, 'retention')", "RC" + suffix, current);
        String audit = "INSERT INTO tb_sys_adt_log (dmnd_idntfr, prcs_stts_nm, job_nm, adt_cn, adt_dt, frst_rgtr_id, crt_dt)"
                + " VALUES (?, 'ATTEMPTED', 'RETENTION_TEST', '{}', ?, 'SYSTEM', ?)";
        jdbc.update(audit, "RX" + suffix, expired, expired);
        jdbc.update(audit, "RC" + suffix, current, current);
    }

    @AfterEach
    void removeOwnRows() {
        AuditLedgerFixtures.delete(jdbc, "DELETE FROM tb_privacy_log WHERE dmnd_id IN (?, ?)", "RX" + suffix, "RC" + suffix);
        AuditLedgerFixtures.delete(jdbc, "DELETE FROM tb_sys_adt_log WHERE dmnd_idntfr IN (?, ?)", "RX" + suffix, "RC" + suffix);
    }

    @Test
    @DisplayName("앱 계정의 임의 수정·삭제는 거부된다")
    void adHocModificationIsRejected() {
        assertThatThrownBy(() -> jdbc.update("UPDATE tb_privacy_log SET inq_info = 'tampered' WHERE dmnd_id = ?", "RC" + suffix))
                .isInstanceOf(DataAccessException.class).rootCause().hasMessageContaining("append-only");
        assertThatThrownBy(() -> jdbc.update("DELETE FROM tb_privacy_log WHERE dmnd_id = ?", "RC" + suffix))
                .isInstanceOf(DataAccessException.class).rootCause().hasMessageContaining("append-only");
        assertThatThrownBy(() -> jdbc.update("UPDATE tb_sys_adt_log SET adt_cn = 'tampered' WHERE dmnd_idntfr = ?", "RC" + suffix))
                .isInstanceOf(DataAccessException.class).rootCause().hasMessageContaining("append-only");
        assertThatThrownBy(() -> jdbc.update("DELETE FROM tb_sys_adt_log WHERE dmnd_idntfr = ?", "RC" + suffix))
                .isInstanceOf(DataAccessException.class).rootCause().hasMessageContaining("append-only");
        assertThat(privacyRows("RC" + suffix)).isEqualTo(1);
        assertThat(auditRows("RC" + suffix)).isEqualTo(1);
    }

    @Test
    @DisplayName("보존 정리는 만료 행을 지우고 기간 안의 행은 남긴다 — 선언은 그 정리 트랜잭션 밖으로 새지 않는다")
    void retentionStillPurgesExpiredRows() {
        privacyLogs.deleteOldLogs(RETENTION_MONTHS);
        int purged = sensitiveAuditLogs.deleteBefore(LocalDateTime.now().minusMonths(RETENTION_MONTHS));

        assertThat(privacyRows("RX" + suffix)).as("만료 접근 기록이 지워지지 않았다").isZero();
        assertThat(privacyRows("RC" + suffix)).as("기간 안의 접근 기록이 지워졌다").isEqualTo(1);
        assertThat(purged).as("만료 감사 행이 지워지지 않았다").isGreaterThanOrEqualTo(1);
        assertThat(auditRows("RX" + suffix)).isZero();
        assertThat(auditRows("RC" + suffix)).isEqualTo(1);

        assertThatThrownBy(() -> jdbc.update("DELETE FROM tb_privacy_log WHERE dmnd_id = ?", "RC" + suffix))
                .as("정리 트랜잭션의 삭제 선언이 연결 풀을 타고 다른 요청에 남았다")
                .isInstanceOf(DataAccessException.class).rootCause().hasMessageContaining("append-only");
    }

    private long privacyRows(String dmndId) {
        Long rows = jdbc.queryForObject("SELECT count(*) FROM tb_privacy_log WHERE dmnd_id = ?", Long.class, dmndId);
        return rows == null ? 0 : rows;
    }

    private long auditRows(String requestId) {
        Long rows = jdbc.queryForObject("SELECT count(*) FROM tb_sys_adt_log WHERE dmnd_idntfr = ?", Long.class, requestId);
        return rows == null ? 0 : rows;
    }
}
