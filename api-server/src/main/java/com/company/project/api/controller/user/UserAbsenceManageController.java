package com.company.project.api.controller.user;

import com.company.project.service.user.UserAbsenceManageService;
import com.company.project.service.user.dto.UserAbsenceDto;
import com.company.project.service.user.dto.UserAbsenceVO;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;

/**
 * ?�용??부??관리�? ?�한 컨트롤러 ?�래?? */
@Controller
@RequiredArgsConstructor
public class UserAbsenceManageController {

    private final UserAbsenceManageService userAbsenceManageService;
    private final EgovPropertyService propertiesService;
    private final MessageSource messageSource;

    /**
     * ?�용??부??목록 ?�면?�로 ?�동?�다.
     */
    @RequestMapping("/uss/ion/uas/selectUserAbsnceListView.do")
    public String selectUserAbsenceListView() throws Exception {
        return "uss/ion/uas/EgovUserAbsnceList";
    }

    /**
     * ?�용??부??목록??조회?�다.
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
        model.addAttribute("message", messageSource.getMessage("success.common.select", null, LocaleContextHolder.getLocale()));

        return "uss/ion/uas/EgovUserAbsnceList";
    }

    /**
     * ?�용??부???�세 ?�보�?조회?�다.
     */
    @RequestMapping("/uss/ion/uas/getUserAbsnce.do")
    public String selectUserAbsence(@RequestParam("userId") String userId, ModelMap model)
            throws Exception {
        UserAbsenceDto absence = userAbsenceManageService.selectUserAbsence(userId);
        model.addAttribute("userAbsnce", absence);
        model.addAttribute("message", messageSource.getMessage("success.common.select", null, LocaleContextHolder.getLocale()));

        if (absence != null && "N".equals(absence.getRegYn())) {
            return "uss/ion/uas/EgovUserAbsnceRegist";
        } else {
            return "uss/ion/uas/EgovUserAbsnceUpdt";
        }
    }

    /**
     * ?�용??부???�록 ?�면?�로 ?�동?�다.
     */
    @RequestMapping("/uss/ion/uas/addViewUserAbsnce.do")
    public String insertUserAbsenceView(@RequestParam("userId") String userId, ModelMap model)
            throws Exception {
        model.addAttribute("userAbsnce", userAbsenceManageService.selectUserAbsence(userId));
        model.addAttribute("message", messageSource.getMessage("success.common.select", null, LocaleContextHolder.getLocale()));
        return "forward:/uss/ion/uas/selectUserAbsnceList.do";
    }

    /**
     * ?�용??부???�보�??�록?�다.
     */
    @PostMapping("/uss/ion/uas/addUserAbsnce.do")
    public String insertUserAbsence(@Valid @ModelAttribute("userAbsnce") UserAbsenceDto userAbsence,
            BindingResult bindingResult, ModelMap model) throws Exception {
        if (bindingResult.hasErrors()) {
            model.addAttribute("userAbsnce", userAbsence);
            return "uss/ion/uas/EgovUserAbsnceRegist";
        }
        userAbsenceManageService.insertUserAbsence(userAbsence);
        model.addAttribute("message", messageSource.getMessage("success.common.insert", null, LocaleContextHolder.getLocale()));
        return "forward:/uss/ion/uas/selectUserAbsnceList.do";
    }

    /**
     * ?�용??부???�보�??�정?�다.
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
     * ?�용??부???�보�???��?�다.
     */
    @PostMapping("/uss/ion/uas/removeUserAbsnce.do")
    public String deleteUserAbsence(@RequestParam("userId") String userId, ModelMap model)
            throws Exception {
        userAbsenceManageService.deleteUserAbsence(userId);
        model.addAttribute("message", messageSource.getMessage("success.common.delete", null, LocaleContextHolder.getLocale()));
        return "forward:/uss/ion/uas/selectUserAbsnceList.do";
    }

    /**
     * ?�용??부??목록??멀????��?�다.
     */
    @PostMapping("/uss/ion/uas/removeUserAbsnceList.do")
    public String deleteUserAbsenceList(@RequestParam("userIds") String userIds, ModelMap model)
            throws Exception {
        String[] strUserIds = userIds.split(";");
        userAbsenceManageService.deleteUserAbsences(strUserIds);
        model.addAttribute("message", messageSource.getMessage("success.common.delete", null, LocaleContextHolder.getLocale()));
        return "forward:/uss/ion/uas/selectUserAbsnceList.do";
    }
}
