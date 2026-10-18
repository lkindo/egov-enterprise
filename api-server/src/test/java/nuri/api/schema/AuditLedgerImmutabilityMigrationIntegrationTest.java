package nuri.api.schema;

import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * V2_132 가 감사 원장 세 표(tb_sys_adt_log·tb_authrt_chg_hstry·tb_privacy_log)의 수정을 언제나, 삭제는 보존 정리 선언이 없으면
 * 거부하는지 본다.
 *
 * <p>[왜 필요한가] 세 표는 쓰는 경로가 INSERT 하나인데 DB 가 수정·삭제를 막지 않았다 — 앱 버그·잘못 쓴 관리 SQL·SQL 주입이 감사
 * 행을 바꾸거나 지워도 흔적이 남지 않는다. 반대로 보존 정리(LogRetentionScheduler)는 같은 트랜잭션에서 선언하고 지워야 계속 돈다.
 * 선언은 트랜잭션 지역이라 커밋 뒤 같은 연결의 다음 삭제는 다시 거부돼야 한다(선언이 연결 풀에 남아 번지지 않는다).
 *
 * <p>[왜 별도 클래스인가] V2 체인의 이력 검증이다. 투영본은 V2 체인을 V1 번들로 바꾸므로 생성기가
 * {@code *MigrationIntegrationTest} 를 제거한다.
 */
@Tag("schema-validation")
@DisplayName("V2_132 감사 원장 수정·삭제 차단")
class AuditLedgerImmutabilityMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {

    private static final String PERMIT = "SELECT set_config('app.audit_retention', 'on', true)";

    @Test
    @DisplayName("세 표 모두 수정은 언제나, 선언 없는 삭제는 거부하고, 같은 트랜잭션에서 선언한 보존 정리 삭제만 받는다")
    void rejectsUpdatesAndUndeclaredDeletes() throws Exception {
        AuthorizationCutoverTestSupport.migrate(flyway(MigrationVersion.fromVersion("2.131")));
        try (var connection = openConnection(); var statement = connection.createStatement()) {
            seedOneRowEach(statement);
            // V2_132 전에는 막지 않았다 — 이 시험이 빈 표나 이미 막힌 상태를 보고 통과하지 않는다.
            statement.executeUpdate("UPDATE tb_privacy_log SET inq_info = 'before-v2132' WHERE dmnd_id = 'V2132_P'");
        }

        flyway(MigrationVersion.fromVersion("2.132")).migrate();

        for (Ledger ledger : LEDGERS) {
            try (var connection = openConnection(); var statement = connection.createStatement()) {
                assertThatThrownBy(() -> statement.executeUpdate(ledger.update()))
                        .as("%s 의 수정이 통과했다", ledger.table())
                        .isInstanceOf(SQLException.class)
                        .hasMessageContaining("append-only");
                assertThatThrownBy(() -> statement.executeUpdate(ledger.delete()))
                        .as("%s 의 선언 없는 삭제가 통과했다", ledger.table())
                        .isInstanceOf(SQLException.class)
                        .hasMessageContaining("append-only");
                assertThat(number(statement, ledger.count())).as("%s 행이 남아야 한다", ledger.table()).isEqualTo(1);
            }
            try (var connection = openConnection()) {
                assertThatThrownBy(() -> inTransaction(connection, true, ledger.update()))
                        .as("%s 는 보존 정리 선언이 있어도 수정은 받지 않는다", ledger.table())
                        .isInstanceOf(SQLException.class).hasMessageContaining("append-only");
                assertThat(inTransaction(connection, true, ledger.delete()))
                        .as("%s 의 보존 정리 삭제는 같은 트랜잭션에서 선언하면 지워져야 한다", ledger.table()).isEqualTo(1);
                try (var statement = connection.createStatement()) {
                    assertThat(number(statement, ledger.count())).isZero();
                    statement.executeUpdate(ledger.reseed());
                    assertThatThrownBy(() -> statement.executeUpdate(ledger.delete()))
                            .as("%s — 선언이 커밋 뒤 같은 연결에 남아 다음 삭제를 열었다", ledger.table())
                            .isInstanceOf(SQLException.class).hasMessageContaining("append-only");
                }
            }
        }
        try (var connection = openConnection(); var statement = connection.createStatement()) {
            assertThat(number(statement, "SELECT count(*) FROM pg_trigger WHERE NOT tgisinternal"
                    + " AND tgname IN ('tr_tb_sys_adt_log_chg_prhb', 'tr_tb_authrt_chg_hstry_chg_prhb', 'tr_tb_privacy_log_chg_prhb')"))
                    .isEqualTo(3);
        }
    }

