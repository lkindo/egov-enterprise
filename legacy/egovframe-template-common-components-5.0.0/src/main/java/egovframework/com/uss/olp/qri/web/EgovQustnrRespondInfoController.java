package egovframework.com.uss.olp.qri.web;

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

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.EgovWebUtil;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.service.CmmnDetailCode;
import egovframework.com.cmm.service.EgovCmmUseService;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.uss.olp.qri.service.EgovQustnrRespondInfoService;
import egovframework.com.uss.olp.qri.service.QustnrRespondInfoVO;
import egovframework.com.uss.olp.qrm.service.EgovQustnrRespondManageService;
import egovframework.com.uss.olp.qrm.service.QustnrRespondManageVO;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

/**
 * ?ㅻЦ議곗궗 Controller Class 援ы쁽
 * 
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2009.03.20
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.20  ?λ룞??         理쒖큹 ?앹꽦
 *   2011.08.26  ?뺤쭊??         IncludedInfo annotation 異붽?
 *   2019.05.16  ?좎슜??         egovQustnrRespondInfoManageTemplate() 硫붿냼????젣 (蹂댁븞痍⑥빟?????
 *   2025.08.25  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(final???꾨땶 蹂?섎뒗 諛묒쨪???ы븿?????놁쓬)
 *
 *      </pre>
 */
