package com.company.project.api.controller.board;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

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
     * egovframework.let.cop.bbs.web.EgovBBSManageController와 중복되어 주석 처리
     */
    // @GetMapping("/cop/bbs/selectBoardList.do")
    public String selectBoardList(
            @RequestParam(required = false) String bbsId,
            @RequestParam(required = false) String baseMenuNo,
            Model model) {
        return "cop/bbs/EgovNoticeList";
    }

    /**
     * 게시글 상세 조회
     * egovframework.let.cop.bbs.web.EgovBBSManageController와 중복되어 주석 처리
     */
    // @GetMapping("/cop/bbs/selectBoardArticle.do")
    public String selectBoardArticle(
            @RequestParam(required = false) String bbsId,
            @RequestParam(required = false) Long nttId,
            Model model) {

        // 샘플 게시판 정보
        Map<String, Object> boardVO = new HashMap<>();
        boardVO.put("bbsId", bbsId);
        boardVO.put("bbsNm", getBoardName(bbsId));
        boardVO.put("nttId", nttId);
        boardVO.put("nttSj", "샘플 게시글 상세 - " + getBoardName(bbsId));
        boardVO.put("nttCn", "이것은 샘플 게시글의 상세 내용입니다.\n\n표준프레임워크 경량환경 샘플 페이지입니다.");
        boardVO.put("frstRegisterNm", "관리자");
        boardVO.put("frstRegisterPnttm", "2025-12-23");
        boardVO.put("inqireCo", 15);
        boardVO.put("replyPosblAt", "Y");
        boardVO.put("fileAtchPosblAt", "Y");

        model.addAttribute("boardVO", boardVO);
        model.addAttribute("result", boardVO);
        model.addAttribute("sessionUniqId", "USRCNFRM_00000000001");

        return "cop/bbs/EgovNoticeInqire";
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
