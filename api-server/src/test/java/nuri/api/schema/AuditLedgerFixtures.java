package nuri.api.schema;

import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.Objects;

/**
 * 감사 원장(tb_privacy_log·tb_sys_adt_log·tb_authrt_chg_hstry)의 시험 픽스처 행을 지운다(2026-10-18, V2_132).
 *
 * <p>V2_132 트리거는 이 표들의 DELETE 를 같은 트랜잭션이 보존 정리를 선언했을 때만 받는다. 시험이 만든 행을 치우는 것도
 * 같은 규칙을 지나야 한다 — 한 트랜잭션에서 {@code set_config('app.audit_retention','on',true)} 로 선언한 뒤 지우고 커밋한다.
 * 선언 없이 지우면 트리거가 거부하는 것이 정상 동작이며, 이 도우미는 그 규칙을 피하는 길이 아니라 그 규칙을 쓰는 길이다.
 */
public final class AuditLedgerFixtures {

    private AuditLedgerFixtures() {
    }

    /** 감사 원장의 시험 행을 보존 정리 선언과 같은 트랜잭션에서 지운다. 지운 행 수를 돌려준다. */
    public static int delete(JdbcTemplate jdbc, String deleteSql, Object... arguments) {
        DataSource dataSource = Objects.requireNonNull(jdbc.getDataSource(), "JdbcTemplate has no DataSource");
        if (!deleteSql.stripLeading().regionMatches(true, 0, "DELETE FROM ", 0, 12)) {
            throw new IllegalArgumentException("Only fixture DELETE statements are allowed: " + deleteSql);
        }
        try (Connection connection = dataSource.getConnection()) {
            boolean autoCommit = connection.getAutoCommit();
            connection.setAutoCommit(false);
            try (var permit = connection.prepareStatement("SELECT set_config('app.audit_retention', 'on', true)");
                 PreparedStatement statement = connection.prepareStatement(deleteSql)) {
                permit.execute();
                for (int index = 0; index < arguments.length; index++) {
                    statement.setObject(index + 1, arguments[index]);
                }
                int deleted = statement.executeUpdate();
                connection.commit();
                return deleted;
            } catch (SQLException | RuntimeException failure) {
                connection.rollback();
                throw failure;
            } finally {
                connection.setAutoCommit(autoCommit);
            }
        } catch (SQLException failure) {
            throw new IllegalStateException("Audit ledger fixture cleanup failed", failure);
        }
    }
}
