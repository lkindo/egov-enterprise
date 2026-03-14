package com.company.project.api.controller.user;

import com.company.project.service.code.CommonCodeService;
import com.company.project.service.group.GroupManageService;
import com.company.project.service.usermanagement.UserManageService;
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

import java.util.ArrayList;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserManageController 순수 단위 테스트")
class UserManageControllerApiTest {

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
    @DisplayName("사용자 목록 페이지 호출 테스트")
    void selectUserListTest() throws Exception {
        when(propertiesService.getInt("pageUnit")).thenReturn(10);
        when(propertiesService.getInt("pageSize")).thenReturn(10);
        when(userManageService.selectUserList(any())).thenReturn(new ArrayList<>());

        mockMvc.perform(get("/uss/umt/EgovUserManage.do")
                        .param("pageIndex", "1"))
                .andExpect(status().isOk())
                .andExpect(view().name("cmm/uss/umt/EgovUserManage"));
    }

    @Test
    @DisplayName("사용자 등록 화면 호출 테스트")
    void insertUserViewTest() throws Exception {
        mockMvc.perform(get("/uss/umt/EgovUserInsertView.do"))
                .andExpect(status().isOk())
                .andExpect(view().name("cmm/uss/umt/EgovUserInsert"));
    }
}
