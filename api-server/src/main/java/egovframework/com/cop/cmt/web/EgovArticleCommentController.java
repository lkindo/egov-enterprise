package egovframework.com.cop.cmt.web;

import java.util.HashMap;
import java.util.List;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.company.project.service.comment.EgovCommentService;
import com.company.project.service.comment.dto.CommentDto;
import com.company.project.web.adapter.CommentAdapter;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.cop.cmt.service.Comment;
import egovframework.com.cop.cmt.service.CommentVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * 댓글 관리를 위한 컨트롤러 클래스
 * Refactored to use EgovCommentService (JPA)
 */
@Controller
public class EgovArticleCommentController {

	@Resource(name = "egovCommentService")
	protected EgovCommentService egovCommentService;

	@Resource(name = "propertiesService")
	protected EgovPropertyService propertyService;

	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	@RequestMapping("/cop/cmt/selectArticleCommentList.do")
	public String selectArticleCommentList(@ModelAttribute("searchVO") CommentVO commentVO, ModelMap model)
			throws Exception {

		CommentVO articleCommentVO = new CommentVO();

		// 수정 처리된 후 댓글 등록 화면으로 처리되기 위한 구현
		if (commentVO.isModified()) {
			commentVO.setCommentNo("");
			commentVO.setCommentCn("");
		}

		// 수정을 위한 처리
		if (!commentVO.getCommentNo().equals("")) {
			return "forward:/cop/cmt/updateArticleCommentView.do";
		}

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (!isAuthenticated) {
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		model.addAttribute("sessionUniqId", user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));

		commentVO.setWrterNm(user == null ? "" : EgovStringUtil.isNullToString(user.getName()));

		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(commentVO.getSubPageIndex());

		// Legacy property handling or default
		int pageUnit = propertyService.getInt("pageUnit");
		int pageSize = propertyService.getInt("pageSize");

		paginationInfo.setRecordCountPerPage(commentVO.getSubPageUnit() > 0 ? commentVO.getSubPageUnit() : pageUnit);
		paginationInfo.setPageSize(commentVO.getSubPageSize() > 0 ? commentVO.getSubPageSize() : pageSize);

		commentVO.setSubFirstIndex(paginationInfo.getFirstRecordIndex());
		commentVO.setSubLastIndex(paginationInfo.getLastRecordIndex());
		commentVO.setSubRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		// JPA Service Call
		PageRequest pageable = PageRequest.of(paginationInfo.getCurrentPageNo() - 1,
				paginationInfo.getRecordCountPerPage(), Sort.Direction.DESC, "id");

		Page<CommentDto> pageResult = egovCommentService.getCommentList(commentVO.getBbsId(), commentVO.getNttId(),
				pageable);

		int totCnt = (int) pageResult.getTotalElements();
		List<CommentVO> resultList = CommentAdapter.toVOList(pageResult.getContent());

		paginationInfo.setTotalRecordCount(totCnt);

		model.addAttribute("resultList", resultList);
		model.addAttribute("resultCnt", totCnt);
		model.addAttribute("paginationInfo", paginationInfo);
		model.addAttribute("type", "body");

		model.addAttribute("articleCommentVO", articleCommentVO);

		commentVO.setCommentCn("");

		return "egovframework/com/cop/cmt/EgovArticleCommentList";
	}

	@RequestMapping("/cop/cmt/insertArticleComment.do")
	public String insertArticleComment(@ModelAttribute("searchVO") CommentVO commentVO,
			@Valid @ModelAttribute("comment") Comment comment,
			BindingResult bindingResult, ModelMap model, @RequestParam HashMap<String, String> map) throws Exception {

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (bindingResult.hasErrors()) {
			model.addAttribute("msg", "댓글내용은 필수 입력값입니다.");
			return "forward:/cop/bbs/selectArticleDetail.do";
		}

		if (isAuthenticated) {
			String userId = user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId());
			String userName = user == null ? "" : EgovStringUtil.isNullToString(user.getName());

			comment.setFrstRegisterId(userId);
			comment.setWrterId(userId);
			comment.setWrterNm(userName);

			CommentDto dto = CommentAdapter.toDto(comment);
			egovCommentService.createComment(userId, dto);

			commentVO.setCommentCn("");
			commentVO.setCommentNo("");
		}

		String chkBlog = map.get("blogAt");

