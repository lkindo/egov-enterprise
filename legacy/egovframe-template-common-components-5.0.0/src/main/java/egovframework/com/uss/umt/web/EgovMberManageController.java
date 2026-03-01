package egovframework.com.uss.umt.web;

import java.util.List;
import java.util.Map;

import org.apache.commons.lang3.StringUtils;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.service.CmmnDetailCode;
import egovframework.com.cmm.service.EgovCmmUseService;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.uss.umt.service.EgovMberManageService;
import egovframework.com.uss.umt.service.MberManageVO;
import egovframework.com.uss.umt.service.StplatVO;
import egovframework.com.uss.umt.service.UserDefaultVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import egovframework.com.utl.sim.service.EgovFileScrty;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;

/**
 * ?쇰컲?뚯썝愿???붿껌??鍮꾩??덉뒪 ?대옒?ㅻ줈 ?꾨떖?섍퀬 泥섎━?쒓껐怨쇰? ?대떦 ???붾㈃?쇰줈 ?꾨떖?섎뒗 Controller瑜??뺤쓽?쒕떎
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
 *   2021.05.30  ?뺤쭊??         ?붿??몄썝?⑥뒪 ?뺣낫 議고쉶
 *   2022.07.13  源?댁?          ?붿??몄썝?⑥뒪 ?뺣낫 議고쉶 null ?먮퀎 ?섏젙
 *   2025.08.28  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(final???꾨땶 蹂?섎뒗 諛묒쨪???ы븿?????놁쓬)
 *
 *      </pre>
 */
@Controller
public class EgovMberManageController {

	/** mberManageService */
	@Resource(name = "mberManageService")
	private EgovMberManageService mberManageService;

	/** cmmUseService */
	@Resource(name = "EgovCmmUseService")
	private EgovCmmUseService cmmUseService;

	/** EgovPropertyService */
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;


