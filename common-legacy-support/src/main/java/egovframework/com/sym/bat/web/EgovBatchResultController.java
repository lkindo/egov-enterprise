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
 * ??? ????controller ?????
 *
 * @author ?
 * @since 2010.06.17
 * @version 1.0
 * @updated 17-6-2010 ?? 10:27:13
 * @see
 * 
 *      <pre>
 * == ?????Modification Information) ==
 *
 *   ????      ????          ????
 *  -------     --------    ---------------------------
 *  2010.06.17   ?    ????
 *  2011.8.26	???		IncludedInfo annotation ??
 *      </pre>
 **/

@Controller
public class EgovBatchResultController {

    /** egovBatchResultService **/
    @Resource(name = "egovBatchResultService")
    private EgovBatchResultService egovBatchResultService;

    /* Property ????*/
    @Resource(name = "propertiesService")
    private EgovPropertyService propertyService;

    /* ?? ????*/
    @Resource(name = "egovMessageSource")
    private EgovMessageSource egovMessageSource;

    /** logger **/
    private static final Logger LOGGER = LoggerFactory.getLogger(EgovBatchResultController.class);

    /**
     * ????????.
     * 
     * @return ?URL
     *
     * @param batchResult ????????model
     * @param model       ModelMap
     * @exception Exception Exception
     **/
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
     * ????????.
     * 
     * @return ?URL
     *
     * @param batchResult ??????model
     * @param model       ModelMap
     * @exception Exception Exception
     **/
    @RequestMapping("/sym/bat/getBatchResult.do")
    public String selectBatchResult(@ModelAttribute("searchVO") BatchResult batchResult, ModelMap model)
            throws Exception {
        LOGGER.debug("          ?   ?          : {}", batchResult);
        BatchResult result = egovBatchResultService.selectBatchResult(batchResult);
        model.addAttribute("resultInfo", result);
        LOGGER.debug("          ?      ?: {}", result);

        return "egovframework/com/sym/bat/EgovBatchResultDetail";
    }

    /**
     * ? ?????.
     * 
     * @return ?URL
     *
     * @param searchVO ?O
     * @param model    ModelMap
     * @exception Exception Exception
     **/
    @IncludedInfo(name = "Name", listUrl = "", order = 1, gid = 50)
    @RequestMapping("/sym/bat/getBatchResultList.do")
    public String selectBatchResultList(@ModelAttribute("searchVO") BatchResult searchVO, ModelMap model)
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

        List<BatchResult> resultList = egovBatchResultService.selectBatchResultList(searchVO);
        int totCnt = egovBatchResultService.selectBatchResultListCnt(searchVO);

        paginationInfo.setTotalRecordCount(totCnt);

        model.addAttribute("resultList", resultList);
        model.addAttribute("resultCnt", totCnt);
        model.addAttribute("paginationInfo", paginationInfo);

        return "egovframework/com/sym/bat/EgovBatchResultList";
    }

}
