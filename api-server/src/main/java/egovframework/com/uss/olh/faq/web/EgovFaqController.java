package egovframework.com.uss.olh.faq.web;

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
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;

import com.company.project.service.faq.EgovFaqService;
import com.company.project.service.faq.dto.FaqDto;
import com.company.project.web.adapter.FaqAdapter;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.service.EgovFileMngService;
import egovframework.com.cmm.service.EgovFileMngUtil;
import egovframework.com.cmm.service.FileVO;
import egovframework.com.cmm.service.Globals;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.uss.olh.faq.service.FaqVO;
import jakarta.annotation.Resource;
import lombok.RequiredArgsConstructor;

/**
 * FAQ Controller (JPA 전환)
 */
@Controller
@RequiredArgsConstructor
public class EgovFaqController {

	private final EgovFaqService egovFaqService;

	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	@Resource(name = "EgovFileMngService")
	private EgovFileMngService fileMngService;

	@Resource(name = "EgovFileMngUtil")
	private EgovFileMngUtil fileUtil;

	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/**
	 * FAQ 목록 조회
	 */
	@IncludedInfo(name = "FAQ관리", order = 540, gid = 50)
	@RequestMapping(value = "/uss/olh/faq/selectFaqList.do")
	public String selectFaqList(@ModelAttribute("searchVO") FaqVO searchVO, ModelMap model) throws Exception {

		searchVO.setPageUnit(propertiesService.getInt("pageUnit"));
		searchVO.setPageSize(propertiesService.getInt("pageSize"));

		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(searchVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());
		paginationInfo.setPageSize(searchVO.getPageSize());

		// JPA 페이징 적용
		int pageIndex = searchVO.getPageIndex() > 0 ? searchVO.getPageIndex() - 1 : 0;
		Page<FaqDto> pageResult = egovFaqService.getFaqList(
				searchVO.getSearchWrd(),
				PageRequest.of(pageIndex, searchVO.getPageUnit(), Sort.by(Sort.Direction.DESC, "frstRegisterPnttm")));

		List<FaqVO> resultList = pageResult.stream()
				.map(FaqAdapter::toVO)
				.collect(Collectors.toList());

		model.addAttribute("resultList", resultList);
		paginationInfo.setTotalRecordCount((int) pageResult.getTotalElements());
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/uss/olh/faq/EgovFaqList";
	}

	/**
	 * FAQ 상세 조회
	 */
	@RequestMapping("/uss/olh/faq/selectFaqDetail.do")
	public String selectFaqDetail(FaqVO faqVO, @ModelAttribute("searchVO") FaqVO searchVO, ModelMap model)
			throws Exception {

		// 조회수 증가
		egovFaqService.increaseViewCount(searchVO.getFaqId());

		FaqDto dto = egovFaqService.getFaq(searchVO.getFaqId());
		FaqVO vo = FaqAdapter.toVO(dto);
		model.addAttribute("result", vo);

		return "egovframework/com/uss/olh/faq/EgovFaqDetail";
	}

	/**
	 * FAQ 등록 화면
	 */
	@RequestMapping("/uss/olh/faq/insertFaqView.do")
	public String insertFaqView(@ModelAttribute("searchVO") FaqVO searchVO, Model model) throws Exception {

		model.addAttribute("faqVO", new FaqVO());

		String whiteListFileUploadExtensions = Globals.FILE_UP_EXTS;
		String fileUploadMaxSize = Globals.FILE_UP_MAX_SIZE;

		model.addAttribute("fileUploadExtensions", whiteListFileUploadExtensions);
		model.addAttribute("fileUploadMaxSize", fileUploadMaxSize);

		return "egovframework/com/uss/olh/faq/EgovFaqRegist";
	}

