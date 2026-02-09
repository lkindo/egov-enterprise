package egovframework.com.uss.olh.qna.web;

import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.company.project.service.qna.EgovQnaService;
import com.company.project.service.qna.dto.QnaDto;
import com.company.project.web.adapter.QnaAdapter;

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.service.CmmnDetailCode;
import egovframework.com.cmm.service.EgovCmmUseService;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.uss.olh.qna.service.QnaDefaultVO;
import egovframework.com.uss.olh.qna.service.QnaVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * Q&A Controller (JPA 전환)
 */
@Controller
@RequiredArgsConstructor
public class EgovQnaController {

	private final EgovQnaService egovQnaService;

	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	@Resource(name = "EgovCmmUseService")
	private EgovCmmUseService cmmUseService;

	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/**
	 * Q&A 목록 조회
	 */
	@IncludedInfo(name = "Q&A관리", order = 550, gid = 50)
	@RequestMapping(value = "/uss/olh/qna/selectQnaList.do")
	public String selectQnaList(@ModelAttribute("searchVO") QnaVO searchVO, ModelMap model) throws Exception {

		searchVO.setPageUnit(propertiesService.getInt("pageUnit"));
		searchVO.setPageSize(propertiesService.getInt("pageSize"));

		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(searchVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());
		paginationInfo.setPageSize(searchVO.getPageSize());

		int pageIndex = searchVO.getPageIndex() > 0 ? searchVO.getPageIndex() - 1 : 0;
		Page<QnaDto> pageResult = egovQnaService.getQnaList(
				searchVO.getSearchWrd(),
				PageRequest.of(pageIndex, searchVO.getPageUnit(), Sort.by(Sort.Direction.DESC, "frstRegisterPnttm")));

		List<QnaVO> resultList = pageResult.stream()
				.map(QnaAdapter::toVO)
				.collect(Collectors.toList());

		model.addAttribute("resultList", resultList);

		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		model.addAttribute("certificationAt", isAuthenticated ? "Y" : "N");

		paginationInfo.setTotalRecordCount((int) pageResult.getTotalElements());
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/uss/olh/qna/EgovQnaList";
	}

	/**
	 * Q&A 상세 조회
	 */
	@RequestMapping("/uss/olh/qna/selectQnaDetail.do")
	public String selectQnaDetail(@RequestParam("qaId") String qaId, QnaVO qnaVO,
			@ModelAttribute("searchVO") QnaDefaultVO searchVO, ModelMap model) throws Exception {

		egovQnaService.increaseViewCount(qaId);

		QnaDto dto = egovQnaService.getQna(qaId);
		QnaVO vo = QnaAdapter.toVO(dto);
		model.addAttribute("result", vo);

		return "egovframework/com/uss/olh/qna/EgovQnaDetail";
	}

