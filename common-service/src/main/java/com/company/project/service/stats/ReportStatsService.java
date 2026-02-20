package com.company.project.service.stats;

import com.company.project.domain.stats.DtaUseStats;
import com.company.project.domain.stats.DtaUseStatsRepository;
import com.company.project.domain.stats.ReprtStats;
import com.company.project.domain.stats.ReprtStatsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;

/**
 * 蹂닿퀬?쒗넻怨?諛??먮즺?댁슜?꾪솴?듦퀎 JPA ?쒕퉬??
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportStatsService {

    private final ReprtStatsRepository reprtStatsRepository;
    private final DtaUseStatsRepository dtaUseStatsRepository;

    @jakarta.annotation.Resource(name = "reprtStatsIdGnrService")
    private org.egovframe.rte.fdl.idgnr.EgovIdGnrService reprtStatsIdGnrService;

    // ========== 蹂닿퀬???듦퀎 ==========

    /**
     * 蹂닿퀬???듦퀎 紐⑸줉 議고쉶
     */
    public Page<ReprtStats> getReprtStatsList(String reprtTy, String fromDate, String toDate, int page, int size) {
        String from = fromDate + " 00:00:00";
        String to = toDate + " 23:59:59";
        return reprtStatsRepository.findByConditions(reprtTy, from, to, PageRequest.of(page, size));
    }

    /**
     * 蹂닿퀬???듦퀎 ?꾩껜 嫄댁닔
     */
    public long getReprtStatsCount(String reprtTy, String fromDate, String toDate) {
        String from = fromDate + " 00:00:00";
        String to = toDate + " 23:59:59";
        return reprtStatsRepository.countByConditions(reprtTy, from, to);
    }

    /**
     * ?깅줉?쇰퀎 蹂닿퀬???듦퀎
     */
    public List<Object[]> getReprtStatsByDate(String fromDate, String toDate) {
        String from = fromDate + " 00:00:00";
        String to = toDate + " 23:59:59";
        return reprtStatsRepository.countByDate(from, to);
    }

    /**
     * 蹂닿퀬???좏삎蹂??듦퀎
     */
    public List<Object[]> getReprtStatsByType(String fromDate, String toDate) {
        String from = fromDate + " 00:00:00";
        String to = toDate + " 23:59:59";
        return reprtStatsRepository.countByReprtTy(from, to);
    }

    /**
     * 蹂닿퀬???곹깭蹂??듦퀎
     */
    public List<Object[]> getReprtStatsByStatus(String fromDate, String toDate) {
        String from = fromDate + " 00:00:00";
        String to = toDate + " 23:59:59";
        return reprtStatsRepository.countByReprtSttus(from, to);
    }

    /**
     * 蹂닿퀬???듦퀎 ?깅줉
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

    // ========== ?먮즺?댁슜?꾪솴 ?듦퀎 ==========

    /**
     * ?먮즺?댁슜?꾪솴 ?듦퀎 紐⑸줉 議고쉶
     */
    public Page<DtaUseStats> getDtaUseStatsList(String fromDate, String toDate, int page, int size) {
        String from = fromDate + " 00:00:00";
        String to = toDate + " 23:59:59";
        return dtaUseStatsRepository.findByDateRange(from, to, PageRequest.of(page, size));
    }

    /**
     * ?먮즺?댁슜?꾪솴 ?듦퀎 ?꾩껜 嫄댁닔
     */
    public long getDtaUseStatsCount(String fromDate, String toDate) {
        String from = fromDate + " 00:00:00";
        String to = toDate + " 23:59:59";
        return dtaUseStatsRepository.countByDateRange(from, to);
    }

    /**
     * ?깅줉?쇰퀎 ?먮즺?댁슜?꾪솴 ?듦퀎
     */
    public List<Object[]> getDtaUseStatsByDate(String fromDate, String toDate) {
        String from = fromDate + " 00:00:00";
        String to = toDate + " 23:59:59";
        return dtaUseStatsRepository.countByDate(from, to);
    }

    /**
     * 寃뚯떆?먮퀎 ?먮즺?댁슜?꾪솴 ?듦퀎
     */
    public List<Object[]> getDtaUseStatsByBbs(String fromDate, String toDate) {
        String from = fromDate + " 00:00:00";
        String to = toDate + " 23:59:59";
        return dtaUseStatsRepository.countByBbsId(from, to);
    }
}
