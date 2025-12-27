package com.company.project.api.controller.menu;

import com.company.project.service.menu.MenuService;
import com.company.project.service.menu.dto.MenuDto;
import com.company.project.service.program.ProgramService;
import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cmm.EgovMessageSource;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.fdl.security.userdetails.util.EgovUserDetailsHelper;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.Map;

@Slf4j
@Controller
@RequiredArgsConstructor
public class MenuManageController {

    private final MenuService menuService;
    private final ProgramService programService; // Needed for checking if program exists

    @Resource(name = "propertiesService")
    protected EgovPropertyService propertiesService;

    @Resource(name = "egovMessageSource")
    EgovMessageSource egovMessageSource;

    /**
     * 메뉴목록 리스트조회
     */
    @RequestMapping(value = "/sym/mnu/mpm/EgovMenuManageSelect.do")
    public String selectMenuManageList(@ModelAttribute("searchVO") ComDefaultVO searchVO, ModelMap model)
            throws Exception {
        // 0. Spring Security 사용자권한 처리
        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
        if (!Boolean.TRUE.equals(isAuthenticated)) {
            model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
            return "uat/uia/EgovLoginUsr";
        }

        // Paging
        searchVO.setPageUnit(propertiesService.getInt("pageUnit"));
        searchVO.setPageSize(propertiesService.getInt("pageSize"));

        PaginationInfo paginationInfo = new PaginationInfo();
        paginationInfo.setCurrentPageNo(searchVO.getPageIndex());
        paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());
        paginationInfo.setPageSize(searchVO.getPageSize());

        searchVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
        searchVO.setLastIndex(paginationInfo.getLastRecordIndex());
        searchVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

        model.addAttribute("list_menumanage", menuService.selectMenuManageList(searchVO));

        int totCnt = menuService.selectMenuManageListTotCnt(searchVO);
        paginationInfo.setTotalRecordCount(totCnt);
        model.addAttribute("paginationInfo", paginationInfo);

