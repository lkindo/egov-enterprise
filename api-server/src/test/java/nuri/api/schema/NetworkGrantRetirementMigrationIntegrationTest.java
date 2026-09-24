package nuri.api.schema;

import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * V2_104 가 퇴역한 네트워크 모니터링의 기능 권한 배정을 지우고 지운 만큼 변경 이력을 남기는지 본다.
 *
 * <p>[왜 필요한가] 권한 코드 NETWORK_* 는 원장에서 걷혔다. 기존 DB 에 배정이 남으면 권한 관리 화면이
 * 그룹의 전체 배정을 저장할 때 '알 수 없는 기능 권한' 으로 거부해 관리자 그룹 권한을 고칠 수 없게 된다.
 * 운영 중인 DB 에는 V2_99 가 넣은 ROLE_ADMIN 배정뿐 아니라 종전 반복 시드가 넣은 ROLE_SYSTEM 배정도 있으므로
 * 그 상태를 만든 뒤 올린다.
 *
 * <p>[왜 별도 클래스인가] V2 체인의 이력 검증이다. 투영본은 V2 체인을 V1 번들로 바꾸므로 생성기가
 * {@code *MigrationIntegrationTest} 를 제거한다.
 */
@Tag("schema-validation")
@DisplayName("V2_104 네트워크 모니터링 권한 배정 퇴역")
class NetworkGrantRetirementMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {

    private static final String NETWORK_CODES =
            "('NETWORK_CREATE', 'NETWORK_DELETE', 'NETWORK_READ', 'NETWORK_UPDATE')";

    @Test
    @DisplayName("두 그룹의 네트워크 배정을 모두 지우고 지운 행마다 REMOVE 이력을 남긴다")
    void removesNetworkGrantsAndAuditsEachRow() throws Exception {
        AuthorizationCutoverTestSupport.migrate(flyway(MigrationVersion.fromVersion("2.103")));

        long before;
        try (var connection = openConnection(); var statement = connection.createStatement()) {
            // 종전 반복 시드가 두 그룹에 넣던 배정을 재현한다. V2_99 가 이미 넣은 행은 건너뛴다.
            statement.executeUpdate("INSERT INTO tb_authrt_grnt_map"
                    + " (authrt_cd, authrt_type_cd, authrt_grnt_cd, frst_rgtr_id, crt_dt, last_mdfr_id, mdfcn_dt)"
                    + " SELECT g.authrt_cd, 'OPERATION', c.code, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP"
                    + " FROM (VALUES ('ROLE_ADMIN'), ('ROLE_SYSTEM')) g(authrt_cd)"
                    + " CROSS JOIN (VALUES ('NETWORK_CREATE'), ('NETWORK_DELETE'), ('NETWORK_READ'), ('NETWORK_UPDATE')) c(code)"
                    + " WHERE NOT EXISTS (SELECT 1 FROM tb_authrt_grnt_map m WHERE m.authrt_cd = g.authrt_cd"
                    + " AND m.authrt_type_cd = 'OPERATION' AND m.authrt_grnt_cd = c.code)");
            before = count(statement, "SELECT count(*) FROM tb_authrt_grnt_map"
                    + " WHERE authrt_type_cd = 'OPERATION' AND authrt_grnt_cd IN " + NETWORK_CODES);
            assertThat(before).as("두 그룹 × 네 코드").isEqualTo(8);
            assertThat(count(statement, "SELECT count(*) FROM tb_authrt_grnt_map"
                    + " WHERE authrt_cd = 'ROLE_ADMIN' AND authrt_type_cd = 'OPERATION' AND authrt_grnt_cd = 'MENU_UPDATE'"))
                    .as("대조군 배정").isEqualTo(1);
        }

        flyway(null).migrate();

        try (var connection = openConnection(); var statement = connection.createStatement()) {
            assertThat(count(statement, "SELECT count(*) FROM tb_authrt_grnt_map WHERE authrt_grnt_cd IN " + NETWORK_CODES))
                    .as("네트워크 배정이 남았다").isZero();
            assertThat(count(statement, "SELECT count(*) FROM tb_authrt_chg_hstry"
                    + " WHERE dmnd_idntfr = 'migration:2.104' AND chg_type_cd = 'REMOVE' AND chg_trgt_type_cd = 'GROUP_GRANT'"
                    + " AND authrt_type_cd = 'OPERATION' AND authrt_grnt_cd IN " + NETWORK_CODES
                    + " AND plcy_ver_no ~ '^[a-f0-9]{64}$'"))
                    .as("지운 행마다 이력 한 줄").isEqualTo(before);
            assertThat(count(statement, "SELECT count(*) FROM tb_authrt_grnt_map"
                    + " WHERE authrt_cd = 'ROLE_ADMIN' AND authrt_type_cd = 'OPERATION' AND authrt_grnt_cd = 'MENU_UPDATE'"))
                    .as("다른 기능 권한은 그대로다").isEqualTo(1);
        }
    }

    private long count(Statement statement, String query) throws SQLException {
        try (ResultSet result = statement.executeQuery(query)) {
            assertThat(result.next()).as("질의가 행을 돌려주지 않았다: %s", query).isTrue();
            return result.getLong(1);
        }
    }
}
