package com.company.project.api.controller.stats;

import egovframework.com.sts.bst.service.EgovBbsStatsService;
import egovframework.com.sts.com.StatsVO;
import egovframework.com.sts.ust.service.EgovUserStatsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.List;

/**
 * 게시판 및 사용자 통계 API 컨트롤러
 */
@RestController
@RequestMapping("/api/v1/stats")
public class BbsUserStatsController {

    private final EgovBbsStatsService bbsStatsService;
    private final EgovUserStatsService userStatsService;

    public BbsUserStatsController(@org.springframework.context.annotation.Lazy EgovBbsStatsService bbsStatsService,
            @org.springframework.context.annotation.Lazy EgovUserStatsService userStatsService) {
        this.bbsStatsService = bbsStatsService;
        this.userStatsService = userStatsService;
    }

    /**
     * 게시판 통계 조회
     */
    @GetMapping("/bbs")
    public ResponseEntity<List<StatsVO>> getBbsStats(
            @RequestParam(required = false, defaultValue = "D") String pdKind,
            @RequestParam(required = false, defaultValue = "COM101") String statsKind,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false) String detailStatsKind,
            @RequestParam(required = false, defaultValue = "tab1") String tabKind) throws Exception {

        StatsVO statsVO = new StatsVO();
        statsVO.setPdKind(pdKind);
        statsVO.setStatsKind(statsKind);
        statsVO.setFromDate(fromDate != null ? fromDate.replace("-", "") : "");
        statsVO.setToDate(toDate != null ? toDate.replace("-", "") : "");
        statsVO.setDetailStatsKind(detailStatsKind);
        statsVO.setTabKind(tabKind);

        List<StatsVO> resultList;
        if ("tab1".equals(tabKind)) {
            resultList = bbsStatsService.selectBbsCretCntStats(statsVO);
        } else if ("tab2".equals(tabKind)) {
            resultList = bbsStatsService.selectBbsTotCntStats(statsVO);
        } else if ("tab3".equals(tabKind)) {
            resultList = bbsStatsService.selectBbsAvgCntStats(statsVO);
        } else if ("tab4".equals(tabKind)) {
            resultList = bbsStatsService.selectBbsMaxCntStats(statsVO);
        } else if ("tab5".equals(tabKind)) {
            resultList = bbsStatsService.selectBbsMinCntStats(statsVO);
        } else if ("tab6".equals(tabKind)) {
            resultList = bbsStatsService.selectBbsMaxUserStats(statsVO);
        } else {
            resultList = Collections.emptyList();
        }

        return ResponseEntity.ok(resultList);
    }

    /**
     * 사용자 통계 조회
     */
    @GetMapping("/user")
    public ResponseEntity<List<StatsVO>> getUserStats(
            @RequestParam(required = false, defaultValue = "D") String pdKind,
            @RequestParam(required = false, defaultValue = "COM012") String statsKind,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false) String detailStatsKind) throws Exception {

        StatsVO statsVO = new StatsVO();
        statsVO.setPdKind(pdKind);
        statsVO.setStatsKind(statsKind);
        statsVO.setFromDate(fromDate != null ? fromDate.replace("-", "") : "");
        statsVO.setToDate(toDate != null ? toDate.replace("-", "") : "");
        statsVO.setDetailStatsKind(detailStatsKind);

        List<StatsVO> resultList = userStatsService.selectUserStats(statsVO);

        return ResponseEntity.ok(resultList);
    }
}
