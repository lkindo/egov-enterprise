package nuri.api.schema;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigInteger;
import java.sql.Connection;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import javax.sql.DataSource;
import nuri.business.domain.board.BoardRepository;
import nuri.business.domain.board.DtaUseStatsRepository;
import nuri.business.domain.log.LoginLogRepository;
import nuri.business.domain.log.UserLogRepository;
import nuri.business.domain.menu.MenuRepository;
import nuri.business.domain.system.job.DurableJob;
import nuri.business.domain.system.job.DurableJobRepository;
import nuri.business.domain.user.repository.DeptManageRepository;
import nuri.business.service.file.AttachmentReferenceResolver;
import nuri.foundation.core.job.DurableWork;
import nuri.foundation.core.job.DurableWorkPort;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * 포트·HQL 로 옮긴 경로가 실제 PostgreSQL 에서 옮기기 전과 같게 도는지 본다(ADR-0047).
 *
 * <p>H2 단위 시험은 잠금 강도·{@code SKIP LOCKED}·벤더 함수를 증명하지 못한다. 그래서 진짜 저장소를 진짜 DB 에 붙여 돌린다.
 */
@Tag("schema-validation")
@SpringBootTest(properties = "nuri.durable-work.enabled=false")
@Import(AuthorizationSchemaRehearsalTestConfiguration.class)
@ActiveProfiles({"test", "tc"})
class VendorSqlPortPostgresIntegrationTest {
    private static final String BOARD = "VSQL_BOARD";
    private static final String DEPT = "VSQL_DEPT";
    private static final String JOB_TYPE = "VSQL_CLAIM";
    private static final String STATS_DAY = "2031-03-05";

    @Autowired private MenuRepository menus;
    @Autowired private DeptManageRepository departments;
    @Autowired private LoginLogRepository logins;
    @Autowired private UserLogRepository userLogs;
    @Autowired private BoardRepository boards;
    @Autowired private DtaUseStatsRepository usage;
    @Autowired private DurableJobRepository jobs;
    @Autowired private DurableWorkPort durableWork;
    @Autowired private AttachmentReferenceResolver attachments;
    @Autowired private PlatformTransactionManager manager;
    @Autowired private DataSource dataSource;
    @Autowired private JdbcTemplate jdbc;
    private TransactionTemplate transaction;
    private final List<Long> menuRows = new ArrayList<>();

    @BeforeEach
    void initialize() {
        transaction = new TransactionTemplate(manager);
        jdbc.update("INSERT INTO tb_bbs_master (bbs_id, bbs_ttl, bbs_type_cd, bbs_atrb_cd, atch_psblty_file_qty,"
                + " file_atch_psblty_yn, use_yn) VALUES (?, '이식 검증', 'BBST01', 'BBSA02', 0, 'N', 'Y')", BOARD);
        jdbc.update("INSERT INTO tb_ognz_info (ognz_id, ognz_nm) VALUES (?, '이식 검증')", DEPT);
        menuRows.add(jdbc.queryForObject("INSERT INTO tb_menu_info (menu_nm, menu_ordr, use_yn, modern_route, menu_expln)"
                + " VALUES ('이식 검증', 7, 'Y', '/vsql', '설명') RETURNING menu_sn", Long.class));
    }

    @AfterEach
    void cleanup() {
        jdbc.update("DELETE FROM tb_bbs_item WHERE bbs_id = ?", BOARD);
        jdbc.update("DELETE FROM tb_bbs_master WHERE bbs_id = ?", BOARD);
        jdbc.update("DELETE FROM tb_ognz_info WHERE ognz_id = ?", DEPT);
        jdbc.update("DELETE FROM tb_dta_use_stats WHERE bbs_id = ?", BOARD);
        jdbc.update("DELETE FROM tb_login_log WHERE crt_dt >= TIMESTAMP '2031-01-01'");
        jdbc.update("DELETE FROM tb_sys_job WHERE job_se_nm = ?", JOB_TYPE);
        jdbc.update("DELETE FROM tb_popup_info WHERE popup_ttl_nm = '이식 검증'");
        jdbc.update("DELETE FROM tb_user_log WHERE srvc_nm = 'VSQL_SERVICE'");
        menuRows.forEach(menu -> jdbc.update("DELETE FROM tb_menu_info WHERE menu_sn = ?", menu));
    }

