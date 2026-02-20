package egovframework.com.sym.sym.bak.web;
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
import egovframework.com.sym.sym.bak.service.BackupOpert;
import egovframework.com.sym.sym.bak.service.BackupScheduler;
import egovframework.com.sym.sym.bak.service.EgovBackupOpertService;
import egovframework.com.sym.sym.bak.validation.BackupOpertValidator;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * 諛깆뾽?묒뾽愿由ъ뿉 ???controller ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * 諛깆뾽?묒뾽愿由ъ뿉 ????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * 諛깆뾽?묒뾽愿由ъ쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
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
public class EgovBackupOpertController {

	/** egovBackupOpertService */
	@Resource(name = "egovBackupOpertService")
	private EgovBackupOpertService egovBackupOpertService;

	/* Property ?쒕퉬??*/
    @Resource(name="propertiesService")
    private EgovPropertyService propertyService;

    /* 硫붿꽭吏 ?쒕퉬??*/
    @Resource(name="egovMessageSource")
    private EgovMessageSource egovMessageSource;

    /* backupOpert bean validator */
    @Resource(name="backupOpertValidator")
    private BackupOpertValidator backupOpertValidator;

    /** ID Generation */
	@Resource(name="egovBackupOpertIdGnrService")
	private EgovIdGnrService idgenService;

    /** cmmUseService */
    @Resource(name="EgovCmmUseService")
    private EgovCmmUseService cmmUseService;

	/** 諛깆뾽?ㅼ?以꾨윭 ?쒕퉬??*/
	@Resource(name = "backupScheduler")
	private BackupScheduler backupScheduler;

	/** logger */
	private static final Logger LOGGER = LoggerFactory.getLogger(EgovBackupOpertController.class);

	/**
	 * 諛깆뾽?묒뾽????젣?쒕떎.
	 * @return 由ы꽩URL
	 *
	 * @param backupOpert ??젣???諛깆뾽?묒뾽model
	 * @param model		ModelMap
	 * @exception Exception Exception
	 */
    @RequestMapping("/sym/sym/bak/deleteBackupOpert.do")
	public String deleteBackupOpert(BackupOpert backupOpert, ModelMap model)
	  throws Exception{
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
    	if(!isAuthenticated) {
    		model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
        	return "redirect:/uat/uia/egovLoginUsr.do";
    	}

		// 諛깆뾽?ㅼ?以꾨윭???ㅼ?以꾩젙蹂대컲??
		backupScheduler.deleteBackupOpert(backupOpert);

    	egovBackupOpertService.deleteBackupOpert(backupOpert);

    	return "forward:/sym/sym/bak/getBackupOpertList.do";
	}

	/**
	 * 諛깆뾽?묒뾽???깅줉?쒕떎.
	 * @return 由ы꽩URL
	 *
	 * @param backupOpert ?깅줉???諛깆뾽?묒뾽model
	 * @param bindingResult	BindingResult
	 * @param model			ModelMap
	 * @exception Exception Exception
	 */
    @RequestMapping("/sym/sym/bak/addBackupOpert.do")
	public String insertBackupOpert(@Valid BackupOpert backupOpert, BindingResult bindingResult, ModelMap model)
	  throws Exception{
    	LOGGER.debug(" ?몄꽌????곸젙蹂?: {}", backupOpert);

	  	// 0. Spring Security ?ъ슜?먭텒??泥섎━
	  	Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
	  	if(!isAuthenticated) {
	  		model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
	      	return "redirect:/uat/uia/egovLoginUsr.do";
	  	}

		//濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();

		backupOpertValidator.validate(backupOpert, bindingResult);
	  	if (bindingResult.hasErrors()){
	  		referenceData(model);
	  		return "egovframework/com/sym/sym/bak/EgovBackupOpertRegist";
			}else{
				backupOpert.setBackupOpertId(idgenService.getNextStringId());
				//?꾩씠???ㅼ젙
				backupOpert.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
				backupOpert.setFrstRegisterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

				egovBackupOpertService.insertBackupOpert(backupOpert);

				// 諛곗튂?ㅼ?以꾨윭???ㅼ?以꾩젙蹂대컲??
				BackupOpert target = egovBackupOpertService.selectBackupOpert(backupOpert);
				backupScheduler.insertBackupOpert(target);

		        //Exception ?놁씠 吏꾪뻾???깅줉?깃났硫붿떆吏
		        model.addAttribute("resultMsg", "success.common.insert");
			}
	  	return "forward:/sym/sym/bak/getBackupOpertList.do";
	}

