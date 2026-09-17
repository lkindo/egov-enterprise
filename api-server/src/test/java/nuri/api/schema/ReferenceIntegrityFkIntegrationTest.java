package nuri.api.schema;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * V2_102 가 추가한 참조 무결성 FK 중 <b>모든 재사용 프로필에 남는 core 3축</b>.
 *
 * <p>세 축 모두 종전에는 서비스 가드만 막고 DB 는 막지 않았다. 여기서 보는 것은 세 가지다 —
 * 제약이 실제로 <b>검증된(validated)</b> 상태인가, 고아 쓰기를 <b>차단</b>하는가, 그리고
 * "부모 없음" 을 뜻하는 NULL 을 <b>통과</b>시키는가. 마지막 축이 특히 중요하다: 화면은 부모 없음을
 * 빈 문자열로 보내므로, 서비스 정규화가 빠지면 소속 없는 사용자와 최상위 행정구역을 등록할 수
 * 없게 된다. 그 정규화는 각 서비스 테스트가 따로 고정하고, 여기서는 DB 쪽 계약만 본다.
 *
 * <p>⚠ 게시판 커뮤니티 귀속 축은 여기에 두지 않는다 — {@code tb_bbs_master} 는 collaboration,
 * {@code tb_cmnty_info} 는 demo 소유라 축소 프로필에는 그 테이블이 없다. 여기 두면 core 에서는
 * 없는 테이블을 조회해 죽고 collaboration 에서는 있을 수 없는 제약을 요구한다(실측: PR #683 CI).
 * 그 축은 {@link ReferenceIntegrityCommunityFkIntegrationTest} 가 두 pack 과 함께 보고 함께 사라진다.
 */
@Tag("schema-validation")
@DisplayName("부서 소속·부서 계층·행정구역 계층의 물리 FK (모든 프로필)")
class ReferenceIntegrityFkIntegrationTest extends SharedPostgresMigrationTestSupport {

    @Test
    @DisplayName("fresh schema에서는 core 3축 FK가 검증되고 신규 고아 쓰기를 차단한다")
    void validatesReferencesAndRejectsNewOrphans() throws SQLException {
        migrateThroughAuthorizationCutover();

        try (Connection connection = openConnection();
             Statement statement = connection.createStatement()) {
            assertThat(constraintValidated(statement, "fk_tb_user_info_tb_ognz_info")).isTrue();
            assertThat(constraintValidated(statement, "fk_tb_ognz_info_up_ognz_id")).isTrue();
            assertThat(constraintValidated(statement, "fk_tb_admdst_cd_up_admdst_cd")).isTrue();

            assertThat(indexExists(statement, "ix_tb_user_info_ognz_id")).isTrue();
            assertThat(indexExists(statement, "ix_tb_ognz_info_up_ognz_id")).isTrue();
            assertThat(indexExists(statement, "ix_tb_admdst_cd_up_admdst_cd")).isTrue();

            assertThatThrownBy(() -> statement.executeUpdate(
                    "INSERT INTO tb_user_info (esntl_id, user_id, pswd, user_nm, sbscrb_ymd, ognz_id)"
                            + " VALUES ('T_FK_USER', 't_fk_user', 'x', '시험 사용자', '20260917', 'NO_SUCH_DEPT')"))
                    .isInstanceOf(SQLException.class)
                    .hasMessageContaining("fk_tb_user_info_tb_ognz_info");

            assertThatThrownBy(() -> statement.executeUpdate(
                    "INSERT INTO tb_ognz_info (ognz_id, ognz_nm, up_ognz_id)"
                            + " VALUES ('T_FK_DEPT', '시험 부서', 'NO_SUCH_PARENT')"))
                    .isInstanceOf(SQLException.class)
                    .hasMessageContaining("fk_tb_ognz_info_up_ognz_id");

            assertThatThrownBy(() -> statement.executeUpdate(
                    "INSERT INTO tb_admdst_cd (admdst_cd, up_admdst_cd)"
                            + " VALUES ('T_FK_ADM', 'NO_SUCH_UP')"))
                    .isInstanceOf(SQLException.class)
                    .hasMessageContaining("fk_tb_admdst_cd_up_admdst_cd");
        }
    }

    @Test
    @DisplayName("부모 없음(NULL)은 그대로 통과한다 — 무소속 사용자와 최상위 구역을 막지 않는다")
    void allowsNullParents() throws SQLException {
        migrateThroughAuthorizationCutover();

        try (Connection connection = openConnection();
             Statement statement = connection.createStatement()) {
            // 화면이 보내는 "소속 없음"·"최상위" 는 서비스가 NULL 로 정규화해 여기까지 온다.
            statement.executeUpdate(
                    "INSERT INTO tb_ognz_info (ognz_id, ognz_nm) VALUES ('T_ROOT_DEPT', '최상위 부서')");
            // ⚠ sbscrb_ymd 를 명시하는 이유: 그 컬럼의 DEFAULT 는 varchar(8) 에 담기지 않는
            //   CURRENT_TIMESTAMP 라, 생략하면 FK 와 무관하게 "value too long" 으로 죽는다.
            //   앱은 Hibernate 가 항상 값을 실어 보내 이 결함을 만나지 않는다(이 변경의 범위 밖).
            statement.executeUpdate(
                    "INSERT INTO tb_user_info (esntl_id, user_id, pswd, user_nm, sbscrb_ymd)"
                            + " VALUES ('T_NO_DEPT', 't_no_dept', 'x', '무소속 사용자', '20260917')");
            statement.executeUpdate(
                    "INSERT INTO tb_admdst_cd (admdst_cd, admdst_zone_nm) VALUES ('T_ROOT_ADM', '서울특별시')");

            assertThat(rowExists(statement, "tb_ognz_info",
                    "ognz_id = 'T_ROOT_DEPT' AND up_ognz_id IS NULL")).isTrue();
            assertThat(rowExists(statement, "tb_user_info",
                    "esntl_id = 'T_NO_DEPT' AND ognz_id IS NULL")).isTrue();
            assertThat(rowExists(statement, "tb_admdst_cd",
                    "admdst_cd = 'T_ROOT_ADM' AND up_admdst_cd IS NULL")).isTrue();
        }
    }

    private boolean constraintValidated(Statement statement, String name) throws SQLException {
        try (ResultSet result = statement.executeQuery(
                "SELECT convalidated FROM pg_constraint WHERE conname='%s'".formatted(name))) {
            assertThat(result.next()).as("제약 %s 가 없습니다", name).isTrue();
            return result.getBoolean(1);
        }
    }

    private boolean indexExists(Statement statement, String name) throws SQLException {
        try (ResultSet result = statement.executeQuery(
                "SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='%s')"
                        .formatted(name))) {
            assertThat(result.next()).isTrue();
            return result.getBoolean(1);
        }
    }

    private boolean rowExists(Statement statement, String table, String predicate) throws SQLException {
        try (ResultSet result = statement.executeQuery(
                "SELECT EXISTS (SELECT 1 FROM %s WHERE %s)".formatted(table, predicate))) {
            assertThat(result.next()).isTrue();
            return result.getBoolean(1);
        }
    }
}
