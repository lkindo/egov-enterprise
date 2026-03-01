package egovframework.com.sts.bst.web;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

import org.apache.commons.validator.GenericValidator;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.service.CmmnDetailCode;
import egovframework.com.cmm.service.EgovCmmUseService;
import egovframework.com.sts.bst.service.EgovBbsStatsService;
import egovframework.com.sts.com.StatsVO;
import jakarta.annotation.Resource;

/**
 * 寃뚯떆臾??듦퀎 寃??而⑦듃濡ㅻ윭 ?대옒??
 * 
 * @author 怨듯넻?쒕퉬??媛쒕컻? 諛뺤???
 * @since 2009.03.19
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.19  諛뺤???         理쒖큹 ?앹꽦
 *   2011.06.30  ?닿린??         ?⑦궎吏 遺꾨━(sts -> sts.bst)
 *   2011.08.26  ?뺤쭊??         IncludedInfo annotation 異붽?
 *   2018.05.02  ?좎슜??         寃뚯떆?먯쑀?뺣퀎 肄붾뱶遺꾨쪟 蹂寃?(COM004 => COM101), 寃뚯떆?먯냽?깅퀎(COM009) 肄붾뱶遺꾨쪟 ?ъ슜?섏? ?딆쓬
 *   2025.07.01  ?대갚??         而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-UselessParentheses(遺덊븘?뷀븳 愿꾪샇?ъ슜)
 *
 *      </pre>
 */
@Controller
public class EgovBbsStatsController {

	/** EgovBbsStatsService */
	@Resource(name = "bbsStatsService")
	private EgovBbsStatsService bbsStatsService;

	/** EgovCmmUseService */
	@Resource(name = "EgovCmmUseService")
	private EgovCmmUseService cmmUseService;

