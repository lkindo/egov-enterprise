package nuri.business.service.stats;

import nuri.business.service.stats.dto.StatsPoint;
import nuri.business.service.stats.dto.UserActivityStats;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
@DisplayName("ReportStatsService 단위 테스트")
class ReportStatsServiceTest {

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
    /** 시험의 '오늘' — 2026-10-20 KST 정오. */
    private static final Clock TODAY_2026_10_20 = Clock.fixed(Instant.parse("2026-10-20T03:00:00Z"), SEOUL);

    /**
     * 명시 생성자로 만든다 — 같은 원시 타입 {@code ObjectProvider} 두 개를 {@code @InjectMocks} 는 구분하지 못한다.
     */
    private ReportStatsService reportStatsService;

    /**
     * 자료 이용 집계도 게시판 도메인이 구현하는 포트로 받는다({@code tb_dta_use_stats} 는 게시판 데이터다).
     */
    @Mock
    private org.springframework.beans.factory.ObjectProvider<nuri.foundation.core.stats.DataUsageStatisticsContributor> dataUsageStatistics;

    @Mock
    private nuri.foundation.core.stats.DataUsageStatisticsContributor dataUsageContributor;

    /**
     * 게시글 집계는 게시판 도메인이 구현하는 포트로 받는다(GAP-ARCH-001 의 stats→board 역전).
     * 구현이 없는 프로필에서도 통계가 뜨도록 {@code ObjectProvider} 로 주입된다.
     */
    @Mock
    private org.springframework.beans.factory.ObjectProvider<nuri.foundation.core.stats.PostStatisticsContributor> postStatistics;

    @Mock
    private nuri.foundation.core.stats.PostStatisticsContributor postStatisticsContributor;

    @Mock private nuri.business.domain.user.repository.UserRepository userRepository;
    @Mock private nuri.business.domain.log.LoginLogRepository loginLogRepository;
    @Mock private nuri.business.domain.log.UserLogRepository userLogRepository;

    @BeforeEach
    void setUp() {
        reportStatsService = new ReportStatsService(userLogRepository, loginLogRepository,
                userRepository, postStatistics, dataUsageStatistics);
        reportStatsService.useClock(TODAY_2026_10_20);
    }

    private static List<Object[]> rows(Object[]... rows) {
        return new ArrayList<>(Arrays.asList(rows));
    }

    private static List<String> rendered(List<StatsPoint> points) {
        return points.stream().map(point -> point.date() + "=" + point.value()).toList();
    }

