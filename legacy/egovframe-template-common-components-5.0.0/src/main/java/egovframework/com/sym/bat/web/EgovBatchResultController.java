package egovframework.com.sym.bat.web;

import java.util.List;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.sym.bat.service.BatchResult;
import egovframework.com.sym.bat.service.EgovBatchResultService;
import jakarta.annotation.Resource;

/**
 * 諛곗튂寃곌낵愿由ъ뿉 ???controller ?대옒??
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
public class EgovBatchResultController {

	/** egovBatchResultService */
	@Resource(name = "egovBatchResultService")
	private EgovBatchResultService egovBatchResultService;

	/* Property ?쒕퉬??*/
	@Resource(name = "propertiesService")
	private EgovPropertyService propertyService;

	/*  硫붿꽭吏 ?쒕퉬??*/
	@Resource(name = "egovMessageSource")
	private EgovMessageSource egovMessageSource;

	/** logger */
	private static final Logger LOGGER = LoggerFactory.getLogger(EgovBatchResultController.class);

	/**
	 * 諛곗튂寃곌낵????젣?쒕떎.
	 * @return 由ы꽩URL
	 *
	 * @param batchResult ??젣???諛곗튂寃곌낵model
	 * @param model		ModelMap
	 * @exception Exception Exception
	 */
	@RequestMapping("/sym/bat/deleteBatchResult.do")
	public String deleteBatchResult(BatchResult batchResult, ModelMap model) throws Exception {
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		egovBatchResultService.deleteBatchResult(batchResult);

		return "forward:/sym/bat/getBatchResultList.do";
	}

	/**
	 * 諛곗튂寃곌낵?뺣낫???곸꽭議고쉶?쒕떎.
	 * @return 由ы꽩URL
	 *
	 * @param batchResult 議고쉶???諛곗튂寃곌낵model
	 * @param model		ModelMap
	 * @exception Exception Exception
	 */
	@RequestMapping("/sym/bat/getBatchResult.do")
	public String selectBatchResult(@ModelAttribute("searchVO") BatchResult batchResult, ModelMap model) throws Exception {
		LOGGER.debug(" 議고쉶議곌굔 : {}", batchResult);
		BatchResult result = egovBatchResultService.selectBatchResult(batchResult);
		model.addAttribute("resultInfo", result);
		LOGGER.debug(" 寃곌낵媛?: {}", result);

		return "egovframework/com/sym/bat/EgovBatchResultDetail";
	}

	/**
	 * 諛곗튂寃곌낵 紐⑸줉??議고쉶?쒕떎.
	 * @return 由ы꽩URL
	 *
	 * @param searchVO 紐⑸줉議고쉶議곌굔VO
	 * @param model		ModelMap
	 * @exception Exception Exception
	 */
	@IncludedInfo(name = "諛곗튂寃곌낵愿由?, listUrl = "/sym/bat/getBatchResultList.do", order = 1130, gid = 60)
	@RequestMapping("/sym/bat/getBatchResultList.do")
	public String selectBatchResultList(@ModelAttribute("searchVO") BatchResult searchVO, ModelMap model) throws Exception {
		searchVO.setPageUnit(propertyService.getInt("pageUnit"));
		searchVO.setPageSize(propertyService.getInt("pageSize"));

		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(searchVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());
		paginationInfo.setPageSize(searchVO.getPageSize());

		searchVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		searchVO.setLastIndex(paginationInfo.getLastRecordIndex());
		searchVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		List<BatchResult> resultList = egovBatchResultService.selectBatchResultList(searchVO);
		int totCnt = egovBatchResultService.selectBatchResultListCnt(searchVO);

		paginationInfo.setTotalRecordCount(totCnt);

		model.addAttribute("resultList", resultList);
		model.addAttribute("resultCnt", totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/sym/bat/EgovBatchResultList";
	}

}