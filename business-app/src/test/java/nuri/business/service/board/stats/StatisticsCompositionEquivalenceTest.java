package nuri.business.service.board.stats;

import jakarta.persistence.EntityManager;
import nuri.business.domain.log.LoginLogRepository;
import nuri.business.service.stats.ReportStatsService;
import nuri.business.service.stats.dto.SummaryStatsDto;
import nuri.business.support.PersistenceTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

/**
 * 통계 조합 동등성 고정(Phase 0c).
 *
 * <p>통계 서비스가 business-core 로, 자료 이용 집계가 게시판 패키지의 포트 구현으로 옮겨 가도 게시물·자료 이용·요약
 * 숫자가 같아야 한다. 그래서 이 테스트는 옮겨 가지 않는 이름만 쓴다 — 서비스 FQN, 두 컴포넌트 스캔 패키지, core 타입,
 * 그리고 엔티티 대신 네이티브 SQL 로 넣은 행이다.
 *
 * <p>H2 이름을 따로 두는 것은 같은 메모리 DB 를 쓰는 다른 컨텍스트가 create-drop 으로 표를 지우는 순서 의존을
 * 피하기 위해서다. 로그인 로그 질의는 PostgreSQL 전용 식을 써 H2 에서 돌지 않으므로 경계에서 막는다.
 */
@DisplayName("통계 조합 동등성 — 게시물·자료 이용·요약")
@TestPropertySource(properties = "spring.datasource.url=jdbc:h2:mem:stats_composition_testdb;DB_CLOSE_DELAY=-1")
class StatisticsCompositionEquivalenceTest extends PersistenceTestSupport {

    @TestConfiguration
    @ComponentScan({"nuri.business.service.stats", "nuri.business.service.board.stats"})
    static class StatisticsComposition {
    }

    private static final DateTimeFormatter YMD = DateTimeFormatter.ofPattern("yyyyMMdd");

    @Autowired
    private ReportStatsService reportStatsService;

    @Autowired
    private EntityManager em;

    @MockitoBean
    private LoginLogRepository loginLogRepository;

    private int nextSortOrdr = 1;

    private void insertPost(String useYn, LocalDateTime crtDt) {
        em.createNativeQuery("""
                        INSERT INTO tb_bbs_item (bbs_id, pst_ttl, use_yn, sort_ordr, ans_sn, version, crt_dt)
                        VALUES ('BBS_EQ_STATS', '동등성', :useYn, :sortOrdr, 0, 0, :crtDt)
                        """)
                .setParameter("useYn", useYn)
                .setParameter("sortOrdr", (long) nextSortOrdr++)
                .setParameter("crtDt", crtDt)
                .executeUpdate();
    }

    private void insertDataUse(LocalDateTime crtDt) {
        em.createNativeQuery("INSERT INTO tb_dta_use_stats (bbs_id, crt_dt) VALUES ('BBS_EQ_STATS', :crtDt)")
                .setParameter("crtDt", crtDt)
                .executeUpdate();
    }

    private long nativeCount(String table) {
        return ((Number) em.createNativeQuery("SELECT COUNT(*) FROM " + table).getSingleResult()).longValue();
    }

    /** [날짜, 건수] 행을 비교하기 쉬운 문자열로 바꾼다. 건수의 숫자 타입은 DB 마다 달라 값만 본다. */
    private static List<String> rendered(List<Object[]> rows) {
        return rows.stream()
                .map(row -> {
                    assertThat(row).hasSize(2);
                    return row[0] + "=" + ((Number) row[1]).longValue();
                })
                .toList();
    }

    @Test
    @DisplayName("게시물 통계는 날짜 내림차순이고 논리 삭제 글과 종료일 다음날 0시를 세지 않는다")
    void postStatsAreDateDescendingExcludeDeletedAndUseExclusiveNextDayBound() {
        insertPost("Y", LocalDateTime.of(2026, 8, 4, 23, 59, 59, 999_999_000));
        insertPost("Y", LocalDateTime.of(2026, 8, 5, 0, 0));
        insertPost("Y", LocalDateTime.of(2026, 8, 5, 15, 0));
        insertPost("Y", LocalDateTime.of(2026, 8, 6, 9, 0));
        insertPost("N", LocalDateTime.of(2026, 8, 6, 10, 0));
        insertPost("N", LocalDateTime.of(2026, 8, 7, 10, 0));
        insertPost("Y", LocalDateTime.of(2026, 8, 7, 23, 59, 59, 999_999_000));
        insertPost("Y", LocalDateTime.of(2026, 8, 8, 0, 0));

        List<String> expected = List.of("2026-08-07=1", "2026-08-06=1", "2026-08-05=2");
        assertThat(rendered(reportStatsService.getBbsStatsByDate("20260805", "20260807"))).isEqualTo(expected);
        // 화면이 보내는 ISO 날짜도 같은 구간이다.
        assertThat(rendered(reportStatsService.getBbsStatsByDate("2026-08-05", "2026-08-07"))).isEqualTo(expected);
    }