	/**
	 * 諛깆뾽?묒뾽?뺣낫???곸꽭議고쉶?쒕떎.
	 * @return 由ы꽩URL
	 *
	 * @param backupOpert 議고쉶???諛깆뾽?묒뾽model
	 * @param model		ModelMap
	 * @exception Exception Exception
	 */
    @RequestMapping("/sym/sym/bak/getBackupOpert.do")
	public String selectBackupOpert(@ModelAttribute("searchVO")BackupOpert backupOpert, ModelMap model)
	  throws Exception{
    	LOGGER.debug(" 議고쉶議곌굔 : {}", backupOpert);
		BackupOpert result = egovBackupOpertService.selectBackupOpert(backupOpert);
		model.addAttribute("resultInfo", result);
		LOGGER.debug(" 寃곌낵媛?: {}", result);

		return "egovframework/com/sym/sym/bak/EgovBackupOpertDetail";
	}

	/**
	 * ?깅줉?붾㈃???꾪븳 諛깆뾽?묒뾽?뺣낫??議고쉶?쒕떎.
	 * @return 由ы꽩URL
	 *
	 * @param backupSchdul 議고쉶???諛깆뾽?묒뾽model
	 * @param model		ModelMap
	 * @exception Exception Exception
	 */
	@RequestMapping("/sym/sym/bak/getBackupOpertForRegist.do")
	public String selectBackupOpertForRegist(@ModelAttribute("searchVO")BackupOpert backupOpert, ModelMap model)
	  throws Exception{
		referenceData(model);

        model.addAttribute("backupOpert", backupOpert);

        return "egovframework/com/sym/sym/bak/EgovBackupOpertRegist";
	}

	/**
	 * ?섏젙?붾㈃???꾪븳 諛깆뾽?묒뾽?뺣낫??議고쉶?쒕떎.
	 * @return 由ы꽩URL
	 *
	 * @param backupOpert 議고쉶???諛깆뾽?묒뾽model
	 * @param model		ModelMap
	 * @exception Exception Exception
	 */
	@RequestMapping("/sym/sym/bak/getBackupOpertForUpdate.do")
	public String selectBackupOpertForUpdate(@ModelAttribute("searchVO")BackupOpert backupOpert, ModelMap model)
	  throws Exception{
		referenceData(model);

		LOGGER.debug(" 議고쉶議곌굔 : {}", backupOpert);
		BackupOpert result = egovBackupOpertService.selectBackupOpert(backupOpert);
		model.addAttribute("backupOpert", result);
		LOGGER.debug(" 寃곌낵媛?: {}", result);

        return "egovframework/com/sym/sym/bak/EgovBackupOpertUpdt";
	}

	/**
     * 諛깆뾽?묒뾽 紐⑸줉??議고쉶?쒕떎.
     *
     * @return 由ы꽩URL
     *
     * @param searchVO 紐⑸줉議고쉶議곌굔VO
     * @param model    ModelMap
     * @exception Exception Exception
     */
    @IncludedInfo(name = "諛깆뾽愿由?, order = 1150, gid = 60)
    @RequestMapping("/sym/sym/bak/getBackupOpertList.do")
    public String selectBackupOpertList(@ModelAttribute("searchVO") BackupOpert searchVO, ModelMap model)
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

        List<BackupOpert> resultList = egovBackupOpertService.selectBackupOpertList(searchVO);
        int totCnt = egovBackupOpertService.selectBackupOpertListCnt(searchVO);

        paginationInfo.setTotalRecordCount(totCnt);

        model.addAttribute("resultList", resultList);
        model.addAttribute("paginationInfo", paginationInfo);

        return "egovframework/com/sym/sym/bak/EgovBackupOpertList";
    }

