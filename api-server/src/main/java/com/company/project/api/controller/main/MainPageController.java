package com.company.project.api.controller.main;

import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.RequestMapping;
import jakarta.annotation.PostConstruct;
import java.util.ArrayList;
import java.util.List;

/**
 * 메인 페이지 조회를 위한 컨트롤러
 * 전자정부 프레임워크 호환성과 통합 대시보드 기능을 수행
 */
@Controller
public class MainPageController {

    @jakarta.annotation.Resource(name = "egovBoardService")
    private com.company.project.service.board.EgovBoardService boardService;

    public MainPageController() {
    }

    @PostConstruct
    public void init() {
        System.out.println(">>> MainPageController BEAN CREATED <<<");
    }

    /**
     * 메인 페이지 (통합 대시보드) 조회
     */
    @RequestMapping({ "/", "/cmm/main/mainPage", "/cmm/main/mainPage.do" })
    public String mainPage(Model model, HttpSession session) throws Exception {
        // 업무 게시판 (BBSMSTR_CCCCCCCCCCCC 기준, 실제 환경에 맞게 조정 필요)
        try {
            List<com.company.project.service.board.dto.BoardDto> list = new ArrayList<>();
            try {
                org.springframework.data.domain.Page<com.company.project.service.board.dto.BoardDto> taskList = boardService
                        .getBoardPosts("BBSMSTR_CCCCCCCCCCCC", org.springframework.data.domain.PageRequest.of(0, 3));
                list.addAll(taskList.getContent());
            } catch (Exception e) {
                System.err.println("MainPage taskList fetch error: " + e.getMessage());
            }
            model.addAttribute("bbsList", list);
        } catch (Exception e) {
            model.addAttribute("bbsList", new ArrayList<>());
        }

        // 공지 사항 (BBSMSTR_AAAAAAAAAAAA 기준, 실제 환경에 맞게 조정 필요)
        try {
            List<com.company.project.service.board.dto.BoardDto> list = new ArrayList<>();
            try {
                org.springframework.data.domain.Page<com.company.project.service.board.dto.BoardDto> notiList = boardService
                        .getBoardPosts("BBSMSTR_AAAAAAAAAAAA", org.springframework.data.domain.PageRequest.of(0, 4));
                list.addAll(notiList.getContent());
            } catch (Exception e) {
                System.err.println("MainPage notiList fetch error: " + e.getMessage());
            }
            model.addAttribute("notiList", list);
        } catch (Exception e) {
            model.addAttribute("notiList", new ArrayList<>());
        }

        return "main/EgovMainView";
    }
}
