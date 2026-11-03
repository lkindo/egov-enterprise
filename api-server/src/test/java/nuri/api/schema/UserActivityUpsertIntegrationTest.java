package nuri.api.schema;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterUtils;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import nuri.business.domain.log.UserLogRepositoryImpl;

/**
 * 사용자 활동 집계 UPSERT 를 <b>실 DB</b>에서 검증한다.
 *
 * <p>[왜 통합 테스트인가] {@code UserLogRepository.upsertActivityCounts} 는 벤더 포트가 만든 네이티브 upsert 다.
 * 시험은 운영과 같은 문장을 {@link UserLogRepositoryImpl#activityUpsertSql} 에서 받는다. 단위 테스트는
 * 저장소를 목으로 대체하므로 <b>SQL 이 실제로 파싱되는지, 제약 이름이 맞는지, NULL 카운터가
 * 누적을 리셋하지 않는지를 하나도 검증하지 못한다</b> — 목만 있는 검증은 초록이면서 운영에서
 * 첫 요청에 죽는다. 이 프로젝트의 감사에서 반복 지적된 함정이라 실 DB 로 고정한다.
 *
 * <p>검증 축 다섯:
 * <ol>
 *   <li>충돌 대상 제약 {@code pk_tb_user_log} 가 실제로 존재한다</li>
 *   <li>같은 키를 두 번 쓰면 행이 하나이고 카운터가 <b>더해진다</b></li>
 *   <li>기존 카운터가 NULL 이어도 누적이 리셋되지 않는다({@code COALESCE} 축)</li>
 *   <li>없는 사용자로는 쓸 수 없다({@code fk_tb_user_log_tb_user_info}) — 집계가 미인증 요청을
 *       배제해야 하는 이유가 스키마에 실재함을 증명한다</li>
 *   <li>삭제용 사용자 잠금은 종속 활동 로그 정리 이후 새 FK 참조 생성을 막는다</li>
 * </ol>
 */
@Tag("schema-validation")
@DisplayName("사용자 활동 집계 UPSERT")
class UserActivityUpsertIntegrationTest extends SharedPostgresMigrationTestSupport {