	/**
	 * 寃뚯떆臾??듦퀎瑜?議고쉶?쒕떎
	 * 
	 * @param statsVO StatsVO
	 * @return String
	 * @exception Exception
	 */
	@IncludedInfo(name = "寃뚯떆臾쇳넻怨?, listUrl = "/sts/bst/selectBbsStats.do", order = 120, gid = 30)
	@RequestMapping(value = "/sts/bst/selectBbsStats.do")
	public String selectBbsStats(@ModelAttribute("statsVO") StatsVO statsVO, ModelMap model) throws Exception {

		// ?몃??듦퀎援щ텇 怨듯넻肄붾뱶 紐⑸줉 議고쉶(寃뚯떆?먯쑀???띿꽦??????몃??듦퀎援щ텇肄붾뱶)
		ComDefaultCodeVO vo = new ComDefaultCodeVO();

		vo.setCodeId("COM101");
		List<CmmnDetailCode> code004 = cmmUseService.selectCmmCodeDetail(vo);
		vo.setCodeId("COM005");
		List<CmmnDetailCode> code005 = cmmUseService.selectCmmCodeDetail(vo);

		model.addAttribute("COM101", code004);
		model.addAttribute("COM005", code005);

		if (statsVO.getFromDate() != null && !"".equals(statsVO.getFromDate())) {

			// ??뎄遺?: ?앹꽦湲??tab1), 珥앹“?뚯닔(tab2), ?됯퇏議고쉶??tab3), 理쒓퀬/理쒖냼議고쉶??tab4), 理쒓퀬寃뚯떆??tab5)
			List<StatsVO> bbsStatsList = null;
			List<StatsVO> bbsMaxStatsList = null;
			List<StatsVO> bbsMinStatsList = null;
			List<StatsVO> bbsMaxNtcrList = null;

			// 1. ?앹꽦湲??tab1)
			if ("tab1".equals(statsVO.getTabKind())) {
				// ?앹꽦湲??議고쉶
				bbsStatsList = bbsStatsService.selectBbsCretCntStats(statsVO);
				// 洹몃옒??湲몄씠 ?ㅼ젙
				float iMaxUnit = 50.0f;
				for (StatsVO element : bbsStatsList) {
					StatsVO sVO = element;
					int iCnt = sVO.getStatsCo();
					if (iCnt > 10 && iCnt <= 100) {
						if (iMaxUnit > 5.0f) {
							iMaxUnit = 5.0f;
						}
					} else if (iCnt > 100 && iCnt <= 1000) {
						if (iMaxUnit > 0.5f) {
							iMaxUnit = 0.5f;
						}
					} else if (iCnt > 1000) {
						if (iMaxUnit > 0.05f) {
							iMaxUnit = 0.05f;
						}
					}
				}
				statsVO.setMaxUnit(iMaxUnit);
				// 寃곌낵 由ы꽩
				model.addAttribute("bbsStatsList", bbsStatsList);
				model.addAttribute("statsInfo", statsVO);

				// 2. 珥앹“?뚯닔(tab2)
			} else if ("tab2".equals(statsVO.getTabKind())) {
				// 珥앹“?뚯닔 議고쉶
				bbsStatsList = bbsStatsService.selectBbsTotCntStats(statsVO);
				// 洹몃옒??湲몄씠 ?ㅼ젙
				float iMaxUnit = 50.0f;
				for (StatsVO element : bbsStatsList) {
					StatsVO sVO = element;
					int iCnt = sVO.getStatsCo();
					if (iCnt > 10 && iCnt <= 100) {
						if (iMaxUnit > 5.0f) {
							iMaxUnit = 5.0f;
						}
					} else if (iCnt > 100 && iCnt <= 1000) {
						if (iMaxUnit > 0.5f) {
							iMaxUnit = 0.5f;
						}
					} else if (iCnt > 1000) {
						if (iMaxUnit > 0.05f) {
							iMaxUnit = 0.05f;
						}
					}
				}
				statsVO.setMaxUnit(iMaxUnit);
				// 寃곌낵 由ы꽩
				model.addAttribute("bbsStatsList", bbsStatsList);
				model.addAttribute("statsInfo", statsVO);

				// 3. ?됯퇏議고쉶??tab3)
			} else if ("tab3".equals(statsVO.getTabKind())) {
				// ?됯퇏議고쉶??議고쉶
				bbsStatsList = bbsStatsService.selectBbsAvgCntStats(statsVO);
				// 洹몃옒??湲몄씠 ?ㅼ젙
				float iMaxUnit = 50.0f;
				for (StatsVO element : bbsStatsList) {
					StatsVO sVO = element;
					int iCnt = (int) sVO.getAvrgInqireCo();
					sVO.setStatsCo(iCnt);
					if (iCnt > 10 && iCnt <= 100) {
						if (iMaxUnit > 5.0f) {
							iMaxUnit = 5.0f;
						}
					} else if (iCnt > 100 && iCnt <= 1000) {
						if (iMaxUnit > 0.5f) {
							iMaxUnit = 0.5f;
						}
					} else if (iCnt > 1000) {
						if (iMaxUnit > 0.05f) {
							iMaxUnit = 0.05f;
						}
					}
				}
				statsVO.setMaxUnit(iMaxUnit);
				// 寃곌낵 由ы꽩
				model.addAttribute("bbsStatsList", bbsStatsList);
				model.addAttribute("statsInfo", statsVO);

				// 4. 理쒓퀬/理쒖냼議고쉶??tab4)
			} else if ("tab4".equals(statsVO.getTabKind())) {
				// 理쒓퀬寃뚯떆湲 ?뺣낫 議고쉶
				bbsMaxStatsList = bbsStatsService.selectBbsMaxCntStats(statsVO);
				// 理쒖냼寃뚯떆湲 ?뺣낫 議고쉶
				bbsMinStatsList = bbsStatsService.selectBbsMinCntStats(statsVO);
				// 寃곌낵 由ы꽩
				model.addAttribute("bbsMaxStatsList", bbsMaxStatsList);
				model.addAttribute("bbsMinStatsList", bbsMinStatsList);
				model.addAttribute("statsInfo", statsVO);

				// 5. 理쒓퀬寃뚯떆??tab5)
			} else if ("tab5".equals(statsVO.getTabKind())) {

				bbsMaxNtcrList = bbsStatsService.selectBbsMaxUserStats(statsVO);
				// 寃곌낵 由ы꽩
				model.addAttribute("bbsMaxNtcrList", bbsMaxNtcrList);
				model.addAttribute("statsInfo", statsVO);
			}
			if (GenericValidator.isDate(statsVO.getFromDate(), "yyyyMMdd", true)) {
				model.addAttribute("fDate", LocalDate.parse(statsVO.getFromDate(), DateTimeFormatter.BASIC_ISO_DATE)
						.format(DateTimeFormatter.ISO_LOCAL_DATE));
			}
			if (GenericValidator.isDate(statsVO.getToDate(), "yyyyMMdd", true)) {
				model.addAttribute("tDate", LocalDate.parse(statsVO.getToDate(), DateTimeFormatter.BASIC_ISO_DATE)
						.format(DateTimeFormatter.ISO_LOCAL_DATE));
			}
		} else {
			statsVO.setTabKind("tab1");
			model.addAttribute("statsInfo", statsVO);
		}

		return "egovframework/com/sts/bst/EgovBbsStats";
	}
}
