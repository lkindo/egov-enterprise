package com.company.project.api.controller.group;

import com.company.project.service.group.GroupManageService;
import com.company.project.service.group.dto.GroupManageDto;
import egovframework.com.cmm.ComDefaultVO;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.support.SessionStatus;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import jakarta.validation.Valid;

/**
 * 그룹 관리? ?한 컨트롤러 ?래?? */
@Controller
@RequiredArgsConstructor
public class GroupManageController {

    private final GroupManageService groupManageService;
    private final EgovPropertyService propertiesService;
    private final MessageSource messageSource;

    /**
     * 그룹 목록 ?면?로 ?동?다.
     */
    @RequestMapping("/sec/gmt/EgovGroupListView.do")
    public String selectGroupListView() throws Exception {
        return "sec/gmt/EgovGroupManage";
    }

    /**
     * 그룹 목록??조회?다.
     */
    @GetMapping("/sec/gmt/EgovGroupList.do")
    public String selectGroupList(@ModelAttribute("searchVO") ComDefaultVO searchVO, Model model)
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

        model.addAttribute("groupList", groupManageService.selectGroupList(searchVO));
        int totCnt = groupManageService.selectGroupListTotCnt(searchVO);
        paginationInfo.setTotalRecordCount(totCnt);
        model.addAttribute("paginationInfo", paginationInfo);
        model.addAttribute("message", messageSource.getMessage("success.common.select", null, LocaleContextHolder.getLocale()));

        return "sec/gmt/EgovGroupManage";
    }

    /**
     * 그룹 ???보?조회?다.
     */
    @GetMapping("/sec/gmt/EgovGroup.do")
    public String selectGroup(@RequestParam("groupId") String groupId, Model model)
            throws Exception {
        model.addAttribute("groupManage", groupManageService.selectGroup(groupId));
        return "sec/gmt/EgovGroupUpdate";
    }

    /**
     * 그룹 ?록 ?면?로 ?동?다.
     */
    @GetMapping("/sec/gmt/EgovGroupInsertView.do")
    public String insertGroupView(Model model) throws Exception {
        model.addAttribute("groupManage", new GroupManageDto());
        return "sec/gmt/EgovGroupInsert";
    }

    /**
     * 그룹 ?보??록?다.
     */
    @PostMapping("/sec/gmt/EgovGroupInsert.do")
    public String insertGroup(@Valid @ModelAttribute("groupManage") GroupManageDto groupManage,
            BindingResult bindingResult, SessionStatus status, Model model,
            RedirectAttributes redirectAttributes) throws Exception {
        if (bindingResult.hasErrors()) {
            return "sec/gmt/EgovGroupInsert";
        }

        groupManageService.insertGroup(groupManage);
        status.setComplete();
        redirectAttributes.addFlashAttribute("message", messageSource.getMessage("success.common.insert", null, LocaleContextHolder.getLocale()));

        return "redirect:/sec/gmt/EgovGroupList.do";
    }

    /**
     * 그룹 ?보??정?다.
     */
    @PostMapping("/sec/gmt/EgovGroupUpdate.do")
    public String updateGroup(@Valid @ModelAttribute("groupManage") GroupManageDto groupManage,
            BindingResult bindingResult, SessionStatus status, Model model,
            RedirectAttributes redirectAttributes) throws Exception {
        if (bindingResult.hasErrors()) {
            return "sec/gmt/EgovGroupUpdate";
        }

        groupManageService.updateGroup(groupManage);
        status.setComplete();
        redirectAttributes.addFlashAttribute("message", messageSource.getMessage("success.common.update", null, LocaleContextHolder.getLocale()));
        redirectAttributes.addAttribute("groupId", groupManage.getGroupId());

        return "redirect:/sec/gmt/EgovGroup.do";
    }

    /**
     * 그룹 ?보????다.
     */
    @PostMapping("/sec/gmt/EgovGroupDelete.do")
    public String deleteGroup(@RequestParam("groupId") String groupId,
            SessionStatus status, RedirectAttributes redirectAttributes) throws Exception {
        groupManageService.deleteGroup(groupId);
        status.setComplete();
        redirectAttributes.addFlashAttribute("message", messageSource.getMessage("success.common.delete", null, LocaleContextHolder.getLocale()));

        return "redirect:/sec/gmt/EgovGroupList.do";
    }

    /**
     * 그룹 목록??멀?????다.
     */
    @PostMapping("/sec/gmt/EgovGroupListDelete.do")
    public String deleteGroupList(@RequestParam("groupIds") String groupIds,
            SessionStatus status, RedirectAttributes redirectAttributes) throws Exception {
        String[] strGroupIds = groupIds.split(";");
        groupManageService.deleteGroups(strGroupIds);
        status.setComplete();
        redirectAttributes.addFlashAttribute("message", messageSource.getMessage("success.common.delete", null, LocaleContextHolder.getLocale()));

        return "redirect:/sec/gmt/EgovGroupList.do";
    }

    /**
     * 그룹 검???업창을 ?출?다.
     */
    @GetMapping("/sec/gmt/EgovGroupSearchView.do")
    public String selectGroupSearchView() throws Exception {
        return "sec/gmt/EgovGroupSearch";
    }

    /**
     * 그룹 목록??검?한??
     */
    @GetMapping("/sec/gmt/EgovGroupSearchList.do")
    public String selectGroupSearchList(@ModelAttribute("searchVO") ComDefaultVO searchVO, Model model)
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

        model.addAttribute("groupList", groupManageService.selectGroupList(searchVO));
        int totCnt = groupManageService.selectGroupListTotCnt(searchVO);
        paginationInfo.setTotalRecordCount(totCnt);
        model.addAttribute("paginationInfo", paginationInfo);
        model.addAttribute("message", messageSource.getMessage("success.common.select", null, LocaleContextHolder.getLocale()));

        return "sec/gmt/EgovGroupSearch";
    }
}
