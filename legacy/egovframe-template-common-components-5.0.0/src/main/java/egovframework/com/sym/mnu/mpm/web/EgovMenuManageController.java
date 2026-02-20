package egovframework.com.sym.mnu.mpm.web;

import java.io.IOException;
import java.io.InputStream;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;

import org.apache.commons.io.FilenameUtils;
import org.apache.commons.lang.StringUtils;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;
import org.springframework.web.util.WebUtils;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.sym.mnu.mpm.service.EgovMenuManageService;
import egovframework.com.sym.mnu.mpm.service.MenuManageVO;
import egovframework.com.sym.prm.service.EgovProgrmManageService;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

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
 *   2011.07.01  ?쒖???         硫붾돱?뺣낫 ??젣??李몄“?섍퀬 ?덈뒗 ?섏쐞 硫붾돱媛 ?덈뒗吏 泥댄겕?섎뒗 濡쒖쭅 異붽?
 *   2011.07.27  ?쒖???         deleteMenuManageList() 硫붿꽌?쒖뿉??硫붾돱 硫????젣 踰꾧렇 ?섏젙
 *   2011.08.26  ?뺤쭊??         IncludedInfo annotation 異붽?
 *   2011.10.07  ?닿린??         蹂댁븞痍⑥빟???섏젙(?뚯씪 ?낅줈?쒖떆 ?묒??뚯씪留?媛?ν븯?꾨줉 異붽?)
 *   2015.05.28  議곗젙援?         硫붾돱由ъ뒪?멸?由??좏깮??"?뺤긽?곸쑝濡?議고쉶?섏뿀?듬땲???쇰뒗 alert李쎌씠 ?쒖씪 癒쇱? ?⑤뒗寃??섏젙 : 異쒕젰硫붿떆吏 二쇱꽍泥섎━
 *   2020.11.02  ?좎슜??         KISA 蹂댁븞?쎌젏 議곗튂 - ?먯썝?댁젣
 *   2021.02.16  ?좎슜??         WebUtils.getNativeRequest(request,MultipartHttpServletRequest.class);
 *   2022.11.11  源?쒖?          ?쒗걧?댁퐫??泥섎━
 *   2025.07.19  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-FormalParameterNamingConventions(蹂?섎챸??諛묒쨪 ?ъ슜)
 *   2025.07.19  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(final???꾨땶 蹂?섎뒗 諛묒쨪???ы븿?????놁쓬)
 *   2025.07.19  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-CloseResource(遺?곸젅???먯썝 ?댁젣)
 *
 *      </pre>
 */
