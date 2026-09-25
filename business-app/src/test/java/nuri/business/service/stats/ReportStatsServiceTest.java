package nuri.business.service.stats;

import nuri.business.domain.stats.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;

@ExtendWith(MockitoExtension.class)
@DisplayName("ReportStatsService 단위 테스트")
class ReportStatsServiceTest {

    @InjectMocks
    private ReportStatsService reportStatsService;

    @Mock
    private ReprtStatsRepository reprtStatsRepository;

    @Mock
    private DtaUseStatsRepository dtaUseStatsRepository;

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

    @Test
    void activityQueriesUseCompactDates() {
        reportStatsService.getUserStatsByDate("2026-02-01", "2026-02-28");
        reportStatsService.getConnectStatsByDate("20260201", "20260228");
        verify(userLogRepository).countByDate("20260201", "20260228");
        verify(loginLogRepository).countLoginsByDate("20260201", "20260228");
    }

    @Test
    @DisplayName("일자별 보고서 통계 조회")
    void getReprtStatsByDate() {
        given(reprtStatsRepository.countByDate(anyString(), anyString())).willReturn(new ArrayList<>());
        
        List<Object[]> result = reportStatsService.getReprtStatsByDate("2024-01-01", "2024-01-31");

        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("보고서 통계 등록")
    void insertReprtStats() throws Exception {
        ReprtStats stats = ReprtStats.builder().reprtNm("Test").reprtType("A").build();
        reportStatsService.insertReprtStats(stats);

        ArgumentCaptor<ReprtStats> captor = ArgumentCaptor.forClass(ReprtStats.class);
        verify(reprtStatsRepository).save(captor.capture());
        assertThat(captor.getValue().getRptpSn()).isNull();
        assertThat(captor.getValue().getReprtNm()).isEqualTo("Test");
    }
    
    @Test
    @DisplayName("일자별 데이터 이용 현황 조회")
    void getDtaUseStatsByDate() {
        given(dtaUseStatsRepository.countByDate(anyString(), anyString())).willReturn(new ArrayList<>());
        reportStatsService.getDtaUseStatsByDate("2024-01-01", "2024-01-31");
        verify(dtaUseStatsRepository).countByDate(anyString(), anyString());
    }

    /**
     * 게시물 통계가 게시글을 실제로 센다.
     *
     * <p>[2026-08-28] 종전 {@code getBbsStatsByDate} 는 {@code dtaUseStatsRepository.countByDate}
     * 를 불렀다 — 바로 위 {@code getDtaUseStatsByDate} 와 <b>완전히 같은 질의</b>다. 즉 게시물
     * 통계 화면은 게시글을 하나도 세지 않고 자료이용현황과 같은 숫자를 받고 있었고,
     * {@code tb_dta_use_stats} 에는 쓰는 코드가 없어(writer 0건) 실제로는 늘 비어 있었다.
     *
     * <p>두 축을 함께 고정한다 — 게시판 저장소를 부르는가, 그리고 <b>통계 표를 더 이상 부르지
     * 않는가</b>. 앞의 것만 검사하면 둘 다 부르는 어중간한 상태가 통과한다.
     */
    @Test
    @DisplayName("일자별 게시물 통계는 게시글을 센다 — 자료이용현황 표를 읽지 않는다")
    void getBbsStatsByDateCountsPosts() {
        given(postStatistics.getIfAvailable()).willReturn(postStatisticsContributor);
        given(postStatisticsContributor.countPostsByDate(anyString(), anyString())).willReturn(new ArrayList<>());

        reportStatsService.getBbsStatsByDate("2024-01-01", "2024-01-31");

        verify(postStatisticsContributor).countPostsByDate("2024-01-01 00:00:00", "2024-02-01 00:00:00");
        verify(dtaUseStatsRepository, never()).countByDate(anyString(), anyString());
    }

    /**
     * 게시판 도메인이 base projection 에서 빠진 프로필에서는 구현이 없다. 그때의 0·빈 목록은
     * "셀 게시글이 없다" 는 사실이며, 통계 화면이 죽어서는 안 된다(GAP-ARCH-001 의 stats→board 역전).
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

    /**
     * [2026-09-25] 날짜 형식이 틀리면 종전에는 DateTimeParseException 이 500 으로 끝났다(주간 API 스캔이
     * 퍼징하는 파라미터다). 모든 기간 조회가 같은 해석기를 지나므로 대표 경로마다 400 을 확인한다.
     */
    @ParameterizedTest
    @CsvSource({"abc", "2026-13-01", "2026-09-25T00:00:00", "2026925"})
    @DisplayName("날짜 형식이 틀리면 400(INVALID_INPUT_VALUE)이고 저장소를 부르지 않는다")
    void malformedDatesAreRejectedAsInvalidInput(String malformed) {
        for (org.junit.jupiter.api.function.Executable call : List.<org.junit.jupiter.api.function.Executable>of(
                () -> reportStatsService.getReprtStatsByDate(malformed, "2026-09-25"),
                () -> reportStatsService.getDtaUseStatsByDate("2026-09-01", malformed),
                () -> reportStatsService.getBbsStatsByDate(malformed, malformed),
                () -> reportStatsService.getUserStatsByDate(malformed, "20260925"),
                () -> reportStatsService.getConnectStatsByDate("20260901", malformed))) {
            nuri.foundation.core.exception.BusinessException error = org.junit.jupiter.api.Assertions.assertThrows(
                    nuri.foundation.core.exception.BusinessException.class, call);
            assertThat(error.getErrorCode()).isEqualTo(nuri.foundation.core.exception.CommonErrorCode.INVALID_INPUT_VALUE);
        }
        verify(reprtStatsRepository, never()).countByDate(anyString(), anyString());
        verify(dtaUseStatsRepository, never()).countByDate(anyString(), anyString());
        verify(userLogRepository, never()).countByDate(anyString(), anyString());
        verify(loginLogRepository, never()).countLoginsByDate(anyString(), anyString());
    }

    @Test
    @DisplayName("시작일이 종료일보다 늦으면 400(INVALID_INPUT_VALUE)이다 — 같은 날은 허용한다")
    void reversedRangeIsRejectedButSingleDayIsAllowed() {
        nuri.foundation.core.exception.BusinessException error = org.junit.jupiter.api.Assertions.assertThrows(
                nuri.foundation.core.exception.BusinessException.class,
                () -> reportStatsService.getReprtStatsByDate("2026-09-26", "2026-09-25"));
        assertThat(error.getErrorCode()).isEqualTo(nuri.foundation.core.exception.CommonErrorCode.INVALID_INPUT_VALUE);

        reportStatsService.getReprtStatsByDate("2026-09-25", "20260925");
        verify(reprtStatsRepository).countByDate("2026-09-25 00:00:00", "2026-09-26 00:00:00");
    }

    @ParameterizedTest
    @CsvSource({
            "2024-02-29, 2024-02-29, 2024-03-01",
            "2026-12-31, 2026-12-31, 2027-01-01",
            "20240229, 2024-02-29, 2024-03-01",
            "20261231, 2026-12-31, 2027-01-01"
    })
    @DisplayName("날짜 단위 통계의 모든 조회는 종료일 다음날 0시를 배타적 상한으로 전달한다")
    void dateQueriesUseNextDayExclusiveEnd(String day, String normalizedDay, String nextDay) {
        String start = normalizedDay + " 00:00:00";
        String endExclusive = nextDay + " 00:00:00";
        given(postStatistics.getIfAvailable()).willReturn(postStatisticsContributor);

        reportStatsService.getReprtStatsByDate(day, day);
        reportStatsService.getDtaUseStatsByDate(day, day);
        reportStatsService.getBbsStatsByDate(day, day);

        verify(reprtStatsRepository).countByDate(start, endExclusive);
        verify(dtaUseStatsRepository).countByDate(start, endExclusive);
        verify(postStatisticsContributor).countPostsByDate(start, endExclusive);
    }
}
