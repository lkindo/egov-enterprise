package egovframework.com.uss.olp.qim.web;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.uss.olp.qim.service.EgovQustnrItemManageService;
import egovframework.com.uss.olp.qim.service.QustnrItemManageVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * ?ㅻЦ??ぉ愿由щ? 泥섎━?섎뒗 Controller Class 援ы쁽
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2009.03.20
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.20  ?λ룞??        理쒖큹 ?앹꽦
 *   2011.08.26  ?뺤쭊??        IncludedInfo annotation 異붽?
 *   2024.10.29  沅뚰깭??        ?깅줉 & ?섏젙???붾㈃怨??곗씠?곕? 泥섎━?섎뒗 method 遺꾨━, validation ?곸슜
 * </pre>
 */
@Controller
public class EgovQustnrItemManageController {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovQustnrItemManageController.class);

	/** EgovMessageSource */
    @Resource(name="egovMessageSource")
    EgovMessageSource egovMessageSource;

	@Resource(name = "egovQustnrItemManageService")
	private EgovQustnrItemManageService egovQustnrItemManageService;

    /** EgovPropertyService */
    @Resource(name = "propertiesService")
    protected EgovPropertyService propertiesService;

	/**
	 * ?ㅻЦ??ぉ ?앹뾽 紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO
	 * @param commandMap
	 * @param qustnrItemManageVO
	 * @param model
	 * @return "egovframework/com/uss/olp/qim/EgovQustnrItemManageListPopup"
	 * @throws Exception
	 */
	@RequestMapping(value="/uss/olp/qim/EgovQustnrItemManageListPopup.do")
	public String egovQustnrItemManageListPopup(
			@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@RequestParam Map<?, ?> commandMap,
			QustnrItemManageVO qustnrItemManageVO,
    		ModelMap model)
    throws Exception {

		String sCmd = commandMap.get("cmd") == null ? "" : (String)commandMap.get("cmd");
		if(sCmd.equals("del")){
			egovQustnrItemManageService.deleteQustnrItemManage(qustnrItemManageVO);
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

        List<EgovMap> sampleList = egovQustnrItemManageService.selectQustnrItemManageList(searchVO);
        model.addAttribute("resultList", sampleList);

        model.addAttribute("searchKeyword", commandMap.get("searchKeyword") == null ? "" : (String)commandMap.get("searchKeyword"));
        model.addAttribute("searchCondition", commandMap.get("searchCondition") == null ? "" : (String)commandMap.get("searchCondition"));

        int totCnt = egovQustnrItemManageService.selectQustnrItemManageListCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
        model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/uss/olp/qim/EgovQustnrItemManageListPopup";
	}

	/**
	 * ?ㅻЦ??ぉ 紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO
	 * @param commandMap
	 * @param qustnrItemManageVO
	 * @param model
	 * @return "egovframework/com/uss/olp/qim/EgovQustnrItemManageList"
	 * @throws Exception
	 */
	@IncludedInfo(name="??ぉ愿由?, order = 640 ,gid = 50)
	@RequestMapping(value="/uss/olp/qim/EgovQustnrItemManageList.do")
	public String egovQustnrItemManageList(
			@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@RequestParam Map<?, ?> commandMap,
			QustnrItemManageVO qustnrItemManageVO,
    		ModelMap model)
    throws Exception {

		String sSearchMode = commandMap.get("searchMode") == null ? "" : (String)commandMap.get("searchMode");

		//?ㅻЦ臾명빆???섏뼱??嫄댁뿉 ???議고쉶
		if(sSearchMode.equals("Y")){
			searchVO.setSearchCondition("QUSTNR_QESITM_ID");//qestnrQesitmId
			searchVO.setSearchKeyword(qustnrItemManageVO.getQestnrQesitmId());
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

        List<EgovMap> sampleList = egovQustnrItemManageService.selectQustnrItemManageList(searchVO);
        model.addAttribute("resultList", sampleList);

        model.addAttribute("searchKeyword", commandMap.get("searchKeyword") == null ? "" : (String)commandMap.get("searchKeyword"));
        model.addAttribute("searchCondition", commandMap.get("searchCondition") == null ? "" : (String)commandMap.get("searchCondition"));

        int totCnt = egovQustnrItemManageService.selectQustnrItemManageListCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
        model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/uss/olp/qim/EgovQustnrItemManageList";
	}

	/**
	 * ?ㅻЦ??ぉ 紐⑸줉???곸꽭議고쉶 議고쉶?쒕떎.
	 * @param searchVO
	 * @param qustnrItemManageVO
	 * @param commandMap
	 * @param model
	 * @return  "/uss/olp/qim/EgovQustnrItemManageDetail"
	 * @throws Exception
	 */
	@RequestMapping(value="/uss/olp/qim/EgovQustnrItemManageDetail.do")
	public String egovQustnrItemManageDetail(
			@ModelAttribute("searchVO") ComDefaultVO searchVO,
			QustnrItemManageVO qustnrItemManageVO,
			@RequestParam Map<?, ?> commandMap,
    		ModelMap model)
    throws Exception {

		String sLocationUrl = "egovframework/com/uss/olp/qim/EgovQustnrItemManageDetail";

		String sCmd = commandMap.get("cmd") == null ? "" : (String)commandMap.get("cmd");

		if(sCmd.equals("del")){
			egovQustnrItemManageService.deleteQustnrItemManage(qustnrItemManageVO);
			sLocationUrl = "redirect:/uss/olp/qim/EgovQustnrItemManageList.do";
		}else{
	        List<EgovMap> sampleList = egovQustnrItemManageService.selectQustnrItemManageDetail(qustnrItemManageVO);
	        model.addAttribute("resultList", sampleList);
		}

		return sLocationUrl;
	}

	/**
	 * ?ㅻЦ??ぉ ?섏젙?붾㈃
	 * @param searchVO
	 * @param qustnrItemManageVO
	 * @param model
	 * @return "egovframework/com/uss/olp/qim/EgovQustnrItemManageModify"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/olp/qim/EgovQustnrItemManageModifyView.do")
	public String qustnrItemManageModifyView(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@ModelAttribute("qustnrItemManageVO") QustnrItemManageVO qustnrItemManageVO, ModelMap model)
			throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		List<?> sampleList = egovQustnrItemManageService.selectQustnrItemManageDetail(qustnrItemManageVO);
		model.addAttribute("resultList", sampleList);

		// ?ㅻЦ??ぉ(??瑜??뺣낫 遺덈윭?ㅺ린
		List<?> listQustnrTmplat = egovQustnrItemManageService.selectQustnrTmplatManageList(qustnrItemManageVO);
		model.addAttribute("listQustnrTmplat", listQustnrTmplat);

		return "egovframework/com/uss/olp/qim/EgovQustnrItemManageModify";
	}


	/**
	 * ?ㅻЦ??ぉ???섏젙?쒕떎.
	 * @param searchVO
	 * @param commandMap
	 * @param qustnrItemManageVO
	 * @param bindingResult
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/olp/qim/EgovQustnrItemManageModify.do")
	public String qustnrItemManageModify(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@Valid @ModelAttribute("qustnrItemManageVO") QustnrItemManageVO qustnrItemManageVO,
			BindingResult bindingResult, ModelMap model) throws Exception {

		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		if (bindingResult.hasErrors()) {
			// ?ㅻЦ??ぉ(??瑜??뺣낫 遺덈윭?ㅺ린
			List<EgovMap> listQustnrTmplat = egovQustnrItemManageService
					.selectQustnrTmplatManageList(qustnrItemManageVO);
			model.addAttribute("listQustnrTmplat", listQustnrTmplat);
			// 寃뚯떆臾?遺덈윭?ㅺ린
			List<EgovMap> sampleList = egovQustnrItemManageService.selectQustnrItemManageDetail(qustnrItemManageVO);
			model.addAttribute("resultList", sampleList);

			return "egovframework/com/uss/olp/qim/EgovQustnrItemManageModify";
		}

		// ?꾩씠???ㅼ젙
		qustnrItemManageVO.setFrstRegisterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
		qustnrItemManageVO.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

		egovQustnrItemManageService.updateQustnrItemManage(qustnrItemManageVO);

		return "redirect:/uss/olp/qim/EgovQustnrItemManageList.do";
	}

	/**
	 * ?ㅻЦ??ぉ ?깅줉 ?붾㈃
	 * @param searchVO
	 * @param qustnrItemManageVO
	 * @param model
	 * @return "egovframework/com/uss/olp/qim/EgovQustnrItemManageRegist"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/olp/qim/EgovQustnrItemManageRegistView.do")
	public String qustnrItemManageRegistView(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@ModelAttribute("qustnrItemManageVO") QustnrItemManageVO qustnrItemManageVO, ModelMap model)
			throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// ?ㅻЦ??ぉ(??瑜??뺣낫 遺덈윭?ㅺ린
		List<?> listQustnrTmplat = egovQustnrItemManageService.selectQustnrTmplatManageList(qustnrItemManageVO);
		model.addAttribute("listQustnrTmplat", listQustnrTmplat);

		return "egovframework/com/uss/olp/qim/EgovQustnrItemManageRegist";
	}

	/**
	 * ?ㅻЦ??ぉ瑜??깅줉?쒕떎.
	 * @param searchVO
	 * @param qustnrItemManageVO
	 * @param bindingResult
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/olp/qim/EgovQustnrItemManageRegist.do")
	public String qustnrItemManageRegist(
			@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@Valid @ModelAttribute("qustnrItemManageVO") QustnrItemManageVO qustnrItemManageVO,
			BindingResult bindingResult, ModelMap model) throws Exception {

		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		// ?쒕쾭 validate 泥댄겕
		if (bindingResult.hasErrors()) {
			// ?ㅻЦ??ぉ(??瑜??뺣낫 遺덈윭?ㅺ린
			List<EgovMap> listQustnrTmplat = egovQustnrItemManageService
					.selectQustnrTmplatManageList(qustnrItemManageVO);
			model.addAttribute("listQustnrTmplat", listQustnrTmplat);
			return "egovframework/com/uss/olp/qim/EgovQustnrItemManageRegist";
		}

		// ?꾩씠???ㅼ젙
		qustnrItemManageVO.setFrstRegisterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
		qustnrItemManageVO.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

		egovQustnrItemManageService.insertQustnrItemManage(qustnrItemManageVO);

		return "redirect:/uss/olp/qim/EgovQustnrItemManageList.do";
	}

}
