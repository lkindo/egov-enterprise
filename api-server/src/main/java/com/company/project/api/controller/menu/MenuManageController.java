package com.company.project.api.controller.menu;

import com.company.project.service.menu.MenuService;

import com.company.project.service.menu.dto.MenuDto;

import com.company.project.service.program.ProgramService;

import egovframework.com.cmm.ComDefaultVO;

import lombok.RequiredArgsConstructor;

import lombok.extern.slf4j.Slf4j;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;

import org.springframework.stereotype.Controller;

import org.springframework.ui.ModelMap;

import org.springframework.validation.BindingResult;

import org.springframework.web.bind.annotation.*;

@Slf4j

@Controller

@RequiredArgsConstructor

public class MenuManageController {

    private final MenuService menuService;
    private final ProgramService programService;
    private final EgovPropertyService propertiesService;
    private final MessageSource messageSource;

    /**

     *          ??            ?         ??(JSP)

     */

    @RequestMapping(value = "/sym/mnu/mpm/EgovMenuManageSelect.do")

    public String selectMenuManageList(@ModelAttribute("searchVO") ComDefaultVO searchVO, ModelMap model)

            throws Exception {

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

        model.addAttribute("resultCnt", menuService.selectMenuManageListTotCnt(searchVO));

        model.addAttribute("paginationInfo", paginationInfo);

        return "sym/mnu/mpm/EgovMenuManage";

    }

    /**

     *          ???                   ??(JSP)

     */

    @GetMapping({ "/sym/mnu/mpm/EgovMenuDetailSelectUpdt.do", "/sym/mnu/mpm/EgovMenuManageListDetailSelect.do" })

    public String selectMenuManageDetail(@ModelAttribute("searchVO") ComDefaultVO searchVO,

            @RequestParam("req_menuNo") Long menuNo, ModelMap model) throws Exception {

        MenuDto menuDto = menuService.selectMenuManage(menuNo);

        model.addAttribute("menuManageVO", menuDto);

        return "sym/mnu/mpm/EgovMenuDetailSelectUpdt";

    }

    /**

     *          ???          ?          (JSP)

     */

    @GetMapping("/sym/mnu/mpm/EgovMenuRegistInsert.do")

    public String insertMenuManageView(@ModelAttribute("searchVO") ComDefaultVO searchVO, ModelMap model)

            throws Exception {

        model.addAttribute("menuManageVO", new MenuDto());

        return "sym/mnu/mpm/EgovMenuRegist";

    }

    /**

     *          ???          (JSP)

     */

    @PostMapping("/sym/mnu/mpm/EgovMenuRegistInsert.do")

    public String insertMenuManage(@ModelAttribute("searchVO") ComDefaultVO searchVO,

            @ModelAttribute("menuManageVO") MenuDto menuDto, BindingResult bindingResult, ModelMap model)

            throws Exception {

        if (menuService.selectMenuNoByPk(menuDto) != 0) {

            model.addAttribute("resultMsg", messageSource.getMessage("common.isExist.msg", null, LocaleContextHolder.getLocale()));

            return "sym/mnu/mpm/EgovMenuRegist";

        }

        ComDefaultVO progrmSearchVO = new ComDefaultVO();

        progrmSearchVO.setSearchKeyword(menuDto.getProgrmFileNm());

        if (programService.selectProgrmListTotCnt(progrmSearchVO) == 0) {

            model.addAttribute("resultMsg", messageSource.getMessage("fail.common.insert", null, LocaleContextHolder.getLocale()));

            return "sym/mnu/mpm/EgovMenuRegist";

        }

        menuService.insertMenuManage(menuDto);

        return "forward:/sym/mnu/mpm/EgovMenuManageSelect.do";

    }

    /**

     *          ????       (JSP)

     */

    @PostMapping("/sym/mnu/mpm/EgovMenuDetailSelectUpdt.do")

    public String updateMenuManage(@ModelAttribute("searchVO") ComDefaultVO searchVO,

            @ModelAttribute("menuManageVO") MenuDto menuDto, BindingResult bindingResult, ModelMap model)

            throws Exception {

        ComDefaultVO progrmSearchVO = new ComDefaultVO();

        progrmSearchVO.setSearchKeyword(menuDto.getProgrmFileNm());

        if (programService.selectProgrmListTotCnt(progrmSearchVO) == 0) {

            model.addAttribute("resultMsg", messageSource.getMessage("fail.common.update", null, LocaleContextHolder.getLocale()));

            return "sym/mnu/mpm/EgovMenuDetailSelectUpdt";

        }

        menuService.updateMenuManage(menuDto);

        return "forward:/sym/mnu/mpm/EgovMenuManageSelect.do";

    }

    /**

     *          ??????(JSP)

     */

    @RequestMapping("/sym/mnu/mpm/EgovMenuManageDelete.do")

    public String deleteMenuManage(@ModelAttribute("searchVO") ComDefaultVO searchVO,

            @RequestParam("req_menuNo") Long menuNo, ModelMap model) throws Exception {

        MenuDto menuDto = MenuDto.builder().menuNo(menuNo).build();

        if (menuService.selectUpperMenuNoByPk(menuDto) != 0) {

            model.addAttribute("resultMsg", messageSource.getMessage("fail.common.delete.upperMenuExist", null, LocaleContextHolder.getLocale()));

            return "forward:/sym/mnu/mpm/EgovMenuManageSelect.do";

        }

        menuService.deleteMenuManage(menuDto);

        return "forward:/sym/mnu/mpm/EgovMenuManageSelect.do";

    }

    /**

     *          ????       ????(JSP)

     */

    @RequestMapping("/sym/mnu/mpm/EgovMenuManageListDelete.do")

    public String deleteMenuManageList(@RequestParam("checkedMenuNoForDel") String checkedMenuNoForDel,

            @ModelAttribute("searchVO") ComDefaultVO searchVO, ModelMap model)

            throws Exception {

        menuService.deleteMenuManageList(checkedMenuNoForDel);

        return "forward:/sym/mnu/mpm/EgovMenuManageSelect.do";

    }

    /**

     *          ?      ????         ??(JSP) - ?          ?        ?

     */

    @RequestMapping(value = "/sym/mnu/mpm/EgovMenuListSelect.do")

    public String selectMenuList(@ModelAttribute("searchVO") ComDefaultVO searchVO, ModelMap model) throws Exception {

        model.addAttribute("list_menulist", menuService.getAllMenus());

        return "egovframework/com/sym/mnu/mpm/EgovMenuList";

    }

}