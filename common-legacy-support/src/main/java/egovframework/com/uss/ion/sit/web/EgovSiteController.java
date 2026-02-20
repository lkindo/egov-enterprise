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

/**
 * ?????? ??? Controller ?????
 * 
 * @author ???????? ??
 * @since 2009.04.01
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == ?????Modification Information) ==
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.04.01  ??         ????
 *   2011.08.26  ???         IncludedInfo annotation ??
 *   2025.08.15  ????         2025????????PMD???????? ????????-LocalVariableNamingConventions(final??? ?? ??????????)
 *
 *      </pre>
 **/
@Controller
public class EgovSiteController {

	@Resource(name = "egovSiteService")
	private EgovSiteService egovSiteService;

	/** EgovPropertyService **/
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	@Resource(name = "EgovCmmUseService")
	private EgovCmmUseService cmmUseService;

	/** EgovMessageSource **/
	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/**
	 * ?????????.
	 * 
	 * @param searchVO
	 * @param model
	 * @return " uss/ion/sit/EgovSiteList"   
	 * @throws Exception
	 */
@IncludedInfo(name="Dummy", listUrl="", order=1, gid=50)
	@RequestMapping(value = "/uss/ion/sit/selectSiteList.do")
	public String selectSiteList(@ModelAttribute("searchVO") SiteVO searchVO, ModelMap model) throws Exception {

		/** EgovPropertyService.SiteList **/
		searchVO.setPageUnit(propertiesService.getInt("pageUnit"));
		searchVO.setPageSize(propertiesService.getInt("pageSize"));

		/** pageing **/
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
	 * ??????????????????.
	 * 
	 * @param siteVO
	 * @param searchVO
	 * @param model
	 * @return " uss/ion/sit/EgovSiteDetail"   
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
	 * ???????????
	 * 
	 * @param searchVO
	 * @param model
	 * @return " uss/ion/sit/EgovSiteRegist"   
	 * @throws Exception
	 */
	@RequestMapping("/uss/ion/sit/insertSiteView.do")
	public String insertSiteView(@ModelAttribute("searchVO") SiteVO searchVO, Model model) throws Exception {

		// ??????? Vo
		ComDefaultCodeVO vo = new ComDefaultCodeVO();
		vo.setCodeId("COM023");

		List<?> siteThemaClCode = cmmUseService.selectCmmCodeDetail(vo);
		model.addAttribute("siteThemaClCode", siteThemaClCode);

		model.addAttribute("siteVO", new SiteVO());

		return "egovframework/com/uss/ion/sit/EgovSiteRegist";

	}

	/**
	 * ?????? ???.
	 * 
	 * @param searchVO
	 * @param siteVO
	 * @param bindingResult
	 * @return "forward: uss/ion/sit/selectSiteList.do"   
	 * @throws Exception
	 */
	@RequestMapping("/uss/ion/sit/insertSite.do")
	public String insertSite(@ModelAttribute("searchVO") SiteVO searchVO, @ModelAttribute("siteVO") SiteVO siteVO,
			BindingResult bindingResult) throws Exception {

		if (bindingResult.hasErrors()) {
			return "egovframework/com/uss/olh/sit/EgovSiteRegist";
		}

		// ????? ?????? ??
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		String frstRegisterId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());

		siteVO.setFrstRegisterId(frstRegisterId); // ???
		siteVO.setLastUpdusrId(frstRegisterId); // ???

		egovSiteService.insertSite(siteVO);

		return "forward:/uss/ion/sit/selectSiteList.do";
	}

	/**
	 * ??????? ????
	 * 
	 * @param siteId
	 * @param searchVO
	 * @param model
	 * @return " uss/ion/sit/EgovSiteUpdt"   
	 * @throws Exception
	 */
	@RequestMapping("/uss/ion/sit/updateSiteView.do")
	public String updateSiteView(@RequestParam("siteId") String siteId, @ModelAttribute("searchVO") SiteVO searchVO,
			ModelMap model) throws Exception {

		// ??????? Vo
		ComDefaultCodeVO vo = new ComDefaultCodeVO();
		vo.setCodeId("COM023");

		List<?> siteThemaClCode = cmmUseService.selectCmmCodeDetail(vo);
		model.addAttribute("siteThemaClCode", siteThemaClCode);

		SiteVO siteVO = new SiteVO();

		// Primary Key ??
		siteVO.setSiteId(siteId);

		model.addAttribute("siteVO", egovSiteService.selectSiteDetail(siteVO));

		return "egovframework/com/uss/ion/sit/EgovSiteUpdt";
	}

	/**
	 * ?????? ????.
	 * 
	 * @param searchVO
	 * @param siteVO
	 * @param bindingResult
	 * @return "forward: uss/ion/sit/selectSiteList.do"   
	 * @throws Exception
	 */
	@RequestMapping("/uss/ion/sit/updateSite.do")
	public String updateSite(@ModelAttribute("searchVO") SiteVO searchVO, @ModelAttribute("siteVO") SiteVO siteVO,
			BindingResult bindingResult) throws Exception {

		if (bindingResult.hasErrors()) {
			return "egovframework/com/uss/ion/sit/EgovSiteUpdt";
		}

		// ????? ?????? ??
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		String lastUpdusrId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());
		siteVO.setLastUpdusrId(lastUpdusrId); // ???

		egovSiteService.updateSite(siteVO);

		return "forward:/uss/ion/sit/selectSiteList.do";

	}

	/**
	 * ?????? ??????.
	 * 
	 * @param siteVO
	 * @param searchVO
	 * @return "forward: uss/ion/sit/selectSiteList.do"   
	 * @throws Exception
	 */
	@RequestMapping("/uss/ion/sit/deleteSite.do")
	public String deleteSite(SiteVO siteVO, @ModelAttribute("searchVO") SiteVO searchVO) throws Exception {

		egovSiteService.deleteSite(siteVO);

		return "forward:/uss/ion/sit/selectSiteList.do";
	}
}
