package com.company.project.api.controller.user;

import com.company.project.service.code.CommonCodeService;
import com.company.project.service.code.dto.CommonCodeDto;
import com.company.project.service.group.GroupManageService;
import com.company.project.service.usermanagement.UserManageService;
import com.company.project.service.usermanagement.dto.UserManageDto;
import egovframework.com.cmm.ComDefaultVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 사용자 관리를 위한 컨트롤러
 */
@Slf4j
@Controller("userPkgUserManageController")
@RequiredArgsConstructor
public class UserManageController {

    private final UserManageService userManageService;
    private final CommonCodeService commonCodeService;
    private final GroupManageService groupManageService;
    private final EgovPropertyService propertiesService;
    private final MessageSource messageSource;

    /**
     * 사용자 목록을 조회한다.
     */
    @RequestMapping({ "/uss/umt/EgovUserManage.do", "/uss/umt/user/EgovUserManage.do" })
    public String selectUserList(@ModelAttribute("userSearchVO") ComDefaultVO searchVO, ModelMap model)
            throws Exception {
        try {
            // searchVO를 모델에 담아 JSP에서 사용 가능하게 함
            model.addAttribute("mberVO", searchVO);

            searchVO.setPageUnit(propertiesService.getInt("pageUnit"));
            searchVO.setPageSize(propertiesService.getInt("pageSize"));

            PaginationInfo paginationInfo = new PaginationInfo();
            paginationInfo.setCurrentPageNo(searchVO.getPageIndex());
            paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());
            paginationInfo.setPageSize(searchVO.getPageSize());

            searchVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
            searchVO.setLastIndex(paginationInfo.getLastRecordIndex());
            searchVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

            model.addAttribute("resultList", userManageService.selectUserList(searchVO));
            int totCnt = userManageService.selectUserListTotCnt(searchVO);
            paginationInfo.setTotalRecordCount(totCnt);
            model.addAttribute("paginationInfo", paginationInfo);

            // 상태코드 목록 조회
            model.addAttribute("emplyrSttusCode_result", commonCodeService.getCodesByGroup("COM013"));

            return "cmm/uss/umt/EgovUserManage";
        } catch (Exception e) {
            log.error("사용자 목록 조회 중 오류 발생", e);
            throw e;
        }
    }

    /**
     * 사용자 등록 화면으로 이동한다.
     */
    @GetMapping({ "/uss/umt/EgovUserInsertView.do", "/uss/umt/user/EgovUserInsertView.do" })
    public String insertUserView(Model model) throws Exception {
        model.addAttribute("userManageVO", new UserManageDto());
        populateCommonCodes(model);
        return "cmm/uss/umt/EgovUserInsert";
    }

    /**
     * 사용자 정보를 등록한다.
     */
    @PostMapping({ "/uss/umt/EgovUserInsert.do", "/uss/umt/user/EgovUserInsert.do" })
    public String insertUser(@ModelAttribute("userManageVO") @jakarta.validation.Valid UserManageDto userManageVO,
            BindingResult bindingResult, Model model) throws Exception {
        if (bindingResult.hasErrors()) {
            populateCommonCodes(model);
            return "cmm/uss/umt/EgovUserInsert";
        }

        userManageService.insertUser(userManageVO);
        model.addAttribute("resultMsg",
                messageSource.getMessage("success.common.insert", null, LocaleContextHolder.getLocale()));
        return "forward:/uss/umt/EgovUserManage.do";
    }

    /**
     * 사용자 수정 화면으로 이동한다.
     */
    @RequestMapping(value = { "/uss/umt/EgovUserSelectUpdtView.do",
            "/uss/umt/user/EgovUserSelectUpdtView.do" }, method = { RequestMethod.GET, RequestMethod.POST })
    public String updateUserView(@RequestParam(value = "selectedId", required = false) String userId, Model model)
            throws Exception {
        if (userId == null || userId.isEmpty()) {
            return "forward:/uss/umt/EgovUserManage.do";
        }

        UserManageDto userManageVO = userManageService.selectUser(userId);
        model.addAttribute("userManageVO", userManageVO);
        populateCommonCodes(model);
        return "cmm/uss/umt/EgovUserSelectUpdt";
    }

    /**
     * 사용자 정보를 수정한다.
     */
    @PostMapping({ "/uss/umt/EgovUserSelectUpdt.do", "/uss/umt/user/EgovUserSelectUpdt.do" })
    public String updateUser(@ModelAttribute("userManageVO") @jakarta.validation.Valid UserManageDto userManageVO,
            BindingResult bindingResult, Model model) throws Exception {
        if (bindingResult.hasErrors()) {
            populateCommonCodes(model);
            return "cmm/uss/umt/EgovUserSelectUpdt";
        }

        userManageService.updateUser(userManageVO);
        model.addAttribute("resultMsg",
                messageSource.getMessage("success.common.update", null, LocaleContextHolder.getLocale()));
        return "forward:/uss/umt/EgovUserManage.do";
    }

    /**
     * 사용자 정보를 삭제한다.
     */
    @PostMapping({ "/uss/umt/EgovUserDelete.do", "/uss/umt/user/EgovUserDelete.do" })
    public String deleteUser(@RequestParam("checkedIdForDel") String checkedIdForDel, Model model)
            throws Exception {
        List<String> userIdList = Arrays.stream(checkedIdForDel.split(","))
                .map(String::trim)
                .collect(Collectors.toList());
        userManageService.deleteUserList(userIdList);
        model.addAttribute("resultMsg",
                messageSource.getMessage("success.common.delete", null, LocaleContextHolder.getLocale()));
        return "forward:/uss/umt/EgovUserManage.do";
    }

    /**
     * 아이디 중복확인 팝업창을 호출한다.
     */
    @GetMapping("/uss/umt/EgovIdDplctCnfirmView.do")
    public String checkIdDplctView(ModelMap model) throws Exception {
        model.addAttribute("checkId", "");
        model.addAttribute("usedCnt", "-1");
        return "cmm/uss/umt/EgovIdDplctCnfirm";
    }

    /**
     * 아이디 중복여부를 확인한다.
     */
    @RequestMapping("/uss/umt/EgovIdDplctCnfirm.do")
    public String checkIdDplct(@RequestParam Map<String, Object> commandMap, ModelMap model)
            throws Exception {
        String checkId = (String) commandMap.get("checkId");
        if (checkId == null || checkId.isEmpty()) {
            return "forward:/uss/umt/EgovIdDplctCnfirmView.do";
        }

        int usedCnt = userManageService.checkIdDplct(checkId);
        model.addAttribute("usedCnt", usedCnt);
        model.addAttribute("checkId", checkId);
        return "cmm/uss/umt/EgovIdDplctCnfirm";
    }

    /**
     * 비밀번호 수정 화면으로 이동한다.
     */
    @GetMapping({ "/uss/umt/EgovUserPasswordUpdtView.do", "/uss/umt/user/EgovUserPasswordUpdtView.do" })
    public String updatePasswordView(@ModelAttribute("userManageVO") UserManageDto userManageVO, Model model)
            throws Exception {
        model.addAttribute("userManageVO", userManageVO);
        return "cmm/uss/umt/EgovUserPasswordUpdt";
    }

    /**
     * 비밀번호를 수정한다.
     */
    @PostMapping({ "/uss/umt/EgovUserPasswordUpdt.do", "/uss/umt/user/EgovUserPasswordUpdt.do" })
    public String updatePassword(@RequestParam Map<String, Object> commandMap, Model model)
            throws Exception {
        String userId = (String) commandMap.get("userId");
        String newPassword = (String) commandMap.get("newPassword");
        userManageService.updatePassword(userId, newPassword);
        model.addAttribute("resultMsg",
                messageSource.getMessage("success.common.update", null, LocaleContextHolder.getLocale()));
        return "cmm/uss/umt/EgovUserPasswordUpdt";
    }

    private void populateCommonCodes(Model model) {
        model.addAttribute("passwordHint_result", commonCodeService.getCodesByGroup("COM022"));
        model.addAttribute("sexdstnCode_result", commonCodeService.getCodesByGroup("COM014"));
        model.addAttribute("emplyrSttusCode_result", commonCodeService.getCodesByGroup("COM013"));
        model.addAttribute("insttCode_result", commonCodeService.getCodesByGroup("COM025"));

        ComDefaultVO searchVO = new ComDefaultVO();
        searchVO.setPageUnit(999);
        model.addAttribute("groupId_result", groupManageService.selectGroupList(searchVO).stream()
                .map(g -> new CommonCodeDto(null, g.getGroupId(), g.getGroupNm(), null, null))
                .toList());

        model.addAttribute("orgnztId_result", java.util.Collections.emptyList());
    }
}
