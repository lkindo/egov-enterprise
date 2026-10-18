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
 * V2_130 이 집행 지점 없는 기능 권한(INFORMAL_* 10개, INST_CODE_CREATE·UPDATE·DELETE)의 배정을 지우고 지운 만큼 변경 이력을
 * 남기는지, 같은 기능의 남는 권한과 다른 그룹 배정은 건드리지 않는지 본다.
 *
 * <p>[왜 필요한가] 두 묶음은 원장에서 걷혔다(ADR-0034). 기존 DB 에 배정이 남으면 권한 스냅샷이 원장에 없는 코드를 만나
 * fail-closed 로 실패하고, 권한 관리 화면이 그룹의 전체 배정을 저장할 때 '알 수 없는 기능 권한' 으로 거부한다.
 * 운영 중인 DB 에는 V2_99 가 넣은 배정뿐 아니라 종전 반복 시드가 세 그룹에 넣은 배정도 있으므로 그 상태를 만든 뒤 올린다.
 * 반대로 결재 화면이 쓰는 APPROVAL_* 와 기관코드 조회·수신 반영(INST_CODE_READ·IMPORT)을 함께 지우면 화면이 닫히므로 대조군으로 본다.
 *
 * <p>[왜 별도 클래스인가] V2 체인의 이력 검증이다. 투영본은 V2 체인을 V1 번들로 바꾸므로 생성기가
 * {@code *MigrationIntegrationTest} 를 제거한다.
 */
@Tag("schema-validation")
@DisplayName("V2_130 집행 지점 없는 권한 배정 퇴역")
class UnenforcedPermissionGrantRetirementMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {

    private static final String INFORMAL_CODES = "('INFORMAL_APPROVE', 'INFORMAL_APPR_ADMIN', 'INFORMAL_CREATE',"
            + " 'INFORMAL_CREATE_ALL', 'INFORMAL_DELETE', 'INFORMAL_DELETE_ALL', 'INFORMAL_READ', 'INFORMAL_READ_ALL',"
            + " 'INFORMAL_UPDATE', 'INFORMAL_UPDATE_ALL')";
    private static final String INST_CODE_WRITE_CODES = "('INST_CODE_CREATE', 'INST_CODE_DELETE', 'INST_CODE_UPDATE')";
    /** 같은 기능에서 남는 권한 — 지우면 결재 화면·기관코드 화면이 닫힌다. */
    private static final String KEPT_CODES = "('APPROVAL_READ', 'APPROVAL_CREATE', 'INST_CODE_READ', 'INST_CODE_IMPORT')";

