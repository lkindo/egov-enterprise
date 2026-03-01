package egovframework.com.uss.ion.pwm.web;

import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

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
import org.springframework.web.servlet.ModelAndView;

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.EgovWebUtil;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.uss.ion.pwm.service.EgovPopupManageService;
import egovframework.com.uss.ion.pwm.service.PopupManageVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

/**
 * <pre>
 * 媛쒖슂 - ?앹뾽李쎌뿉 ???Controller瑜??뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜 - ?앹뾽李쎌뿉 ????깅줉, ?섏젙, ??젣, 議고쉶, 諛섏쁺?뺤씤 湲곕뒫???쒓났?쒕떎. - ?앹뾽李쎌쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡? ?ъ슜??
 * ?붾㈃ 蹂닿린濡?援щ텇?쒕떎.
 * </pre>
 * 
 * @author ?댁갹??
 * @since 2009.08.05
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.08.05  ?댁갹??         理쒖큹 ?앹꽦
 *   2011.08.26  ?뺤쭊??         IncludedInfo annotation 異붽?
 *   2019.05.17  ?좎슜??         痍⑥빟??議곗튂 諛?蹂댁셿
 *   2025.08.11  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-CloseResource(遺?곸젅???먯썝 ?댁젣)
 *   2025.08.11  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-AvoidReassigningParameters(?섍꺼諛쏅뒗 硫붿냼??parameter 媛믪쓣 吏곸젒 蹂寃쏀븯??肄붾뱶 ?먯?)
 *
 *      </pre>
 */
