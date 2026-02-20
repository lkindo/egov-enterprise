package egovframework.com.uss.sam.stp.web;

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
import egovframework.com.uss.sam.stp.service.EgovStplatManageService;
import egovframework.com.uss.sam.stp.service.StplatManageDefaultVO;
import egovframework.com.uss.sam.stp.service.StplatManageVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * ?쎄??댁슜??泥섎━?섎뒗 鍮꾩쫰?덉뒪 援ы쁽 ?대옒??
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
 *   2016.06.13  ?λ룞??         ?쒖??꾨젅?꾩썙??v3.6 媛쒖꽑
 *   2025.08.27  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(final???꾨땶 蹂?섎뒗 諛묒쨪???ы븿?????놁쓬)
 *
 *      </pre>
 */
@Controller
public class EgovStplatManageController {

	@Resource(name = "StplatManageService")
	private EgovStplatManageService stplatManageService;

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
	 * @return "/uss/sam/stp/EgovMain"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/sam/stp/EgovMain.do")
	public String egovMain(ModelMap model) throws Exception {
		return "egovframework/com/uss/sam/stp/EgovMain";
	}

	/**
	 * 硫붾돱瑜?議고쉶?쒕떎.
	 * 
	 * @param model
	 * @return "/uss/sam/stp/EgovLeft"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/sam/stp/EgovLeft.do")
	public String egovLeft(ModelMap model) throws Exception {
		return "egovframework/com/uss/sam/stp/EgovLeft";
	}

	/**
	 * ?쎄??뺣낫 紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param searchVO
	 * @param model
	 * @return "/uss/sam/stp/EgovStplatListInqire"
	 * @throws Exception
	 */
	@IncludedInfo(name = "?쎄?愿由?, order = 490, gid = 50)
	@RequestMapping(value = "/uss/sam/stp/StplatListInqire.do")
	public String selectStplatList(@ModelAttribute("searchVO") StplatManageDefaultVO searchVO, ModelMap model)
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

		List<StplatManageVO> resultList = stplatManageService.selectStplatList(searchVO);
		model.addAttribute("resultList", resultList);

		int totCnt = stplatManageService.selectStplatListTotCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/uss/sam/stp/EgovStplatListInqire";
	}

	/**
	 * ?쎄??뺣낫?곸꽭?댁슜??議고쉶?쒕떎.
	 * 
	 * @param stplatManageVO
	 * @param searchVO
	 * @param model
	 * @return "/uss/sam/stp/EgovStplatDetailInqire"
	 * @throws Exception
	 */
	@RequestMapping("/uss/sam/stp/StplatDetailInqire.do")
	public String selectStplatDetail(StplatManageVO stplatManageVO,
			@ModelAttribute("searchVO") StplatManageDefaultVO searchVO, ModelMap model) throws Exception {

		StplatManageVO vo = stplatManageService.selectStplatDetail(stplatManageVO);

		model.addAttribute("result", vo);

		return "egovframework/com/uss/sam/stp/EgovStplatDetailInqire";
	}

	/**
	 * ?쎄??뺣낫瑜??깅줉?섍린 ?꾪븳 ??泥섎━
	 * 
	 * @param searchVO
	 * @param model
	 * @return "/uss/sam/stp/EgovStplatCnRegist"
	 * @throws Exception
	 */
	@RequestMapping("/uss/sam/stp/StplatCnRegistView.do")
	public String insertStplatCnView(@ModelAttribute("searchVO") StplatManageDefaultVO searchVO, Model model)
			throws Exception {
		model.addAttribute("stplatManageVO", new StplatManageVO());
		return "egovframework/com/uss/sam/stp/EgovStplatCnRegist";
	}

