package egovframework.com.uss.ion.sit.web;

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

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.service.EgovCmmUseService;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.uss.ion.sit.service.EgovSiteService;
import egovframework.com.uss.ion.sit.service.SiteVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * ?ъ씠?몄젙蹂대? 泥섎━?섎뒗 Controller ?대옒??
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
 *   2025.08.15  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(final???꾨땶 蹂?섎뒗 諛묒쨪???ы븿?????놁쓬)
 *
 *      </pre>
 */
@Controller
public class EgovSiteController {

	@Resource(name = "EgovSiteService")
	private EgovSiteService egovSiteService;

	/** EgovPropertyService */
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	@Resource(name = "EgovCmmUseService")
	private EgovCmmUseService cmmUseService;

	/** EgovMessageSource */
	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/**
	 * ?ъ씠?몃ぉ濡앹쓣 議고쉶?쒕떎.
	 * 
	 * @param searchVO
	 * @param model
	 * @return "/uss/ion/sit/EgovSiteList"
	 * @throws Exception
	 */
	@IncludedInfo(name = "?ъ씠?멸?由?, order = 680, gid = 50)
	@RequestMapping(value = "/uss/ion/sit/selectSiteList.do")
	public String selectSiteList(@ModelAttribute("searchVO") SiteVO searchVO, ModelMap model) throws Exception {

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

		List<SiteVO> resultList = egovSiteService.selectSiteList(searchVO);
		model.addAttribute("resultList", resultList);

		int totCnt = egovSiteService.selectSiteListCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/uss/ion/sit/EgovSiteList";
	}

	/**
	 * ?ъ씠?몄젙蹂?紐⑸줉??????곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * 
	 * @param siteVO
	 * @param searchVO
	 * @param model
	 * @return "/uss/ion/sit/EgovSiteDetail"
	 * @throws Exception
	 */
	@RequestMapping("/uss/ion/sit/selectSiteDetail.do")
	public String selectSiteDetail(SiteVO siteVO, @ModelAttribute("searchVO") SiteVO searchVO, ModelMap model)
			throws Exception {

		SiteVO vo = egovSiteService.selectSiteDetail(siteVO);

		model.addAttribute("result", vo);

		return "egovframework/com/uss/ion/sit/EgovSiteDetail";
	}

	/**
	 * ?ъ씠?몄젙蹂??깅줉???④퀎
	 * 
	 * @param searchVO
	 * @param model
	 * @return "/uss/ion/sit/EgovSiteRegist"
	 * @throws Exception
	 */
	@RequestMapping("/uss/ion/sit/insertSiteView.do")
	public String insertSiteView(@ModelAttribute("searchVO") SiteVO searchVO, Model model) throws Exception {

		// 怨듯넻肄붾뱶瑜?媛?몄삤湲??꾪븳 Vo
		ComDefaultCodeVO vo = new ComDefaultCodeVO();
		vo.setCodeId("COM023");

		List<?> siteThemaClCode = cmmUseService.selectCmmCodeDetail(vo);
		model.addAttribute("siteThemaClCode", siteThemaClCode);

		model.addAttribute("siteVO", new SiteVO());

		return "egovframework/com/uss/ion/sit/EgovSiteRegist";

	}

	/**
	 * ?ъ씠?몄젙蹂대? ?깅줉?쒕떎.
	 * 
	 * @param searchVO
	 * @param siteVO
	 * @param bindingResult
	 * @return "forward:/uss/ion/sit/selectSiteList.do"
	 * @throws Exception
	 */
	@RequestMapping("/uss/ion/sit/insertSite.do")
	public String insertSite(@ModelAttribute("searchVO") SiteVO searchVO, @ModelAttribute("siteVO") SiteVO siteVO,
			BindingResult bindingResult) throws Exception {

		if (bindingResult.hasErrors()) {
			return "egovframework/com/uss/olh/sit/EgovSiteRegist";
		}

		// 濡쒓렇?퇦O?먯꽌 ?ъ슜???뺣낫 媛?몄삤湲?
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		String frstRegisterId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());

		siteVO.setFrstRegisterId(frstRegisterId); // 理쒖큹?깅줉?륤D
		siteVO.setLastUpdusrId(frstRegisterId); // 理쒖쥌?섏젙?륤D

		egovSiteService.insertSite(siteVO);

		return "forward:/uss/ion/sit/selectSiteList.do";
	}

	/**
	 * ?ъ씠?몄젙蹂??섏젙 ??泥섎━
	 * 
	 * @param siteId
	 * @param searchVO
	 * @param model
	 * @return "/uss/ion/sit/EgovSiteUpdt"
	 * @throws Exception
	 */
	@RequestMapping("/uss/ion/sit/updateSiteView.do")
	public String updateSiteView(@RequestParam("siteId") String siteId, @ModelAttribute("searchVO") SiteVO searchVO,
			ModelMap model) throws Exception {

		// 怨듯넻肄붾뱶瑜?媛?몄삤湲??꾪븳 Vo
		ComDefaultCodeVO vo = new ComDefaultCodeVO();
		vo.setCodeId("COM023");

		List<?> siteThemaClCode = cmmUseService.selectCmmCodeDetail(vo);
		model.addAttribute("siteThemaClCode", siteThemaClCode);

		SiteVO siteVO = new SiteVO();

		// Primary Key 媛??명똿
		siteVO.setSiteId(siteId);

		model.addAttribute("siteVO", egovSiteService.selectSiteDetail(siteVO));

		return "egovframework/com/uss/ion/sit/EgovSiteUpdt";
	}

	/**
	 * ?ъ씠?몄젙蹂대? ?섏젙?쒕떎.
	 * 
	 * @param searchVO
	 * @param siteVO
	 * @param bindingResult
	 * @return "forward:/uss/ion/sit/selectSiteList.do"
	 * @throws Exception
	 */
	@RequestMapping("/uss/ion/sit/updateSite.do")
	public String updateSite(@ModelAttribute("searchVO") SiteVO searchVO, @ModelAttribute("siteVO") SiteVO siteVO,
			BindingResult bindingResult) throws Exception {

		if (bindingResult.hasErrors()) {
			return "egovframework/com/uss/ion/sit/EgovSiteUpdt";
		}

		// 濡쒓렇?퇦O?먯꽌 ?ъ슜???뺣낫 媛?몄삤湲?
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		String lastUpdusrId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());
		siteVO.setLastUpdusrId(lastUpdusrId); // 理쒖쥌?섏젙?륤D

		egovSiteService.updateSite(siteVO);

		return "forward:/uss/ion/sit/selectSiteList.do";

	}

	/**
	 * ?ъ씠?몄젙蹂대? ??젣泥섎━?쒕떎.
	 * 
	 * @param siteVO
	 * @param searchVO
	 * @return "forward:/uss/ion/sit/selectSiteList.do"
	 * @throws Exception
	 */
	@RequestMapping("/uss/ion/sit/deleteSite.do")
	public String deleteSite(SiteVO siteVO, @ModelAttribute("searchVO") SiteVO searchVO) throws Exception {

		egovSiteService.deleteSite(siteVO);

		return "forward:/uss/ion/sit/selectSiteList.do";
	}
}
