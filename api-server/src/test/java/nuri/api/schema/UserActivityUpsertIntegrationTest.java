package nuri.api.schema;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 사용자 활동 집계 UPSERT 를 <b>실 PostgreSQL</b>에서 검증한다.
 *
 * <p>[왜 통합 테스트인가] {@code UserLogRepository.upsertActivityCounts} 는 네이티브
 * {@code INSERT ... ON CONFLICT ON CONSTRAINT pk_tb_user_log DO UPDATE} 다. 단위 테스트는
 * 저장소를 목으로 대체하므로 <b>SQL 이 실제로 파싱되는지, 제약 이름이 맞는지, NULL 카운터가
 * 누적을 리셋하지 않는지를 하나도 검증하지 못한다</b> — 목만 있는 검증은 초록이면서 운영에서
 * 첫 요청에 죽는다. 이 프로젝트의 감사에서 반복 지적된 함정이라 실 DB 로 고정한다.
 *
 * <p>검증 축 넷:
 * <ol>
 *   <li>충돌 대상 제약 {@code pk_tb_user_log} 가 실제로 존재한다</li>
 *   <li>같은 키를 두 번 쓰면 행이 하나이고 카운터가 <b>더해진다</b></li>
 *   <li>기존 카운터가 NULL 이어도 누적이 리셋되지 않는다({@code COALESCE} 축)</li>
 *   <li>없는 사용자로는 쓸 수 없다({@code fk_tb_user_log_tb_user_info}) — 집계가 미인증 요청을
 *       배제해야 하는 이유가 스키마에 실재함을 증명한다</li>
 * </ol>
 */
@Tag("schema-validation")
@DisplayName("사용자 활동 집계 UPSERT")
class UserActivityUpsertIntegrationTest extends SharedPostgresMigrationTestSupport {

    /** 프로덕션 코드({@code UserLogRepository})와 같은 문장. 갈라지면 이 테스트가 의미를 잃는다. */
    private static final String UPSERT = """
            INSERT INTO tb_user_log (
                ocrn_ymd, dmnd_user_id, srvc_nm, mthd_nm,
                crt_cnt, mdfcn_cnt, inq_cnt, del_cnt, otpt_cnt, err_cnt,
                crt_dt, mdfcn_dt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now(), now())
            ON CONFLICT ON CONSTRAINT pk_tb_user_log DO UPDATE SET
                crt_cnt   = COALESCE(tb_user_log.crt_cnt, 0)   + EXCLUDED.crt_cnt,
                mdfcn_cnt = COALESCE(tb_user_log.mdfcn_cnt, 0) + EXCLUDED.mdfcn_cnt,
                inq_cnt   = COALESCE(tb_user_log.inq_cnt, 0)   + EXCLUDED.inq_cnt,
                del_cnt   = COALESCE(tb_user_log.del_cnt, 0)   + EXCLUDED.del_cnt,
                otpt_cnt  = COALESCE(tb_user_log.otpt_cnt, 0)  + EXCLUDED.otpt_cnt,
                err_cnt   = COALESCE(tb_user_log.err_cnt, 0)   + EXCLUDED.err_cnt,
                mdfcn_dt  = now()
            """;

    @Test
    @DisplayName("같은 키를 반복 적재하면 행 하나에 카운터가 누적된다")
    void accumulatesCountersOnConflict() throws SQLException {
        flyway(null).migrate();

        try (Connection connection = openConnection();
             Statement statement = connection.createStatement()) {

            assertThat(constraintExists(statement, "pk_tb_user_log")).isTrue();
            String esntlId = seedUser(connection, "USRACT_0001", "acttester");

            upsert(connection, esntlId, 1, 0, 2, 0, 0, 1);
            upsert(connection, esntlId, 0, 3, 1, 1, 0, 0);

            assertThat(rowCount(statement, esntlId)).isEqualTo(1);
            assertThat(counters(connection, esntlId))
                    .containsExactly(1, 3, 3, 1, 0, 1);
        }
    }

