**
 * 媛쒖슂
 * - ?먮즺?댁슜?꾪솴 ?듦퀎?????controller ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?먮즺?댁슜?꾪솴 ?듦퀎??????깅줉, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * - ?먮즺?댁슜?꾪솴 ?듦퀎??議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 *
 *
 *     ?섏젙??      		 ?섏젙??                  ?섏젙?댁슜
 *     -------          --------        ---------------------------
 *    2011.09.19     	 ?쒖???			珥덇린 寃뚯떆湲곌컙 ?ㅼ젙
 * @author lee.m.j
 * @version 1.0
 * @created 08-9-2009 ?ㅽ썑 1:40:19
 */

package egovframework.com.sts.dst.web;

import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.service.EgovCmmUseService;
import egovframework.com.sts.dst.service.DtaUseStatsVO;
import egovframework.com.sts.dst.service.EgovDtaUseStatsService;
import egovframework.com.utl.fcc.service.EgovDateUtil;
import jakarta.annotation.Resource;
/*
*
* ?곗씠???ъ슜 ?듦퀎 而⑦듃濡ㅻ윭 ?대옒??
* */
@Controller
public class EgovDtaUseStatsContoller {

	@Resource(name = "egovDtaUseStatsService")
	EgovDtaUseStatsService egovDtaUseStatsService;

    @Resource(name = "EgovCmmUseService")
    EgovCmmUseService egovCmmUseService;

	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/**
	 * ?먮즺?댁슜?꾪솴 ?듦퀎?뺣낫????곷ぉ濡앹쓣 議고쉶?쒕떎.
	 * @param reprtStatsVO - ?먮즺?댁슜?꾪솴 VO
	 * @return String
	 */
	@RequestMapping("/sts/dst/selectDtaUseStatsListView.do")
	public String selectDtaUseStatsListView(@ModelAttribute("comDefaultCodeVO") ComDefaultCodeVO comDefaultCodeVO,
			                                 @ModelAttribute("pmDtaUseStats") DtaUseStatsVO dtaUseStatsVO,
			                                 ModelMap model) throws Exception {

    	comDefaultCodeVO.setCodeId("COM042");
    	model.addAttribute("cmmCode042List", egovCmmUseService.selectCmmCodeDetail(comDefaultCodeVO));

		dtaUseStatsVO.setPmFromDate(EgovDateUtil.addMonth(EgovDateUtil.getToday(), -1));
		dtaUseStatsVO.setPmToDate(EgovDateUtil.getToday());
		model.addAttribute("pmDtaUseStats", dtaUseStatsVO);

		return "egovframework/com/sts/dst/EgovDtaUseStatsList";
	}

	/**
	 * ?먮즺?댁슜?꾪솴 ?듦퀎?뺣낫????곷ぉ濡앹쓣 議고쉶?쒕떎.
	 * @param reprtStatsVO - ?먮즺?댁슜?꾪솴 VO
	 * @return String
	 */
	@IncludedInfo(name="?먮즺?댁슜?꾪솴?듦퀎", listUrl="/sts/dst/selectDtaUseStatsListView.do", order = 161 ,gid = 30)
	@RequestMapping("/sts/dst/selectDtaUseStatsList.do")
	public String selectDtaUseStatsList(@RequestParam("pmFromDate") String pmFromDate,
            							@RequestParam("pmToDate") String pmToDate,
            							@ModelAttribute("dtaUseStatsVO") DtaUseStatsVO dtaUseStatsVO,
			                            @ModelAttribute("comDefaultCodeVO") ComDefaultCodeVO comDefaultCodeVO,
			                             ModelMap model) throws Exception {

		/** paging */
    	PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(dtaUseStatsVO.getPageIndex());
	    paginationInfo.setRecordCountPerPage(5);
		paginationInfo.setPageSize(dtaUseStatsVO.getPageSize());

		dtaUseStatsVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		dtaUseStatsVO.setLastIndex(paginationInfo.getLastRecordIndex());
		dtaUseStatsVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		dtaUseStatsVO.setPmFromDate(pmFromDate);
		dtaUseStatsVO.setPmToDate(pmToDate);

		dtaUseStatsVO.setDtaUseStatsList(egovDtaUseStatsService.selectDtaUseStatsList(dtaUseStatsVO));
		model.addAttribute("dtaUseStatsList", dtaUseStatsVO.getDtaUseStatsList());

		int totPageCnt = egovDtaUseStatsService.selectDtaUseStatsListTotCnt(dtaUseStatsVO);
		paginationInfo.setTotalRecordCount(totPageCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		int totCnt = egovDtaUseStatsService.selectDtaUseStatsListBarTotCnt(dtaUseStatsVO);

		if (totCnt > 10 && totCnt <= 100) {
			if (dtaUseStatsVO.getMaxUnit() > 5.0f) {
				dtaUseStatsVO.setMaxUnit(5.0f);
			}
		} else if (totCnt > 100 && totCnt <= 1000) {
			if (dtaUseStatsVO.getMaxUnit() > 0.5f) {
				dtaUseStatsVO.setMaxUnit(0.5f);
			}
		} else if (dtaUseStatsVO.getMaxUnit() > 1000) {
			if (dtaUseStatsVO.getMaxUnit() > 0.05f) {
				dtaUseStatsVO.setMaxUnit(0.05f);
			}
		}

		dtaUseStatsVO.setDtaUseStatsBarList(egovDtaUseStatsService.selectDtaUseStatsBarList(dtaUseStatsVO));
		model.addAttribute("dtaUseStatsBarList", dtaUseStatsVO.getDtaUseStatsBarList());

    	comDefaultCodeVO.setCodeId("COM042");
    	model.addAttribute("cmmCode042List", egovCmmUseService.selectCmmCodeDetail(comDefaultCodeVO));

		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

/*		dtaUseStatsVO.setPmFromDate(EgovDateUtil.addMonth(EgovDateUtil.getToday(), -1));//2011.09.19
		dtaUseStatsVO.setPmToDate(EgovDateUtil.getToday());//2011.09.19
*/
		return "egovframework/com/sts/dst/EgovDtaUseStatsList";
	}

	/**
	 * ?먮즺?댁슜?꾪솴 ?듦퀎???곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param reprtStatsVO - ?먮즺?댁슜?꾪솴 VO
	 * @return String
	 */
	@RequestMapping("/sts/dst/getDtaUseStats.do")
	public String selectDtaUseStats(@ModelAttribute("dtaUseStatsVO") DtaUseStatsVO dtaUseStatsVO,
			                         ModelMap model) throws Exception {

		/** paging */
    	PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(dtaUseStatsVO.getPageIndex());
	    paginationInfo.setRecordCountPerPage(dtaUseStatsVO.getPageUnit());
		paginationInfo.setPageSize(dtaUseStatsVO.getPageSize());

		dtaUseStatsVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		dtaUseStatsVO.setLastIndex(paginationInfo.getLastRecordIndex());
		dtaUseStatsVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		dtaUseStatsVO.setDtaUseStatsList(egovDtaUseStatsService.selectDtaUseStats(dtaUseStatsVO));
		model.addAttribute("dtaUseStatsList", dtaUseStatsVO.getDtaUseStatsList());

		int totCnt = egovDtaUseStatsService.selectDtaUseStatsTotCnt(dtaUseStatsVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/sts/dst/EgovDtaUseStatsDetail";
	}


}