    @Test
    @DisplayName("작업 선점은 잠긴 행을 건너뛰고 다음 행을 준다 — 기다리지 않는다")
    void claimSkipsLockedRows() throws Exception {
        enqueue();
        enqueue();
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC).plusSeconds(1);
        var executor = Executors.newSingleThreadExecutor();
        try {
            transaction.executeWithoutResult(status -> {
                BigInteger held = jobs.claimNext(now, List.of(JOB_TYPE)).orElseThrow().getJobSn();
                try {
                    Optional<BigInteger> other = executor.submit(() -> new TransactionTemplate(manager).execute(
                            inner -> jobs.claimNext(now, List.of(JOB_TYPE)).map(DurableJob::getJobSn)))
                            .get(5, TimeUnit.SECONDS);
                    assertThat(other).isPresent();
                    assertThat(other.orElseThrow()).isNotEqualTo(held);
                } catch (Exception failure) {
                    throw new AssertionError("잠긴 행을 기다렸다", failure);
                }
            });
        } finally {
            executor.shutdownNow();
        }
    }

    @Test
    @DisplayName("메뉴 잠금은 자식 FK 의 KEY SHARE 를 막지 않고 다른 쓰기는 막는다")
    void menuLockKeepsNoKeyUpdateStrength() throws SQLException {
        Long menu = menuRows.getFirst();
        assertLockStrength("tb_menu_info", "menu_sn", menu, () ->
                assertThat(menus.findParentLinksForUpdate()).anyMatch(link -> menu.equals(link.getMenuSn())));
        assertLockStrength("tb_menu_info", "menu_sn", menu, () ->
                assertThat(menus.findStructureRowsForUpdate()).anyMatch(row -> menu.equals(row.getMenuSn())));
    }

    @Test
    @DisplayName("메뉴 잠금 조회의 일곱 칸은 잠금 없는 조회와 같다")
    void lockedStructureRowsMatchPlainRows() {
        transaction.executeWithoutResult(status -> {
            var plain = menus.findStructureRows().stream().map(row -> List.of(String.valueOf(row.getMenuSn()),
                    String.valueOf(row.getUpMenuSn()), String.valueOf(row.getMenuOrdr()), String.valueOf(row.getMenuNm()),
                    String.valueOf(row.getUseYn()), String.valueOf(row.getModernRoute()), String.valueOf(row.getMenuExpln()))).toList();
            var locked = menus.findStructureRowsForUpdate().stream().map(row -> List.of(String.valueOf(row.getMenuSn()),
                    String.valueOf(row.getUpMenuSn()), String.valueOf(row.getMenuOrdr()), String.valueOf(row.getMenuNm()),
                    String.valueOf(row.getUseYn()), String.valueOf(row.getModernRoute()), String.valueOf(row.getMenuExpln()))).toList();
            assertThat(locked).isEqualTo(plain);
        });
    }

    @Test
    @DisplayName("부서 잠금도 같은 강도다")
    void departmentLockKeepsNoKeyUpdateStrength() throws SQLException {
        assertLockStrength("tb_ognz_info", "ognz_id", DEPT, () ->
                assertThat(departments.findParentLinksForUpdate()).anyMatch(link -> DEPT.equals(link.getOgnzId())));
    }

    @Test
    @DisplayName("날짜 집계는 PostgreSQL 에서 일자 문자열과 건수를 돌려주고 끝 경계를 세지 않는다")
    void dailyStatisticsCountHalfOpenRanges() {
        jdbc.update("INSERT INTO tb_bbs_item (bbs_id, pst_ttl, use_yn, crt_dt) VALUES (?, 'a', 'Y', TIMESTAMP '2031-03-05 23:59:59')", BOARD);
        jdbc.update("INSERT INTO tb_bbs_item (bbs_id, pst_ttl, use_yn, crt_dt) VALUES (?, 'b', 'N', TIMESTAMP '2031-03-05 12:00:00')", BOARD);
        jdbc.update("INSERT INTO tb_bbs_item (bbs_id, pst_ttl, use_yn, crt_dt) VALUES (?, 'c', 'Y', TIMESTAMP '2031-03-06 00:00:00')", BOARD);
        jdbc.update("INSERT INTO tb_dta_use_stats (bbs_id, file_sn, crt_dt) VALUES (?, 1, TIMESTAMP '2031-03-05 01:00:00')", BOARD);
        jdbc.update("INSERT INTO tb_login_log (err_ocrn_yn, crt_dt) VALUES ('N', TIMESTAMP '2031-03-05 23:59:59')");
        jdbc.update("INSERT INTO tb_login_log (err_ocrn_yn, crt_dt) VALUES ('Y', TIMESTAMP '2031-03-05 10:00:00')");
        jdbc.update("INSERT INTO tb_login_log (err_ocrn_yn, crt_dt) VALUES ('N', TIMESTAMP '2031-03-06 00:00:00')");

        assertSingleDay(boards.countPostsByDate("2031-03-05 00:00:00", "2031-03-06 00:00:00"));
        assertThat(boards.countPostsBetween("2031-03-05 00:00:00", "2031-03-06 00:00:00")).isEqualTo(1);
        assertSingleDay(usage.countByDate("2031-03-05 00:00:00", "2031-03-06 00:00:00"));
        assertSingleDay(logins.countLoginsByDate("20310305", "20310305"));
    }

    @Test
    @DisplayName("상단 고정은 종료일이 있든 없든 형 오류 없이 쓴다")
    void pinWritesBothBranches() {
        Long post = jdbc.queryForObject("INSERT INTO tb_bbs_item (bbs_id, pst_ttl, use_yn) VALUES (?, '고정', 'Y') RETURNING pst_sn", Long.class, BOARD);

        assertThat(boards.updatePin(BOARD, List.of(post), "Y", "20311231")).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT upend_fix_end_ymd FROM tb_bbs_item WHERE pst_sn = ?", String.class, post)).isEqualTo("20311231");
        assertThat(boards.updatePin(BOARD, List.of(post), "N", null)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT upend_fix_end_ymd FROM tb_bbs_item WHERE pst_sn = ?", String.class, post)).isNull();
    }

    @Test
    @DisplayName("활동 카운터 upsert 는 포트 문장으로 누적하고 NULL 카운터도 잇는다")
    void activityUpsertAccumulates() {
        String user = jdbc.queryForObject("SELECT esntl_id FROM tb_user_info LIMIT 1", String.class);
        userLogs.upsertActivityCounts("20310305", user, "VSQL_SERVICE", "m", 1, 0, 2, 0, 0, 1);
        jdbc.update("UPDATE tb_user_log SET crt_cnt = NULL WHERE srvc_nm = 'VSQL_SERVICE'");
        assertThat(userLogs.upsertActivityCounts("20310305", user, "VSQL_SERVICE", "m", 1, 3, 1, 1, 0, 0)).isEqualTo(1);

        assertThat(jdbc.queryForList("SELECT crt_cnt, mdfcn_cnt, inq_cnt, del_cnt, otpt_cnt, err_cnt FROM tb_user_log WHERE srvc_nm = 'VSQL_SERVICE'"))
                .singleElement().satisfies(row -> assertThat(row.values().stream().map(value -> ((Number) value).intValue()).toList())
                        .containsExactly(1, 3, 3, 1, 0, 1));
    }

    @Test
    @DisplayName("팝업 공유 근거는 그 첨부를 가리키는 팝업에만 생긴다 — 다른 첨부로 번지지 않는다")
    void popupGrantStaysOnItsAttachment() {
        jdbc.update("INSERT INTO tb_popup_info (popup_ttl_nm, file_url) VALUES ('이식 검증', '/api/v1/files/987654321')");
        jdbc.update("INSERT INTO tb_popup_info (popup_ttl_nm, file_url) VALUES ('이식 검증', '/api/v1/files/download?fileId=987654322')");

        assertThat(attachments.resolve(987654321L, null, null).sharedGrant()).isTrue();
        assertThat(attachments.resolve(987654322L, null, null).sharedGrant()).isTrue();
        assertThat(attachments.resolve(987654323L, null, null).sharedGrant()).isFalse();
    }

    private void enqueue() {
        transaction.executeWithoutResult(status ->
                durableWork.enqueue(new DurableWork(UUID.randomUUID(), JOB_TYPE, "vendor-sql-claim")));
    }

    private static void assertSingleDay(List<Object[]> rows) {
        assertThat(rows).hasSize(1);
        assertThat(rows.getFirst()[0]).isEqualTo(STATS_DAY);
        assertThat(((Number) rows.getFirst()[1]).longValue()).isEqualTo(1);
    }

    /** 잠금을 쥔 채 다른 연결로 본다. FK 검사의 KEY SHARE 는 지나가고 쓰기 잠금은 막혀야 NO KEY UPDATE 다. */
    private void assertLockStrength(String table, String key, Object id, Runnable lock) throws SQLException {
        String keyShare = "SELECT 1 FROM " + table + " WHERE " + key + " = ? FOR KEY SHARE";
        String update = "SELECT 1 FROM " + table + " WHERE " + key + " = ? FOR UPDATE";
        transaction.executeWithoutResult(status -> {
            lock.run();
            try (Connection other = dataSource.getConnection()) {
                other.setAutoCommit(false);
                try (var timeout = other.createStatement()) {
                    timeout.execute("SET LOCAL lock_timeout = '300ms'");
                }
                try (var share = other.prepareStatement(keyShare)) {
                    share.setObject(1, id);
                    assertThat(share.executeQuery().next()).isTrue();
                }
                assertThatThrownBy(() -> {
                    try (var strong = other.prepareStatement(update)) {
                        strong.setObject(1, id);
                        strong.executeQuery();
                    }
                }).isInstanceOf(SQLException.class).hasMessageContaining("lock");
                other.rollback();
            } catch (SQLException failure) {
                throw new AssertionError(failure);
            }
        });
    }
}