    @Test
    @DisplayName("기존 카운터가 NULL 이어도 누적이 리셋되지 않는다")
    void nullCountersDoNotResetAccumulation() throws SQLException {
        flyway(null).migrate();

        try (Connection connection = openConnection()) {
            String esntlId = seedUser(connection, "USRACT_0002", "nulltester");

            // 과거 데이터를 모사한다 — 카운터 컬럼은 전부 nullable 이라 NULL 행이 존재할 수 있다.
            try (PreparedStatement seed = connection.prepareStatement("""
                    INSERT INTO tb_user_log (ocrn_ymd, dmnd_user_id, srvc_nm, mthd_nm)
                    VALUES ('20260902', ?, 'ThingApiController', 'list')
                    """)) {
                seed.setString(1, esntlId);
                seed.executeUpdate();
            }

            upsert(connection, esntlId, 0, 0, 5, 0, 0, 2);

            // COALESCE 가 없으면 NULL + 5 = NULL 이 되어 누적이 조용히 사라진다.
            assertThat(counters(connection, esntlId)).containsExactly(0, 0, 5, 0, 0, 2);
        }
    }

    @Test
    @DisplayName("존재하지 않는 사용자로는 적재할 수 없다 — 미인증 요청 배제의 근거")
    void rejectsUnknownUser() throws SQLException {
        flyway(null).migrate();

        try (Connection connection = openConnection()) {
            assertThatThrownBy(() -> upsert(connection, "ANONYMOUS", 0, 0, 1, 0, 0, 0))
                    .isInstanceOf(SQLException.class)
                    .hasMessageContaining("fk_tb_user_log_tb_user_info");
        }
    }

    private void upsert(Connection connection, String esntlId,
            int crt, int mdfcn, int inq, int del, int otpt, int err) throws SQLException {
        try (PreparedStatement ps = connection.prepareStatement(UPSERT)) {
            ps.setString(1, "20260902");
            ps.setString(2, esntlId);
            ps.setString(3, "ThingApiController");
            ps.setString(4, "list");
            ps.setInt(5, crt);
            ps.setInt(6, mdfcn);
            ps.setInt(7, inq);
            ps.setInt(8, del);
            ps.setInt(9, otpt);
            ps.setInt(10, err);
            ps.executeUpdate();
        }
    }

    /** {@code tb_user_log.dmnd_user_id} → {@code tb_user_info.esntl_id} FK 를 만족시킬 최소 사용자. */
    private String seedUser(Connection connection, String esntlId, String loginId) throws SQLException {
        // 상태는 물리 컬럼 user_stts_cd의 DB 기본값('P')에 맡긴다. 가입일자는 varchar(8)에
        // 맞는 결정적 fixture를 명시한다. 레거시 DTO 이름 emplyr_sttus_code를 SQL 컬럼으로
        // 쓰거나 sbscrb_ymd의 CURRENT_TIMESTAMP 기본값을 밟으면 실 PostgreSQL에서 즉시 실패한다.
        try (PreparedStatement ps = connection.prepareStatement("""
                INSERT INTO tb_user_info (esntl_id, user_id, user_nm, pswd, sbscrb_ymd)
                VALUES (?, ?, '활동집계 테스트', 'x', '20260902')
                """)) {
            ps.setString(1, esntlId);
            ps.setString(2, loginId);
            ps.executeUpdate();
        }
        return esntlId;
    }

    private java.util.List<Integer> counters(Connection connection, String esntlId) throws SQLException {
        try (PreparedStatement ps = connection.prepareStatement("""
                SELECT crt_cnt, mdfcn_cnt, inq_cnt, del_cnt, otpt_cnt, err_cnt
                  FROM tb_user_log WHERE dmnd_user_id = ?
                """)) {
            ps.setString(1, esntlId);
            try (ResultSet rs = ps.executeQuery()) {
                assertThat(rs.next()).isTrue();
                return java.util.List.of(
                        rs.getInt(1), rs.getInt(2), rs.getInt(3), rs.getInt(4), rs.getInt(5), rs.getInt(6));
            }
        }
    }

    private int rowCount(Statement statement, String esntlId) throws SQLException {
        try (ResultSet rs = statement.executeQuery(
                "SELECT COUNT(*) FROM tb_user_log WHERE dmnd_user_id = '%s'".formatted(esntlId))) {
            assertThat(rs.next()).isTrue();
            return rs.getInt(1);
        }
    }

    private boolean constraintExists(Statement statement, String name) throws SQLException {
        try (ResultSet rs = statement.executeQuery(
                "SELECT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='%s')".formatted(name))) {
            assertThat(rs.next()).isTrue();
            return rs.getBoolean(1);
        }
    }
}