	/**
	 * ?쇰컲?뚯썝紐⑸줉??議고쉶?쒕떎. (pageing)
	 *
	 * @param userSearchVO 寃?됱“嫄댁젙蹂?
	 * @param model        ?붾㈃紐⑤뜽
	 * @return uss/umt/EgovMberManage
	 * @throws Exception
	 */
	@IncludedInfo(name = "?쇰컲?뚯썝愿由?, order = 470, gid = 50)
	@RequestMapping(value = "/uss/umt/EgovMberManage.do")
	public String selectMberList(@ModelAttribute("userSearchVO") UserDefaultVO userSearchVO, ModelMap model)
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

		List<MberManageVO> resultList = mberManageService.selectMberList(userSearchVO);
		model.addAttribute("resultList", resultList);

		int totCnt = mberManageService.selectMberListTotCnt(userSearchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		// ?쇰컲?뚯썝 ?곹깭肄붾뱶瑜?肄붾뱶?뺣낫濡쒕???議고쉶
		ComDefaultCodeVO comDefaultCodeVO = new ComDefaultCodeVO();
		comDefaultCodeVO.setCodeId("COM013");
		List<CmmnDetailCode> mberSttusResult = cmmUseService.selectCmmCodeDetail(comDefaultCodeVO);
		model.addAttribute("entrprsMberSttus_result", mberSttusResult);// 湲곗뾽?뚯썝?곹깭肄붾뱶紐⑸줉

		return "egovframework/com/uss/umt/EgovMberManage";
	}

	/**
	 * ?쇰컲?뚯썝?깅줉?붾㈃?쇰줈 ?대룞?쒕떎.
	 *
	 * @param userSearchVO 寃?됱“嫄댁젙蹂?
	 * @param mberManageVO ?쇰컲?뚯썝珥덇린?붿젙蹂?
	 * @param model        ?붾㈃紐⑤뜽
	 * @return uss/umt/EgovMberInsert
	 * @throws Exception
	 */
	@RequestMapping("/uss/umt/EgovMberInsertView.do")
	public String insertMberView(@ModelAttribute("userSearchVO") UserDefaultVO userSearchVO,
			@ModelAttribute("mberManageVO") MberManageVO mberManageVO, Model model) throws Exception {

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
		List<CmmnDetailCode> mberSttusResult = cmmUseService.selectCmmCodeDetail(comDefaultCodeVO);
		// 洹몃９?뺣낫瑜?議고쉶 - GROUP_ID?뺣낫
		comDefaultCodeVO.setTableNm("COMTNORGNZTINFO");
		List<CmmnDetailCode> groupIdResult = cmmUseService.selectGroupIdDetail(comDefaultCodeVO);

		model.addAttribute("passwordHint_result", passwordHintResult); // ?⑥뒪?뚰듃?뚰듃紐⑸줉
		model.addAttribute("sexdstnCode_result", sexdstnCodeResult); // ?깅퀎援щ텇肄붾뱶紐⑸줉
		model.addAttribute("mberSttus_result", mberSttusResult); // ?ъ슜?먯긽?쒖퐫?쒕ぉ濡?
		model.addAttribute("groupId_result", groupIdResult); // 洹몃９?뺣낫 紐⑸줉

		return "egovframework/com/uss/umt/EgovMberInsert";
	}

	/**
	 * ?쇰컲?뚯썝?깅줉泥섎━??紐⑸줉?붾㈃?쇰줈 ?대룞?쒕떎.
	 *
	 * @param mberManageVO  ?쇰컲?뚯썝?깅줉?뺣낫
	 * @param bindingResult ?낅젰媛믨?利앹슜 bindingResult
	 * @param model         ?붾㈃紐⑤뜽
	 * @return forward:/uss/umt/EgovMberManage.do
	 * @throws Exception
	 */
	@RequestMapping("/uss/umt/EgovMberInsert.do")
	public String insertMber(@Valid @ModelAttribute("mberManageVO") MberManageVO mberManageVO, BindingResult bindingResult,
			Model model) throws Exception {

		// 誘몄씤利??ъ슜?먯뿉 ???蹂댁븞泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			return "index";
		}

		if (bindingResult.hasErrors()) {

			ComDefaultCodeVO comDefaultCodeVO = new ComDefaultCodeVO();

			// ?⑥뒪?뚮뱶?뚰듃紐⑸줉??肄붾뱶?뺣낫濡쒕???議고쉶
			comDefaultCodeVO.setCodeId("COM022");
			List<CmmnDetailCode> passwordHintResult = cmmUseService.selectCmmCodeDetail(comDefaultCodeVO);
			// ?깅퀎援щ텇肄붾뱶瑜?肄붾뱶?뺣낫濡쒕???議고쉶
			comDefaultCodeVO.setCodeId("COM014");
			List<CmmnDetailCode> sexdstnCodeResult = cmmUseService.selectCmmCodeDetail(comDefaultCodeVO);
			// ?ъ슜?먯긽?쒖퐫?쒕? 肄붾뱶?뺣낫濡쒕???議고쉶
			comDefaultCodeVO.setCodeId("COM013");
			List<CmmnDetailCode> mberSttusResult = cmmUseService.selectCmmCodeDetail(comDefaultCodeVO);
			// 洹몃９?뺣낫瑜?議고쉶 - GROUP_ID?뺣낫
			comDefaultCodeVO.setTableNm("COMTNORGNZTINFO");
			List<CmmnDetailCode> groupIdResult = cmmUseService.selectGroupIdDetail(comDefaultCodeVO);

			model.addAttribute("passwordHint_result", passwordHintResult); // ?⑥뒪?뚰듃?뚰듃紐⑸줉
			model.addAttribute("sexdstnCode_result", sexdstnCodeResult); // ?깅퀎援щ텇肄붾뱶紐⑸줉
			model.addAttribute("mberSttus_result", mberSttusResult); // ?ъ슜?먯긽?쒖퐫?쒕ぉ濡?
			model.addAttribute("groupId_result", groupIdResult); // 洹몃９?뺣낫 紐⑸줉

			return "egovframework/com/uss/umt/EgovMberInsert";
		} else {
			if ("".equals(mberManageVO.getGroupId())) {// KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
				mberManageVO.setGroupId(null);
			}
			mberManageService.insertMber(mberManageVO);
			// Exception ?놁씠 吏꾪뻾???깅줉 ?깃났硫붿떆吏
			model.addAttribute("resultMsg", "success.common.insert");
		}
		return "forward:/uss/umt/EgovMberManage.do";
	}

