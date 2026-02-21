package egovframework.com.sym.mnu.stm.web;

import java.util.List;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.sym.mnu.mcm.service.EgovMenuCreateManageService;
import egovframework.com.sym.mnu.mcm.service.MenuCreatVO;
import egovframework.com.sym.mnu.mcm.service.MenuSiteMapVO;
import egovframework.com.sym.mnu.stm.service.EgovSiteMapngService;
import jakarta.annotation.Resource;

/**
 * ???? ?????? ???? ? ?????
 * 
 * @author ?? ?? ??
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 *      <pre>
 * << ?????Modification Information) >>
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.03.20  ?? ??         ????
 *   2011.07.29  ?????		???????? ???????? ?? ??
 *   2011.8.26	???		IncludedInfo annotation ??
 *      </pre>
 **/

@Controller
public class EgovSiteMapngController {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovSiteMapngController.class);

	/** EgovPropertyService **/
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	/** EgovSiteMapngService **/
	@Resource(name = "siteMapngService")
	private EgovSiteMapngService siteMapngService;

	/** EgovMenuManageService **/
	@Resource(name = "menuCreateManageService")
	private EgovMenuCreateManageService menuCreateManageService;

	/** EgovMessageSource **/
	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/* ??????*/
	/**
	 * ???? ??????.
	 * 
	 * @param searchVO ComDefaultVO
	 * @return ????? "sym mnu/stm/EgovSiteMapng"   
	 * @exception Exception
	 */
	@IncludedInfo(name = "Legacy Controller", order = 1101, gid = 60)
	@RequestMapping(value = "/sym/mnu/stm/EgovSiteMapng.do")
	public String selectSiteMapng(
			@ModelAttribute("searchVO") ComDefaultVO searchVO,
			ModelMap model)
			throws Exception {
		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		searchVO.setSearchKeyword(user.getId());
		// AuthorCode ??
		MenuCreatVO menuVO = menuCreateManageService.selectAuthorByUsr(searchVO);

		MenuSiteMapVO menuSiteMapVO = new MenuSiteMapVO();
		menuSiteMapVO.setAuthorCode(menuVO.getAuthorCode());
		List<EgovMap> resultList = menuCreateManageService.selectMenuCreatSiteMapList(menuSiteMapVO);

		LOGGER.debug("Count SiteMap ResultList = " + resultList.size());
		model.addAttribute("resultList", resultList);
		model.addAttribute("authorCode", menuVO.getAuthorCode());

		return "egovframework/com/sym/mnu/stm/EgovSiteMapng";
	}
}
