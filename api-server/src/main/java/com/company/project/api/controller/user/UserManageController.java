package com.company.project.api.controller.user;

import com.company.project.service.code.CommonCodeService;
import com.company.project.service.code.dto.CommonCodeDto;
import com.company.project.service.group.GroupManageService;
import com.company.project.service.user.UserManageService;
import com.company.project.service.user.dto.UserManageDto;
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
 * ?¨Ïö©?êÍ?Î¶¨Î? ?ÑÌïú Ïª®Ìä∏Î°§Îü¨ ?¥Îûò?? */
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
     * ?¨Ïö©??Î™©Î°ù??Ï°∞Ìöå?úÎã§.
     */
    @RequestMapping({ "/uss/umt/EgovUserManage.do", "/uss/umt/user/EgovUserManage.do" })
    public String selectUserList(@ModelAttribute("userSearchVO") ComDefaultVO searchVO, ModelMap model)
            throws Exception {
        try {
            // searchVOÎ•?Î™®Îç∏???¥ÏïÑ JSP?êÏÑú ?¨Ïö© Í∞Ä?•ÌïòÍ≤???            model.addAttribute("mberVO", searchVO);

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

            // ?ÅÌÉúÏΩîÎìú Î™©Î°ù Ï°∞Ìöå
            model.addAttribute("emplyrSttusCode_result", commonCodeService.getCodesByGroup("COM013"));

            return "cmm/uss/umt/EgovUserManage";
        } catch (Exception e) {
            log.error("?¨Ïö©??Î™©Î°ù Ï°∞Ìöå Ï§??§Î•ò Î∞úÏÉù", e);
            throw e;
        }
    }

    /**
     * ?¨Ïö©???±Î°ù ?îÎ©¥?ºÎ°ú ?¥Îèô?úÎã§.
     */
    @GetMapping({ "/uss/umt/EgovUserInsertView.do", "/uss/umt/user/EgovUserInsertView.do" })
    public String insertUserView(Model model) throws Exception {
        model.addAttribute("userManageVO", new UserManageDto());
        populateCommonCodes(model);
        return "cmm/uss/umt/EgovUserInsert";
    }

    /**
     * ?¨Ïö©???ïÎ≥¥Î•??±Î°ù?úÎã§.
     */
    @PostMapping({ "/uss/umt/EgovUserInsert.do", "/uss/umt/user/EgovUserInsert.do" })
    public String insertUser(@ModelAttribute("userManageVO") @jakarta.validation.Valid UserManageDto userManageVO,
            BindingResult bindingResult, Model model) throws Exception {
        if (bindingResult.hasErrors()) {
            populateCommonCodes(model);
            return "cmm/uss/umt/EgovUserInsert";
        }

        userManageService.insertUser(userManageVO);
        model.addAttribute("resultMsg", messageSource.getMessage("success.common.insert", null, LocaleContextHolder.getLocale()));
        return "forward:/uss/umt/EgovUserManage.do";
    }

    /**
     * ?¨Ïö©???òÏ†ï ?îÎ©¥?ºÎ°ú ?¥Îèô?úÎã§.
     */
    @RequestMapping(value = { "/uss/umt/EgovUserSelectUpdtView.do",
            "/uss/umt/user/EgovUserSelectUpdtView.do" }, method = { RequestMethod.GET, RequestMethod.POST })
    public String updateUserView(@RequestParam(value = "selectedId", required = false) String userId, Model model)
            throws Exception {
        if (userId == null || userId.isEmpty()) {
            return "forward:/uss/umt/EgovUserManage.do";
        }

        UserManageDto userManageVO = userManageService.selectUserByEsntlId(userId);
        model.addAttribute("userManageVO", userManageVO);
        populateCommonCodes(model);
        return "cmm/uss/umt/EgovUserSelectUpdt";
    }

    /**
     * ?¨Ïö©???ïÎ≥¥Î•??òÏ†ï?úÎã§.
     */
    @PostMapping({ "/uss/umt/EgovUserSelectUpdt.do", "/uss/umt/user/EgovUserSelectUpdt.do" })
    public String updateUser(@ModelAttribute("userManageVO") @jakarta.validation.Valid UserManageDto userManageVO,
            BindingResult bindingResult, Model model) throws Exception {
        if (bindingResult.hasErrors()) {
            populateCommonCodes(model);
            return "cmm/uss/umt/EgovUserSelectUpdt";
        }

        userManageService.updateUser(userManageVO);
        model.addAttribute("resultMsg", messageSource.getMessage("success.common.update", null, LocaleContextHolder.getLocale()));
        return "forward:/uss/umt/EgovUserManage.do";
    }

    /**
     * ?¨Ïö©???ïÎ≥¥Î•???†ú?úÎã§.
     */
    @PostMapping({ "/uss/umt/EgovUserDelete.do", "/uss/umt/user/EgovUserDelete.do" })
    public String deleteUser(@RequestParam("checkedIdForDel") String checkedIdForDel, Model model)
            throws Exception {
        List<String> userIdList = Arrays.stream(checkedIdForDel.split(","))
                .map(String::trim)
                .collect(Collectors.toList());
        userManageService.deleteUserList(userIdList);
        model.addAttribute("resultMsg", messageSource.getMessage("success.common.delete", null, LocaleContextHolder.getLocale()));
        return "forward:/uss/umt/EgovUserManage.do";
    }

    /**
     * ?ÑÏù¥??Ï§ëÎ≥µ?ïÏù∏ ?ùÏóÖÏ∞ΩÏùÑ ?∏Ï∂ú?úÎã§.
     */
    @GetMapping("/uss/umt/EgovIdDplctCnfirmView.do")
    public String checkIdDplctView(ModelMap model) throws Exception {
        model.addAttribute("checkId", "");
        model.addAttribute("usedCnt", "-1");
        return "cmm/uss/umt/EgovIdDplctCnfirm";
    }

    /**
     * ?ÑÏù¥??Ï§ëÎ≥µ?¨Î?Î•??ïÏù∏?úÎã§.
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
     * ÎπÑÎ?Î≤àÌò∏ ?òÏ†ï ?îÎ©¥?ºÎ°ú ?¥Îèô?úÎã§.
     */
    @GetMapping({ "/uss/umt/EgovUserPasswordUpdtView.do", "/uss/umt/user/EgovUserPasswordUpdtView.do" })
    public String updatePasswordView(@ModelAttribute("userManageVO") UserManageDto userManageVO, Model model)
            throws Exception {
        model.addAttribute("userManageVO", userManageVO);
        return "cmm/uss/umt/EgovUserPasswordUpdt";
    }

    /**
     * ÎπÑÎ?Î≤àÌò∏Î•??òÏ†ï?úÎã§.
     */
    @PostMapping({ "/uss/umt/EgovUserPasswordUpdt.do", "/uss/umt/user/EgovUserPasswordUpdt.do" })
    public String updatePassword(@RequestParam Map<String, Object> commandMap, Model model)
            throws Exception {
        String userId = (String) commandMap.get("userId");
        String newPassword = (String) commandMap.get("newPassword");
        userManageService.updatePassword(userId, newPassword);
        model.addAttribute("resultMsg", messageSource.getMessage("success.common.update", null, LocaleContextHolder.getLocale()));
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
