package com.company.project.api.controller.main;

import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.RequestMapping;
import jakarta.annotation.PostConstruct;
import java.util.ArrayList;
import java.util.List;

/**
 * ë©”ì¸ ?˜ì´ì§€ ì¡°íšŒë¥??„í•œ ì»¨íŠ¸ë¡¤ëŸ¬
 * ?„ìž?•ë? ?„ë ˆ?„ì›Œ???¸í™˜?±ê³¼ ?µí•© ?€?œë³´??ê¸°ëŠ¥???˜í–‰
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
     * ë©”ì¸ ?˜ì´ì§€ (?µí•© ?€?œë³´?? ì¡°íšŒ
     */
    @RequestMapping({ "/", "/cmm/main/mainPage", "/cmm/main/mainPage.do" })
    public String mainPage(Model model, HttpSession session) throws Exception {
        // ?…ë¬´ ê²Œì‹œ??(BBSMSTR_CCCCCCCCCCCC ê¸°ì?, ?¤ì œ ?˜ê²½??ë§žê²Œ ì¡°ì • ?„ìš”)
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

        // ê³µì? ?¬í•­ (BBSMSTR_AAAAAAAAAAAA ê¸°ì?, ?¤ì œ ?˜ê²½??ë§žê²Œ ì¡°ì • ?„ìš”)
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
