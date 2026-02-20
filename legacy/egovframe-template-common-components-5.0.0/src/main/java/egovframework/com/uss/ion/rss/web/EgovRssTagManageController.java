package egovframework.com.uss.ion.rss.web;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
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
import egovframework.com.uss.ion.rss.service.EgovRssTagManageService;
import egovframework.com.uss.ion.rss.service.RssManage;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * RSS?쒓렇愿由щ? 泥섎━?섎뒗 Controller Class 援ы쁽
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2010.06.16
 * @version 1.0
 * @see <pre>
 * &lt;&lt; 媛쒖젙?대젰(Modification Information) &gt;&gt;
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.06.16  ?λ룞??         理쒖큹 ?앹꽦
 *   2011.8.26	?뺤쭊??		IncludedInfo annotation 異붽?
 *
 * </pre>
 */

@Controller
public class EgovRssTagManageController {

    /** EgovMessageSource */
    @Resource(name = "egovMessageSource")
    EgovMessageSource egovMessageSource;

    /** egovOnlinePollService */
    @Resource(name = "egovRssManageService")
    private EgovRssTagManageService egovRssManageService;

    /** EgovPropertyService */
    @Resource(name = "propertiesService")
    protected EgovPropertyService propertiesService;

    /**
     * RSS?쒓렇愿由?紐⑸줉??議고쉶?쒕떎.
     * @param commandMap -Request Variable
     * @param model -Spring ?쒓났?섎뒗 ModelMap
     * @return String -由ы꽩 URL
     * @throws Exception
     */
    @RequestMapping(value = "/uss/ion/rss/listRssTagManageTableColumnList.do")
    public String EgovRssTagManageTableColumnList(@RequestParam Map<?, ?> commandMap,
            ModelMap model) throws Exception {

    	String sDbType = egovMessageSource.getMessage("Globals.DbType");
    	String sTableName = commandMap.get("tableName") == null ? "" : (String) commandMap.get("tableName");

    	HashMap<String, String> hmParam =  new HashMap<>();

    	hmParam.put("dbType", sDbType);
    	hmParam.put("tableName", sTableName);

    	ArrayList<?> arrListResult = (ArrayList<?>)egovRssManageService.selectRssTagManageTableColumnList(hmParam);

    	model.addAttribute("ColumnList",arrListResult);
    	return "egovframework/com/uss/ion/rss/EgovRssTagManageTableColumnList";
	}

