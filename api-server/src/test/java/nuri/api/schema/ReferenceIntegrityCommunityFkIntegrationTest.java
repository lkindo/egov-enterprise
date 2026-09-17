package nuri.api.schema;

import jakarta.persistence.Table;
import nuri.business.domain.board.BoardMaster;
import nuri.business.domain.system.content.community.Community;
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
 * V2_102 의 게시판 → 커뮤니티 귀속 FK. <b>두 pack 이 모두 있는 프로필에서만</b> 성립한다.
 *
 * <p>[왜 별도 클래스인가] 이 축은 자식 {@code tb_bbs_master}(collaboration)와 부모
 * {@code tb_cmnty_info}(demo)가 함께 있어야 존재한다. core 에는 게시판 테이블이 아예 없고,
 * collaboration 에는 게시판은 있지만 커뮤니티가 없어 제약이 만들어질 수 없다 — 실제로 PR #683
 * 첫 CI 에서 core 는 {@code tb_bbs_master} 조회가 PSQLException 으로, collaboration 은 없는 제약
 * 요구가 AssertionError 로 죽었다. 나머지 3축은 core 소유라
 * {@link ReferenceIntegrityFkIntegrationTest} 가 모든 프로필에서 계속 본다.
 *
 * <p>[어떻게 함께 사라지는가] 표 이름을 문자열로 적지 않고 두 엔티티의 {@code @Table} 에서 읽는다.
 * 그래서 어느 한쪽 pack 이 빠지면 이 클래스도 타입 참조를 따라 투영에서 제거된다 — 남아서 없는
 * 테이블을 조회하는 일이 구조적으로 불가능하다(DEC-OPS-085 와 같은 방식). 문자열로 적으면 생성기가
 * 의존을 볼 수 없어 그대로 살아남는다.
 */
@Tag("schema-validation")
@DisplayName("게시판 커뮤니티 귀속의 물리 FK (게시판·커뮤니티 pack 동시 보유 프로필)")
class ReferenceIntegrityCommunityFkIntegrationTest extends SharedPostgresMigrationTestSupport {

    private static final String BOARD_TABLE = tableName(BoardMaster.class);
    private static final String COMMUNITY_TABLE = tableName(Community.class);

    @Test
    @DisplayName("커뮤니티 귀속 FK가 검증되고 존재하지 않는 커뮤니티 귀속을 차단한다")
    void validatesCommunityOwnershipAndRejectsOrphans() throws SQLException {
        migrateThroughAuthorizationCutover();

        try (Connection connection = openConnection();
             Statement statement = connection.createStatement()) {
            assertThat(BOARD_TABLE).isEqualTo("tb_bbs_master");
            assertThat(COMMUNITY_TABLE).isEqualTo("tb_cmnty_info");

            assertThat(constraintValidated(statement, "fk_tb_bbs_master_tb_cmnty_info")).isTrue();
            assertThat(indexExists(statement, "ix_tb_bbs_master_cmnty_sn")).isTrue();

            assertThatThrownBy(() -> statement.executeUpdate(
                    "INSERT INTO " + BOARD_TABLE
                            + " (bbs_id, bbs_ttl, bbs_type_cd, bbs_atrb_cd, use_yn,"
                            + "  file_atch_psblty_yn, atch_psblty_file_qty, cmnty_sn)"
                            + " VALUES ('T_FK_BBS', '시험 게시판', 'BBST01', 'BBSA01', 'Y', 'N', 0, 987654321)"))
                    .isInstanceOf(SQLException.class)
                    .hasMessageContaining("fk_tb_bbs_master_tb_cmnty_info");
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
            assertThat(foreignKeyColumns(statement, BOARD_TABLE))
                    .contains("cmnty_sn")
                    .doesNotContain("tmplt_id");
        }
    }

    private static String tableName(Class<?> entity) {
        Table table = entity.getAnnotation(Table.class);
        assertThat(table).as("%s 에 @Table 이 없습니다", entity.getSimpleName()).isNotNull();
        return table.name();
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
