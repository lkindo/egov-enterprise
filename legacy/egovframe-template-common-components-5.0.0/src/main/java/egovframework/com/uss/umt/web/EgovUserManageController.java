package egovframework.com.uss.umt.web;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.ModelAndView;

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.EgovWebUtil;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.service.CmmnDetailCode;
import egovframework.com.cmm.service.EgovCmmUseService;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.uss.umt.service.EgovUserManageService;
import egovframework.com.uss.umt.service.UserDefaultVO;
import egovframework.com.uss.umt.service.UserManageVO;
import egovframework.com.utl.sim.service.EgovFileScrty;
import jakarta.annotation.Resource;

/**
 * ?낅Т?ъ슜?먭????붿껌??鍮꾩??덉뒪 ?대옒?ㅻ줈 ?꾨떖?섍퀬 泥섎━?쒓껐怨쇰? ?대떦 ???붾㈃?쇰줈 ?꾨떖?섎뒗 Controller瑜??뺤쓽?쒕떎
 * 
 * @author 怨듯넻?쒕퉬??媛쒕컻? 議곗옱??
 * @since 2009.04.10
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.04.10  議곗옱??         理쒖큹 ?앹꽦
 *   2011.08.26  ?뺤쭊??         IncludedInfo annotation 異붽?
 *   2014.12.08  ?닿린??         ?뷀샇?붾갑??蹂寃?EgovFileScrty.encryptPassword)
 *   2015.06.16  議곗젙援?         ?섏젙???좏슚?깆껜?????먮윭諛쒖깮 ??紐⑸줉?쇰줈 ?대룞?섏뿬 ?먮윭硫붿떆吏 ?쒖떆
 *   2015.06.19  議곗젙援?         誘몄씤利??ъ슜?먯뿉 ???蹂댁븞泥섎━ 湲곗? ?섏젙 (!isAuthenticated)
 *   2017.07.21  ?λ룞??         濡쒓렇?몄씤利앹젣???묒뾽
 *   2022.11.11  源?쒖?          ?쒗걧?댁퐫??泥섎━
 *   2025.08.29  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(final???꾨땶 蹂?섎뒗 諛묒쨪???ы븿?????놁쓬)
 *
 *      </pre>
 */
@Controller
public class EgovUserManageController {

	/** userManageService */
	@Resource(name = "userManageService")
	private EgovUserManageService userManageService;

	/** cmmUseService */
	@Resource(name = "EgovCmmUseService")
	private EgovCmmUseService cmmUseService;

	/** EgovPropertyService */
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	@Resource(name = "egovNextUrlWhitelist")
    protected List<String> nextUrlWhitelist;

