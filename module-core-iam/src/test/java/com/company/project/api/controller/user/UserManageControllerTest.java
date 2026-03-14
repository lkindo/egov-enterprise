package com.company.project.api.controller.user;

import com.company.project.service.code.CommonCodeService;
import com.company.project.service.group.GroupManageService;
import com.company.project.service.usermanagement.UserManageService;
import egovframework.com.cmm.ComDefaultVO;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.MessageSource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;
import java.util.Locale;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserManageController 단위 테스트")
class UserManageControllerTest {

    private MockMvc mockMvc;

    @Mock
    private UserManageService userManageService;

    @Mock
    private CommonCodeService commonCodeService;

    @Mock
    private GroupManageService groupManageService;

    @Mock
    private EgovPropertyService propertiesService;

    @Mock
    private MessageSource messageSource;

    @InjectMocks
    private UserManageController userManageController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(userManageController).build();
    }

    @Test
    @DisplayName("사용자 목록 조회 테스트")
    void selectUserListTest() throws Exception {
        when(propertiesService.getInt("pageUnit")).thenReturn(10);
        when(propertiesService.getInt("pageSize")).thenReturn(10);
        when(userManageService.selectUserList(any(ComDefaultVO.class))).thenReturn(Collections.emptyList());
        when(userManageService.selectUserListTotCnt(any(ComDefaultVO.class))).thenReturn(0);

        mockMvc.perform(get("/uss/umt/EgovUserManage.do"))
                .andExpect(status().isOk())
                .andExpect(view().name("cmm/uss/umt/EgovUserManage"))
                .andExpect(model().attributeExists("resultList"))
                .andExpect(model().attributeExists("paginationInfo"));
    }

    @Test
    @DisplayName("사용자 등록 테스트")
    void insertUserTest() throws Exception {
        when(messageSource.getMessage(eq("success.common.insert"), any(), any(Locale.class)))
                .thenReturn("성공적으로 등록되었습니다.");

        mockMvc.perform(post("/uss/umt/EgovUserInsert.do")
                        .param("userId", "user01")
                        .param("userNm", "홍길동")
                        .param("password", "password"))
                .andExpect(status().isOk())
                .andExpect(view().name("forward:/uss/umt/EgovUserManage.do"))
                .andExpect(model().attributeExists("resultMsg"));
    }

    @Test
    @DisplayName("사용자 수정 테스트")
    void updateUserTest() throws Exception {
        when(messageSource.getMessage(eq("success.common.update"), any(), any(Locale.class)))
                .thenReturn("성공적으로 수정되었습니다.");

        mockMvc.perform(post("/uss/umt/EgovUserSelectUpdt.do")
                        .param("userId", "user01")
                        .param("userNm", "홍길동"))
                .andExpect(status().isOk())
                .andExpect(view().name("forward:/uss/umt/EgovUserManage.do"))
                .andExpect(model().attributeExists("resultMsg"));
    }

    @Test
    @DisplayName("사용자 삭제 테스트")
    void deleteUserTest() throws Exception {
        when(messageSource.getMessage(eq("success.common.delete"), any(), any(Locale.class)))
                .thenReturn("성공적으로 삭제되었습니다.");

        mockMvc.perform(post("/uss/umt/EgovUserDelete.do")
                        .param("checkedIdForDel", "user01,user02"))
                .andExpect(status().isOk())
                .andExpect(view().name("forward:/uss/umt/EgovUserManage.do"))
                .andExpect(model().attributeExists("resultMsg"));
    }

    @Test
    @DisplayName("아이디 중복 확인 테스트")
    void checkIdDplctTest() throws Exception {
        when(userManageService.checkIdDplct("user01")).thenReturn(0);

        mockMvc.perform(post("/uss/umt/EgovIdDplctCnfirm.do")
                        .param("checkId", "user01"))
                .andExpect(status().isOk())
                .andExpect(view().name("cmm/uss/umt/EgovIdDplctCnfirm"))
                .andExpect(model().attribute("usedCnt", 0))
                .andExpect(model().attribute("checkId", "user01"));
    }

    @Test
    @DisplayName("비밀번호 수정 테스트")
    void updatePasswordTest() throws Exception {
        when(messageSource.getMessage(eq("success.common.update"), any(), any(Locale.class)))
                .thenReturn("성공적으로 수정되었습니다.");

        mockMvc.perform(post("/uss/umt/EgovUserPasswordUpdt.do")
                        .param("userId", "user01")
                        .param("newPassword", "newPassword"))
                .andExpect(status().isOk())
                .andExpect(view().name("cmm/uss/umt/EgovUserPasswordUpdt"))
                .andExpect(model().attributeExists("resultMsg"));
    }
}
