package egovframework.com.sym.mnu.mcm.web;

import java.util.List;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.sym.mnu.mcm.service.EgovMenuCreateManageService;
import egovframework.com.sym.mnu.mcm.service.MenuCreatVO;
import egovframework.com.sym.mnu.mcm.service.MenuSiteMapVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;

/**
 * 硫붾돱紐⑸줉 愿由щ컦 硫붾돱?앹꽦, ?ъ씠?몃㏊ ?앹꽦??泥섎━?섎뒗 鍮꾩쫰?덉뒪 援ы쁽 ?대옒??
 * 
 * @author 媛쒕컻?섍꼍 媛쒕컻? ?댁슜
 * @since 2009.03.20
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.20  ?댁슜           理쒖큹 ?앹꽦
 * 	 2011.07.29  ?쒖???         ?ъ씠?몃㏊ ??κ꼍濡??섏젙
 *	 2011.08.26  ?뺤쭊??         IncludedInfo annotation 異붽?
 *	 2013.06.17  ?닿린??         ?ъ씠?몃㏊ ?앹꽦??寃쎈줈 ?ㅻ쪟 ?섏젙
 *   2018.08.09  ?좎슜??         X-XSS 愿???щ＼?먯꽌 ?ㅽ깘?섎뒗 遺遺??섏젙
 *   2018.09.10  ?좎슜??         selectMenuCreatManagList 遺덊븘?뷀븳 濡쒖쭅 ?쒓굅
 *   2025.07.17  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(final???꾨땶 蹂?섎뒗 諛묒쨪???ы븿?????놁쓬)
 *
 *      </pre>
 */
@Controller
public class EgovMenuCreateManageController {

	/* Validator */
//	@Autowired
//
                     DefaultBeanValidator beanValidator;
	/** EgovPropertyService */
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	/** EgovMenuManageService */
	@Resource(name = "meunCreateManageService")
	private EgovMenuCreateManageService menuCreateManageService;

	/** EgovMessageSource */
	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/*********** 硫붾돱 ?앹꽦 愿由?***************/