	/**
	 * ?ъ슜?먮ぉ濡앹쓣 議고쉶?쒕떎. (pageing)
	 * 
	 * @param userSearchVO 寃?됱“嫄댁젙蹂?
	 * @param model        ?붾㈃紐⑤뜽
	 * @return cmm/uss/umt/EgovUserManage
	 * @throws Exception
	 */
	@IncludedInfo(name = "?낅Т?ъ슜?먭?由?, order = 460, gid = 50)
	@RequestMapping(value = "/uss/umt/EgovUserManage.do")
	public String selectUserList(@ModelAttribute("userSearchVO") UserDefaultVO userSearchVO, ModelMap model)
			throws Exception {

		// 誘몄씤利??ъ슜?먯뿉 ???蹂댁븞泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			return "index";
		}

		/** EgovPropertyService */
		userSearchVO.setPageUnit(propertiesService.getInt("pageUnit"));
		userSearchVO.setPageSize(propertiesService.getInt("pageSize"));

		/** pageing */
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(userSearchVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(userSearchVO.getPageUnit());
		paginationInfo.setPageSize(userSearchVO.getPageSize());

		userSearchVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		userSearchVO.setLastIndex(paginationInfo.getLastRecordIndex());
		userSearchVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		List<EgovMap> userList = userManageService.selectUserList(userSearchVO);
		model.addAttribute("resultList", userList);

		int totCnt = userManageService.selectUserListTotCnt(userSearchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		// ?ъ슜?먯긽?쒖퐫?쒕? 肄붾뱶?뺣낫濡쒕???議고쉶
		ComDefaultCodeVO comDefaultCodeVO = new ComDefaultCodeVO();
		comDefaultCodeVO.setCodeId("COM013");
		List<CmmnDetailCode> emplyrSttusCodeResult = cmmUseService.selectCmmCodeDetail(comDefaultCodeVO);
		model.addAttribute("emplyrSttusCode_result", emplyrSttusCodeResult);// ?ъ슜?먯긽?쒖퐫?쒕ぉ濡?

		return "egovframework/com/uss/umt/EgovUserManage";
	}

	/**
	 * ?ъ슜?먮벑濡앺솕硫댁쑝濡??대룞?쒕떎.
	 * 
	 * @param userSearchVO 寃?됱“嫄댁젙蹂?
	 * @param userManageVO ?ъ슜?먯큹湲고솕?뺣낫
	 * @param model        ?붾㈃紐⑤뜽
	 * @return cmm/uss/umt/EgovUserInsert
	 * @throws Exception
	 */
	@RequestMapping("/uss/umt/EgovUserInsertView.do")
	public String insertUserView(@ModelAttribute("userSearchVO") UserDefaultVO userSearchVO,
			@ModelAttribute("userManageVO") UserManageVO userManageVO, Model model) throws Exception {

		// 誘몄씤利??ъ슜?먯뿉 ???蹂댁븞泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			return "index";
		}

		ComDefaultCodeVO comDefaultCodeVO = new ComDefaultCodeVO();

		// ?⑥뒪?뚮뱶?뚰듃紐⑸줉??肄붾뱶?뺣낫濡쒕???議고쉶
		comDefaultCodeVO.setCodeId("COM022");
		List<CmmnDetailCode> passwordHintResult = cmmUseService.selectCmmCodeDetail(comDefaultCodeVO);
		// ?깅퀎援щ텇肄붾뱶瑜?肄붾뱶?뺣낫濡쒕???議고쉶
		comDefaultCodeVO.setCodeId("COM014");
		List<CmmnDetailCode> sexdstnCodeResult = cmmUseService.selectCmmCodeDetail(comDefaultCodeVO);
		// ?ъ슜?먯긽?쒖퐫?쒕? 肄붾뱶?뺣낫濡쒕???議고쉶
		comDefaultCodeVO.setCodeId("COM013");
		List<CmmnDetailCode> emplyrSttusCodeResult = cmmUseService.selectCmmCodeDetail(comDefaultCodeVO);
		// ?뚯냽湲곌?肄붾뱶瑜?肄붾뱶?뺣낫濡쒕???議고쉶 - COM025
		comDefaultCodeVO.setCodeId("COM025");
		List<CmmnDetailCode> insttCodeResult = cmmUseService.selectCmmCodeDetail(comDefaultCodeVO);
		// 議곗쭅?뺣낫瑜?議고쉶 - ORGNZT_ID?뺣낫
		comDefaultCodeVO.setTableNm("COMTNORGNZTINFO");
		List<CmmnDetailCode> orgnztIdResult = cmmUseService.selectOgrnztIdDetail(comDefaultCodeVO);
		// 洹몃９?뺣낫瑜?議고쉶 - GROUP_ID?뺣낫
		comDefaultCodeVO.setTableNm("COMTNORGNZTINFO");
		List<CmmnDetailCode> groupIdResult = cmmUseService.selectGroupIdDetail(comDefaultCodeVO);

		model.addAttribute("passwordHint_result", passwordHintResult); // ?⑥뒪?뚰듃?뚰듃紐⑸줉
		model.addAttribute("sexdstnCode_result", sexdstnCodeResult); // ?깅퀎援щ텇肄붾뱶紐⑸줉
		model.addAttribute("emplyrSttusCode_result", emplyrSttusCodeResult);// ?ъ슜?먯긽?쒖퐫?쒕ぉ濡?
		model.addAttribute("insttCode_result", insttCodeResult); // ?뚯냽湲곌?肄붾뱶紐⑸줉
		model.addAttribute("orgnztId_result", orgnztIdResult); // 議곗쭅?뺣낫 紐⑸줉
		model.addAttribute("groupId_result", groupIdResult); // 洹몃９?뺣낫 紐⑸줉

		return "egovframework/com/uss/umt/EgovUserInsert";
	}

	/**
	 * ?ъ슜?먮벑濡앹쿂由ы썑 紐⑸줉?붾㈃?쇰줈 ?대룞?쒕떎.
	 * 
	 * @param userManageVO  ?ъ슜?먮벑濡앹젙蹂?
	 * @param bindingResult ?낅젰媛믨?利앹슜 bindingResult
	 * @param model         ?붾㈃紐⑤뜽
	 * @return forward:/uss/umt/EgovUserManage.do
	 * @throws Exception
	 */
	@RequestMapping("/uss/umt/EgovUserInsert.do")
	public String insertUser(@ModelAttribute("userManageVO") UserManageVO userManageVO, BindingResult bindingResult,
			Model model) throws Exception {

		// 誘몄씤利??ъ슜?먯뿉 ???蹂댁븞泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			return "index";
		}

		if (bindingResult.hasErrors()) {
			return "egovframework/com/uss/umt/EgovUserInsert";
		} else {
			if ("".equals(userManageVO.getOrgnztId())) {// KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
				userManageVO.setOrgnztId(null);
			}
			if ("".equals(userManageVO.getGroupId())) {// KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
				userManageVO.setGroupId(null);
			}
			userManageService.insertUser(userManageVO);
			// Exception ?놁씠 吏꾪뻾???깅줉?깃났硫붿떆吏
			model.addAttribute("resultMsg", "success.common.insert");
		}
		return "forward:/uss/umt/EgovUserManage.do";
	}