	/**
	 * ?쇰컲?뚯썝?뺣낫 ?섏젙???꾪빐 ?쇰컲?뚯썝?뺣낫瑜??곸꽭議고쉶?쒕떎.
	 *
	 * @param mberId       ?곸꽭議고쉶????쇰컲?뚯썝?꾩씠??
	 * @param userSearchVO 寃?됱“嫄?
	 * @param model        ?붾㈃紐⑤뜽
	 * @return uss/umt/EgovMberSelectUpdt
	 * @throws Exception
	 */
	@RequestMapping("/uss/umt/EgovMberSelectUpdtView.do")
	public String updateMberView(@RequestParam("selectedId") String mberId,
			@ModelAttribute("searchVO") UserDefaultVO userSearchVO, HttpServletRequest request, Model model)
			throws Exception {

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
		List<CmmnDetailCode> mberSttusResult = cmmUseService.selectCmmCodeDetail(vo);

		// 洹몃９?뺣낫瑜?議고쉶 - GROUP_ID?뺣낫
		vo.setTableNm("COMTNORGNZTINFO");
		List<CmmnDetailCode> groupIdResult = cmmUseService.selectGroupIdDetail(vo);

		model.addAttribute("passwordHint_result", passwordHintResult); // ?⑥뒪?뚰듃?뚰듃紐⑸줉
		model.addAttribute("sexdstnCode_result", sexdstnCodeResult); // ?깅퀎援щ텇肄붾뱶紐⑸줉
		model.addAttribute("mberSttus_result", mberSttusResult); // ?ъ슜?먯긽?쒖퐫?쒕ぉ濡?
		model.addAttribute("groupId_result", groupIdResult); // 洹몃９?뺣낫 紐⑸줉

		MberManageVO mberManageVO = mberManageService.selectMber(mberId);
		model.addAttribute("mberManageVO", mberManageVO);
		model.addAttribute("userSearchVO", userSearchVO);

		// 2021.05.30, ?뺤쭊?? ?붿??몄썝?⑥뒪 ?뺣낫 議고쉶
		LoginVO loginVO = (LoginVO) request.getSession().getAttribute("loginVO");
		String onepassUserId = loginVO.getUniqId();
		String onepassUserkey = loginVO.getOnepassUserkey();
		String onepassIntfToken = loginVO.getOnepassIntfToken();
		if (mberId.equals(onepassUserId)) {
			model.addAttribute("onepassUserkey", onepassUserkey); // ?붿??몄썝?⑥뒪 ?ъ슜?먰궎
			model.addAttribute("onepassIntfToken", onepassIntfToken); // ?붿??몄썝?⑥뒪 ?ъ슜?먯꽭?섍컪
		} else {
			model.addAttribute("onepassUserkey", "");
			model.addAttribute("onepassIntfToken", "");
		}

		return "egovframework/com/uss/umt/EgovMberSelectUpdt";
	}

	/**
	 * 濡쒓렇?몄씤利앹젣???댁젣
	 *
	 * @param mberManageVO ?쇰컲?뚯썝?깅줉?뺣낫
	 * @param model        ?붾㈃紐⑤뜽
	 * @return uss/umt/EgovMberSelectUpdtView.do
	 * @throws Exception
	 */
	@RequestMapping("/uss/umt/EgovMberLockIncorrect.do")
	public String updateLockIncorrect(MberManageVO mberManageVO, Model model) throws Exception {

		// 誘몄씤利??ъ슜?먯뿉 ???蹂댁븞泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			return "index";
		}

		mberManageService.updateLockIncorrect(mberManageVO);

