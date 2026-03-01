package egovframework.com.sym.bat.web;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.service.CmmnDetailCode;
import egovframework.com.cmm.service.EgovCmmUseService;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.sym.bat.service.BatchSchdul;
import egovframework.com.sym.bat.service.BatchScheduler;
import egovframework.com.sym.bat.service.EgovBatchSchdulService;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * 諛곗튂?ㅼ?以꾧?由ъ뿉 ???controller ?대옒??
 *
 * @author 源吏꾨쭔
 * @since 2010.06.17
 * @version 1.0
 * @updated 17-6-2010 ?ㅼ쟾 10:27:13
 * @see
 * <pre>
 * == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??      ?섏젙??          ?섏젙?댁슜
 *  -------     --------    ---------------------------
 *  2010.06.17   源吏꾨쭔     理쒖큹 ?앹꽦
 *  2011.8.26	?뺤쭊??		IncludedInfo annotation 異붽?
 * </pre>
 */

@Controller
public class EgovBatchSchdulController {

	/** egovBatchSchdulService */
	@Resource(name = "egovBatchSchdulService")
	private EgovBatchSchdulService egovBatchSchdulService;

	/* Property ?쒕퉬??*/
	@Resource(name = "propertiesService")
	private EgovPropertyService propertyService;

	/* 硫붿꽭吏 ?쒕퉬??*/
	@Resource(name = "egovMessageSource")
	private EgovMessageSource egovMessageSource;

	/** ID Generation */
	@Resource(name = "egovBatchSchdulIdGnrService")
	private EgovIdGnrService idgenService;

	/** cmmUseService */
	@Resource(name = "EgovCmmUseService")
	private EgovCmmUseService cmmUseService;

	/** 諛곗튂?ㅼ?以꾨윭 ?쒕퉬??*/
	@Resource(name = "batchScheduler")
	private BatchScheduler batchScheduler;

	/** logger */
	private static final Logger LOGGER = LoggerFactory.getLogger(EgovBatchSchdulController.class);

	/**
	 * 諛곗튂?ㅼ?以꾩쓣 ??젣?쒕떎.
	 * @return 由ы꽩URL
	 *
	 * @param batchSchdul ??젣???諛곗튂?ㅼ?以꼖odel
	 * @param model		ModelMap
	 * @exception Exception Exception
	 */
	@RequestMapping("/sym/bat/deleteBatchSchdul.do")
	public String deleteBatchSchdul(BatchSchdul batchSchdul, ModelMap model) throws Exception {
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// 諛곗튂?ㅼ?以꾨윭???ㅼ?以꾩젙蹂대컲??
		batchScheduler.deleteBatchSchdul(batchSchdul);

		egovBatchSchdulService.deleteBatchSchdul(batchSchdul);

		return "forward:/sym/bat/getBatchSchdulList.do";
	}

