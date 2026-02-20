package egovframework.com.uss.ion.vct.web;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.support.SessionStatus;

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.service.CmmnDetailCode;
import egovframework.com.cmm.service.EgovCmmUseService;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.uss.ion.vct.service.EgovVcatnManageService;
import egovframework.com.uss.ion.vct.service.VcatnManage;
import egovframework.com.uss.ion.vct.service.VcatnManageVO;
import egovframework.com.utl.fcc.service.EgovDateUtil;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * <pre>
 * 媛쒖슂
 * - ?닿?愿由ъ뿉 ???controller ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?닿?愿由ъ뿉 ????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * - ?닿?愿由ъ쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * </pre>
 * 
 * @author ?댁슜
 * @since 2010.06.15
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.06.15  ?댁슜           理쒖큹 ?앹꽦
 *   2011.08.26  ?뺤쭊??         IncludedInfo annotation 異붽?
 *   2025.08.19  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-AvoidReassigningParameters(?섍꺼諛쏅뒗 硫붿냼??parameter 媛믪쓣 吏곸젒 蹂寃쏀븯??肄붾뱶 ?먯?)
 *
 *      </pre>
 */
@Controller
public class EgovVcatnManageController {

	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	@Resource(name = "egovVcatnManageService")
	private EgovVcatnManageService egovVcatnManageService;

	@Resource(name = "EgovCmmUseService")
	private EgovCmmUseService cmmUseService;

	/**
	 * ?닿?愿由?紐⑸줉?붾㈃ ?대룞
	 * 
	 * @return String
	 * @exception Exception
	 */
	@RequestMapping("/uss/ion/vct/EgovVcatnManageListView.do")
	public String selectVcatnManageListView() throws Exception {

		return "egovframework/com/uss/ion/vct/EgovVcatnManageList";
	}

