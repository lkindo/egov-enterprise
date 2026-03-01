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
import egovframework.com.uss.umt.service.EgovEntrprsManageService;
import egovframework.com.uss.umt.service.EntrprsManageVO;
import egovframework.com.uss.umt.service.StplatVO;
import egovframework.com.uss.umt.service.UserDefaultVO;
import egovframework.com.utl.sim.service.EgovFileScrty;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;

/**
 * 湲곗뾽?뚯썝愿???붿껌??鍮꾩??덉뒪 ?대옒?ㅻ줈 ?꾨떖?섍퀬 泥섎━?쒓껐怨쇰? ?대떦 ???붾㈃?쇰줈 ?꾨떖?섎뒗 Controller瑜??뺤쓽?쒕떎
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
 *   2020.07.18  ?ㅼ＜??         ?뷀샇 ?ㅼ젙 洹쒖튃 媛뺥솕 諛?踰꾧렇 ?섏젙
 *   2021.05.30  ?뺤쭊??         ?붿??몄썝?⑥뒪 ?뺣낫 議고쉶
 *   2022.07.13  源?댁?          ?붿??몄썝?⑥뒪 ?뺣낫 議고쉶 null ?먮퀎 ?섏젙
 *   2025.08.28  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-UnusedPrivateMethod(?ъ슜?섏? ?딅뒗 Private Method ?좎뼵???먯?)
 *
 *      </pre>
 */
@Controller
public class EgovEntrprsManageController {

	/** entrprsManageService */
	@Resource(name = "entrprsManageService")
	private EgovEntrprsManageService entrprsManageService;

	/** cmmUseService */
	@Resource(name = "EgovCmmUseService")
	private EgovCmmUseService cmmUseService;

	/** EgovPropertyService */
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	/** 鍮꾨?踰덊샇 ?뚰듃 議고쉶 紐⑸줉 */
	@ModelAttribute("passwordHint_result")
	public List<CmmnDetailCode> getPasswordHintResult(ComDefaultCodeVO comDefaultCodeVO) throws Exception {
		comDefaultCodeVO.setCodeId("COM022");
		return cmmUseService.selectCmmCodeDetail(comDefaultCodeVO);
	}

	/** ?깅퀎 議고쉶 紐⑸줉 */
	@ModelAttribute("sexdstnCode_result")
	public List<CmmnDetailCode> getSexdstnCode_result(ComDefaultCodeVO comDefaultCodeVO) throws Exception {
		comDefaultCodeVO.setCodeId("COM014");
		return cmmUseService.selectCmmCodeDetail(comDefaultCodeVO);
	}

	/** ?ъ슜???곹깭 議고쉶 紐⑸줉 */
	@ModelAttribute("entrprsMberSttus_result")
	public List<CmmnDetailCode> getEntrprsMberSttus_result(ComDefaultCodeVO comDefaultCodeVO) throws Exception {
		comDefaultCodeVO.setCodeId("COM013");
		return cmmUseService.selectCmmCodeDetail(comDefaultCodeVO);
	}

	/** 洹몃９ ?뺣낫 議고쉶 紐⑸줉 */
	@ModelAttribute("groupId_result")
	public List<CmmnDetailCode> getGroupId_result(ComDefaultCodeVO comDefaultCodeVO) throws Exception {
		comDefaultCodeVO.setTableNm("COMTNORGNZTINFO");
		return cmmUseService.selectGroupIdDetail(comDefaultCodeVO);
	}

	/** 湲곗뾽 援щ텇 議고쉶 紐⑸줉 */
	@ModelAttribute("entrprsSeCode_result")
	public List<CmmnDetailCode> getEntrprsSeCode_result(ComDefaultCodeVO comDefaultCodeVO) throws Exception {
		comDefaultCodeVO.setCodeId("COM026");
		return cmmUseService.selectCmmCodeDetail(comDefaultCodeVO);
	}

	/** ?낆쥌 援щ텇 議고쉶 紐⑸줉 */
	@ModelAttribute("indutyCode_result")
	public List<CmmnDetailCode> getIndutyCode_result(ComDefaultCodeVO comDefaultCodeVO) throws Exception {
		comDefaultCodeVO.setCodeId("COM027");
		return cmmUseService.selectCmmCodeDetail(comDefaultCodeVO);
	}