	/**
	 * *硫붾돱?앹꽦紐⑸줉??議고쉶?쒕떎.
	 *
	 * @param searchVO ComDefaultVO
	 * @return 異쒕젰?섏씠吏?뺣낫 "sym/mnu/mcm/EgovMenuCreatManage"
	 * @exception Exception
	 */
	@IncludedInfo(name = "硫붾돱?앹꽦愿由?, order = 1100, gid = 60)
	@RequestMapping(value = "/sym/mnu/mcm/EgovMenuCreatManageSelect.do")
	public String selectMenuCreatManagList(@ModelAttribute("searchVO") ComDefaultVO searchVO, ModelMap model)
			throws Exception {
		String resultMsg = "";
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
		// ?댁뿭 議고쉶
		/** EgovPropertyService.sample */
		searchVO.setPageUnit(propertiesService.getInt("pageUnit"));
		searchVO.setPageSize(propertiesService.getInt("pageSize"));

		/** pageing */
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(searchVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());
		paginationInfo.setPageSize(searchVO.getPageSize());

		searchVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		searchVO.setLastIndex(paginationInfo.getLastRecordIndex());
		searchVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());
		/*
		 * if (searchVO.getSearchKeyword() != null &&
		 * !searchVO.getSearchKeyword().equals("")) {
		 * 
		 * int IDcnt = menuCreateManageService.selectUsrByPk(searchVO); if (IDcnt == 0)
		 * { resultMsg = egovMessageSource.getMessage("info.nodata.msg"); } else { //
		 * AuthorCode 寃??MenuCreatVO vo = new MenuCreatVO(); vo =
		 * menuCreateManageService.selectAuthorByUsr(searchVO);
		 * searchVO.setSearchKeyword(vo.getAuthorCode()); } }
		 */
		List<EgovMap> resultList = menuCreateManageService.selectMenuCreatManagList(searchVO);
		if (resultList.size() == 0) {
			resultMsg = egovMessageSource.getMessage("info.nodata.msg");
		}
		model.addAttribute("resultList", resultList);

		int totCnt = menuCreateManageService.selectMenuCreatManagTotCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);
		model.addAttribute("resultMsg", resultMsg);
		return "egovframework/com/sym/mnu/mcm/EgovMenuCreatManage";
	}

	/**
	 * 硫붾돱?앹꽦 ?몃??붾㈃??議고쉶?쒕떎.
	 *
	 * @param menuCreatVO MenuCreatVO
	 * @return 異쒕젰?섏씠吏?뺣낫 "sym/mnu/mcm/EgovMenuCreat"
	 * @exception Exception
	 */
	@RequestMapping(value = "/sym/mnu/mcm/EgovMenuCreatSelect.do")
	public String selectMenuCreatList(@ModelAttribute MenuCreatVO menuCreatVO, ModelMap model) throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
		List<EgovMap> resultList = menuCreateManageService.selectMenuCreatList(menuCreatVO);
		model.addAttribute("resultList", resultList);
		model.addAttribute("resultVO", menuCreatVO);

		return "egovframework/com/sym/mnu/mcm/EgovMenuCreat";
	}

	/**
	 * 硫붾돱?앹꽦泥섎━ 諛?硫붾돱?앹꽦?댁뿭???깅줉?쒕떎.
	 *
	 * @param checkedAuthorForInsert String
	 * @param checkedMenuNoForInsert String
	 * @return 異쒕젰?섏씠吏?뺣낫 ?깅줉泥섎━??"forward:/sym/mnu/mcm/EgovMenuCreatSelect.do"
	 * @exception Exception
	 */
	@RequestMapping("/sym/mnu/mcm/EgovMenuCreatInsert.do")
	public String insertMenuCreatList(@RequestParam("checkedAuthorForInsert") String checkedAuthorForInsert,
			@RequestParam("checkedMenuNoForInsert") String checkedMenuNoForInsert,
			@ModelAttribute("menuCreatVO") MenuCreatVO menuCreatVO, ModelMap model) throws Exception {
		String resultMsg = "";
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
		String[] insertMenuNo = checkedMenuNoForInsert.split(",");
		if (insertMenuNo == null || (insertMenuNo.length == 0)) {
			resultMsg = egovMessageSource.getMessage("fail.common.insert");
		} else {
			menuCreateManageService.insertMenuCreatList(checkedAuthorForInsert, checkedMenuNoForInsert);
			resultMsg = egovMessageSource.getMessage("success.common.insert");
		}
		model.addAttribute("resultMsg", resultMsg);
		return "forward:/sym/mnu/mcm/EgovMenuCreatSelect.do";
	}

	/* 硫붾돱?ъ씠?몃㏊ ?앹꽦議고쉶 */
	/**
	 * 硫붾돱?ъ씠?몃㏊???앹꽦???댁슜??議고쉶?쒕떎.
	 *
	 * @param menuSiteMapVO MenuSiteMapVO
	 * @return 異쒕젰?섏씠吏?뺣낫 ?깅줉泥섎━??"sym/mnu/mcm/EgovMenuCreatSiteMap"
	 * @exception Exception
	 */
	@RequestMapping(value = "/sym/mnu/mcm/EgovMenuCreatSiteMapSelect.do")
	public String selectMenuCreatSiteMap(@ModelAttribute("menuSiteMapVO") MenuSiteMapVO menuSiteMapVO, ModelMap model)
			throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
		List<EgovMap> resultList = menuCreateManageService.selectMenuCreatSiteMapList(menuSiteMapVO);
		model.addAttribute("list_menulist", resultList);
		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		menuSiteMapVO.setCreatPersonId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));
		model.addAttribute("resultVO", menuSiteMapVO);
		return "egovframework/com/sym/mnu/mcm/EgovMenuCreatSiteMap";
	}

	/**
	 * 硫붾돱?ъ씠?몃㏊ ?앹꽦泥섎━ 諛??ъ씠?몃㏊???깅줉?쒕떎. 媛쒕컻?섍꼍?먯꽌 ?뚯뒪?몄슜 ?⑥닔濡?蹂댁븞 痍⑥빟
	 *
	 * @param menuSiteMapVO MenuSiteMapVO
	 * @param valueHtml     String
	 * @return 異쒕젰?섏씠吏?뺣낫 "sym/mnu/mcm/EgovMenuCreatSiteMap"
	 * @exception Exception
	 */
	/*
	 * @RequestMapping(value = "/sym/mnu/mcm/EgovMenuCreatSiteMapInsert.do") public
	 * String selectMenuCreatSiteMapInsert(@ModelAttribute("menuSiteMapVO")
	 * MenuSiteMapVO menuSiteMapVO, @RequestParam("valueHtml") String valueHtml,
	 * ModelMap model ,HttpServletResponse response) throws Exception { boolean
	 * chkCreat = false; String resultMsg = ""; // 0. Spring Security ?ъ슜?먭텒??泥섎━
	 * Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated(); if
	 * (!isAuthenticated) { model.addAttribute("message",
	 * egovMessageSource.getMessage("fail.common.login")); return
	 * "redirect:/uat/uia/egovLoginUsr.do"; }
	 * 
	 * //menuSiteMapVO.setTmpRootPath(EgovProperties.RELATIVE_PATH_PREFIX // + ".."
	 * + System.getProperty("file.separator") + ".." // +
	 * System.getProperty("file.separator") + "..");
	 * 
	 * // ?ъ씠?몃㏊ ?뚯씪 ?앹꽦 ?꾩튂 吏??//String currentPath =
	 * EgovMenuCreateManageController.class.getResource("").getPath(); String
	 * currentPath =
	 * EgovMenuCreateManageController.class.getProtectionDomain().getCodeSource() ==
	 * null ? "" :
	 * EgovStringUtil.isNullToString(EgovMenuCreateManageController.class.
	 * getProtectionDomain().getCodeSource().getLocation().getPath());
	 * //System.out.println("===>>> currentPath = "+currentPath); String path =
	 * currentPath.substring(0, currentPath.lastIndexOf("WEB-INF"));
	 * menuSiteMapVO.setTmpRootPath(path);
	 * menuSiteMapVO.setBndeFilePath("/html/egovframework/com/sym/mnu/mcm/");
	 * //System.out.println("===>>> path = "+path);
	 * //System.out.println("===>>> menuSiteMapVO.getMapCreatId() = "+menuSiteMapVO.
	 * getMapCreatId());
	 * 
	 * // ?ъ씠?몃㏊ ?뚯씪 ?앹꽦 ?꾩튂 吏??if ("WINDOWS".equals(Globals.OS_TYPE)) { // menuSiteMapVO
	 * // .setTmp_rootPath("D:/egovframework/workspace/egovcmm/src/main/webapp" //
	 * ); }else{menuSiteMapVO.setTmp_rootPath( //
	 * "/product/jeus/webhome/was_com/egovframework-com-1_0/egovframework-com-1_0_war___"
	 * // ); 
                    }
	 * 
	 * chkCreat = menuCreateManageService.creatSiteMap(menuSiteMapVO, valueHtml); if
	 * (!chkCreat) { resultMsg = egovMessageSource.getMessage("fail.common.insert");
	 * } else { resultMsg = egovMessageSource.getMessage("success.common.insert"); }
	 * List<?> list_menulist =
	 * menuCreateManageService.selectMenuCreatSiteMapList(menuSiteMapVO);
	 * 
	 * model.addAttribute("list_menulist", list_menulist);
	 * model.addAttribute("resultVO", menuSiteMapVO);
	 * model.addAttribute("resultMsg", resultMsg);
	 * 
	 * return "egovframework/com/sym/mnu/mcm/EgovMenuCreatSiteMap"; }
	 */

	/* 硫붾돱?ъ씠?몃㏊ ?앹꽦議고쉶 */
	/**
	 * 硫붾돱?ъ씠?몃㏊???앹꽦???댁슜??議고쉶?쒕떎.
	 *
	 * @param menuSiteMapVO MenuSiteMapVO
	 * @return 異쒕젰?섏씠吏?뺣낫 ?깅줉泥섎━??"sym/mnu/mcm/EgovMenuCreatSiteMap"
	 * @exception Exception
	 */
	@RequestMapping(value = "/sym/mnu/mcm/EgovSiteMap.do")
	public String selectSiteMap(@ModelAttribute("menuCreatVO") MenuSiteMapVO menuSiteMapVO, ModelMap model)
			throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		menuSiteMapVO.setCreatPersonId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));

		List<?> resultList = menuCreateManageService.selectSiteMapByUser(menuSiteMapVO);
		model.addAttribute("list_menulist", resultList);

		model.addAttribute("resultVO", menuSiteMapVO);
		return "egovframework/com/sym/mnu/mcm/EgovSiteMap";
	}

}
