package egovframework.com.sym.bat.web;

import java.util.List;

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
import org.springframework.web.bind.annotation.RequestParam;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.sym.bat.service.BatchOpert;
import egovframework.com.sym.bat.service.EgovBatchOpertService;
import egovframework.com.sym.bat.validation.BatchOpertValidator;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * 諛곗튂?묒뾽愿由ъ뿉 ???controller ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * 諛곗튂?묒뾽愿由ъ뿉 ????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * 諛곗튂?묒뾽愿由ъ쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
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
public class EgovBatchOpertController {

	/** egovBatchOpertService */
	@Resource(name = "egovBatchOpertService")
	private EgovBatchOpertService egovBatchOpertService;

	/* Property ?쒕퉬??*/
	@Resource(name = "propertiesService")
	private EgovPropertyService propertyService;

	/* 硫붿꽭吏 ?쒕퉬??*/
	@Resource(name = "egovMessageSource")
	private EgovMessageSource egovMessageSource;

	/* batchOpert bean validator */
	@Resource(name = "batchOpertValidator")
	private BatchOpertValidator batchOpertValidator;

	/** ID Generation */
	@Resource(name = "egovBatchOpertIdGnrService")
	private EgovIdGnrService idgenService;

	/** logger */
	private static final Logger LOGGER = LoggerFactory.getLogger(EgovBatchOpertController.class);

	/**
	 * 諛곗튂?묒뾽????젣?쒕떎.
	 * @return 由ы꽩URL
	 *
	 * @param batchOpert ??젣???諛곗튂?묒뾽model
	 * @param model		ModelMap
	 * @exception Exception Exception
	 */
	@RequestMapping("/sym/bat/deleteBatchOpert.do")
	public String deleteBatchOpert(BatchOpert batchOpert, ModelMap model) throws Exception {
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		egovBatchOpertService.deleteBatchOpert(batchOpert);

		return "forward:/sym/bat/getBatchOpertList.do";
	}

