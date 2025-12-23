package com.company.project.api.controller.main;

import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 메인 페이지 및 레이아웃 컨트롤러
 * 레거시 eGovFrame 샘플 화면과 호환
 */
@Controller
public class MainPageController {

    @jakarta.annotation.Resource(name = "egovBoardService")
    private com.company.project.service.board.EgovBoardService boardService;

    /**
     * 메인 페이지 이동
     */
    @GetMapping({ "/", "/cmm/main/mainPage.do" })
    public String mainPage(Model model) throws Exception {
        // 오늘의 할일 (업무게시판) 데이터 조회
        org.springframework.data.domain.Page<com.company.project.service.board.dto.BoardDto> taskList = boardService
                .getBoardPosts("BBSMSTR_CCCCCCCCCCCC", org.springframework.data.domain.PageRequest.of(0, 3));

        // 최신 업무공지 (공지사항) 데이터 조회
        org.springframework.data.domain.Page<com.company.project.service.board.dto.BoardDto> notiList = boardService
                .getBoardPosts("BBSMSTR_AAAAAAAAAAAA", org.springframework.data.domain.PageRequest.of(0, 4));

        model.addAttribute("bbsList", taskList.getContent());
        model.addAttribute("notiList", notiList.getContent());
        return "main/EgovMainView";
    }

    /**
     * 헤더 include - 메뉴 데이터 포함
     */
    @GetMapping("/sym/mms/EgovHeader.do")
    public String header(Model model, HttpSession session) {
        // 샘플 상단 메뉴 데이터
        List<Map<String, Object>> headMenuList = new ArrayList<>();

        Map<String, Object> menu1 = new HashMap<>();
        menu1.put("menuNo", "1000000");
        menu1.put("menuNm", "알림정보");
        menu1.put("menuOrdr", 1);
        headMenuList.add(menu1);

        Map<String, Object> menu2 = new HashMap<>();
        menu2.put("menuNo", "2000000");
        menu2.put("menuNm", "직급체계관리");
        menu2.put("menuOrdr", 2);
        headMenuList.add(menu2);

        Map<String, Object> menu3 = new HashMap<>();
        menu3.put("menuNo", "3000000");
        menu3.put("menuNm", "진급관리");
        menu3.put("menuOrdr", 3);
        headMenuList.add(menu3);

        Map<String, Object> menu4 = new HashMap<>();
        menu4.put("menuNo", "4000000");
        menu4.put("menuNm", "근태관리");
        menu4.put("menuOrdr", 4);
        headMenuList.add(menu4);

        Map<String, Object> menu5 = new HashMap<>();
        menu5.put("menuNo", "5000000");
        menu5.put("menuNm", "내무서비스관리");
        menu5.put("menuOrdr", 5);
        headMenuList.add(menu5);

        Map<String, Object> menu6 = new HashMap<>();
        menu6.put("menuNo", "6000000");
        menu6.put("menuNm", "내부시스템관리");
        menu6.put("menuOrdr", 6);
        headMenuList.add(menu6);

        model.addAttribute("list_headmenu", headMenuList);

        // 샘플 전체 메뉴 목록
        List<Map<String, Object>> menuList = new ArrayList<>();

        // 알림정보 하위 메뉴
        Map<String, Object> subMenu1 = new HashMap<>();
        subMenu1.put("menuNo", "1010000");
        subMenu1.put("upperMenuId", "1000000");
        subMenu1.put("menuNm", "공지사항");
        subMenu1.put("relateImagePath", "");
        subMenu1.put("relateImageNm", "");
        subMenu1.put("chkURL", "/cop/bbs/selectBoardList.do?bbsId=BBSMSTR_AAAAAAAAAAAA");
        menuList.add(subMenu1);

        Map<String, Object> subMenu2 = new HashMap<>();
        subMenu2.put("menuNo", "1020000");
        subMenu2.put("upperMenuId", "1000000");
        subMenu2.put("menuNm", "업무게시판");
        subMenu2.put("relateImagePath", "");
        subMenu2.put("relateImageNm", "");
        subMenu2.put("chkURL", "/cop/bbs/selectBoardList.do?bbsId=BBSMSTR_CCCCCCCCCCCC");
        menuList.add(subMenu2);

        // 샘플 메뉴 하위
        Map<String, Object> subMenu3 = new HashMap<>();
        subMenu3.put("menuNo", "2010000");
        subMenu3.put("upperMenuId", "2000000");
        subMenu3.put("menuNm", "샘플 화면");
        subMenu3.put("relateImagePath", "");
        subMenu3.put("relateImageNm", "");
        subMenu3.put("chkURL", "/cmm/main/sample.do");
        menuList.add(subMenu3);

        model.addAttribute("list_menulist", menuList);

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
     * 왼쪽 메뉴 include
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
    @PostMapping("/uat/uia/actionSecurityLogin.do")
    public String actionLogin(
            @RequestParam String id,
            @RequestParam String password,
            HttpSession session,
            Model model) {
        // 샘플 로그인: 아무 아이디/비밀번호나 허용
        // 실제로는 Spring Security와 연동 필요
        if (id != null && !id.isEmpty()) {
            // 세션에 간단한 로그인 정보 저장 (샘플용)
            session.setAttribute("LoginVO", createSampleLoginVO(id));
            return "redirect:/cmm/main/mainPage.do";
        }
        model.addAttribute("message", "아이디 또는 비밀번호가 올바르지 않습니다.");
        return "uat/uia/EgovLoginUsr";
    }

    /**
     * 로그아웃
     */
    @GetMapping("/uat/uia/actionLogout.do")
    public String actionLogout(HttpSession session) {
        session.invalidate();
        return "redirect:/cmm/main/mainPage.do";
    }

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
    private Object createSampleLoginVO(String userId) {
        return new egovframework.com.cmm.LoginVO() {
            {
                setId(userId);
                setName("샘플사용자");
                setUniqId("USRCNFRM_00000000001");
            }
        };
    }
}
