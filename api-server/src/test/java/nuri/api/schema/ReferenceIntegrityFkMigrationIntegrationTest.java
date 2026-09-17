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
 * V2_102 가 기존 <b>빈 문자열</b> 부모를 NULL 로 정규화한 뒤에야 FK 를 검증하는지 본다.
 *
 * <p>[왜 필요한가] 화면은 "부모 없음" 을 빈 문자열로 보내 왔다 — 사용자 등록 폼의
 * {@code <option value="">소속 없음</option>}, 행정구역 등록 폼의 {@code upAdmdstCd} 기본값이 그렇다.
 * 빈 문자열은 NULL 이 아니므로 FK 에게는 <b>존재하지 않는 부모를 가리키는 고아</b>다. 정규화가
 * 빠지면 두 가지가 한꺼번에 일어난다 — 그런 행이 있는 환경에서는 VALIDATE 가 건너뛰어져 제약이
 * 영원히 NOT VALID 로 남고, 앱은 그 순간부터 소속 없는 사용자를 등록하지 못한다.
 *
 * <p>[왜 별도 클래스인가] 이것은 V2 체인의 <b>이력</b> 검증이다. 투영본은 V2 체인을 V1 번들로
 * 바꾸므로 {@code *MigrationIntegrationTest} 는 생성기가 제거한다. 현재 스키마 계약은
 * {@link ReferenceIntegrityFkIntegrationTest} 가 따로 본다.
 */
@Tag("schema-validation")
@DisplayName("V2_102 참조 FK 마이그레이션 — 빈 문자열 부모 정규화")
class ReferenceIntegrityFkMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {

    @Test
    @DisplayName("빈 문자열 부모를 NULL 로 정규화한 뒤 네 FK를 모두 검증한다")
    void normalizesBlankParentsThenValidatesConstraints() throws Exception {
        flyway(MigrationVersion.fromVersion("2.99")).migrate();

        // V2_102 이전의 실제 쓰기 결과 — 화면이 보낸 빈 문자열이 그대로 저장된 상태다.
        try (var connection = openConnection(); var statement = connection.createStatement()) {
            statement.executeUpdate(
                    "INSERT INTO tb_ognz_info (ognz_id, ognz_nm, up_ognz_id)"
                            + " VALUES ('T_BLANK_DEPT', '빈 상위 부서', '')");
            statement.executeUpdate(
                    "INSERT INTO tb_user_info (esntl_id, user_id, pswd, user_nm, sbscrb_ymd, ognz_id)"
                            + " VALUES ('T_BLANK_USER', 't_blank_user', 'x', '빈 소속 사용자', '20260917', '')");
            statement.executeUpdate(
                    "INSERT INTO tb_admdst_cd (admdst_cd, admdst_zone_nm, up_admdst_cd)"
                            + " VALUES ('T_BLANK_ADM', '빈 상위 구역', '')");
        }

        migrateThroughAuthorizationCutover();

        try (var connection = openConnection(); var statement = connection.createStatement()) {
            assertThat(scalar(statement,
                    "SELECT up_ognz_id IS NULL FROM tb_ognz_info WHERE ognz_id='T_BLANK_DEPT'"))
                    .as("빈 상위 부서가 NULL 로 정규화되지 않았다").isTrue();
            assertThat(scalar(statement,
                    "SELECT ognz_id IS NULL FROM tb_user_info WHERE esntl_id='T_BLANK_USER'"))
                    .as("빈 소속이 NULL 로 정규화되지 않았다").isTrue();
            assertThat(scalar(statement,
                    "SELECT up_admdst_cd IS NULL FROM tb_admdst_cd WHERE admdst_cd='T_BLANK_ADM'"))
                    .as("빈 상위 구역이 NULL 로 정규화되지 않았다").isTrue();

            // 정규화가 빠지면 그 행들이 고아로 남아 VALIDATE 가 건너뛰어진다 — 제약이 NOT VALID 로 남는다.
            assertThat(scalar(statement,
                    "SELECT bool_and(convalidated) FROM pg_constraint WHERE conname IN ("
                            + "'fk_tb_user_info_tb_ognz_info', 'fk_tb_ognz_info_up_ognz_id',"
                            + " 'fk_tb_admdst_cd_up_admdst_cd', 'fk_tb_bbs_master_tb_cmnty_info')"))
                    .as("빈 문자열 부모가 남아 있으면 VALIDATE 가 건너뛰어진다").isTrue();
        }
    }

    private boolean scalar(Statement statement, String query) throws SQLException {
        try (ResultSet result = statement.executeQuery(query)) {
            assertThat(result.next()).as("질의가 행을 돌려주지 않았다: %s", query).isTrue();
            return result.getBoolean(1);
        }
    }
}
