package egovframework.com.sym.sym.bak.web;
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
import egovframework.com.sym.sym.bak.service.BackupResult;
import egovframework.com.sym.sym.bak.service.EgovBackupResultService;
import jakarta.annotation.Resource;

/**
 * 諛깆뾽寃곌낵愿由ъ뿉 ???controller ?대옒??
 *
 * 諛깆뾽寃곌낵愿由ъ뿉 ????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * 諛깆뾽寃곌낵愿由ъ쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author 源吏꾨쭔
 * @since 2010.06.21
 * @version 1.0
 * @updated 21-6-2010 ?ㅼ쟾 10:27:13
 * @see
 * <pre>
 * == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??      ?섏젙??          ?섏젙?댁슜
 *  -------     --------    ---------------------------
 *  2010.06.21   源吏꾨쭔     理쒖큹 ?앹꽦
 *  2011.8.26	?뺤쭊??		IncludedInfo annotation 異붽?
 * </pre>
 */

@Controller
public class EgovBackupResultController {

	/** egovBackupResultService */
	@Resource(name = "egovBackupResultService")
	private EgovBackupResultService egovBackupResultService;

	/* Property ?쒕퉬??*/
    @Resource(name="propertiesService")
    private EgovPropertyService propertyService;

    /* 硫붿꽭吏 ?쒕퉬??*/
    @Resource(name="egovMessageSource")
    private EgovMessageSource egovMessageSource;

	/** logger */
    private static final Logger LOGGER = LoggerFactory.getLogger(EgovBackupResultController.class);

	/**
	 * 諛깆뾽寃곌낵????젣?쒕떎.
	 * @return 由ы꽩URL
	 *
	 * @param backupResult ??젣???諛깆뾽寃곌낵model
	 * @param model		ModelMap
	 * @exception Exception Exception
	 */
    @RequestMapping("/sym/sym/bak/deleteBackupResult.do")
	public String deleteBackupResult(BackupResult backupResult, ModelMap model)
	  throws Exception{
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
    	if(!isAuthenticated) {
    		model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
        	return "redirect:/uat/uia/egovLoginUsr.do";
    	}

    	egovBackupResultService.deleteBackupResult(backupResult);

    	return "forward:/sym/sym/bak/getBackupResultList.do";
	}


	/**
	 * 諛깆뾽寃곌낵?뺣낫???곸꽭議고쉶?쒕떎.
	 * @return 由ы꽩URL
	 *
	 * @param backupResult 議고쉶???諛깆뾽寃곌낵model
	 * @param model		ModelMap
	 * @exception Exception Exception
	 */
	@RequestMapping("/sym/sym/bak/getBackupResult.do")
	public String selectBackupResult(@ModelAttribute("searchVO")BackupResult backupResult, ModelMap model)
	  throws Exception{
		LOGGER.debug(" 議고쉶議곌굔 : {}", backupResult);
		BackupResult result = egovBackupResultService.selectBackupResult(backupResult);
		model.addAttribute("resultInfo", result);
		LOGGER.debug(" 寃곌낵媛?: {}", result);

		return "egovframework/com/sym/sym/bak/EgovBackupResultDetail";
	}

	/**
	 * 諛깆뾽寃곌낵 紐⑸줉??議고쉶?쒕떎.
	 * @return 由ы꽩URL
	 *
	 * @param searchVO 紐⑸줉議고쉶議곌굔VO
	 * @param model		ModelMap
	 * @exception Exception Exception
	 */
	@IncludedInfo(name="諛깆뾽寃곌낵愿由?, order = 1151 ,gid = 60)
	@RequestMapping("/sym/sym/bak/getBackupResultList.do")
	public String selectBackupResultList(@ModelAttribute("searchVO")BackupResult searchVO, ModelMap model)
	  throws Exception{
		searchVO.setPageUnit(propertyService.getInt("pageUnit"));
		searchVO.setPageSize(propertyService.getInt("pageSize"));

		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(searchVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());
		paginationInfo.setPageSize(searchVO.getPageSize());

		searchVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		searchVO.setLastIndex(paginationInfo.getLastRecordIndex());
		searchVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		List<BackupResult> resultList = egovBackupResultService.selectBackupResultList(searchVO);
		int totCnt = egovBackupResultService.selectBackupResultListCnt(searchVO);

		paginationInfo.setTotalRecordCount(totCnt);

		model.addAttribute("resultList", resultList);
		model.addAttribute("resultCnt", totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/sym/sym/bak/EgovBackupResultList";
	}


}
