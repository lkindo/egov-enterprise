package egovframework.com.sts.cst.web;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

import org.apache.commons.validator.GenericValidator;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;

import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.sts.com.StatsVO;
import egovframework.com.sts.cst.service.EgovConectStatsService;
import jakarta.annotation.Resource;

/**
 * ?묒냽 ?듦퀎 寃??而⑦듃濡ㅻ윭 ?대옒??
 * @author 怨듯넻?쒕퉬??媛쒕컻? 諛뺤???
 * @since 2009.03.19
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??         ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *  2009.03.19  諛뺤???         理쒖큹 ?앹꽦
 *  2011.06.30  ?닿린??         ?⑦궎吏 遺꾨━(sts -> sts.cst)
 *  2011.8.26	?뺤쭊??		IncludedInfo annotation 異붽?
 *
 *  </pre>
 */


@Controller
public class EgovConectStatsController {

	/** EgovConectStatsService */
	@Resource(name = "conectStatsService")
    private EgovConectStatsService conectStatsService;

	/** EgovCmmUseService */
/*	@Resource(name="EgovCmmUseService")
	private EgovCmmUseService cmmUseService;*/

    /**
	 * ?묒냽 ?듦퀎瑜?議고쉶?쒕떎
	 * @param statsVO StatsVO
	 * @return String
	 * @exception Exception
	 */
    @IncludedInfo(name="?묒냽?듦퀎", listUrl="/sts/cst/selectConectStats.do", order = 140 ,gid = 30)
    @RequestMapping(value="/sts/cst/selectConectStats.do")
	public String selectUserStats(@ModelAttribute("statsVO") StatsVO statsVO,
			ModelMap model) throws Exception {

		if (statsVO.getFromDate() != null && !"".equals(statsVO.getFromDate())) {

			List<StatsVO> conectStats = conectStatsService.selectConectStats(statsVO);

			// 1. ?쒕퉬?ㅻ퀎
			if ("SERVICE".equals(statsVO.getStatsKind())) {
				model.addAttribute("conectStats", conectStats);
				model.addAttribute("statsInfo", statsVO);
			// 2. 媛쒖씤蹂?
			} else {
				// 洹몃옒?꾩뿉 ?쒖떆???대?吏 湲몄씠瑜?寃곗젙?쒕떎.
				float iMaxUnit = 50.0f;
				for (StatsVO conectStat : conectStats) {
					StatsVO vo = conectStat;
					int iCnt = vo.getStatsCo();
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
				model.addAttribute("conectStats", conectStats);
				model.addAttribute("statsInfo", statsVO);
			}
			if (GenericValidator.isDate(statsVO.getFromDate(), "yyyyMMdd", true)) {
                model.addAttribute("fDate", (LocalDate.parse(statsVO.getFromDate(), DateTimeFormatter.BASIC_ISO_DATE).format(DateTimeFormatter.ISO_LOCAL_DATE)));
            }
            if (GenericValidator.isDate(statsVO.getToDate(), "yyyyMMdd", true)) {
                model.addAttribute("tDate", (LocalDate.parse(statsVO.getToDate(), DateTimeFormatter.BASIC_ISO_DATE).format(DateTimeFormatter.ISO_LOCAL_DATE)));
            }
		}
        return "egovframework/com/sts/cst/EgovConectStats";
	}
}