    /**
     * RSS?쒓렇愿由?紐⑸줉??議고쉶?쒕떎.
     * @param searchVO -寃?됱젙蹂닿? ?닿릿 媛앹껜
     * @param commandMap -Request Variable
     * @param rssManage -RSS?쒓렇愿由?媛앹껜
     * @param model -Spring ?쒓났?섎뒗 ModelMap
     * @return String -由ы꽩 URL
     * @throws Exception
     */
    @IncludedInfo(name="RSS?쒓렇愿由?, listUrl="/uss/ion/rss/listRssTagManage.do", order = 820 ,gid = 50)
    @RequestMapping(value = "/uss/ion/rss/listRssTagManage.do")
    public String EgovRssTagManageList(
            @ModelAttribute("searchVO") RssManage searchVO,
            @RequestParam Map<?, ?> commandMap,
            @RequestParam(value="checkList", required=false) List<String> checkList,
            RssManage rssManage, ModelMap model)
            throws Exception {

    	//蹂???ㅼ젙
    	String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");

		//Spring Security ?ъ슜?먭텒??泥섎━
	    Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
	    if (!isAuthenticated) {
	        model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
	        return "redirect:/uat/uia/egovLoginUsr.do";
	    }

        //濡쒓렇??媛앹껜 ?좎뼵
        LoginVO loginVO = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();

        //??젣 紐⑤뱶濡??ㅽ뻾??
        if(sCmd.equals("del")){

        	for(String checkData : checkList) {

        		rssManage.setFrstRegisterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
	            rssManage.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
	            rssManage.setRssId(checkData);

	            egovRssManageService.deleteRssTagManage(rssManage);
            }

	        //?섏씠吏 ?명뀓???ㅼ젙
	        searchVO.setPageIndex(1);
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

        List<?> reusltList = egovRssManageService.selectRssTagManageList(searchVO);
        model.addAttribute("resultList", reusltList);

        model.addAttribute("searchKeyword", commandMap.get("searchKeyword") == null ? "" : (String) commandMap.get("searchKeyword"));
        model.addAttribute("searchCondition", commandMap.get("searchCondition") == null ? "" : (String) commandMap.get("searchCondition"));

        int totCnt = egovRssManageService.selectRssTagManageListCnt(searchVO);
        paginationInfo.setTotalRecordCount(totCnt);
        model.addAttribute("paginationInfo", paginationInfo);

    	return "egovframework/com/uss/ion/rss/EgovRssTagManageList";

    }

    /**
     * RSS?쒓렇愿由?紐⑸줉???곸꽭議고쉶 議고쉶?쒕떎.
     * @param searchVO -寃?됱젙蹂닿? ?닿릿 媛앹껜
     * @param rssManage -RSS?쒓렇愿由?媛앹껜
     * @param commandMap -Request Variable
     * @param model -Spring ?쒓났?섎뒗 ModelMap
     * @return String -由ы꽩 URL
     * @throws Exception
     */
    @RequestMapping(value = "/uss/ion/rss/detailRssTagManage.do")
    public String EgovRssTagManageDetail(
            @ModelAttribute("searchVO") RssManage searchVO,
            RssManage rssManage, @RequestParam Map<?, ?> commandMap,
            ModelMap model) throws Exception {

        String sLocationUrl = "egovframework/com/uss/ion/rss/EgovRssTagManageDetail";

        String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");

        if (sCmd.equals("del")) {
            egovRssManageService.deleteRssTagManage(rssManage);
            sLocationUrl = "redirect:/uss/ion/rss/listRssTagManage.do";
        } else {
            //?곸꽭?뺣낫 遺덈윭?ㅺ린
        	RssManage rssManages = egovRssManageService.selectRssTagManageDetail(rssManage);
            model.addAttribute("rssManage", rssManages);
        }

        return sLocationUrl;

    }

    /**
     * RSS?쒓렇愿由щ? ?섏젙?쒕떎.
     * @param searchVO -寃?됱젙蹂닿? ?닿릿 媛앹껜
     * @param commandMap -Request Variable
     * @param rssManage -RSS?쒓렇愿由?媛앹껜
     * @param BindingResult	-Validator ?섍린?꾪븳 媛앹껜
     * @param model -Spring ?쒓났?섎뒗 ModelMap
     * @return String -由ы꽩 URL
     * @throws Exception
     */
    @RequestMapping(value = "/uss/ion/rss/updtRssTagManage.do")
    public String EgovRssTagManageModify(
            @ModelAttribute("searchVO") RssManage searchVO,
            @RequestParam Map<?, ?> commandMap,
            @Valid @ModelAttribute("rssManage") RssManage rssManage,
            BindingResult bindingResult, ModelMap model) throws Exception {

            // 0. Spring Security ?ъ슜?먭텒??泥섎━
            Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
            if (!isAuthenticated) {
                model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
                return "redirect:/uat/uia/egovLoginUsr.do";
            }

            // 濡쒓렇??媛앹껜 ?좎뼵
            LoginVO loginVO = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();

            String sLocationUrl = "egovframework/com/uss/ion/rss/EgovRssTagManageUpdt";

            String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");

            if (sCmd.equals("save")) {

                if(bindingResult.hasErrors()){
                    return sLocationUrl;
                }
                //?꾩씠???ㅼ젙
                rssManage.setFrstRegisterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
                rssManage.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
                //???
                egovRssManageService.updateRssTagManage(rssManage);
                sLocationUrl = "forward:/uss/ion/rss/listRssTagManage.do";
            } else {

            	//?뚯씠釉?紐⑸줉 遺덈윭?ㅺ린
            	model.addAttribute("trgetSvcTableList", egovRssManageService.selectRssTagManageTableList());

                //?섏젙?뺣낫 遺덈윭?ㅺ린
                RssManage rssManageVO = egovRssManageService.selectRssTagManageDetail(rssManage);
                model.addAttribute("rssManage", rssManageVO);
            }

            return sLocationUrl;
    }

    /**
     * RSS?쒓렇愿由щ? ?깅줉?쒕떎.
     * @param searchVO -寃?됱젙蹂닿? ?닿릿 媛앹껜
     * @param commandMap -Request Variable
     * @param rssManage -RSS?쒓렇愿由?媛앹껜
     * @param BindingResult	-Validator ?섍린?꾪븳 媛앹껜
     * @param model -Spring ?쒓났?섎뒗 ModelMap
     * @return String -由ы꽩 URL
     * @throws Exception
     */
    @RequestMapping(value = "/uss/ion/rss/registRssTagManage.do")
    public String EgovRssTagManageRegist(
            @ModelAttribute("searchVO") RssManage searchVO,
            @RequestParam Map<?, ?> commandMap,
            @Valid @ModelAttribute("rssManage") RssManage rssManage,
            BindingResult bindingResult, ModelMap model) throws Exception {

            // 0. Spring Security ?ъ슜?먭텒??泥섎━
            Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
            if (!isAuthenticated) {
                model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
                return "redirect:/uat/uia/egovLoginUsr.do";
            }

            // 濡쒓렇??媛앹껜 ?좎뼵
            LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

            String sLocationUrl = "egovframework/com/uss/ion/rss/EgovRssTagManageRegist";

            String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");

            if (sCmd.equals("save")) {
                if(bindingResult.hasErrors()){
                    return sLocationUrl;
                }
                //?꾩씠???ㅼ젙
                rssManage.setFrstRegisterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
                rssManage.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
                //???
                egovRssManageService.insertRssTagManage(rssManage);

                sLocationUrl = "forward:/uss/ion/rss/listRssTagManage.do";
            }else{
            	model.addAttribute("trgetSvcTableList", egovRssManageService.selectRssTagManageTableList());

            }

            return sLocationUrl;
    }


}
