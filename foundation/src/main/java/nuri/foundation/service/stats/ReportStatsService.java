package nuri.foundation.service.stats;

import nuri.foundation.domain.stats.DtaUseStats;
import nuri.foundation.domain.stats.DtaUseStatsRepository;
import nuri.foundation.domain.stats.ReprtStats;
import nuri.foundation.domain.stats.ReprtStatsRepository;
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
    private final nuri.foundation.domain.log.UserLogRepository userLogRepository;
    private final nuri.foundation.domain.log.LoginLogRepository loginLogRepository;

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

    // ========== 보고서 통계 ==========

    /**
     * 보고서 통계 목록 조회
     */
    public Page<ReprtStats> getReprtStatsList(String reprtTy, String fromDate, String toDate, int page, int size) {
        String from = fromDate + " 00:00:00";
        String to = toDate + " 23:59:59";
        return reprtStatsRepository.findByConditions(reprtTy, from, to, PageRequest.of(page, size));
    }

    /**
     * 보고서 통계 전체 건수
     */
    public long getReprtStatsCount(String reprtTy, String fromDate, String toDate) {
        String from = fromDate + " 00:00:00";
        String to = toDate + " 23:59:59";
        return reprtStatsRepository.countByConditions(reprtTy, from, to);
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
        return reprtStatsRepository.countByReprtTy(from, to);
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
                .reprtTy(reprtStats.getReprtTy())
                .reprtSttus(reprtStats.getReprtSttus())
                .createdBy(reprtStats.getCreatedBy())
                .createdDate(java.time.LocalDateTime.now())
                .lastModifiedBy(reprtStats.getCreatedBy())
                .lastModifiedDate(java.time.LocalDateTime.now())
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