    private record Ledger(String table, String update, String delete, String count, String reseed) {}

    private static final List<Ledger> LEDGERS = List.of(
            new Ledger("tb_privacy_log",
                    "UPDATE tb_privacy_log SET inq_info = 'tampered' WHERE dmnd_id = 'V2132_P'",
                    "DELETE FROM tb_privacy_log WHERE dmnd_id = 'V2132_P'",
                    "SELECT count(*) FROM tb_privacy_log WHERE dmnd_id = 'V2132_P'",
                    "INSERT INTO tb_privacy_log (dmnd_id, inq_dt) VALUES ('V2132_P', CURRENT_TIMESTAMP)"),
            new Ledger("tb_sys_adt_log",
                    "UPDATE tb_sys_adt_log SET adt_cn = 'tampered' WHERE dmnd_idntfr = 'V2132_A'",
                    "DELETE FROM tb_sys_adt_log WHERE dmnd_idntfr = 'V2132_A'",
                    "SELECT count(*) FROM tb_sys_adt_log WHERE dmnd_idntfr = 'V2132_A'",
                    "INSERT INTO tb_sys_adt_log (dmnd_idntfr, prcs_stts_nm, job_nm, adt_cn, adt_dt, frst_rgtr_id, crt_dt)"
                            + " VALUES ('V2132_A', 'ATTEMPTED', 'V2132', '{}', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP)"),
            new Ledger("tb_authrt_chg_hstry",
                    "UPDATE tb_authrt_chg_hstry SET chg_rsn = 'tampered' WHERE dmnd_idntfr = 'V2132_H'",
                    "DELETE FROM tb_authrt_chg_hstry WHERE dmnd_idntfr = 'V2132_H'",
                    "SELECT count(*) FROM tb_authrt_chg_hstry WHERE dmnd_idntfr = 'V2132_H'",
                    "INSERT INTO tb_authrt_chg_hstry (dmnd_idntfr, plcy_ver_no, chg_trgt_type_cd, chg_type_cd, authrt_cd,"
                            + " authrt_type_cd, authrt_grnt_cd, chg_artcl_nm, chg_bfr_cn, chg_aftr_cn, chg_rsn, frst_rgtr_id, crt_dt)"
                            + " VALUES ('V2132_H', repeat('a', 64), 'GROUP_GRANT', 'ADD', 'ROLE_ADMIN', 'OPERATION', 'USER_READ',"
                            + " 'grant', NULL, 'USER_READ', 'V2_132 시험', 'SYSTEM', CURRENT_TIMESTAMP)"));

    private static void seedOneRowEach(Statement statement) throws SQLException {
        for (Ledger ledger : LEDGERS) {
            statement.executeUpdate(ledger.reseed());
        }
    }

    /** 한 트랜잭션에서(선택적으로 보존 정리를 선언하고) 문장 하나를 실행한 뒤 커밋한다. 실패하면 되돌리고 예외를 그대로 던진다. */
    private static int inTransaction(Connection connection, boolean permit, String sql) throws SQLException {
        connection.setAutoCommit(false);
        try (var statement = connection.createStatement()) {
            if (permit) {
                statement.execute(PERMIT);
            }
            int changed = statement.executeUpdate(sql);
            connection.commit();
            return changed;
        } catch (SQLException failure) {
            connection.rollback();
            throw failure;
        } finally {
            connection.setAutoCommit(true);
        }
    }

    private static long number(Statement statement, String query) throws SQLException {
        try (ResultSet result = statement.executeQuery(query)) {
            assertThat(result.next()).as("질의가 행을 돌려주지 않았다: %s", query).isTrue();
            return result.getLong(1);
        }
    }
}