@Controller
public class EgovPopupManageController {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovPopupManageController.class);

	/** EgovMessageSource */
	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/** EgovPropertyService */
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	/** EgovPopupManageService */
	@Resource(name = "egovPopupManageService")
	private EgovPopupManageService egovPopupManageService;

	/**
	 * ?앹뾽李쎄?由?紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param popupManageVO
	 * @param model
	 * @return "egovframework/com/uss/ion/pwm/listPopupManage"
	 * @throws Exception
	 */
	@IncludedInfo(name = "?앹뾽李쎄?由?, order = 720, gid = 50)
	@RequestMapping(value = "/uss/ion/pwm/listPopup.do")
	public String egovPopupManageList(@RequestParam Map<?, ?> commandMap, PopupManageVO popupManageVO, ModelMap model)
			throws Exception {

		/** EgovPropertyService.sample */
		popupManageVO.setPageUnit(propertiesService.getInt("pageUnit"));
		popupManageVO.setPageSize(propertiesService.getInt("pageSize"));

		/** pageing */
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(popupManageVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(popupManageVO.getPageUnit());
		paginationInfo.setPageSize(popupManageVO.getPageSize());

		popupManageVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		popupManageVO.setLastIndex(paginationInfo.getLastRecordIndex());
		popupManageVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		List<EgovMap> reusltList = egovPopupManageService.selectPopupList(popupManageVO);
		model.addAttribute("resultList", reusltList);

		model.addAttribute("searchKeyword",
				commandMap.get("searchKeyword") == null ? "" : (String) commandMap.get("searchKeyword"));
		model.addAttribute("searchCondition",
				commandMap.get("searchCondition") == null ? "" : (String) commandMap.get("searchCondition"));

		int totCnt = egovPopupManageService.selectPopupListCount(popupManageVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/uss/ion/pwm/EgovPopupList";
	}

	/**
	 * ?듯빀留곹겕愿由?紐⑸줉???곸꽭議고쉶 議고쉶?쒕떎.
	 * 
	 * @param popupManageVO
	 * @param commandMap
	 * @param model
	 * @return "/uss/ion/pwm/detailPopupManage"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/ion/pwm/detailPopup.do")
	public String egovPopupManageDetail(PopupManageVO popupManageVO, @RequestParam Map<?, ?> commandMap, ModelMap model)
			throws Exception {

		String sLocationUrl = "egovframework/com/uss/ion/pwm/EgovPopupDetail";

		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");

		if (sCmd.equals("del")) {
			egovPopupManageService.deletePopup(popupManageVO);
			sLocationUrl = "forward:/uss/ion/pwm/listPopup.do";
		} else {
			// ?곸꽭?뺣낫 遺덈윭?ㅺ린
			PopupManageVO popupManageVOs = egovPopupManageService.selectPopup(popupManageVO);
			model.addAttribute("popupManageVO", popupManageVOs);
		}

		return sLocationUrl;
	}

	/**
	 * ?듯빀留곹겕愿由щ? ?섏젙?쒕떎.
	 * 
	 * @param searchVO
	 * @param popupManageVO
	 * @param bindingResult
	 * @param model
	 * @return "/uss/ion/pwm/updtPopupManage"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/ion/pwm/updtPopup.do")
	public String egovPopupManageUpdt(@RequestParam Map<?, ?> commandMap, PopupManageVO popupManageVO,
			BindingResult bindingResult, ModelMap model) throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		String sLocationUrl = "egovframework/com/uss/ion/pwm/EgovPopupUpdt";

		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");

		// ?앹뾽李쎌떆?묒씪????
		model.addAttribute("ntceBgndeHH", getTimeHH());
		// ?앹뾽李쎌떆?묒씪??遺?
		model.addAttribute("ntceBgndeMM", getTimeMM());
		// ?앹뾽李쎌쥌猷뚯씪????
		model.addAttribute("ntceEnddeHH", getTimeHH());
		// ?앹뾽李쎌젙猷뚯씪??遺?
		model.addAttribute("ntceEnddeMM", getTimeMM());

		if (sCmd.equals("save")) {
			sLocationUrl = "forward:/uss/ion/pwm/listPopup.do";

			if (bindingResult.hasErrors()) {
				return sLocationUrl;
			}
			// ?꾩씠???ㅼ젙
			popupManageVO.setFrstRegisterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
			popupManageVO.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
			// ???
			egovPopupManageService.updatePopup(popupManageVO);
		} else {

			PopupManageVO popupManageVOs = egovPopupManageService.selectPopup(popupManageVO);

			String sNtceBgnde = popupManageVOs.getNtceBgnde();
			String sNtceEndde = popupManageVOs.getNtceEndde();

			popupManageVOs.setNtceBgndeHH(sNtceBgnde.substring(8, 10));
			popupManageVOs.setNtceBgndeMM(sNtceBgnde.substring(10, 12));

			popupManageVOs.setNtceEnddeHH(sNtceEndde.substring(8, 10));
			popupManageVOs.setNtceEnddeMM(sNtceEndde.substring(10, 12));

			model.addAttribute("popupManageVO", popupManageVOs);
		}

		return sLocationUrl;
	}

	/**
	 * ?듯빀留곹겕愿由щ? ?깅줉?쒕떎.
	 * 
	 * @param searchVO
	 * @param popupManageVO
	 * @param bindingResult
	 * @param model
	 * @return "/uss/ion/pwm/registPopupManage"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/ion/pwm/registPopup.do")
	public String egovPopupManageRegist(@RequestParam Map<?, ?> commandMap,
			@ModelAttribute("popupManageVO") PopupManageVO popupManageVO, BindingResult bindingResult, ModelMap model)
			throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		String sLocationUrl = "egovframework/com/uss/ion/pwm/EgovPopupRegist";

		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");
		LOGGER.info("cmd => {}", sCmd);

		if (sCmd.equals("save")) {

			if (bindingResult.hasErrors()) {
				return sLocationUrl;
			}
			// ?꾩씠???ㅼ젙
			popupManageVO.setFrstRegisterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
			popupManageVO.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
			// ???
			egovPopupManageService.insertPopup(popupManageVO);

			sLocationUrl = "forward:/uss/ion/pwm/listPopup.do";
		}

		// ?앹뾽李쎌떆?묒씪????
		model.addAttribute("ntceBgndeHH", getTimeHH());
		// ?앹뾽李쎌떆?묒씪??遺?
		model.addAttribute("ntceBgndeMM", getTimeMM());
		// ?앹뾽李쎌쥌猷뚯씪????
		model.addAttribute("ntceEnddeHH", getTimeHH());
		// ?앹뾽李쎌젙猷뚯씪??遺?
		model.addAttribute("ntceEnddeMM", getTimeMM());

		return sLocationUrl;
	}

	/**
	 * ?앹뾽李쎌젙蹂대? 議고쉶?쒕떎.
	 * 
	 * @param commandMap
	 * @param popupManageVO
	 * @return
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/ion/pwm/ajaxPopupManageInfo.do")
	public void egovPopupManageInfoAjax(@RequestParam Map<?, ?> commandMap, HttpServletResponse response,
			PopupManageVO popupManageVO) throws Exception {

		response.setHeader("Content-Type", "text/html;charset=utf-8");

		PrintWriter out = null; // NOPMD - CloseResource 洹쒖튃 臾댁떆
		try {
			out = new PrintWriter(new OutputStreamWriter(response.getOutputStream(), "UTF-8"));

			LOGGER.debug("commandMap : {}", commandMap);
			LOGGER.debug("popupManageVO : {}", popupManageVO);

			PopupManageVO popupManageVOs = egovPopupManageService.selectPopup(popupManageVO);

			String sPrint = popupManageVOs.getFileUrl() + "||" + popupManageVOs.getPopupWSize() + "||"
					+ popupManageVOs.getPopupHSize() + "||" + popupManageVOs.getPopupHlc() + "||"
					+ popupManageVOs.getPopupWlc() + "||" + popupManageVOs.getStopVewAt();

			out.print(EgovWebUtil.clearXSSMinimum(sPrint));
		} finally {
			if (out != null) {
				out.flush();
			}
		}
	}

	/**
	 * ?앹뾽李쎌쓣 ?ㅽ뵂 ?쒕떎.
	 * 
	 * @param commandMap
	 * @param popupManageVO
	 * @return
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/ion/pwm/openPopupManage.do")
	public String egovPopupManagePopupOpen(@RequestParam("fileUrl") String fileUrl,
			@RequestParam("stopVewAt") String stopVewAt, @RequestParam("popupId") String popupId, ModelMap model)
			throws Exception {

		model.addAttribute("stopVewAt", stopVewAt);
		model.addAttribute("popupId", popupId);

		String fileUrl2 = EgovWebUtil.filePathBlackList(fileUrl);

		List<EgovMap> popupWhiteList = egovPopupManageService.selectPopupWhiteList();
		LOGGER.debug("Open Popup > WhiteList Count = {}", popupWhiteList.size());
		if (fileUrl2 == null) {
			fileUrl2 = "";
		}
		for (Object obj : popupWhiteList) {
			EgovMap map = (EgovMap) obj;
			LOGGER.debug("Open Popup > whiteList fileUrl = " + map.get("fileUrl"));
			if (fileUrl2.equals(map.get("fileUrl"))) {
				return fileUrl2;
			}
		}
		// System.out.println("===>>> "+popupWhiteList.size());
		LOGGER.debug("Open Popup > WhiteList mismatch! Please check Admin page!");
		return "egovframework/com/cmm/egovError";
	}

	/**
	 * ?앹뾽李쎄?由?硫붿씤 ?뚯뒪??紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param popupManageVO
	 * @param model
	 * @return "egovframework/com/uss/ion/pwm/listMainPopup"
	 * @throws Exception ?앹뾽李쎈━?ㅽ듃瑜?媛?몄삩??
	 */
	@RequestMapping(value = "/uss/ion/pwm/listMainPopup.do")

	public ModelAndView egovPopupManageMainList(PopupManageVO popupManageVO, ModelMap model) throws Exception {
		List<EgovMap> resultList = egovPopupManageService.selectPopupMainList(popupManageVO);
		ModelAndView mav = new ModelAndView("jsonView");
		mav.addObject("resultList", resultList);
		return mav;
	}

	/**
	 * ?쒓컙??LIST瑜?諛섑솚?쒕떎.
	 * 
	 * @return List
	 * @throws
	 */
	@SuppressWarnings("unused")
	private List<ComDefaultCodeVO> getTimeHH() {
		ArrayList<ComDefaultCodeVO> listHH = new ArrayList<ComDefaultCodeVO>();
		HashMap<?, ?> hmHHMM;
		for (int i = 0; i <= 24; i++) {
			String sHH = "";
			String strI = String.valueOf(i);
			if (i < 10) {
				sHH = "0" + strI;
			} else {
				sHH = strI;
			}

			ComDefaultCodeVO codeVO = new ComDefaultCodeVO();
			codeVO.setCode(sHH);
			codeVO.setCodeNm(sHH);

			listHH.add(codeVO);
		}

		return listHH;
	}

	/**
	 * 遺꾩쓣 LIST瑜?諛섑솚?쒕떎.
	 * 
	 * @return List
	 * @throws
	 */
	@SuppressWarnings("unused")
	private List<ComDefaultCodeVO> getTimeMM() {
		ArrayList<ComDefaultCodeVO> listMM = new ArrayList<ComDefaultCodeVO>();
		HashMap<?, ?> hmHHMM;
		for (int i = 0; i <= 60; i++) {

			String sMM = "";
			String strI = String.valueOf(i);
			if (i < 10) {
				sMM = "0" + strI;
			} else {
				sMM = strI;
			}

			ComDefaultCodeVO codeVO = new ComDefaultCodeVO();
			codeVO.setCode(sMM);
			codeVO.setCodeNm(sMM);

			listMM.add(codeVO);
		}
		return listMM;
	}

	/**
	 * 0??遺숈뿬 諛섑솚
	 * 
	 * @return String
	 * @throws
	 */
	public String dateTypeIntForString(int iInput) {
		String sOutput = "";
		if (Integer.toString(iInput).length() == 1) {
			sOutput = "0" + Integer.toString(iInput);
		} else {
			sOutput = Integer.toString(iInput);
		}

		return sOutput;
	}
}
