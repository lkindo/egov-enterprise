package egovframework.com.sts.ust.web;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.service.CmmnDetailCode;
import egovframework.com.cmm.service.EgovCmmUseService;
import egovframework.com.sts.com.StatsVO;
import egovframework.com.sts.ust.service.EgovUserStatsService;
import jakarta.annotation.Resource;

/**
 * ?ъ슜???듦퀎 寃??而⑦듃濡ㅻ윭 ?대옒??
 * @author 怨듯넻?쒕퉬??媛쒕컻? 諛뺤???
 * @since 2009.03.19
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??    ?섏젙??         ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *  2009.03.19  諛뺤???         理쒖큹 ?앹꽦
 *  2011.06.30  ?닿린??         ?⑦궎吏 遺꾨━(sts -> sts.sst)
 *  2011.8.26	?뺤쭊??		IncludedInfo annotation 異붽?
 *
 *  </pre>
 */


@Controller
public class EgovUserStatsController {

	/** EgovUserStatsService */
	@Resource(name = "userStatsService")
    private EgovUserStatsService userStatsService;

	/** EgovCmmUseService */
	@Resource(name="EgovCmmUseService")
	private EgovCmmUseService cmmUseService;

    /** log */
	private static final Logger LOGGER = LoggerFactory.getLogger(EgovUserStatsController.class);

    /**
	 * ?ъ슜???듦퀎瑜?議고쉶?쒕떎
	 * @param statsVO StatsVO
	 * @return String
	 * @exception Exception
	 */
    @IncludedInfo(name="?ъ슜?먰넻怨?, listUrl="/sts/ust/selectUserStats.do", order = 130 ,gid = 30)
    @RequestMapping(value="/sts/ust/selectUserStats.do")
	public String selectUserStats(@ModelAttribute("statsVO") StatsVO statsVO,
			ModelMap model) throws Exception {

    	// ?몃??듦퀎援щ텇 怨듯넻肄붾뱶 紐⑸줉 議고쉶(?뚯썝?좏삎,?곹깭,?깅퀎??????몃??듦퀎援щ텇肄붾뱶)
    	ComDefaultCodeVO vo = new ComDefaultCodeVO();

    	vo.setCodeId("COM012");
		List<CmmnDetailCode> code012 = cmmUseService.selectCmmCodeDetail(vo);
		vo.setCodeId("COM013");
		List<CmmnDetailCode> code013 = cmmUseService.selectCmmCodeDetail(vo);
		vo.setCodeId("COM014");
		List<CmmnDetailCode> code014 = cmmUseService.selectCmmCodeDetail(vo);

		model.addAttribute("COM012", code012);
		model.addAttribute("COM013", code013);
		model.addAttribute("COM014", code014);

		if (statsVO.getFromDate() != null && !"".equals(statsVO.getFromDate())) {

			List<StatsVO> userStats = userStatsService.selectUserStats(statsVO);
			LOGGER.debug("++++++++++++++++++++++ userStats.size() : {}", userStats.size());
			// 洹몃옒?꾩뿉 ?쒖떆???대?吏 湲몄씠瑜?寃곗젙?쒕떎.
			float iMaxUnit = 50.0f;
			for (StatsVO userStat : userStats) {
				StatsVO sVo = userStat;
				int iCnt = sVo.getStatsCo();
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

			model.addAttribute("userStats", userStats);
			model.addAttribute("statsInfo", statsVO);
		}
        return "egovframework/com/sts/ust/EgovUserStats";
	}
}
