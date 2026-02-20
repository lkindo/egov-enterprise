package egovframework.com.uss.ion.rsn.web;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.EgovWebUtil;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.uss.ion.rsn.service.EgovRssService;
import egovframework.com.uss.ion.rsn.service.RssInfo;
import jakarta.annotation.Resource;

/**
 * RSS?쒕퉬?ㅻ? 泥섎━?섎뒗 Controller Class 援ы쁽
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2010.06.16
 * @version 1.0
 * @see <pre>
 * &lt;&lt; 媛쒖젙?대젰(Modification Information) &gt;&gt;
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.06.16  ?λ룞??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
@Controller
public class EgovRssController {

    /** EgovMessageSource */
    @Resource(name = "egovMessageSource")
    EgovMessageSource egovMessageSource;

    /** egovOnlinePollService */
    @Resource(name = "egovRssService")
    private EgovRssService egovRssService;

    /** EgovPropertyService */
    @Resource(name = "propertiesService")
    protected EgovPropertyService propertiesService;

    /**
     * RSS?쒕퉬??紐⑸줉??議고쉶?쒕떎.
     * @param searchVO -寃?됱젙蹂닿? ?닿릿 媛앹껜
     * @param commandMap -Request Variable
     * @param -RSS?쒕퉬??媛앹껜
     * @param model -Spring ?쒓났?섎뒗 ModelMap
     * @return String -由ы꽩 URL
     * @throws Exception
     */
    @IncludedInfo(name="RSS?쒓렇?쒕퉬??, order = 822 ,gid = 50)
    @RequestMapping(value = "/uss/ion/rsn/listRssTagService.do")
    public String EgovRssTagServiceList(
            @ModelAttribute("searchVO") RssInfo searchVO,
            @RequestParam Map<?, ?> commandMap,
            RssInfo rssInfo, ModelMap model)
            throws Exception {

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

        List<?> reusltList = egovRssService.selectRssTagServiceList(searchVO);
        model.addAttribute("resultList", reusltList);

        model.addAttribute("searchKeyword", commandMap.get("searchKeyword") == null ? "" : (String) commandMap.get("searchKeyword"));
        model.addAttribute("searchCondition", commandMap.get("searchCondition") == null ? "" : (String) commandMap.get("searchCondition"));

        int totCnt = egovRssService.selectRssTagServiceListCnt(searchVO);
        paginationInfo.setTotalRecordCount(totCnt);
        model.addAttribute("paginationInfo", paginationInfo);

    	return "egovframework/com/uss/ion/rsn/EgovRssTagServiceList";

    }

    /**
     * RSS?쒕퉬??紐⑸줉???곸꽭議고쉶 議고쉶?쒕떎.
     * @param rssInfo -RSS?쒕퉬??媛앹껜
     * @param commandMap -Request Variable
     * @param model -Spring ?쒓났?섎뒗 ModelMap
     * @return String -由ы꽩 URL
     * @throws Exception
     */
    @SuppressWarnings("unchecked")
	@RequestMapping(value = "/uss/ion/rsn/detailRssTagService.do")
    public String EgovRssTagServiceDetail(
            RssInfo rssInfo,
            @RequestParam Map<?, ?> commandMap,
            ModelMap model) throws Exception {

    		String sRssId = commandMap.get("rssId") == null ? "" : (String) commandMap.get("rssId");

    		if(!sRssId.equals("")){

    			Map<String, String> mapRssInfo = (Map<String, String>) egovRssService.selectRssTagServiceDetail(rssInfo);
    			model.addAttribute("mapRssInfo",mapRssInfo);

    			mapRssInfo.put("TRGET_SVC_TABLE", EgovWebUtil.removeSQLInjectionRisk(mapRssInfo.get("TRGET_SVC_TABLE")));	// 2012.11 KISA 蹂댁븞議곗튂

    			model.addAttribute("mapRssInfoList", egovRssService.selectRssTagServiceTable(mapRssInfo));

    		}

        	return "egovframework/com/uss/ion/rsn/EgovRssTagService";
    }


}
