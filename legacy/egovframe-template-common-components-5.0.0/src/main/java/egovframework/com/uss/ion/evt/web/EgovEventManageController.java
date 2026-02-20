package egovframework.com.uss.ion.evt.web;

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
import egovframework.com.uss.ion.evt.service.EgovEventManageService;
import egovframework.com.uss.ion.evt.service.EventAtdrn;
import egovframework.com.uss.ion.evt.service.EventManage;
import egovframework.com.uss.ion.evt.service.EventManageVO;
import egovframework.com.utl.fcc.service.EgovDateUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * <pre>
 * 媛쒖슂
 * - ?됱궗愿由ъ뿉 ???controller ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?됱궗愿由ъ뿉 ????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * - ?됱궗愿由ъ쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
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
 *   2025.08.06  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(final???꾨땶 蹂?섎뒗 諛묒쨪???ы븿?????놁쓬)
 *
 *      </pre>
 */
@Controller
public class EgovEventManageController {

	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	@Resource(name = "egovEventManageService")
	private EgovEventManageService egovEventManageService;

	@Resource(name = "EgovCmmUseService")
	private EgovCmmUseService cmmUseService;

	/**
	 * ?됱궗愿由?紐⑸줉?붾㈃ ?대룞
	 * 
	 * @return String
	 * @exception Exception
	 */
	@RequestMapping("/uss/ion/evt/EgovEventReqstManageListView.do")
	public String selectEventManageListView() throws Exception {

		return "egovframework/com/uss/ion/evt/EgovEventReqstManageList";
	}

