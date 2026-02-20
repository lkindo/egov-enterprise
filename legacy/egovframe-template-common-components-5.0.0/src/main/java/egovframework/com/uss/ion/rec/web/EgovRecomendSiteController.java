package egovframework.com.uss.ion.rec.web;

import java.util.List;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.uss.ion.rec.service.EgovRecomendSiteService;
import egovframework.com.uss.ion.rec.service.RecomendSiteVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * 異붿쿇?ъ씠?몄쿂由щ? ?섎뒗 Controller ?대옒??
 * 
 * @author 怨듯넻?쒕퉬??媛쒕컻? 諛뺤젙洹?
 * @since 2009.04.01
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.04.01  諛뺤젙洹?         理쒖큹 ?앹꽦
 *   2011.08.26  ?뺤쭊??         IncludedInfo annotation 異붽?
 *   2016.08.22  源?고샇          ?쒖??꾨젅?꾩썙??3.6 媛쒖꽑
 *   2025.08.12  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(final???꾨땶 蹂?섎뒗 諛묒쨪???ы븿?????놁쓬)
 *
 *      </pre>
 */
@Controller
public class EgovRecomendSiteController {

	@Resource(name = "EgovRecomendSiteService")
	private EgovRecomendSiteService egovRecomendSiteService;

	/** EgovPropertyService */
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	/** EgovMessageSource */
	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/**
	 * 異붿쿇?ъ씠?몄젙蹂?紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param searchVO
	 * @param model
	 * @return "/uss/ion/rec/EgovRecomendSiteList"
	 * @throws Exception
	 */
	@IncludedInfo(name = "異붿쿇?ъ씠?멸?由?, order = 700, gid = 50)
	@RequestMapping(value = "/uss/ion/rec/selectRecomendSiteList.do")
	public String selectRecomendSiteList(@ModelAttribute("searchVO") RecomendSiteVO searchVO, ModelMap model)
			throws Exception {

		/** EgovPropertyService.SiteList */
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

		List<RecomendSiteVO> resultList = egovRecomendSiteService.selectRecomendSiteList(searchVO);
		model.addAttribute("resultList", resultList);

		int totCnt = egovRecomendSiteService.selectRecomendSiteListCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/uss/ion/rec/EgovRecomendSiteList";
	}

	/**
	 * 異붿쿇?ъ씠?몄젙蹂?紐⑸줉??????곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * 
	 * @param recomendSiteVO
	 * @param searchVO
	 * @param model
	 * @return "/uss/ion/rec/EgovRecomendSiteDetail"
	 * @throws Exception
	 */
	@RequestMapping("/uss/ion/rec/selectRecomendSiteDetail.do")
	public String selectRecomendSiteDetail(RecomendSiteVO recomendSiteVO,
			@ModelAttribute("searchVO") RecomendSiteVO searchVO, ModelMap model) throws Exception {

		RecomendSiteVO vo = egovRecomendSiteService.selectRecomendSiteDetail(recomendSiteVO);

		model.addAttribute("result", vo);

		return "egovframework/com/uss/ion/rec/EgovRecomendSiteDetail";
	}

	/**
	 * 異붿쿇?ъ씠?몄젙蹂대? ?깅줉?섍린 ??泥섎━
	 * 
	 * @param searchVO
	 * @param model
	 * @return "/uss/ion/rec/EgovRecomendSiteRegist"
	 * @throws Exception
	 */
	@RequestMapping("/uss/ion/rec/insertRecomendSiteView.do")
	public String insertRecomendSiteView(@ModelAttribute("searchVO") RecomendSiteVO searchVO, Model model)
			throws Exception {

		model.addAttribute("recomendSiteVO", new RecomendSiteVO());

		return "egovframework/com/uss/ion/rec/EgovRecomendSiteRegist";

	}

	/**
	 * 異붿쿇?ъ씠?몄젙蹂대? ?깅줉?쒕떎.
	 * 
	 * @param searchVO
	 * @param recomendSiteVO
	 * @param bindingResult
	 * @return "forward:/uss/ion/rec/selectRecomendSiteList.do"
	 * @throws Exception
	 */
	@RequestMapping("/uss/ion/rec/insertRecomendSite.do")
	public String insertRecomendSite(@ModelAttribute("searchVO") RecomendSiteVO searchVO,
			@ModelAttribute("recomendSiteVO") RecomendSiteVO recomendSiteVO, BindingResult bindingResult)
			throws Exception {

		if (bindingResult.hasErrors()) {
			return "egovframework/com/uss/olh/rec/EgovRecomendSiteRegist";
		}

		// 濡쒓렇?퇦O?먯꽌 ?ъ슜???뺣낫 媛?몄삤湲?
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		String frstRegisterId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());

		recomendSiteVO.setFrstRegisterId(frstRegisterId); // 理쒖큹?깅줉?륤D
		recomendSiteVO.setLastUpdusrId(frstRegisterId); // 理쒖쥌?섏젙?륤D

		egovRecomendSiteService.insertRecomendSite(recomendSiteVO);

		return "forward:/uss/ion/rec/selectRecomendSiteList.do";
	}

