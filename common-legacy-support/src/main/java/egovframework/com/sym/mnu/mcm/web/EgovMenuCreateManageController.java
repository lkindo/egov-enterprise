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
 * ?? ?? ???, ???? ??????? ???? ? ?????
 * 
 * @author ?? ?? ??
 * @since 2009.03.20
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == ?????Modification Information) ==
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.03.20  ??           ????
 * 	 2011.07.29  ?????         ???? ??????
 *	 2011.08.26  ???         IncludedInfo annotation ??
 *	 2013.06.17  ????         ???? ??????? ??
 *   2018.08.09  ???         X-XSS ??????? ???? ?????
 *   2018.09.10  ???         selectMenuCreatManagList ??????
 *   2025.07.17  ????         2025????????PMD???????? ????????-LocalVariableNamingConventions(final??? ?? ??????????)
 *
 *      </pre>
 **/
@Controller
public class EgovMenuCreateManageController {

	/* Validator */
	// @Autowired
	// private DefaultBeanValidator beanValidator;
	/** EgovPropertyService **/
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	/** EgovMenuManageService **/
	@Resource(name = "menuCreateManageService")
	private EgovMenuCreateManageService menuCreateManageService;

	/** EgovMessageSource **/
	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/*********** ???? ???****************/

	/**
	 * *????????.
	 *
	 * @param searchVO ComDefaultVO
	 * @return ????? "sym mnu/mcm/EgovMenuCreatManage"   
	 * @exception Exception
	 */
	@IncludedInfo(name = "Name", listUrl = "", order = 1, gid = 50)
	@RequestMapping(value = "/sym/mnu/mcm/EgovMenuCreatManageSelect.do")
	public String selectMenuCreatManagList(@ModelAttribute("searchVO") ComDefaultVO searchVO, ModelMap model)
			throws Exception {
		String resultMsg = "";
		// 0. Spring Security ?????????
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
		// ?? ??
		/** EgovPropertyService.sample **/
		searchVO.setPageUnit(propertiesService.getInt("pageUnit"));
		searchVO.setPageSize(propertiesService.getInt("pageSize"));

		/** pageing **/
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
		 * AuthorCode ??MenuCreatVO vo = new MenuCreatVO(); vo =
		 * menuCreateManageService.selectAuthorByUsr(searchVO);
		 * searchVO.setSearchKeyword(vo.getAuthorCode()); } }
		 */
		List<EgovMap> resultList = menuCreateManageService.selectMenuCreatManagList(searchVO);
		if (resultList.size() == 0) {
			resultMsg = egovMessageSource.getMessage("info.nodata.msg");
		}
		model.addAttribute("list_menumanage", resultList);

		int totCnt = menuCreateManageService.selectMenuCreatManagTotCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);
		model.addAttribute("resultMsg", resultMsg);
		return "egovframework/com/sym/mnu/mcm/EgovMenuCreatManage";
	}

	/**
	 * ??? ????????.
	 *
	 * @param menuCreatVO MenuCreatVO
	 * @return ????? "sym mnu/mcm/EgovMenuCreat"   
	 * @exception Exception
	 */
	@RequestMapping(value = "/sym/mnu/mcm/EgovMenuCreatSelect.do")
	public String selectMenuCreatList(@ModelAttribute MenuCreatVO menuCreatVO, ModelMap model) throws Exception {
		// 0. Spring Security ?????????
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
		List<EgovMap> resultList = menuCreateManageService.selectMenuCreatList(menuCreatVO);
		model.addAttribute("list_menulist", resultList);
		model.addAttribute("resultVO", menuCreatVO);

		return "egovframework/com/sym/mnu/mcm/EgovMenuCreat";
	}

	/**
	 * ????????????????.
	 *
	 * @param checkedAuthorForInsert String
	 * @param checkedMenuNoForInsert String
	 * @return ????? ????"forward: sym/mnu/mcm/EgovMenuCreatSelect.do"   
	 * @exception Exception
	 */
	@RequestMapping("/sym/mnu/mcm/EgovMenuCreatInsert.do")
	public String insertMenuCreatList(@RequestParam("checkedAuthorForInsert") String checkedAuthorForInsert,
			@RequestParam("checkedMenuNoForInsert") String checkedMenuNoForInsert,
			@ModelAttribute("menuCreatVO") MenuCreatVO menuCreatVO, ModelMap model) throws Exception {
		String resultMsg = "";
		// 0. Spring Security ?????????
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

	/* ????? ????*/
	/**
	 * ??????????????????.
	 *
	 * @param menuSiteMapVO MenuSiteMapVO
	 * @return ????? ????"sym mnu/mcm/EgovMenuCreatSiteMap"   
	 * @exception Exception
	 */
	@RequestMapping(value = "/sym/mnu/mcm/EgovMenuCreatSiteMapSelect.do")
	public String selectMenuCreatSiteMap(@ModelAttribute("menuSiteMapVO") MenuSiteMapVO menuSiteMapVO, ModelMap model)
			throws Exception {
		// 0. Spring Security ?????????
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
	 * ????? ??????????????. ???? ???? ??????
	 *
	 * @param menuSiteMapVO MenuSiteMapVO
	 * @param valueHtml     String
	 * @return ????? "sym mnu/mcm/EgovMenuCreatSiteMap"   
	 * @exception Exception
	 */
	/*
	 * @RequestMapping(value = "/sym/mnu/mcm/EgovMenuCreatSiteMapInsert.do") public
	 * String selectMenuCreatSiteMapInsert(@ModelAttribute("menuSiteMapVO")
	 * MenuSiteMapVO menuSiteMapVO, @RequestParam("valueHtml") String valueHtml,
	 * ModelMap model ,HttpServletResponse response) throws Exception { boolean
	 * chkCreat = false; String resultMsg = ""; // 0. Spring Security ?????????
	 * Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated(); if
	 * (!isAuthenticated) { model.addAttribute("message",
	 * egovMessageSource.getMessage("fail.common.login")); return
	 * "redirect:/uat/uia/egovLoginUsr.do"; }
	 * 
	 * //menuSiteMapVO.setTmpRootPath(EgovProperties.RELATIVE_PATH_PREFIX // + ".."
	 * + System.getProperty("file.separator") + ".." // +
	 * System.getProperty("file.separator") + "..");
	 * 
	 * // ???? ??? ?? ? ??//String currentPath =
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
	 * // ???? ??? ?? ? ??if ("WINDOWS".equals(Globals.OS_TYPE)) { // menuSiteMapVO
	 * // .setTmp_rootPath("D:/egovframework/workspace/egovcmm/src/main/webapp" //
	 * ); }else{menuSiteMapVO.setTmp_rootPath( //
	 * "/product/jeus/webhome/was_com/egovframework-com-1_0/egovframework-com-1_0_war___"
	 * // ); }
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

	/* ????? ????*/
	/**
	 * ??????????????????.
	 *
	 * @param menuSiteMapVO MenuSiteMapVO
	 * @return ????? ????"sym mnu/mcm/EgovMenuCreatSiteMap"   
	 * @exception Exception
	 */
	@RequestMapping(value = "/sym/mnu/mcm/EgovSiteMap.do")
	public String selectSiteMap(@ModelAttribute("menuCreatVO") MenuSiteMapVO menuSiteMapVO, ModelMap model)
			throws Exception {
		// 0. Spring Security ?????????
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
