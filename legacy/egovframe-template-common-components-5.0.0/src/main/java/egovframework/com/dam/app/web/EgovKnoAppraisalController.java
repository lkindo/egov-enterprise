package egovframework.com.dam.app.web;

import java.util.List;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
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
import egovframework.com.dam.app.service.EgovKnoAppraisalService;
import egovframework.com.dam.app.service.KnoAppraisal;
import egovframework.com.dam.app.service.KnoAppraisalVO;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * <pre>
 * 媛쒖슂
 * - 吏?앹젙蹂댄룊媛?????controller ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - 吏?앹젙蹂댄룊媛??????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * - 吏?앹젙蹂댄룊媛??議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * </pre>
 * 
 * @author 諛뺤쥌??
 * @since 2010.08.12
 * @version 1.0
 * @see
 * 
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.08.12  諛뺤쥌??         理쒖큹 ?앹꽦
 *   2011.08.26  ?뺤쭊??         IncludedInfo annotation 異붽?
 *   2025.06.13  ?대갚??         PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(吏??蹂??紐낅챸 洹쒖튃)
 *
 *      </pre>
 */
@Controller
public class EgovKnoAppraisalController {

	@Resource(name = "KnoAppraisalService")
	private EgovKnoAppraisalService knoAppraisalService;

	/** EgovPropertyService */
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	/** EgovMessageSource */
	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/**
	 * ?깅줉??吏?앹젙蹂댄룊媛 ?뺣낫瑜?議고쉶 ?쒕떎.
	 * 
	 * @param KnoAppraisalVO -app 吏?앹젙蹂댄룊媛 VO
	 * @return String - 由ы꽩 Url
	 *
	 * @param KnoAppraisalVO
	 */
	@IncludedInfo(name = "吏?앺룊媛愿由?, listUrl = "/dam/app/EgovComDamAppraisalList.do", order = 1290, gid = 80)
	@RequestMapping(value = "/dam/app/EgovComDamAppraisalList.do")
	public String selectKnoAppraisalList(@ModelAttribute("searchVO") KnoAppraisalVO searchVO, ModelMap model)
			throws Exception {

		// Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

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

		searchVO.setEmplyrId(loginVO.getUniqId());

		List<EgovMap> resultList = knoAppraisalService.selectKnoAppraisalList(searchVO);
		model.addAttribute("resultList", resultList);

		int totCnt = knoAppraisalService.selectKnoAppraisalTotCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/dam/app/EgovComDamAppraisalList";
	}

	/**
	 * 吏?앹젙蹂댄룊媛 ?곸꽭 ?뺣낫瑜?議고쉶 ?쒕떎.
	 * 
	 * @param KnoAppraisalVO - 吏?앹젙蹂댄룊媛 VO
	 * @return String - 由ы꽩 Url
	 *
	 * @param KnoAppraisalVO
	 */
	@RequestMapping(value = "/dam/app/EgovComDamAppraisal.do")
	public String selectKnoAppraisal(KnoAppraisal knoAppraisal, ModelMap model) throws Exception {
		KnoAppraisal vo = knoAppraisalService.selectKnoAppraisal(knoAppraisal);
		model.addAttribute("result", vo);
		return "egovframework/com/dam/app/EgovComDamAppraisalDetail";
	}

	/**
	 * 湲??깅줉 ??吏?앹젙蹂댄룊媛 ?뺣낫瑜??섏젙 ?쒕떎.
	 * 
	 * @param AppraisalknoAps - 吏?앹젙蹂댄룊媛 model
	 * @return String - 由ы꽩 Url
	 *
	 * @param knoAps
	 */
	@GetMapping(value = "/dam/app/EgovComDamAppraisalModify.do")
	public String updateKnoAppraisalView(@ModelAttribute("knoId") KnoAppraisal knoAppraisal, ModelMap model)
			throws Exception {

		KnoAppraisal vo = knoAppraisalService.selectKnoAppraisal(knoAppraisal);
		model.addAttribute("knoAppraisal", vo);
		return "egovframework/com/dam/app/EgovComDamAppraisalModify";
	}

	/**
	 * 湲??깅줉 ??吏?앹젙蹂댄룊媛 ?뺣낫瑜??섏젙 ?쒕떎.
	 * 
	 * @param AppraisalknoAps - 吏?앹젙蹂댄룊媛 model
	 * @return String - 由ы꽩 Url
	 *
	 * @param knoAps
	 */
	@PostMapping(value = "/dam/app/EgovComDamAppraisalModify.do")
	public String updateKnoAppraisal(@Valid @ModelAttribute("knoId") KnoAppraisal knoAppraisal, BindingResult bindingResult,
			ModelMap model) throws Exception {

		if (bindingResult.hasErrors()) {
			KnoAppraisal vo = knoAppraisalService.selectKnoAppraisal(knoAppraisal);
			model.addAttribute("knoAppraisal", vo);
			return "egovframework/com/dam/app/EgovComDamAppraisalModify";
		}

		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		// ?꾩씠???ㅼ젙
		if (loginVO != null) {
			knoAppraisal.setLastUpdusrId(loginVO.getUniqId());
			knoAppraisal.setSpeId(loginVO.getUniqId());
		}

		knoAppraisalService.updateKnoAppraisal(knoAppraisal);
		return "forward:/dam/app/EgovComDamAppraisalList.do";
	}

}