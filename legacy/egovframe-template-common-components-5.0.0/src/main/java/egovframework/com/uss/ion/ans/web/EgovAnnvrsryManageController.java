package egovframework.com.uss.ion.ans.web;

import java.io.IOException;
import java.io.InputStream;
import java.util.Calendar;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;

import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.support.SessionStatus;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.service.CmmnDetailCode;
import egovframework.com.cmm.service.EgovCmmUseService;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.uss.ion.ans.service.AnnvrsryManage;
import egovframework.com.uss.ion.ans.service.AnnvrsryManageVO;
import egovframework.com.uss.ion.ans.service.EgovAnnvrsryManageService;
import egovframework.com.utl.fcc.service.EgovDateUtil;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

/**
 * <pre>
 * 媛쒖슂
 * - 湲곕뀗?쇨?由ъ뿉 ???controller ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - 湲곕뀗?쇨?由ъ뿉 ????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * - 湲곕뀗?쇨?由ъ쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * </pre>
 * 
 * @author ?댁슜
 * @since 2009.06.25
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.06.25  ?댁슜           理쒖큹 ?앹꽦
 *   2011.08.26  ?뺤쭊??         IncludedInfo annotation 異붽?
 *   2020.11.02  ?좎슜??         KISA 蹂댁븞?쎌젏 議곗튂 - ?먯썝?댁젣
 *   2025.08.02  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(final???꾨땶 蹂?섎뒗 諛묒쨪???ы븿?????놁쓬)
 *
 *      </pre>
 */
@Controller
public class EgovAnnvrsryManageController {

	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	@Resource(name = "egovAnnvrsryManageService")
	private EgovAnnvrsryManageService egovAnnvrsryManageService;

	@Resource(name = "EgovCmmUseService")
	private EgovCmmUseService cmmUseService;

	/**
	 * 湲곕뀗?쇨?由?紐⑸줉?붾㈃ ?대룞
	 * 
	 * @return String
	 * @exception Exception
	 */
	@RequestMapping("/uss/ion/ans/selectAnnvrsryManageListView.do")
	public String selectAnnvrsryManageListView() throws Exception {

		return "egovframework/com/uss/ion/ans/EgovAnnvrsryManageList";
	}

	/**
	 * 湲곕뀗?쇨?由ъ젙蹂대? 愿由ы븯湲??꾪빐 ?깅줉??湲곕뀗?쇨?由?紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param annvrsryManageVO - 湲곕뀗?쇨?由?VO
	 * @return String - 由ы꽩 Url
	 */
	@IncludedInfo(name = "湲곕뀗?쇨?由?, order = 930, gid = 50)
	@RequestMapping(value = "/uss/ion/ans/selectAnnvrsryManageList.do")
	public String selectAnnvrsryManageList(@ModelAttribute("annvrsryManageVO") AnnvrsryManageVO annvrsryManageVO,
			@ModelAttribute("annvrsryManageVO") AnnvrsryManageVO annvrsryGdcc, ModelMap model) throws Exception {

		java.util.Calendar cal = java.util.Calendar.getInstance();
		String[] yearList = new String[5];
		for (int x = 0; x < 5; x++) {
			yearList[x] = Integer.toString(cal.get(java.util.Calendar.YEAR) + 2 - x);
		}
		if (annvrsryManageVO.getSearchKeyword() == null || annvrsryManageVO.getSearchKeyword().equals("")) {
			annvrsryManageVO.setSearchKeyword(Integer.toString(cal.get(java.util.Calendar.YEAR)));
		}

		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		if (loginVO == null) {
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
		annvrsryManageVO.setUsid(loginVO.getUniqId());

		/** paging */
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(annvrsryManageVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(annvrsryManageVO.getPageUnit());
		paginationInfo.setPageSize(annvrsryManageVO.getPageSize());

		annvrsryManageVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		annvrsryManageVO.setLastIndex(paginationInfo.getLastRecordIndex());
		annvrsryManageVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());
		annvrsryManageVO.setAnnvrsryManageList(egovAnnvrsryManageService.selectAnnvrsryManageList(annvrsryManageVO));
		model.addAttribute("annvrsryManageList", annvrsryManageVO.getAnnvrsryManageList());

		int totCnt = egovAnnvrsryManageService.selectAnnvrsryManageListTotCnt(annvrsryManageVO);
		paginationInfo.setTotalRecordCount(totCnt);
		// annvrsryGdcc.setAnnvrsryManageList(egovAnnvrsryManageService.selectAnnvrsryGdcc(annvrsryManageVO));
		// model.addAttribute("annvrsryGdccList", annvrsryGdcc.getAnnvrsryManageList());

		model.addAttribute("yearList", yearList);
		model.addAttribute("paginationInfo", paginationInfo);

		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));
		return "egovframework/com/uss/ion/ans/EgovAnnvrsryManageList";
	}

