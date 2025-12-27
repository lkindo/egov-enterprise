package com.company.project.api.controller.board;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import com.company.project.service.board.dto.BoardDto;
import egovframework.com.cmm.ComDefaultVO;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 레거시 JSP 게시판 컨트롤러
 * eGovFrame 샘플 화면과 호환
 */
@Controller
public class LegacyBoardController {

    private final com.company.project.service.board.EgovBoardService boardService;

    public LegacyBoardController(com.company.project.service.board.EgovBoardService boardService) {
        this.boardService = boardService;
    }

    @GetMapping("/cop/bbs/debugBoardList.do")
    @ResponseBody
    public Map<String, Object> debugBoardList(@RequestParam(required = false) String bbsId) {
        Map<String, Object> result = new HashMap<>();

        if (bbsId == null || bbsId.isEmpty()) {
            bbsId = "BBSMSTR_AAAAAAAAAAAA";
        }

        // 실제 서비스 호출
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(0, 10);
        org.springframework.data.domain.Page<com.company.project.service.board.dto.BoardDto> page = boardService
                .getBoardPosts(bbsId, pageable);

        // 게시판 정보
        result.put("bbsId", bbsId);
        result.put("bbsNm", getBoardName(bbsId));
        result.put("resultList", page.getContent());
        result.put("totalCount", page.getTotalElements());

        return result;
    }

    /**
     * 게시판 목록 조회
     */
    @RequestMapping("/cop/bbs/selectArticleList.do")
    public String selectArticleList(
            @ModelAttribute("searchVO") ComDefaultVO searchVO,
            @RequestParam(required = false) String bbsId,
            Model model) {

        if (bbsId == null || bbsId.isEmpty()) {
            bbsId = "BBSMSTR_AAAAAAAAAAAA";
        }
        searchVO.setSearchCondition(bbsId); // bbsId를 검색 조건으로 활용하기도 함

        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest
                .of(searchVO.getPageIndex() - 1, searchVO.getPageUnit());
        org.springframework.data.domain.Page<BoardDto> page = boardService.getBoardPosts(bbsId, pageable);

        // 페이징 정보
        PaginationInfo paginationInfo = new PaginationInfo();
        paginationInfo.setCurrentPageNo(searchVO.getPageIndex());
        paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());
        paginationInfo.setPageSize(searchVO.getPageSize());
        paginationInfo.setTotalRecordCount((int) page.getTotalElements());

        // 모델 속성 설정
        Map<String, Object> boardMasterVO = new HashMap<>();
        boardMasterVO.put("bbsId", bbsId);
        boardMasterVO.put("bbsNm", getBoardName(bbsId));
        boardMasterVO.put("tmplatCours", "/css/egovframework/com/com.css");

        model.addAttribute("boardMasterVO", boardMasterVO);
        model.addAttribute("brdMstrVO", boardMasterVO); // Alias for CSS link in some JSPs
        model.addAttribute("resultList", page.getContent());
        model.addAttribute("noticeList", new ArrayList<>()); // 공지사항은 일단 빈 목록
        model.addAttribute("paginationInfo", paginationInfo);

        return "cop/bbs/EgovArticleList";
    }

    /**
     * 게시글 상세 조회
     */
    @RequestMapping("/cop/bbs/selectArticleDetail.do")
    public String selectBoardArticle(
            @ModelAttribute("searchVO") ComDefaultVO searchVO,
            @RequestParam(required = false) String bbsId,
            @RequestParam(required = false) Long nttId,
            Model model) {

        BoardDto result = boardService.getPostDetail(bbsId, nttId);

        // 샘플 게시판 정보
        Map<String, Object> boardMasterVO = new HashMap<>();
        boardMasterVO.put("bbsId", bbsId);
        boardMasterVO.put("bbsNm", getBoardName(bbsId));
        boardMasterVO.put("replyPosblAt", "Y");
        boardMasterVO.put("tmplatCours", "/css/egovframework/com/com.css");

        model.addAttribute("boardMasterVO", boardMasterVO);
        model.addAttribute("brdMstrVO", boardMasterVO);
        model.addAttribute("result", result);
        model.addAttribute("sessionUniqId", "USRCNFRM_00000000001");
        model.addAttribute("useComment", "false");
        model.addAttribute("useSatisfaction", "false");

        return "cop/bbs/EgovArticleDetail";
    }

    /**
     * 게시판 이름 조회
     */
    private String getBoardName(String bbsId) {
        if ("BBSMSTR_AAAAAAAAAAAA".equals(bbsId)) {
            return "공지사항";
        } else if ("BBSMSTR_CCCCCCCCCCCC".equals(bbsId)) {
            return "업무게시판";
        }
        return "게시판";
    }

    /**
     * 페이지네이션 정보 생성
     */
    private Map<String, Object> createPaginationInfo() {
        Map<String, Object> paginationInfo = new HashMap<>();
        paginationInfo.put("currentPageNo", 1);
        paginationInfo.put("recordCountPerPage", 10);
        paginationInfo.put("pageSize", 10);
        paginationInfo.put("totalRecordCount", 3);
        paginationInfo.put("totalPageCount", 1);
        paginationInfo.put("firstPageNoOnPageList", 1);
        paginationInfo.put("lastPageNoOnPageList", 1);
        paginationInfo.put("firstRecordIndex", 0);
        paginationInfo.put("lastRecordIndex", 2);
        return paginationInfo;
    }
}