	/**
	 * 諛곗튂?ㅼ?以꾩쓣 ?깅줉?쒕떎.
	 * @return 由ы꽩URL
	 *
	 * @param batchSchdul ?깅줉???諛곗튂?ㅼ?以꼖odel
	 * @param bindingResult	BindingResult
	 * @param model			ModelMap
	 * @exception Exception Exception
	 */
	@RequestMapping("/sym/bat/addBatchSchdul.do")
	public String insertBatchSchdul(@Valid @ModelAttribute BatchSchdul batchSchdul, BindingResult bindingResult, ModelMap model) throws Exception {
		LOGGER.debug(" ?몄꽌????곸젙蹂?: {}", batchSchdul);

		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		//濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		if (bindingResult.hasErrors()) {
			referenceData(model);
			return "egovframework/com/sym/bat/EgovBatchSchdulRegist";
		} else {
			batchSchdul.setBatchSchdulId(idgenService.getNextStringId());
			//?꾩씠???ㅼ젙
			batchSchdul.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
			batchSchdul.setFrstRegisterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

			egovBatchSchdulService.insertBatchSchdul(batchSchdul);

			// 諛곗튂?ㅼ?以꾨윭???ㅼ?以꾩젙蹂대컲??
			BatchSchdul target = egovBatchSchdulService.selectBatchSchdul(batchSchdul);
			batchScheduler.insertBatchSchdul(target);

			//Exception ?놁씠 吏꾪뻾???깅줉?깃났硫붿떆吏
			model.addAttribute("resultMsg", "success.common.insert");
		}
		return "forward:/sym/bat/getBatchSchdulList.do";
	}

	/**
	 * 諛곗튂?ㅼ?以꾩젙蹂댁쓣 ?곸꽭議고쉶?쒕떎.
	 * @return 由ы꽩URL
	 *
	 * @param batchSchdul 議고쉶???諛곗튂?ㅼ?以꼖odel
	 * @param model		ModelMap
	 * @exception Exception Exception
	 */
	@RequestMapping("/sym/bat/getBatchSchdul.do")
	public String selectBatchSchdul(@ModelAttribute("searchVO") BatchSchdul batchSchdul, ModelMap model) throws Exception {
		LOGGER.debug(" 議고쉶議곌굔 : {}", batchSchdul);
		BatchSchdul result = egovBatchSchdulService.selectBatchSchdul(batchSchdul);
		model.addAttribute("resultInfo", result);
		LOGGER.debug(" 寃곌낵媛?: {}", result);

		return "egovframework/com/sym/bat/EgovBatchSchdulDetail";
	}

	/**
	 * ?깅줉?붾㈃???꾪븳 諛곗튂?ㅼ?以꾩젙蹂댁쓣 議고쉶?쒕떎.
	 * @return 由ы꽩URL
	 *
	 * @param batchSchdul 議고쉶???諛곗튂?ㅼ?以꼖odel
	 * @param model		ModelMap
	 * @exception Exception Exception
	 */
	@RequestMapping("/sym/bat/getBatchSchdulForRegist.do")
	public String selectBatchSchdulForRegist(@ModelAttribute("searchVO") BatchSchdul batchSchdul, ModelMap model) throws Exception {
		referenceData(model);

		model.addAttribute("batchSchdul", batchSchdul);

		return "egovframework/com/sym/bat/EgovBatchSchdulRegist";
	}

	/**
	 * ?섏젙?붾㈃???꾪븳 諛곗튂?ㅼ?以꾩젙蹂댁쓣 議고쉶?쒕떎.
	 * @return 由ы꽩URL
	 *
	 * @param batchSchdul 議고쉶???諛곗튂?ㅼ?以꼖odel
	 * @param model		ModelMap
	 * @exception Exception Exception
	 */
	@RequestMapping("/sym/bat/getBatchSchdulForUpdate.do")
	public String selectBatchSchdulForUpdate(@ModelAttribute("searchVO") BatchSchdul batchSchdul, ModelMap model) throws Exception {
		referenceData(model);

		LOGGER.debug(" 議고쉶議곌굔 : {}", batchSchdul);
		BatchSchdul result = egovBatchSchdulService.selectBatchSchdul(batchSchdul);
		model.addAttribute("batchSchdul", result);
		LOGGER.debug(" 寃곌낵媛?: {}", result);

		return "egovframework/com/sym/bat/EgovBatchSchdulUpdt";
	}

	/**
	 * Reference Data 瑜??ㅼ젙?쒕떎.
	 * @param model   ?붾㈃?쯵pring Model媛앹껜
	 * @throws Exception
	 */
	private void referenceData(ModelMap model) throws Exception {
		ComDefaultCodeVO vo = new ComDefaultCodeVO();
		//DBMS醫낅쪟肄붾뱶紐⑸줉??肄붾뱶?뺣낫濡쒕???議고쉶
		vo.setCodeId("COM047");
		List<CmmnDetailCode> executCycleList = cmmUseService.selectCmmCodeDetail(vo);
		model.addAttribute("executCycleList", executCycleList);
		//?붿씪援щ텇肄붾뱶紐⑸줉??肄붾뱶?뺣낫濡쒕???議고쉶
		vo.setCodeId("COM074");
		List<CmmnDetailCode> executSchdulDfkSeList = cmmUseService.selectCmmCodeDetail(vo);
		model.addAttribute("executSchdulDfkSeList", executSchdulDfkSeList);

		// ?ㅽ뻾?ㅼ?以??? 遺? 珥?媛??ㅼ젙.
		Map<String, String> executSchdulHourList = new LinkedHashMap<>();
		for (int i = 0; i < 24; i++) {
			if (i < 10) {
				executSchdulHourList.put("0" + Integer.toString(i), "0" + Integer.toString(i));
			} else {
				executSchdulHourList.put(Integer.toString(i), Integer.toString(i));
			}
		}
		model.addAttribute("executSchdulHourList", executSchdulHourList);
		Map<String, String> executSchdulMntList = new LinkedHashMap<>();
		for (int i = 0; i < 60; i++) {
			if (i < 10) {
				executSchdulMntList.put("0" + Integer.toString(i), "0" + Integer.toString(i));
			} else {
				executSchdulMntList.put(Integer.toString(i), Integer.toString(i));
			}
		}
		model.addAttribute("executSchdulMntList", executSchdulMntList);
		Map<String, String> executSchdulSecndList = new LinkedHashMap<>();
		for (int i = 0; i < 60; i++) {
			if (i < 10) {
				executSchdulSecndList.put("0" + Integer.toString(i), "0" + Integer.toString(i));
			} else {
				executSchdulSecndList.put(Integer.toString(i), Integer.toString(i));
			}
		}
		model.addAttribute("executSchdulSecndList", executSchdulSecndList);
	}

	/**
	 * 諛곗튂?ㅼ?以?紐⑸줉??議고쉶?쒕떎.
	 * @return 由ы꽩URL
	 *
	 * @param searchVO 紐⑸줉議고쉶議곌굔VO
	 * @param model		ModelMap
	 * @exception Exception Exception
	 */
	@IncludedInfo(name = "?ㅼ?以꾩쿂由?, listUrl = "/sym/bat/getBatchSchdulList.do", order = 1140, gid = 60)
	@RequestMapping("/sym/bat/getBatchSchdulList.do")
	public String selectBatchSchdulList(@ModelAttribute("searchVO") BatchSchdul searchVO, ModelMap model) throws Exception {
		searchVO.setPageUnit(propertyService.getInt("pageUnit"));
		searchVO.setPageSize(propertyService.getInt("pageSize"));

		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(searchVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());
		paginationInfo.setPageSize(searchVO.getPageSize());

		searchVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		searchVO.setLastIndex(paginationInfo.getLastRecordIndex());
		searchVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		List<BatchSchdul> resultList = egovBatchSchdulService.selectBatchSchdulList(searchVO);
		int totCnt = egovBatchSchdulService.selectBatchSchdulListCnt(searchVO);

		paginationInfo.setTotalRecordCount(totCnt);

		model.addAttribute("resultList", resultList);
		model.addAttribute("resultCnt", totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/sym/bat/EgovBatchSchdulList";
	}

	/**
	 * 諛곗튂?ㅼ?以꾩쓣 ?섏젙?쒕떎.
	 * @return 由ы꽩URL
	 *
	 * @param batchSchdul ?섏젙???諛곗튂?ㅼ?以꼖odel
	 * @param bindingResult		BindingResult
	 * @param model				ModelMap
	 * @exception Exception Exception
	 */
	@RequestMapping("/sym/bat/updateBatchSchdul.do")
	public String updateBatchSchdul(@Valid @ModelAttribute BatchSchdul batchSchdul, BindingResult bindingResult, ModelMap model) throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
		//濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		if (bindingResult.hasErrors()) {
			referenceData(model);
			model.addAttribute("batchSchdul", batchSchdul);
			return "egovframework/com/sym/bat/EgovBatchSchdulUpdt";
		}

		// ?뺣낫 ?낅뜲?댄듃
		batchSchdul.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
		egovBatchSchdulService.updateBatchSchdul(batchSchdul);

		// 諛곗튂?ㅼ?以꾨윭???ㅼ?以꾩젙蹂대컲??
		BatchSchdul target = egovBatchSchdulService.selectBatchSchdul(batchSchdul);
		batchScheduler.updateBatchSchdul(target);

		return "forward:/sym/bat/getBatchSchdulList.do";

	}

}
