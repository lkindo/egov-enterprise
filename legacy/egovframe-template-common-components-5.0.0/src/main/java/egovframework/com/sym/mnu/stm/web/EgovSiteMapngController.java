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
 * ?ъ씠?몃㏊ 議고쉶 泥섎━瑜??섎뒗 鍮꾩쫰?덉뒪 援ы쁽 ?대옒??
 * 
 * @author 媛쒕컻?섍꼍 媛쒕컻? ?댁슜
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 *      <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.20  ?? ??         理쒖큹 ?앹꽦
 *   2011.07.29  ?쒖???		?ъ씠??留??앹꽦 ?덊뻽????諛쒖깮?섎뒗 ?ㅻ쪟 ?섏젙
 *   2011.8.26	?뺤쭊??		IncludedInfo annotation 異붽?
 *      </pre>
 */

@Controller
public class EgovSiteMapngController {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovSiteMapngController.class);

	/** EgovPropertyService */
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	/** EgovSiteMapngService */
	@Resource(name = "siteMapngService")
	private EgovSiteMapngService siteMapngService;

	/** EgovMenuManageService */
	@Resource(name = "meunCreateManageService")
	private EgovMenuCreateManageService menuCreateManageService;

	/** EgovMessageSource */
	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/* ?ъ씠?몃㏊議고쉶 */
	/**
	 * ?ъ씠?몃㏊ ?붾㈃??議고쉶?쒕떎.
	 * 
	 * @param searchVO ComDefaultVO
	 * @return 異쒕젰?섏씠吏?뺣낫 "sym/mnu/stm/EgovSiteMapng"
	 * @exception Exception
	 */
	@IncludedInfo(name = "?ъ씠?몃㏊", order = 1101, gid = 60)
	@RequestMapping(value = "/sym/mnu/stm/EgovSiteMapng.do")
	public String selectSiteMapng(
			@ModelAttribute("searchVO") ComDefaultVO searchVO,
			ModelMap model)
			throws Exception {
		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		searchVO.setSearchKeyword(user.getId());
		// AuthorCode 寃??
		MenuCreatVO menuVO = menuCreateManageService.selectAuthorByUsr(searchVO);

		MenuSiteMapVO menuSiteMapVO = new MenuSiteMapVO();
		menuSiteMapVO.setAuthorCode(menuVO.getAuthorCode());
		menuSiteMapVO.setCreatPersonId(user == null ? "" : user.getId());
		List<EgovMap> resultList = menuCreateManageService.selectMenuCreatSiteMapList(menuSiteMapVO);

		LOGGER.debug("Count SiteMap ResultList = " + resultList.size());
		model.addAttribute("resultList", resultList);
		model.addAttribute("list_menulist", resultList);
		model.addAttribute("resultVO", menuSiteMapVO);

		model.addAttribute("authorCode", menuVO.getAuthorCode());

		return "egovframework/com/sym/mnu/stm/EgovSiteMapng";
	}
}