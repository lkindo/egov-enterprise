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
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import javax.sql.DataSource;
import nuri.business.domain.log.LoginLogRepository;
import nuri.business.domain.log.UserLogRepository;
import nuri.business.domain.menu.MenuRepository;
import nuri.business.domain.system.job.DurableJob;
import nuri.business.domain.system.job.DurableJobRepository;
import nuri.business.domain.user.repository.DeptManageRepository;
import nuri.foundation.core.job.DurableWork;
import nuri.foundation.core.job.DurableWorkPort;
import org.hibernate.resource.jdbc.spi.StatementInspector;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.hibernate.autoconfigure.HibernatePropertiesCustomizer;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
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
@Import({AuthorizationSchemaRehearsalTestConfiguration.class, VendorSqlPortPostgresIntegrationTest.CaptureTestConfiguration.class})
@ActiveProfiles({"test", "tc"})
class VendorSqlPortPostgresIntegrationTest {
    /** Hibernate 가 실제로 보낸 문장을 읽는다. 손으로 쓴 SQL 로 대조하면 HQL 과 어긋나도 모른다. */
    public static class CapturedSql implements StatementInspector {
        final List<String> statements = new CopyOnWriteArrayList<>();

        @Override
        public String inspect(String sql) {
            statements.add(sql);
            return sql;
        }
    }

    @TestConfiguration(proxyBeanMethods = false)
    public static class CaptureTestConfiguration {
        @Bean
        CapturedSql capturedSql() {
            return new CapturedSql();
        }

        @Bean
        HibernatePropertiesCustomizer captureStatements(CapturedSql collector) {
            return properties -> properties.put("hibernate.session_factory.statement_inspector", collector);
        }
    }

    private static final String DEPT = "VSQL_DEPT";
    private static final String JOB_TYPE = "VSQL_CLAIM";

    @Autowired private MenuRepository menus;
    @Autowired private DeptManageRepository departments;
    @Autowired private LoginLogRepository logins;
    @Autowired private UserLogRepository userLogs;
    @Autowired private DurableJobRepository jobs;
    @Autowired private DurableWorkPort durableWork;
    @Autowired private PlatformTransactionManager manager;
    @Autowired private DataSource dataSource;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private CapturedSql capturedSql;
    private TransactionTemplate transaction;
    private final List<Long> menuRows = new ArrayList<>();

    @BeforeEach
    void initialize() {
        transaction = new TransactionTemplate(manager);
        jdbc.update("INSERT INTO tb_ognz_info (ognz_id, ognz_nm) VALUES (?, '이식 검증')", DEPT);
        menuRows.add(jdbc.queryForObject("INSERT INTO tb_menu_info (menu_nm, menu_ordr, use_yn, modern_route, menu_expln)"
                + " VALUES ('이식 검증', 7, 'Y', '/vsql', '설명') RETURNING menu_sn", Long.class));
    }

    @AfterEach
    void cleanup() {
        jdbc.update("DELETE FROM tb_ognz_info WHERE ognz_id = ?", DEPT);
        jdbc.update("DELETE FROM tb_login_log WHERE crt_dt >= TIMESTAMP '2031-01-01'");
        jdbc.update("DELETE FROM tb_sys_job WHERE job_se_nm = ?", JOB_TYPE);
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
    @DisplayName("작업 선점은 Hibernate 가 FOR NO KEY UPDATE 로 만들지만, 이 표를 가리키는 FK 가 없어 FOR UPDATE 와 결과가 같다")
    void claimLockStaysEquivalentToForUpdate() {
        capturedSql.statements.clear();
        transaction.executeWithoutResult(status -> jobs.claimNext(LocalDateTime.now(ZoneOffset.UTC), List.of(JOB_TYPE)));

        assertThat(capturedSql.statements).filteredOn(sql -> sql.contains("tb_sys_job")).singleElement().asString()
                .containsIgnoringCase("for no key update").containsIgnoringCase("skip locked");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM pg_constraint WHERE contype = 'f'"
                + " AND confrelid = 'tb_sys_job'::regclass", Long.class))
                .as("이 표를 가리키는 FK 가 생기면 KEY SHARE 를 쥔 행이 선점되므로 잠금 강도를 다시 정한다").isZero();
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
    @DisplayName("로그인 집계는 성공만 세고, 시작일 0시와 종료일 마지막 소수초를 포함하며 앞뒤 날짜를 뺀다")
    void loginCountsKeepOnlySuccessesThroughTheEndDay() {
        jdbc.update("""
                INSERT INTO tb_login_log(err_ocrn_yn,crt_dt) VALUES
                  ('N',timestamp '2099-09-01 00:00:00'),
                  ('N',timestamp '2099-09-02 23:59:59.999999'),
                  ('Y',timestamp '2099-09-01 12:00:00'),
                  (NULL,timestamp '2099-09-01 13:00:00'),
                  ('N',timestamp '2099-08-31 23:59:59.999999'),
                  ('N',timestamp '2099-09-03 00:00:00')
                """);

        List<Object[]> rows = logins.countLoginsByDate("20990901", "20990902");

        assertThat(rows).hasSize(2);
        assertThat(rows.get(0)[0]).isEqualTo("2099-09-01");
        assertThat(((Number) rows.get(0)[1]).longValue()).as("성공 로그인만 집계하며 실패·미상 시도를 제외한다").isEqualTo(1);
        assertThat(rows.get(1)[0]).isEqualTo("2099-09-02");
        assertThat(((Number) rows.get(1)[1]).longValue()).as("종료일 마지막 소수초를 포함한다").isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_login_log WHERE crt_dt >= timestamp '2099-09-01'"
                + " AND crt_dt < timestamp '2099-09-03'", Long.class)).as("실패·미상 시도 원본 이력을 지우지 않는다").isEqualTo(4);
    }

    @Test
    @DisplayName("로그인 집계 문장은 작성일 인덱스를 쓸 수 있다 — 컬럼을 문자열로 바꿔 비교하지 않는다")
    void loginCountsCanUseTheCreatedAtIndex() {
        capturedSql.statements.clear();
        logins.countLoginsByDate("20260101", "20260102");
        String generated = capturedSql.statements.stream().filter(sql -> sql.contains("tb_login_log")).findFirst().orElseThrow();
        String bound = generated.replaceFirst("\\?", "timestamp '2026-01-01'").replaceFirst("\\?", "timestamp '2026-01-03'");

        transaction.executeWithoutResult(status -> {
            jdbc.execute("SET LOCAL enable_seqscan = off");
            assertThat(String.join("\n", jdbc.queryForList("EXPLAIN " + bound, String.class))).contains("ix_tb_login_log_crt_dt");
        });
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

    private void enqueue() {
        transaction.executeWithoutResult(status ->
                durableWork.enqueue(new DurableWork(UUID.randomUUID(), JOB_TYPE, "vendor-sql-claim")));
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