	/**
	 * ?됱궗愿由ъ젙蹂대? 愿由ы븯湲??꾪빐 ?깅줉???됱궗愿由?紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param eventManageVO - ?됱궗愿由?VO
	 * @return String - 由ы꽩 Url
	 */
	@IncludedInfo(name = "?됱궗?좎껌愿由?, order = 940, gid = 50)
	@RequestMapping(value = "/uss/ion/evt/EgovEventReqstManageList.do")
	public String selectEventManageList(@ModelAttribute("eventManageVO") EventManageVO eventManageVO, ModelMap model)
			throws Exception {

		// ?됱궗?꾩썡
		java.util.Calendar cal = java.util.Calendar.getInstance();
		String[] yearList = new String[5];
		for (int x = 0; x < 5; x++) {
			yearList[x] = Integer.toString(cal.get(java.util.Calendar.YEAR) - x);
		}
		// ?됱궗援щ텇
		ComDefaultCodeVO vo = new ComDefaultCodeVO();
		vo.setCodeId("COM053");
		List<CmmnDetailCode> eventSeCodeList = cmmUseService.selectCmmCodeDetail(vo);
		model.addAttribute("eventSeCode", eventSeCodeList);

		/** paging */
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(eventManageVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(eventManageVO.getPageUnit());
		paginationInfo.setPageSize(eventManageVO.getPageSize());

		eventManageVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		eventManageVO.setLastIndex(paginationInfo.getLastRecordIndex());
		eventManageVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());
		eventManageVO.setSearchKeyword(eventManageVO.getSearchYear() + eventManageVO.getSearchMonth());
		eventManageVO.setEventManageList(egovEventManageService.selectEventManageList(eventManageVO));

		model.addAttribute("eventManageList", eventManageVO.getEventManageList());

		int totCnt = egovEventManageService.selectEventManageListTotCnt(eventManageVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);
		model.addAttribute("yearList", yearList);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/uss/ion/evt/EgovEventReqstManageList";
	}

	/**
	 * ?깅줉???됱궗愿由ъ쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * 
	 * @param eventManageVO - ?됱궗愿由?VO
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/uss/ion/evt/EgovEventReqstDetail.do")
	public String selectEventManage(@ModelAttribute("eventManage") EventManageVO eventManage,
			@ModelAttribute("eventManageVO") EventManageVO eventManageVO, @RequestParam Map<?, ?> commandMap,
			ModelMap model) throws Exception {

		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd"); // ?곸꽭?뺣낫 援щ텇
		EventManageVO eventManageVO1 = egovEventManageService.selectEventManage(eventManageVO);
		eventManageVO1.setEventBeginDe(EgovDateUtil.formatDate(eventManageVO1.getEventBeginDe(), "-"));
		eventManageVO1.setEventEndDe(EgovDateUtil.formatDate(eventManageVO1.getEventEndDe(), "-"));
		eventManageVO1.setRceptBeginDe(EgovDateUtil.formatDate(eventManageVO1.getRceptBeginDe(), "-"));
		eventManageVO1.setRceptEndDe(EgovDateUtil.formatDate(eventManageVO1.getRceptEndDe(), "-"));

		model.addAttribute("eventManageVO", eventManageVO1);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		if (sCmd.equals("updt")) {
			eventManage.setEventId(eventManageVO1.getEventId());
			eventManage.setEventSe(eventManageVO1.getEventSe());
			eventManage.setEventNm(eventManageVO1.getEventNm());
			eventManage.setEventPurps(eventManageVO1.getEventPurps());
			eventManage.setEventBeginDe(eventManageVO1.getEventBeginDe());
			eventManage.setEventEndDe(eventManageVO1.getEventEndDe());
			eventManage.setEventAuspcInsttNm(eventManageVO1.getEventAuspcInsttNm());
			eventManage.setEventMngtInsttNm(eventManageVO1.getEventMngtInsttNm());
			eventManage.setEventPlace(eventManageVO1.getEventPlace());
			eventManage.setEventCn(eventManageVO1.getEventCn());
			eventManage.setCtOccrrncAt(eventManageVO1.getCtOccrrncAt());
			eventManage.setPartcptCt(eventManageVO1.getPartcptCt());
			eventManage.setPsncpa(eventManageVO1.getPsncpa());
			eventManage.setRefrnUrl(eventManageVO1.getRefrnUrl());
			eventManage.setRceptBeginDe(eventManageVO1.getRceptBeginDe());
			eventManage.setRceptEndDe(eventManageVO1.getRceptEndDe());
			model.addAttribute("eventManage", eventManage);
			return "egovframework/com/uss/ion/evt/EgovEventReqstUpdt";
		} else if (sCmd.equals("popup")) {
			model.addAttribute("check_popup", "Y");
			return "egovframework/com/uss/ion/evt/EgovEventReqstDetail";
		} else {
			return "egovframework/com/uss/ion/evt/EgovEventReqstDetail";
		}
	}

	/**
	 * ?됱궗愿由??깅줉 ?붾㈃?쇰줈 ?대룞?쒕떎.
	 * 
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/uss/ion/evt/EgovEventReqstRegist.do")
	public String insertViewEventManage(@ModelAttribute("eventManage") EventManageVO eventManage,
			@ModelAttribute("eventManageVO") EventManageVO eventManageVO, ModelMap model) throws Exception {

		ComDefaultCodeVO vo = new ComDefaultCodeVO();
		vo.setCodeId("COM053");
		List<CmmnDetailCode> eventSeCodeList = cmmUseService.selectCmmCodeDetail(vo);
		model.addAttribute("eventSeCode", eventSeCodeList);

		return "egovframework/com/uss/ion/evt/EgovEventReqstRegist";
	}

	/**
	 * ?됱궗愿由ъ젙蹂대? ?좉퇋濡??깅줉?쒕떎.
	 * 
	 * @param eventManage - ?됱궗愿由?model
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/uss/ion/evt/insertEventManage.do")
	public String insertEventManage(@ModelAttribute("eventManage") EventManage eventManage,
			@ModelAttribute("eventManageVO") EventManageVO eventManageVO, BindingResult bindingResult,
			SessionStatus status, ModelMap model) throws Exception {


		if (bindingResult.hasErrors()) {
			model.addAttribute("eventManageVO", eventManageVO);
			return "egovframework/com/uss/ion/evt/EgovEventReqstRegist";
		} else {
			LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
			eventManage.setFrstRegisterId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());
			status.setComplete();
			egovEventManageService.insertEventManage(eventManage);
			model.addAttribute("message", egovMessageSource.getMessage("success.common.insert"));
			return "forward:/uss/ion/evt/EgovEventReqstManageList.do";
		}
	}

	/**
	 * 湲??깅줉???됱궗愿由ъ젙蹂대? ?섏젙?쒕떎.
	 * 
	 * @param eventManage - ?됱궗愿由?model
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/uss/ion/evt/EgovEventReqstSave.do")
	public String updtEventManage(@ModelAttribute("eventManage") EventManage eventManage,
			@ModelAttribute("eventManageVO") EventManageVO eventManageVO, BindingResult bindingResult,
			SessionStatus status, ModelMap model) throws Exception {


		if (bindingResult.hasErrors()) {
			model.addAttribute("eventManageVO", eventManage);
			return "egovframework/com/uss/ion/evt/EgovEventReqstUpdt";
		} else {
			LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
			eventManage.setLastUpdusrId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());
			status.setComplete();
			egovEventManageService.updtEventManage(eventManage);
			return "forward:/uss/ion/evt/EgovEventReqstManageList.do";
		}
	}

	/**
	 * 湲??깅줉???됱궗愿由ъ젙蹂대? ??젣?쒕떎.
	 * 
	 * @param eventManage - ?됱궗愿由?model
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/uss/ion/evt/EgovEventReqstDelete.do")
	public String deleteEventManage(@ModelAttribute("eventManage") EventManage eventManage, SessionStatus status,
			ModelMap model) throws Exception {

		egovEventManageService.deleteEventManage(eventManage);
		status.setComplete();
		model.addAttribute("message", egovMessageSource.getMessage("success.common.delete"));
		return "forward:/uss/ion/evt/EgovEventReqstManageList.do";
	}

	/** ?됱궗?묒닔愿由?**/
	/**
	 * ?됱궗?묒닔愿由ъ젙蹂대? 愿由ы븯湲??꾪빐 ?깅줉???됱궗?묒닔愿由?紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param eventManageVO - ?됱궗愿由?VO
	 * @return String - 由ы꽩 Url
	 */
	@IncludedInfo(name = "?됱궗?묒닔愿由?, order = 941, gid = 50)
	@RequestMapping(value = "/uss/ion/evt/EgovEventRcrptManageList.do")
	public String selectEventAtdrnList(@ModelAttribute("eventManageVO") EventManageVO eventManageVO, ModelMap model)
			throws Exception {

		// ?됱궗?꾩썡
		java.util.Calendar cal = java.util.Calendar.getInstance();
		String[] yearList = new String[5];
		for (int x = 0; x < 5; x++) {
			yearList[x] = Integer.toString(cal.get(java.util.Calendar.YEAR) - x);
		}
		model.addAttribute("yearList", yearList);

		// ?됱궗援щ텇
		ComDefaultCodeVO vo = new ComDefaultCodeVO();
		vo.setCodeId("COM053");
		List<CmmnDetailCode> eventSeCodeList = cmmUseService.selectCmmCodeDetail(vo);
		model.addAttribute("eventSeCode", eventSeCodeList);

		/** paging */
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(eventManageVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(eventManageVO.getPageUnit());
		paginationInfo.setPageSize(eventManageVO.getPageSize());

		eventManageVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		eventManageVO.setLastIndex(paginationInfo.getLastRecordIndex());
		eventManageVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		eventManageVO.setSearchKeyword(eventManageVO.getSearchYear() + eventManageVO.getSearchMonth());
		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		if (user == null) {
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		eventManageVO.setApplcntId(user.getUniqId());// ?ъ슜?륶niqID
		eventManageVO.setEventManageList(egovEventManageService.selectEventAtdrnList(eventManageVO));
		model.addAttribute("eventManageList", eventManageVO.getEventManageList());

		int totCnt = egovEventManageService.selectEventAtdrnListTotCnt(eventManageVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));
		return "egovframework/com/uss/ion/evt/EgovEventRceptManageList";
	}

	/**
	 * ?깅줉???됱궗?묒닔愿由ъ쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * 
	 * @param eventManageVO - ?됱궗愿由?VO
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/uss/ion/evt/EgovEventRcrptDetail.do")
	public String selectEventAtdrn(@ModelAttribute("eventAtdrn") EventAtdrn eventAtdrn,
			@ModelAttribute("eventManageVO") EventManageVO eventManageVO, ModelMap model) throws Exception {
		EventManageVO eventManageVO1 = egovEventManageService.selectEventAtdrn(eventManageVO);

		eventAtdrn.setEventId(eventManageVO1.getEventId());
		eventAtdrn.setApplcntId(eventManageVO1.getApplcntId());
		eventManageVO1.setEventBeginDe(EgovDateUtil.formatDate(eventManageVO1.getEventBeginDe(), "-"));
		eventManageVO1.setEventEndDe(EgovDateUtil.formatDate(eventManageVO1.getEventEndDe(), "-"));
		eventManageVO1.setRceptBeginDe(EgovDateUtil.formatDate(eventManageVO1.getRceptBeginDe(), "-"));
		eventManageVO1.setRceptEndDe(EgovDateUtil.formatDate(eventManageVO1.getRceptEndDe(), "-"));

		model.addAttribute("eventAtdrn", eventAtdrn);
		model.addAttribute("eventManageVO", eventManageVO1);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/uss/ion/evt/EgovEventRceptDetail";
	}

	/**
	 * ?됱궗?묒닔愿由??깅줉 ?붾㈃?쇰줈 ?대룞?쒕떎.
	 * 
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/uss/ion/evt/EgovEventRceptRegist.do")
	public String insertViewEventAtdrn(@ModelAttribute("eventAtdrn") EventAtdrn eventAtdrn,
			@ModelAttribute("eventManageVO") EventManageVO eventManageVO, SessionStatus status, ModelMap model)
			throws Exception {
		EventManageVO eventManageVO1 = egovEventManageService.selectEventManage(eventManageVO);
		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		status.setComplete();
		eventAtdrn.setApplcntId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());
		eventAtdrn.setEventId(eventManageVO1.getEventId());
		eventManageVO1.setEventBeginDe(EgovDateUtil.formatDate(eventManageVO1.getEventBeginDe(), "-"));
		eventManageVO1.setEventEndDe(EgovDateUtil.formatDate(eventManageVO1.getEventEndDe(), "-"));
		eventManageVO1.setRceptBeginDe(EgovDateUtil.formatDate(eventManageVO1.getRceptBeginDe(), "-"));
		eventManageVO1.setRceptEndDe(EgovDateUtil.formatDate(eventManageVO1.getRceptEndDe(), "-"));
		eventManageVO1.setEventTemp6((user == null || user.getName() == null) ? "" : user.getName());
		eventManageVO1.setEventTemp7((user == null || user.getOrgnztNm() == null) ? "" : user.getOrgnztNm());

		model.addAttribute("eventAtdrn", eventAtdrn);
		model.addAttribute("eventManageVO", eventManageVO1);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/uss/ion/evt/EgovEventRceptRegist";
	}

	/**
	 * ?됱궗?묒닔愿由ъ젙蹂대? ?좉퇋濡??깅줉?쒕떎.
	 * 
	 * @param eventAtdrn - ?됱궗李몄꽍??model
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/uss/ion/evt/insertEventAtdrn.do")
	public String insertEventAtdrn(@ModelAttribute("eventAtdrn") EventAtdrn eventAtdrn,
			@ModelAttribute("eventManageVO") EventManageVO eventManageVO, BindingResult bindingResult,
			SessionStatus status, ModelMap model) throws Exception {

		if (bindingResult.hasErrors()) {
			model.addAttribute("eventManageVO", eventManageVO);
			return "forward:/uss/ion/evt/EgovEventRceptRegist.do";
		} else {
			EventManageVO resultVO = egovEventManageService.selectEventManage(eventManageVO);
			if (resultVO.getPsncpa() > egovEventManageService.selectEventReqstAtdrnListTotCnt(eventManageVO)) {
				java.util.Calendar cal = java.util.Calendar.getInstance();

				int iYear = cal.get(java.util.Calendar.YEAR);
				int iMonth = cal.get(java.util.Calendar.MONTH);
				int iDate = cal.get(java.util.Calendar.DATE);

				// 寃???ㅼ젙
				String sSearchDate = "";
				sSearchDate += Integer.toString(iYear);
				sSearchDate += Integer.toString(iMonth + 1).length() == 1 ? "0" + Integer.toString(iMonth + 1)
						: Integer.toString(iMonth + 1);
				sSearchDate += Integer.toString(iDate);
				eventAtdrn.setReqstDe(sSearchDate);// ?좎껌?쇱옄

				LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
				eventAtdrn.setFrstRegisterId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());
				status.setComplete();
				egovEventManageService.insertEventAtdrn(eventAtdrn);
				model.addAttribute("message", egovMessageSource.getMessage("success.common.insert"));

				return "forward:/uss/ion/evt/EgovEventRcrptManageList.do";
			} else {
				EventManageVO eventManageVO1 = egovEventManageService.selectEventManage(eventManageVO);
				LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
				status.setComplete();
				eventAtdrn.setApplcntId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());
				eventAtdrn.setEventId(eventManageVO1.getEventId());
				eventManageVO1.setEventBeginDe(EgovDateUtil.formatDate(eventManageVO1.getEventBeginDe(), "-"));
				eventManageVO1.setEventEndDe(EgovDateUtil.formatDate(eventManageVO1.getEventEndDe(), "-"));
				eventManageVO1.setRceptBeginDe(EgovDateUtil.formatDate(eventManageVO1.getRceptBeginDe(), "-"));
				eventManageVO1.setRceptEndDe(EgovDateUtil.formatDate(eventManageVO1.getRceptEndDe(), "-"));
				eventManageVO1.setEventTemp6((user == null || user.getName() == null) ? "" : user.getName());
				eventManageVO1.setEventTemp7((user == null || user.getOrgnztNm() == null) ? "" : user.getOrgnztNm());

				model.addAttribute("eventAtdrn", eventAtdrn);
				model.addAttribute("eventManageVO", eventManageVO1);
				model.addAttribute("errMessage", "?뺤썝珥덇낵");

				return "egovframework/com/uss/ion/evt/EgovEventRceptRegist";
			}
		}
	}

	/**
	 * 湲??깅줉???됱궗?묒닔愿由ъ젙蹂대? 痍⑥냼?쒕떎.
	 * 
	 * @param eventManage - ?됱궗愿由?model
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/uss/ion/evt/deleteEventAtdrn.do")
	public String deleteEventAtdrn(@ModelAttribute("eventAtdrn") EventAtdrn eventAtdrn, SessionStatus status,
			ModelMap model) throws Exception {

		egovEventManageService.deleteEventAtdrn(eventAtdrn);
		status.setComplete();
		model.addAttribute("message", egovMessageSource.getMessage("success.common.delete"));
		return "forward:/uss/ion/evt/EgovEventRcrptManageList.do";
	}

	/**
	 * ?됱궗?묒닔?뱀씤/諛섎젮 泥섎━瑜??꾪빐 ?깅줉???됱궗?묒닔 紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param eventManageVO - ?됱궗愿由?VO
	 * @return String - 由ы꽩 Url
	 */
	@IncludedInfo(name = "?됱궗?묒닔?뱀씤愿由?, order = 942, gid = 50)
	@RequestMapping(value = "/uss/ion/evt/selectEventRceptConfmList.do")
	public String selectEventRceptConfmList(@ModelAttribute("eventManageVO") EventManageVO eventManageVO,
			@RequestParam Map<?, ?> commandMap, ModelMap model) throws Exception {
		// ?됱궗?꾩썡
		java.util.Calendar cal = java.util.Calendar.getInstance();
		String[] yearList = new String[5];
		for (int x = 0; x < 5; x++) {
			yearList[x] = Integer.toString(cal.get(java.util.Calendar.YEAR) - x);
		}
		// ?됱궗援щ텇
		ComDefaultCodeVO vo = new ComDefaultCodeVO();
		vo.setCodeId("COM053");
		List<CmmnDetailCode> eventSeCodeList = cmmUseService.selectCmmCodeDetail(vo);
		model.addAttribute("eventSeCode", eventSeCodeList);

		/** paging */
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(eventManageVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(eventManageVO.getPageUnit());
		paginationInfo.setPageSize(eventManageVO.getPageSize());

		eventManageVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		eventManageVO.setLastIndex(paginationInfo.getLastRecordIndex());
		eventManageVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		if (user == null) {
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		eventManageVO.setSanctnerId(user.getUniqId());// ?뱀씤沅뚯옄UniqID

		eventManageVO.setSearchKeyword(eventManageVO.getSearchYear() + eventManageVO.getSearchMonth());

		int totCnt = egovEventManageService.selectEventRceptConfmListTotCnt(eventManageVO);
		eventManageVO.setEventManageList(egovEventManageService.selectEventRceptConfmList(eventManageVO));
		model.addAttribute("eventRceptConfmList", eventManageVO.getEventManageList());

		paginationInfo.setTotalRecordCount(totCnt);

		model.addAttribute("paginationInfo", paginationInfo);
		model.addAttribute("yearList", yearList);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/uss/ion/evt/EgovEventRceptConfm";
	}

	/**
	 * 湲??깅줉???됱궗?묒닔愿由ъ젙蹂대? ?뱀씤/諛섎젮泥섎━?쒕떎.
	 * 
	 * @param eventAtdrn - ?됱궗李몄꽍??model
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/uss/ion/evt/updtEventAtdrn.do")
	public String updtEventAtdrn(@RequestParam("checkedEventRceptForConfm") String checkedEventRceptForConfm,
			@ModelAttribute("eventAtdrn") EventAtdrn eventAtdrn, @RequestParam Map<?, ?> commandMap,
			SessionStatus status, ModelMap model) throws Exception {
		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd"); // ?곸꽭?뺣낫 援щ텇
		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		eventAtdrn.setConfmAt(sCmd);
		eventAtdrn.setSanctnerId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());
		eventAtdrn.setFrstRegisterId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());
		egovEventManageService.updtEventAtdrn(eventAtdrn, checkedEventRceptForConfm);
		return "forward:/uss/ion/evt/selectEventRceptConfmList.do";
	}

	/**
	 * ?됱궗?묒닔???뺣낫 紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param eventManageVO - ?됱궗愿由?VO
	 * @return String - 由ы꽩 Url
	 */
	// @IncludedInfo(name="?됱궗李멸??붿껌?먮ぉ濡?, order = 942)
	@RequestMapping(value = "/uss/ion/evt/EgovEventReqstAtdrnList.do")
	public String selectEventReqstAtdrnList(@ModelAttribute("eventManageVO") EventManageVO eventManageVO,
			ModelMap model) throws Exception {
		/** paging */
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(eventManageVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(eventManageVO.getPageUnit());
		paginationInfo.setPageSize(eventManageVO.getPageSize());

		eventManageVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		eventManageVO.setLastIndex(paginationInfo.getLastRecordIndex());
		eventManageVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		eventManageVO.setEventManageList(egovEventManageService.selectEventReqstAtdrnList(eventManageVO));
		model.addAttribute("eventManageList", eventManageVO.getEventManageList());

		int totCnt = egovEventManageService.selectEventReqstAtdrnListTotCnt(eventManageVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/uss/ion/evt/EgovEventReqstAtdrnList";
	}

}