    @Test
    @DisplayName("자료 이용 통계는 날짜 내림차순이고 종료일 다음날 0시를 세지 않는다")
    void dataUseStatsAreDateDescendingAndUseExclusiveNextDayBound() {
        insertDataUse(LocalDateTime.of(2026, 8, 4, 23, 59, 59, 999_999_000));
        insertDataUse(LocalDateTime.of(2026, 8, 5, 0, 0));
        insertDataUse(LocalDateTime.of(2026, 8, 5, 15, 0));
        insertDataUse(LocalDateTime.of(2026, 8, 6, 9, 0));
        insertDataUse(LocalDateTime.of(2026, 8, 7, 23, 59, 59, 999_999_000));
        insertDataUse(LocalDateTime.of(2026, 8, 8, 0, 0));

        List<String> expected = List.of("2026-08-07=1", "2026-08-06=1", "2026-08-05=2");
        assertThat(rendered(reportStatsService.getDtaUseStatsByDate("20260805", "20260807"))).isEqualTo(expected);
        assertThat(rendered(reportStatsService.getDtaUseStatsByDate("2026-08-05", "2026-08-07"))).isEqualTo(expected);
    }

    @Test
    @DisplayName("자료 이용 통계는 게시글을 세지 않는다 — 두 통계는 서로 다른 표를 읽는다")
    void dataUseStatsAndPostStatsReadDifferentTables() {
        insertPost("Y", LocalDateTime.of(2026, 8, 5, 10, 0));
        insertDataUse(LocalDateTime.of(2026, 8, 6, 10, 0));
        insertDataUse(LocalDateTime.of(2026, 8, 6, 11, 0));

        assertThat(rendered(reportStatsService.getBbsStatsByDate("20260801", "20260831")))
                .containsExactly("2026-08-05=1");
        assertThat(rendered(reportStatsService.getDtaUseStatsByDate("20260801", "20260831")))
                .containsExactly("2026-08-06=2");
    }

    /**
     * 요약의 총 게시글 수는 논리 삭제된 글까지 센 {@code tb_bbs_item} 전체 행 수다(포트 계약 "논리 삭제를 포함한
     * 전체 게시글 수"). 날짜별 게시물 통계와 달리 {@code use_yn} 을 보지 않는다 — 현행 그대로 고정한다.
     */
    @Test
    @DisplayName("요약은 사용자 행 수·논리 삭제 포함 게시글 행 수·오늘 성공 로그인 합을 싣는다")
    void summaryCountsAllUsersAllPostsIncludingDeletedAndTodaysLogins() {
        long postsBefore = nativeCount("tb_bbs_item");
        long usersBefore = nativeCount("tb_user_info");
        insertPost("Y", LocalDateTime.of(2026, 8, 5, 10, 0));
        insertPost("Y", LocalDateTime.of(2020, 1, 1, 0, 0));
        insertPost("N", LocalDateTime.of(2026, 8, 6, 10, 0));
        insertPost("N", LocalDateTime.of(2026, 8, 7, 10, 0));
        em.createNativeQuery("""
                        INSERT INTO tb_user_info (esntl_id, user_id, user_type_cd, user_nm, pswd, tmpr_pswd_yn)
                        VALUES ('ESNTL_EQ_STATS', 'eq-stats', 'EMP', '동등성', 'x', 'N')
                        """)
                .executeUpdate();
        given(loginLogRepository.countLoginsByDate(anyString(), anyString())).willReturn(List.of(
                new Object[]{"today", 2L}, new Object[]{"today", 3L}));

        LocalDate before = LocalDate.now();
        SummaryStatsDto summary = reportStatsService.getSummary();
        LocalDate after = LocalDate.now();

        assertThat(summary.getTotalPosts()).isEqualTo(postsBefore + 4);
        assertThat(summary.getTotalUsers()).isEqualTo(usersBefore + 1);
        assertThat(summary.getTodayConnects()).isEqualTo(5);

        // 오늘 접속은 오늘 하루(yyyyMMdd) 를 시작일·종료일로 묻는다. 자정을 넘겨 실행돼도 어느 한쪽 날짜여야 한다.
        ArgumentCaptor<String> from = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> to = ArgumentCaptor.forClass(String.class);
        verify(loginLogRepository).countLoginsByDate(from.capture(), to.capture());
        assertThat(List.of(from.getValue(), to.getValue()))
                .isIn(List.of(before.format(YMD), before.format(YMD)), List.of(after.format(YMD), after.format(YMD)));
    }
}
