package egovframework.com.sym.mnu.bmm.web;

import java.util.Map;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.support.SessionStatus;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.sym.mnu.bmm.service.BkmkMenuManage;
import egovframework.com.sym.mnu.bmm.service.BkmkMenuManageVO;
import egovframework.com.sym.mnu.bmm.service.EgovBkmkMenuManageService;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * 諛붾줈媛湲곕찓?닿?由??뺣낫瑜?愿由ы븯湲??꾪븳 而⑦듃濡ㅻ윭 ?대옒??
 * @author 怨듯넻而댄룷?뚰듃? ?ㅼ꽦濡?
 * @since 2009.09.25
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??      ?섏젙??	?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.9.25    ?ㅼ꽦濡?	理쒖큹 ?앹꽦
 *   2011.8.26	  ?뺤쭊??	IncludedInfo annotation 異붽?
 *   2022.11.11   源?쒖?		?쒗걧?댁퐫??泥섎━
 *
 * </pre>
 */

@Controller
public class EgovBkmkMenuManageController {

    @Resource(name = "bkmkMenuManageservice")
    private EgovBkmkMenuManageService bkmkMenuManageService;

    @Resource(name = "propertiesService")
    protected EgovPropertyService propertyService;

    /**
     * 諛붾줈媛湲곕찓?닿?由??뺣낫?????紐⑸줉??議고쉶?쒕떎.
     *
     * @param BkmkMenuManageVO
     * @param status
     * @param model
     * @return
     * @throws Exception
     */
    @IncludedInfo(name="諛붾줈媛湲곕찓?닿?由?, order = 1110 ,gid = 60)
    @RequestMapping("/sym/mnu/bmm/selectBkmkMenuManageList.do")
    public String selectBkmkMenuManageList(@ModelAttribute("searchVO") BkmkMenuManageVO bkmkMenuManageVO, SessionStatus status, ModelMap model) throws Exception {

        LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();

        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

        if(!isAuthenticated) {
            return "redirect:/uat/uia/egovLoginUsr.do";
        }

        bkmkMenuManageVO.setPageUnit(propertyService.getInt("pageUnit"));
        bkmkMenuManageVO.setPageSize(propertyService.getInt("pageSize"));
        bkmkMenuManageVO.setUserId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));

        PaginationInfo paginationInfo = new PaginationInfo();

        paginationInfo.setCurrentPageNo(bkmkMenuManageVO.getPageIndex());
        paginationInfo.setRecordCountPerPage(bkmkMenuManageVO.getPageUnit());
        paginationInfo.setPageSize(bkmkMenuManageVO.getPageSize());

        bkmkMenuManageVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
        bkmkMenuManageVO.setLastIndex(paginationInfo.getLastRecordIndex());
        bkmkMenuManageVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

        bkmkMenuManageVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
        bkmkMenuManageVO.setLastIndex(paginationInfo.getLastRecordIndex());
        bkmkMenuManageVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

        Map<String, Object> map = bkmkMenuManageService.selectBkmkMenuManageList(bkmkMenuManageVO);

        int totCnt = Integer.parseInt((String)map.get("resultCnt"));

        paginationInfo.setTotalRecordCount(totCnt);