	/**
	 * 異붿쿇?ъ씠?몄젙蹂대? ?섏젙?섍린 ??泥섎━
	 * 
	 * @param recomendSiteId
	 * @param searchVO
	 * @param model
	 * @return "/uss/ion/rec/EgovRecomendSiteUpdt"
	 * @throws Exception
	 */
	@RequestMapping("/uss/ion/rec/updateRecomendSiteView.do")
	public String updateRecomendSiteView(@RequestParam("recomendSiteId") String recomendSiteId,
			@ModelAttribute("searchVO") RecomendSiteVO searchVO, ModelMap model) throws Exception {

		RecomendSiteVO recomendSiteVO = new RecomendSiteVO();

		// Primary Key 媛??명똿
		recomendSiteVO.setRecomendSiteId(recomendSiteId);
		model.addAttribute("recomendSiteVO", egovRecomendSiteService.selectRecomendSiteDetail(recomendSiteVO));

		return "egovframework/com/uss/ion/rec/EgovRecomendSiteUpdt";
	}

	/**
	 * 異붿쿇?ъ씠?몄젙蹂대? ?섏젙泥섎━?쒕떎.
	 * 
	 * @param searchVO
	 * @param recomendSiteManageVO
	 * @param bindingResult
	 * @return "forward:/uss/ion/rec/selectRecomendSiteList.do"
	 * @throws Exception
	 */
	@RequestMapping("/uss/ion/rec/updateRecomendSite.do")
	public String updateRecomendSite(@ModelAttribute("searchVO") RecomendSiteVO searchVO,
			@ModelAttribute("recomendSiteVO") RecomendSiteVO recomendSiteVO, BindingResult bindingResult)
			throws Exception {

		if (bindingResult.hasErrors()) {
			return "egovframework/com/uss/olh/rec/EgovRecomendSiteUpdt";
		}

		// 濡쒓렇?퇦O?먯꽌 ?ъ슜???뺣낫 媛?몄삤湲?
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		String lastUpdusrId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());
		recomendSiteVO.setLastUpdusrId(lastUpdusrId); // 理쒖쥌?섏젙?륤D

		egovRecomendSiteService.updateRecomendSite(recomendSiteVO);

		return "forward:/uss/ion/rec/selectRecomendSiteList.do";

	}

	/**
	 * 異붿쿇?ъ씠?몄젙蹂대? ??젣泥섎━?쒕떎.
	 * 
	 * @param recomendSiteVO
	 * @param searchVO
	 * @return "forward:/uss/ion/rec/selectRecomendSiteList.do"
	 * @throws Exception
	 */
	@RequestMapping("/uss/ion/rec/deleteRecomendSite.do")
	public String deleteRecomendSite(RecomendSiteVO recomendSiteVO, @ModelAttribute("searchVO") RecomendSiteVO searchVO)
			throws Exception {

		egovRecomendSiteService.deleteRecomendSite(recomendSiteVO);

		return "forward:/uss/ion/rec/selectRecomendSiteList.do";
	}

}
