package com.company.project.api.controller.stats;

import com.company.project.service.code.CommonCodeService;
import com.company.project.service.log.dto.StatsVO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 접속통계 및 게시판통계 컨트롤러
 */
// @Controller
@RequiredArgsConstructor
public class StatisticsController {

    private final CommonCodeService commonCodeService;

    /**
     * 접속통계 조회
     */
    // @RequestMapping("/sts/cst/selectConectStats.do")
    public String selectConectStats(
            @RequestParam(required = false) String pdKind,
            @RequestParam(required = false) String statsKind,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            Model model) {

        Map<String, Object> statsInfo = new HashMap<>();
        statsInfo.put("pdKind", pdKind != null ? pdKind : "D"); // 기본값 '일별'
        statsInfo.put("statsKind", statsKind != null ? statsKind : "SERVICE"); // 기본값 '서비스별'
        statsInfo.put("fromDate", fromDate != null ? fromDate : "");
        statsInfo.put("toDate", toDate != null ? toDate : "");
        statsInfo.put("maxUnit", 1);

        model.addAttribute("statsInfo", statsInfo);
        model.addAttribute("conectStats", new ArrayList<StatsVO>());
        model.addAttribute("fDate", fromDate);
        model.addAttribute("tDate", toDate);

        return "sts/cst/EgovConectStats";
    }

    /**
     * 게시물통계 조회
     */
    /*
     * @RequestMapping("/sts/bst/selectBbsStats.do")
     * public String selectBbsStats(
     * 
     * @RequestParam(required = false) String pdKind,
     * 
     * @RequestParam(required = false) String statsKind,
     * 
     * @RequestParam(required = false) String fromDate,
     * 
     * @RequestParam(required = false) String toDate,
     * 
     * @RequestParam(required = false, defaultValue = "tab1") String tabKind,
     * Model model) {
     * 
     * Map<String, Object> statsInfo = new HashMap<>();
     * statsInfo.put("pdKind", pdKind != null ? pdKind : "D");
     * statsInfo.put("statsKind", statsKind != null ? statsKind : "COM101");
     * statsInfo.put("fromDate", fromDate != null ? fromDate : "");
     * statsInfo.put("toDate", toDate != null ? toDate : "");
     * statsInfo.put("tabKind", tabKind);
     * statsInfo.put("maxUnit", 1);
     * 
     * model.addAttribute("statsInfo", statsInfo);
     * model.addAttribute("bbsStatsList", new ArrayList<StatsVO>());
     * model.addAttribute("bbsMaxStatsList", new ArrayList<StatsVO>());
     * model.addAttribute("bbsMinStatsList", new ArrayList<StatsVO>());
     * model.addAttribute("bbsMaxNtcrList", new ArrayList<StatsVO>());
     * 
     * model.addAttribute("fDate", fromDate);
     * model.addAttribute("tDate", toDate);
     * 
     * // 공통코드
     * model.addAttribute("COM101", commonCodeService.getCodesByGroup("COM101")); //
     * 게시판유형
     * model.addAttribute("COM005", commonCodeService.getCodesByGroup("COM005")); //
     * 게시판템플릿
     * 
     * return "sts/EgovBbsStats";
     * }
     */
}
