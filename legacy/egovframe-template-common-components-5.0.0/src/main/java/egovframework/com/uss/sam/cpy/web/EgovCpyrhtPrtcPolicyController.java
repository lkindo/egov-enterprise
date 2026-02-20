package egovframework.com.uss.sam.cpy.web;

import java.util.List;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
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
import egovframework.com.uss.sam.cpy.service.CpyrhtPrtcPolicyDefaultVO;
import egovframework.com.uss.sam.cpy.service.CpyrhtPrtcPolicyVO;
import egovframework.com.uss.sam.cpy.service.EgovCpyrhtPrtcPolicyService;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 *
 * ??묎텒蹂댄샇?뺤콉?댁슜??泥섎━?섎뒗 而⑦듃濡ㅻ윭 ?대옒??
 *
 * @author 怨듯넻?쒕퉬??媛쒕컻? 諛뺤젙洹?
 * @since 2009.04.01
 * @version 1.0
 * @see
 *
 *      <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??         ?섏젙??      ?섏젙?댁슜
 *  -----------    --------    ---------------------------
 *   2009.04.01     諛뺤젙洹?      理쒖큹 ?앹꽦
 *   2011.08.26     ?뺤쭊??      IncludedInfo annotation 異붽?
 *
 *      </pre>
 */
@Controller
public class EgovCpyrhtPrtcPolicyController {

	@Resource(name = "CpyrhtPrtcPolicyService")
	private EgovCpyrhtPrtcPolicyService cpyrhtPrtcPolicyService;

	/** EgovPropertyService */
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	/** EgovMessageSource */
	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/**
	 * 媛쒕퀎 諛고룷??硫붿씤硫붾돱瑜?議고쉶?쒕떎.
	 *
	 * @param model
	 * @return "/uss/sam/cpy/"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/sam/cpy/EgovMain.do")
	public String egovMain(ModelMap model) throws Exception {
		return "egovframework/com/uss/sam/cpy/EgovMain";
	}

	/**
	 * 硫붾돱瑜?議고쉶?쒕떎.
	 *
	 * @param model
	 * @return "/uss/sam/cpy/EgovLeft"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/sam/cpy/EgovLeft.do")
	public String egovLeft(ModelMap model) throws Exception {
		return "egovframework/com/uss/sam/cpy/EgovLeft";
	}

	/**
	 * ??묎텒蹂댄샇?뺤콉 紐⑸줉??議고쉶?쒕떎. (pageing)
	 *
	 * @param searchVO
	 * @param model
	 * @return "/uss/sam/cpy/EgovCpyrhtPrtcPolicyListInqire"
	 * @throws Exception
	 */
	@IncludedInfo(name = "??묎텒蹂댄샇?뺤콉", order = 500, gid = 50)
	@RequestMapping(value = "/uss/sam/cpy/CpyrhtPrtcPolicyListInqire.do")
	public String selectCpyrhtPrtcPolicyList(@ModelAttribute("searchVO") CpyrhtPrtcPolicyDefaultVO searchVO,
			ModelMap model) throws Exception {

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

		List<EgovMap> resultList = cpyrhtPrtcPolicyService.selectCpyrhtPrtcPolicyList(searchVO);
		model.addAttribute("resultList", resultList);

		int totCnt = cpyrhtPrtcPolicyService.selectCpyrhtPrtcPolicyListTotCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/uss/sam/cpy/EgovCpyrhtPrtcPolicyListInqire";
	}

	/**
	 * ??묎텒蹂댄샇?뺤콉 紐⑸줉??????곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 *
	 * @param cpyrhtPrtcPolicyVO
	 * @param searchVO
	 * @param model
	 * @return "/uss/sam/cpy/EgovCpyrhtPrtcPolicyDetailInqire"
	 * @throws Exception
	 */
	@RequestMapping("/uss/sam/cpy/CpyrhtPrtcPolicyDetailInqire.do")
	public String selectCpyrhtPrtcPolicyDetail(CpyrhtPrtcPolicyVO cpyrhtPrtcPolicyVO,
			@ModelAttribute("searchVO") CpyrhtPrtcPolicyDefaultVO searchVO, ModelMap model) throws Exception {

		CpyrhtPrtcPolicyVO vo = cpyrhtPrtcPolicyService.selectCpyrhtPrtcPolicyDetail(cpyrhtPrtcPolicyVO);

		model.addAttribute("result", vo);

		return "egovframework/com/uss/sam/cpy/EgovCpyrhtPrtcPolicyDetailInqire";
	}

	/**
	 * ??묎텒蹂댄샇?뺤콉瑜??깅줉?섍린 ?꾪븳 ??泥섎━
	 *
	 * @param searchVO
	 * @param model
	 * @return "/uss/sam/cpy/EgovCpyrhtPrtcPolicyCnRegist"
	 * @throws Exception
	 */
	@RequestMapping("/uss/sam/cpy/CpyrhtPrtcPolicyCnRegistView.do")
	public String insertCpyrhtPrtcPolicyCnView(@ModelAttribute("searchVO") CpyrhtPrtcPolicyDefaultVO searchVO,
			Model model) throws Exception {

		model.addAttribute("cpyrhtPrtcPolicyVO", new CpyrhtPrtcPolicyVO());

		return "egovframework/com/uss/sam/cpy/EgovCpyrhtPrtcPolicyCnRegist";

	}

