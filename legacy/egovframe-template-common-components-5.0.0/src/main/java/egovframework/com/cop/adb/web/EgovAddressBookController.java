package egovframework.com.cop.adb.web;

import java.util.Map;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.cop.adb.service.AddressBook;
import egovframework.com.cop.adb.service.AddressBookUser;
import egovframework.com.cop.adb.service.AddressBookUserVO;
import egovframework.com.cop.adb.service.AddressBookVO;
import egovframework.com.cop.adb.service.EgovAddressBookService;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * 二쇱냼濡앹젙蹂대? 愿由ы븯湲??꾪븳 而⑦듃濡ㅻ윭 ?대옒??
 * @author 怨듯넻而댄룷?뚰듃? ?ㅼ꽦濡?
 * @since 2009.09.25
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.9.25   ?ㅼ꽦濡?     理쒖큹 ?앹꽦
 *   2011.8.26	 ?뺤쭊??	 IncludedInfo annotation 異붽?
 *   2016.12.13  理쒕몢??     ?대옒?ㅻ챸 蹂寃?
 *   2022.11.11  源?쒖?      ?쒗걧?댁퐫??泥섎━
 * </pre>
 */

@Controller
public class EgovAddressBookController {

    @Resource(name = "EgovAdressBookService")
    private EgovAddressBookService adbkService;

    @Resource(name = "propertiesService")
    protected EgovPropertyService propertyService;

