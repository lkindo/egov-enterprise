package nuri.business.service.stats;

import nuri.business.domain.stats.DtaUseStats;
import nuri.business.domain.stats.DtaUseStatsRepository;
import nuri.business.domain.stats.ReprtStats;
import nuri.business.domain.stats.ReprtStatsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Objects;

/**
 * 보고서 통계 정보 및 데이터 사용현황 관리를 위한 서비스
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
    private final nuri.business.domain.board.BoardRepository boardRepository;

    @jakarta.annotation.Resource(name = "reprtStatsIdGnrService")
    private org.egovframe.rte.fdl.idgnr.EgovIdGnrService reprtStatsIdGnrService;

    // ========== 사용자 통계 ==========

    /**
     * 날짜별 사용자 활동 통계
     */
    public List<Object[]> getUserStatsByDate(String fromDate, String toDate) {
        String from = fromDate.replace("-", "");
        String to = toDate.replace("-", "");
        // TB_USER_LOG에서 날짜별로 집계
        return userLogRepository.countByDate(from, to);
    }

    /**
     * 날짜별 접속(로그인) 통계
     */
    public List<Object[]> getConnectStatsByDate(String fromDate, String toDate) {
        String from = fromDate.replace("-", "");
        String to = toDate.replace("-", "");
        // TB_LOGIN_LOG에서 날짜별로 집계
        return loginLogRepository.countLoginsByDate(from, to);
    }

    /**
     * 통계 요약(총 사용자/총 게시글/오늘 접속) — 대시보드 상단 요약 카드용.
     * 프런트 StatsAdminService.getSummary()가 호출하는 GET /api/v1/admin/system/statistics/summary 백엔드.
     */
    public nuri.business.service.stats.dto.SummaryStatsDto getSummary() {
        long totalUsers = userRepository.count();
        long totalPosts = boardRepository.count();
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
     * 보고서 통계 목록 조회
     */
    public Page<ReprtStats> getReprtStatsList(String reprtType, String fromDate, String toDate, int page, int size) {
        String from = fromDate + " 00:00:00";
        String to = toDate + " 23:59:59";
        return reprtStatsRepository.findByConditions(reprtType, from, to, PageRequest.of(page, size));
    }

    /**
     * 보고서 통계 전체 건수
     */
    public long getReprtStatsCount(String reprtType, String fromDate, String toDate) {
        String from = fromDate + " 00:00:00";
        String to = toDate + " 23:59:59";
        return reprtStatsRepository.countByConditions(reprtType, from, to);
    }

    /**
     * 등록 보고서 날짜별 통계
     */
    public List<Object[]> getReprtStatsByDate(String fromDate, String toDate) {
        String from = fromDate + " 00:00:00";
        String to = toDate + " 23:59:59";
        return reprtStatsRepository.countByDate(from, to);
    }

    /**
     * 보고서 유형별 통계
     */
    public List<Object[]> getReprtStatsByType(String fromDate, String toDate) {
        String from = fromDate + " 00:00:00";
        String to = toDate + " 23:59:59";
        return reprtStatsRepository.countByReprtType(from, to);
    }

    /**
     * 보고서 상태별 통계
     */
    public List<Object[]> getReprtStatsByStatus(String fromDate, String toDate) {
        String from = fromDate + " 00:00:00";
        String to = toDate + " 23:59:59";
        return reprtStatsRepository.countByReprtSttus(from, to);
    }

    /**
     * 보고서 통계 데이터 등록
     */
    @Transactional
    public void insertReprtStats(ReprtStats reprtStats) throws Exception {
        String reprtId = reprtStatsIdGnrService.getNextStringId();
        ReprtStats newStats = ReprtStats.builder()
                .reprtId(reprtId)
                .reprtNm(reprtStats.getReprtNm())
                .reprtType(reprtStats.getReprtType())
                .reprtSttus(reprtStats.getReprtSttus())
                .build();
        reprtStatsRepository.save(Objects.requireNonNull(newStats));
    }

    // ========== 데이터 사용현황 ==========

    /**
     * 데이터 사용현황 목록 조회
     */
    public Page<DtaUseStats> getDtaUseStatsList(String fromDate, String toDate, int page, int size) {
        String from = fromDate + " 00:00:00";
        String to = toDate + " 23:59:59";
        return dtaUseStatsRepository.findByDateRange(from, to, PageRequest.of(page, size));
    }

    /**
     * 데이터 사용현황 전체 건수
     */
    public long getDtaUseStatsCount(String fromDate, String toDate) {
        String from = fromDate + " 00:00:00";
        String to = toDate + " 23:59:59";
        return dtaUseStatsRepository.countByDateRange(from, to);
    }

    /**
     * 등록 대기 데이터 사용현황
     */
    public List<Object[]> getDtaUseStatsByDate(String fromDate, String toDate) {
        String from = fromDate + " 00:00:00";
        String to = toDate + " 23:59:59";
        return dtaUseStatsRepository.countByDate(from, to);
    }

    /**
     * 게시판별 데이터 사용현황
     */
    public List<Object[]> getDtaUseStatsByBbs(String fromDate, String toDate) {
        String from = fromDate + " 00:00:00";
        String to = toDate + " 23:59:59";
        return dtaUseStatsRepository.countByBbsId(from, to);
    }

    /**
     * 날짜별 게시판 활동 통계
     */
    public List<Object[]> getBbsStatsByDate(String fromDate, String toDate) {
        String from = fromDate + " 00:00:00";
        String to = toDate + " 23:59:59";
        return dtaUseStatsRepository.countByDate(from, to);
    }
}