	/**
	 * 湲곗뾽?뚯썝 ?깅줉?붾㈃?쇰줈 ?대룞?쒕떎.
	 *
	 * @param userSearchVO    寃?됱“嫄댁젙蹂?
	 * @param entrprsManageVO 湲곗뾽?뚯썝 珥덇린?붿젙蹂?
	 * @param model           ?붾㈃紐⑤뜽
	 * @return uss/umt/EgovEntrprsMberInsert
	 * @throws Exception
	 */
	@RequestMapping("/uss/umt/EgovEntrprsMberInsertView.do")
	public String insertEntrprsMberView(@ModelAttribute("userSearchVO") UserDefaultVO userSearchVO,
			@ModelAttribute("entrprsManageVO") EntrprsManageVO entrprsManageVO, Model model) throws Exception {

		// 誘몄씤利??ъ슜?먯뿉 ???蹂댁븞泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			return "index";
		}

		// ComDefaultCodeVO comDefaultCodeVO = new ComDefaultCodeVO();

		// ?⑥뒪?뚮뱶?뚰듃紐⑸줉??肄붾뱶?뺣낫濡쒕???議고쉶
		// comDefaultCodeVO.setCodeId("COM022");
		// List<CmmnDetailCode> passwordHint_result =
		// cmmUseService.selectCmmCodeDetail(comDefaultCodeVO);
		// ?깅퀎援щ텇肄붾뱶瑜?肄붾뱶?뺣낫濡쒕???議고쉶
		// comDefaultCodeVO.setCodeId("COM014");
		// List<CmmnDetailCode> sexdstnCode_result =
		// cmmUseService.selectCmmCodeDetail(comDefaultCodeVO);
		// ?ъ슜?먯긽?쒖퐫?쒕? 肄붾뱶?뺣낫濡쒕???議고쉶
		// comDefaultCodeVO.setCodeId("COM013");
		// List<CmmnDetailCode> entrprsMberSttus_result =
		// cmmUseService.selectCmmCodeDetail(comDefaultCodeVO);
		// 洹몃９?뺣낫瑜?議고쉶 - GROUP_ID?뺣낫
		// comDefaultCodeVO.setTableNm("COMTNORGNZTINFO");
		// List<CmmnDetailCode> groupId_result =
		// cmmUseService.selectGroupIdDetail(comDefaultCodeVO);
		// 湲곗뾽援щ텇肄붾뱶瑜?肄붾뱶?뺣낫濡쒕???議고쉶 - COM026
		// comDefaultCodeVO.setCodeId("COM026");
		// List<CmmnDetailCode> entrprsSeCode_result =
		// cmmUseService.selectCmmCodeDetail(comDefaultCodeVO);
		// ?낆쥌肄붾뱶瑜?肄붾뱶?뺣낫濡쒕???議고쉶 - COM027
		// comDefaultCodeVO.setCodeId("COM027");
		// List<CmmnDetailCode> indutyCode_result =
		// cmmUseService.selectCmmCodeDetail(comDefaultCodeVO);

		// model.addAttribute("passwordHint_result", passwordHint_result); // ?⑥뒪?뚰듃?뚰듃紐⑸줉
		// model.addAttribute("sexdstnCode_result", sexdstnCode_result); // ?깅퀎援щ텇肄붾뱶紐⑸줉
		// model.addAttribute("entrprsMberSttus_result", entrprsMberSttus_result);//
		// ?ъ슜?먯긽?쒖퐫?쒕ぉ濡?
		// model.addAttribute("groupId_result", groupId_result); // 洹몃９?뺣낫 紐⑸줉
		// model.addAttribute("entrprsSeCode_result", entrprsSeCode_result); // 湲곗뾽援щ텇肄붾뱶
		// 紐⑸줉
		// model.addAttribute("indutyCode_result", indutyCode_result); // ?낆쥌肄붾뱶紐⑸줉