	/**
	 * ?ъ슜?먯젙蹂??섏젙???꾪빐 ?ъ슜?먯젙蹂대? ?곸꽭議고쉶?쒕떎.
	 * 
	 * @param uniqId       ?곸꽭議고쉶????ъ슜?먯븘?대뵒
	 * @param userSearchVO 寃?됱“嫄?
	 * @param model        ?붾㈃紐⑤뜽
	 * @return uss/umt/EgovUserSelectUpdt
	 * @throws Exception
	 */
	@RequestMapping("/uss/umt/EgovUserSelectUpdtView.do")
	public String updateUserView(@RequestParam("selectedId") String uniqId,
			@ModelAttribute("searchVO") UserDefaultVO userSearchVO, Model model) throws Exception {

		// 誘몄씤利??ъ슜?먯뿉 ???蹂댁븞泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			return "index";
		}

		ComDefaultCodeVO vo = new ComDefaultCodeVO();

		// ?⑥뒪?뚮뱶?뚰듃紐⑸줉??肄붾뱶?뺣낫濡쒕???議고쉶
		vo.setCodeId("COM022");
		List<CmmnDetailCode> passwordHintResult = cmmUseService.selectCmmCodeDetail(vo);
		// ?깅퀎援щ텇肄붾뱶瑜?肄붾뱶?뺣낫濡쒕???議고쉶
		vo.setCodeId("COM014");
		List<CmmnDetailCode> sexdstnCodeResult = cmmUseService.selectCmmCodeDetail(vo);
		// ?ъ슜?먯긽?쒖퐫?쒕? 肄붾뱶?뺣낫濡쒕???議고쉶
		vo.setCodeId("COM013");
		List<CmmnDetailCode> emplyrSttusCodeResult = cmmUseService.selectCmmCodeDetail(vo);
		// ?뚯냽湲곌?肄붾뱶瑜?肄붾뱶?뺣낫濡쒕???議고쉶 - COM025
		vo.setCodeId("COM025");
		List<CmmnDetailCode> insttCodeResult = cmmUseService.selectCmmCodeDetail(vo);
		// 議곗쭅?뺣낫瑜?議고쉶 - ORGNZT_ID?뺣낫
		vo.setTableNm("COMTNORGNZTINFO");
		List<CmmnDetailCode> orgnztIdResult = cmmUseService.selectOgrnztIdDetail(vo);
		// 洹몃９?뺣낫瑜?議고쉶 - GROUP_ID?뺣낫
		vo.setTableNm("COMTNORGNZTINFO");
		List<CmmnDetailCode> groupIdResult = cmmUseService.selectGroupIdDetail(vo);

		model.addAttribute("passwordHint_result", passwordHintResult); // ?⑥뒪?뚰듃?뚰듃紐⑸줉
		model.addAttribute("sexdstnCode_result", sexdstnCodeResult); // ?깅퀎援щ텇肄붾뱶紐⑸줉
		model.addAttribute("emplyrSttusCode_result", emplyrSttusCodeResult);// ?ъ슜?먯긽?쒖퐫?쒕ぉ濡?
		model.addAttribute("insttCode_result", insttCodeResult); // ?뚯냽湲곌?肄붾뱶紐⑸줉
		model.addAttribute("orgnztId_result", orgnztIdResult); // 議곗쭅?뺣낫 紐⑸줉
		model.addAttribute("groupId_result", groupIdResult); // 洹몃９?뺣낫 紐⑸줉

