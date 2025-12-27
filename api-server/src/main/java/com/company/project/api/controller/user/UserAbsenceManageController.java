package com.company.project.api.controller.user;

import com.company.project.service.user.UserAbsenceManageService;
import com.company.project.service.user.dto.UserAbsenceDto;
import com.company.project.service.user.dto.UserAbsenceVO;
import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cmm.EgovMessageSource;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;

import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * 사용자 부재 관리 컨트롤러
 */
@Controller
@RequiredArgsConstructor
public class UserAbsenceManageController {

    private final UserAbsenceManageService userAbsenceManageService;

    @Resource(name = "propertiesService")
    protected EgovPropertyService propertiesService;

    @Resource(name = "egovMessageSource")
    EgovMessageSource egovMessageSource;

    /**
     * 사용자 부재 목록 화면
     */
    @RequestMapping("/uss/ion/uas/selectUserAbsnceListView.do")
    public String selectUserAbsenceListView() throws Exception {
        return "uss/ion/uas/EgovUserAbsnceList";
    }

    /**
     * 사용자 부재 목록 조회
     */
    @RequestMapping("/uss/ion/uas/selectUserAbsnceList.do")
    public String selectUserAbsenceList(@ModelAttribute("userAbsnceVO") UserAbsenceVO searchVO, ModelMap model)
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

        model.addAttribute("userAbsnceList", userAbsenceManageService.selectUserAbsenceList(searchVO));

        int totCnt = userAbsenceManageService.selectUserAbsenceListTotCnt(searchVO);
        paginationInfo.setTotalRecordCount(totCnt);
        model.addAttribute("paginationInfo", paginationInfo);
        model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

        return "uss/ion/uas/EgovUserAbsnceList";
    }

    /**
     * 사용자 부재 상세/수정 화면
     */
    @RequestMapping("/uss/ion/uas/getUserAbsnce.do")
    public String selectUserAbsence(@RequestParam("userId") String userId, ModelMap model)
            throws Exception {
        UserAbsenceDto absence = userAbsenceManageService.selectUserAbsence(userId);
        model.addAttribute("userAbsnce", absence);
        model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

        if (absence != null && "N".equals(absence.getRegYn())) {
            return "uss/ion/uas/EgovUserAbsnceRegist";
        } else {
            return "uss/ion/uas/EgovUserAbsnceUpdt";
        }
    }

    /**
     * 사용자 부재 등록 화면
     */
    @RequestMapping("/uss/ion/uas/addViewUserAbsnce.do")
    public String insertUserAbsenceView(@RequestParam("userId") String userId, ModelMap model)
            throws Exception {
        model.addAttribute("userAbsnce", userAbsenceManageService.selectUserAbsence(userId));
        model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));
        return "forward:/uss/ion/uas/selectUserAbsnceList.do";
    }

    /**
     * 사용자 부재 등록 처리
     */
    @PostMapping("/uss/ion/uas/addUserAbsnce.do")
    public String insertUserAbsence(@Valid @ModelAttribute("userAbsnce") UserAbsenceDto userAbsence,
            BindingResult bindingResult, ModelMap model) throws Exception {

        if (bindingResult.hasErrors()) {
            model.addAttribute("userAbsnce", userAbsence);
            return "uss/ion/uas/EgovUserAbsnceRegist";
        }

        userAbsenceManageService.insertUserAbsence(userAbsence);
        model.addAttribute("message", egovMessageSource.getMessage("success.common.insert"));
        return "forward:/uss/ion/uas/selectUserAbsnceList.do";
    }

    /**
     * 사용자 부재 수정 처리
     */
    @PostMapping("/uss/ion/uas/updtUserAbsnce.do")
    public String updateUserAbsence(@Valid @ModelAttribute("userAbsnce") UserAbsenceDto userAbsence,
            BindingResult bindingResult, ModelMap model) throws Exception {

        if (bindingResult.hasErrors()) {
            model.addAttribute("userAbsnce", userAbsence);
            return "uss/ion/uas/EgovUserAbsnceUpdt";
        }

        userAbsenceManageService.updateUserAbsence(userAbsence);
        return "forward:/uss/ion/uas/selectUserAbsnceList.do";
    }

    /**
     * 사용자 부재 삭제 처리
     */
    @PostMapping("/uss/ion/uas/removeUserAbsnce.do")
    public String deleteUserAbsence(@RequestParam("userId") String userId, ModelMap model)
            throws Exception {
        userAbsenceManageService.deleteUserAbsence(userId);
        model.addAttribute("message", egovMessageSource.getMessage("success.common.delete"));
        return "forward:/uss/ion/uas/selectUserAbsnceList.do";
    }

    /**
     * 사용자 부재 다중 삭제 처리
     */
    @PostMapping("/uss/ion/uas/removeUserAbsnceList.do")
    public String deleteUserAbsenceList(@RequestParam("userIds") String userIds, ModelMap model)
            throws Exception {
        String[] strUserIds = userIds.split(";");
        userAbsenceManageService.deleteUserAbsences(strUserIds);
        model.addAttribute("message", egovMessageSource.getMessage("success.common.delete"));
        return "forward:/uss/ion/uas/selectUserAbsnceList.do";
    }
}