		return "egovframework/com/uss/umt/EgovEntrprsMberInsert";
	}

	/**
	 * 湲곗뾽?뚯썝?깅줉泥섎━??紐⑸줉?붾㈃?쇰줈 ?대룞?쒕떎.
	 *
	 * @param entrprsManageVO ?좉퇋湲곗뾽?뚯썝?뺣낫
	 * @param bindingResult   ?낅젰媛믨?利앹슜 bindingResult
	 * @param model           ?붾㈃紐⑤뜽
	 * @return forward:/uss/umt/EgovEntrprsMberManage.do
	 * @throws Exception
	 */
	@RequestMapping("/uss/umt/EgovEntrprsMberInsert.do")
	public String insertEntrprsMber(@ModelAttribute("entrprsManageVO") EntrprsManageVO entrprsManageVO,
			BindingResult bindingResult, Model model) throws Exception {

		// 誘몄씤利??ъ슜?먯뿉 ???蹂댁븞泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			return "index";
		}

		if (bindingResult.hasErrors()) {
			return "egovframework/com/uss/umt/EgovEntrprsMberInsert";
		} else {
			if (entrprsManageVO != null && entrprsManageVO.getGroupId() != null
					&& entrprsManageVO.getGroupId().equals("")) {// 2022.01 Null pointers should not be dereferenced
				entrprsManageVO.setGroupId(null);
			}
			entrprsManageService.insertEntrprsmber(entrprsManageVO);
			// Exception ?놁씠 吏꾪뻾???깅줉?깃났硫붿떆吏
			model.addAttribute("resultMsg", "success.common.insert");
		}
		return "forward:/uss/umt/EgovEntrprsMberManage.do";

	}

	/**
	 * 湲곗뾽?뚯썝?뺣낫 ?섏젙???꾪빐湲곗뾽?뚯썝?뺣낫瑜??곸꽭議고쉶?쒕떎.
	 *
	 * @param entrprsmberId ?곸꽭議고쉶 ???湲곗뾽?뚯썝?꾩씠??
	 * @param userSearchVO  議고쉶議곌굔?뺣낫
	 * @param model         ?붾㈃紐⑤뜽
	 * @return uss/umt/EgovEntrprsMberSelectUpdt
	 * @throws Exception
	 */
	@RequestMapping("/uss/umt/EgovEntrprsMberSelectUpdtView.do")
	public String updateEntrprsMberView(@RequestParam("selectedId") String entrprsmberId,
			@ModelAttribute("searchVO") UserDefaultVO userSearchVO, HttpServletRequest request, Model model)
			throws Exception {

		// 誘몄씤利??ъ슜?먯뿉 ???蹂댁븞泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			return "index";
		}

		EntrprsManageVO entrprsManageVO = new EntrprsManageVO();
		entrprsManageVO = entrprsManageService.selectEntrprsmber(entrprsmberId);
		model.addAttribute("entrprsManageVO", entrprsManageVO);
		model.addAttribute("userSearchVO", userSearchVO);

		// ComDefaultCodeVO comDefaultCodeVO = new ComDefaultCodeVO();
		// ?⑥뒪?뚮뱶?뚰듃紐⑸줉??肄붾뱶?뺣낫濡쒕???議고쉶
		// comDefaultCodeVO.setCodeId("COM022");
		// List<CmmnDetailCode> passwordHint_result =
		// cmmUseService.selectCmmCodeDetail(comDefaultCodeVO);
		// ?깅퀎援щ텇肄붾뱶瑜?肄붾뱶?뺣낫濡쒕???議고쉶
		// comDefaultCodeVO.setCodeId("COM014");
		// List<CmmnDetailCode> sexdstnCode_result =
		// cmmUseService.selectCmmCodeDetail(comDefaultCodeVO);
		// ?ъ슜?먯긽?쒖퐫?쒕? 肄붾뱶?뺣낫濡쒕???議고쉶
		// comDefaultCodeVO.setCodeId("COM013");
		// List<CmmnDetailCode> entrprsMberSttus_result =
		// cmmUseService.selectCmmCodeDetail(comDefaultCodeVO);
		// 洹몃９?뺣낫瑜?議고쉶 - GROUP_ID?뺣낫
		// comDefaultCodeVO.setTableNm("COMTNORGNZTINFO");
		// List<CmmnDetailCode> groupId_result =
		// cmmUseService.selectGroupIdDetail(comDefaultCodeVO);
		// 湲곗뾽援щ텇肄붾뱶瑜?肄붾뱶?뺣낫濡쒕???議고쉶 - COM026
		// comDefaultCodeVO.setCodeId("COM026");
		// List<CmmnDetailCode> entrprsSeCode_result =
		// cmmUseService.selectCmmCodeDetail(comDefaultCodeVO);
		// ?낆쥌肄붾뱶瑜?肄붾뱶?뺣낫濡쒕???議고쉶 - COM027
		// comDefaultCodeVO.setCodeId("COM027");
		// List<CmmnDetailCode> indutyCode_result =
		// cmmUseService.selectCmmCodeDetail(comDefaultCodeVO);

		// model.addAttribute("passwordHint_result", passwordHint_result); // ?⑥뒪?뚰듃?뚰듃紐⑸줉
		// model.addAttribute("sexdstnCode_result", sexdstnCode_result); // ?깅퀎援щ텇肄붾뱶紐⑸줉
		// model.addAttribute("entrprsMberSttus_result", entrprsMberSttus_result);//
		// ?ъ슜?먯긽?쒖퐫?쒕ぉ濡?
		// model.addAttribute("groupId_result", groupId_result); // 洹몃９?뺣낫 紐⑸줉
		// model.addAttribute("entrprsSeCode_result", entrprsSeCode_result); // 湲곗뾽援щ텇肄붾뱶
		// 紐⑸줉
		// model.addAttribute("indutyCode_result", indutyCode_result); // ?낆쥌肄붾뱶紐⑸줉

		// 2021.05.30, ?뺤쭊?? ?붿??몄썝?⑥뒪 ?뺣낫 議고쉶
		LoginVO loginVO = (LoginVO) request.getSession().getAttribute("loginVO");
		String onepassUserId = loginVO.getUniqId();
		String onepassUserkey = loginVO.getOnepassUserkey();
		String onepassIntfToken = loginVO.getOnepassIntfToken();
		if (entrprsmberId.equals(onepassUserId)) {
			model.addAttribute("onepassUserkey", onepassUserkey); // ?붿??몄썝?⑥뒪 ?ъ슜?먰궎
			model.addAttribute("onepassIntfToken", onepassIntfToken); // ?붿??몄썝?⑥뒪 ?ъ슜?먯꽭?섍컪
		} else {
			model.addAttribute("onepassUserkey", "");
			model.addAttribute("onepassIntfToken", "");
		}

		return "egovframework/com/uss/umt/EgovEntrprsMberSelectUpdt";
	}

	/**
	 * 濡쒓렇?몄씤利앹젣???댁젣
	 *
	 * @param entrprsManageVO 湲곗뾽?뚯썝?뺣낫
	 * @param model           ?붾㈃紐⑤뜽
	 * @return uss/umt/EgovEntrprsMberSelectUpdtView.do
	 * @throws Exception
	 */
	@RequestMapping("/uss/umt/EgovEntrprsMberLockIncorrect.do")
	public String updateLockIncorrect(EntrprsManageVO entrprsManageVO, Model model) throws Exception {

		// 誘몄씤利??ъ슜?먯뿉 ???蹂댁븞泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			return "index";
		}

		entrprsManageService.updateLockIncorrect(entrprsManageVO);

		return "forward:/uss/umt/EgovEntrprsMberSelectUpdtView.do";
	}

	/**
	 * 湲곗뾽?뚯썝?뺣낫 ?섏젙??紐⑸줉議고쉶 ?붾㈃?쇰줈 ?대룞?쒕떎.
	 *
	 * @param entrprsManageVO ?섏젙??湲곗뾽?뚯썝?뺣낫
	 * @param bindingResult   ?낅젰媛?寃利앹슜 bindingResult
	 * @param model           ?붾㈃紐⑤뜽
	 * @return forward:/uss/umt/EgovEntrprsMberManage.do
	 * @throws Exception
	 */
	@RequestMapping("/uss/umt/EgovEntrprsMberSelectUpdt.do")
	public String updateEntrprsMber(@ModelAttribute("entrprsManageVO") EntrprsManageVO entrprsManageVO,
			BindingResult bindingResult, Model model) throws Exception {

		// 誘몄씤利??ъ슜?먯뿉 ???蹂댁븞泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			return "index";
		}

		if (bindingResult.hasErrors()) {
			model.addAttribute("resultMsg", bindingResult.getAllErrors().get(0).getDefaultMessage());
			return "forward:/uss/umt/EgovEntrprsMberSelectUpdtView.do";
		} else {
			if ("".equals(entrprsManageVO.getGroupId())) {
				entrprsManageVO.setGroupId(null);
			}
			entrprsManageService.updateEntrprsmber(entrprsManageVO);
			// Exception ?놁씠 吏꾪뻾???섏젙?깃났硫붿떆吏
			model.addAttribute("resultMsg", "success.common.update");
			return "forward:/uss/umt/EgovEntrprsMberManage.do";
		}
	}

	/**
	 * 湲곗뾽?뚯썝?뺣낫??젣??紐⑸줉議고쉶 ?붾㈃?쇰줈 ?대룞?쒕떎.
	 *
	 * @param checkedIdForDel ??젣??곸븘?대뵒 ?뺣낫
	 * @param userSearchVO    議고쉶議곌굔?뺣낫
	 * @param model           ?붾㈃紐⑤뜽
	 * @return "forward:/uss/umt/EgovUserManage.do"
	 * @throws Exception
	 */
	@RequestMapping("/uss/umt/EgovEntrprsMberDelete.do")
	public String deleteEntrprsMber(@RequestParam("checkedIdForDel") String checkedIdForDel,
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
			entrprsManageService.deleteEntrprsmber(checkedIdForDel);
			model.addAttribute("resultMsg", "success.common.delete");
		}

		return "forward:/uss/umt/EgovEntrprsMberManage.do";
	}

	/**
	 * 湲곗뾽?뚯썝紐⑸줉??議고쉶?쒕떎. (pageing)
	 *
	 * @param userSearchVO 寃?됱“嫄댁젙蹂?
	 * @param model        ?붾㈃紐⑤뜽
	 * @return uss/umt/EgovEntrprsMberManage
	 * @throws Exception
	 */
	@IncludedInfo(name = "湲곗뾽?뚯썝愿由?, order = 450, gid = 50)
	@RequestMapping(value = "/uss/umt/EgovEntrprsMberManage.do")
	public String selectEntrprsMberList(@ModelAttribute("userSearchVO") UserDefaultVO userSearchVO, ModelMap model)
			throws Exception {

		// 誘몄씤利??ъ슜?먯뿉 ???蹂댁븞泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			return "index";
		}

		/** EgovPropertyService.sample */
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

		List<EntrprsManageVO> resultList = entrprsManageService.selectEntrprsMberList(userSearchVO);
		model.addAttribute("resultList", resultList);

		int totCnt = entrprsManageService.selectEntrprsMberListTotCnt(userSearchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		// ?ъ슜?먯긽?쒖퐫?쒕? 肄붾뱶?뺣낫濡쒕???議고쉶
		// ComDefaultCodeVO comDefaultCodeVO = new ComDefaultCodeVO();
		// comDefaultCodeVO.setCodeId("COM013");
		// List<CmmnDetailCode> entrprsMberSttus_result =
		// cmmUseService.selectCmmCodeDetail(comDefaultCodeVO);
		// model.addAttribute("entrprsMberSttus_result", entrprsMberSttus_result);//
		// 湲곗뾽?뚯썝?곹깭肄붾뱶紐⑸줉

		return "egovframework/com/uss/umt/EgovEntrprsMberManage";
	}

	/**
	 * 湲곗뾽?뚯썝媛?낆떊泥??깅줉?붾㈃?쇰줈 ?대룞?쒕떎.
	 *
	 * @param userSearchVO    寃?됱“嫄댁젙蹂?
	 * @param entrprsManageVO 湲곗뾽?뚯썝珥덇린?붿젙蹂?
	 * @param commandMap      ?뚮씪硫뷀꽣?꾩넚 commandMap
	 * @param model           ?붾㈃紐⑤뜽
	 * @return uss/umt/EgovEntrprsMberSbscrb
	 * @throws Exception
	 */
	@RequestMapping("/uss/umt/EgovEntrprsMberSbscrbView.do")
	public String sbscrbEntrprsMberView(@ModelAttribute("userSearchVO") UserDefaultVO userSearchVO,
			@ModelAttribute("entrprsManageVO") EntrprsManageVO entrprsManageVO,
			@RequestParam Map<String, Object> commandMap, Model model) throws Exception {

		// ComDefaultCodeVO comDefaultCodeVO = new ComDefaultCodeVO();
		// ?⑥뒪?뚮뱶?뚰듃紐⑸줉??肄붾뱶?뺣낫濡쒕???議고쉶
		// comDefaultCodeVO.setCodeId("COM022");
		// List<CmmnDetailCode> passwordHint_result =
		// cmmUseService.selectCmmCodeDetail(comDefaultCodeVO);
		// ?깅퀎援щ텇肄붾뱶瑜?肄붾뱶?뺣낫濡쒕???議고쉶
		// comDefaultCodeVO.setCodeId("COM014");
		// List<CmmnDetailCode> sexdstnCode_result =
		// cmmUseService.selectCmmCodeDetail(comDefaultCodeVO);
		// 湲곗뾽援щ텇肄붾뱶瑜?肄붾뱶?뺣낫濡쒕???議고쉶 - COM026
		// comDefaultCodeVO.setCodeId("COM026");
		// List<CmmnDetailCode> entrprsSeCode_result =
		// cmmUseService.selectCmmCodeDetail(comDefaultCodeVO);
		// ?낆쥌肄붾뱶瑜?肄붾뱶?뺣낫濡쒕???議고쉶 - COM027
		// comDefaultCodeVO.setCodeId("COM027");
		// List<CmmnDetailCode> indutyCode_result =
		// cmmUseService.selectCmmCodeDetail(comDefaultCodeVO);

		// model.addAttribute("passwordHint_result", passwordHint_result); // ?⑥뒪?뚰듃?뚰듃紐⑸줉
		// model.addAttribute("sexdstnCode_result", sexdstnCode_result); // ?깅퀎援щ텇肄붾뱶紐⑸줉
		// model.addAttribute("entrprsSeCode_result", entrprsSeCode_result); // 湲곗뾽援щ텇肄붾뱶
		// 紐⑸줉
		// model.addAttribute("indutyCode_result", indutyCode_result); // ?낆쥌肄붾뱶紐⑸줉

		if (!"".equals(commandMap.get("realname"))) {
			model.addAttribute("applcntNm", commandMap.get("realname")); // ?ㅻ챸?몄쬆???대쫫 - 二쇰?踰덊샇?몄쬆
			model.addAttribute("applcntIhidnum", commandMap.get("ihidnum")); // ?ㅻ챸?몄쬆??二쇰??깅줉踰덊샇 - 二쇰?踰덊샇 ?몄쬆
		}
		if (!"".equals(commandMap.get("realName"))) {
			model.addAttribute("applcntNm", commandMap.get("realName")); // ?ㅻ챸?몄쬆???대쫫 - ipin?몄쬆
		}
		entrprsManageVO.setEntrprsMberSttus("DEFAULT");

		return "egovframework/com/uss/umt/EgovEntrprsMberSbscrb";
	}

	/**
	 * 湲곗뾽?뚯썝媛?낆떊泥??깅줉泥섎━??濡쒓렇?명솕硫댁쑝濡??대룞?쒕떎.
	 * 
	 * @param entrprsManageVO 湲곗뾽?뚯썝媛?낆떊泥?젙蹂?
	 * @return forward:/uat/uia/egovLoginUsr.do
	 * @throws Exception
	 */
	@RequestMapping("/uss/umt/EgovEntrprsMberSbscrb.do")
	public String sbscrbEntrprsMber(@ModelAttribute("entrprsManageVO") EntrprsManageVO entrprsManageVO)
			throws Exception {

		// 媛?낆긽??珥덇린??
		entrprsManageVO.setEntrprsMberSttus("A");
		// 洹몃９?뺣낫 珥덇린??
		// entrprsManageVO.setGroupId("1");
		// 湲곗뾽?뚯썝媛?낆떊泥??깅줉??湲곗뾽?뚯썝?깅줉湲곕뒫???ъ슜?섏뿬 ?깅줉?쒕떎.
		entrprsManageService.insertEntrprsmber(entrprsManageVO);
		return "forward:/uat/uia/egovLoginUsr.do";
	}

	/**
	 * 湲곗뾽?뚯썝 ?쎄??뺤씤 ?붾㈃??議고쉶?쒕떎.
	 * 
	 * @param model ?붾㈃紐⑤뜽
	 * @return uss/umt/EgovStplatCnfirm
	 * @throws Exception
	 */
	@RequestMapping("/uss/umt/EgovStplatCnfirmEntrprs.do")
	public String sbscrbEntrprsMber(Model model) throws Exception {

		// 湲곗뾽?뚯썝???쎄? ?꾩씠???ㅼ젙
		String stplatId = "STPLAT_0000000000002";
		// ?뚯썝媛?낆쑀???ㅼ젙-湲곗뾽?뚯썝
		String sbscrbTy = "USR02";
		// ?쎄??뺣낫 議고쉶
		List<StplatVO> stplatList = entrprsManageService.selectStplat(stplatId);

		model.addAttribute("stplatList", stplatList); // ?쎄??뺣낫?ы븿
		model.addAttribute("sbscrbTy", sbscrbTy); // ?뚯썝媛?낆쑀?뺥룷??

		return "egovframework/com/uss/umt/EgovStplatCnfirm";
	}

	/**
	 * 湲곗뾽?뚯썝 ?뷀샇 ?섏젙泥섎━ ???붾㈃ ?대룞?쒕떎.
	 * 
	 * @param model           ?붾㈃紐⑤뜽
	 * @param commandMap      ?뚮씪硫뷀꽣?꾨떖??commandMap
	 * @param userSearchVO    寃?됱“嫄댁젙蹂?
	 * @param entrprsManageVO 湲곗뾽?뚯썝?섏젙?뺣낫
	 * @return uss/umt/EgovEntrprsPasswordUpdt
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/umt/EgovEntrprsPasswordUpdt.do")
	public String updatePassword(ModelMap model, @RequestParam Map<String, Object> commandMap,
			@ModelAttribute("searchVO") UserDefaultVO userSearchVO,
			@ModelAttribute("entrprsManageVO") EntrprsManageVO entrprsManageVO) throws Exception {

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
		EntrprsManageVO resultVO = new EntrprsManageVO();
		entrprsManageVO.setEntrprsMberPassword(newPassword);
		entrprsManageVO.setOldPassword(oldPassword);
		entrprsManageVO.setUniqId(uniqId);

		String resultMsg = "";
		resultVO = entrprsManageService.selectPassword(entrprsManageVO);
		// ?⑥뒪?뚮뱶 ?뷀샇??
		String encryptPass = EgovFileScrty.encryptPassword(oldPassword, entrprsManageVO.getEntrprsmberId());
		if (encryptPass.equals(resultVO.getEntrprsMberPassword())) {
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
			entrprsManageVO.setEntrprsMberPassword(
					EgovFileScrty.encryptPassword(newPassword, entrprsManageVO.getEntrprsmberId()));
			entrprsManageService.updatePassword(entrprsManageVO);
			model.addAttribute("entrprsManageVO", entrprsManageVO);
			resultMsg = "success.common.update";
		} else {
			model.addAttribute("entrprsManageVO", entrprsManageVO);
		}
		model.addAttribute("userSearchVO", userSearchVO);
		model.addAttribute("resultMsg", resultMsg);

		return "egovframework/com/uss/umt/EgovEntrprsPasswordUpdt";
	}

	/**
	 * 湲곗뾽?뚯썝?뷀샇 ?섏젙 ?붾㈃ ?대룞
	 * 
	 * @param model           ?붾㈃紐⑤뜽
	 * @param commandMap      ?뚮씪硫뷀꽣?꾩넚??commandMap
	 * @param userSearchVO    寃?됱“嫄댁젙蹂?
	 * @param entrprsManageVO 湲곗뾽?뚯썝?섏젙?뺣낫
	 * @return uss/umt/EgovEntrprsPasswordUpdt
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/umt/EgovEntrprsPasswordUpdtView.do")
	public String updatePasswordView(ModelMap model, @RequestParam Map<String, Object> commandMap,
			@ModelAttribute("searchVO") UserDefaultVO userSearchVO,
			@ModelAttribute("entrprsManageVO") EntrprsManageVO entrprsManageVO) throws Exception {

		// 誘몄씤利??ъ슜?먯뿉 ???蹂댁븞泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			return "index";
		}

		String userTyForPassword = (String) commandMap.get("userTyForPassword");
		entrprsManageVO.setUserTy(userTyForPassword);

		model.addAttribute("userSearchVO", userSearchVO);
		model.addAttribute("entrprsManageVO", entrprsManageVO);
		return "egovframework/com/uss/umt/EgovEntrprsPasswordUpdt";
	}

}
