package com.company.project.api.controller.main;

import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 메인 페이지 및 레이아웃 컨트롤러
 * 레거시 eGovFrame 샘플 화면과 호환
 */
@Controller
public class MainPageController {

    @jakarta.annotation.Resource(name = "egovBoardService")
    private com.company.project.service.board.EgovBoardService boardService;

    public MainPageController() {
    }

    @jakarta.annotation.PostConstruct
    public void init() {
        System.out.println(">>> MainPageController BEAN CREATED <<<");
    }

    /**
     * 메인 페이지 이동
     */
    @GetMapping({ "/", "/cmm/main/mainPage.do" })
    public String mainPage(Model model, HttpSession session) throws Exception {
        // DEBUG: Print all session attributes
        System.out.println(">>> MainPageController.mainPage called");
        java.util.Enumeration<String> attributeNames = session.getAttributeNames();
        while (attributeNames.hasMoreElements()) {
            String name = attributeNames.nextElement();
            System.out.println(">>> SESSION ATTR: " + name + " = " + session.getAttribute(name));
        }
        // 오늘의 할일 (업무게시판) 데이터 조회
        try {
            List<com.company.project.service.board.dto.BoardDto> list = new ArrayList<>();
            try {
                org.springframework.data.domain.Page<com.company.project.service.board.dto.BoardDto> taskList = boardService
                        .getBoardPosts("BBSMSTR_CCCCCCCCCCCC", org.springframework.data.domain.PageRequest.of(0, 3));
                list.addAll(taskList.getContent());
                System.err.println("CHK_DEBUG: taskList fetched, size = " + list.size());
            } catch (Exception e) {
                System.err.println("CHK_DEBUG: bbsList FETCH ERROR: " + e.getMessage());
                e.printStackTrace();
            }

            // ALWAYS ADD A MOCK FOR VERIFICATION
            com.company.project.service.board.dto.BoardDto mock = com.company.project.service.board.dto.BoardDto
                    .builder()
                    .nttSj("FORCED MOCK TASK (v5)")
                    .frstRegisterPnttm(LocalDateTime.now())
                    .frstRegisterPnttmStr("2025-12-30")
                    .isExpired("N")
                    .useAt("Y")
                    .ntcrNm("SYSTEM")
                    .build();
            list.add(mock);

            System.err.println("CHK_DEBUG: Final taskList size = " + list.size());
            model.addAttribute("bbsList", list);
        } catch (Exception e) {
            e.printStackTrace();
            model.addAttribute("bbsList", new ArrayList<>());
        }

        // 최신 업무공지 (공지사항) 데이터 조회
        try {
            List<com.company.project.service.board.dto.BoardDto> list = new ArrayList<>();
            try {
                org.springframework.data.domain.Page<com.company.project.service.board.dto.BoardDto> notiList = boardService
                        .getBoardPosts("BBSMSTR_AAAAAAAAAAAA", org.springframework.data.domain.PageRequest.of(0, 4));
                list.addAll(notiList.getContent());
                System.err.println("CHK_DEBUG: notiList fetched, size = " + list.size());
            } catch (Exception e) {
                System.err.println("CHK_DEBUG: notiList FETCH ERROR: " + e.getMessage());
                e.printStackTrace();
            }

            // ALWAYS ADD A MOCK FOR VERIFICATION
            com.company.project.service.board.dto.BoardDto mock = com.company.project.service.board.dto.BoardDto
                    .builder()
                    .nttSj("FORCED MOCK NOTI (v5)")
                    .frstRegisterPnttm(LocalDateTime.now())
                    .frstRegisterPnttmStr("2025-12-30")
                    .isExpired("N")
                    .useAt("Y")
                    .ntcrNm("SYSTEM")
                    .build();
            list.add(mock);

            System.err.println("CHK_DEBUG: Final notiList size = " + list.size());
            model.addAttribute("notiList", list);
        } catch (Exception e) {
            e.printStackTrace();
            model.addAttribute("notiList", new ArrayList<>());
        }

        // 로그인 정보 전달
        Object loginVO = session.getAttribute("LoginVO");
        if (loginVO != null) {
            model.addAttribute("loginUser", loginVO);
        }

        return "main/EgovMainView";
    }

    /**
     * 헤더 include - 메뉴 데이터 포함
     */
    @GetMapping("/sym/mms/EgovHeader.do")
    public String header(Model model, HttpSession session) {
        return "main/inc/EgovIncHeader";
    }

    /**
     * 푸터 include
     */
    @GetMapping("/sym/mms/EgovFooter.do")
    public String footer(Model model) {
        return "main/inc/EgovIncFooter";
    }

    /**
     * 레프트메뉴 include
     */
    @GetMapping({ "/sym/mms/EgovLeftmenu.do", "/sym/mms/EgovMenuLeft.do" })
    public String leftMenu(Model model) {
        return "main/inc/EgovIncLeftmenu";
    }

    /**
     * 샘플 인트로 페이지
     */
    @GetMapping("/cmm/main/intro.do")
    public String intro(Model model) {
        return "main/sample_menu/Intro";
    }

    /**
     * 샘플 페이지
     */
    @GetMapping("/cmm/main/sample.do")
    public String sample(Model model) {
        return "main/sample_menu/Sample";
    }

    /**
     * 로그인 화면
     */
    @GetMapping("/uat/uia/egovLoginUsr.do")
    public String loginPage(Model model) {
        return "uat/uia/EgovLoginUsr";
    }

    /**
     * 로그인 처리 (샘플 - 실제로는 Spring Security 사용)
     */

    /**
     * 로그아웃
     */

    /**
     * 페이지 링크 (모달용)
     */
    @GetMapping("/EgovPageLink.do")
    public String pageLink(@RequestParam(required = false) String linkIndex, Model model) {
        return "main/sample_menu/Intro";
    }

    /**
     * 샘플 LoginVO 생성 (임시)
     */

}