    private static BusinessException assertInvalidInput(org.junit.jupiter.api.function.Executable call) {
        BusinessException error = org.junit.jupiter.api.Assertions.assertThrows(BusinessException.class, call);
        assertThat(error.getErrorCode()).isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE);
        return error;
    }

    // ── 요약 ──────────────────────────────────────────────────────────────────

    @Test
    void summarySumsNumericCountsAndSkipsIncompleteRows() {
        given(userRepository.count()).willReturn(7L);
        given(postStatistics.getIfAvailable()).willReturn(postStatisticsContributor);
        given(postStatisticsContributor.countPosts()).willReturn(20L);
        given(loginLogRepository.countLoginsByDate(anyString(), anyString())).willReturn(List.of(
                new Object[]{"date", 2L}, new Object[]{"date", java.math.BigInteger.valueOf(3)},
                new Object[]{}, new Object[]{"date"}, new Object[]{"date", null}));
        var summary = reportStatsService.getSummary();
        assertThat(summary.getTotalUsers()).isEqualTo(7);
        assertThat(summary.getTotalPosts()).isEqualTo(20);
        assertThat(summary.getTodayConnects()).isEqualTo(5);
    }

    @Test
    void emptySummaryIsZeroButDatabaseFailurePropagates() {
        assertThat(reportStatsService.getSummary().getTodayConnects()).isZero();
        given(userRepository.count()).willThrow(new org.springframework.dao.DataAccessResourceFailureException("unavailable"));
        org.assertj.core.api.Assertions.assertThatThrownBy(reportStatsService::getSummary)
                .isInstanceOf(org.springframework.dao.DataAccessResourceFailureException.class);
    }

    /** 시험 JVM 은 UTC 다. KST 자정~09시에는 두 시간대의 '오늘' 이 갈린다 — 오늘 성공 로그인은 한국 날짜로 센다. */
    @Test
    @DisplayName("오늘 성공 로그인은 Asia/Seoul 의 오늘을 묻는다 — UTC 로는 전날인 KST 새벽에도")
    void summaryTodayIsSeoulDate() {
        reportStatsService.useClock(Clock.fixed(Instant.parse("2026-10-19T15:30:00Z"), SEOUL));

        reportStatsService.getSummary();

        verify(loginLogRepository).countLoginsByDate("20261020", "20261020");
    }

    // ── 기간 해석 ──────────────────────────────────────────────────────────────

    @Test
    void activityQueriesUseCompactDates() {
        reportStatsService.getUserStatsByDate("2026-02-01", "2026-02-28");
        reportStatsService.getConnectStatsByDate("20260201", "20260228");
        verify(userLogRepository).countByDate("20260201", "20260228");
        verify(loginLogRepository).countLoginsByDate("20260201", "20260228");
    }

    @Test
    @DisplayName("기간을 비우면 오늘(Asia/Seoul)까지 최근 1개월이다 — 한쪽만 비우면 그쪽만 기본값이다")
    void omittedPeriodDefaultsToOneMonthEndingTodayInSeoul() {
        // UTC 로는 10-19 지만 한국은 10-20 새벽이다.
        reportStatsService.useClock(Clock.fixed(Instant.parse("2026-10-19T15:30:00Z"), SEOUL));

        reportStatsService.getUserStatsByDate(null, null);
        reportStatsService.getConnectStatsByDate("", " ");
        reportStatsService.getConnectStatsByDate("2026-10-01", null);

        verify(userLogRepository).countByDate("20260920", "20261020");
        verify(loginLogRepository).countLoginsByDate("20260920", "20261020");
        verify(loginLogRepository).countLoginsByDate("20261001", "20261020");
    }

    /**
     * [2026-09-25] 날짜 형식이 틀리면 종전에는 DateTimeParseException 이 500 으로 끝났다(주간 API 스캔이
     * 퍼징하는 파라미터다). 모든 기간 조회가 같은 해석기를 지나므로 대표 경로마다 400 을 확인한다.
     */
    @ParameterizedTest
    @CsvSource({"abc", "2026-13-01", "2026-09-25T00:00:00", "2026925", "2026-02-30"})
    @DisplayName("날짜 형식이 틀리면 400(INVALID_INPUT_VALUE)이고 저장소를 부르지 않는다")
    void malformedDatesAreRejectedAsInvalidInput(String malformed) {
        for (org.junit.jupiter.api.function.Executable call : List.<org.junit.jupiter.api.function.Executable>of(
                () -> reportStatsService.getDtaUseStatsByDate("2026-09-01", malformed),
                () -> reportStatsService.getBbsStatsByDate(malformed, malformed),
                () -> reportStatsService.getUserStatsByDate(malformed, "20260925"),
                () -> reportStatsService.getConnectStatsByDate("20260901", malformed))) {
            assertInvalidInput(call);
        }
        verifyNoInteractions(dataUsageStatistics, postStatistics);
        verify(userLogRepository, never()).countByDate(anyString(), anyString());
        verify(loginLogRepository, never()).countLoginsByDate(anyString(), anyString());
    }

    @Test
    @DisplayName("시작일이 종료일보다 늦으면 400(INVALID_INPUT_VALUE)이다 — 같은 날은 허용한다")
    void reversedRangeIsRejectedButSingleDayIsAllowed() {
        assertThat(assertInvalidInput(() -> reportStatsService.getDtaUseStatsByDate("2026-09-26", "2026-09-25")).getMessage())
                .contains("시작일이 종료일보다 늦습니다");

        given(dataUsageStatistics.getIfAvailable()).willReturn(dataUsageContributor);
        reportStatsService.getDtaUseStatsByDate("2026-09-25", "20260925");
        verify(dataUsageContributor).countDataUsageByDate("2026-09-25 00:00:00", "2026-09-26 00:00:00");
    }

    /** 시작·종료일을 포함해 366일(윤년 한 해)까지다. 하루라도 넘으면 저장소를 부르기 전에 400 이다. */
    @ParameterizedTest(name = "{0} ~ {1} → {2}일")
    @CsvSource({
            "2024-01-01, 2024-12-31, 366",
            "2025-01-01, 2026-01-01, 366",
            "20250101, 20260101, 366",
    })
    @DisplayName("기간 상한 366일 — 경계는 허용한다")
    void periodUpTo366DaysIsAllowed(String from, String to, int days) {
        assertThat(reportStatsService.getConnectStatsByDate(from, to)).hasSize(days);
        assertThat(reportStatsService.getUserStatsByDate(from, to).inqCnt()).hasSize(days);
    }

    @ParameterizedTest(name = "{0} ~ {1}")
    @CsvSource({"2025-01-01, 2026-01-02", "2024-01-01, 2025-01-01", "2020-01-01, 2026-10-20"})
    @DisplayName("기간 상한 366일 — 넘으면 400 이고 저장소를 부르지 않는다")
    void periodOver366DaysIsRejected(String from, String to) {
        for (org.junit.jupiter.api.function.Executable call : List.<org.junit.jupiter.api.function.Executable>of(
                () -> reportStatsService.getConnectStatsByDate(from, to),
                () -> reportStatsService.getUserStatsByDate(from, to),
                () -> reportStatsService.getBbsStatsByDate(from, to),
                () -> reportStatsService.getDtaUseStatsByDate(from, to))) {
            assertThat(assertInvalidInput(call).getMessage()).contains("366일");
        }
        verifyNoInteractions(dataUsageStatistics, postStatistics);
        verify(userLogRepository, never()).countByDate(anyString(), anyString());
        verify(loginLogRepository, never()).countLoginsByDate(anyString(), anyString());
    }

    @Test
    @DisplayName("한쪽만 준 기간도 기본값을 채운 뒤 같은 상한을 지난다")
    void defaultedSideIsCheckedAgainstTheCap() {
        assertInvalidInput(() -> reportStatsService.getConnectStatsByDate("2020-01-01", null));
        verify(loginLogRepository, never()).countLoginsByDate(anyString(), anyString());
    }

    @ParameterizedTest
    @CsvSource({
            "2024-02-29, 2024-02-29, 2024-03-01",
            "2026-10-20, 2026-10-20, 2026-10-21",
            "20240229, 2024-02-29, 2024-03-01",
            "20261231, 2026-12-31, 2027-01-01"
    })
    @DisplayName("날짜 단위 통계의 모든 조회는 종료일 다음날 0시를 배타적 상한으로 전달한다")
    void dateQueriesUseNextDayExclusiveEnd(String day, String normalizedDay, String nextDay) {
        String start = normalizedDay + " 00:00:00";
        String endExclusive = nextDay + " 00:00:00";
        given(postStatistics.getIfAvailable()).willReturn(postStatisticsContributor);
        given(dataUsageStatistics.getIfAvailable()).willReturn(dataUsageContributor);

        reportStatsService.getDtaUseStatsByDate(day, day);
        reportStatsService.getBbsStatsByDate(day, day);

        verify(dataUsageContributor).countDataUsageByDate(start, endExclusive);
        verify(postStatisticsContributor).countPostsByDate(start, endExclusive);
    }

    // ── 한 모양: yyyy-MM-dd 오름차순, 빈 날 0 ─────────────────────────────────────

    /**
     * 저장소마다 날짜 형식(yyyy-MM-dd·yyyyMMdd)과 순서가 달랐고 화면이 정렬해 그렸다. 이제 서비스가 한 모양으로 낸다.
     */
    @Test
    @DisplayName("성공 로그인은 기간의 날마다 한 칸이고 기록이 없는 날은 0 이다 — 순서·형식과 무관하게 yyyy-MM-dd 오름차순")
    void connectSeriesIsGapFilledAscending() {
        given(loginLogRepository.countLoginsByDate("20261001", "20261005")).willReturn(rows(
                new Object[]{"2026-10-04", 4L},
                new Object[]{"20261002", java.math.BigInteger.valueOf(2)},
                new Object[]{"2026-10-01", new java.math.BigDecimal("1")}));

        assertThat(rendered(reportStatsService.getConnectStatsByDate("2026-10-01", "2026-10-05")))
                .containsExactly("2026-10-01=1", "2026-10-02=2", "2026-10-03=0", "2026-10-04=4", "2026-10-05=0");
    }

    @Test
    @DisplayName("게시물 통계도 같은 모양이다 — 저장소의 최신순을 오름차순으로 바꾸고 빈 날을 0 으로 채운다")
    void postSeriesIsGapFilledAscending() {
        given(postStatistics.getIfAvailable()).willReturn(postStatisticsContributor);
        given(postStatisticsContributor.countPostsByDate("2026-10-01 00:00:00", "2026-10-04 00:00:00")).willReturn(rows(
                new Object[]{"2026-10-03", 3L}, new Object[]{"2026-10-01", 1L}));

        assertThat(rendered(reportStatsService.getBbsStatsByDate("20261001", "20261003")))
                .containsExactly("2026-10-01=1", "2026-10-02=0", "2026-10-03=3");
        verifyNoInteractions(dataUsageStatistics);
    }

    /**
     * 아직 오지 않은 날의 0 은 측정값이 아니다 — 기간이 오늘을 넘으면 오늘까지만 싣는다. 기간이 통째로 미래면 빈 목록이다.
     */
    @Test
    @DisplayName("빈 날 채우기는 오늘(Asia/Seoul)에서 멈춘다")
    void gapFillStopsAtTodayInSeoul() {
        assertThat(rendered(reportStatsService.getConnectStatsByDate("2026-10-18", "2026-10-25")))
                .containsExactly("2026-10-18=0", "2026-10-19=0", "2026-10-20=0");
        assertThat(reportStatsService.getConnectStatsByDate("2026-10-21", "2026-10-25")).isEmpty();

        // UTC 로는 10-19 지만 한국은 10-20 새벽이다 — 오늘 칸이 있어야 한다.
        reportStatsService.useClock(Clock.fixed(Instant.parse("2026-10-19T15:30:00Z"), SEOUL));
        assertThat(rendered(reportStatsService.getConnectStatsByDate("2026-10-19", "2026-10-25")))
                .containsExactly("2026-10-19=0", "2026-10-20=0");
    }

    @Test
    @DisplayName("오늘 뒤의 기록이 있으면(시계 어긋남) 버리지 않고 그날까지 싣는다")
    void recordedDaysAfterTodayAreKept() {
        given(loginLogRepository.countLoginsByDate("20261019", "20261025")).willReturn(rows(new Object[]{"2026-10-22", 1L}));

        assertThat(rendered(reportStatsService.getConnectStatsByDate("2026-10-19", "2026-10-25")))
                .containsExactly("2026-10-19=0", "2026-10-20=0", "2026-10-21=0", "2026-10-22=1");
    }

    @Test
    @DisplayName("기간 밖의 행은 싣지 않고, 같은 날 행은 더한다")
    void rowsOutsideThePeriodAreDroppedAndSameDayRowsAreSummed() {
        given(loginLogRepository.countLoginsByDate("20261001", "20261002")).willReturn(rows(
                new Object[]{"2026-09-30", 9L}, new Object[]{"2026-10-01", 1L}, new Object[]{"20261001", 2L},
                new Object[]{"2026-10-03", 9L}));

        assertThat(rendered(reportStatsService.getConnectStatsByDate("2026-10-01", "2026-10-02")))
                .containsExactly("2026-10-01=3", "2026-10-02=0");
    }

    @Test
    @DisplayName("저장소가 읽을 수 없는 날짜를 주면 조용히 버리지 않고 실패한다")
    void unreadableRowDateFails() {
        given(loginLogRepository.countLoginsByDate("20261001", "20261002")).willReturn(rows(new Object[]{"10/01", 1L}));
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> reportStatsService.getConnectStatsByDate("2026-10-01", "2026-10-02"))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("10/01");

        given(loginLogRepository.countLoginsByDate("20261003", "20261003")).willReturn(rows(new Object[]{null, 1L}));
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> reportStatsService.getConnectStatsByDate("2026-10-03", "2026-10-03"))
                .isInstanceOf(IllegalStateException.class);
    }

    // ── 사용자 활동: 요청 구분 네 계열 ───────────────────────────────────────────

    /**
     * 종전에는 질의가 조회 수까지 가져오고도 등록 수 하나만 실었다. 이제 네 계열을 같은 날짜 축으로 낸다. 저장소 열 순서는
     * [일자, 조회, 등록, 수정, 삭제] 이다. 카운터 컬럼은 nullable 이라 합이 NULL 일 수 있다 — 행이 있으면 잰 날이고 그 값은 0 이다.
     */
    @Test
    @DisplayName("사용자 활동은 조회·등록·수정·삭제 네 계열을 같은 날짜 축으로 내고 빈 날·NULL 은 0 이다")
    void userActivityIsDecomposedIntoFourSeries() {
        given(userLogRepository.countByDate("20261001", "20261003")).willReturn(rows(
                new Object[]{"20261001", 120L, 3L, 2L, 1L},
                new Object[]{"20261003", java.math.BigInteger.valueOf(40), null, 5L, 0L}));

        UserActivityStats stats = reportStatsService.getUserStatsByDate("2026-10-01", "2026-10-03");

        assertThat(rendered(stats.inqCnt())).containsExactly("2026-10-01=120", "2026-10-02=0", "2026-10-03=40");
        assertThat(rendered(stats.crtCnt())).containsExactly("2026-10-01=3", "2026-10-02=0", "2026-10-03=0");
        assertThat(rendered(stats.mdfcnCnt())).containsExactly("2026-10-01=2", "2026-10-02=0", "2026-10-03=5");
        assertThat(rendered(stats.delCnt())).containsExactly("2026-10-01=1", "2026-10-02=0", "2026-10-03=0");
    }

    // ── 자료 이용: 쓰는 쪽이 없는 계열 ───────────────────────────────────────────

    /**
     * 자료 이용 기록에는 쓰는 경로가 없다(writer 0). 빈 날을 0 으로 채우면 측정하지 않은 값을 0 건으로 말한다(DEC-OPS-100) —
     * 기록이 있는 날만 오름차순으로 싣는다.
     */
    @Test
    @DisplayName("일자별 자료 이용 현황은 자료 이용 포트의 기록만 오름차순으로 싣고 빈 날을 채우지 않는다")
    void dataUsageIsNotGapFilled() {
        given(dataUsageStatistics.getIfAvailable()).willReturn(dataUsageContributor);
        given(dataUsageContributor.countDataUsageByDate("2024-01-01 00:00:00", "2024-02-01 00:00:00")).willReturn(rows(
                new Object[]{"2024-01-31", 2L}, new Object[]{"2024-01-05", 1L}));

        assertThat(rendered(reportStatsService.getDtaUseStatsByDate("2024-01-01", "2024-01-31")))
                .containsExactly("2024-01-05=1", "2024-01-31=2");
        assertThat(reportStatsService.getDtaUseStatsByDate("2024-02-01", "2024-02-29")).isEmpty();
        verifyNoInteractions(postStatistics);
    }

    /**
     * 게시판 도메인이 빠진 구성에서는 자료 이용 포트 구현도 없다. 그때의 빈 목록은 "셀 기록이 없다" 는 사실이며,
     * 통계 화면이 죽어서는 안 된다.
     */
    @Test
    @DisplayName("자료 이용 집계 구현이 없으면 빈 목록이다")
    void dataUsageStatisticsAreEmptyWhenNoContributorIsPresent() {
        given(dataUsageStatistics.getIfAvailable()).willReturn(null);

        assertThat(reportStatsService.getDtaUseStatsByDate("2024-01-01", "2024-01-31")).isEmpty();
    }

    /**
     * 게시물 통계가 게시글을 실제로 센다.
     *
     * <p>[2026-08-28] 종전 {@code getBbsStatsByDate} 는 {@code dtaUseStatsRepository.countByDate}
     * 를 불렀다 — 바로 위 {@code getDtaUseStatsByDate} 와 <b>완전히 같은 질의</b>다. 즉 게시물
     * 통계 화면은 게시글을 하나도 세지 않고 자료이용현황과 같은 숫자를 받고 있었고,
     * {@code tb_dta_use_stats} 에는 쓰는 코드가 없어(writer 0건) 실제로는 늘 비어 있었다.
     *
     * <p>두 축을 함께 고정한다 — 게시판 저장소를 부르는가, 그리고 <b>자료 이용 집계를 더 이상 부르지
     * 않는가</b>. 앞의 것만 검사하면 둘 다 부르는 어중간한 상태가 통과한다. [Phase 0c] 자료 이용 집계는
     * 포트로 옮겼으므로 그 포트와의 상호작용 자체가 없어야 한다.
     */
    @Test
    @DisplayName("일자별 게시물 통계는 게시글을 센다 — 자료이용현황 표를 읽지 않는다")
    void getBbsStatsByDateCountsPosts() {
        given(postStatistics.getIfAvailable()).willReturn(postStatisticsContributor);
        given(postStatisticsContributor.countPostsByDate(anyString(), anyString())).willReturn(new ArrayList<>());

        reportStatsService.getBbsStatsByDate("2024-01-01", "2024-01-31");

        verify(postStatisticsContributor).countPostsByDate("2024-01-01 00:00:00", "2024-02-01 00:00:00");
        verifyNoInteractions(dataUsageStatistics);
    }

    /**
     * 게시판 도메인이 base projection 에서 빠진 프로필에서는 구현이 없다. 그때의 0·빈 목록은
     * "셀 게시글이 없다" 는 사실이며, 통계 화면이 죽어서는 안 된다(GAP-ARCH-001 의 stats→board 역전).
     * 셀 원천이 없으므로 날을 0 으로 채우지도 않는다.
     */
    @Test
    @DisplayName("게시글 집계 구현이 없으면 총계 0·날짜별 빈 목록이다")
    void postStatisticsAreEmptyWhenNoContributorIsPresent() {
        given(postStatistics.getIfAvailable()).willReturn(null);
        given(userRepository.count()).willReturn(7L);
        given(loginLogRepository.countLoginsByDate(anyString(), anyString())).willReturn(List.of());

        assertThat(reportStatsService.getSummary().getTotalPosts()).isZero();
        assertThat(reportStatsService.getBbsStatsByDate("2024-01-01", "2024-01-31")).isEmpty();
    }
}