    @Test
    @DisplayName("세 그룹의 비공식결재 배정과 두 그룹의 기관코드 쓰기 배정을 지우고 지운 행마다 REMOVE 이력을 남긴다")
    void removesUnenforcedGrantsAndAuditsEachRow() throws Exception {
        AuthorizationCutoverTestSupport.migrate(flyway(MigrationVersion.fromVersion("2.129")));

        long informal;
        long instCodeWrites;
        long kept;
        long auditsBefore;
        try (var connection = openConnection(); var statement = connection.createStatement()) {
            // 종전 반복 시드가 넣던 배정을 재현한다(기본 그룹 그대로). V2_99 가 이미 넣은 행은 건너뛴다.
            seed(statement, "('ROLE_ADMIN'), ('ROLE_SYSTEM')", "('INFORMAL_APPROVE'), ('INFORMAL_APPR_ADMIN'),"
                    + " ('INFORMAL_CREATE'), ('INFORMAL_CREATE_ALL'), ('INFORMAL_DELETE'), ('INFORMAL_DELETE_ALL'),"
                    + " ('INFORMAL_READ'), ('INFORMAL_READ_ALL'), ('INFORMAL_UPDATE'), ('INFORMAL_UPDATE_ALL'),"
                    + " ('INST_CODE_CREATE'), ('INST_CODE_DELETE'), ('INST_CODE_UPDATE'),"
                    + " ('INST_CODE_READ'), ('INST_CODE_IMPORT'), ('APPROVAL_READ'), ('APPROVAL_CREATE')");
            seed(statement, "('ROLE_USER')", "('INFORMAL_APPROVE'), ('INFORMAL_CREATE'), ('INFORMAL_DELETE'),"
                    + " ('INFORMAL_READ'), ('INFORMAL_UPDATE'), ('APPROVAL_READ'), ('APPROVAL_CREATE')");
            informal = count(statement, "SELECT count(*) FROM tb_authrt_grnt_map"
                    + " WHERE authrt_type_cd = 'OPERATION' AND authrt_grnt_cd IN " + INFORMAL_CODES);
            assertThat(informal).as("ROLE_ADMIN 10 + ROLE_SYSTEM 10 + ROLE_USER 5").isEqualTo(25);
            instCodeWrites = count(statement, "SELECT count(*) FROM tb_authrt_grnt_map"
                    + " WHERE authrt_type_cd = 'OPERATION' AND authrt_grnt_cd IN " + INST_CODE_WRITE_CODES);
            assertThat(instCodeWrites).as("두 그룹 × 세 코드").isEqualTo(6);
            kept = count(statement, "SELECT count(*) FROM tb_authrt_grnt_map"
                    + " WHERE authrt_type_cd = 'OPERATION' AND authrt_grnt_cd IN " + KEPT_CODES);
            assertThat(kept).as("대조군 배정(두 그룹 × 네 코드 + ROLE_USER 두 코드)").isEqualTo(10);
            auditsBefore = count(statement, "SELECT count(*) FROM tb_authrt_chg_hstry");
        }

        // 대상 버전을 2.130 으로 고정한다 — 아래 이력 총수 단언이 V2_130 의 효과만 세도록 뒤 버전을 섞지 않는다.
        flyway(MigrationVersion.fromVersion("2.130")).migrate();

        try (var connection = openConnection(); var statement = connection.createStatement()) {
            assertThat(count(statement, "SELECT count(*) FROM tb_authrt_grnt_map WHERE authrt_grnt_cd IN " + INFORMAL_CODES))
                    .as("비공식결재 배정이 남았다").isZero();
            assertThat(count(statement, "SELECT count(*) FROM tb_authrt_grnt_map WHERE authrt_grnt_cd IN " + INST_CODE_WRITE_CODES))
                    .as("기관코드 쓰기 배정이 남았다").isZero();
            assertThat(count(statement, "SELECT count(*) FROM tb_authrt_chg_hstry"
                    + " WHERE dmnd_idntfr = 'migration:2.130' AND chg_type_cd = 'REMOVE' AND chg_trgt_type_cd = 'GROUP_GRANT'"
                    + " AND authrt_type_cd = 'OPERATION' AND authrt_grnt_cd IN " + INFORMAL_CODES
                    + " AND authrt_cd IN ('ROLE_ADMIN', 'ROLE_SYSTEM', 'ROLE_USER') AND chg_bfr_cn = authrt_grnt_cd"
                    + " AND chg_aftr_cn IS NULL AND plcy_ver_no ~ '^[a-f0-9]{64}$'"
                    + " AND chg_rsn = 'DEC-OPS-348: 비공식결재 API 퇴역'"))
                    .as("비공식결재 — 지운 행마다 이력 한 줄").isEqualTo(informal);
            assertThat(count(statement, "SELECT count(*) FROM tb_authrt_chg_hstry"
                    + " WHERE dmnd_idntfr = 'migration:2.130' AND chg_type_cd = 'REMOVE' AND chg_trgt_type_cd = 'GROUP_GRANT'"
                    + " AND authrt_type_cd = 'OPERATION' AND authrt_grnt_cd IN " + INST_CODE_WRITE_CODES
                    + " AND authrt_cd IN ('ROLE_ADMIN', 'ROLE_SYSTEM') AND chg_bfr_cn = authrt_grnt_cd"
                    + " AND chg_aftr_cn IS NULL AND plcy_ver_no ~ '^[a-f0-9]{64}$'"
                    + " AND chg_rsn = 'DEC-OPS-349: 집행 지점 없는 기관코드 쓰기 권한 퇴역'"))
                    .as("기관코드 쓰기 — 지운 행마다 이력 한 줄").isEqualTo(instCodeWrites);
            assertThat(count(statement, "SELECT count(DISTINCT plcy_ver_no) FROM tb_authrt_chg_hstry"
                    + " WHERE dmnd_idntfr = 'migration:2.130'"))
                    .as("두 묶음이 같은 원장 버전을 적는다").isEqualTo(1);
            assertThat(count(statement, "SELECT count(*) FROM tb_authrt_chg_hstry"))
                    .as("이력은 지운 행만큼만 늘어난다").isEqualTo(auditsBefore + informal + instCodeWrites);
            assertThat(count(statement, "SELECT count(*) FROM tb_authrt_grnt_map"
                    + " WHERE authrt_type_cd = 'OPERATION' AND authrt_grnt_cd IN " + KEPT_CODES))
                    .as("결재 화면·기관코드 조회·수신 반영 권한은 그대로다").isEqualTo(kept);
        }
    }

    /** 그룹 × 코드 배정을 넣는다. 이미 있는 행은 건너뛴다. */
    private static void seed(Statement statement, String groups, String codes) throws SQLException {
        statement.executeUpdate("INSERT INTO tb_authrt_grnt_map"
                + " (authrt_cd, authrt_type_cd, authrt_grnt_cd, frst_rgtr_id, crt_dt, last_mdfr_id, mdfcn_dt)"
                + " SELECT g.authrt_cd, 'OPERATION', c.code, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP"
                + " FROM (VALUES " + groups + ") g(authrt_cd)"
                + " CROSS JOIN (VALUES " + codes + ") c(code)"
                + " WHERE NOT EXISTS (SELECT 1 FROM tb_authrt_grnt_map m WHERE m.authrt_cd = g.authrt_cd"
                + " AND m.authrt_type_cd = 'OPERATION' AND m.authrt_grnt_cd = c.code)");
    }

    private long count(Statement statement, String query) throws SQLException {
        try (ResultSet result = statement.executeQuery(query)) {
            assertThat(result.next()).as("질의가 행을 돌려주지 않았다: %s", query).isTrue();
            return result.getLong(1);
        }
    }
}