@Controller
public class EgovQustnrRespondInfoController {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovQustnrRespondInfoController.class);

	/** EgovMessageSource */
	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	@Resource(name = "egovQustnrRespondInfoService")
	private EgovQustnrRespondInfoService egovQustnrRespondInfoService;

	@Resource(name = "egovQustnrRespondManageService")
	private EgovQustnrRespondManageService egovQustnrRespondManageService;

	/** EgovPropertyService */
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	@Resource(name = "EgovCmmUseService")
	private EgovCmmUseService cmmUseService;

	/**
	 * ?ㅻЦ?쒗뵆由우쓣 ?곸슜?쒕떎.
	 *
	 * @param searchVO
	 * @param request
	 * @param commandMap
	 * @param model
	 * @return "egovframework/com/uss/olp/template/template"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/olp/qri/template/template.do")
	public String egovQustnrRespondInfoManageTemplate(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			HttpServletRequest request, @RequestParam Map<?, ?> commandMap, ModelMap model) throws Exception {

		String sTemplateUrl = (String) commandMap.get("templateUrl");

		LOGGER.debug("qestnrId=> {}", commandMap.get("qestnrId"));
		LOGGER.debug("qestnrTmplatId=> {}", commandMap.get("qestnrTmplatId"));
		LOGGER.debug("templateUrl=> {}", commandMap.get("templateUrl"));

		// ?ㅻЦ?쒗뵆由우젙蹂?
		model.addAttribute("QustnrTmplatManage", egovQustnrRespondInfoService.selectQustnrTmplatManage(commandMap));

		// ?ㅻЦ?뺣낫
		model.addAttribute("Comtnqestnrinfo",
				egovQustnrRespondInfoService.selectQustnrRespondInfoManageComtnqestnrinfo(commandMap));
		// 臾명빆?뺣낫
		model.addAttribute("Comtnqustnrqesitm",
				egovQustnrRespondInfoService.selectQustnrRespondInfoManageComtnqustnrqesitm(commandMap));
		// ??ぉ?뺣낫
		model.addAttribute("Comtnqustnriem",
				egovQustnrRespondInfoService.selectQustnrRespondInfoManageComtnqustnriem(commandMap));
		// ?ㅻЦ?쒗뵆由풦D ?ㅼ젙
		model.addAttribute("qestnrTmplatId",
				commandMap.get("qestnrTmplatId") == null ? "" : (String) commandMap.get("qestnrTmplatId"));
		// ?ㅻЦ吏?뺣낫ID ?ㅼ젙
		model.addAttribute("qestnrId", commandMap.get("qestnrId") == null ? "" : (String) commandMap.get("qestnrId"));

		// 媛앷??앺넻怨??듭븞
		model.addAttribute("qestnrStatistic1",
				egovQustnrRespondInfoService.selectQustnrRespondInfoManageStatistics1(commandMap));

		// 二쇨??앺넻怨??듭븞
		model.addAttribute("qestnrStatistic2",
				egovQustnrRespondInfoService.selectQustnrRespondInfoManageStatistics2(commandMap));

		// ?댁쟾 二쇱냼
		model.addAttribute("returnUrl", request.getHeader("REFERER"));

		// ?덉쟾??寃쎈줈 臾몄옄?대줈 議곗튂
		sTemplateUrl = EgovWebUtil.filePathBlackList(sTemplateUrl);

		// ?붿씠??由ъ뒪??泥댄겕
		List<EgovMap> popupWhiteList = egovQustnrRespondInfoService.selectQustnrTmplatWhiteList();
		LOGGER.debug("QustnrTmplat > WhiteList Count = {}", popupWhiteList.size());
		if (sTemplateUrl == null) {
			sTemplateUrl = "";
		}
		for (Object obj : popupWhiteList) {
			EgovMap map = (EgovMap) obj;
			LOGGER.debug("QustnrTmplat > whiteList fileUrl = " + map.get("qestnrTmplatCours"));
			if (sTemplateUrl.equals(map.get("qestnrTmplatCours"))) {
				return sTemplateUrl;
			}
		}

		LOGGER.debug("QustnrTmplat > WhiteList mismatch! Please check Admin page!");
		return "egovframework/com/cmm/egovError";
	}

	/**
	 * ?ㅻЦ議곗궗 ?꾩껜 ?듦퀎瑜?議고쉶?쒕떎.
	 * 
	 * @param searchVO
	 * @param request
	 * @param commandMap
	 * @param model
	 * @return "egovframework/com/uss/olp/qnn/EgovQustnrRespondInfoManageStatistics"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/olp/qnn/EgovQustnrRespondInfoManageStatistics.do")
	public String egovQustnrRespondInfoManageStatistics(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			HttpServletRequest request, @RequestParam Map<?, ?> commandMap, ModelMap model) throws Exception {

		String sLocationUrl = "egovframework/com/uss/olp/qnn/EgovQustnrRespondInfoManageStatistics";

		// ?ㅻЦ?뺣낫
		model.addAttribute("Comtnqestnrinfo",
				egovQustnrRespondInfoService.selectQustnrRespondInfoManageComtnqestnrinfo(commandMap));
		// 臾명빆?뺣낫
		model.addAttribute("Comtnqustnrqesitm",
				egovQustnrRespondInfoService.selectQustnrRespondInfoManageComtnqustnrqesitm(commandMap));
		// ??ぉ?뺣낫
		model.addAttribute("Comtnqustnriem",
				egovQustnrRespondInfoService.selectQustnrRespondInfoManageComtnqustnriem(commandMap));
		// ?ㅻЦ?쒗뵆由풦D ?ㅼ젙
		model.addAttribute("qestnrTmplatId",
				commandMap.get("qestnrTmplatId") == null ? "" : (String) commandMap.get("qestnrTmplatId"));
		// ?ㅻЦ吏?뺣낫ID ?ㅼ젙
		model.addAttribute("qestnrId", commandMap.get("qestnrId") == null ? "" : (String) commandMap.get("qestnrId"));

		// 媛앷??앺넻怨??듭븞
		model.addAttribute("qestnrStatistic1",
				egovQustnrRespondInfoService.selectQustnrRespondInfoManageStatistics1(commandMap));

		// 二쇨??앺넻怨??듭븞
		model.addAttribute("qestnrStatistic2",
				egovQustnrRespondInfoService.selectQustnrRespondInfoManageStatistics2(commandMap));

		// ?댁쟾 二쇱냼
		model.addAttribute("returnUrl", request.getHeader("REFERER"));

		return sLocationUrl;
	}

	/**
	 * ?ㅻЦ議곗궗(?ㅻЦ?깅줉) 紐⑸줉??議고쉶?쒕떎.
	 *
	 * @param searchVO
	 * @param request
	 * @param response
	 * @param commandMap
	 * @param model
	 * @return "egovframework/com/uss/olp/qnn/EgovQustnrRespondInfoManageList"
	 * @throws Exception
	 */
	@IncludedInfo(name = "?ㅻЦ議곗궗", order = 600, gid = 50)
	@RequestMapping(value = "/uss/olp/qnn/EgovQustnrRespondInfoManageList.do")
	public String egovQustnrRespondInfoManageList(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			HttpServletRequest request, HttpServletResponse response, @RequestParam Map<?, ?> commandMap,
			ModelMap model) throws Exception {

		/** EgovPropertyService.sample */
		searchVO.setPageUnit(propertiesService.getInt("pageUnit"));
		searchVO.setPageSize(propertiesService.getInt("pageSize"));

		/** pageing */
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(searchVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());
		paginationInfo.setPageSize(searchVO.getPageSize());

		searchVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		searchVO.setLastIndex(paginationInfo.getLastRecordIndex());
		searchVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		List<EgovMap> resultList = egovQustnrRespondInfoService.selectQustnrRespondInfoManageList(searchVO);
		model.addAttribute("resultList", resultList);

		model.addAttribute("searchKeyword",
				commandMap.get("searchKeyword") == null ? "" : (String) commandMap.get("searchKeyword"));
		model.addAttribute("searchCondition",
				commandMap.get("searchCondition") == null ? "" : (String) commandMap.get("searchCondition"));

		int totCnt = egovQustnrRespondInfoService.selectQustnrRespondInfoManageListCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/uss/olp/qnn/EgovQustnrRespondInfoManageList";
	}

	/**
	 * ?ㅻЦ議곗궗(?ㅻЦ?깅줉)瑜??깅줉?쒕떎.
	 * 
	 * @param searchVO
	 * @param commandMap
	 * @param model
	 * @return "egovframework/com/uss/olp/qnn/EgovQustnrRespondInfoManageRegist"
	 * @throws Exception
	 */
	@SuppressWarnings({ "rawtypes", "unchecked" })
	@RequestMapping(value = "/uss/olp/qnn/EgovQustnrRespondInfoManageRegist.do")
	public String egovQustnrRespondInfoManageRegist(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@RequestParam Map commandMap, HttpServletRequest request, ModelMap model) throws Exception {

		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		if (loginVO == null) {
			loginVO = new LoginVO();
		}

		String sLocationUrl = "egovframework/com/uss/olp/qnn/EgovQustnrRespondInfoManageRegist";

		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");
		LOGGER.info("cmd => {}", sCmd);

		// ?깅퀎肄붾뱶議고쉶
		ComDefaultCodeVO voComCode = new ComDefaultCodeVO();
		voComCode.setCodeId("COM014");
		List<CmmnDetailCode> listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
		model.addAttribute("comCode014", listComCode);

		// 吏곸뾽肄붾뱶議고쉶
		voComCode.setCodeId("COM034");
		listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
		model.addAttribute("comCode034", listComCode);

		if (sCmd.equals("save")) {

			// ?ㅻЦ議곗궗 泥섎━ START
			String sKey = "";
			String sVal = "";
			for (Object key : commandMap.keySet()) {

				sKey = key.toString();

				// ?ㅻЦ臾명빆?뺣낫 異붿텧
				if (sKey.length() > 6 && sKey.substring(0, 6).equals("QQESTN")) {

					// ?ㅻЦ議곗궗 ?깅줉
					// 媛앷????듭븞 泥섎━
					if (commandMap.get("TY_" + key).equals("1")) {

						String[] arrayParam = request.getParameterValues(key.toString());

						if (arrayParam.length == 1) {
							sVal = arrayParam[0];

							QustnrRespondInfoVO qustnrRespondInfoVO = new QustnrRespondInfoVO();

							qustnrRespondInfoVO.setQestnrTmplatId((String) commandMap.get("qestnrTmplatId"));
							qustnrRespondInfoVO.setQestnrId((String) commandMap.get("qestnrId"));
							qustnrRespondInfoVO.setQestnrQesitmId(sKey);
							qustnrRespondInfoVO.setQustnrIemId(sVal);

							qustnrRespondInfoVO.setRespondAnswerCn("");

							qustnrRespondInfoVO.setRespondNm((String) commandMap.get("respondNm"));
							qustnrRespondInfoVO.setEtcAnswerCn((String) commandMap.get("ETC_" + sVal));

							qustnrRespondInfoVO.setFrstRegisterId(loginVO.getUniqId());
							qustnrRespondInfoVO.setLastUpdusrId(loginVO.getUniqId());

							egovQustnrRespondInfoService.insertQustnrRespondInfo(qustnrRespondInfoVO);
						} else {
							String[] arrVal = arrayParam;
							for (int g = 0; g < arrVal.length; g++) {
								// ("QQESTN arr :" + arrVal[g]);
								QustnrRespondInfoVO qustnrRespondInfoVO = new QustnrRespondInfoVO();

								qustnrRespondInfoVO.setQestnrTmplatId((String) commandMap.get("qestnrTmplatId"));
								qustnrRespondInfoVO.setQestnrId((String) commandMap.get("qestnrId"));
								qustnrRespondInfoVO.setQestnrQesitmId(sKey);
								qustnrRespondInfoVO.setQustnrIemId(arrVal[g]);

								qustnrRespondInfoVO.setRespondAnswerCn("");

								qustnrRespondInfoVO.setRespondNm((String) commandMap.get("respondNm"));
								qustnrRespondInfoVO.setEtcAnswerCn((String) commandMap.get("ETC_" + arrVal[g]));

								qustnrRespondInfoVO.setFrstRegisterId(loginVO.getUniqId());
								qustnrRespondInfoVO.setLastUpdusrId(loginVO.getUniqId());

								egovQustnrRespondInfoService.insertQustnrRespondInfo(qustnrRespondInfoVO);
							}
						}

						// 二쇨????듭븞 泥섎━
					} else if (commandMap.get("TY_" + key).equals("2")) {
						QustnrRespondInfoVO qustnrRespondInfoVO = new QustnrRespondInfoVO();

						qustnrRespondInfoVO.setQestnrTmplatId((String) commandMap.get("qestnrTmplatId"));
						qustnrRespondInfoVO.setQestnrId((String) commandMap.get("qestnrId"));
						qustnrRespondInfoVO.setQestnrQesitmId(sKey);
						qustnrRespondInfoVO.setQustnrIemId(null);

						qustnrRespondInfoVO.setRespondAnswerCn((String) commandMap.get(sKey));

						qustnrRespondInfoVO.setRespondNm((String) commandMap.get("respondNm"));
						qustnrRespondInfoVO.setEtcAnswerCn(null);

						qustnrRespondInfoVO.setFrstRegisterId(loginVO.getUniqId());
						qustnrRespondInfoVO.setLastUpdusrId(loginVO.getUniqId());

						egovQustnrRespondInfoService.insertQustnrRespondInfo(qustnrRespondInfoVO);
					}

				}
			}

			// ?ㅻЦ?묐떟??泥섎━
			QustnrRespondManageVO qustnrRespondManageVO = new QustnrRespondManageVO();

			qustnrRespondManageVO.setQestnrId((String) commandMap.get("qestnrId"));
			qustnrRespondManageVO.setQestnrTmplatId((String) commandMap.get("qestnrTmplatId"));

			qustnrRespondManageVO.setSexdstnCode((String) commandMap.get("sexdstnCode"));
			qustnrRespondManageVO.setOccpTyCode((String) commandMap.get("occpTyCode"));
			qustnrRespondManageVO.setBrth((String) commandMap.get("brth"));
			qustnrRespondManageVO.setRespondNm((String) commandMap.get("respondNm"));

			qustnrRespondManageVO.setFrstRegisterId(loginVO.getUniqId());
			qustnrRespondManageVO.setLastUpdusrId(loginVO.getUniqId());
			egovQustnrRespondManageService.insertQustnrRespondManage(qustnrRespondManageVO);

			String resultScript = "";

			resultScript += "<script type='text/javaScript' language='javascript'>";
			resultScript += "alert(' ?ㅻЦ李몄뿬???묓빐二쇱뀛??媛먯궗?⑸땲??  ');";
			resultScript += "</script>";

			model.addAttribute("resultScript", resultScript);
			sLocationUrl = "redirect:/uss/olp/qnn/EgovQustnrRespondInfoManageList.do";
		} else {

			if (loginVO.getUniqId() != null) {
				commandMap.put("uniqId", loginVO.getUniqId());
				// ?ъ슜?먯젙蹂?
				model.addAttribute("Emplyrinfo",
						egovQustnrRespondInfoService.selectQustnrRespondInfoManageEmplyrinfo(commandMap));
			}

			// ?ㅻЦ?쒗뵆由우젙蹂?
			model.addAttribute("QustnrTmplatManage", egovQustnrRespondInfoService.selectQustnrTmplatManage(commandMap));

			// ?ㅻЦ?뺣낫
			model.addAttribute("Comtnqestnrinfo",
					egovQustnrRespondInfoService.selectQustnrRespondInfoManageComtnqestnrinfo(commandMap));
			// 臾명빆?뺣낫
			model.addAttribute("Comtnqustnrqesitm",
					egovQustnrRespondInfoService.selectQustnrRespondInfoManageComtnqustnrqesitm(commandMap));
			// ??ぉ?뺣낫
			model.addAttribute("Comtnqustnriem",
					egovQustnrRespondInfoService.selectQustnrRespondInfoManageComtnqustnriem(commandMap));
			// ?ㅻЦ?쒗뵆由풦D ?ㅼ젙
			model.addAttribute("qestnrTmplatId",
					commandMap.get("qestnrTmplatId") == null ? "" : (String) commandMap.get("qestnrTmplatId"));
			// ?ㅻЦ吏?뺣낫ID ?ㅼ젙
			model.addAttribute("qestnrId",
					commandMap.get("qestnrId") == null ? "" : (String) commandMap.get("qestnrId"));

		}

		return sLocationUrl;
	}

	/**
	 * ?묐떟?먭껐怨??ㅻЦ議곗궗) 紐⑸줉??議고쉶?쒕떎.
	 *
	 * @param searchVO
	 * @param request
	 * @param commandMap
	 * @param qustnrRespondInfoVO
	 * @param model
	 * @return "egovframework/com/uss/olp/qri/EgovQustnrRespondInfoList"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/olp/qri/EgovQustnrRespondInfoList.do")
	public String egovQustnrRespondInfoList(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			HttpServletRequest request, @RequestParam Map<?, ?> commandMap, QustnrRespondInfoVO qustnrRespondInfoVO,
			ModelMap model) throws Exception {

		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		if (loginVO == null) {
			loginVO = new LoginVO();
		}

		String sSearchMode = commandMap.get("searchMode") == null ? "" : (String) commandMap.get("searchMode");

		// ?ㅻЦ吏?뺣낫?먯꽌 ?섏뼱?ㅻ㈃ ?먮룞寃???ㅼ젙
		if (sSearchMode.equals("Y")) {
			searchVO.setSearchCondition("QESTNR_ID");
			searchVO.setSearchKeyword(qustnrRespondInfoVO.getQestnrId());
		}

		/** EgovPropertyService.sample */
		searchVO.setPageUnit(propertiesService.getInt("pageUnit"));
		searchVO.setPageSize(propertiesService.getInt("pageSize"));

		/** pageing */
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(searchVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());
		paginationInfo.setPageSize(searchVO.getPageSize());

		searchVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		searchVO.setLastIndex(paginationInfo.getLastRecordIndex());
		searchVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		List<EgovMap> resultList = egovQustnrRespondInfoService.selectQustnrRespondInfoList(searchVO);
		model.addAttribute("resultList", resultList);

		model.addAttribute("searchKeyword",
				commandMap.get("searchKeyword") == null ? "" : (String) commandMap.get("searchKeyword"));
		model.addAttribute("searchCondition",
				commandMap.get("searchCondition") == null ? "" : (String) commandMap.get("searchCondition"));

		int totCnt = egovQustnrRespondInfoService.selectQustnrRespondInfoListCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/uss/olp/qri/EgovQustnrRespondInfoList";
	}

	/**
	 * ?묐떟?먭껐怨??ㅻЦ議곗궗) 紐⑸줉???곸꽭議고쉶 議고쉶?쒕떎.
	 *
	 * @param searchVO
	 * @param qustnrRespondInfoVO
	 * @param commandMap
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/olp/qri/EgovQustnrRespondInfoDetail.do")
	public String egovQustnrRespondInfoDetail(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			QustnrRespondInfoVO qustnrRespondInfoVO, @RequestParam Map<?, ?> commandMap, ModelMap model)
			throws Exception {

		String sLocationUrl = "egovframework/com/uss/olp/qri/EgovQustnrRespondInfoDetail";

		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");

		if (sCmd.equals("del")) {
			egovQustnrRespondInfoService.deleteQustnrRespondInfo(qustnrRespondInfoVO);
			sLocationUrl = "redirect:/uss/olp/qri/EgovQustnrRespondInfoList.do";
		} else {
			List<EgovMap> resultList = egovQustnrRespondInfoService.selectQustnrRespondInfoDetail(qustnrRespondInfoVO);
			model.addAttribute("resultList", resultList);
		}

		return sLocationUrl;
	}

	/**
	 * ?묐떟?먭껐怨??ㅻЦ議곗궗)瑜??섏젙?쒕떎.
	 *
	 * @param searchVO
	 * @param commandMap
	 * @param request
	 * @param qustnrRespondInfoVO
	 * @param bindingResult
	 * @param model
	 * @return "egovframework/com/uss/olp/qri/EgovQustnrRespondInfoModify"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/olp/qri/EgovQustnrRespondInfoModify.do")
	public String qustnrRespondInfoModify(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@RequestParam Map<?, ?> commandMap, HttpServletRequest request,
			@ModelAttribute("qustnrRespondInfoVO") QustnrRespondInfoVO qustnrRespondInfoVO, BindingResult bindingResult,
			ModelMap model) throws Exception {

		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		if (loginVO == null) {
			loginVO = new LoginVO();
		}

		String sLocationUrl = "egovframework/com/uss/olp/qri/EgovQustnrRespondInfoModify";

		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");

		if (sCmd.equals("save")) {
			if (bindingResult.hasErrors()) {
				return sLocationUrl;
			}

			// ?꾩씠???ㅼ젙
			qustnrRespondInfoVO.setFrstRegisterId(loginVO.getUniqId());
			qustnrRespondInfoVO.setLastUpdusrId(loginVO.getUniqId());

			egovQustnrRespondInfoService.updateQustnrRespondInfo(qustnrRespondInfoVO);
			sLocationUrl = "redirect:/uss/olp/qri/EgovQustnrRespondInfoList.do";
		} else {
			List<EgovMap> resultList = egovQustnrRespondInfoService.selectQustnrRespondInfoDetail(qustnrRespondInfoVO);
			model.addAttribute("resultList", resultList);
		}

		return sLocationUrl;
	}

	/**
	 * ?묐떟?먭껐怨??ㅻЦ議곗궗)瑜??깅줉?쒕떎.
	 * 
	 * @param searchVO
	 * @param commandMap
	 * @param request
	 * @param qustnrRespondInfoVO
	 * @param bindingResult
	 * @param model
	 * @return "egovframework/com/uss/olp/qri/EgovQustnrRespondInfoRegist"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/olp/qri/EgovQustnrRespondInfoRegist.do")
	public String qustnrRespondInfoRegist(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@RequestParam Map<?, ?> commandMap, HttpServletRequest request,
			@ModelAttribute("qustnrRespondInfoVO") QustnrRespondInfoVO qustnrRespondInfoVO, BindingResult bindingResult,
			ModelMap model) throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		if (loginVO == null) {
			loginVO = new LoginVO();
		}

		String sLocationUrl = "egovframework/com/uss/olp/qri/EgovQustnrRespondInfoRegist";

		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");
		LOGGER.info("cmd => {}", sCmd);

		if (sCmd.equals("save")) {
			if (bindingResult.hasErrors()) {
				return sLocationUrl;
			}

			// ?꾩씠???ㅼ젙
			qustnrRespondInfoVO.setFrstRegisterId(loginVO.getUniqId());
			qustnrRespondInfoVO.setLastUpdusrId(loginVO.getUniqId());

			egovQustnrRespondInfoService.insertQustnrRespondInfo(qustnrRespondInfoVO);
			sLocationUrl = "redirect:/uss/olp/qri/EgovQustnrRespondInfoList.do";
		}

		return sLocationUrl;
	}
}
