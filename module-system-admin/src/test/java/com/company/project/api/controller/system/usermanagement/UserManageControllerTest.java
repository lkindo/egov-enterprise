package com.company.project.api.controller.system.usermanagement;

import com.company.project.service.usermanagement.UserManageService;
import com.company.project.service.usermanagement.dto.UserManageDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = UserManageController.class)
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
class UserManageControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private UserManageService userManageService;

    @Test
    @DisplayName("사용자 목록 조회 테스트")
    void getUsers_success() throws Exception {
        // given
        when(userManageService.selectUserList(any())).thenReturn(Collections.emptyList());
        when(userManageService.selectUserListTotCnt(any())).thenReturn(0);

        // when & then
        mockMvc.perform(get("/api/v1/admin/system/users")
                .param("page", "0")
                .param("size", "10")
                .contentType(MediaType.APPLICATION_JSON))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("사용자 상세 조회 테스트")
    void getUser_success() throws Exception {
        // given
        UserManageDto dto = new UserManageDto();
        dto.setUserId("testuser");
        dto.setUserNm("Test User");
        when(userManageService.selectUser("testuser")).thenReturn(dto);

        // when & then
        mockMvc.perform(get("/api/v1/admin/system/users/testuser")
                .contentType(MediaType.APPLICATION_JSON))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.userId").value("testuser"));
    }

    @Test
    @DisplayName("사용자 등록 테스트")
    void insertUser_success() throws Exception {
        // given
        UserManageDto dto = new UserManageDto();
        dto.setUserId("newuser");
        dto.setUserNm("New User");

        // when & then
        mockMvc.perform(post("/api/v1/admin/system/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("아이디 중복 확인 테스트")
    void checkIdDplct_success() throws Exception {
        // given
        when(userManageService.checkIdDplct("existingUser")).thenReturn(1);

        // when & then
        mockMvc.perform(get("/api/v1/admin/system/users/check-id")
                .param("userId", "existingUser")
                .contentType(MediaType.APPLICATION_JSON))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value(true));
    }
}
