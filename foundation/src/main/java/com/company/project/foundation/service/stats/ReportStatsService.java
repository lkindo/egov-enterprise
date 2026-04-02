package com.company.project.foundation.service.stats;

import com.company.project.foundation.domain.stats.DtaUseStats;
import com.company.project.foundation.domain.stats.DtaUseStatsRepository;
import com.company.project.foundation.domain.stats.ReprtStats;
import com.company.project.foundation.domain.stats.ReprtStatsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Objects;

/**
 * 蹂닿???넻???????슜?꾪솴????JPA ??퉬??
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportStatsService {

    private final ReprtStatsRepository reprtStatsRepository;
    private final DtaUseStatsRepository dtaUseStatsRepository;

    @jakarta.annotation.Resource(name = "reprtStatsIdGnrService")
    private org.egovframe.rte.fdl.idgnr.EgovIdGnrService reprtStatsIdGnrService;

    // ========== 蹂닿???????==========

    /**
     * 蹂닿紐⑸議고??     */
    public Page<ReprtStats> getReprtStatsList(String reprtTy, String fromDate, String toDate, int page, int size) {
        String from = fromDate + " 00:00:00";
        String to = toDate + " 23:59:59";
        return reprtStatsRepository.findByConditions(reprtTy, from, to, PageRequest.of(page, size));
    }

    /**
     * 蹂닿????????꾩껜 嫄댁??     */
    public long getReprtStatsCount(String reprtTy, String fromDate, String toDate) {
        String from = fromDate + " 00:00:00";
        String to = toDate + " 23:59:59";
        return reprtStatsRepository.countByConditions(reprtTy, from, to);
    }

    /**
     * ?깅줉蹂닿???????     */
    public List<Object[]> getReprtStatsByDate(String fromDate, String toDate) {
        String from = fromDate + " 00:00:00";
        String to = toDate + " 23:59:59";
        return reprtStatsRepository.countByDate(from, to);
    }

    /**
     * 蹂닿????좏삎?????     */
    public List<Object[]> getReprtStatsByType(String fromDate, String toDate) {
        String from = fromDate + " 00:00:00";
        String to = toDate + " 23:59:59";
        return reprtStatsRepository.countByReprtTy(from, to);
    }

    /**
     * 蹂닿????곹깭?????     */
    public List<Object[]> getReprtStatsByStatus(String fromDate, String toDate) {
        String from = fromDate + " 00:00:00";
        String to = toDate + " 23:59:59";
        return reprtStatsRepository.countByReprtSttus(from, to);
    }

    /**
     * 蹂닿????????깅줉
     */
    @Transactional
    public void insertReprtStats(ReprtStats reprtStats) throws Exception {
        String reprtId = reprtStatsIdGnrService.getNextStringId();
        ReprtStats newStats = ReprtStats.builder()
                .reprtId(reprtId)
                .reprtNm(reprtStats.getReprtNm())
                .reprtTy(reprtStats.getReprtTy())
                .reprtSttus(reprtStats.getReprtSttus())
                .frstRegisterId(reprtStats.getFrstRegisterId())
                .frstRegistPnttm(java.time.LocalDateTime.now())
                .lastUpdusrId(reprtStats.getFrstRegisterId())
                .lastUpdtPnttm(java.time.LocalDateTime.now())
                .build();
        reprtStatsRepository.save(Objects.requireNonNull(newStats));
    }

    // ========== ????슜?꾪솴 ????==========

    /**
     * ????슜?꾪솴 紐⑸議고??     */
    public Page<DtaUseStats> getDtaUseStatsList(String fromDate, String toDate, int page, int size) {
        String from = fromDate + " 00:00:00";
        String to = toDate + " 23:59:59";
        return dtaUseStatsRepository.findByDateRange(from, to, PageRequest.of(page, size));
    }

    /**
     * ????슜?꾪솴 ?????꾩껜 嫄댁??     */
    public long getDtaUseStatsCount(String fromDate, String toDate) {
        String from = fromDate + " 00:00:00";
        String to = toDate + " 23:59:59";
        return dtaUseStatsRepository.countByDateRange(from, to);
    }

    /**
     * ?깅줉???????슜?꾪솴 ????     */
    public List<Object[]> getDtaUseStatsByDate(String fromDate, String toDate) {
        String from = fromDate + " 00:00:00";
        String to = toDate + " 23:59:59";
        return dtaUseStatsRepository.countByDate(from, to);
    }

    /**
     * 寃뚯????????슜?꾪솴 ????     */
    public List<Object[]> getDtaUseStatsByBbs(String fromDate, String toDate) {
        String from = fromDate + " 00:00:00";
        String to = toDate + " 23:59:59";
        return dtaUseStatsRepository.countByBbsId(from, to);
    }
}
