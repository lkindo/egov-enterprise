package com.company.project.api.controller.stats;

import com.company.project.service.log.dto.StatsVO;

import lombok.RequiredArgsConstructor;

import org.springframework.ui.Model;

import org.springframework.web.bind.annotation.RequestParam;

import java.util.ArrayList;

import java.util.HashMap;

import java.util.Map;

/**

 * ?         ???  ?   ?         ??         ???      ?      ?      

 */

// @Controller

@RequiredArgsConstructor

public class StatisticsController {

    /**

     * ?         ???  ?         ??

     */

    // @RequestMapping("/sts/cst/selectConectStats.do")

    public String selectConectStats(

            @RequestParam(required = false) String pdKind,

            @RequestParam(required = false) String statsKind,

            @RequestParam(required = false) String fromDate,

            @RequestParam(required = false) String toDate,

            Model model) {

        Map<String, Object> statsInfo = new HashMap<>();

        statsInfo.put("pdKind", pdKind != null ? pdKind : "D"); //          ??   ?'??     ?

        statsInfo.put("statsKind", statsKind != null ? statsKind : "SERVICE"); //          ??   ?'??      ??     ?

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

     *          ?      ?      ??         ??

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

     * // ?      ?               

     * model.addAttribute("COM101", commonCodeService.getCodesByGroup("COM101")); //

     *          ??   ????

     * model.addAttribute("COM005", commonCodeService.getCodesByGroup("COM005")); //

     *          ??        ???   

     * 

     * return "sts/EgovBbsStats";

     * }

     */

}
