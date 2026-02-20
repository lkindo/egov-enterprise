package com.company.project.api.controller.stats;

import egovframework.com.sts.com.StatsVO;

import egovframework.com.sts.cst.service.EgovConectStatsService;

import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.GetMapping;

import org.springframework.web.bind.annotation.RequestMapping;

import org.springframework.web.bind.annotation.RequestParam;

import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**

 * ?          ???  ?API ?      ?      ?      

 */

@RestController("connectStatsController")

@RequestMapping("/api/v1/stats")

public class ConnectStatsController {

    private final EgovConectStatsService connectStatsService;

    public ConnectStatsController(

            @org.springframework.context.annotation.Lazy EgovConectStatsService connectStatsService) {

        this.connectStatsService = connectStatsService;

    }

    /**

     * ?          ???  ?         ??

     * 

     * @param pdKind                            ???(Y: ?            ? M: ?        ? D: ??     ?

     * @param statsKind       ???        ???(SERVICE: ??      ??     ? PRSONAL:          ?      ?

     * @param fromDate        ??      ??       (YYYYMMDD)

     * @param toDate          ?         ??       (YYYYMMDD)

     * @param detailStatsKind ?   ????        ???(??      ??       ?   ?    ????      )

     * @return ???  ?         ???         ??

     */

    @GetMapping("/connect")

    public ResponseEntity<List<?>> getConnectStats(

            @RequestParam(required = false, defaultValue = "D") String pdKind,

            @RequestParam(required = false, defaultValue = "SERVICE") String statsKind,

            @RequestParam(required = false) String fromDate,

            @RequestParam(required = false) String toDate,

            @RequestParam(required = false) String detailStatsKind) throws Exception {

        StatsVO statsVO = new StatsVO();

        statsVO.setPdKind(pdKind);

        statsVO.setStatsKind(statsKind);

        statsVO.setFromDate(fromDate != null ? fromDate.replace("-", "") : "");

        statsVO.setToDate(toDate != null ? toDate.replace("-", "") : "");

        statsVO.setDetailStatsKind(detailStatsKind);

        List<StatsVO> resultList = (List<StatsVO>) connectStatsService.selectConectStats(statsVO);

        return ResponseEntity.ok(resultList);

    }

}

