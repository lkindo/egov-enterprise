package egovframework.com.uss.sam.stp.web;

import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.company.project.service.terms.EgovTermsService;
import com.company.project.service.terms.dto.TermsDto;
import com.company.project.web.adapter.TermsAdapter;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.uss.sam.stp.service.StplatManageDefaultVO;
import egovframework.com.uss.sam.stp.service.StplatManageVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import lombok.RequiredArgsConstructor;

/**
 * 약관내용을 처리하는 비즈니스 구현 클래스
 * Refactored to use EgovTermsService (JPA)
 */
@Controller
@RequiredArgsConstructor
public class EgovStplatManageController {

	private final EgovTermsService egovTermsService;

	/** EgovPropertyService */
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	/** EgovMessageSource */
	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/**
	 * 개별 배포시 메인메뉴를 조회한다.
	 */
	@RequestMapping(value = "/uss/sam/stp/EgovMain.do")
	public String egovMain(ModelMap model) throws Exception {
		return "egovframework/com/uss/sam/stp/EgovMain";
	}

	/**
	 * 메뉴를 조회한다.
	 */
	@RequestMapping(value = "/uss/sam/stp/EgovLeft.do")
	public String egovLeft(ModelMap model) throws Exception {
		return "egovframework/com/uss/sam/stp/EgovLeft";
	}

	/**
	 * 약관정보 목록을 조회한다.
	 */
	@IncludedInfo(name = "약관관리", order = 490, gid = 50)
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

		// JPA Pagination
		Pageable pageable = PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getPageSize(),
				Sort.by(Sort.Direction.DESC, "createdDate"));
		Page<TermsDto> pageResult = egovTermsService.getTermsList(pageable);

		List<StplatManageVO> resultList = pageResult.stream()
				.map(TermsAdapter::toVO)
				.collect(Collectors.toList());

		model.addAttribute("resultList", resultList);

		int totCnt = (int) pageResult.getTotalElements();
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/uss/sam/stp/EgovStplatListInqire";
	}

	/**
	 * 약관정보상세내용을 조회한다.
	 */
	@RequestMapping("/uss/sam/stp/StplatDetailInqire.do")
	public String selectStplatDetail(StplatManageVO stplatManageVO,
			@ModelAttribute("searchVO") StplatManageDefaultVO searchVO, ModelMap model) throws Exception {

		TermsDto dto = egovTermsService.getTerms(stplatManageVO.getUseStplatId());
		StplatManageVO vo = TermsAdapter.toVO(dto);

		model.addAttribute("result", vo);

		return "egovframework/com/uss/sam/stp/EgovStplatDetailInqire";
	}

	/**
	 * 약관정보를 등록하기 위한 전 처리
	 */
	@RequestMapping("/uss/sam/stp/StplatCnRegistView.do")
	public String insertStplatCnView(@ModelAttribute("searchVO") StplatManageDefaultVO searchVO, Model model)
			throws Exception {
		model.addAttribute("stplatManageVO", new StplatManageVO());
		return "egovframework/com/uss/sam/stp/EgovStplatCnRegist";
	}

	/**
	 * 약관정보를 등록한다.
	 */
	@RequestMapping("/uss/sam/stp/StplatCnRegist.do")
	public String insertStplatCn(@ModelAttribute("searchVO") StplatManageDefaultVO searchVO,
			@ModelAttribute("stplatManageVO") StplatManageVO stplatManageVO, BindingResult bindingResult,
			ModelMap model) throws Exception {

		if (bindingResult.hasErrors()) {
			return "egovframework/com/uss/sam/stp/EgovStplatCnRegist";
		}

		// 로그인VO에서 사용자 정보 가져오기
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (!isAuthenticated) {
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		String frstRegisterId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());

		// Adapter usage
		TermsDto dto = TermsAdapter.toDto(stplatManageVO);
		egovTermsService.createTerms(frstRegisterId, dto);

		return "forward:/uss/sam/stp/StplatListInqire.do";
	}

	/**
	 * 약관정보를 수정하기 위한 전 처리
	 */
	@RequestMapping("/uss/sam/stp/StplatCnUpdtView.do")
	public String updateStplatCnView(@RequestParam("useStplatId") String useStplatId,
			@ModelAttribute("searchVO") StplatManageDefaultVO searchVO, ModelMap model) throws Exception {

		TermsDto dto = egovTermsService.getTerms(useStplatId);
		StplatManageVO vo = TermsAdapter.toVO(dto);

		model.addAttribute("stplatManageVO", vo);

		return "egovframework/com/uss/sam/stp/EgovStplatCnUpdt";
	}

	/**
	 * 약관정보를 수정 처리한다.
	 */
	@RequestMapping("/uss/sam/stp/StplatCnUpdt.do")
	public String updateStplatCn(@ModelAttribute("searchVO") StplatManageDefaultVO searchVO,
			@ModelAttribute("stplatManageVO") StplatManageVO stplatManageVO, BindingResult bindingResult)
			throws Exception {

		if (bindingResult.hasErrors()) {
			return "egovframework/com/uss/sam/stp/EgovStplatCnUpdt";
		}

		// 로그인VO에서 사용자 정보 가져오기
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (!isAuthenticated) {
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		String lastUpdusrId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());

		TermsDto dto = TermsAdapter.toDto(stplatManageVO);
		egovTermsService.updateTerms(stplatManageVO.getUseStplatId(), lastUpdusrId, dto);

		return "forward:/uss/sam/stp/StplatListInqire.do";
	}

	/**
	 * 약관정보를 삭제 처리한다.
	 */
	@RequestMapping("/uss/sam/stp/StplatCnDelete.do")
	public String deleteStplatCn(StplatManageVO stplatManageVO,
			@ModelAttribute("searchVO") StplatManageDefaultVO searchVO) throws Exception {

		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		String userId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());

		egovTermsService.deleteTerms(stplatManageVO.getUseStplatId(), userId);

		return "forward:/uss/sam/stp/StplatListInqire.do";
	}

}
