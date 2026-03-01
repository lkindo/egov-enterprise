package egovframework.com.dam.mgm.web;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

import org.apache.commons.validator.GenericValidator;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.dam.mgm.service.EgovKnoManagementService;
import egovframework.com.dam.mgm.service.KnoManagement;
import egovframework.com.dam.mgm.service.KnoManagementVO;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * 媛쒖슂
 * - 吏?앹젙蹂댁뿉 ???Controller ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - 吏?앹젙蹂댁뿉 ????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * - 吏?앹젙蹂댁쓽 議고쉶 湲곕뒫? 紐⑸줉 議고쉶, ?곸꽭 議고쉶濡?援щ텇?쒕떎.
 *
 * @author 諛뺤쥌??
 * @version 1.0
 * @created 12-8-2010 ?ㅽ썑 3:44:38
 *  <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------        --------    ---------------------------
 *   2010.8.12  諛뺤쥌??         理쒖큹 ?앹꽦
 *   2011.8.26  ?뺤쭊??         IncludedInfo annotation 異붽?
 *
 * </pre>
 */
@Controller
public class EgovKnoManagementController {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovKnoManagementController.class);
	
	@Resource(name = "KnoManagementService")
    private EgovKnoManagementService knoManagementService;

    /** EgovPropertyService */
    @Resource(name = "propertiesService")
    protected EgovPropertyService propertiesService;

	/** EgovMessageSource */
    @Resource(name="egovMessageSource")
    EgovMessageSource egovMessageSource;

    /**
	 * ?깅줉??吏?앹젙蹂?紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO 吏?앹젙蹂?議고쉶 議곌굔 VO
	 * @param model 酉곗뿉 ?꾨떖??紐⑤뜽
	 * @return 紐⑸줉 ?붾㈃ 寃쎈줈
	 * @throws Exception 議고쉶 議곌굔???좏슚?섏? ?딄굅???곗씠???묎렐 以??ㅻ쪟媛 諛쒖깮??寃쎌슦
	 */
	@IncludedInfo(name = "吏?앹젙蹂닿?由?, listUrl = "/dam/mgm/EgovComDamManagementList.do", order = 1280, gid = 80)
	@RequestMapping(value="/dam/mgm/EgovComDamManagementList.do")
    public String selectKnoManagementList(@ModelAttribute("searchVO") KnoManagementVO searchVO, ModelMap model) throws Exception {

		/** EgovPropertyService.mapMaterial */
		searchVO.setPageUnit(propertiesService.getInt("pageUnit"));
		searchVO.setPageSize(propertiesService.getInt("pageSize"));

		/** paging */
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(searchVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());
		paginationInfo.setPageSize(searchVO.getPageSize());

		searchVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		searchVO.setLastIndex(paginationInfo.getLastRecordIndex());
		searchVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		List<EgovMap> resultList = knoManagementService.selectKnoManagementList(searchVO);
		model.addAttribute("resultList", resultList);

		int totCnt = knoManagementService.selectKnoManagementTotCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/dam/mgm/EgovComDamManagementList";
	}

	/**
	 * 吏?앹젙蹂??곸꽭 ?뺣낫瑜?議고쉶?쒕떎.
	 * @param knoManagement 議고쉶??吏?앹젙蹂??앸퀎 ?뺣낫媛 ?닿릿 紐⑤뜽
	 * @param model 酉곗뿉 ?꾨떖??紐⑤뜽
	 * @return ?곸꽭 ?붾㈃ 寃쎈줈
	 * @throws Exception ?앸퀎?먭? ?녾굅???대떦 吏?앹젙蹂닿? 議댁옱?섏? ?딄굅???곗씠???묎렐 ?ㅻ쪟媛 諛쒖깮??寃쎌슦
	 */
	@RequestMapping(value="/dam/mgm/EgovComDamManagement.do")
	public String selectKnoManagement(KnoManagement knoManagement, ModelMap model) throws Exception {

		//Spring Security ?ъ슜?먭텒??泥섎━
	    Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
	    if (!isAuthenticated) {
	        model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
	        return "redirect:/uat/uia/egovLoginUsr.do";
	    }
        // 濡쒓렇??媛앹껜 ?좎뼵
	    LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

	    knoManagement.setEmplyrId(loginVO.getUniqId());

		KnoManagement result = knoManagementService.selectKnoManagement(knoManagement);
		model.addAttribute("result", result);
		return "egovframework/com/dam/mgm/EgovComDamManagementDetail";
	}

	/**
	 * 吏?앹젙蹂??섏젙 ?붾㈃???쒖떆?쒕떎.
	 * @param knoManagement ?섏젙 ???吏?앹젙蹂??앸퀎 ?뺣낫媛 ?닿릿 紐⑤뜽
	 * @param model 酉곗뿉 ?꾨떖??紐⑤뜽
	 * @return ?섏젙 ?붾㈃ 寃쎈줈
	 * @throws Exception 議고쉶 以??ㅻ쪟媛 諛쒖깮??寃쎌슦
	 */
	@GetMapping(value="/dam/mgm/EgovComDamManagementModify.do")
	public String updateKnoManagementView(KnoManagement knoManagement, ModelMap model) throws Exception {

		//Spring Security ?ъ슜?먭텒??泥섎━
	    Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
	    if (!isAuthenticated) {
	        model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
	        return "redirect:/uat/uia/egovLoginUsr.do";
	    }

		//濡쒓렇??媛앹껜 ?좎뼵
	    LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
        if (loginVO != null) {
            knoManagement.setEmplyrId(loginVO.getUniqId());
        }
        updateKnoManagementViewInit(knoManagement, model);

		return "egovframework/com/dam/mgm/EgovComDamManagementModify";
	}

	/**
     * 吏?앹젙蹂??섏젙 ?붾㈃ 珥덇린 ?곗씠?곕? ?ㅼ젙?쒕떎.
     * @param knoManagement ?섏젙 ???吏?앹젙蹂??앸퀎 ?뺣낫媛 ?닿릿 紐⑤뜽
     * @param model 酉곗뿉 ?꾨떖??紐⑤뜽
     * @throws Exception ?곗씠??議고쉶 以??ㅻ쪟媛 諛쒖깮??寃쎌슦
     */
    private void updateKnoManagementViewInit(KnoManagement knoManagement, ModelMap model) throws Exception {
        model.addAttribute("resultKnoManagement", knoManagementService.selectKnoManagement(knoManagement));

        LOGGER.debug("knoManagement>{}", knoManagement);
        LOGGER.debug("knoManagement>{}", model.get("knoManagement"));
    }

	/**
    * 湲??깅줉??吏?앹젙蹂대? ?섏젙?쒕떎.
    * @param knoManagement ?섏젙??吏?앹젙蹂?紐⑤뜽
    * @param bindingResult 寃利?寃곌낵
    * @param model 酉곗뿉 ?꾨떖??紐⑤뜽
    * @return 紐⑸줉 ?붾㈃?쇰줈 ?대룞 寃쎈줈
    * @throws Exception ??곸씠 議댁옱?섏? ?딄굅??沅뚰븳 ?놁쓬, 寃利??ㅽ뙣 泥섎━ ?먮뒗 ?곗씠???묎렐 ?ㅻ쪟媛 諛쒖깮??寃쎌슦
    */
    @PostMapping(value = "/dam/mgm/EgovComDamManagementModify.do")
    public String updateKnoManagement(@Valid KnoManagement knoManagement, BindingResult bindingResult, ModelMap model) throws Exception {

        // Spring Security ?ъ슜?먭텒??泥섎━
        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
        if (!isAuthenticated) {
            model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
            return "redirect:/uat/uia/egovLoginUsr.do";
        }

        // 濡쒓렇??媛앹껜 ?좎뼵
        LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
        if (loginVO != null) {
            knoManagement.setEmplyrId(loginVO.getUniqId());
            knoManagement.setLastUpdusrId(loginVO.getUniqId());
        }

        if (bindingResult.hasErrors()) {
            if (GenericValidator.isDate(knoManagement.getJunkYmd(), "yyyyMMdd", true)) {
                knoManagement.setJunkYmd(LocalDate.parse(knoManagement.getJunkYmd(), DateTimeFormatter.BASIC_ISO_DATE).format(DateTimeFormatter.ISO_LOCAL_DATE));
            }
            updateKnoManagementViewInit(knoManagement, model);
            return "egovframework/com/dam/mgm/EgovComDamManagementModify";
        }

        knoManagementService.updateKnoManagement(knoManagement);
        return "forward:/dam/mgm/EgovComDamManagementList.do";
	}

}
