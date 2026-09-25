package nuri.business.service.stats;

import nuri.business.domain.stats.DtaUseStatsRepository;
import nuri.business.domain.stats.ReprtStats;
import nuri.business.domain.stats.ReprtStatsRepository;
import lombok.RequiredArgsConstructor;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.core.stats.PostStatisticsContributor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * 보고서 통계 정보 및 데이터 사용현황 관리를 위한 서비스.
 * 타임스탬프 조회는 시작일 0시 이상, 종료일 다음날 0시 미만으로 마지막 소수초까지 포함한다.
 *
 * <p>[2026-09-25] 조회 기간 해석을 {@link #range(String, String)} 한 곳에 모은다. 종전에는 호출부마다 날짜를
 * 바로 {@code LocalDate.parse} 해, 형식이 틀리면 {@code DateTimeParseException} 이 500 으로 끝났다(주간 API
 * 스캔이 퍼징하는 파라미터다). 이제 형식 오류와 시작일이 종료일보다 늦은 기간은 400 이다. 컨트롤러가 부르지 않던
 * 목록·건수·유형·상태·게시판별 조회 7개와 그 전용 쿼리(없는 컬럼을 가리키던 쿼리 포함)는 걷었다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportStatsService {

    private final ReprtStatsRepository reprtStatsRepository;
    private final DtaUseStatsRepository dtaUseStatsRepository;
    private final nuri.business.domain.log.UserLogRepository userLogRepository;
    private final nuri.business.domain.log.LoginLogRepository loginLogRepository;
    private final nuri.business.domain.user.repository.UserRepository userRepository;

    /**
     * 게시글 집계를 세는 포트. 게시판 도메인이 구현하며 여기서는 숫자만 받는다.
     *
     * <p>종전에는 {@code BoardRepository} 를 인라인 FQN 으로 주입해 stats→board 교차 도메인 결합을
     * 만들었다(GAP-ARCH-001). {@code ObjectProvider} 로 받는 것은 게시판 도메인이 base projection 에서
     * 빠진 프로필에서도 통계가 뜨게 하기 위해서다 — 그때의 0 은 셀 게시글이 없다는 사실이다.
     */
    private final ObjectProvider<PostStatisticsContributor> postStatistics;

    // ========== 사용자 통계 ==========

    /**
     * 날짜별 사용자 활동 통계
     */
    public List<Object[]> getUserStatsByDate(String fromDate, String toDate) {
        DateRange range = range(fromDate, toDate);
        // TB_USER_LOG에서 날짜별로 집계
        return userLogRepository.countByDate(range.fromYmd(), range.toYmd());
    }

    /**
     * 날짜별 접속(로그인) 통계
     */
    public List<Object[]> getConnectStatsByDate(String fromDate, String toDate) {
        DateRange range = range(fromDate, toDate);
        // TB_LOGIN_LOG에서 날짜별로 집계
        return loginLogRepository.countLoginsByDate(range.fromYmd(), range.toYmd());
    }

    /**
     * 통계 요약(총 사용자/총 게시글/오늘 접속) — 대시보드 상단 요약 카드용.
     * 프런트 StatsAdminService.getSummary()가 호출하는 GET /api/v1/admin/system/statistics/summary 백엔드.
     */
    public nuri.business.service.stats.dto.SummaryStatsDto getSummary() {
        long totalUsers = userRepository.count();
        PostStatisticsContributor posts = postStatistics.getIfAvailable();
        long totalPosts = posts == null ? 0L : posts.countPosts();
        String today = java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"));
        long todayConnects = loginLogRepository.countLoginsByDate(today, today).stream()
                .filter(row -> row.length > 1 && row[1] != null)
                .mapToLong(row -> ((Number) row[1]).longValue())
                .sum();
        return nuri.business.service.stats.dto.SummaryStatsDto.builder()
                .totalUsers(totalUsers)
                .totalPosts(totalPosts)
                .todayConnects(todayConnects)
                .build();
    }

    // ========== 보고서 통계 ==========

    /**
     * 등록 보고서 날짜별 통계
     */
    public List<Object[]> getReprtStatsByDate(String fromDate, String toDate) {
        DateRange range = range(fromDate, toDate);
        return reprtStatsRepository.countByDate(range.fromTimestamp(), range.toExclusiveTimestamp());
    }

    /**
     * 보고서 통계 데이터 등록
     */
    @Transactional
    public void insertReprtStats(ReprtStats reprtStats) throws Exception {
        ReprtStats newStats = ReprtStats.builder()
                .reprtNm(reprtStats.getReprtNm())
                .reprtType(reprtStats.getReprtType())
                .reprtSttus(reprtStats.getReprtSttus())
                .build();
        reprtStatsRepository.save(newStats);
    }

    // ========== 데이터 사용현황 ==========

    /**
     * 등록 대기 데이터 사용현황
     */
    public List<Object[]> getDtaUseStatsByDate(String fromDate, String toDate) {
        DateRange range = range(fromDate, toDate);
        return dtaUseStatsRepository.countByDate(range.fromTimestamp(), range.toExclusiveTimestamp());
    }

    /**
     * 날짜별 게시판 활동 통계.
     *
     * <p>[2026-08-28] 종전에는 {@code dtaUseStatsRepository.countByDate} 를 불렀다 —
     * 바로 위 {@link #getDtaUseStatsByDate} 와 <b>완전히 같은 질의</b>다. 즉 게시물 통계 화면은
     * 게시글을 하나도 세지 않고 자료이용현황과 같은 숫자를 보여 주고 있었고,
     * {@code tb_dta_use_stats} 에는 쓰는 코드가 없어(writer 0건) 실제로는 늘 비어 있었다.
     *
     * <p>이제 게시글({@code tb_bbs_item})을 실제로 센다. 논리 삭제된 글은 제외한다.
     */
    public List<Object[]> getBbsStatsByDate(String fromDate, String toDate) {
        DateRange range = range(fromDate, toDate);
        PostStatisticsContributor posts = postStatistics.getIfAvailable();
        return posts == null ? List.of() : posts.countPostsByDate(range.fromTimestamp(), range.toExclusiveTimestamp());
    }

    /** 검증을 마친 조회 기간. 종료일은 그날을 포함한다. */
    private record DateRange(LocalDate from, LocalDate to) {
        String fromYmd() {
            return from.format(DateTimeFormatter.BASIC_ISO_DATE);
        }

        String toYmd() {
            return to.format(DateTimeFormatter.BASIC_ISO_DATE);
        }

        String fromTimestamp() {
            return from + " 00:00:00";
        }

        /** 종료일 다음날 0시 — 배타적 상한이라 마지막 소수초까지 포함한다. */
        String toExclusiveTimestamp() {
            return to.plusDays(1) + " 00:00:00";
        }
    }

    /**
     * 화면의 ISO 날짜와 컨트롤러 기본값인 yyyyMMdd를 같은 날짜 구간으로 정규화하고 검증한다.
     * 형식이 틀리거나 시작일이 종료일보다 늦으면 400(INVALID_INPUT_VALUE)이다.
     */
    private static DateRange range(String fromDate, String toDate) {
        LocalDate from = parseDate(fromDate, "fromDate");
        LocalDate to = parseDate(toDate, "toDate");
        if (from.isAfter(to)) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "조회 시작일이 종료일보다 늦습니다.");
        }
        return new DateRange(from, to);
    }

    private static LocalDate parseDate(String value, String name) {
        if (value == null || value.isBlank()) {
            throw invalidDate(name);
        }
        try {
            return LocalDate.parse(value, value.indexOf('-') >= 0
                    ? DateTimeFormatter.ISO_LOCAL_DATE : DateTimeFormatter.BASIC_ISO_DATE);
        } catch (DateTimeException e) {
            throw invalidDate(name);
        }
    }

    private static BusinessException invalidDate(String name) {
        return new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                name + " 은 yyyy-MM-dd 또는 yyyyMMdd 형식의 날짜여야 합니다.");
    }
}
