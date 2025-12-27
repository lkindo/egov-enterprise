package com.company.project.api.controller.group;

import com.company.project.service.group.GroupManageService;
import com.company.project.service.group.dto.GroupManageDto;
import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cmm.EgovMessageSource;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.support.SessionStatus;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * 그룹 관리 컨트롤러
 */
@Controller
@RequiredArgsConstructor
public class GroupManageController {

    private final GroupManageService groupManageService;

    @Resource(name = "propertiesService")
    protected EgovPropertyService propertiesService;

    @Resource(name = "egovMessageSource")
    EgovMessageSource egovMessageSource;

    /**
     * 그룹 목록화면 이동
     */
    @RequestMapping("/sec/gmt/EgovGroupListView.do")
    public String selectGroupListView() throws Exception {
        return "sec/gmt/EgovGroupManage";
    }

    /**
     * 그룹 목록 조회
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
        model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

        return "sec/gmt/EgovGroupManage";
    }

    /**
     * 그룹 상세 조회 (수정화면)
     */
    @GetMapping("/sec/gmt/EgovGroup.do")
    public String selectGroup(@RequestParam("groupId") String groupId, Model model)
            throws Exception {
        model.addAttribute("groupManage", groupManageService.selectGroup(groupId));
        return "sec/gmt/EgovGroupUpdate";
    }

    /**
     * 그룹 등록화면 이동
     */
    @GetMapping("/sec/gmt/EgovGroupInsertView.do")
    public String insertGroupView(Model model) throws Exception {
        model.addAttribute("groupManage", new GroupManageDto());
        return "sec/gmt/EgovGroupInsert";
    }

    /**
     * 그룹 등록 처리
     */
    @PostMapping("/sec/gmt/EgovGroupInsert.do")
    public String insertGroup(@Valid @ModelAttribute("groupManage") GroupManageDto groupManage,
            BindingResult bindingResult, SessionStatus status, Model model,
            RedirectAttributes redirectAttributes) throws Exception {

        if (bindingResult.hasErrors()) {
            model.addAttribute("groupManage", groupManage);
            return "sec/gmt/EgovGroupInsert";
        }

        groupManageService.insertGroup(groupManage);
        status.setComplete();
        redirectAttributes.addFlashAttribute("message", egovMessageSource.getMessage("success.common.insert"));
        return "redirect:/sec/gmt/EgovGroupList.do";
    }

    /**
     * 그룹 수정 처리
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
        redirectAttributes.addFlashAttribute("message", egovMessageSource.getMessage("success.common.update"));
        redirectAttributes.addAttribute("groupId", groupManage.getGroupId());
        return "redirect:/sec/gmt/EgovGroup.do";
    }

    /**
     * 그룹 삭제 처리
     */
    @PostMapping("/sec/gmt/EgovGroupDelete.do")
    public String deleteGroup(@RequestParam("groupId") String groupId,
            SessionStatus status, RedirectAttributes redirectAttributes) throws Exception {
        groupManageService.deleteGroup(groupId);
        status.setComplete();
        redirectAttributes.addFlashAttribute("message", egovMessageSource.getMessage("success.common.delete"));
        return "redirect:/sec/gmt/EgovGroupList.do";
    }

    /**
     * 그룹 다중 삭제 처리
     */
    @PostMapping("/sec/gmt/EgovGroupListDelete.do")
    public String deleteGroupList(@RequestParam("groupIds") String groupIds,
            SessionStatus status, RedirectAttributes redirectAttributes) throws Exception {
        String[] strGroupIds = groupIds.split(";");
        groupManageService.deleteGroups(strGroupIds);
        status.setComplete();
        redirectAttributes.addFlashAttribute("message", egovMessageSource.getMessage("success.common.delete"));
        return "redirect:/sec/gmt/EgovGroupList.do";
    }

    /**
     * 그룹 팝업 화면 이동
     */
    @GetMapping("/sec/gmt/EgovGroupSearchView.do")
    public String selectGroupSearchView() throws Exception {
        return "sec/gmt/EgovGroupSearch";
    }

    /**
     * 그룹 팝업 목록 조회
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
        model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

        return "sec/gmt/EgovGroupSearch";
    }
}
