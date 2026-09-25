package nuri.api.schema;

import org.flywaydb.core.api.FlywayException;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.sql.Statement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * V2_105 가 게시글 작성일 인덱스를 원자적으로 만들고, 대시보드·통계의 기간 질의가 그 인덱스를 타는지 본다.
 *
 * <p>[왜 필요한가] 실시간 대시보드는 인스턴스마다 30초에 한 번 모든 게시판의 오늘 게시글 수를 세고,
 * 게시물 통계는 같은 범위를 날짜별로 집계한다. 인덱스가 없으면 둘 다 게시글 전체를 훑는다.
 * 질의 문장은 {@code BoardRepository#countPostsBetween}·{@code #countPostsByDate} 와 같은 조건이다.
 *
 * <p>[왜 별도 클래스인가] V2 체인의 이력 검증이다. 투영본은 V2 체인을 V1 번들로 바꾸므로 생성기가
 * {@code *MigrationIntegrationTest} 를 제거한다.
 */
@Tag("schema-validation")
@DisplayName("V2_105 게시글 작성일 인덱스")
class BoardPostDateIndexMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {

    private static final String BOARD_ID = "IDX_BOARD_DATE";
    private static final String INDEX = "ix_tb_bbs_item_crt_dt";

    @Test
    @DisplayName("잠금 경합이면 인덱스 없이 롤백되고, 적용 뒤에는 행을 보존하며 기간 질의가 인덱스를 탄다")
    void indexMigrationIsAtomicUnderContentionAndServesDateRangeQueries() throws Exception {
        AuthorizationCutoverTestSupport.migrate(flyway(MigrationVersion.fromVersion("2.104")));
        try (var c = openConnection(); var s = c.createStatement()) {
            s.executeUpdate("INSERT INTO tb_bbs_master"
                    + " (bbs_id, bbs_ttl, bbs_type_cd, bbs_atrb_cd, atch_psblty_file_qty, file_atch_psblty_yn, use_yn)"
                    + " VALUES ('" + BOARD_ID + "', '작성일 인덱스 검증', 'BBST01', 'BBSA02', 0, 'N', 'Y')");
            s.executeUpdate("INSERT INTO tb_bbs_item (bbs_id, pst_ttl, use_yn, sort_ordr, crt_dt)"
                    + " SELECT '" + BOARD_ID + "', '글 ' || n, CASE WHEN n % 5 = 0 THEN 'N' ELSE 'Y' END, n,"
                    + " timestamp '2000-01-01' + n * interval '1 day'"
                    + " FROM generate_series(1, 10000) n");
        }

        long before;
        try (var c = openConnection(); var s = c.createStatement()) {
            before = count(s, "SELECT count(*) FROM tb_bbs_item");
            c.setAutoCommit(false);
            s.execute("LOCK TABLE tb_bbs_item IN ROW EXCLUSIVE MODE");
            assertThatThrownBy(() -> flyway(MigrationVersion.fromVersion("2.105")).migrate())
                    .isInstanceOf(FlywayException.class);
            assertThat(count(s, "SELECT count(*) FROM pg_indexes WHERE indexname = '" + INDEX + "'"))
                    .as("잠금 대기가 시간 제한에 걸리면 인덱스를 남기지 않는다").isZero();
            c.rollback();
        }

        flyway(MigrationVersion.fromVersion("2.105")).migrate();
        try (var c = openConnection(); var s = c.createStatement()) {
            assertThat(count(s, "SELECT count(*) FROM tb_bbs_item")).isEqualTo(before);
            s.execute("ANALYZE tb_bbs_item");
            // 대시보드 오늘 건수(countPostsBetween)와 같은 조건
            assertPlan(s, "SELECT COUNT(*) FROM tb_bbs_item b WHERE b.use_yn = 'Y'"
                    + " AND b.crt_dt >= CAST('2026-01-01 00:00:00' AS TIMESTAMP)"
                    + " AND b.crt_dt < CAST('2026-01-02 00:00:00' AS TIMESTAMP)");
            // 게시물 통계 날짜별 집계(countPostsByDate)와 같은 조건
            assertPlan(s, "SELECT TO_CHAR(b.crt_dt, 'YYYY-MM-DD') AS statsDate, COUNT(*) AS cnt FROM tb_bbs_item b"
                    + " WHERE b.use_yn = 'Y'"
                    + " AND b.crt_dt >= CAST('2026-01-01 00:00:00' AS TIMESTAMP)"
                    + " AND b.crt_dt < CAST('2026-01-08 00:00:00' AS TIMESTAMP)"
                    + " GROUP BY TO_CHAR(b.crt_dt, 'YYYY-MM-DD') ORDER BY statsDate DESC");
        }
    }

    private static long count(Statement s, String sql) throws Exception {
        try (var r = s.executeQuery(sql)) {
            r.next();
            return r.getLong(1);
        }
    }

    private static void assertPlan(Statement s, String sql) throws Exception {
        try (var r = s.executeQuery("EXPLAIN (FORMAT JSON) " + sql)) {
            r.next();
            assertThat(r.getString(1)).as(sql).contains(INDEX);
        }
    }
}