     /**
     * 二쇱냼濡??뺣낫?????紐⑸줉??議고쉶?쒕떎.
     *
     * @param adbkVO
     * @param status
     * @param model
     * @return
     * @throws Exception
     */
    @IncludedInfo(name="二쇱냼濡앷?由?, order = 380, gid = 40)
    @RequestMapping("/cop/adb/selectAdbkList.do")
    public String selectAdressBookList(@ModelAttribute("searchVO") AddressBookVO adbkVO, ModelMap model) throws Exception {

        LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();

        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

        if(!isAuthenticated) {
            return "redirect:/uat/uia/egovLoginUsr.do";
        }

        adbkVO.setPageUnit(propertyService.getInt("pageUnit"));
        adbkVO.setPageSize(propertyService.getInt("pageSize"));

        PaginationInfo paginationInfo = new PaginationInfo();

        paginationInfo.setCurrentPageNo(adbkVO.getPageIndex());
        paginationInfo.setRecordCountPerPage(adbkVO.getPageUnit());
        paginationInfo.setPageSize(adbkVO.getPageSize());

        adbkVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
        adbkVO.setLastIndex(paginationInfo.getLastRecordIndex());
        adbkVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());
        adbkVO.setWrterId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));
        adbkVO.setTrgetOrgnztId(user == null ? "" : EgovStringUtil.isNullToString(user.getOrgnztId()));

        Map<String, Object> map = adbkService.selectAdressBookList(adbkVO);
        int totCnt = Integer.parseInt((String)map.get("resultCnt"));


        paginationInfo.setTotalRecordCount(totCnt);

        model.addAttribute("resultList", map.get("resultList"));
        model.addAttribute("resultCnt", map.get("resultCnt"));
        model.addAttribute("userId", user == null ? "" : EgovStringUtil.isNullToString(user.getId()));
        model.addAttribute("paginationInfo", paginationInfo);

        return "egovframework/com/cop/adb/EgovAddressBookList";
    }

    /**
     * 二쇱냼濡??뺣낫?????紐⑸줉??議고쉶?쒕떎.(留덉씠?섏씠吏 ?곸슜)
     *
     * @param adbkVO
     * @param status
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/cop/adb/selectAdbkMainList.do")
    public String selectAdressBookmainList(@ModelAttribute("searchVO") AddressBookVO adbkVO, ModelMap model) throws Exception {

        LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();

        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

        if(!isAuthenticated) {
            return "redirect:/uat/uia/egovLoginUsr.do";
        }

        adbkVO.setPageUnit(propertyService.getInt("pageUnit"));
        adbkVO.setPageSize(propertyService.getInt("pageSize"));

        PaginationInfo paginationInfo = new PaginationInfo();

        paginationInfo.setCurrentPageNo(adbkVO.getPageIndex());
        paginationInfo.setRecordCountPerPage(adbkVO.getPageUnit());
        paginationInfo.setPageSize(adbkVO.getPageSize());


        adbkVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
        adbkVO.setLastIndex(paginationInfo.getLastRecordIndex());
        adbkVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());
        adbkVO.setWrterId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));
        adbkVO.setTrgetOrgnztId(user == null ? "" : EgovStringUtil.isNullToString(user.getOrgnztId()));

        Map<String, Object> map = adbkService.selectAdressBookList(adbkVO);
        int totCnt = Integer.parseInt((String)map.get("resultCnt"));
        paginationInfo.setTotalRecordCount(totCnt);

        model.addAttribute("resultList", map.get("resultList"));
        model.addAttribute("resultCnt", map.get("resultCnt"));
        model.addAttribute("paginationInfo", paginationInfo);

        return "egovframework/com/cop/adb/EgovAddressBookMainList";
    }

    /**
     * 二쇱냼濡앸벑濡??붾㈃?쇰줈 ?대룞?쒕떎.
     *
     * @param adbkVO
     * @param status
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/cop/adb/addAdbkInf.do")
    public String addAdressBook(
    		@ModelAttribute("searchVO") AddressBookVO adbkVO,
    		@ModelAttribute("adbk") AddressBookVO addressBookVO,
    		ModelMap model) throws Exception {
        return "egovframework/com/cop/adb/EgovAddressBookRegist";
    }

    /**
     * 二쇱냼濡앹쓣 ??젣?쒕떎.
     *
     * @param adbkVO
     * @param status
     * @param model
     * @return
     * @throws Exception
     */
    @SuppressWarnings("unused")
	@RequestMapping("/cop/adb/deleteAdbkInf.do")
    public String deleteAdressBook(@ModelAttribute("searchVO") AddressBookVO adbkVO, ModelMap model) throws Exception {

        LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();

        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

        AddressBook adbk = adbkService.selectAdressBook(adbkVO);
        adbk.setUseAt("N");
        adbk.setLastUpdusrId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));
        adbkService.deleteAdressBook(adbk);

        return "forward:/cop/adb/selectAdbkList.do";
    }

    /**
     * 二쇱냼濡앹쓽 援ъ꽦?먯쓣 異붽??쒕떎.
     *
     * @param userVO
     * @param adbkVO
     * @param checkCnd
     * @param status
     * @param model
     * @return
     * @throws Exception
     */
    @SuppressWarnings("unused")
	@RequestMapping("/cop/adb/addUser.do")
    public String addUser(@ModelAttribute("searchVO") AddressBookVO adbkVO, @ModelAttribute("adbkUserVO") AddressBookUserVO adbkUserVO,
            @RequestParam("checkCnd")String checkCnd, ModelMap model) throws Exception {

        LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

        String[] tempId = EgovStringUtil.isNullToString(adbkUserVO.getUserId()).split(",");

        for (String element : tempId) {
            if(!element.equals("")){
                AddressBookUser adbkUser = adbkService.selectAdbkUser(element);
                adbkVO.getAdbkMan().add(adbkUser);
            }
        }

        if(checkCnd.equals("regist")) {
			return "egovframework/com/cop/adb/EgovAddressBookRegist";
		} else{
            model.addAttribute("writer" , true);
            return "egovframework/com/cop/adb/EgovAddressBookUpdt";
        }
    }

    /**
     * 二쇱냼濡앹쓽 援ъ꽦?먯쓣 ??젣?쒕떎.
     *
     * @param userVO
     * @param adbkVO
     * @param checkCnd
     * @param checkWord
     * @param status
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/cop/adb/deleteUser.do")
    public String deleteUser( @ModelAttribute("searchVO") AddressBookVO adbkVO, @ModelAttribute("adbkUserVO") AddressBookUserVO adbkUserVO,
            @RequestParam("checkWord")String checkWord, @RequestParam("checkCnd")String checkCnd, ModelMap model) throws Exception {

        @SuppressWarnings("unused")
		LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

        if(!isAuthenticated) {
            return "redirect:/uat/uia/egovLoginUsr.do";
        }

        String[] tempId = EgovStringUtil.isNullToString(adbkUserVO.getUserId()).split(",");

        String id = "";

        for (String element : tempId) {

            if(element.equals(checkWord)){
                continue;
            }

            if(!element.equals("")){
                AddressBookUser adbkUser = adbkService.selectAdbkUser(element);
                adbkVO.getAdbkMan().add(adbkUser);
            }

            id += element + ",";
        }

        adbkUserVO.setUserId(id);



        if(checkCnd.equals("regist")) {
			return "egovframework/com/cop/adb/EgovAddressBookRegist";
		} else{
            model.addAttribute("writer" , true);
            return "egovframework/com/cop/adb/EgovAddressBookUpdt";
        }
    }


    /**
     * 二쇱냼濡?援ъ꽦??李얘린 ?앹뾽?붾㈃?쇰줈 ?대룞?쒕떎.
     *
     * @param commandMap
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/cop/adb/openPopup.do")
    public String openPopupWindow(@RequestParam Map<String, Object> commandMap, ModelMap model) throws Exception {

        String requestUrl = (String)commandMap.get("requestUrl");
        String width = (String)commandMap.get("width");
        String height = (String)commandMap.get("height");

        model.addAttribute("requestUrl", requestUrl);
        model.addAttribute("width", width);
        model.addAttribute("height", height);

        return "egovframework/com/cop/adb/EgovModalPopupFrame";
  }


    /**
     * 二쇱냼濡??깅줉媛?ν븳 援ъ꽦?먯쓣 議고쉶?쒕떎.
     *
     * @param adbkUserVO
     * @param commandMap
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/cop/adb/selectManList.do")
    public String selectUserList(@ModelAttribute("searchVO") AddressBookUserVO adbkUserVO, @RequestParam Map<String, Object> commandMap, ModelMap model) throws Exception {

        if(adbkUserVO.getSearchCnd() == null || adbkUserVO.getSearchCnd().equals("")){
            adbkUserVO.setSearchCnd("0");
        }

        adbkUserVO.setPageUnit(propertyService.getInt("pageUnit"));
        adbkUserVO.setPageSize(propertyService.getInt("pageSize"));

        PaginationInfo paginationInfo = new PaginationInfo();

        paginationInfo.setCurrentPageNo(adbkUserVO.getPageIndex());
        paginationInfo.setRecordCountPerPage(adbkUserVO.getPageUnit());
        paginationInfo.setPageSize(adbkUserVO.getPageSize());

        adbkUserVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
        adbkUserVO.setLastIndex(paginationInfo.getLastRecordIndex());
        adbkUserVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

        Map<String, Object> map = null;

        int totCnt = 0;
        if(adbkUserVO.getSearchCnd().equals("0")){
            map = adbkService.selectManList(adbkUserVO);
            //2017.03.03 	議곗꽦??	?쒗걧?댁퐫??ES)-遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
            totCnt = Integer.parseInt(EgovStringUtil.nullConvertInt(map.get("resultCnt")));
            paginationInfo.setTotalRecordCount(totCnt);
        }else{
            map = adbkService.selectCardList(adbkUserVO);
            //2017.03.03 	議곗꽦??	?쒗걧?댁퐫??ES)-遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
            totCnt = Integer.parseInt(EgovStringUtil.nullConvertInt(map.get("resultCnt")));
            paginationInfo.setTotalRecordCount(totCnt);
        }

        model.addAttribute("resultList", map.get("resultList"));
        model.addAttribute("resultCnt", map.get("resultCnt"));
        model.addAttribute("paginationInfo", paginationInfo);

        return "egovframework/com/cop/adb/EgovAddressBookPopup";
    }


    /**
     * 二쇱냼濡앹긽?몄“?뚯닔???붾㈃?쇰줈 ?대룞?쒕떎.
     *
     * @param adbkUserVO
     * @param commandMap
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/cop/adb/updateAdbkInf.do")
    public String updateAdbkInf(@ModelAttribute("searchVO") AddressBookVO adbkVO, ModelMap model) throws Exception {

        LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

        if(!isAuthenticated) {
            return "redirect:/uat/uia/egovLoginUsr.do";
        }

        AddressBookVO tempAdbkVO = adbkService.selectAdressBook(adbkVO);

        AddressBookUserVO adbkUserVO = new AddressBookUserVO();

        boolean writer = false;
        String id = "";

        for (AddressBookUser element : tempAdbkVO.getAdbkMan()) {
            if( element.getNcrdId() == null){
                element.setNcrdId("");
            } else {
            	element.setNcrdId(element.getNcrdId().trim());
            }
            if( element.getEmplyrId() == null){
                element.setEmplyrId("");
            }
        }
        for (AddressBookUser element : tempAdbkVO.getAdbkMan()) {

            if(element.getEmplyrId().equals(""))
                    {
                id += element.getNcrdId() + ",";
            }else{
                id += element.getEmplyrId() + ",";
            }
        }

        adbkUserVO.setUserId(id);

        if(tempAdbkVO.getWrterId().equals(user == null ? "" : EgovStringUtil.isNullToString(user.getId()))){
            writer = true;
        }

        model.addAttribute("searchVO", tempAdbkVO);
        model.addAttribute("adbkUserVO", adbkUserVO);
        model.addAttribute("writer" , writer);
        return "egovframework/com/cop/adb/EgovAddressBookUpdt";
    }

    /**
     * 二쇱냼濡??뺣낫瑜??깅줉?쒕떎.
     *
     * @param adbkVO
     * @param adbkUserVO
     * @param status
     * @param bindingResult
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/cop/adb/RegistAdbkInf.do")
    public String registadbk(@Valid @ModelAttribute("searchVO") AddressBookVO adbkVO, @ModelAttribute("adbkUserVO") AddressBookUserVO adbkUserVO,
        BindingResult bindingResult, ModelMap model) throws Exception {

        LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

        if (bindingResult.hasErrors()) {
            return "egovframework/com/cop/adb/EgovAddressBookRegist";
        }

        if(!isAuthenticated) {
            return "redirect:/uat/uia/egovLoginUsr.do";
        }

        adbkVO.setWrterId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));
        adbkVO.setFrstRegisterId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));
        adbkVO.setLastUpdusrId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));
        // 2022.11.11 ?쒗걧?댁퐫??泥섎━
        adbkVO.setTrgetOrgnztId(user == null ? "" : EgovStringUtil.isNullToString(user.getOrgnztId()));

        String[] tempId = EgovStringUtil.isNullToString(adbkUserVO.getUserId()).split(",");

        for (String element : tempId) {
            if(!element.equals("")){
                AddressBookUser adbkUser = adbkService.selectAdbkUser(element);
                adbkVO.getAdbkMan().add(adbkUser);
            }
        }

        adbkService.insertAdressBook(adbkVO);

        return "forward:/cop/adb/selectAdbkList.do";
    }

    /**
     * 二쇱냼濡??뺣낫瑜??섏젙?쒕떎.
     *
     * @param adbkVO
     * @param adbkUserVO
     * @param status
     * @param bindingResult
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/cop/adb/UpdateAddressBook.do")
    public String updateAdressBook(@Valid @ModelAttribute("searchVO") AddressBookVO adbkVO,  @ModelAttribute("adbkUserVO") AddressBookUserVO adbkUserVO,
        BindingResult bindingResult, ModelMap model) throws Exception {

        LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

        if(!isAuthenticated) {
            return "redirect:/uat/uia/egovLoginUsr.do";
        }

        if (bindingResult.hasErrors()) {
            return "egovframework/com/cop/adb/EgovAddressBookUpdate";
        }

        String[] tempId = EgovStringUtil.isNullToString(adbkUserVO.getUserId()).split(",");

        for (String element : tempId) {
            if(!element.equals("")){
                AddressBookUser adbkUser = adbkService.selectAdbkUser(element);
                adbkVO.getAdbkMan().add(adbkUser);
            }
        }

        adbkVO.setLastUpdusrId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));
        adbkVO.setUseAt("Y");
        adbkService.updateAdressBook(adbkVO);

        return "forward:/cop/adb/selectAdbkList.do";
    }

}
