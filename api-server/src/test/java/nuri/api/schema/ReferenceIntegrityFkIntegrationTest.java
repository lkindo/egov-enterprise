package nuri.api.schema;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * V2_102 가 추가한 참조 무결성 FK 4축.
 *
 * <p>네 축 모두 종전에는 서비스 가드만 막고 DB 는 막지 않았다. 여기서 보는 것은 세 가지다 —
 * 제약이 실제로 <b>검증된(validated)</b> 상태인가, 고아 쓰기를 <b>차단</b>하는가, 그리고
 * "부모 없음" 을 뜻하는 NULL 을 <b>통과</b>시키는가. 마지막 축이 특히 중요하다: 화면은 부모 없음을
 * 빈 문자열로 보내므로, 서비스 정규화가 빠지면 소속 없는 사용자와 최상위 행정구역을 등록할 수
 * 없게 된다. 그 정규화는 각 서비스 테스트가 따로 고정하고, 여기서는 DB 쪽 계약만 본다.
 */
@Tag("schema-validation")
@DisplayName("부서 소속·부서 계층·행정구역 계층·게시판 커뮤니티 귀속의 물리 FK")
class ReferenceIntegrityFkIntegrationTest extends SharedPostgresMigrationTestSupport {

    @Test
    @DisplayName("fresh schema에서는 네 참조 FK가 검증되고 신규 고아 쓰기를 차단한다")
    void validatesReferencesAndRejectsNewOrphans() throws SQLException {
        migrateThroughAuthorizationCutover();

        try (Connection connection = openConnection();
             Statement statement = connection.createStatement()) {
            assertThat(constraintValidated(statement, "fk_tb_user_info_tb_ognz_info")).isTrue();
            assertThat(constraintValidated(statement, "fk_tb_ognz_info_up_ognz_id")).isTrue();
            assertThat(constraintValidated(statement, "fk_tb_admdst_cd_up_admdst_cd")).isTrue();
            assertThat(constraintValidated(statement, "fk_tb_bbs_master_tb_cmnty_info")).isTrue();

            assertThat(indexExists(statement, "ix_tb_user_info_ognz_id")).isTrue();
            assertThat(indexExists(statement, "ix_tb_ognz_info_up_ognz_id")).isTrue();
            assertThat(indexExists(statement, "ix_tb_admdst_cd_up_admdst_cd")).isTrue();
            assertThat(indexExists(statement, "ix_tb_bbs_master_cmnty_sn")).isTrue();

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

            assertThatThrownBy(() -> statement.executeUpdate(
                    "INSERT INTO tb_bbs_master"
                            + " (bbs_id, bbs_ttl, bbs_type_cd, bbs_atrb_cd, use_yn,"
                            + "  file_atch_psblty_yn, atch_psblty_file_qty, cmnty_sn)"
                            + " VALUES ('T_FK_BBS', '시험 게시판', 'BBST01', 'BBSA01', 'Y', 'N', 0, 987654321)"))
                    .isInstanceOf(SQLException.class)
                    .hasMessageContaining("fk_tb_bbs_master_tb_cmnty_info");
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

    /**
     * 템플릿 참조는 의도적으로 FK 대상이 아니다.
     *
     * <p>{@code tb_bbs_master.tmplt_id} 는 이름과 달리 템플릿 원장 참조가 아니라 프런트 레이아웃
     * 분기 키로 쓰인다 — 게시판 생성 마법사가 보내는 값은 하드코딩 상수이고 {@code tb_tmplt_info}
     * 에 행을 넣는 생산 코드가 저장소에 없다. {@code R__seed_demo.sql} 도 "tmplt_id 일부는
     * 라이브에서도 dangling" 이라 적는다. 여기에 FK 를 걸면 <b>게시판 생성이 전면 중단된다</b>.
     *
     * <p>그래서 이 단언은 "아직 안 했다" 가 아니라 <b>결정</b>을 고정한다. 그 컬럼의 의미를 먼저
     * 정하고 실제 원장을 채운 뒤에야 이 단언을 지우고 FK 를 걸 수 있다.
     */
    @Test
    @DisplayName("템플릿 참조에는 FK를 걸지 않는다 — 원장이 비어 있어 게시판 생성이 막힌다")
    void doesNotConstrainTemplateReference() throws SQLException {
        migrateThroughAuthorizationCutover();

        try (Connection connection = openConnection();
             Statement statement = connection.createStatement()) {
            assertThat(foreignKeyColumns(statement, "tb_bbs_master"))
                    .contains("cmnty_sn")
                    .doesNotContain("tmplt_id");
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

    private List<String> foreignKeyColumns(Statement statement, String table) throws SQLException {
        List<String> columns = new ArrayList<>();
        String query = ("SELECT attribute.attname"
                + "   FROM pg_constraint constraint_row"
                + "   JOIN unnest(constraint_row.conkey) AS key_column(attnum) ON TRUE"
                + "   JOIN pg_attribute attribute"
                + "     ON attribute.attrelid = constraint_row.conrelid"
                + "    AND attribute.attnum = key_column.attnum"
                + "  WHERE constraint_row.conrelid = '%s'::regclass"
                + "    AND constraint_row.contype = 'f'").formatted(table);
        try (ResultSet result = statement.executeQuery(query)) {
            while (result.next()) {
                columns.add(result.getString(1));
            }
        }
        return columns;
    }
}