        @Test
    @DisplayName("같은 키를 반복 적재하면 행 하나에 카운터가 누적된다")
    void accumulatesCountersOnConflict() throws SQLException {
        migrateThroughAuthorizationCutover();

        try (Connection connection = openConnection();
             Statement statement = connection.createStatement()) {

            // MySQL·MariaDB 의 upsert 는 키를 고르지 못하고 모든 유일 키에 반응하므로, 충돌 대상이 기본 키 하나뿐인지 본다.
            assertThat(VendorTestSql.upsertConflictKeys(VendorTestSql.on(connection), "tb_user_log", "pk_tb_user_log"))
                    .containsExactly("pk_tb_user_log");
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
        migrateThroughAuthorizationCutover();

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
        migrateThroughAuthorizationCutover();

        try (Connection connection = openConnection()) {
            assertThatThrownBy(() -> upsert(connection, "ANONYMOUS", 0, 0, 1, 0, 0, 0))
                    .isInstanceOf(SQLException.class)
                    .message().containsIgnoringCase("fk_tb_user_log_tb_user_info");
        }
    }

    @Test
    @DisplayName("사용자 삭제 잠금은 종속 로그 정리 이후 새 활동 FK 적재를 차단한다")
    void deletionLockBlocksLateActivityInsert() throws SQLException, ReflectiveOperationException {
        migrateThroughAuthorizationCutover();

        var deletionQuery = nuri.business.domain.user.repository.UserRepository.class
                .getMethod("lockForDeletion", String.class)
                .getAnnotation(org.springframework.data.jpa.repository.Query.class);
        assertThat(deletionQuery).isNotNull();
        assertThat(deletionQuery.nativeQuery()).isTrue();

        try (Connection deleting = openConnection();
             Connection logging = openConnection();
             Statement deletingStatement = deleting.createStatement()) {
            String esntlId = seedUser(deleting, "USRACT_DELETE", "actdelete");
            JdbcTemplate loggingJdbc = VendorTestSql.on(logging);
            boolean childWaits = VendorTestSql.foreignKeyCheckWaitsForParentLock(loggingJdbc);
            if (childWaits) {
                VendorTestSql.boundSessionLockWait(loggingJdbc);
            }
            deleting.setAutoCommit(false);
            try {
                try (PreparedStatement lock = deleting.prepareStatement(
                        deletionQuery.value().replace(":esntlId", "?"))) {
                    lock.setString(1, esntlId);
                    try (ResultSet row = lock.executeQuery()) {
                        assertThat(row.next()).isTrue();
                    }
                }
                deletingStatement.executeUpdate("DELETE FROM tb_user_log WHERE dmnd_user_id='%s'".formatted(esntlId));

                if (!childWaits) {
                    // Oracle 의 FK 검사는 부모 행 잠금을 기다리지 않는다. 늦은 로그는 들어가고 사용자 삭제가 FK 로 거부돼 고아가 남지 않는다(설계서 §6.1).
                    upsert(logging, esntlId, 0, 0, 1, 0, 0, 0);
                    assertThatThrownBy(() -> deletingStatement.executeUpdate(
                            "DELETE FROM tb_user_info WHERE esntl_id='%s'".formatted(esntlId)))
                            .isInstanceOfSatisfying(SQLException.class,
                                    failure -> assertThat(failure.getErrorCode()).isEqualTo(2292));
                    return;
                }
                // PostgreSQL 과 MySQL·MariaDB 는 FK 검사가 부모 행에 공유 잠금을 걸어, 늦은 로그가 삭제 잠금 뒤에서 기다리다 대기 상한에서 끊긴다.
                assertThatThrownBy(() -> upsert(logging, esntlId, 0, 0, 1, 0, 0, 0))
                        .isInstanceOfSatisfying(SQLException.class,
                                failure -> assertThat(VendorTestSql.isRowLockTimeout(loggingJdbc, failure))
                                        .as("행 잠금 대기 초과: %s", VendorTestSql.describe(failure)).isTrue());
                assertThat(deletingStatement.executeUpdate(
                        "DELETE FROM tb_user_info WHERE esntl_id='%s'".formatted(esntlId))).isEqualTo(1);
                deleting.commit();
            } finally {
                deleting.rollback();
            }
        }
    }

    /** 운영 문장을 이름 바인딩 그대로 실행한다. */
    private void upsert(Connection connection, String esntlId,
            int crt, int mdfcn, int inq, int del, int otpt, int err) throws SQLException {
        String sql = UserLogRepositoryImpl.activityUpsertSql(VendorTestSql.dialect(VendorTestSql.on(connection)));
        var values = new MapSqlParameterSource().addValue("ocrnYmd", "20260902").addValue("dmndUserId", esntlId)
                .addValue("srvcNm", "ThingApiController").addValue("mthdNm", "list")
                .addValue("crtCnt", crt).addValue("mdfcnCnt", mdfcn).addValue("inqCnt", inq)
                .addValue("delCnt", del).addValue("otptCnt", otpt).addValue("errCnt", err);
        var parsed = NamedParameterUtils.parseSqlStatement(sql);
        Object[] bound = NamedParameterUtils.buildValueArray(parsed, values, null);
        try (PreparedStatement ps = connection.prepareStatement(NamedParameterUtils.substituteNamedParameters(parsed, values))) {
            for (int index = 0; index < bound.length; index++) {
                ps.setObject(index + 1, bound[index]);
            }
            ps.setQueryTimeout(VendorTestSql.vendorRun() ? 2 : 0);
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

    @Override
    protected void cleanVendorFixtures(JdbcTemplate jdbc) {
        jdbc.update("DELETE FROM tb_user_log WHERE dmnd_user_id LIKE 'USRACT_%'");
        jdbc.update("DELETE FROM tb_user_info WHERE esntl_id LIKE 'USRACT_%'");
    }
}