	/**
	 * ?깅줉??湲곕뀗?쇨?由ъ쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * 
	 * @param annvrsryManageVO - 湲곕뀗?쇨?由?VO
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/uss/ion/ans/selectAnnvrsryManage.do")
	public String selectAnnvrsryManage(@ModelAttribute("annvrsryManage") AnnvrsryManage annvrsryManage,
			@ModelAttribute("annvrsryManageVO") AnnvrsryManageVO annvrsryManageVO, @RequestParam Map<?, ?> commandMap,
			ModelMap model) throws Exception {

		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd"); // ?곸꽭?뺣낫 援щ텇
		String sTempAnnvrsryDe = null;
		String sTempCldrSe = null;
		String sTempAnnvrsrySetup = null;
		AnnvrsryManageVO resultVO = egovAnnvrsryManageService.selectAnnvrsryManage(annvrsryManageVO);

		if ("1".equals(resultVO.getCldrSe())) {
			sTempCldrSe = egovMessageSource.getMessage("comUssIonAns.annvrsryGdcc.cldrSe1");// ??
		} else {
			sTempCldrSe = egovMessageSource.getMessage("comUssIonAns.annvrsryGdcc.cldrSe2");// ??
		}
		sTempAnnvrsryDe = resultVO.getAnnvrsryDe() + "(" + sTempCldrSe + ")";
		resultVO.setAnnvrsryTemp4(sTempAnnvrsryDe);

		if ("Y".equals(resultVO.getAnnvrsrySetup())) {
			sTempAnnvrsrySetup = "ON";
		} else {
			sTempAnnvrsrySetup = "OFF";
		}
		resultVO.setAnnvrsryTemp5(sTempAnnvrsrySetup);

		model.addAttribute("annvrsryManageVO", resultVO);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		if (sCmd.equals("update")) {

			annvrsryManage.setAnnId(resultVO.getAnnId());
			annvrsryManage.setAnnvrsryNm(resultVO.getAnnvrsryNm());
			annvrsryManage.setAnnvrsryDe(resultVO.getAnnvrsryDe());
			annvrsryManage.setCldrSe(resultVO.getCldrSe());
			annvrsryManage.setUsid(resultVO.getUsid());
			annvrsryManage.setAnnvrsrySe(resultVO.getAnnvrsrySe());

			ComDefaultCodeVO vo = new ComDefaultCodeVO();
			vo.setCodeId("COM069");
			List<CmmnDetailCode> annvrsrySeCodeList = cmmUseService.selectCmmCodeDetail(vo);
			model.addAttribute("annvrsrySeCode", annvrsrySeCodeList);
			model.addAttribute("annvrsryManage", annvrsryManage);
			return "egovframework/com/uss/ion/ans/EgovAnnvrsryUpdt";
		} else {
			return "egovframework/com/uss/ion/ans/EgovAnnvrsryDetail";
		}
	}

	/**
	 * 湲곕뀗?쇨?由??깅줉 ?붾㈃?쇰줈 ?대룞?쒕떎.
	 * 
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/uss/ion/ans/insertViewAnnvrsry.do")
	public String insertViewAnnvrsryManage(@ModelAttribute("annvrsryManage") AnnvrsryManage annvrsryManage,
			@ModelAttribute("annvrsryManageVO") AnnvrsryManageVO annvrsryManageVO, ModelMap model) throws Exception {
		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		annvrsryManage.setUsid(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
		annvrsryManage.setAnnvrsrySetup("Y");
		annvrsryManage.setCldrSe("1"); // 1:?묐젰 2:?뚮젰
		annvrsryManageVO.setUsid(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId())); // ?ъ슜?륤D
		annvrsryManageVO.setAnnvrsryTemp1(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getName())); // ?ъ슜?먮챸
		annvrsryManageVO.setAnnvrsryTemp2(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getOrgnztNm())); // 議곗쭅
																														// ID

		ComDefaultCodeVO vo = new ComDefaultCodeVO();
		vo.setCodeId("COM069");
		List<CmmnDetailCode> annvrsrySeCodeList = cmmUseService.selectCmmCodeDetail(vo);
		model.addAttribute("annvrsrySeCode", annvrsrySeCodeList);
		model.addAttribute("annvrsryManage", annvrsryManage);
		model.addAttribute("annvrsryManageVO", annvrsryManageVO);
		return "egovframework/com/uss/ion/ans/EgovAnnvrsryRegist";
	}

	/**
	 * 湲곕뀗?쇨?由ъ젙蹂대? ?좉퇋濡??깅줉?쒕떎.
	 * 
	 * @param annvrsryManage - 湲곕뀗?쇨?由?model
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/uss/ion/ans/insertAnnvrsry.do")
	public String insertAnnvrsryManage(@ModelAttribute("annvrsryManage") AnnvrsryManage annvrsryManage,
			@ModelAttribute("annvrsryManageVO") AnnvrsryManageVO annvrsryManageVO, BindingResult bindingResult,
			SessionStatus status, ModelMap model) throws Exception {

		if (bindingResult.hasErrors()) {
			ComDefaultCodeVO vo = new ComDefaultCodeVO();
			vo.setCodeId("COM069");
			List<CmmnDetailCode> annvrsrySeCodeList = cmmUseService.selectCmmCodeDetail(vo);
			model.addAttribute("annvrsrySeCode", annvrsrySeCodeList);

			model.addAttribute("annvrsryManageVO", annvrsryManageVO);
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.insert"));
			return "egovframework/com/uss/ion/ans/EgovAnnvrsryRegist";
		} else {

			LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
			status.setComplete();
			model.addAttribute("message", egovMessageSource.getMessage("success.common.insert"));
			annvrsryManage.setFrstRegisterId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());

			if (egovAnnvrsryManageService.selectAnnvrsryManageDplctAt(annvrsryManage) == 0) {
				egovAnnvrsryManageService.insertAnnvrsryManage(annvrsryManage);
				model.addAttribute("message", egovMessageSource.getMessage("success.common.insert"));
				return "forward:/uss/ion/ans/selectAnnvrsryManageList.do";
			} else {
				ComDefaultCodeVO vo = new ComDefaultCodeVO();
				vo.setCodeId("COM069");
				List<CmmnDetailCode> annvrsrySeCodeList = cmmUseService.selectCmmCodeDetail(vo);
				annvrsryManageVO.setAnnvrsryTemp1(user == null ? "" : EgovStringUtil.isNullToString(user.getName()));
				annvrsryManageVO
						.setAnnvrsryTemp2(user == null ? "" : EgovStringUtil.isNullToString(user.getOrgnztNm()));
				model.addAttribute("annvrsrySeCode", annvrsrySeCodeList);
				model.addAttribute("annvrsryManageVO", annvrsryManageVO);
				model.addAttribute("dplctMessage", egovMessageSource.getMessage("comUssIonAns.common.duplicate"));// ?대?
																													// ?깅줉??
																													// ?곗씠??낅땲??
																													// ?대떦
																													// ?곗씠?瑜?
																													// ?뺤씤??
																													// 二쇱꽭??);
				return "egovframework/com/uss/ion/ans/EgovAnnvrsryRegist";
			}
		}
	}

	/**
	 * 湲??깅줉??湲곕뀗?쇨?由ъ젙蹂대? ?섏젙?쒕떎.
	 * 
	 * @param annvrsryManage - 湲곕뀗?쇨?由?model
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/uss/ion/ans/updateAnnvrsryManage.do")
	public String updateAnnvrsryManage(@ModelAttribute("annvrsryManage") AnnvrsryManage annvrsryManage,
			@ModelAttribute("annvrsryManageVO") AnnvrsryManageVO annvrsryManageVO, BindingResult bindingResult,
			SessionStatus status, ModelMap model) throws Exception {

		if (bindingResult.hasErrors()) {
			model.addAttribute("annvrsryManageVO", annvrsryManage);
			return "egovframework/com/uss/ion/ans/EgovAnnvrsryManageUpdt";
		} else {

			LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
			status.setComplete();
			annvrsryManage.setLastUpdusrId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());

			if (egovAnnvrsryManageService.selectAnnvrsryManageDplctAt(annvrsryManage) == 0) {
				egovAnnvrsryManageService.updateAnnvrsryManage(annvrsryManage);
				model.addAttribute("message", egovMessageSource.getMessage("success.common.update"));
				return "forward:/uss/ion/ans/selectAnnvrsryManageList.do";
			} else {
				ComDefaultCodeVO vo = new ComDefaultCodeVO();
				vo.setCodeId("COM069");
				List<CmmnDetailCode> annvrsrySeCodeList = cmmUseService.selectCmmCodeDetail(vo);
				annvrsryManageVO.setAnnvrsryTemp1(user == null ? "" : EgovStringUtil.isNullToString(user.getName()));
				annvrsryManageVO
						.setAnnvrsryTemp2(user == null ? "" : EgovStringUtil.isNullToString(user.getOrgnztNm()));
				model.addAttribute("annvrsrySeCode", annvrsrySeCodeList);
				model.addAttribute("annvrsryManageVO", annvrsryManageVO);
				model.addAttribute("dplctMessage", egovMessageSource.getMessage("comUssIonAns.common.duplicate"));// ?대?
																													// ?깅줉??
																													// ?곗씠??낅땲??
																													// ?대떦
																													// ?곗씠?瑜?
																													// ?뺤씤??
																													// 二쇱꽭??);
				return "egovframework/com/uss/ion/ans/EgovAnnvrsryUpdt";
			}
		}
	}

	/**
	 * 湲??깅줉??湲곕뀗?쇨?由ъ젙蹂대? ??젣?쒕떎.
	 * 
	 * @param annvrsryManage - 湲곕뀗?쇨?由?model
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/uss/ion/ans/deleteAnnvrsryManage.do")
	public String deleteAnnvrsryManage(@ModelAttribute("annvrsryManage") AnnvrsryManage annvrsryManage,
			SessionStatus status, ModelMap model) throws Exception {

		egovAnnvrsryManageService.deleteAnnvrsryManage(annvrsryManage);
		status.setComplete();
		model.addAttribute("message", egovMessageSource.getMessage("success.common.delete"));
		return "forward:/uss/ion/ans/selectAnnvrsryManageList.do";
	}

	/**
	 * Main?붾㈃?먯꽌 ?뚮┝?ㅼ젙???ㅻⅨ 湲곕뀗?쇨?由?紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param annvrsryManageVO - 湲곕뀗?쇨?由?VO
	 * @return String - 由ы꽩 Url
	 */
	@IncludedInfo(name = "湲곕뀗?쇰ぉ濡??뺤씤??", order = 931, gid = 50)
	@RequestMapping(value = "/uss/ion/ans/selectAnnvrsryMainList.do")
	public String selectAnnvrsryMainList(@ModelAttribute("annvrsryManageVO") AnnvrsryManageVO annvrsryManageVO,
			@ModelAttribute("annvrsryManageVO") AnnvrsryManageVO annvrsryGdcc, ModelMap model) throws Exception {

		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		if (loginVO == null) {
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
		annvrsryManageVO.setUsid(loginVO.getUniqId());

		/** paging */
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(annvrsryManageVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(annvrsryManageVO.getPageUnit());
		paginationInfo.setPageSize(annvrsryManageVO.getPageSize());

		annvrsryManageVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		annvrsryManageVO.setLastIndex(paginationInfo.getLastRecordIndex());
		annvrsryManageVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		annvrsryManageVO.setAnnvrsryManageList(egovAnnvrsryManageService.selectAnnvrsryGdcc(annvrsryManageVO));
		model.addAttribute("annvrsryGdccList", annvrsryManageVO.getAnnvrsryManageList());

		int totCnt = egovAnnvrsryManageService.selectAnnvrsryManageListTotCnt(annvrsryManageVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));
		return "egovframework/com/uss/ion/ans/EgovAnnvrsryMainList";
	}

	/**
	 * ?깅줉??湲곕뀗?쇨?由ъ쓽 ?뚮┝ ?붾㈃??議고쉶?쒕떎.
	 * 
	 * @param annvrsryManageVO - 湲곕뀗?쇨?由?VO
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/uss/ion/ans/selectAnnvrsryGdcc.do")
	public String selectAnnvrsryGdcc(@ModelAttribute("annvrsryManageVO") AnnvrsryManageVO annvrsryManageVO,
			ModelMap model) throws Exception {
		String sTempAnnvrsryDe = null;
		String sTempCldrSe = null;
		String sTempAnnvrsrySetup = null;
		String sAnnvrsryDe = null;
		/*
		 * String sAnnvrsryDe_Temp = null;
		 * 
		 * sAnnvrsryDe_Temp =
		 * EgovStringUtil.removeMinusChar(annvrsryManageVO.getAnnvrsryDe());
		 * if("0".equals(annvrsryManageVO.getCldrSe())){ // ?뚮젰??寃쎌슦 ?묐젰?쇰줈 ?섏궛
		 * sAnnvrsryDe_Temp = EgovDateUtil.toSolar(sAnnvrsryDe_Temp, 0);
		 * annvrsryManageVO.setAnnvrsryDe(sAnnvrsryDe_Temp); }
		 */
		AnnvrsryManageVO resultVO = egovAnnvrsryManageService.selectAnnvrsryManage(annvrsryManageVO);
		sAnnvrsryDe = EgovStringUtil.removeMinusChar(resultVO.getAnnvrsryDe());
		if ("1".equals(resultVO.getCldrSe())) {
			sTempCldrSe = egovMessageSource.getMessage("comUssIonAns.annvrsryGdcc.cldrSe1");// ??
		} else {
			sTempCldrSe = egovMessageSource.getMessage("comUssIonAns.annvrsryGdcc.cldrSe2");// ??
			sAnnvrsryDe = EgovDateUtil.toSolar(sAnnvrsryDe, 0);
		}

		sTempAnnvrsryDe = resultVO.getAnnvrsryDe() + "(" + sTempCldrSe + ")";
		resultVO.setAnnvrsryTemp4(sTempAnnvrsryDe);

		if ("Y".equals(resultVO.getAnnvrsrySetup())) {
			sTempAnnvrsrySetup = "ON";
		} else {
			sTempAnnvrsrySetup = "OFF";
		}
		resultVO.setAnnvrsryTemp5(sTempAnnvrsrySetup);

		/* ?좎쭨 ?ъ씠??湲곌컙 ?곗텧 */
		long resultDay = 0;
		Calendar today = Calendar.getInstance(); // Calendar媛앹껜瑜??앹꽦?⑸땲??
		Calendar targetDate = Calendar.getInstance();

		if (sAnnvrsryDe != null && !sAnnvrsryDe.equals("")) {
			targetDate.set(Integer.parseInt(sAnnvrsryDe.substring(0, 4)),
					Integer.parseInt(sAnnvrsryDe.substring(4, 6)) - 1, Integer.parseInt(sAnnvrsryDe.substring(6, 8)));
		} else {
			targetDate.set(today.get(Calendar.YEAR), today.get(Calendar.MONTH) + 1, today.get(Calendar.DATE));
		}

		long resultTime = targetDate.getTime().getTime() - today.getTime().getTime(); // 李⑥씠 援ы븯湲?
		if (resultTime > 0) {
			resultDay = resultTime / (1000 * 60 * 60 * 24);// ?쇰줈 諛붽씀湲?
		} else {
			resultDay = 0;
		}

		resultVO.setAnnvrsryBeginDe(Long.toString(resultDay));

		model.addAttribute("annvrsryManageVO", resultVO);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/uss/ion/ans/EgovAnnvrsryGdcc";
	}

