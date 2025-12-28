package com.company.project.api.controller.user;

import com.company.project.service.code.CommonCodeService;
import com.company.project.service.code.dto.CommonCodeDto;
import com.company.project.service.group.GroupManageService;
import com.company.project.service.group.dto.GroupManageDto;
import com.company.project.service.user.UserManageService;
import com.company.project.service.user.dto.UserManageDto;
import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cmm.EgovMessageSource;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;

import jakarta.annotation.Resource;
import java.util.Map;

/**
 * 사용자 관리 컨트롤러
 */
@Controller
@RequiredArgsConstructor
public class UserManageController {

    private final UserManageService userManageService;
    private final CommonCodeService commonCodeService;
    private final GroupManageService groupManageService;

    @Resource(name = "propertiesService")
    protected EgovPropertyService propertiesService;

    @Resource(name = "egovMessageSource")
    EgovMessageSource egovMessageSource;

    /**
     * 사용자 목록 조회
     */
    @RequestMapping({ "/uss/umt/EgovUserManage.do", "/uss/umt/user/EgovUserManage.do" })
    public String selectUserList(@ModelAttribute("userSearchVO") ComDefaultVO searchVO, ModelMap model)
            throws Exception {

        // mberVO is used in JSP for some search fields
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

        // 공통코드 목록 조회
        model.addAttribute("emplyrSttusCode_result", commonCodeService.getCodesByGroup("COM013"));

        return "cmm/uss/umt/EgovUserManage";
    }

    /**
     * 사용자 등록 화면
     */
    @GetMapping({ "/uss/umt/EgovUserInsertView.do", "/uss/umt/user/EgovUserInsertView.do" })
    public String insertUserView(Model model) throws Exception {
        model.addAttribute("userManageVO", new UserManageDto());

        // 공통코드 목록 조회
        populateCommonCodes(model);

        return "cmm/uss/umt/EgovUserInsert";
    }

    /**
     * 사용자 등록 처리
     */
    @PostMapping({ "/uss/umt/EgovUserInsert.do", "/uss/umt/user/EgovUserInsert.do" })
    public String insertUser(@ModelAttribute("userManageVO") UserManageDto userManageVO,
            BindingResult bindingResult, Model model) throws Exception {

        if (bindingResult.hasErrors()) {
            return "cmm/uss/umt/EgovUserInsert";
        }

        userManageService.insertUser(userManageVO);
        model.addAttribute("resultMsg", "success.common.insert");
        return "forward:/uss/umt/EgovUserManage.do";
    }

    /**
     * 사용자 수정 화면
     */
    @GetMapping({ "/uss/umt/EgovUserSelectUpdtView.do", "/uss/umt/user/EgovUserSelectUpdtView.do",
            "/uss/umt/EgovMberSelectUpdtView.do" })
    public String updateUserView(@RequestParam("selectedId") String userId, Model model)
            throws Exception {
        UserManageDto userManageVO = userManageService.selectUser(userId);
        model.addAttribute("userManageVO", userManageVO);

        // 공통코드 목록 조회
        populateCommonCodes(model);

        return "cmm/uss/umt/EgovUserSelectUpdt";
    }

    /**
     * 사용자 수정 처리
     */
    @PostMapping({ "/uss/umt/EgovUserSelectUpdt.do", "/uss/umt/user/EgovUserSelectUpdt.do" })
    public String updateUser(@ModelAttribute("userManageVO") UserManageDto userManageVO,
            BindingResult bindingResult, Model model) throws Exception {

        if (bindingResult.hasErrors()) {
            model.addAttribute("resultMsg", bindingResult.getAllErrors().get(0).getDefaultMessage());
            return "forward:/uss/umt/EgovUserManage.do";
        }

        userManageService.updateUser(userManageVO);
        model.addAttribute("resultMsg", "success.common.update");
        return "forward:/uss/umt/EgovUserManage.do";
    }

    /**
     * 사용자 삭제 처리
     */
    @PostMapping({ "/uss/umt/EgovUserDelete.do", "/uss/umt/user/EgovUserDelete.do" })
    public String deleteUser(@RequestParam("checkedIdForDel") String checkedIdForDel, Model model)
            throws Exception {

        String[] userIds = checkedIdForDel.split(",");
        for (String userId : userIds) {
            userManageService.deleteUser(userId.trim());
        }
        model.addAttribute("resultMsg", "success.common.delete");
        return "forward:/uss/umt/EgovUserManage.do";
    }

    /**
     * 아이디 중복 확인 화면
     */
    @GetMapping("/uss/umt/EgovIdDplctCnfirmView.do")
    public String checkIdDplctView(ModelMap model) throws Exception {
        model.addAttribute("checkId", "");
        model.addAttribute("usedCnt", "-1");
        return "cmm/uss/umt/EgovIdDplctCnfirm";
    }

    /**
     * 아이디 중복 확인 처리
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
     * 비밀번호 수정 화면
     */
    @GetMapping({ "/uss/umt/EgovUserPasswordUpdtView.do", "/uss/umt/user/EgovUserPasswordUpdtView.do" })
    public String updatePasswordView(@ModelAttribute("userManageVO") UserManageDto userManageVO, Model model)
            throws Exception {
        model.addAttribute("userManageVO", userManageVO);
        return "cmm/uss/umt/EgovUserPasswordUpdt";
    }

    /**
     * 비밀번호 수정 처리
     */
    @PostMapping({ "/uss/umt/EgovUserPasswordUpdt.do", "/uss/umt/user/EgovUserPasswordUpdt.do" })
    public String updatePassword(@RequestParam Map<String, Object> commandMap, Model model)
            throws Exception {
        String userId = (String) commandMap.get("userId");
        String newPassword = (String) commandMap.get("newPassword");

        userManageService.updatePassword(userId, newPassword);
        model.addAttribute("resultMsg", "success.common.update");
        return "cmm/uss/umt/EgovUserPasswordUpdt";
    }

    private void populateCommonCodes(Model model) {
        model.addAttribute("passwordHint_result", commonCodeService.getCodesByGroup("COM022"));
        model.addAttribute("sexdstnCode_result", commonCodeService.getCodesByGroup("COM014"));
        model.addAttribute("emplyrSttusCode_result", commonCodeService.getCodesByGroup("COM013"));
        model.addAttribute("insttCode_result", commonCodeService.getCodesByGroup("COM025"));

        // 그룹 목록 조회 (ComDefaultVO를 사용하여 전체 조회)
        ComDefaultVO searchVO = new ComDefaultVO();
        searchVO.setPageUnit(999);
        model.addAttribute("groupId_result", groupManageService.selectGroupList(searchVO).stream()
                .map(g -> new CommonCodeDto(null, g.getGroupId(), g.getGroupNm(), null, null))
                .toList());

        // 조직 목록은 현재 서비스가 없으므로 빈 목록
        model.addAttribute("orgnztId_result", java.util.Collections.emptyList());
    }
}
