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
 * V2_116 이 Q&A '답변 대기' 값 QA01 만 OPEN 으로 바꾸고 다른 상태와 행은 그대로 두는지 본다.
 *
 * <p>[왜 필요한가] 같은 '답변 대기' 가 OPEN·QA01 두 값으로 저장돼 '미해결만' 조건을 하나의 등치로 걸 수 없었다.
 * 해결(SOLVED)이나 모르는 값까지 OPEN 으로 덮으면 해결된 질문이 다시 열린다.
 *
 * <p>[왜 별도 클래스인가] V2 체인의 이력 검증이다. 투영본은 V2 체인을 V1 번들로 바꾸므로 생성기가
 * {@code *MigrationIntegrationTest} 를 제거한다.
 */
@Tag("schema-validation")
@DisplayName("V2_116 Q&A 답변 대기 상태 값 정규화")
class QnaOpenStatusNormalizeMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {

    private static final String BOARD_ID = "BBSMSTR_V2116TEST01";

    @Test
    @DisplayName("QA01 만 OPEN 으로 바꾸고 SOLVED·모르는 값·행 수는 그대로 둔다")
    void normalizesOnlyLegacyOpenCode() throws Exception {
        AuthorizationCutoverTestSupport.migrate(flyway(MigrationVersion.fromVersion("2.115")));

        try (var c = openConnection(); var s = c.createStatement()) {
            s.executeUpdate("INSERT INTO tb_bbs_master"
                    + " (bbs_id, bbs_ttl, bbs_type_cd, bbs_atrb_cd, atch_psblty_file_qty, file_atch_psblty_yn, use_yn)"
                    + " VALUES ('" + BOARD_ID + "', '상태 정규화 검증', 'BBST01', 'BBSA02', 0, 'N', 'Y')");
            s.executeUpdate("INSERT INTO tb_bbs_item (bbs_id, pst_ttl, pst_cn, use_yn, sort_ordr, crt_dt, qna_stts_cd)"
                    + " VALUES ('" + BOARD_ID + "', '옛 대기', '본문', 'Y', 1, CURRENT_TIMESTAMP, 'QA01'),"
                    + " ('" + BOARD_ID + "', '해결', '본문', 'Y', 2, CURRENT_TIMESTAMP, 'SOLVED'),"
                    + " ('" + BOARD_ID + "', '대기', '본문', 'Y', 3, CURRENT_TIMESTAMP, 'OPEN'),"
                    + " ('" + BOARD_ID + "', '모름', '본문', 'Y', 4, CURRENT_TIMESTAMP, 'QA02')");
        }

        flyway(MigrationVersion.fromVersion("2.116")).migrate();

        try (var c = openConnection(); var s = c.createStatement()) {
            assertThat(text(s, "SELECT string_agg(qna_stts_cd, ',' ORDER BY sort_ordr) FROM tb_bbs_item"
                    + " WHERE bbs_id = '" + BOARD_ID + "'"))
                    .as("QA01 만 OPEN 이 되고 해결·모르는 값은 그대로다").isEqualTo("OPEN,SOLVED,OPEN,QA02");
            assertThat(text(s, "SELECT pst_ttl FROM tb_bbs_item WHERE bbs_id = '" + BOARD_ID + "' AND sort_ordr = 1"))
                    .isEqualTo("옛 대기");
        }
    }

    private static String text(Statement statement, String query) throws SQLException {
        try (ResultSet result = statement.executeQuery(query)) {
            assertThat(result.next()).as("질의가 행을 돌려주지 않았다: %s", query).isTrue();
            return result.getString(1);
        }
    }
}
