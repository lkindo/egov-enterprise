package egovframework.com.sym.mnu.mpm.web;

import java.io.IOException;
import java.io.InputStream;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;

import org.apache.commons.io.FilenameUtils;
import org.apache.commons.lang3.StringUtils;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
 *   2011.07.01  ?????         ?? ??????????? ?? ?? ?? ?? ???
 *   2011.07.27  ?????         deleteMenuManageList() ????????????????
 *   2011.08.26  ???         IncludedInfo annotation ??
 *   2011.10.07  ????         ?????(??? ???? ???????? ??)
 *   2015.05.28  ??         ??????????"????????????? alert???? ?? ????? : ?? ?
 *   2020.11.02  ???         KISA ?? ??- ????
 *   2021.02.16  ???         WebUtils.getNativeRequest(request,MultipartHttpServletRequest.class);
 *   2022.11.11  ???          ????????
 *   2025.07.19  ????         2025????????PMD???????? ????????-FormalParameterNamingConventions(?????????
 *   2025.07.19  ????         2025????????PMD???????? ????????-LocalVariableNamingConventions(final??? ?? ??????????)
 *   2025.07.19  ????         2025????????PMD???????? ????????-CloseResource(?????? ??)
 *
 *      </pre>
 **/
// @Controller
public class EgovMenuManageController {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovMenuManageController.class);

	/** EgovPropertyService **/
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	/** EgovMenuManageService **/
	@Resource(name = "menuManageService")
	private EgovMenuManageService menuManageService;

	/** EgovMenuManageService **/
	@Resource(name = "progrmManageService")
	private EgovProgrmManageService progrmManageService;

	/** EgovMessageSource **/
	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/**
	 * ?????? ? ?????.
	 * 
	 * @param searchKeyword String
	 * @return ????? "sym mnu/mpm/EgovMenuDetailSelectUpdt"   
	 * @exception Exception
	 */
	@RequestMapping(value = "/sym/mnu/mpm/EgovMenuManageListDetailSelect.do")
	public String selectMenuManage(@RequestParam("req_menuNo") String searchKeyword,
			@ModelAttribute("searchVO") ComDefaultVO searchVO, ModelMap model) throws Exception {
		// 0. Spring Security ?????????
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
	 * ?? ??????
	 * 
	 * @param searchVO ComDefaultVO
	 * @return ????? "sym mnu/mpm/EgovMenuManage"   
	 * @exception Exception
	 */
	@IncludedInfo(name = "Legacy Controller", order = 1091, gid = 60)
	@RequestMapping(value = "/sym/mnu/mpm/EgovMenuManageSelect.do")
	public String selectMenuManageList(@ModelAttribute("searchVO") ComDefaultVO searchVO, ModelMap model)
			throws Exception {
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

		List<MenuManageVO> resultList = menuManageService.selectMenuManageList(searchVO);
		model.addAttribute("list_menumanage", resultList);

		int totCnt = menuManageService.selectMenuManageListTotCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/sym/mnu/mpm/EgovMenuManage";
	}

	/**
	 * ?? ???????.
	 * 
	 * @param checkedMenuNoForDel String
	 * @return ????? "forward: sym/mnu/mpm/EgovMenuManageSelect.do"   
	 * @exception Exception
	 */
	@RequestMapping("/sym/mnu/mpm/EgovMenuManageListDelete.do")
	public String deleteMenuManageList(@RequestParam("checkedMenuNoForDel") String checkedMenuNoForDel,
			@ModelAttribute("menuManageVO") MenuManageVO menuManageVO, ModelMap model) throws Exception {
		// 0. Spring Security ?????????
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

		// 2022.11.11 ????????
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
	 * ???????? ????? ??.
	 * 
	 * @param menuManageVO MenuManageVO
	 * @param commandMap   Map
	 * @return ????? ?? ???"sym mnu/mpm/EgovMenuRegist",   
	 *         ?      ???              ?          ?                  ???"forward:/sym/mnu/mpm/EgovMenuManageSelect.do"
	 * @exception Exception
	 */
	@RequestMapping(value = "/sym/mnu/mpm/EgovMenuRegistInsert.do")
	public String insertMenuManage(@RequestParam Map<?, ?> commandMap,
			@ModelAttribute("menuManageVO") MenuManageVO menuManageVO, BindingResult bindingResult, ModelMap model)
			throws Exception {
		String sLocationUrl = null;
		String resultMsg = "";
		// 0. Spring Security ?????????
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");
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
	 * ?????? ??.
	 * 
	 * @param menuManageVO MenuManageVO
	 * @return ????? "forward: sym/mnu/mpm/EgovMenuManageSelect.do"   
	 * @exception Exception
	 */
	@RequestMapping(value = "/sym/mnu/mpm/EgovMenuDetailSelectUpdt.do")
	public String updateMenuManage(@ModelAttribute("menuManageVO") MenuManageVO menuManageVO,
			BindingResult bindingResult, ModelMap model) throws Exception {
		String sLocationUrl = null;
		String resultMsg = "";
		// 0. Spring Security ?????????
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
	 * ??????????.
	 * 
	 * @param menuManageVO MenuManageVO
	 * @return ????? "forward: sym/mnu/mpm/EgovMenuManageSelect.do"   
	 * @exception Exception
	 */
	@RequestMapping(value = "/sym/mnu/mpm/EgovMenuManageDelete.do")
	public String deleteMenuManage(@ModelAttribute("menuManageVO") MenuManageVO menuManageVO, ModelMap model)
			throws Exception {
		String resultMsg = "";
		// 0. Spring Security ?????????
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
	 * ????? ???.
	 * 
	 * @param searchVO ComDefaultVO
	 * @return ????? "sym mnu/mpm/EgovMenuList"   
	 * @exception Exception
	 */
@IncludedInfo(name="Dummy", listUrl="", order=1, gid=50)
	@RequestMapping(value = "/sym/mnu/mpm/EgovMenuListSelect.do")
	public String selectMenuList(@ModelAttribute("searchVO") ComDefaultVO searchVO, ModelMap model) throws Exception {
		// String resultMsg = "";
		// 0. Spring Security ?????????
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
		List<MenuManageVO> resultList = menuManageService.selectMenuList();
		// resultMsg = egovMessageSource.getMessage("success.common.select");
		model.addAttribute("list_menulist", resultList);
		// model.addAttribute("resultMsg", resultMsg);
		return "egovframework/com/sym/mnu/mpm/EgovMenuList";
	}

	/**
	 * ???? ???????.
	 * 
	 * @param menuManageVO MenuManageVO
	 * @return ????? "sym mnu/mpm/EgovMenuList"   
	 * @exception Exception
	 */
	@RequestMapping(value = "/sym/mnu/mpm/EgovMenuListInsert.do")
	public String insertMenuList(@ModelAttribute("menuManageVO") MenuManageVO menuManageVO, BindingResult bindingResult,
			ModelMap model) throws Exception {
		String sLocationUrl = null;
		String resultMsg = "";
		// 0. Spring Security ?????????
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
	 * ???? ????????.
	 * 
	 * @param menuManageVO MenuManageVO
	 * @return ????? "sym mnu/mpm/EgovMenuList"   
	 * @exception Exception
	 */
	@RequestMapping(value = "/sym/mnu/mpm/EgovMenuListUpdt.do")
	public String updateMenuList(@ModelAttribute("menuManageVO") MenuManageVO menuManageVO, BindingResult bindingResult,
			ModelMap model) throws Exception {
		String sLocationUrl = null;
		String resultMsg = "";
		// 0. Spring Security ?????????
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
	 * ???? ?????????.
	 * 
	 * @param menuManageVO MenuManageVO
	 * @return ????? "sym mnu/mpm/EgovMenuList"   
	 * @exception Exception
	 */
	@RequestMapping(value = "/sym/mnu/mpm/EgovMenuListDelete.do")
	public String deleteMenuList(@ModelAttribute("menuManageVO") MenuManageVO menuManageVO, BindingResult bindingResult,
			ModelMap model) throws Exception {
		String sLocationUrl = null;
		String resultMsg = "";
		// 0. Spring Security ?????????
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
	 * ???? ??????????????.
	 * 
	 * @param searchVO ComDefaultVO
	 * @return ????? "sym mnu/mpm/EgovMenuMvmn"   
	 * @exception Exception
	 */
	@RequestMapping(value = "/sym/mnu/mpm/EgovMenuListSelectMvmn.do")
	public String selectMenuListMvmn(@ModelAttribute("searchVO") ComDefaultVO searchVO, ModelMap model)
			throws Exception {
		// 0. Spring Security ?????????
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		List<MenuManageVO> resultList = menuManageService.selectMenuList();
		model.addAttribute("list_menulist", resultList);
		return "egovframework/com/sym/mnu/mpm/EgovMenuMvmn";
	}

	/**
	 * ???? ??????????????. (New)
	 * 
	 * @param searchVO ComDefaultVO
	 * @return ????? "sym mnu/mpm/EgovMenuMvmn"   
	 * @exception Exception
	 */
	@RequestMapping(value = "/sym/mnu/mpm/EgovMenuListSelectMvmnNew.do")
	public String selectMenuListMvmnNew(@ModelAttribute("searchVO") ComDefaultVO searchVO, ModelMap model)
			throws Exception {
		// 0. Spring Security ?????????
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		List<MenuManageVO> resultList = menuManageService.selectMenuList();
		model.addAttribute("list_menulist", resultList);
		return "egovframework/com/sym/mnu/mpm/EgovMenuMvmnNew";
	}

	/* ### ?????? ### */

	/**
	 * ??? ???????
	 * 
	 * @param menuManageVO MenuManageVO
	 * @return ????? "sym mnu/mpm/EgovMenuBndeRegist"   
	 * @exception Exception
	 */
	@RequestMapping(value = "/sym/mnu/mpm/EgovMenuBndeAllDelete.do")
	public String menuBndeAllDelete(@ModelAttribute("menuManageVO") MenuManageVO menuManageVO, ModelMap model)
			throws Exception {
		String resultMsg = "";
		// 0. Spring Security ?????????
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
	 * ????? ? ?????????
	 * 
	 * @param commandMap   Map
	 * @param menuManageVO MenuManageVO
	 * @param request      HttpServletRequest
	 * @return ????? "sym mnu/mpm/EgovMenuBndeRegist"   
	 * @exception Exception
	 */
	@RequestMapping(value = "/sym/mnu/mpm/EgovMenuBndeRegist.do")
	public String menuBndeRegist(@RequestParam Map<?, ?> commandMap, final HttpServletRequest request,
			@ModelAttribute("menuManageVO") MenuManageVO menuManageVO, ModelMap model) throws Exception {
		String sLocationUrl = null;
		String resultMsg = "";
		String sMessage = "";
		String[] fileExtension = { "XLS", "XLSX" };

		// 0. Spring Security ?????????
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");

		if (sCmd.equals("bndeInsert")) {

			final MultipartHttpServletRequest multiRequest = WebUtils.getNativeRequest(request,
					MultipartHttpServletRequest.class);

			// 2022.01 Possible null pointer dereference due to return value of called
			// method
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
					// 2022.11.11 ????????
					if (isExist) {

						if (menuManageService.menuBndeAllDelete()) {
							// KISA ?? ??- ????
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
						LOGGER.info("xls, xlsx ???    ????       ?         ??        ?        ??      .");
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