		UserManageVO userManageVO = new UserManageVO();
		userManageVO = userManageService.selectUser(uniqId);
		model.addAttribute("userSearchVO", userSearchVO);
		model.addAttribute("userManageVO", userManageVO);

		return "egovframework/com/uss/umt/EgovUserSelectUpdt";
	}

	/**
	 * 濡쒓렇?몄씤利앹젣???댁젣
	 * 
	 * @param userManageVO ?ъ슜?먯젙蹂?
	 * @param model        ?붾㈃紐⑤뜽
	 * @return uss/umt/EgovUserSelectUpdtView.do
	 * @throws Exception
	 */
	@RequestMapping("/uss/umt/EgovUserLockIncorrect.do")
	public String updateLockIncorrect(UserManageVO userManageVO, Model model) throws Exception {

		// 誘몄씤利??ъ슜?먯뿉 ???蹂댁븞泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			return "index";
		}

		userManageService.updateLockIncorrect(userManageVO);

		return "forward:/uss/umt/EgovUserSelectUpdtView.do";
	}

	/**
	 * ?ъ슜?먯젙蹂??섏젙??紐⑸줉議고쉶 ?붾㈃?쇰줈 ?대룞?쒕떎.
	 * 
	 * @param userManageVO  ?ъ슜?먯닔?뺤젙蹂?
	 * @param bindingResult ?낅젰媛믨?利앹슜 bindingResult
	 * @param model         ?붾㈃紐⑤뜽
	 * @return forward:/uss/umt/EgovUserManage.do
	 * @throws Exception
	 */
	@RequestMapping("/uss/umt/EgovUserSelectUpdt.do")
	public String updateUser(@ModelAttribute("userManageVO") UserManageVO userManageVO, BindingResult bindingResult,
			Model model) throws Exception {

		// 誘몄씤利??ъ슜?먯뿉 ???蹂댁븞泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			return "index";
		}

		if (bindingResult.hasErrors()) {
			model.addAttribute("resultMsg", bindingResult.getAllErrors().get(0).getDefaultMessage());
			return "forward:/uss/umt/EgovUserManage.do";
		} else {
			// ?낅Т?ъ슜???섏젙???덉뒪?좊━ ?뺣낫瑜??깅줉?쒕떎.
			userManageService.insertUserHistory(userManageVO);
			if ("".equals(userManageVO.getOrgnztId())) {// KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
				userManageVO.setOrgnztId(null);
			}
			if ("".equals(userManageVO.getGroupId())) {// KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
				userManageVO.setGroupId(null);
			}
			userManageService.updateUser(userManageVO);
			// Exception ?놁씠 吏꾪뻾???섏젙?깃났硫붿떆吏
			model.addAttribute("resultMsg", "success.common.update");
			return "forward:/uss/umt/EgovUserManage.do";
		}
	}

	/**
	 * ?ъ슜?먯젙蹂댁궘?쒗썑 紐⑸줉議고쉶 ?붾㈃?쇰줈 ?대룞?쒕떎.
	 * 
	 * @param checkedIdForDel ??젣??곸븘?대뵒 ?뺣낫
	 * @param userSearchVO    寃?됱“嫄?
	 * @param model           ?붾㈃紐⑤뜽
	 * @return forward:/uss/umt/EgovUserManage.do
	 * @throws Exception
	 */
	@RequestMapping("/uss/umt/EgovUserDelete.do")
	public String deleteUser(@RequestParam("checkedIdForDel") String checkedIdForDel,
			@ModelAttribute("searchVO") UserDefaultVO userSearchVO, Model model) throws Exception {

		// 誘몄씤利??ъ슜?먯뿉 ???蹂댁븞泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			return "index";
		}

		userManageService.deleteUser(checkedIdForDel);
		// Exception ?놁씠 吏꾪뻾???깅줉?깃났硫붿떆吏
		model.addAttribute("resultMsg", "success.common.delete");
		return "forward:/uss/umt/EgovUserManage.do";
	}

	/**
	 * ?낅젰???ъ슜?먯븘?대뵒??以묐났?뺤씤?붾㈃ ?대룞
	 * 
	 * @param model ?붾㈃紐⑤뜽
	 * @return uss/umt/EgovIdDplctCnfirm
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/umt/EgovIdDplctCnfirmView.do")
	public String checkIdDplct(ModelMap model) throws Exception {

		// 誘몄씤利??ъ슜?먯뿉 ???蹂댁븞泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			return "index";
		}

		model.addAttribute("checkId", "");
		model.addAttribute("usedCnt", "-1");
		return "egovframework/com/uss/umt/EgovIdDplctCnfirm";
	}

	/**
	 * ?낅젰???ъ슜?먯븘?대뵒??以묐났?щ?瑜?泥댄겕?섏뿬 ?ъ슜媛?μ뿬遺瑜??뺤씤
	 * 
	 * @param commandMap ?뚮씪硫뷀꽣?꾨떖??commandMap
	 * @param model      ?붾㈃紐⑤뜽
	 * @return uss/umt/EgovIdDplctCnfirm
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/umt/EgovIdDplctCnfirm.do")
	public String checkIdDplct(@RequestParam Map<String, Object> commandMap, ModelMap model) throws Exception {

		// 誘몄씤利??ъ슜?먯뿉 ???蹂댁븞泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			return "index";
		}

		// 2022.11.11 ?쒗걧?댁퐫??泥섎━
		String checkId = (String) commandMap.get("checkId");
		if (checkId == null || checkId.equals("")) {
			return "forward:/uss/umt/EgovIdDplctCnfirmView.do";
		} else {
			checkId = new String(checkId.getBytes("ISO-8859-1"), "UTF-8");
		}

		int usedCnt = userManageService.checkIdDplct(checkId);
		model.addAttribute("usedCnt", usedCnt);
		model.addAttribute("checkId", checkId);

		return "egovframework/com/uss/umt/EgovIdDplctCnfirm";
	}

	/**
	 * ?낅젰???ъ슜?먯븘?대뵒??以묐났?щ?瑜?泥댄겕?섏뿬 ?ъ슜媛?μ뿬遺瑜??뺤씤
	 * 
	 * @param commandMap ?뚮씪硫뷀꽣?꾨떖??commandMap
	 * @param model      ?붾㈃紐⑤뜽
	 * @return uss/umt/EgovIdDplctCnfirm
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/umt/EgovIdDplctCnfirmAjax.do")
	public ModelAndView checkIdDplctAjax(@RequestParam Map<String, Object> commandMap) throws Exception {

		ModelAndView modelAndView = new ModelAndView();
		modelAndView.setViewName("jsonView");

		String checkId = (String) commandMap.get("checkId");
		// checkId = new String(checkId.getBytes("ISO-8859-1"), "UTF-8");

		int usedCnt = userManageService.checkIdDplct(checkId);
		modelAndView.addObject("usedCnt", usedCnt);
		modelAndView.addObject("checkId", checkId);

		return modelAndView;
	}

	/**
	 * ?낅Т?ъ슜???뷀샇 ?섏젙泥섎━ ???붾㈃ ?대룞
	 * 
	 * @param model        ?붾㈃紐⑤뜽
	 * @param commandMap   ?뚮씪硫뷀꽣?꾨떖??commandMap
	 * @param userSearchVO 寃?됱“ 嫄?
	 * @param userManageVO ?ъ슜?먯닔?뺤젙蹂?鍮꾨?踰덊샇)
	 * @return uss/umt/EgovUserPasswordUpdt
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/umt/EgovUserPasswordUpdt.do")
	public String updatePassword(ModelMap model, @RequestParam Map<String, Object> commandMap,
			@ModelAttribute("searchVO") UserDefaultVO userSearchVO,
			@ModelAttribute("userManageVO") UserManageVO userManageVO) throws Exception {

		// 誘몄씤利??ъ슜?먯뿉 ???蹂댁븞泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			return "index";
		}

		String oldPassword = (String) commandMap.get("oldPassword");
		String newPassword = (String) commandMap.get("newPassword");
		String newPassword2 = (String) commandMap.get("newPassword2");
		String uniqId = (String) commandMap.get("uniqId");

		boolean isCorrectPassword = false;
		UserManageVO resultVO = new UserManageVO();
		userManageVO.setPassword(newPassword);
		userManageVO.setOldPassword(oldPassword);
		userManageVO.setUniqId(uniqId);

		String resultMsg = "";
		resultVO = userManageService.selectPassword(userManageVO);
		// ?⑥뒪?뚮뱶 ?뷀샇??
		String encryptPass = EgovFileScrty.encryptPassword(oldPassword, userManageVO.getEmplyrId());
		if (encryptPass.equals(resultVO.getPassword())) {
			if (newPassword.equals(newPassword2)) {
				isCorrectPassword = true;
			} else {
				isCorrectPassword = false;
				resultMsg = "fail.user.passwordUpdate2";
			}
		} else {
			isCorrectPassword = false;
			resultMsg = "fail.user.passwordUpdate1";
		}

		if (isCorrectPassword) {
			userManageVO.setPassword(EgovFileScrty.encryptPassword(newPassword, userManageVO.getEmplyrId()));
			userManageService.updatePassword(userManageVO);
			model.addAttribute("userManageVO", userManageVO);
			resultMsg = "success.common.update";
		} else {
			model.addAttribute("userManageVO", userManageVO);
		}
		model.addAttribute("userSearchVO", userSearchVO);
		model.addAttribute("resultMsg", resultMsg);

		return "egovframework/com/uss/umt/EgovUserPasswordUpdt";
	}

	/**
	 * ?낅Т?ъ슜???뷀샇 ?섏젙 ?붾㈃ ?대룞
	 * 
	 * @param model        ?붾㈃紐⑤뜽
	 * @param commandMap   ?뚮씪硫뷀꽣?꾨떖??commandMap
	 * @param userSearchVO 寃?됱“嫄?
	 * @param userManageVO ?ъ슜?먯닔?뺤젙蹂?鍮꾨?踰덊샇)
	 * @return uss/umt/EgovUserPasswordUpdt
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/umt/EgovUserPasswordUpdtView.do")
	public String updatePasswordView(ModelMap model, @RequestParam Map<String, Object> commandMap,
			@ModelAttribute("searchVO") UserDefaultVO userSearchVO,
			@ModelAttribute("userManageVO") UserManageVO userManageVO) throws Exception {

		// 誘몄씤利??ъ슜?먯뿉 ???蹂댁븞泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			return "index";
		}

		String userTyForPassword = (String) commandMap.get("userTyForPassword");
		userManageVO.setUserTy(userTyForPassword);

		model.addAttribute("userManageVO", userManageVO);
		model.addAttribute("userSearchVO", userSearchVO);
		return "egovframework/com/uss/umt/EgovUserPasswordUpdt";
	}

	/**
	 * ?쎄??숈쓽 ???붾㈃ ?대룞
	 * 
	 * @return ?대룞???붾㈃? ?붿씠?몃━?ㅽ듃濡?泥섎━??
	 * @throws Exception
	 */
	@RequestMapping("/uss/umt/EgovRlnmCnfirm.do")
	public String rlnmCnfirm(Model model, @RequestParam Map<String, Object> commandMap) throws Exception {

		model.addAttribute("ihidnum", commandMap.get("ihidnum")); // 二쇰?踰덊샇
		model.addAttribute("realname", commandMap.get("realname")); // ?ъ슜?먯씠由?
		model.addAttribute("sbscrbTy", commandMap.get("sbscrbTy")); // ?ъ슜?먯쑀??
		model.addAttribute("nextUrlName", commandMap.get("nextUrlName")); // ?ㅼ쓬?④퀎踰꾪듉紐??대룞??URL???곕Ⅸ)
		Integer linkIndex = Integer.parseInt((String) commandMap.get("nextUrl"));
		model.addAttribute("nextUrl", linkIndex); // ?ㅼ쓬?④퀎濡??대룞??URL

		// ?붿씠??由ъ뒪??泥섎━
		String link = "";
		// ?붿씠??由ъ뒪?멸? 鍮꾩뿀?붿? ?뺤씤
		if (nextUrlWhitelist == null || nextUrlWhitelist.isEmpty() || nextUrlWhitelist.size() <= linkIndex) {
			link = "egovframework/com/cmm/egovError";
			return link;
		}

		link = nextUrlWhitelist.get(linkIndex);

		link = link.replace(";", "");
		link = link.replace("%", "");

		// ?덉쟾??寃쎈줈 臾몄옄?대줈 議곗튂
		link = EgovWebUtil.filePathBlackList(link);

		// ?ㅻ챸?몄쬆湲곕뒫 誘명깙?щ줈 諛붾줈 ?뚯썝媛???섏씠吏濡??대룞.
		return "forward:" + link;
	}

}
