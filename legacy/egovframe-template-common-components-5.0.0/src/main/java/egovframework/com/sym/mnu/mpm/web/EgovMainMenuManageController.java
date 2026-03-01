package egovframework.com.sym.mnu.mpm.web;

import java.util.List;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.sym.mnu.mpm.service.EgovMenuManageService;
import egovframework.com.sym.mnu.mpm.service.MenuManageVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;

/**
 * 硫붿씤硫붾돱 ?대떦留곹겕 泥섎━瑜??섎뒗 鍮꾩쫰?덉뒪 援ы쁽 ?대옒??
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
 *   2011.09.07  ?쒖???         ?ъ슜??援щ텇 ?ㅻ쪟 ?섏젙
 *   2015.06.19  議곗젙援?         誘몄씤利앹궗?⑹옄?????蹂댁븞泥섎━
 *   2018.10.12  ?댁젙?          硫붿씤?섏씠吏 ?듯빀(?낅Т, 湲곗뾽, ?쇰컲)
 *   2025.07.18  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(final???꾨땶 蹂?섎뒗 諛묒쨪???ы븿?????놁쓬)
 *
 *      </pre>
 */
@Controller
public class EgovMainMenuManageController {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovMainMenuManageController.class);

	/** EgovPropertyService */
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	/** EgovMenuManageService */
	@Resource(name = "meunManageService")
	private EgovMenuManageService menuManageService;

	/** EgovFileMngService */
	// @Resource(name="EgovFileMngService")
	//
                     EgovFileMngService fileMngService;

	/** EgovFileMngUtil */
	// @Resource(name="EgovFileMngUtil")
	//
                     EgovFileMngUtil fileUtil;

	/* ### 硫붿씤?묒뾽 ### */
	/* Main Index 議고쉶 */
	/**
	 * Main硫붾돱??Index瑜?議고쉶?쒕떎.
	 * 
	 * @param menuNo String
	 * @param chkURL String
	 * @return 異쒕젰?섏씠吏?뺣낫 "menu_index"
	 * @exception Exception
	 */
	@RequestMapping(value = "/sym/mnu/mpm/EgovMainMenuIndex.do")
	public String selectMainMenuIndex(@ModelAttribute("menuManageVO") MenuManageVO menuManageVO,
			@RequestParam("menuNo") String menuNo, @RequestParam("chkURL") String chkURL, ModelMap model)
			throws Exception {

		int iMenuNo = Integer.parseInt(menuNo);
		menuManageVO.setMenuNo(iMenuNo);
		// menuManageVO.setTempValue(chkURL);
		model.addAttribute("resultVO", menuManageVO);

		return "egovframework/com/menu_index";
	}

	/**
	 * Head硫붾돱瑜?議고쉶?쒕떎.
	 * 
	 * @param menuManageVO MenuManageVO
	 * @return 異쒕젰?섏씠吏?뺣낫 "head"
	 * @exception Exception
	 */
	@RequestMapping(value = "/sym/mnu/mpm/EgovMainMenu.do")
	public String selectMainMenu(@ModelAttribute("menuManageVO") MenuManageVO menuManageVO, ModelMap model)
			throws Exception {

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		menuManageVO.setTmpId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));
		menuManageVO.setTmpPassword(user == null ? "" : EgovStringUtil.isNullToString(user.getPassword()));
		menuManageVO.setTmpUserSe(user == null ? "" : EgovStringUtil.isNullToString(user.getUserSe()));
		menuManageVO.setTmpName(user == null ? "" : EgovStringUtil.isNullToString(user.getName()));
		menuManageVO.setTmpEmail(user == null ? "" : EgovStringUtil.isNullToString(user.getEmail()));
		menuManageVO.setTmpOrgnztId(user == null ? "" : EgovStringUtil.isNullToString(user.getOrgnztId()));
		menuManageVO.setTmpUniqId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));

		List<?> resultList = menuManageService.selectMainMenuHead(menuManageVO);
		model.addAttribute("list_headmenu", resultList);
		if (!(user == null ? "" : EgovStringUtil.isNullToString(user.getId())).equals("")) {
			// 硫붿씤 ?섏씠吏 ?대룞
			return "egovframework/com/EgovMainView";
		} else {
			// ?ㅻ쪟 ?섏씠吏 ?대룞
			return "egovframework/com/cmm/error/egovError";
		}
	}

	/**
	 * Head硫붾돱瑜?議고쉶?쒕떎.
	 * 
	 * @param menuManageVO MenuManageVO
	 * @return 異쒕젰?섏씠吏?뺣낫 "main_head"
	 * @exception Exception
	 */
	@RequestMapping(value = "/sym/mnu/mpm/EgovMainMenuHead.do")
	public String selectMainMenuHead(@ModelAttribute("menuManageVO") MenuManageVO menuManageVO, ModelMap model)
			throws Exception {

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		menuManageVO.setTmpId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));
		menuManageVO.setTmpPassword(user == null ? "" : EgovStringUtil.isNullToString(user.getPassword()));
		menuManageVO.setTmpUserSe(user == null ? "" : EgovStringUtil.isNullToString(user.getUserSe()));
		menuManageVO.setTmpName(user == null ? "" : EgovStringUtil.isNullToString(user.getName()));
		menuManageVO.setTmpEmail(user == null ? "" : EgovStringUtil.isNullToString(user.getEmail()));
		menuManageVO.setTmpOrgnztId(user == null ? "" : EgovStringUtil.isNullToString(user.getOrgnztId()));
		menuManageVO.setTmpUniqId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));

		List<?> resultList = menuManageService.selectMainMenuHead(menuManageVO);
		model.addAttribute("list_headmenu", resultList);
		if (!(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId())).equals("")) {
			// 硫붿씤 ?섏씠吏 ?대룞
			return "egovframework/com/main_head";
		} else {
			// ?ㅻ쪟 ?섏씠吏 ?대룞
			return "egovframework/com/cmm/error/egovError";
		}
	}

	/**
	 * 醫뚯륫硫붾돱瑜?議고쉶?쒕떎.
	 * 
	 * @param menuManageVO MenuManageVO
	 * @param vStartP      String
	 * @return 異쒕젰?섏씠吏?뺣낫 "main_left"
	 * @exception Exception
	 */
	@RequestMapping(value = "/sym/mnu/mpm/EgovMainMenuLeft.do")
	public String selectMainMenuLeft(@ModelAttribute("menuManageVO") MenuManageVO menuManageVO,
			@RequestParam("vStartP") String vStartP, ModelMap model) throws Exception {
		int iMenuNo = Integer.parseInt(vStartP);
		menuManageVO.setTempInt(iMenuNo);
		model.addAttribute("resultVO", menuManageVO);

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		menuManageVO.setTmpId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));
		menuManageVO.setTmpPassword(user == null ? "" : EgovStringUtil.isNullToString(user.getPassword()));
		menuManageVO.setTmpUserSe(user == null ? "" : EgovStringUtil.isNullToString(user.getUserSe()));
		menuManageVO.setTmpName(user == null ? "" : EgovStringUtil.isNullToString(user.getName()));
		menuManageVO.setTmpEmail(user == null ? "" : EgovStringUtil.isNullToString(user.getEmail()));
		menuManageVO.setTmpOrgnztId(user == null ? "" : EgovStringUtil.isNullToString(user.getOrgnztId()));
		menuManageVO.setTmpUniqId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));

		List<?> resultList = menuManageService.selectMainMenuLeft(menuManageVO);
		model.addAttribute("list_menulist", resultList);
		return "egovframework/com/main_left";
	}

	/**
	 * ?곗륫?붾㈃??議고쉶?쒕떎.
	 * 
	 * @param menuManageVO MenuManageVO
	 * @param vStartP      String
	 * @return 異쒕젰?섏씠吏?뺣낫 ?대떦URL
	 * @exception Exception
	 */
	/* Right Menu 議고쉶 */
	@RequestMapping(value = "/sym/mnu/mpm/EgovMainMenuRight.do")
	public String selectMainMenuRight(@ModelAttribute("menuManageVO") MenuManageVO menuManageVO,
			@RequestParam("vStartP") String vStartP, ModelMap model) throws Exception {
		int iMenuNo = Integer.parseInt(vStartP);
		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		String forwardURL = null;
		forwardURL = menuManageService.selectLastMenuURL(iMenuNo,
				user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));
		return "forward:" + forwardURL;
	}

	/**
	 * HOME 硫붿씤?붾㈃ 議고쉶?쒕떎.
	 * 
	 * @param menuManageVO MenuManageVO
	 * @return 異쒕젰?섏씠吏?뺣낫 "EgovMainView"
	 * @exception Exception
	 */
	@IncludedInfo(name = "?ы꽭(?덉젣) 硫붿씤?붾㈃", order = 1, gid = 0)
	@RequestMapping(value = "/sym/mnu/mpm/EgovMainMenuHome.do")
	public String selectMainMenuHome(@ModelAttribute("menuManageVO") MenuManageVO menuManageVO, ModelMap model)
			throws Exception {

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		// 誘몄씤利??ъ슜?먯뿉 ???蹂댁븞泥섎━
		if (user == null) {
			return "index";
		}

		menuManageVO.setTmpId(user.getId());
		menuManageVO.setTmpPassword(user.getPassword());
		menuManageVO.setTmpUserSe(user.getUserSe());
		menuManageVO.setTmpName(user.getName());
		menuManageVO.setTmpEmail(user.getEmail());
		menuManageVO.setTmpOrgnztId(user.getOrgnztId());
		menuManageVO.setTmpUniqId(user.getUniqId());

		List<?> resultList = menuManageService.selectMainMenuHead(menuManageVO);
		model.addAttribute("list_headmenu", resultList);

		LOGGER.debug("## selectMainMenuHome ## getSUserSe 1: {}", user.getUserSe());
		LOGGER.debug("## selectMainMenuHome ## getSUserId 2: {}", user.getId());
		LOGGER.debug("## selectMainMenuHome ## getUniqId  2: {}", user.getUniqId());

		if (!user.getId().equals("")) {
			// 硫붿씤 ?섏씠吏 ?대룞
			return "egovframework/com/EgovMainView";

		} else {
			// ?ㅻ쪟 ?섏씠吏 ?대룞
			return "egovframework/com/cmm/error/egovError";
		}
	}
}