		return "forward:/uss/umt/EgovMberSelectUpdtView.do";
	}

	/**
	 * ?쇰컲?뚯썝?뺣낫 ?섏젙??紐⑸줉議고쉶 ?붾㈃?쇰줈 ?대룞?쒕떎.
	 *
	 * @param mberManageVO  ?쇰컲?뚯썝?섏젙?뺣낫
	 * @param bindingResult ?낅젰媛믨?利앹슜 bindingResult
	 * @param model         ?붾㈃紐⑤뜽
	 * @return forward:/uss/umt/EgovMberManage.do
	 * @throws Exception
	 */
	@RequestMapping("/uss/umt/EgovMberSelectUpdt.do")
	public String updateMber(@ModelAttribute("mberManageVO") MberManageVO mberManageVO, BindingResult bindingResult,
			Model model) throws Exception {

		// 誘몄씤利??ъ슜?먯뿉 ???蹂댁븞泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			return "index";
		}

		if (bindingResult.hasErrors()) {
			model.addAttribute("resultMsg", bindingResult.getAllErrors().get(0).getDefaultMessage());
			return "forward:/uss/umt/EgovMberManage.do";
		} else {
			if ("".equals(mberManageVO.getGroupId())) {// KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
				mberManageVO.setGroupId(null);
			}
			mberManageService.updateMber(mberManageVO);
			// Exception ?놁씠 吏꾪뻾???섏젙?깃났硫붿떆吏
			model.addAttribute("resultMsg", "success.common.update");
			return "forward:/uss/umt/EgovMberManage.do";
		}
	}

	/**
	 * ?쇰컲?뚯썝?뺣낫??젣??紐⑸줉議고쉶 ?붾㈃?쇰줈 ?대룞?쒕떎.
	 *
	 * @param checkedIdForDel ??젣????꾩씠???뺣낫
	 * @param userSearchVO    寃?됱“嫄댁젙蹂?
	 * @param model           ?붾㈃紐⑤뜽
	 * @return forward:/uss/umt/EgovMberManage.do
	 * @throws Exception
	 */
	@RequestMapping("/uss/umt/EgovMberDelete.do")
	public String deleteMber(@RequestParam("checkedIdForDel") String checkedIdForDel,
			@ModelAttribute("searchVO") UserDefaultVO userSearchVO, HttpServletRequest request, Model model)
			throws Exception {

		// 誘몄씤利??ъ슜?먯뿉 ???蹂댁븞泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			return "index";
		}

		// 2021.05.30, ?뺤쭊?? ?붿??몄썝?⑥뒪 ?뺣낫 議고쉶
		// 2022.07.13, 源?댁?, null ?먮퀎 ?섏젙
		LoginVO loginVO = (LoginVO) request.getSession().getAttribute("loginVO");
		String onepassUserkey = loginVO.getOnepassUserkey();
		String onepassIntfToken = loginVO.getOnepassIntfToken();
		if (StringUtils.isNotEmpty(onepassUserkey) || StringUtils.isNotEmpty(onepassIntfToken)) {
			model.addAttribute("resultMsg", "digital.onepass.delete.alert");
		} else {
			mberManageService.deleteMber(checkedIdForDel);
			model.addAttribute("resultMsg", "success.common.delete");
		}

		return "forward:/uss/umt/EgovMberManage.do";
	}

	// ?덊눜 泥섎━ 湲곕뒫??????덉떆
	// 221114 源?쒖? 2022 ?쒗걧?댁퐫??議곗튂
	@RequestMapping("/uss/umt/EgovMberWithdraw.do")
	public String withdrawMber(Model model) throws Exception {

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (!isAuthenticated) {
			model.addAttribute("resultMsg", "fail.common.delete");

			return "redirect:/";
		}

		mberManageService.deleteMber(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));
		// Exception ?놁씠 吏꾪뻾????젣?깃났硫붿떆吏
		model.addAttribute("resultMsg", "success.common.delete");

		return "redirect:/";
	}

	/**
	 * ?쇰컲?뚯썝媛?낆떊泥??깅줉?붾㈃?쇰줈 ?대룞?쒕떎.
	 *
	 * @param userSearchVO 寃?됱“嫄?
	 * @param mberManageVO ?쇰컲?뚯썝媛?낆떊泥?젙蹂?
	 * @param commandMap   ?뚮씪硫뷀꽣?꾨떖??commandMap
	 * @param model        ?붾㈃紐⑤뜽
	 * @return uss/umt/EgovMberSbscrb
	 * @throws Exception
	 */
	@RequestMapping("/uss/umt/EgovMberSbscrbView.do")
	public String sbscrbMberView(@ModelAttribute("userSearchVO") UserDefaultVO userSearchVO,
			@ModelAttribute("mberManageVO") MberManageVO mberManageVO, @RequestParam Map<String, Object> commandMap,
			Model model) throws Exception {

		ComDefaultCodeVO comDefaultCodeVO = new ComDefaultCodeVO();

		// ?⑥뒪?뚮뱶?뚰듃紐⑸줉??肄붾뱶?뺣낫濡쒕???議고쉶
		comDefaultCodeVO.setCodeId("COM022");
		List<CmmnDetailCode> passwordHintResult = cmmUseService.selectCmmCodeDetail(comDefaultCodeVO);
		// ?깅퀎援щ텇肄붾뱶瑜?肄붾뱶?뺣낫濡쒕???議고쉶
		comDefaultCodeVO.setCodeId("COM014");
		List<CmmnDetailCode> sexdstnCodeResult = cmmUseService.selectCmmCodeDetail(comDefaultCodeVO);

		model.addAttribute("passwordHint_result", passwordHintResult); // ?⑥뒪?뚰듃?뚰듃紐⑸줉
		model.addAttribute("sexdstnCode_result", sexdstnCodeResult); // ?깅퀎援щ텇肄붾뱶紐⑸줉
		if (!"".equals(commandMap.get("realname"))) {
			model.addAttribute("mberNm", commandMap.get("realname")); // ?ㅻ챸?몄쬆???대쫫 - 二쇰?踰덊샇 ?몄쬆
			model.addAttribute("ihidnum", commandMap.get("ihidnum")); // ?ㅻ챸?몄쬆??二쇰??깅줉踰덊샇 - 二쇰?踰덊샇 ?몄쬆
		}
		if (!"".equals(commandMap.get("realName"))) {
			model.addAttribute("mberNm", commandMap.get("realName")); // ?ㅻ챸?몄쬆???대쫫 - ipin?몄쬆
		}

		mberManageVO.setMberSttus("DEFAULT");

		return "egovframework/com/uss/umt/EgovMberSbscrb";
	}

	/**
	 * ?쇰컲?뚯썝媛?낆떊泥?벑濡앹쿂由ы썑濡쒓렇?명솕硫댁쑝濡??대룞?쒕떎.
	 *
	 * @param mberManageVO ?쇰컲?뚯썝媛?낆떊泥?젙蹂?
	 * @return forward:/uat/uia/egovLoginUsr.do
	 * @throws Exception
	 */
	@RequestMapping("/uss/umt/EgovMberSbscrb.do")
	public String sbscrbMber(@ModelAttribute("mberManageVO") MberManageVO mberManageVO) throws Exception {

		// 媛?낆긽??珥덇린??
		mberManageVO.setMberSttus("A");
		// 洹몃９?뺣낫 珥덇린??
		// mberManageVO.setGroupId("1");
		// ?쇰컲?뚯썝媛?낆떊泥??깅줉???쇰컲?뚯썝?깅줉湲곕뒫???ъ슜?섏뿬 ?깅줉?쒕떎.
		mberManageService.insertMber(mberManageVO);
		return "forward:/uat/uia/egovLoginUsr.do";
	}

	/**
	 * ?쇰컲?뚯썝 ?쎄??뺤씤
	 *
	 * @param model ?붾㈃紐⑤뜽
	 * @return uss/umt/EgovStplatCnfirm
	 * @throws Exception
	 */
	@RequestMapping("/uss/umt/EgovStplatCnfirmMber.do")
	public String sbscrbEntrprsMber(Model model) throws Exception {

		// 誘몄씤利??ъ슜?먯뿉 ???蹂댁븞泥섎━
		// Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		// if (!isAuthenticated) {
		// return "index";
		// 
                    }

		// ?쇰컲?뚯썝???쎄? ?꾩씠???ㅼ젙
		String stplatId = "STPLAT_0000000000001";
		// ?뚯썝媛?낆쑀???ㅼ젙-?쇰컲?뚯썝
		String sbscrbTy = "USR01";
		// ?쎄??뺣낫 議고쉶
		List<StplatVO> stplatList = mberManageService.selectStplat(stplatId);
		model.addAttribute("stplatList", stplatList); // ?쎄??뺣낫 ?ы븿
		model.addAttribute("sbscrbTy", sbscrbTy); // ?뚯썝媛?낆쑀???ы븿

		return "egovframework/com/uss/umt/EgovStplatCnfirm";
	}

	/**
	 * @param model        ?붾㈃紐⑤뜽
	 * @param commandMap   ?뚮씪硫뷀꽣?꾨떖??commandMap
	 * @param userSearchVO 寃?됱“嫄?
	 * @param mberManageVO ?쇰컲?뚯썝?섏젙?뺣낫(鍮꾨?踰덊샇)
	 * @return uss/umt/EgovMberPasswordUpdt
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/umt/EgovMberPasswordUpdt.do")
	public String updatePassword(ModelMap model, @RequestParam Map<String, Object> commandMap,
			@ModelAttribute("searchVO") UserDefaultVO userSearchVO,
			@ModelAttribute("mberManageVO") MberManageVO mberManageVO) throws Exception {

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
		MberManageVO resultVO = new MberManageVO();
		mberManageVO.setPassword(newPassword);
		mberManageVO.setOldPassword(oldPassword);
		mberManageVO.setUniqId(uniqId);

		String resultMsg = "";
		resultVO = mberManageService.selectPassword(mberManageVO);
		// ?⑥뒪?뚮뱶 ?뷀샇??
		String encryptPass = EgovFileScrty.encryptPassword(oldPassword, mberManageVO.getMberId());
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
			mberManageVO.setPassword(EgovFileScrty.encryptPassword(newPassword, mberManageVO.getMberId()));
			mberManageService.updatePassword(mberManageVO);
			model.addAttribute("mberManageVO", mberManageVO);
			resultMsg = "success.common.update";
		} else {
			model.addAttribute("mberManageVO", mberManageVO);
		}
		model.addAttribute("userSearchVO", userSearchVO);
		model.addAttribute("resultMsg", resultMsg);

		return "egovframework/com/uss/umt/EgovMberPasswordUpdt";
	}

	/**
	 * ?쇰컲?뚯썝 ?뷀샇 ?섏젙 ?붾㈃ ?대룞
	 *
	 * @param model        ?붾㈃紐⑤뜽
	 * @param commandMap   ?뚮씪硫뷀꽣?꾨떖??commandMap
	 * @param userSearchVO 寃?됱“嫄?
	 * @param mberManageVO ?쇰컲?뚯썝?섏젙?뺣낫(鍮꾨?踰덊샇)
	 * @return uss/umt/EgovMberPasswordUpdt
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/umt/EgovMberPasswordUpdtView.do")
	public String updatePasswordView(ModelMap model, @RequestParam Map<String, Object> commandMap,
			@ModelAttribute("searchVO") UserDefaultVO userSearchVO,
			@ModelAttribute("mberManageVO") MberManageVO mberManageVO) throws Exception {

		// 誘몄씤利??ъ슜?먯뿉 ???蹂댁븞泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			return "index";
		}

		String userTyForPassword = (String) commandMap.get("userTyForPassword");
		mberManageVO.setUserTy(userTyForPassword);

		model.addAttribute("userSearchVO", userSearchVO);
		model.addAttribute("mberManageVO", mberManageVO);

		return "egovframework/com/uss/umt/EgovMberPasswordUpdt";
	}
}