	/**
	 * 諛깆뾽?묒뾽???섏젙?쒕떎.
	 * @return 由ы꽩URL
	 *
	 * @param backupOpert ?섏젙???諛깆뾽?묒뾽model
	 * @param bindingResult		BindingResult
	 * @param model				ModelMap
	 * @exception Exception Exception
	 */
	@RequestMapping("/sym/sym/bak/updateBackupOpert.do")
	public String updateBackupOpert(@Valid BackupOpert backupOpert, BindingResult bindingResult, ModelMap model)
	  throws Exception{
    	// 0. Spring Security ?ъ슜?먭텒??泥섎━
    	Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
    	if(!isAuthenticated) {
    		model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
        	return "redirect:/uat/uia/egovLoginUsr.do";
    	}
		//濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();

		backupOpertValidator.validate(backupOpert, bindingResult);
		if (bindingResult.hasErrors()) {
			referenceData(model);
			model.addAttribute("batchSchdul", backupOpert);
		    return "egovframework/com/sym/sym/bak/EgovBackupOpertUpdt";
		}

		// ?뺣낫 ?낅뜲?댄듃
		backupOpert.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
	    egovBackupOpertService.updateBackupOpert(backupOpert);

		// 諛깆뾽?ㅼ?以꾨윭???ㅼ?以꾩젙蹂대컲??
	    BackupOpert target = egovBackupOpertService.selectBackupOpert(backupOpert);
		backupScheduler.updateBackupOpert(target);


		return "forward:/sym/sym/bak/getBackupOpertList.do";
	}

	/**
	 * Reference Data 瑜??ㅼ젙?쒕떎.
	 * @param model   ?붾㈃?쯵pring Model媛앹껜
	 * @throws Exception
	 */
	private void referenceData(ModelMap model) throws Exception {
		ComDefaultCodeVO vo = new ComDefaultCodeVO();
        //?ㅽ뻾二쇨린援щ텇 肄붾뱶紐⑸줉??肄붾뱶?뺣낫濡쒕???議고쉶
        vo.setCodeId("COM047");
        List<CmmnDetailCode> executCycleList = cmmUseService.selectCmmCodeDetail(vo);
        model.addAttribute("executCycleList",      executCycleList);
        //?붿씪援щ텇肄붾뱶紐⑸줉??肄붾뱶?뺣낫濡쒕???議고쉶
        vo.setCodeId("COM074");
        List<CmmnDetailCode> executSchdulDfkSeList = cmmUseService.selectCmmCodeDetail(vo);
        model.addAttribute("executSchdulDfkSeList",      executSchdulDfkSeList);
        //?뺤텞援щ텇肄붾뱶紐⑸줉??肄붾뱶?뺣낫濡쒕???議고쉶
        vo.setCodeId("COM049");
        List<CmmnDetailCode> cmprsSeList = cmmUseService.selectCmmCodeDetail(vo);
        model.addAttribute("cmprsSeList",      cmprsSeList);

        // ?ㅽ뻾?ㅼ?以??? 遺? 珥?媛??ㅼ젙.
    	Map<String, String> executSchdulHourList =new LinkedHashMap<>();
    	for (int i = 0; i < 24; i++) {
    		if (i < 10) {
    			executSchdulHourList.put("0" + Integer.toString(i), "0" + Integer.toString(i));
    		} else {
    			executSchdulHourList.put(Integer.toString(i), Integer.toString(i));
    		}
    	}
    	model.addAttribute("executSchdulHourList",executSchdulHourList);
    	Map<String, String> executSchdulMntList =new LinkedHashMap<>();
    	for (int i = 0; i < 60; i++) {
    		if (i < 10) {
    			executSchdulMntList.put("0" + Integer.toString(i), "0" + Integer.toString(i));
    		} else {
    			executSchdulMntList.put(Integer.toString(i), Integer.toString(i));
    		}
    	}
    	model.addAttribute("executSchdulMntList",executSchdulMntList);
    	Map<String, String> executSchdulSecndList =new LinkedHashMap<>();
    	for (int i = 0; i < 60; i++) {
    		if (i < 10) {
    			executSchdulSecndList.put("0" + Integer.toString(i), "0" + Integer.toString(i));
    		} else {
    			executSchdulSecndList.put(Integer.toString(i), Integer.toString(i));
    		}
    	}
    	model.addAttribute("executSchdulSecndList",executSchdulSecndList);
	}


}