package com.company.project.api.controller.main;

import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.RequestMapping;
import jakarta.annotation.PostConstruct;
import java.util.ArrayList;
import java.util.List;

/**
 * 메인 ?이지 조회??한 컨트롤러
 * ?자?? ?레?워???환?과 ?합 ??보??기능???행
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
     * 메인 ?이지 (?합 ??보?? 조회
     */
    @RequestMapping({ "/", "/cmm/main/mainPage", "/cmm/main/mainPage.do" })
    public String mainPage(Model model, HttpSession session) throws Exception {
        // ?무 게시??(BBSMSTR_CCCCCCCCCCCC 기?, ?제 ?경??맞게 조정 ?요)
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

        // 공? ?항 (BBSMSTR_AAAAAAAAAAAA 기?, ?제 ?경??맞게 조정 ?요)
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