	/**
	 * 湲곕뀗?쇱씪愿꾨벑濡앺솕硫??몄텧 諛?湲곕뀗?쇱씪愿꾨벑濡앹쿂由??꾨줈?몄뒪
	 * 
	 * @param annvrsryManageVO AnnvrsryManageVO
	 * @param request          HttpServletRequest
	 * @return 異쒕젰?섏씠吏?뺣낫 "ion/bnt/EgovBndtManageListPop"
	 * @exception Exception
	 */
	@RequestMapping(value = "/uss/ion/ans/EgovAnnvrsryManageListPop.do")
	public String selectAnnvrsryManageBnde(final HttpServletRequest request,
			@ModelAttribute("annvrsryManageVO") AnnvrsryManageVO annvrsryManageVO, @RequestParam Map<?, ?> commandMap,
			BindingResult bindingResult, ModelMap model) throws Exception {

//		String sCmd = commandMap.get("cmd") == null ? "" : (String)commandMap.get("cmd"); // ?곸꽭?뺣낫 援щ텇

		// 0. Spring Security ?ъ슜?먭텒??泥섎━

		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		return "egovframework/com/uss/ion/ans/EgovAnnvrsryManageBndeListPop";
	}

	@RequestMapping(value = "/uss/ion/ans/EgovAnnvrsryManageListPopAction.do")
	public String selectAnnvrsryManageBndeAction(final MultipartHttpServletRequest multiRequest,
			@ModelAttribute("annvrsryManageVO") AnnvrsryManageVO annvrsryManageVO, @RequestParam Map<?, ?> commandMap,
			ModelMap model) throws Exception {
		String resultMsg = "";
		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd"); // ?곸꽭?뺣낫 援щ텇

		// 0. Spring Security ?ъ슜?먭텒??泥섎━

		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		if (sCmd.equals("bnde")) {
			//
                     MultipartHttpServletRequest multiRequest =
			// (MultipartHttpServletRequest) request;
			final Map<String, MultipartFile> files = multiRequest.getFileMap();
			Iterator<Entry<String, MultipartFile>> itr = files.entrySet().iterator();
			MultipartFile file;
			while (itr.hasNext()) {
				Entry<String, MultipartFile> entry = itr.next();
				file = entry.getValue();
				if (!"".equals(file.getOriginalFilename())) {
					// KISA 蹂댁븞?쎌젏 議곗튂 - ?먯썝?댁젣
					InputStream is = null;
					try {
						is = file.getInputStream();
						model.addAttribute("annvrsryManageList",
								egovAnnvrsryManageService.selectAnnvrsryManageBnde(is));
					} catch (IOException e) {
						throw new IOException(e);
					} finally {
						if (is != null) {// 2022.01.Possible null pointer dereference in method on exception path 泥섎━
							is.close();
						}
					}
				} else {
					resultMsg = egovMessageSource.getMessage("fail.common.msg");
				}
			}
			model.addAttribute("resultMsg", resultMsg);
		}
		return "egovframework/com/uss/ion/ans/EgovAnnvrsryManageBndeListPop";
	}