		if ("Y".equals(chkBlog)) {
			return "forward:/cop/bbs/selectArticleBlogList.do";
		} else {
			return "forward:/cop/bbs/selectArticleDetail.do";
		}
	}

	@RequestMapping("/cop/cmt/deleteArticleComment.do")
	public String deleteArticleComment(@ModelAttribute("searchVO") CommentVO commentVO,
			@ModelAttribute("comment") Comment comment,
			ModelMap model, @RequestParam HashMap<String, String> map) throws Exception {

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (isAuthenticated) {
			String userId = user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId());
			Long commentId = Long.parseLong(commentVO.getCommentNo());
			egovCommentService.deleteComment(commentId, userId);
		}

		commentVO.setCommentCn("");
		commentVO.setCommentNo("");

		String chkBlog = map.get("blogAt");

		if ("Y".equals(chkBlog)) {
			return "forward:/cop/bbs/selectArticleBlogList.do";
		} else {
			return "forward:/cop/bbs/selectArticleDetail.do";
		}
	}

	@RequestMapping("/cop/cmt/updateArticleCommentView.do")
	public String updateArticleCommentView(@ModelAttribute("searchVO") CommentVO commentVO, ModelMap model)
			throws Exception {

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (!isAuthenticated) {
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		CommentVO articleCommentVO = new CommentVO();

		commentVO.setWrterNm(user == null ? "" : EgovStringUtil.isNullToString(user.getName()));

		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(commentVO.getSubPageIndex());

		int pageUnit = propertyService.getInt("pageUnit");
		int pageSize = propertyService.getInt("pageSize");
		paginationInfo.setRecordCountPerPage(commentVO.getSubPageUnit() > 0 ? commentVO.getSubPageUnit() : pageUnit);
		paginationInfo.setPageSize(commentVO.getSubPageSize() > 0 ? commentVO.getSubPageSize() : pageSize);

		commentVO.setSubFirstIndex(paginationInfo.getFirstRecordIndex());
		commentVO.setSubLastIndex(paginationInfo.getLastRecordIndex());
		commentVO.setSubRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		// List
		PageRequest pageable = PageRequest.of(paginationInfo.getCurrentPageNo() - 1,
				paginationInfo.getRecordCountPerPage(), Sort.Direction.DESC, "id");
		Page<CommentDto> pageResult = egovCommentService.getCommentList(commentVO.getBbsId(), commentVO.getNttId(),
				pageable);

		int totCnt = (int) pageResult.getTotalElements();
		List<CommentVO> resultList = CommentAdapter.toVOList(pageResult.getContent());

		paginationInfo.setTotalRecordCount(totCnt);

		model.addAttribute("resultList", resultList);
		model.addAttribute("resultCnt", totCnt);
		model.addAttribute("paginationInfo", paginationInfo);
		model.addAttribute("type", "body");

		// Detail for Edit
		if (commentVO.getCommentNo() != null && !commentVO.getCommentNo().isEmpty()) {
			try {
				Long commentId = Long.parseLong(commentVO.getCommentNo());
				CommentDto dto = egovCommentService.getComment(commentId);
				if (dto != null) {
					articleCommentVO = CommentAdapter.toVO(dto);
				}
			} catch (NumberFormatException e) {
				// ignore
			}
		}

		model.addAttribute("articleCommentVO", articleCommentVO);

		return "egovframework/com/cop/cmt/EgovArticleCommentList";
	}

	@RequestMapping("/cop/cmt/updateArticleComment.do")
	public String updateArticleComment(@ModelAttribute("searchVO") CommentVO commentVO,
			@Valid @ModelAttribute("comment") Comment comment,
			BindingResult bindingResult, ModelMap model) throws Exception {

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (bindingResult.hasErrors()) {
			model.addAttribute("msg", "내용은 필수 입력 값입니다.");
			return "forward:/cop/bbs/selectArticleDetail.do";
		}

		if (isAuthenticated) {
			String userId = user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId());
			Long commentId = Long.parseLong(comment.getCommentNo()); // Legacy Comment has setCommentNo?

			egovCommentService.updateComment(commentId, comment.getCommentCn(), userId);

			commentVO.setCommentCn("");
			commentVO.setCommentNo("");
		}

		return "forward:/cop/bbs/selectArticleDetail.do";
	}
}