@Controller
public class EgovMenuManageController {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovMenuManageController.class);

	/** EgovPropertyService */
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	/** EgovMenuManageService */
	@Resource(name = "meunManageService")
	private EgovMenuManageService menuManageService;

	/** EgovMenuManageService */
	@Resource(name = "progrmManageService")
	private EgovProgrmManageService progrmManageService;

	/** EgovMessageSource */
	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/**
	 * 硫붾돱?뺣낫紐⑸줉???곸꽭?붾㈃ ?몄텧 諛??곸꽭議고쉶?쒕떎.
	 * 
	 * @param searchKeyword String
	 * @return 異쒕젰?섏씠吏?뺣낫 "sym/mnu/mpm/EgovMenuDetailSelectUpdt"
	 * @exception Exception
	 */
	@RequestMapping(value = "/sym/mnu/mpm/EgovMenuManageListDetailSelect.do")
	public String selectMenuManage(@RequestParam("req_menuNo") String searchKeyword,
			@ModelAttribute("searchVO") ComDefaultVO searchVO, ModelMap model) throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
		searchVO.setSearchKeyword(searchKeyword);

		MenuManageVO resultVO = menuManageService.selectMenuManage(searchVO);
		model.addAttribute("menuManageVO", resultVO);

		return "egovframework/com/sym/mnu/mpm/EgovMenuDetailSelectUpdt";
	}

	/**
	 * 硫붾돱紐⑸줉 由ъ뒪?몄“?뚰븳??
	 * 
	 * @param searchVO ComDefaultVO
	 * @return 異쒕젰?섏씠吏?뺣낫 "sym/mnu/mpm/EgovMenuManage"
	 * @exception Exception
	 */
	@IncludedInfo(name = "硫붾돱愿由щ━?ㅽ듃", order = 1091, gid = 60)
	@RequestMapping(value = "/sym/mnu/mpm/EgovMenuManageSelect.do")
	public String selectMenuManageList(@ModelAttribute("searchVO") ComDefaultVO searchVO, ModelMap model)
			throws Exception {
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

		List<EgovMap> resultList = menuManageService.selectMenuManageList(searchVO);
		model.addAttribute("resultList", resultList);

		int totCnt = menuManageService.selectMenuManageListTotCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/sym/mnu/mpm/EgovMenuManage";
	}

	/**
	 * 硫붾돱紐⑸줉 硫????젣?쒕떎.
	 * 
	 * @param checkedMenuNoForDel String
	 * @return 異쒕젰?섏씠吏?뺣낫 "forward:/sym/mnu/mpm/EgovMenuManageSelect.do"
	 * @exception Exception
	 */
	@RequestMapping("/sym/mnu/mpm/EgovMenuManageListDelete.do")
	public String deleteMenuManageList(@RequestParam("checkedMenuNoForDel") String checkedMenuNoForDel,
			@ModelAttribute("menuManageVO") MenuManageVO menuManageVO, ModelMap model) throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
		String sLocationUrl = null;
		String resultMsg = "";

		String[] delMenuNo = checkedMenuNoForDel.split(",");
		if (delMenuNo.length != 0) {
			menuManageVO.setMenuNo(Integer.parseInt(delMenuNo[0]));
		}

		// 2022.11.11 ?쒗걧?댁퐫??泥섎━
		if (menuManageService.selectUpperMenuNoByPk(menuManageVO) != 0) {
			resultMsg = egovMessageSource.getMessage("fail.common.delete.upperMenuExist");
			sLocationUrl = "forward:/sym/mnu/mpm/EgovMenuManageSelect.do";
		} else if (delMenuNo.length == 0) {
			resultMsg = egovMessageSource.getMessage("fail.common.delete");
			sLocationUrl = "forward:/sym/mnu/mpm/EgovMenuManageSelect.do";
		} else {
			menuManageService.deleteMenuManageList(checkedMenuNoForDel);
			resultMsg = egovMessageSource.getMessage("success.common.delete");
			sLocationUrl = "forward:/sym/mnu/mpm/EgovMenuManageSelect.do";
		}
		model.addAttribute("resultMsg", resultMsg);
		return sLocationUrl;
	}

	/**
	 * 硫붾돱?뺣낫瑜??깅줉?붾㈃?쇰줈 ?대룞 諛??깅줉 ?쒕떎.
	 * @param menuManageVO    MenuManageVO
	 * @param commandMap      Map
	 * @return 異쒕젰?섏씠吏?뺣낫 ?깅줉?붾㈃ ?몄텧??"sym/mnu/mpm/EgovMenuRegist",
	 *         異쒕젰?섏씠吏?뺣낫 ?깅줉泥섎━??"forward:/sym/mnu/mpm/EgovMenuManageSelect.do"
	 * @exception Exception
	 */
	@RequestMapping(value = "/sym/mnu/mpm/EgovMenuRegistInsert.do")
	public String insertMenuManage(@RequestParam Map<?, ?> commandMap,
			@ModelAttribute("menuManageVO") MenuManageVO menuManageVO, BindingResult bindingResult, ModelMap model)
			throws Exception {
		String sLocationUrl = null;
		String resultMsg = "";
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
		String sCmd = commandMap.get("cmd") == null ? "" : (String)commandMap.get("cmd");
		if (sCmd.equals("insert")) {
			if (bindingResult.hasErrors()) {
				sLocationUrl = "egovframework/com/sym/mnu/mpm/EgovMenuRegist";
				return sLocationUrl;
			}
			if (menuManageService.selectMenuNoByPk(menuManageVO) == 0) {
				ComDefaultVO searchVO = new ComDefaultVO();
				searchVO.setSearchKeyword(menuManageVO.getProgrmFileNm());
				if (progrmManageService.selectProgrmNMTotCnt(searchVO) == 0) {
					resultMsg = egovMessageSource.getMessage("fail.common.insert");
					sLocationUrl = "egovframework/com/sym/mnu/mpm/EgovMenuRegist";
				} else {
					menuManageService.insertMenuManage(menuManageVO);
					resultMsg = egovMessageSource.getMessage("success.common.insert");
					sLocationUrl = "forward:/sym/mnu/mpm/EgovMenuManageSelect.do";
				}
			} else {
				resultMsg = egovMessageSource.getMessage("common.isExist.msg");
				sLocationUrl = "egovframework/com/sym/mnu/mpm/EgovMenuRegist";
			}
			model.addAttribute("resultMsg", resultMsg);
		} else {
			sLocationUrl = "egovframework/com/sym/mnu/mpm/EgovMenuRegist";
		}
		return sLocationUrl;
	}

	/**
	 * 硫붾돱?뺣낫瑜??섏젙 ?쒕떎.
	 * 
	 * @param menuManageVO MenuManageVO
	 * @return 異쒕젰?섏씠吏?뺣낫 "forward:/sym/mnu/mpm/EgovMenuManageSelect.do"
	 * @exception Exception
	 */
	@RequestMapping(value = "/sym/mnu/mpm/EgovMenuDetailSelectUpdt.do")
	public String updateMenuManage(@ModelAttribute("menuManageVO") MenuManageVO menuManageVO,
			BindingResult bindingResult, ModelMap model) throws Exception {
		String sLocationUrl = null;
		String resultMsg = "";
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		if (bindingResult.hasErrors()) {
			sLocationUrl = "forward:/sym/mnu/mpm/EgovMenuManageListDetailSelect.do";
			return sLocationUrl;
		}
		ComDefaultVO searchVO = new ComDefaultVO();
		searchVO.setSearchKeyword(menuManageVO.getProgrmFileNm());
		if (progrmManageService.selectProgrmNMTotCnt(searchVO) == 0) {
			resultMsg = egovMessageSource.getMessage("fail.common.update");
			sLocationUrl = "forward:/sym/mnu/mpm/EgovMenuManageListDetailSelect.do";
		} else {
			menuManageService.updateMenuManage(menuManageVO);
			resultMsg = egovMessageSource.getMessage("success.common.update");
			sLocationUrl = "forward:/sym/mnu/mpm/EgovMenuManageSelect.do";
		}
		model.addAttribute("resultMsg", resultMsg);
		return sLocationUrl;
	}

	/**
	 * 硫붾돱?뺣낫瑜???젣 ?쒕떎.
	 * 
	 * @param menuManageVO MenuManageVO
	 * @return 異쒕젰?섏씠吏?뺣낫 "forward:/sym/mnu/mpm/EgovMenuManageSelect.do"
	 * @exception Exception
	 */
	@RequestMapping(value = "/sym/mnu/mpm/EgovMenuManageDelete.do")
	public String deleteMenuManage(@ModelAttribute("menuManageVO") MenuManageVO menuManageVO, ModelMap model)
			throws Exception {
		String resultMsg = "";
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
		if (menuManageService.selectUpperMenuNoByPk(menuManageVO) != 0) {
			resultMsg = egovMessageSource.getMessage("fail.common.delete.upperMenuExist");
			model.addAttribute("resultMsg", resultMsg);
			return "forward:/sym/mnu/mpm/EgovMenuManageSelect.do";
		}

		menuManageService.deleteMenuManage(menuManageVO);
		resultMsg = egovMessageSource.getMessage("success.common.delete");
		menuManageVO.setMenuNm("%");
		model.addAttribute("resultMsg", resultMsg);
		return "forward:/sym/mnu/mpm/EgovMenuManageSelect.do";
	}

	/**
	 * 硫붾돱由ъ뒪?몃? 議고쉶?쒕떎.
	 * 
	 * @param searchVO ComDefaultVO
	 * @return 異쒕젰?섏씠吏?뺣낫 "sym/mnu/mpm/EgovMenuList"
	 * @exception Exception
	 */
	@IncludedInfo(name = "硫붾돱由ъ뒪?멸?由?, order = 1090, gid = 60)
	@RequestMapping(value = "/sym/mnu/mpm/EgovMenuListSelect.do")
	public String selectMenuList(@ModelAttribute("searchVO") ComDefaultVO searchVO, ModelMap model) throws Exception {
//		String resultMsg = "";
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
		List<EgovMap> resultList = menuManageService.selectMenuList();
//		resultMsg = egovMessageSource.getMessage("success.common.select");
		model.addAttribute("list_menulist", resultList);
		// model.addAttribute("resultMsg", resultMsg);
		return "egovframework/com/sym/mnu/mpm/EgovMenuList";
	}

	/**
	 * 硫붾돱由ъ뒪?몄쓽 硫붾돱?뺣낫瑜??깅줉?쒕떎.
	 * 
	 * @param menuManageVO MenuManageVO
	 * @return 異쒕젰?섏씠吏?뺣낫 "sym/mnu/mpm/EgovMenuList"
	 * @exception Exception
	 */
	@RequestMapping(value = "/sym/mnu/mpm/EgovMenuListInsert.do")
	public String insertMenuList(@ModelAttribute("menuManageVO") MenuManageVO menuManageVO, BindingResult bindingResult,
			ModelMap model) throws Exception {
		String sLocationUrl = null;
		String resultMsg = "";
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		if (bindingResult.hasErrors()) {
			sLocationUrl = "egovframework/com/sym/mnu/mpm/EgovMenuList";
			return sLocationUrl;
		}

		if (menuManageService.selectMenuNoByPk(menuManageVO) == 0) {
			ComDefaultVO searchVO = new ComDefaultVO();
			searchVO.setSearchKeyword(menuManageVO.getProgrmFileNm());
			if (progrmManageService.selectProgrmNMTotCnt(searchVO) == 0) {
				resultMsg = egovMessageSource.getMessage("fail.common.insert");
				sLocationUrl = "forward:/sym/mnu/mpm/EgovMenuListSelect.do";
			} else {
				menuManageService.insertMenuManage(menuManageVO);
				resultMsg = egovMessageSource.getMessage("success.common.insert");
				sLocationUrl = "forward:/sym/mnu/mpm/EgovMenuListSelect.do";
			}
		} else {
			resultMsg = egovMessageSource.getMessage("common.isExist.msg");
			sLocationUrl = "forward:/sym/mnu/mpm/EgovMenuListSelect.do";
		}
		model.addAttribute("resultMsg", resultMsg);
		return sLocationUrl;
	}

	/**
	 * 硫붾돱由ъ뒪?몄쓽 硫붾돱?뺣낫瑜??섏젙?쒕떎.
	 * 
	 * @param menuManageVO MenuManageVO
	 * @return 異쒕젰?섏씠吏?뺣낫 "sym/mnu/mpm/EgovMenuList"
	 * @exception Exception
	 */
	@RequestMapping(value = "/sym/mnu/mpm/EgovMenuListUpdt.do")
	public String updateMenuList(@ModelAttribute("menuManageVO") MenuManageVO menuManageVO, BindingResult bindingResult,
			ModelMap model) throws Exception {
		String sLocationUrl = null;
		String resultMsg = "";
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		if (bindingResult.hasErrors()) {
			sLocationUrl = "forward:/sym/mnu/mpm/EgovMenuListSelect.do";
			return sLocationUrl;
		}
		ComDefaultVO searchVO = new ComDefaultVO();
		searchVO.setSearchKeyword(menuManageVO.getProgrmFileNm());
		if (progrmManageService.selectProgrmNMTotCnt(searchVO) == 0) {
			resultMsg = egovMessageSource.getMessage("fail.common.update");
			sLocationUrl = "forward:/sym/mnu/mpm/EgovMenuListSelect.do";
		} else {
			menuManageService.updateMenuManage(menuManageVO);
			resultMsg = egovMessageSource.getMessage("success.common.update");
			sLocationUrl = "forward:/sym/mnu/mpm/EgovMenuListSelect.do";
		}
		model.addAttribute("resultMsg", resultMsg);
		return sLocationUrl;
	}

	/**
	 * 硫붾돱由ъ뒪?몄쓽 硫붾돱?뺣낫瑜???젣?쒕떎.
	 * 
	 * @param menuManageVO MenuManageVO
	 * @return 異쒕젰?섏씠吏?뺣낫 "sym/mnu/mpm/EgovMenuList"
	 * @exception Exception
	 */
	@RequestMapping(value = "/sym/mnu/mpm/EgovMenuListDelete.do")
	public String deleteMenuList(@ModelAttribute("menuManageVO") MenuManageVO menuManageVO, BindingResult bindingResult,
			ModelMap model) throws Exception {
		String sLocationUrl = null;
		String resultMsg = "";
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		menuManageService.deleteMenuManage(menuManageVO);
		resultMsg = egovMessageSource.getMessage("success.common.delete");
		sLocationUrl = "forward:/sym/mnu/mpm/EgovMenuListSelect.do";
		model.addAttribute("resultMsg", resultMsg);
		return sLocationUrl;
	}

	/**
	 * 硫붾돱由ъ뒪?몄쓽 硫붾돱?뺣낫瑜??대룞 硫붾돱紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param searchVO ComDefaultVO
	 * @return 異쒕젰?섏씠吏?뺣낫 "sym/mnu/mpm/EgovMenuMvmn"
	 * @exception Exception
	 */
	@RequestMapping(value = "/sym/mnu/mpm/EgovMenuListSelectMvmn.do")
	public String selectMenuListMvmn(@ModelAttribute("searchVO") ComDefaultVO searchVO, ModelMap model)
			throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		List<EgovMap> resultList = menuManageService.selectMenuList();
		model.addAttribute("list_menulist", resultList);
		return "egovframework/com/sym/mnu/mpm/EgovMenuMvmn";
	}

	/**
	 * 硫붾돱由ъ뒪?몄쓽 硫붾돱?뺣낫瑜??대룞 硫붾돱紐⑸줉??議고쉶?쒕떎. (New)
	 * 
	 * @param searchVO ComDefaultVO
	 * @return 異쒕젰?섏씠吏?뺣낫 "sym/mnu/mpm/EgovMenuMvmn"
	 * @exception Exception
	 */
	@RequestMapping(value = "/sym/mnu/mpm/EgovMenuListSelectMvmnNew.do")
	public String selectMenuListMvmnNew(@ModelAttribute("searchVO") ComDefaultVO searchVO, ModelMap model)
			throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		List<EgovMap> resultList = menuManageService.selectMenuList();
		model.addAttribute("list_menulist", resultList);
		return "egovframework/com/sym/mnu/mpm/EgovMenuMvmnNew";
	}

	/* ### ?쇨큵泥섎━ ?꾨줈?몄뒪 ### */

	/**
	 * 硫붾돱?앹꽦 ?쇨큵??젣?꾨줈?몄뒪
	 * 
	 * @param menuManageVO MenuManageVO
	 * @return 異쒕젰?섏씠吏?뺣낫 "sym/mnu/mpm/EgovMenuBndeRegist"
	 * @exception Exception
	 */
	@RequestMapping(value = "/sym/mnu/mpm/EgovMenuBndeAllDelete.do")
	public String menuBndeAllDelete(@ModelAttribute("menuManageVO") MenuManageVO menuManageVO, ModelMap model)
			throws Exception {
		String resultMsg = "";
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
		menuManageService.menuBndeAllDelete();
		resultMsg = egovMessageSource.getMessage("success.common.delete");
		model.addAttribute("resultMsg", resultMsg);
		return "egovframework/com/sym/mnu/mpm/EgovMenuBndeRegist";
	}

	/**
	 * 硫붾돱?쇨큵?깅줉?붾㈃ ?몄텧 諛?硫붾돱?쇨큵?깅줉泥섎━ ?꾨줈?몄뒪
	 * 
	 * @param commandMap   Map
	 * @param menuManageVO MenuManageVO
	 * @param request      HttpServletRequest
	 * @return 異쒕젰?섏씠吏?뺣낫 "sym/mnu/mpm/EgovMenuBndeRegist"
	 * @exception Exception
	 */
	@RequestMapping(value = "/sym/mnu/mpm/EgovMenuBndeRegist.do")
	public String menuBndeRegist(@RequestParam Map<?, ?> commandMap, final HttpServletRequest request,
			@ModelAttribute("menuManageVO") MenuManageVO menuManageVO, ModelMap model) throws Exception {
		String sLocationUrl = null;
		String resultMsg = "";
		String sMessage = "";
		String[] fileExtension = {"XLS", "XLSX"};

		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		String sCmd = commandMap.get("cmd") == null ? "" : (String)commandMap.get("cmd");

		if (sCmd.equals("bndeInsert")) {

			final MultipartHttpServletRequest multiRequest = WebUtils.getNativeRequest(request, MultipartHttpServletRequest.class);

			//2022.01 Possible null pointer dereference due to return value of called method
			if (multiRequest != null) {

				final Map<String, MultipartFile> files = multiRequest.getFileMap();
				for (Entry<String, MultipartFile> entry : files.entrySet()) {
					MultipartFile file = entry.getValue();
					String originalFilename = file.getOriginalFilename();
					if (StringUtils.isEmpty(originalFilename)) {
						continue;
					}
					String fileExtensionName = FilenameUtils.getExtension(originalFilename).toUpperCase();
					boolean isExist = Arrays.stream(fileExtension).anyMatch(fileExtensionName::equals);
					// 2022.11.11 ?쒗걧?댁퐫??泥섎━
					if (isExist) {

						if (menuManageService.menuBndeAllDelete()) {
							// KISA 蹂댁븞?쎌젏 議곗튂 - ?먯썝?댁젣
							try (InputStream is = file.getInputStream();) {
								sMessage = menuManageService.menuBndeRegist(menuManageVO, is);
							} catch (IOException e) {
								throw new IOException(e);
							}

							resultMsg = sMessage;

						} else {
							resultMsg = egovMessageSource.getMessage("fail.common.msg");
							menuManageVO.setTmpCmd("EgovMenuBndeRegist Error!!");
							model.addAttribute("resultVO", menuManageVO);
						}

					} else {
						LOGGER.info("xls, xlsx ?뚯씪 ??낅쭔 ?깅줉??媛?ν빀?덈떎.");
						resultMsg = egovMessageSource.getMessage("fail.common.msg");
						model.addAttribute("resultMsg", resultMsg);
						return "egovframework/com/sym/mnu/mpm/EgovMenuBndeRegist";
					}

				} // while end
			} // if end(MultipartHttpServletRequest isNotEmpty)

			sLocationUrl = "egovframework/com/sym/mnu/mpm/EgovMenuBndeRegist";
			model.addAttribute("resultMsg", resultMsg);

		} else {
			sLocationUrl = "egovframework/com/sym/mnu/mpm/EgovMenuBndeRegist";
		}

		return sLocationUrl;
	}
}