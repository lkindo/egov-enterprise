package egovframework.com.sym.mnu.mpm.web;

import java.util.List;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
 * ? ???? ???? ???? ? ?????
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
 *   2011.09.07  ?????         ?????? ?? ??
 *   2015.06.19  ??         ???????????
 *   2018.10.12  ????          ??? ????(??? ? ??)
 *   2025.07.18  ????         2025????????PMD???????? ????????-LocalVariableNamingConventions(final??? ?? ??????????)
 *
 *      </pre>
 **/
// @Controller
public class EgovMainMenuManageController {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovMainMenuManageController.class);

	/** EgovPropertyService **/
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	/** EgovMenuManageService **/
	@Resource(name = "menuManageService")
	private EgovMenuManageService menuManageService;

	/** EgovFileMngService **/
	// @Resource(name="EgovFileMngService")
	// private EgovFileMngService fileMngService;

	/** EgovFileMngUtil **/
	// @Resource(name="EgovFileMngUtil")
	// private EgovFileMngUtil fileUtil;

	/* ### ?? ### */
	/* Main Index ??*/
	/**
	 * Main???Index?????.
	 * 
	 * @param menuNo String
	 * @param chkURL String
	 * @return ????? "menu_index"
	 * @exception Exception
	 **/
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
	 * Head?????.
	 * 
	 * @param menuManageVO MenuManageVO
	 * @return ????? "head"
	 * @exception Exception
	 **/
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
			// ???? ???
			return "egovframework/com/EgovMainView";
		} else {
			// ?? ?? ???
			return "egovframework/com/cmm/error/egovError";
		}
	}

	/**
	 * Head?????.
	 * 
	 * @param menuManageVO MenuManageVO
	 * @return ????? "main_head"
	 * @exception Exception
	 **/
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
			// ???? ???
			return "egovframework/com/main_head";
		} else {
			// ?? ?? ???
			return "egovframework/com/cmm/error/egovError";
		}
	}

	/**
	 * ??????.
	 * 
	 * @param menuManageVO MenuManageVO
	 * @param vStartP      String
	 * @return ????? "main_left"
	 * @exception Exception
	 **/
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
	 * ????????.
	 * 
	 * @param menuManageVO MenuManageVO
	 * @param vStartP      String
	 * @return ????? ???RL
	 * @exception Exception
	 **/
	/* Right Menu ??*/
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
	 * HOME ?? ???.
	 * 
	 * @param menuManageVO MenuManageVO
	 * @return ????? "EgovMainView"
	 * @exception Exception
	 **/
	@IncludedInfo(name = "Legacy Controller", order = 1, gid = 0)
	@RequestMapping(value = "/sym/mnu/mpm/EgovMainMenuHome.do")
	public String selectMainMenuHome(@ModelAttribute("menuManageVO") MenuManageVO menuManageVO, ModelMap model)
			throws Exception {

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		// ??????? ?????
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
			// ???? ???
			return "egovframework/com/EgovMainView";

		} else {
			// ?? ?? ???
			return "egovframework/com/cmm/error/egovError";
		}
	}
}