	/**
	 * ?쎄??뺣낫瑜??깅줉?쒕떎.
	 * 
	 * @param searchVO
	 * @param stplatManageVO
	 * @param bindingResult
	 * @return "forward:/uss/sam/stp/StplatListInqire.do"
	 * @throws Exception
	 */
	@RequestMapping("/uss/sam/stp/StplatCnRegist.do")
	public String insertStplatCn(@ModelAttribute("searchVO") StplatManageDefaultVO searchVO,
			@ModelAttribute("stplatManageVO") StplatManageVO stplatManageVO, BindingResult bindingResult,
			ModelMap model) throws Exception {

		if (bindingResult.hasErrors()) {
			return "egovframework/com/uss/sam/stp/EgovStplatCnRegist";
		}

		// 濡쒓렇?퇦O?먯꽌 ?ъ슜???뺣낫 媛?몄삤湲?
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated(); // KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?댁젙?)

		if (!isAuthenticated) {
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		String frstRegisterId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());

		stplatManageVO.setFrstRegisterId(frstRegisterId); // 理쒖큹?깅줉?륤D
		stplatManageVO.setLastUpdusrId(frstRegisterId); // 理쒖쥌?섏젙?륤D

		stplatManageService.insertStplatCn(stplatManageVO);

		return "forward:/uss/sam/stp/StplatListInqire.do";
	}

	/**
	 * ?쎄??뺣낫瑜??섏젙?섍린 ?꾪븳 ??泥섎━
	 * 
	 * @param useStplatId
	 * @param searchVO
	 * @param model
	 * @return "/uss/sam/stp/EgovStplatCnUpdt"
	 * @throws Exception
	 */
	@RequestMapping("/uss/sam/stp/StplatCnUpdtView.do")
	public String updateStplatCnView(@RequestParam("useStplatId") String useStplatId,
			@ModelAttribute("searchVO") StplatManageDefaultVO searchVO, ModelMap model) throws Exception {

		StplatManageVO stplatManageVO = new StplatManageVO();

		// Primary Key 媛??명똿
		stplatManageVO.setUseStplatId(useStplatId);

		// 蹂?섎챸? CoC ???곕씪
		model.addAttribute(selectStplatDetail(stplatManageVO, searchVO, model));

		// 蹂?섎챸? CoC ???곕씪 JSTL?ъ슜???꾪빐
		model.addAttribute("stplatManageVO", stplatManageService.selectStplatDetail(stplatManageVO));

		return "egovframework/com/uss/sam/stp/EgovStplatCnUpdt";
	}

	/**
	 * ?쎄??뺣낫瑜??섏젙 泥섎━?쒕떎.
	 * 
	 * @param searchVO
	 * @param stplatManageVO
	 * @param bindingResult
	 * @return "forward:/uss/sam/stp/StplatListInqire.do"
	 * @throws Exception
	 */
	@RequestMapping("/uss/sam/stp/StplatCnUpdt.do")
	public String updateStplatCn(@ModelAttribute("searchVO") StplatManageDefaultVO searchVO,
			@ModelAttribute("stplatManageVO") StplatManageVO stplatManageVO, BindingResult bindingResult)
			throws Exception {

		if (bindingResult.hasErrors()) {
			return "egovframework/com/uss/sam/stp/EgovStplatCnUpdt";
		}

		// 濡쒓렇?퇦O?먯꽌 ?ъ슜???뺣낫 媛?몄삤湲?
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated(); // KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?댁젙?)

		if (!isAuthenticated) {
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		String lastUpdusrId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());
		stplatManageVO.setLastUpdusrId(lastUpdusrId); // 理쒖쥌?섏젙?륤D
		stplatManageService.updateStplatCn(stplatManageVO);

		return "forward:/uss/sam/stp/StplatListInqire.do";
	}

	/**
	 * ?쎄??뺣낫瑜???젣 泥섎━?쒕떎.
	 * 
	 * @param stplatManageVO
	 * @param searchVO
	 * @return "forward:/uss/sam/stp/StplatListInqire.do"
	 * @throws Exception
	 */
	@RequestMapping("/uss/sam/stp/StplatCnDelete.do")
	public String deleteStplatCn(StplatManageVO stplatManageVO,
			@ModelAttribute("searchVO") StplatManageDefaultVO searchVO) throws Exception {

		stplatManageService.deleteStplatCn(stplatManageVO);

		return "forward:/uss/sam/stp/StplatListInqire.do";
	}

}
