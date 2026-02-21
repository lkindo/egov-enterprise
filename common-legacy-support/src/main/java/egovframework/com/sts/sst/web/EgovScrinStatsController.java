package egovframework.com.sts.sst.web;

import java.util.List;

import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;

import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.sts.com.StatsVO;
import egovframework.com.sts.sst.service.EgovScrinStatsService;
import egovframework.com.sym.mnu.mpm.service.EgovMenuManageService;
import egovframework.com.sym.mnu.mpm.service.MenuManageVO;
import jakarta.annotation.Resource;

/**
 * ? ????????? ?????
 * 
 * @author ???????? ???
 * @since 2009.03.19
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == ?????Modification Information) ==
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.03.19  ???         ????
 *   2011.06.30  ????         ??? ???sts -> sts.sst)
 *   2011.08.26  ???         IncludedInfo annotation ??
 *   2025.07.03  ????         ??????PMD???????? ????????-LocalVariableNamingConventions(final??? ?? ??????????)
 *
 *      </pre>
 **/
@Controller
public class EgovScrinStatsController {

	/** EgovConectStatsService **/
	@Resource(name = "scrinStatsService")
	private EgovScrinStatsService scrinStatsService;

	/** EgovMenuManageService **/
	@Resource(name = "menuManageService")
	private EgovMenuManageService menuManageService;

	/**
	 * ? ???????
	 * 
	 * @param statsVO StatsVO
	 * @return String
	 * @exception Exception
	 **/
	@IncludedInfo(name = "Name", listUrl = "", order = 1, gid = 50)
	@RequestMapping(value = "/sts/sst/selectScrinStats.do")
	public String selectScrinStats(@ModelAttribute("statsVO") StatsVO statsVO, ModelMap model) throws Exception {

		// ?????
		List<MenuManageVO> resultMenuList = menuManageService.selectMenuList();
		model.addAttribute("list_menulist", resultMenuList);

		if (statsVO.getFromDate() != null && !"".equals(statsVO.getFromDate())) {

			List<StatsVO> scrinStats = scrinStatsService.selectScrinStats(statsVO);
			// ?? ??????? ?????.
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
