package egovframework.com.sts.sst.web;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;

import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.sts.com.StatsVO;
import egovframework.com.sts.sst.service.EgovScrinStatsService;
import egovframework.com.sym.mnu.mpm.service.EgovMenuManageService;
import jakarta.annotation.Resource;

/**
 * ?붾㈃ ?듦퀎 寃??而⑦듃濡ㅻ윭 ?대옒??
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
 *   2011.06.30  ?닿린??         ?⑦궎吏 遺꾨━(sts -> sts.sst)
 *   2011.08.26  ?뺤쭊??         IncludedInfo annotation 異붽?
 *   2025.07.03  ?대갚??         而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(final???꾨땶 蹂?섎뒗 諛묒쨪???ы븿?????놁쓬)
 *
 *      </pre>
 */
@Controller
public class EgovScrinStatsController {

	/** EgovConectStatsService */
	@Resource(name = "scrinStatsService")
	private EgovScrinStatsService scrinStatsService;

	/** EgovMenuManageService */
	@Resource(name = "meunManageService")
	private EgovMenuManageService menuManageService;

	/**
	 * ?붾㈃ ?듦퀎瑜?議고쉶?쒕떎
	 * 
	 * @param statsVO StatsVO
	 * @return String
	 * @exception Exception
	 */
	@IncludedInfo(name = "?붾㈃?듦퀎", listUrl = "/sts/sst/selectScrinStats.do", order = 150, gid = 30)
	@RequestMapping(value = "/sts/sst/selectScrinStats.do")
	public String selectUserStats(@ModelAttribute("statsVO") StatsVO statsVO, ModelMap model) throws Exception {

		// ?몃━硫붾돱 議고쉶
		List<EgovMap> resultMenuList = menuManageService.selectMenuList();
		model.addAttribute("list_menulist", resultMenuList);

		if (statsVO.getFromDate() != null && !"".equals(statsVO.getFromDate())) {

			List<StatsVO> scrinStats = scrinStatsService.selectScrinStats(statsVO);
			// 洹몃옒?꾩뿉 ?쒖떆???대?吏 湲몄씠瑜?寃곗젙?쒕떎.
			float iMaxUnit = 50.0f;
			for (StatsVO scrinStat : scrinStats) {
				StatsVO sVo = scrinStat;
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

			model.addAttribute("scrinStats", scrinStats);
			model.addAttribute("statsInfo", statsVO);
		}
		return "egovframework/com/sts/sst/EgovScrinStats";
	}
}