	/**
	 * 諛곗튂?묒뾽???깅줉?쒕떎.
	 * @return 由ы꽩URL
	 *
	 * @param batchOpert ?깅줉???諛곗튂?묒뾽model
	 * @param bindingResult	BindingResult
	 * @param model			ModelMap
	 * @exception Exception Exception
	 */
	@RequestMapping("/sym/bat/addBatchOpert.do")
	public String insertBatchOpert(@Valid @ModelAttribute BatchOpert batchOpert, BindingResult bindingResult, ModelMap model) throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		//濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		batchOpertValidator.validate(batchOpert, bindingResult);
		if (bindingResult.hasErrors()) {
			return "egovframework/com/sym/bat/EgovBatchOpertRegist";
		} else {
			batchOpert.setBatchOpertId(idgenService.getNextStringId());
			//?꾩씠???ㅼ젙
			batchOpert.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
			batchOpert.setFrstRegisterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

			egovBatchOpertService.insertBatchOpert(batchOpert);
			//Exception ?놁씠 吏꾪뻾???깅줉?깃났硫붿떆吏
			model.addAttribute("resultMsg", "success.common.insert");
		}
		return "forward:/sym/bat/getBatchOpertList.do";
	}

	/**
	 * 諛곗튂?묒뾽?뺣낫???곸꽭議고쉶?쒕떎.
	 * @return 由ы꽩URL
	 *
	 * @param batchOpert 議고쉶???諛곗튂?묒뾽model
	 * @param model		ModelMap
	 * @exception Exception Exception
	 */
	@RequestMapping("/sym/bat/getBatchOpert.do")
	public String selectBatchOpert(@ModelAttribute("searchVO") BatchOpert batchOpert, ModelMap model) throws Exception {
		LOGGER.debug(" 議고쉶議곌굔 : {}", batchOpert);
		BatchOpert result = egovBatchOpertService.selectBatchOpert(batchOpert);
		model.addAttribute("resultInfo", result);
		LOGGER.debug(" 寃곌낵媛?: {}", result);

		return "egovframework/com/sym/bat/EgovBatchOpertDetail";
	}

	/**
	 * ?깅줉?붾㈃???꾪븳 諛곗튂?묒뾽?뺣낫??議고쉶?쒕떎.
	 * @return 由ы꽩URL
	 *
	 * @param batchOpert 議고쉶???諛곗튂?묒뾽model
	 * @param model		ModelMap
	 * @exception Exception Exception
	 */
	@RequestMapping("/sym/bat/getBatchOpertForRegist.do")
	public String selectBatchOpertForRegist(@ModelAttribute("searchVO") BatchOpert batchOpert, ModelMap model) throws Exception {
		model.addAttribute("batchOpert", batchOpert);

		return "egovframework/com/sym/bat/EgovBatchOpertRegist";
	}

	/**
	 * ?섏젙?붾㈃???꾪븳 諛곗튂?묒뾽?뺣낫??議고쉶?쒕떎.
	 * @return 由ы꽩URL
	 *
	 * @param batchOpert 議고쉶???諛곗튂?묒뾽model
	 * @param model		ModelMap
	 * @exception Exception Exception
	 */
	@RequestMapping("/sym/bat/getBatchOpertForUpdate.do")
	public String selectBatchOpertForUpdate(@ModelAttribute("searchVO") BatchOpert batchOpert, ModelMap model) throws Exception {
		LOGGER.debug(" 議고쉶議곌굔 : {}", batchOpert);
		BatchOpert result = egovBatchOpertService.selectBatchOpert(batchOpert);
		model.addAttribute("batchOpert", result);
		LOGGER.debug(" 寃곌낵媛?: {}", result);

		return "egovframework/com/sym/bat/EgovBatchOpertUpdt";
	}

	/**
	 * 諛곗튂?묒뾽 紐⑸줉??議고쉶?쒕떎.
	 * @return 由ы꽩URL
	 *
	 * @param searchVO 紐⑸줉議고쉶議곌굔VO
	 * @param model		ModelMap
	 * @param popupAt	?앹뾽?щ?
	 * @exception Exception Exception
	 */
	@IncludedInfo(name = "諛곗튂?묒뾽愿由?, listUrl = "/sym/bat/getBatchOpertList.do", order = 1120, gid = 60)
	@RequestMapping("/sym/bat/getBatchOpertList.do")
	public String selectBatchOpertList(@ModelAttribute("searchVO") BatchOpert searchVO, ModelMap model, @RequestParam(value = "popupAt", required = false) String popupAt)
			throws Exception {
		searchVO.setPageUnit(propertyService.getInt("pageUnit"));
		searchVO.setPageSize(propertyService.getInt("pageSize"));

		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(searchVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());
		paginationInfo.setPageSize(searchVO.getPageSize());

		searchVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		searchVO.setLastIndex(paginationInfo.getLastRecordIndex());
		searchVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		List<BatchOpert> resultList = egovBatchOpertService.selectBatchOpertList(searchVO);
		int totCnt = egovBatchOpertService.selectBatchOpertListCnt(searchVO);

		paginationInfo.setTotalRecordCount(totCnt);

		model.addAttribute("resultList", resultList);
		model.addAttribute("resultCnt", totCnt);
		model.addAttribute("paginationInfo", paginationInfo);
		if ("Y".equals(popupAt)) {
			// Popup ?붾㈃?대㈃
			return "egovframework/com/sym/bat/EgovBatchOpertListPopup";
		} else {
			// 硫붿씤?붾㈃ ?몄텧?대㈃
			return "egovframework/com/sym/bat/EgovBatchOpertList";
		}

	}

	/**
	 * 諛곗튂?묒뾽???섏젙?쒕떎.
	 * @return 由ы꽩URL
	 *
	 * @param batchOpert ?섏젙???諛곗튂?묒뾽model
	 * @param bindingResult		BindingResult
	 * @param model				ModelMap
	 * @exception Exception Exception
	 */
	@RequestMapping("/sym/bat/updateBatchOpert.do")
	public String updateBatchOpert(@Valid @ModelAttribute BatchOpert batchOpert, BindingResult bindingResult, ModelMap model) throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
		//濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		batchOpertValidator.validate(batchOpert, bindingResult);
		if (bindingResult.hasErrors()) {
			model.addAttribute("batchOpert", batchOpert);
			return "egovframework/com/sym/bat/EgovBatchOpertUpdt";
		}

		// ?뺣낫 ?낅뜲?댄듃
		batchOpert.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
		egovBatchOpertService.updateBatchOpert(batchOpert);

		return "forward:/sym/bat/getBatchOpertList.do";

	}

	/**
	 * 諛곗튂?묒뾽 議고쉶?앹뾽???ㅽ뻾?쒕떎.
	 * @return 由ы꽩URL
	 *
	 * @param searchVO 紐⑸줉議고쉶議곌굔VO
	 * @param model		ModelMap
	 * @exception Exception Exception
	 */
	@RequestMapping("/sym/bat/getBatchOpertListPopup.do")
	public String openPopupWindow(@ModelAttribute("searchVO") BatchOpert searchVO, ModelMap model) throws Exception {
		return "egovframework/com/sym/bat/EgovBatchOpertListPopupFrame";
	}

}