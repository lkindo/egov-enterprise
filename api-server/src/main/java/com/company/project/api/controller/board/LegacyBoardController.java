package com.company.project.api.controller.board;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

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

    /**
     * 게시판 목록 조회
     */
    @GetMapping("/cop/bbs/selectBoardList.do")
    public String selectBoardList(
            @RequestParam(required = false) String bbsId,
            @RequestParam(required = false) String baseMenuNo,
            Model model) {

        // 샘플 게시판 마스터 정보 (brdMstrVO)
        Map<String, Object> brdMstrVO = new HashMap<>();
        brdMstrVO.put("bbsId", bbsId);
        brdMstrVO.put("bbsNm", getBoardName(bbsId));
        brdMstrVO.put("bbsTyCode", "BBST01");
        brdMstrVO.put("bbsAttrbCode", "BBSA02");
        brdMstrVO.put("replyPosblAt", "Y");
        brdMstrVO.put("fileAtchPosblAt", "Y");
        brdMstrVO.put("posblAtchFileNumber", 3);
        brdMstrVO.put("authFlag", "N");

        // 검색 조건 (searchVO)
        Map<String, Object> searchVO = new HashMap<>();
        searchVO.put("searchCnd", "0");
        searchVO.put("searchWrd", "");
        searchVO.put("pageIndex", 1);
        searchVO.put("pageSize", 10);

        // 샘플 게시판 정보
        Map<String, Object> boardVO = new HashMap<>();
        boardVO.put("bbsId", bbsId);
        boardVO.put("bbsNm", getBoardName(bbsId));
        boardVO.put("bbsTyCode", "BBST01");
        boardVO.put("replyPosblAt", "Y");
        boardVO.put("fileAtchPosblAt", "Y");
        boardVO.put("posblAtchFileNumber", 3);
        boardVO.put("posblAtchFileSize", "5242880");
        boardVO.put("searchCnd", "0");
        boardVO.put("searchWrd", "");
        boardVO.put("pageIndex", 1);

        // 샘플 게시글 목록
        List<Map<String, Object>> resultList = new ArrayList<>();

        Map<String, Object> post1 = new HashMap<>();
        post1.put("nttId", 1);
        post1.put("nttNo", 1);
        post1.put("bbsId", bbsId);
        post1.put("nttSj", "샘플 게시글 1 - " + getBoardName(bbsId));
        post1.put("frstRegisterNm", "관리자");
        post1.put("frstRegisterPnttm", "2025-12-23");
        post1.put("inqireCo", 10);
        post1.put("replyLc", 0);
        post1.put("useAt", "Y");
        post1.put("isExpired", "N");
        resultList.add(post1);

        Map<String, Object> post2 = new HashMap<>();
        post2.put("nttId", 2);
        post2.put("nttNo", 2);
        post2.put("bbsId", bbsId);
        post2.put("nttSj", "샘플 게시글 2 - 테스트 내용");
        post2.put("frstRegisterNm", "홍길동");
        post2.put("frstRegisterPnttm", "2025-12-22");
        post2.put("inqireCo", 5);
        post2.put("replyLc", 0);
        post2.put("useAt", "Y");
        post2.put("isExpired", "N");
        resultList.add(post2);

        Map<String, Object> post3 = new HashMap<>();
        post3.put("nttId", 3);
        post3.put("nttNo", 3);
        post3.put("bbsId", bbsId);
        post3.put("nttSj", "샘플 게시글 3 - 추가 정보");
        post3.put("frstRegisterNm", "김철수");
        post3.put("frstRegisterPnttm", "2025-12-21");
        post3.put("inqireCo", 3);
        post3.put("replyLc", 0);
        post3.put("useAt", "Y");
        post3.put("isExpired", "N");
        resultList.add(post3);

        model.addAttribute("brdMstrVO", brdMstrVO);
        model.addAttribute("searchVO", searchVO);
        model.addAttribute("boardVO", boardVO);
        model.addAttribute("resultList", resultList);
        model.addAttribute("resultCnt", resultList.size());
        model.addAttribute("paginationInfo", createPaginationInfo());

        return "cop/bbs/EgovNoticeList";
    }

    /**
     * 게시글 상세 조회
     */
    @GetMapping("/cop/bbs/selectBoardArticle.do")
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