	/**
	 * 湲곕뀗?쇱젙蹂대? ?쇨큵?깅줉泥섎━?쒕떎.
	 * 
	 * @param annvrsryManageVO - 湲곕뀗?쇨?由?VO
	 * @param String           - 湲곕뀗?쇱젙蹂?
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/uss/ion/ans/insertAnnvrsryManageBnde.do")
	public String insertAnnvrsryManageBnde(
			@RequestParam("checkedAnnvrsryManageForInsert") String checkedAnnvrsryManageForInsert,
			@ModelAttribute("annvrsryManageVO") AnnvrsryManageVO annvrsryManageVO, SessionStatus status, ModelMap model)
			throws Exception {
		// int iTemp =
		// egovAnnvrsryManageService.selectAnnvrsryManageMonthCnt(annvrsryManageVO);
		// if(iTemp == 0 ){

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		annvrsryManageVO.setFrstRegisterId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());
		egovAnnvrsryManageService.insertAnnvrsryManageBnde(annvrsryManageVO, checkedAnnvrsryManageForInsert);
		status.setComplete();
		model.addAttribute("message", "true");
		return "egovframework/com/uss/ion/ans/EgovAnnvrsryManageBndeListPop";
		// 
                    }else{
		// String sTempMessage =
		// annvrsryManageVO.getBndtDe().substring(0,4)+"??+bndtManageVO.getBndtDe().substring(4,6)+"??
		// ?곗씠?媛 議댁옱?⑸땲??";
		// model.addAttribute("message", sTempMessage);
		// return "egovframework/com/uss/ion/bnt/EgovBndtManageBndeListPop";
		
                
}
