package egovframework.com.cop.smt.sam.web;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cop.smt.sam.service.EgovAllSchdulManageService;
import jakarta.annotation.Resource;
/**
 * ?꾩껜?쇱젙??泥섎━?섎뒗 Controller Class 援ы쁽
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2009.04.10
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.4.10  ?λ룞??         理쒖큹 ?앹꽦
 *   2011.8.26	?뺤쭊??		IncludedInfo annotation 異붽?
 *
 * </pre>
 */

@Controller
public class EgovAllSchdulManageController {

	/** EgovMessageSource */
    @Resource(name="egovMessageSource")
    EgovMessageSource egovMessageSource;

	@Resource(name = "egovAllSchdulManageService")
	private EgovAllSchdulManageService egovAllSchdulManageService;

    /** EgovPropertyService */
    @Resource(name = "propertiesService")
    protected EgovPropertyService propertiesService;

	/**
	 * ?꾩껜?쇱젙??瑜? 紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO
	 * @param commandMap
	 * @param model
	 * @return "egovframework/com/uss/olp/qrm/EgovAllSchdulManageList"
	 * @throws Exception
	 */
    @SuppressWarnings("unused")
	@IncludedInfo(name="?꾩껜?쇱젙愿由?, order = 350 ,gid = 40)
	@RequestMapping(value="/cop/smt/sam/EgovAllSchdulManageList.do")
	public String egovAllSchdulManageList(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@RequestParam Map<?, ?> commandMap, ModelMap model)
    throws Exception {

		String sSearchMode = commandMap.get("searchMode") == null ? "" : (String)commandMap.get("searchMode");

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

        List<EgovMap> resultList = egovAllSchdulManageService.selectAllSchdulManageeList(searchVO);
        model.addAttribute("resultList", resultList);

        model.addAttribute("searchKeyword", commandMap.get("searchKeyword") == null ? "" : (String)commandMap.get("searchKeyword"));
        model.addAttribute("searchCondition", commandMap.get("searchCondition") == null ? "" : (String)commandMap.get("searchCondition"));

        int totCnt = egovAllSchdulManageService.selectAllSchdulManageListCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
        model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/cop/smt/sam/EgovAllSchdulManageList";
	}

}