	/**
	 * Q&A 등록 화면
	 */
	@RequestMapping("/uss/olh/qna/insertQnaView.do")
	public String insertQnaView(@ModelAttribute("searchVO") QnaVO searchVO, QnaVO qnaVO, Model model) throws Exception {

		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (!isAuthenticated) {
			model.addAttribute("qnaVO", qnaVO);
			return "egovframework/com/uss/olh/qna/EgovQnaRegist";
		}

		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		qnaVO.setWrterNm(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getName()));
		qnaVO.setEmailAdres(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getEmail()));
		model.addAttribute("qnaVO", qnaVO);

		return "egovframework/com/uss/olh/qna/EgovQnaRegist";
	}

	/**
	 * Q&A 등록
	 */
	@RequestMapping("/uss/olh/qna/insertQna.do")
	public String insertQna(@ModelAttribute("searchVO") QnaVO searchVO, @Valid @ModelAttribute("qnaVO") QnaVO qnaVO,
			BindingResult bindingResult, ModelMap model) throws Exception {

		if (bindingResult.hasErrors()) {
			return "egovframework/com/uss/olh/qna/EgovQnaRegist";
		}

		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		String userId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());

		QnaDto dto = QnaAdapter.toDto(qnaVO);
		egovQnaService.createQna(userId, dto);

		return "forward:/uss/olh/qna/selectQnaList.do";
	}

	/**
	 * Q&A 수정 화면
	 */
	@RequestMapping("/uss/olh/qna/updateQnaView.do")
	public String updateQnaView(QnaVO qnaVO, @ModelAttribute("searchVO") QnaVO searchVO, ModelMap model)
			throws Exception {

		QnaDto dto = egovQnaService.getQna(qnaVO.getQaId());
		QnaVO vo = QnaAdapter.toVO(dto);
		model.addAttribute("qnaVO", vo);

		return "egovframework/com/uss/olh/qna/EgovQnaUpdt";
	}

	/**
	 * Q&A 수정
	 */
	@RequestMapping("/uss/olh/qna/updateQna.do")
	public String updateQna(@ModelAttribute("searchVO") QnaVO searchVO,
			@ModelAttribute("qnaVO") QnaVO qnaVO, BindingResult bindingResult) throws Exception {

		if (bindingResult.hasErrors()) {
			return "egovframework/com/uss/olh/qna/EgovQnaUpdt";
		}

		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		String userId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());

		QnaDto dto = QnaAdapter.toDto(qnaVO);
		egovQnaService.updateQna(qnaVO.getQaId(), userId, dto);

		return "forward:/uss/olh/qna/selectQnaList.do";
	}

	/**
	 * Q&A 삭제
	 */
	@RequestMapping("/uss/olh/qna/deleteQna.do")
	public String deleteQna(QnaVO qnaVO, @ModelAttribute("searchVO") QnaVO searchVO) throws Exception {

		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		String userId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());

		egovQnaService.deleteQna(qnaVO.getQaId(), userId);

		return "forward:/uss/olh/qna/selectQnaList.do";
	}

	/**
	 * Q&A 답변 목록 조회
	 */
	@IncludedInfo(name = "Q&A답변관리", order = 551, gid = 50)
	@RequestMapping(value = { "/uss/olh/qna/selectQnaAnswerList.do", "/uss/olh/qna/EgovQnaAnswerList.do" })
	public String selectQnaAnswerList(@ModelAttribute("searchVO") QnaVO searchVO, ModelMap model) throws Exception {

		searchVO.setPageUnit(propertiesService.getInt("pageUnit"));
		searchVO.setPageSize(propertiesService.getInt("pageSize"));

		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(searchVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());
		paginationInfo.setPageSize(searchVO.getPageSize());

		int pageIndex = searchVO.getPageIndex() > 0 ? searchVO.getPageIndex() - 1 : 0;
		Page<QnaDto> pageResult = egovQnaService.getQnaList(
				searchVO.getSearchWrd(),
				PageRequest.of(pageIndex, searchVO.getPageUnit(), Sort.by(Sort.Direction.DESC, "frstRegisterPnttm")));

		List<QnaVO> resultList = pageResult.stream()
				.map(QnaAdapter::toVO)
				.collect(Collectors.toList());

		model.addAttribute("resultList", resultList);
		paginationInfo.setTotalRecordCount((int) pageResult.getTotalElements());
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/uss/olh/qna/EgovQnaAnswerList";
	}

	/**
	 * Q&A 답변 상세 조회
	 */
	@RequestMapping("/uss/olh/qna/selectQnaAnswerDetail.do")
	public String selectQnaAnswerDetail(QnaVO qnaVO, @ModelAttribute("searchVO") QnaVO searchVO, ModelMap model)
			throws Exception {

		QnaDto dto = egovQnaService.getQna(qnaVO.getQaId());
		QnaVO vo = QnaAdapter.toVO(dto);
		model.addAttribute("result", vo);

		return "egovframework/com/uss/olh/qna/EgovQnaAnswerDetail";
	}

	/**
	 * Q&A 답변 수정 화면
	 */
	@RequestMapping("/uss/olh/qna/updateQnaAnswerView.do")
	public String updateQnaAnswerView(QnaVO qnaVO, @ModelAttribute("searchVO") QnaVO searchVO, ModelMap model)
			throws Exception {

		ComDefaultCodeVO vo = new ComDefaultCodeVO();
		vo.setCodeId("COM028");
		List<CmmnDetailCode> qnaProcessSttusCode = cmmUseService.selectCmmCodeDetail(vo);
		model.addAttribute("qnaProcessSttusCode", qnaProcessSttusCode);

		QnaDto dto = egovQnaService.getQna(qnaVO.getQaId());
		QnaVO resultVO = QnaAdapter.toVO(dto);
		model.addAttribute("qnaVO", resultVO);

		return "egovframework/com/uss/olh/qna/EgovQnaAnswerUpdt";
	}

	/**
	 * Q&A 답변 수정
	 */
	@RequestMapping("/uss/olh/qna/updateQnaAnswer.do")
	public String updateQnaAnswer(QnaVO qnaVO, @ModelAttribute("searchVO") QnaVO searchVO) throws Exception {

		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		String userId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());

		egovQnaService.updateAnswer(qnaVO.getQaId(), userId, qnaVO.getAnswerCn());

		return "forward:/uss/olh/qna/selectQnaAnswerList.do";
	}
}