	/**
	 * FAQ 등록
	 */
	@RequestMapping("/uss/olh/faq/insertFaq.do")
	public String insertFaqCn(final MultipartHttpServletRequest multiRequest,
			@ModelAttribute("searchVO") FaqVO searchVO, @ModelAttribute("faqManageVO") FaqVO faqVO,
			BindingResult bindingResult) throws Exception {

		if (bindingResult.hasErrors()) {
			return "egovframework/com/uss/olh/faq/EgovFaqRegist";
		}

		List<FileVO> fvoList = null;
		String atchFileId = "";

		final List<MultipartFile> files = multiRequest.getFiles("file_1");
		if (!files.isEmpty()) {
			fvoList = fileUtil.parseFileInf(files, "FAQ_", 0, "", "");
			atchFileId = fileMngService.insertFileInfs(fvoList);
		}

		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		String userId = loginVO == null ? "" : loginVO.getUniqId();

		// JPA 서비스 호출
		FaqDto dto = FaqDto.builder()
				.qestnSj(faqVO.getQestnSj())
				.qestnCn(faqVO.getQestnCn())
				.answerCn(faqVO.getAnswerCn())
				.atchFileId(atchFileId)
				.build();
		egovFaqService.createFaq(userId, dto);

		return "forward:/uss/olh/faq/selectFaqList.do";
	}

	/**
	 * FAQ 수정 화면
	 */
	@RequestMapping("/uss/olh/faq/updateFaqView.do")
	public String updateFaqView(@RequestParam("faqId") String faqId, @ModelAttribute("searchVO") FaqVO searchVO,
			ModelMap model) throws Exception {

		FaqDto dto = egovFaqService.getFaq(faqId);
		FaqVO faqVO = FaqAdapter.toVO(dto);
		model.addAttribute("faqVO", faqVO);

		String whiteListFileUploadExtensions = Globals.FILE_UP_EXTS;
		String fileUploadMaxSize = Globals.FILE_UP_MAX_SIZE;

		model.addAttribute("fileUploadExtensions", whiteListFileUploadExtensions);
		model.addAttribute("fileUploadMaxSize", fileUploadMaxSize);

		return "egovframework/com/uss/olh/faq/EgovFaqUpdt";
	}

	/**
	 * FAQ 수정
	 */
	@RequestMapping("/uss/olh/faq/updateFaq.do")
	public String updateFaqCn(final MultipartHttpServletRequest multiRequest,
			@ModelAttribute("searchVO") FaqVO searchVO, @ModelAttribute("faqVO") FaqVO faqVO,
			BindingResult bindingResult, ModelMap model) throws Exception {

		if (bindingResult.hasErrors()) {
			return "egovframework/com/uss/olh/faq/EgovFaqUpdt";
		}

		String atchFileId = faqVO.getAtchFileId();

		final List<MultipartFile> files = multiRequest.getFiles("file_1");
		if (!files.isEmpty()) {
			if (atchFileId == null || "".equals(atchFileId)) {
				List<FileVO> result = fileUtil.parseFileInf(files, "FAQ_", 0, atchFileId, "");
				atchFileId = fileMngService.insertFileInfs(result);
			} else {
				FileVO fvo = new FileVO();
				fvo.setAtchFileId(atchFileId);
				int cnt = fileMngService.getMaxFileSN(fvo);
				List<FileVO> fvoList = fileUtil.parseFileInf(files, "FAQ_", cnt, atchFileId, "");
				fileMngService.updateFileInfs(fvoList);
			}
		}

		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		String userId = loginVO == null ? "" : loginVO.getUniqId();

		// JPA 서비스 호출
		FaqDto dto = FaqDto.builder()
				.qestnSj(faqVO.getQestnSj())
				.qestnCn(faqVO.getQestnCn())
				.answerCn(faqVO.getAnswerCn())
				.atchFileId(atchFileId)
				.build();
		egovFaqService.updateFaq(faqVO.getFaqId(), userId, dto);

		return "forward:/uss/olh/faq/selectFaqList.do";
	}

	/**
	 * FAQ 삭제
	 */
	@RequestMapping("/uss/olh/faq/deleteFaq.do")
	public String deleteFaq(FaqVO faqVO, @ModelAttribute("searchVO") FaqVO searchVO) throws Exception {

		String atchFileId = faqVO.getAtchFileId();

		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		String userId = loginVO == null ? "" : loginVO.getUniqId();

		egovFaqService.deleteFaq(faqVO.getFaqId(), userId);

		// 첨부파일 삭제
		if (atchFileId != null && !atchFileId.isEmpty()) {
			FileVO fvo = new FileVO();
			fvo.setAtchFileId(atchFileId);
			fileMngService.deleteAllFileInf(fvo);
		}

		return "forward:/uss/olh/faq/selectFaqList.do";
	}
}