	/**
	 * ??묎텒蹂댄샇?뺤콉瑜??깅줉?쒕떎.
	 *
	 * @param searchVO
	 * @param cpyrhtPrtcPolicyVO
	 * @param bindingResult
	 * @return "forward:/uss/sam/cpy/CpyrhtPrtcPolicyListInqire.do"
	 * @throws Exception
	 */
	@RequestMapping("/uss/sam/cpy/CpyrhtPrtcPolicyCnRegist.do")
	public String insertCpyrhtPrtcPolicyCn(
		@ModelAttribute("searchVO") CpyrhtPrtcPolicyDefaultVO searchVO,
			@Valid @ModelAttribute("cpyrhtPrtcPolicyVO") CpyrhtPrtcPolicyVO cpyrhtPrtcPolicyVO,
			BindingResult bindingResult) throws Exception {

		if (bindingResult.hasErrors()) {

			return "egovframework/com/uss/sam/cpy/EgovCpyrhtPrtcPolicyCnRegist";

		}

		// 濡쒓렇?퇦O?먯꽌 ?ъ슜???뺣낫 媛?몄삤湲?
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		String frstRegisterId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());

		cpyrhtPrtcPolicyVO.setFrstRegisterId(frstRegisterId); // 理쒖큹?깅줉?륤D
		cpyrhtPrtcPolicyVO.setLastUpdusrId(frstRegisterId); // 理쒖쥌?섏젙?륤D

		cpyrhtPrtcPolicyService.insertCpyrhtPrtcPolicyCn(cpyrhtPrtcPolicyVO);

		return "forward:/uss/sam/cpy/CpyrhtPrtcPolicyListInqire.do";
	}

	/**
	 * ??묎텒蹂댄샇?뺤콉瑜??섏젙?섍린 ?꾪븳 ??泥섎━
	 *
	 * @param cpyrhtId
	 * @param searchVO
	 * @param model
	 * @return "/uss/sam/cpy/EgovCpyrhtPrtcPolicyCnUpdt"
	 * @throws Exception
	 */
	@RequestMapping("/uss/sam/cpy/CpyrhtPrtcPolicyCnUpdtView.do")
	public String updateCpyrhtPrtcPolicyCnView(@RequestParam("cpyrhtId") String cpyrhtId,
			@ModelAttribute("searchVO") CpyrhtPrtcPolicyDefaultVO searchVO, ModelMap model) throws Exception {

		CpyrhtPrtcPolicyVO cpyrhtPrtcPolicyVO = new CpyrhtPrtcPolicyVO();

		// Primary Key 媛??명똿
		cpyrhtPrtcPolicyVO.setCpyrhtId(cpyrhtId);

		// 蹂?섎챸? CoC ???곕씪
		model.addAttribute(selectCpyrhtPrtcPolicyDetail(cpyrhtPrtcPolicyVO, searchVO, model));

		// 蹂?섎챸? CoC ???곕씪 JSTL?ъ슜???꾪빐
		model.addAttribute("cpyrhtPrtcPolicyVO",
				cpyrhtPrtcPolicyService.selectCpyrhtPrtcPolicyDetail(cpyrhtPrtcPolicyVO));

		return "egovframework/com/uss/sam/cpy/EgovCpyrhtPrtcPolicyCnUpdt";
	}

	/**
	 * ??묎텒蹂댄샇?뺤콉瑜??섏젙泥섎━?쒕떎.
	 *
	 * @param searchVO
	 * @param cpyrhtPrtcPolicyVO
	 * @param bindingResult
	 * @return "forward:/uss/sam/cpy/CpyrhtPrtcPolicyListInqire.do"
	 * @throws Exception
	 */
	@RequestMapping("/uss/sam/cpy/CpyrhtPrtcPolicyCnUpdt.do")
	public String updateCpyrhtPrtcPolicyCn(
		@ModelAttribute("searchVO") CpyrhtPrtcPolicyDefaultVO searchVO,
			@Valid @ModelAttribute("cpyrhtPrtcPolicyVO") CpyrhtPrtcPolicyVO cpyrhtPrtcPolicyVO,
			BindingResult bindingResult) throws Exception {

		if (bindingResult.hasErrors()) {

			return "egovframework/com/uss/olh/wor/EgovCpyrhtPrtcPolicyCnUpdt";

		}

		// 濡쒓렇?퇦O?먯꽌 ?ъ슜???뺣낫 媛?몄삤湲?
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		String lastUpdusrId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());

		cpyrhtPrtcPolicyVO.setLastUpdusrId(lastUpdusrId); // 理쒖쥌?섏젙?륤D

		cpyrhtPrtcPolicyService.updateCpyrhtPrtcPolicyCn(cpyrhtPrtcPolicyVO);

		return "forward:/uss/sam/cpy/CpyrhtPrtcPolicyListInqire.do";

	}

	/**
	 * ??묎텒蹂댄샇?뺤콉瑜???젣泥섎━?쒕떎.
	 *
	 * @param cpyrhtPrtcPolicyVO
	 * @param searchVO
	 * @return "forward:/uss/sam/cpy/CpyrhtPrtcPolicyListInqire.do"
	 * @throws Exception
	 */
	@RequestMapping("/uss/sam/cpy/CpyrhtPrtcPolicyCnDelete.do")
	public String deleteCpyrhtPrtcPolicyCn(CpyrhtPrtcPolicyVO cpyrhtPrtcPolicyVO,
			@ModelAttribute("searchVO") CpyrhtPrtcPolicyDefaultVO searchVO) throws Exception {

		cpyrhtPrtcPolicyService.deleteCpyrhtPrtcPolicyCn(cpyrhtPrtcPolicyVO);

		return "forward:/uss/sam/cpy/CpyrhtPrtcPolicyListInqire.do";
	}

}