        return "sym/mnu/mpm/EgovMenuManage";
    }

    /**
     * 메뉴 상세조회
     */
    @RequestMapping(value = "/sym/mnu/mpm/EgovMenuManageListDetailSelect.do")
    public String selectMenuManage(@RequestParam("req_menuNo") String req_menuNo,
            @ModelAttribute("searchVO") ComDefaultVO searchVO,
            ModelMap model) throws Exception {
        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
        if (!Boolean.TRUE.equals(isAuthenticated)) {
            model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
            return "uat/uia/EgovLoginUsr";
        }
        searchVO.setSearchKeyword(req_menuNo);

        MenuDto resultVO = menuService.selectMenuManage(Long.parseLong(req_menuNo));
        model.addAttribute("menuManageVO", resultVO);

        return "sym/mnu/mpm/EgovMenuDetailSelectUpdt";
    }

    /**
     * 메뉴 등록 화면 (GET)
     */
    @GetMapping(value = "/sym/mnu/mpm/EgovMenuRegistInsert.do")
    public String insertMenuManageView(ModelMap model) throws Exception {
        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
        if (!Boolean.TRUE.equals(isAuthenticated)) {
            model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
            return "uat/uia/EgovLoginUsr";
        }

        // Initialize empty DTO for form
        model.addAttribute("menuManageVO", new MenuDto());
        return "sym/mnu/mpm/EgovMenuRegist";
    }

    /**
     * 메뉴 등록 처리 (POST)
     */
    @PostMapping(value = "/sym/mnu/mpm/EgovMenuRegistInsert.do")
    public String insertMenuManage(@Valid @ModelAttribute("menuManageVO") MenuDto menuDto,
            BindingResult bindingResult,
            ModelMap model) throws Exception {
        String resultMsg = "";

        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
        if (!Boolean.TRUE.equals(isAuthenticated)) {
            model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
            return "uat/uia/EgovLoginUsr";
        }

        if (bindingResult.hasErrors()) {
            return "sym/mnu/mpm/EgovMenuRegist";
        }

        if (menuService.selectMenuNoByPk(menuDto) == 0) {
            ComDefaultVO searchVO = new ComDefaultVO();
            searchVO.setSearchKeyword(menuDto.getProgrmFileNm());
            // Check if program exists
            if (programService.selectProgrmListTotCnt(searchVO) == 0) {
                resultMsg = egovMessageSource.getMessage("fail.common.insert");
                model.addAttribute("resultMsg", resultMsg);
                return "sym/mnu/mpm/EgovMenuRegist";
            } else {
                menuService.insertMenuManage(menuDto);
                resultMsg = egovMessageSource.getMessage("success.common.insert");
                return "forward:/sym/mnu/mpm/EgovMenuManageSelect.do";
            }
        } else {
            resultMsg = egovMessageSource.getMessage("common.isExist.msg");
            model.addAttribute("resultMsg", resultMsg);
            return "sym/mnu/mpm/EgovMenuRegist";
        }
    }

    /**
     * 메뉴 수정 처리 (POST)
     */
    @PostMapping(value = "/sym/mnu/mpm/EgovMenuDetailSelectUpdt.do")
    public String updateMenuManage(@Valid @ModelAttribute("menuManageVO") MenuDto menuDto,
            BindingResult bindingResult,
            ModelMap model) throws Exception {
        String resultMsg = "";
        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
        if (!Boolean.TRUE.equals(isAuthenticated)) {
            model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
            return "uat/uia/EgovLoginUsr";
        }

        if (bindingResult.hasErrors()) {
            return "sym/mnu/mpm/EgovMenuDetailSelectUpdt";
        }

        ComDefaultVO searchVO = new ComDefaultVO();
        searchVO.setSearchKeyword(menuDto.getProgrmFileNm());
        if (programService.selectProgrmListTotCnt(searchVO) == 0) {
            resultMsg = egovMessageSource.getMessage("fail.common.update");
            model.addAttribute("resultMsg", resultMsg);
            return "sym/mnu/mpm/EgovMenuDetailSelectUpdt";
        } else {
            menuService.updateMenuManage(menuDto);
            resultMsg = egovMessageSource.getMessage("success.common.update");
            model.addAttribute("resultMsg", resultMsg);
            return "forward:/sym/mnu/mpm/EgovMenuManageSelect.do";
        }
    }

    /**
     * 메뉴 삭제 처리
     */
    @RequestMapping(value = "/sym/mnu/mpm/EgovMenuManageDelete.do")
    public String deleteMenuManage(@ModelAttribute("menuManageVO") MenuDto menuDto,
            ModelMap model) throws Exception {
        String resultMsg = "";
        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
        if (!Boolean.TRUE.equals(isAuthenticated)) {
            model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
            return "uat/uia/EgovLoginUsr";
        }

        if (menuService.selectUpperMenuNoByPk(menuDto) != 0) {
            resultMsg = egovMessageSource.getMessage("fail.common.delete.upperMenuExist");
            model.addAttribute("resultMsg", resultMsg);
            return "forward:/sym/mnu/mpm/EgovMenuManageSelect.do";
        }

        menuService.deleteMenuManage(menuDto);
        resultMsg = egovMessageSource.getMessage("success.common.delete");
        model.addAttribute("resultMsg", resultMsg);

        return "forward:/sym/mnu/mpm/EgovMenuManageSelect.do";
    }

    /**
     * 메뉴 목록 멀티 삭제
     */
    @RequestMapping("/sym/mnu/mpm/EgovMenuManageListDelete.do")
    public String deleteMenuManageList(@RequestParam("checkedMenuNoForDel") String checkedMenuNoForDel,
            @ModelAttribute("menuManageVO") MenuDto menuDto,
            ModelMap model) throws Exception {
        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
        if (!Boolean.TRUE.equals(isAuthenticated)) {
            model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
            return "uat/uia/EgovLoginUsr";
        }

        String resultMsg = "";
        String[] delMenuNo = checkedMenuNoForDel.split(",");

        // Check first item for constraints (Legacy behavior, though loop check would be
        // better)
        if (delMenuNo.length > 0) {
            MenuDto checkDto = MenuDto.builder().menuNo(Long.parseLong(delMenuNo[0])).build();
            if (menuService.selectUpperMenuNoByPk(checkDto) != 0) {
                resultMsg = egovMessageSource.getMessage("fail.common.delete.upperMenuExist");
                model.addAttribute("resultMsg", resultMsg);
                return "forward:/sym/mnu/mpm/EgovMenuManageSelect.do";
            }
        }

        if (checkedMenuNoForDel == null || checkedMenuNoForDel.length() == 0) {
            resultMsg = egovMessageSource.getMessage("fail.common.delete");
        } else {
            menuService.deleteMenuManageList(checkedMenuNoForDel);
            resultMsg = egovMessageSource.getMessage("success.common.delete");
        }

        model.addAttribute("resultMsg", resultMsg);
        return "forward:/sym/mnu/mpm/EgovMenuManageSelect.do";
    }
}