	/**
	 * ?닿?愿由ъ젙蹂대? 愿由ы븯湲??꾪빐 ?깅줉???닿?愿由?紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param vcatnManageVO - ?닿?愿由?VO
	 * @return String - 由ы꽩 Url
	 */
	@IncludedInfo(name = "?닿?愿由?, order = 900, gid = 50)
	@RequestMapping(value = "/uss/ion/vct/EgovVcatnManageList.do")
	public String selectVcatnManageList(@ModelAttribute("vcatnManageVO") VcatnManageVO vcatnManageVO, ModelMap model)
			throws Exception {

		String searchKeyword = vcatnManageVO.getSearchKeyword();

		java.util.Calendar cal = java.util.Calendar.getInstance();
		String[] yearList = new String[5];
		for (int x = 0; x < 5; x++) {
			yearList[x] = Integer.toString(cal.get(java.util.Calendar.YEAR) - x);
		}

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		if (user == null) {
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		VcatnManageVO resultVO = egovVcatnManageService.selectIndvdlYrycManage(user.getUniqId());

		if (resultVO == null) {
			model.addAttribute("messageTemp",
                egovMessageSource.getMessage("comUssIonVct.vcatnManageList.validate.move")); // ?닿? ?ъ슜???꾪븳 媛쒖씤?곗감 ?깅줉???꾪빐 媛쒖씤?곗감愿由?肄ㅽ룷?뚰듃濡??대룞
			return "egovframework/com/uss/ion/yrc/EgovIndvdlYrycManageList";
		} else {

			resultVO.setSearchKeyword(searchKeyword);

			/** paging */
			PaginationInfo paginationInfo = new PaginationInfo();
			paginationInfo.setCurrentPageNo(resultVO.getPageIndex());
			paginationInfo.setRecordCountPerPage(resultVO.getPageUnit());
			paginationInfo.setPageSize(resultVO.getPageSize());

			resultVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
			resultVO.setLastIndex(paginationInfo.getLastRecordIndex());
			resultVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

			model.addAttribute("vcatnManageVO", resultVO);

			resultVO.setApplcntId(user.getUniqId());
			resultVO.setVcatnManageList(egovVcatnManageService.selectVcatnManageList(resultVO));

			model.addAttribute("vcatnManageList", resultVO.getVcatnManageList());

			int totCnt = egovVcatnManageService.selectVcatnManageListTotCnt(resultVO);
			paginationInfo.setTotalRecordCount(totCnt);

			String accessControll = user.getOrgnztId();

			model.addAttribute("access", accessControll);
			model.addAttribute("yearList", yearList);
			model.addAttribute("paginationInfo", paginationInfo);
			model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

			return "egovframework/com/uss/ion/vct/EgovVcatnManageList";
		}
	}

	/**
	 * ?깅줉???닿?愿由ъ쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 *
	 * @param vcatnManageVO - ?닿?愿由?VO
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/uss/ion/vct/EgovVcatnManageDetail.do")
	public String selectVcatnManage(@ModelAttribute("vcatnManageVO") VcatnManageVO vcatnManageVO,
			@ModelAttribute("vcatnManage") VcatnManage vcatnManage, @RequestParam Map<?, ?> commandMap, ModelMap model)
			throws Exception {

		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd"); // ?곸꽭?뺣낫 援щ텇
		vcatnManageVO.setBgnde(EgovStringUtil.removeMinusChar(vcatnManageVO.getBgnde()));
		vcatnManageVO.setEndde(EgovStringUtil.removeMinusChar(vcatnManageVO.getEndde()));

		// ?깅줉 ?곸꽭?뺣낫
		VcatnManageVO vcatnManageVOTemp = egovVcatnManageService.selectVcatnManage(vcatnManageVO);

		model.addAttribute("vcatnManageVO", vcatnManageVOTemp);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		if (sCmd.equals("updt")) {

			ComDefaultCodeVO vo = new ComDefaultCodeVO();
			vo.setCodeId("COM056");
			List<CmmnDetailCode> vcatnSeCodeList = cmmUseService.selectCmmCodeDetail(vo);

			model.addAttribute("vcatnSeCode", vcatnSeCodeList);
			model.addAttribute("vcatnManage", vcatnManageVOTemp);
			return "egovframework/com/uss/ion/vct/EgovVcatnUpdt";
		} else {
			return "egovframework/com/uss/ion/vct/EgovVcatnDetail";
		}
	}

	/**
	 * ?닿?愿由??깅줉 ?붾㈃?쇰줈 ?대룞?쒕떎.
	 *
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/uss/ion/vct/EgovVcatnRegist.do")
	public String insertViewVcatnManage(@ModelAttribute("vcatnManage") VcatnManage vcatnManage,
			@ModelAttribute("vcatnManageVO") VcatnManageVO vcatnManageVO, ModelMap model) throws Exception {
		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		VcatnManageVO vcatnManageVO1 = egovVcatnManageService
				.selectIndvdlYrycManage(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));
		vcatnManageVO1.setApplcntId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));
		vcatnManageVO1.setApplcntNm(user == null ? "" : EgovStringUtil.isNullToString(user.getName()));
		vcatnManageVO1.setOrgnztNm(user == null ? "" : EgovStringUtil.isNullToString(user.getOrgnztNm()));

		ComDefaultCodeVO vo = new ComDefaultCodeVO();
		vo.setCodeId("COM056");
		List<CmmnDetailCode> vcatnSeCodeList = cmmUseService.selectCmmCodeDetail(vo);

		model.addAttribute("vcatnSeCode", vcatnSeCodeList);
		model.addAttribute("vcatnManageVO", vcatnManageVO1);

		return "egovframework/com/uss/ion/vct/EgovVcatnRegist";
	}

	/**
	 * ?닿?愿由ъ젙蹂대? ?좉퇋濡??깅줉?쒕떎.
	 *
	 * @param vcatnManage - ?닿?愿由?model
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/uss/ion/vct/insertVcatnManage.do")
	public String insertVcatnManage(@ModelAttribute("vcatnManage") VcatnManage vcatnManage,
			@ModelAttribute("vcatnManageVO") VcatnManageVO vcatnManageVO, BindingResult bindingResult,
			SessionStatus status, @RequestParam Map<?, ?> commandMap, ModelMap model) throws Exception {

		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// ?뱀씤沅뚯옄 ?뚯냽紐? ?깅챸 ?좎?
		model.addAttribute("infSanctnDtNm",
				commandMap.get("sanctnDtNm") == null ? "" : (String) commandMap.get("sanctnDtNm"));
		model.addAttribute("infOrgnztNm",
				commandMap.get("orgnztNm") == null ? "" : (String) commandMap.get("orgnztNm"));

		String sEnddeView = commandMap.get("enddeView") == null ? "" : (String) commandMap.get("enddeView"); // 醫낅즺?쇱옄 援щ텇
		if (!sEnddeView.equals("")) {
			vcatnManage.setEndde(sEnddeView);
		}

		String sTemp = null;
		String sTempMessage = null;
		int iTemp = 0;


		if (bindingResult.hasErrors()) {
			model.addAttribute("vcatnManageVO", vcatnManageVO);
			return "egovframework/com/uss/ion/vct/EgovVcatnRegist";
		}

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		if (user != null) {
			if (vcatnManage.getSanctnerId() != null) {
				vcatnManage.setConfmAt("A");
			}
			vcatnManage.setApplcntId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));
			vcatnManage.setFrstRegisterId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));

			vcatnManageVO.setApplcntId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));
			vcatnManageVO.setSearchKeyword(EgovStringUtil.removeMinusChar(vcatnManage.getBgnde()));
			// ?쒖옉?쇱옄 ?ы븿?щ?
			iTemp = egovVcatnManageService.selectVcatnManageDplctAt(vcatnManageVO);
			vcatnManageVO.setSearchKeyword(EgovStringUtil.removeMinusChar(vcatnManage.getEndde()));
			// 醫낅즺?쇱옄 ?ы븿?щ?
			iTemp += egovVcatnManageService.selectVcatnManageDplctAt(vcatnManageVO);

			if (iTemp == 0) {
				status.setComplete();
				sTemp = egovVcatnManageService.insertVcatnManage(vcatnManage, vcatnManageVO);

				if (sTemp.equals("01")) {
					model.addAttribute("message", egovMessageSource.getMessage("comUssIonVct.common.inputSuccess"));
					return "forward:/uss/ion/vct/EgovVcatnManageList.do";
				} else {
					if (sTemp.equals("99")) {
						sTempMessage = egovMessageSource.getMessage("comUssIonVct.common.validate.vacationSelectError");
					} else if (sTemp.equals("09")) {
						sTempMessage = egovMessageSource.getMessage("comUssIonVct.common.validate.thatYearOnly");
					} else if (sTemp.equals("02")) {
						sTempMessage = egovMessageSource.getMessage("comUssIonVct.common.validate.vacationFail");
					} else if (sTemp.equals("03")) {
						sTempMessage = egovMessageSource.getMessage("comUssIonVct.common.validate.halfVacationFail");
					} else {
						sTempMessage = "undefined error";
					}
					model.addAttribute("errorMessage", sTempMessage);

					VcatnManageVO vcatnManageVO1 = egovVcatnManageService.selectIndvdlYrycManage(user.getUniqId());
					vcatnManageVO1.setApplcntId(user.getUniqId());
					vcatnManageVO1.setApplcntNm(user.getName());
					vcatnManageVO1.setOrgnztNm(user.getOrgnztNm());
					vcatnManageVO1.setTempBgnde(EgovDateUtil.formatDate(vcatnManage.getBgnde(), "-"));
					vcatnManageVO1.setTempEndde(EgovDateUtil.formatDate(vcatnManage.getEndde(), "-"));

					model.addAttribute("vcatnManageVO", vcatnManageVO1);
					ComDefaultCodeVO vo = new ComDefaultCodeVO();
					vo.setCodeId("COM056");
					List<CmmnDetailCode> vcatnSeCodeList = cmmUseService.selectCmmCodeDetail(vo);
					model.addAttribute("vcatnSeCode", vcatnSeCodeList);

					return "egovframework/com/uss/ion/vct/EgovVcatnRegist";
				}
			} else {

				model.addAttribute("errorMessage",
						egovMessageSource.getMessage("comUssIonVct.common.validate.duplicate"));

				VcatnManageVO vcatnManageVO1 = egovVcatnManageService
						.selectIndvdlYrycManage(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));
				vcatnManageVO1.setApplcntId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));
				vcatnManageVO1.setApplcntNm(user == null ? "" : EgovStringUtil.isNullToString(user.getName()));
				vcatnManageVO1.setOrgnztNm(user == null ? "" : EgovStringUtil.isNullToString(user.getOrgnztNm()));
				model.addAttribute("vcatnManageVO", vcatnManageVO1);

				ComDefaultCodeVO vo = new ComDefaultCodeVO();
				vo.setCodeId("COM056");
				List<CmmnDetailCode> vcatnSeCodeList = cmmUseService.selectCmmCodeDetail(vo);
				model.addAttribute("vcatnSeCode", vcatnSeCodeList);

				return "egovframework/com/uss/ion/vct/EgovVcatnRegist";
			}
		} else {
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
	}

	/**
	 * 湲??깅줉???닿?愿由ъ젙蹂대? ?섏젙?쒕떎.
	 *
	 * @param vcatnManage - ?닿?愿由?model
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/uss/ion/vct/updtVcatnManage.do")
	public String updtVcatnManage(@ModelAttribute("vcatnManage") VcatnManage vcatnManage,
			@ModelAttribute("vcatnManageVO") VcatnManageVO vcatnManageVO, BindingResult bindingResult,
			SessionStatus status, ModelMap model) throws Exception {
		String sTemp = null;
		String sTempMessage = null;

		// KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?좎슜??
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (!isAuthenticated) {
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		if (user != null) {
			// 221116 源?쒖? 2022 ?쒗걧?댁퐫??議곗튂
			vcatnManage.setFrstRegisterId(EgovStringUtil.isNullToString(user.getUniqId()));
			sTemp = egovVcatnManageService.updtVcatnManage(vcatnManage, vcatnManageVO);
			// 221116 源?쒖? 2022 ?쒗걧?댁퐫??議곗튂
			status.setComplete();
			// sTemp = egovVcatnManageService.insertVcatnManage(vcatnManage, vcatnManageVO);

			if (sTemp.equals("01")) {
				model.addAttribute("message", egovMessageSource.getMessage("comUssIonVct.common.inputSuccess"));
				return "forward:/uss/ion/vct/EgovVcatnManageList.do";
			} else {

				if (sTemp.equals("99")) {
					sTempMessage = egovMessageSource.getMessage("comUssIonVct.common.validate.vacationSelectError");
				} else if (sTemp.equals("09")) {
					sTempMessage = egovMessageSource.getMessage("comUssIonVct.common.validate.thatYearOnly");
				} else if (sTemp.equals("02")) {
					sTempMessage = egovMessageSource.getMessage("comUssIonVct.common.validate.vacationFail");
				} else if (sTemp.equals("03")) {
					sTempMessage = egovMessageSource.getMessage("comUssIonVct.common.validate.halfVacationFail");
				} else {
					sTempMessage = "undefined error";
				}

				model.addAttribute("errorMessage", sTempMessage);

				VcatnManageVO vcatnManageVO1 = egovVcatnManageService.selectIndvdlYrycManage(user.getUniqId());
				vcatnManageVO1.setApplcntId(user.getUniqId());
				vcatnManageVO1.setApplcntNm(user.getName());
				vcatnManageVO1.setOrgnztNm(user.getOrgnztNm());
				vcatnManageVO1.setTempBgnde(EgovDateUtil.formatDate(vcatnManage.getBgnde(), "-"));
				vcatnManageVO1.setTempEndde(EgovDateUtil.formatDate(vcatnManage.getEndde(), "-"));

				model.addAttribute("vcatnManageVO", vcatnManageVO1);
				ComDefaultCodeVO vo = new ComDefaultCodeVO();
				vo.setCodeId("COM056");
				List<CmmnDetailCode> vcatnSeCodeList = cmmUseService.selectCmmCodeDetail(vo);
				model.addAttribute("vcatnSeCode", vcatnSeCodeList);

				return "egovframework/com/uss/ion/vct/EgovVcatnUpdt";
			}
		} else {
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
	}

	/**
	 * 湲??깅줉???닿?愿由ъ젙蹂대? ??젣?쒕떎.
	 * 
	 * @param vcatnManage - ?닿?愿由?model
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/uss/ion/vct/deleteVcatnManage.do")
	public String deleteVcatnManage(@ModelAttribute("vcatnManage") VcatnManage vcatnManage, SessionStatus status,
			ModelMap model) throws Exception {
		vcatnManage.setBgnde(EgovStringUtil.removeMinusChar(vcatnManage.getBgnde()));
		vcatnManage.setEndde(EgovStringUtil.removeMinusChar(vcatnManage.getEndde()));
		egovVcatnManageService.deleteVcatnManage(vcatnManage);
		status.setComplete();
		model.addAttribute("message", egovMessageSource.getMessage("success.common.delete"));
		return "forward:/uss/ion/vct/EgovVcatnManageList.do";
	}

	/*** ?뱀씤愿??***/
	/**
	 * ?닿?愿由ъ젙蹂??뱀씤 泥섎━瑜??꾪빐 ?좎껌???닿?愿由?紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param vcatnManageVO - ?닿?愿由?VO
	 * @return String - 由ы꽩 Url
	 */
	@IncludedInfo(name = "?닿??뱀씤愿由?, order = 901, gid = 50)
	@RequestMapping(value = "/uss/ion/vct/EgovVcatnConfmList.do")
	public String selectVcatnManageConfmList(@ModelAttribute("vcatnManageVO") VcatnManageVO vcatnManageVO,
			ModelMap model) throws Exception {

		java.util.Calendar cal = java.util.Calendar.getInstance();
		String[] yearList = new String[5];
		for (int x = 0; x < 5; x++) {
			yearList[x] = Integer.toString(cal.get(java.util.Calendar.YEAR) - x);
		}

		/** paging */
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(vcatnManageVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(vcatnManageVO.getPageUnit());
		paginationInfo.setPageSize(vcatnManageVO.getPageSize());

		vcatnManageVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		vcatnManageVO.setLastIndex(paginationInfo.getLastRecordIndex());
		vcatnManageVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		if (user == null) {
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		vcatnManageVO.setSanctnerId(user.getUniqId()); // ?ъ슜?먭? ?뱀씤沅뚯옄?몄? 議곌굔媛?setting

		vcatnManageVO.setSearchKeyword(vcatnManageVO.getSearchYear() + vcatnManageVO.getSearchMonth());
		vcatnManageVO.setVcatnManageList(egovVcatnManageService.selectVcatnManageConfmList(vcatnManageVO));

		model.addAttribute("vcatnManageList", vcatnManageVO.getVcatnManageList());

		int totCnt = egovVcatnManageService.selectVcatnManageConfmListTotCnt(vcatnManageVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("yearList", yearList);
		model.addAttribute("paginationInfo", paginationInfo);

		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/uss/ion/vct/EgovVcatnConfmList";
	}

	/**
	 * ?닿??뱀씤愿由??곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * 
	 * @param vcatnManageVO - ?닿?愿由?VO
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/uss/ion/vct/EgovVcatnConfm.do")
	public String selectVcatnConfm(@ModelAttribute("vcatnManageVO") VcatnManageVO vcatnManageVO,
			@ModelAttribute("vcatnManage") VcatnManage vcatnManage, ModelMap model) throws Exception {
		vcatnManageVO.setBgnde(EgovStringUtil.removeMinusChar(vcatnManageVO.getBgnde()));
		vcatnManageVO.setEndde(EgovStringUtil.removeMinusChar(vcatnManageVO.getEndde()));

		// ?깅줉 ?곸꽭?뺣낫
		VcatnManageVO vcatnManageVOTemp = egovVcatnManageService.selectVcatnManage(vcatnManageVO);

		model.addAttribute("vcatnManageVO", vcatnManageVOTemp);
		model.addAttribute("vcatnManage", vcatnManageVOTemp);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/uss/ion/vct/EgovVcatnConfm";
	}

	/**
	 * ?좎껌???닿?瑜??뱀씤泥섎━?쒕떎.
	 * 
	 * @param vcatnManage - ?닿?愿由?model
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/uss/ion/vct/updtVcatnConfm.do")
	public String updtVcatnManageConfm(@ModelAttribute("vcatnManageVO") VcatnManageVO vcatnManageVO,
			@ModelAttribute("vcatnManage") VcatnManage vcatnManage, BindingResult bindingResult, SessionStatus status,
			ModelMap model) throws Exception {

		vcatnManage.setBgnde(EgovStringUtil.removeMinusChar(vcatnManage.getBgnde()));
		vcatnManage.setEndde(EgovStringUtil.removeMinusChar(vcatnManage.getEndde()));

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		// KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?좎슜??
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (!isAuthenticated) {
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		if (bindingResult.hasErrors()) {
			model.addAttribute("vcatnManageVO", vcatnManageVO);
			return "egovframework/com/uss/ion/vct/EgovVcatnConfm";
		} else {
			vcatnManage.setSanctnerId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));
			vcatnManage.setLastUpdusrId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));

			egovVcatnManageService.updtVcatnManageConfm(vcatnManage);
			return "forward:/uss/ion/vct/EgovVcatnConfmList.do";
		}
	}

	/**
	 * ?닿??뺣낫 諛섎젮泥섎━ ?붾㈃???몄텧?쒕떎.
	 * 
	 * @param vcatnManage - ?닿?愿由?model
	 * @return String
	 *
	 * @param vcatnManage
	 */
	@RequestMapping("/uss/ion/vct/EgovVcatnReturn.do")
	public String selectSanctnerListPopup(@ModelAttribute("vcatnManage") VcatnManage vcatnManage, ModelMap model)
			throws Exception {
		return "egovframework/com/uss/ion/vct/EgovVcatnReturn";
	}
}