        model.addAttribute("resultList", map.get("resultList"));
        model.addAttribute("resultCnt", map.get("resultCnt"));
        model.addAttribute("uniqId", user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));
        model.addAttribute("paginationInfo", paginationInfo);

        return "egovframework/com/sym/mnu/bmm/EgovBkmkMenuManageList";

    }

    /**
     * 諛붾줈媛湲곕찓?닿?由??뺣낫瑜???젣?쒕떎.
     *
     * @param checkMenuIds
     * @param bkmkMenuManageVO
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/sym/mnu/bmm/EgovBkmkMenuManageDelete.do")
    public String deleteMenuManageList(
            @RequestParam("checkMenuIds") String checkMenuIds ,
            @ModelAttribute("bkmkMenuManageVO") BkmkMenuManageVO bkmkMenuManageVO,
            ModelMap model)
            throws Exception {

        LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();

        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

        if(!isAuthenticated) {
            //    model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
            return "redirect:/uat/uia/egovLoginUsr.do";
        }

        String [] temp = checkMenuIds.split(",");

        for (String element : temp) {
            BkmkMenuManage bkmk = new BkmkMenuManage();
            bkmk.setMenuId(element);
            bkmk.setUserId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));
            bkmkMenuManageService.deleteBkmkMenuManage(bkmk);
        }

        return "forward:/sym/mnu/bmm/selectBkmkMenuManageList.do";
    }

    /**
     * 諛붾줈媛湲곕찓?닿?由??깅줉?붾㈃?쇰줈 ?대룞?쒕떎.
     *
     * @param BkmkMenuManage
     * @param status
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/sym/mnu/bmm/addBkmkInf.do")
    public String addBkmkMenuManage( @ModelAttribute("bkmkMenuManage") BkmkMenuManage bkmkMenuManage, SessionStatus status, ModelMap model) throws Exception {

        if(!bkmkMenuManage.getMenuId().equals("")){

            bkmkMenuManage.setProgrmStrePath(bkmkMenuManageService.selectUrl(bkmkMenuManage));
        }

        return "egovframework/com/sym/mnu/bmm/EgovBkmkMenuManageRegist";
    }

    /**
     * 硫붾돱?뺣낫 紐⑸줉?앹뾽 ?붾㈃?쇰줈 ?대룞?쒕떎.
     *
     * @param commandMap
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/sym/mnu/bmm/openPopup.do")
    public String openPopupWindow(@RequestParam Map<String, Object> commandMap, ModelMap model) throws Exception {

        String requestUrl = (String)commandMap.get("requestUrl");
        requestUrl = requestUrl.replaceAll("&", "&amp;");
        String width = (String)commandMap.get("width");
        String height = (String)commandMap.get("height");
        model.addAttribute("requestUrl", requestUrl + "?" + "&amp;PopFlag=Y");
        model.addAttribute("width", width);
        model.addAttribute("height", height);

        return "egovframework/com/sym/mnu/bmm/EgovModalPopupFrame";
    }

    /**
     * 硫붾돱?뺣낫 紐⑸줉??議고쉶?쒕떎.
     *
     * @param BkmkMenuManageVO
     * @param commandMap
     * @param model
     * @return
     * @throws Exception
     */
    @SuppressWarnings("unused")
	@RequestMapping("/sym/mnu/bmm/selectMenuList.do")
    public String selectMenuList(@ModelAttribute("bkmkMenuManageVO") BkmkMenuManageVO bkmkMenuManageVO, @RequestParam Map<String, Object> commandMap, ModelMap model) throws Exception {
        String popFlag = (String)commandMap.get("PopFlag");

        LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();

        bkmkMenuManageVO.setPageUnit(propertyService.getInt("pageUnit"));
        bkmkMenuManageVO.setPageSize(propertyService.getInt("pageSize"));

        PaginationInfo paginationInfo = new PaginationInfo();

        paginationInfo.setCurrentPageNo(bkmkMenuManageVO.getPageIndex());
        paginationInfo.setRecordCountPerPage(bkmkMenuManageVO.getPageUnit());
        paginationInfo.setPageSize(bkmkMenuManageVO.getPageSize());


        bkmkMenuManageVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
        bkmkMenuManageVO.setLastIndex(paginationInfo.getLastRecordIndex());
        bkmkMenuManageVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

        bkmkMenuManageVO.setUserId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));

        Map<String, Object> map = bkmkMenuManageService.selectMenuList(bkmkMenuManageVO);

        int totCnt = Integer.parseInt((String)map.get("resultCnt"));
        paginationInfo.setTotalRecordCount(totCnt);

        model.addAttribute("resultList", map.get("resultList"));
        model.addAttribute("resultCnt", map.get("resultCnt"));
        model.addAttribute("paginationInfo", paginationInfo);

        return "egovframework/com/sym/mnu/bmm/EgovBkmkMenuPopup";
    }

    /**
     * 諛붾줈媛湲곕찓?닿?由??뺣낫瑜??깅줉?쒕떎.
     *
     * @param BkmkMenuManage
     * @param bindingResult
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/sym/mnu/bmm/registBkmkInf.do")
    public String registBkmkInf(@Valid @ModelAttribute("bkmkMenuManage") BkmkMenuManage bkmkMenuManage,
            BindingResult bindingResult, SessionStatus status, ModelMap model) throws Exception {

        LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

        if(!isAuthenticated) {
            return "redirect:/uat/uia/egovLoginUsr.do";
        }

        if (bindingResult.hasErrors()) {
            return "egovframework/com/sym/mnu/bmm/EgovBkmkMenuManageRegist";
        }

        bkmkMenuManage.setUserId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));

        // 2022.11.11 ?쒗걧?댁퐫??泥섎━
        bkmkMenuManageService.insertBkmkMenuManage(bkmkMenuManage);

        return "forward:/sym/mnu/bmm/selectBkmkMenuManageList.do";
    }

    /**
     * 諛붾줈媛湲곕찓?닿?由?誘몃━蹂닿린 ?붾㈃?쇰줈 ?대룞?쒕떎.
     *
     * @param BkmkMenuManageVO
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping(value="/sym/mnu/bmm/previewBkmkInf.do")
    public String previewBkmkInf(@ModelAttribute("searchVO") BkmkMenuManageVO bkmkMenuManageVO,ModelMap model)
            throws Exception {
        String resultMsg    = "";
        // 0. Spring Security ?ъ슜?먭텒??泥섎━
        LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

        if(!isAuthenticated) {
               return "redirect:/uat/uia/egovLoginUsr.do";
        }

        bkmkMenuManageVO.setFirstIndex(0);
        bkmkMenuManageVO.setLastIndex(10);
        bkmkMenuManageVO.setRecordCountPerPage(10);

        bkmkMenuManageVO.setUserId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));

        Map<String, Object> map = bkmkMenuManageService.selectBkmkMenuManageList(bkmkMenuManageVO);

        model.addAttribute("list_menulist",  map.get("resultList"));
        model.addAttribute("resultMsg", resultMsg);

        return  "egovframework/com/sym/mnu/bmm/EgovBookMarkMenuPopup";
    }
}
