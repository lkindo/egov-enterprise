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
 * ???????????? ??? ?????
 *
 * @author ???????? ??
 * @since 2009.04.01
 * @version 1.0
 * @see
 *
 *      <pre>
 * << ?????Modification Information) >>
 *
 *   ????         ????      ????
 *  -----------    --------    ---------------------------
 *   2009.04.01     ??      ????
 *   2011.08.26     ???      IncludedInfo annotation ??
 *
 *      </pre>
 **/
@Controller
public class EgovCpyrhtPrtcPolicyController {

	@Resource(name = "CpyrhtPrtcPolicyService")
	private EgovCpyrhtPrtcPolicyService cpyrhtPrtcPolicyService;

	/** EgovPropertyService **/
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	/** EgovMessageSource **/
	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/**
	 * ??????????.
	 *
	 * @param model
	 * @return " uss/sam/cpy/"   
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/sam/cpy/EgovMain.do")
	public String egovMain(ModelMap model) throws Exception {
		return "egovframework/com/uss/sam/cpy/EgovMain";
	}

	/**
	 * ?????.
	 *
	 * @param model
	 * @return " uss/sam/cpy/EgovLeft"   
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/sam/cpy/EgovLeft.do")
	public String egovLeft(ModelMap model) throws Exception {
		return "egovframework/com/uss/sam/cpy/EgovLeft";
	}

	/**
	 * ????? ?????. (pageing)
	 *
	 * @param searchVO
	 * @param model
	 * @return " uss/sam/cpy/EgovCpyrhtPrtcPolicyListInqire"   
	 * @throws Exception
	 */
	@IncludedInfo(name = "Legacy Controller", order = 500, gid = 50)
	@RequestMapping(value = "/uss/sam/cpy/CpyrhtPrtcPolicyListInqire.do")
	public String selectCpyrhtPrtcPolicyList(@ModelAttribute("searchVO") CpyrhtPrtcPolicyDefaultVO searchVO,
			ModelMap model) throws Exception {

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

		List<EgovMap> resultList = cpyrhtPrtcPolicyService.selectCpyrhtPrtcPolicyList(searchVO);
		model.addAttribute("resultList", resultList);

		int totCnt = cpyrhtPrtcPolicyService.selectCpyrhtPrtcPolicyListTotCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/uss/sam/cpy/EgovCpyrhtPrtcPolicyListInqire";
	}

	/**
	 * ????? ?????????????.
	 *
	 * @param cpyrhtPrtcPolicyVO
	 * @param searchVO
	 * @param model
	 * @return " uss/sam/cpy/EgovCpyrhtPrtcPolicyDetailInqire"   
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
	 * ?????????? ? ????
	 *
	 * @param searchVO
	 * @param model
	 * @return " uss/sam/cpy/EgovCpyrhtPrtcPolicyCnRegist"   
	 * @throws Exception
	 */
	@RequestMapping("/uss/sam/cpy/CpyrhtPrtcPolicyCnRegistView.do")
	public String insertCpyrhtPrtcPolicyCnView(@ModelAttribute("searchVO") CpyrhtPrtcPolicyDefaultVO searchVO,
			Model model) throws Exception {

		model.addAttribute("cpyrhtPrtcPolicyVO", new CpyrhtPrtcPolicyVO());

		return "egovframework/com/uss/sam/cpy/EgovCpyrhtPrtcPolicyCnRegist";

	}

	/**
	 * ??????????.
	 *
	 * @param searchVO
	 * @param cpyrhtPrtcPolicyVO
	 * @param bindingResult
	 * @return "forward: uss/sam/cpy/CpyrhtPrtcPolicyListInqire.do"   
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

		// ????? ?????? ??
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		String frstRegisterId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());

		cpyrhtPrtcPolicyVO.setFrstRegisterId(frstRegisterId); // ???
		cpyrhtPrtcPolicyVO.setLastUpdusrId(frstRegisterId); // ???

		cpyrhtPrtcPolicyService.insertCpyrhtPrtcPolicyCn(cpyrhtPrtcPolicyVO);

		return "forward:/uss/sam/cpy/CpyrhtPrtcPolicyListInqire.do";
	}

	/**
	 * ??????????? ? ????
	 *
	 * @param cpyrhtId
	 * @param searchVO
	 * @param model
	 * @return " uss/sam/cpy/EgovCpyrhtPrtcPolicyCnUpdt"   
	 * @throws Exception
	 */
	@RequestMapping("/uss/sam/cpy/CpyrhtPrtcPolicyCnUpdtView.do")
	public String updateCpyrhtPrtcPolicyCnView(@RequestParam("cpyrhtId") String cpyrhtId,
			@ModelAttribute("searchVO") CpyrhtPrtcPolicyDefaultVO searchVO, ModelMap model) throws Exception {

		CpyrhtPrtcPolicyVO cpyrhtPrtcPolicyVO = new CpyrhtPrtcPolicyVO();

		// Primary Key ??
		cpyrhtPrtcPolicyVO.setCpyrhtId(cpyrhtId);

		// ???? CoC ???
		model.addAttribute(selectCpyrhtPrtcPolicyDetail(cpyrhtPrtcPolicyVO, searchVO, model));

		// ???? CoC ??? JSTL??????
		model.addAttribute("cpyrhtPrtcPolicyVO",
				cpyrhtPrtcPolicyService.selectCpyrhtPrtcPolicyDetail(cpyrhtPrtcPolicyVO));

		return "egovframework/com/uss/sam/cpy/EgovCpyrhtPrtcPolicyCnUpdt";
	}

	/**
	 * ????????????.
	 *
	 * @param searchVO
	 * @param cpyrhtPrtcPolicyVO
	 * @param bindingResult
	 * @return "forward: uss/sam/cpy/CpyrhtPrtcPolicyListInqire.do"   
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

		// ????? ?????? ??
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		String lastUpdusrId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());

		cpyrhtPrtcPolicyVO.setLastUpdusrId(lastUpdusrId); // ???

		cpyrhtPrtcPolicyService.updateCpyrhtPrtcPolicyCn(cpyrhtPrtcPolicyVO);

		return "forward:/uss/sam/cpy/CpyrhtPrtcPolicyListInqire.do";

	}

	/**
	 * ?????????????.
	 *
	 * @param cpyrhtPrtcPolicyVO
	 * @param searchVO
	 * @return "forward: uss/sam/cpy/CpyrhtPrtcPolicyListInqire.do"   
	 * @throws Exception
	 */
	@RequestMapping("/uss/sam/cpy/CpyrhtPrtcPolicyCnDelete.do")
	public String deleteCpyrhtPrtcPolicyCn(CpyrhtPrtcPolicyVO cpyrhtPrtcPolicyVO,
			@ModelAttribute("searchVO") CpyrhtPrtcPolicyDefaultVO searchVO) throws Exception {

		cpyrhtPrtcPolicyService.deleteCpyrhtPrtcPolicyCn(cpyrhtPrtcPolicyVO);

		return "forward:/uss/sam/cpy/CpyrhtPrtcPolicyListInqire.do";
	}

}
