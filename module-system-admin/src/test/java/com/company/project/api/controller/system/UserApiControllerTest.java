package com.company.project.api.controller.system;

import com.company.project.service.usermanagement.UserManageService;
import com.company.project.service.usermanagement.dto.UserManageDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Collections;
import java.util.List;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UserApiController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("UserApiController 테스트")
class UserApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private UserManageService userManageService;

    private final String BASE_URL = "/api/v1/admin/system/users";

    @Test
    @DisplayName("사용자 목록 조회 성공")
    void getUsers_Success() throws Exception {
        given(userManageService.selectUserList(any())).willReturn(Collections.singletonList(new UserManageDto()));
        given(userManageService.selectUserListTotCnt(any())).willReturn(1);

        mockMvc.perform(get(BASE_URL)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("사용자 상세 조회 성공")
    void getUser_Success() throws Exception {
        given(userManageService.selectUser(anyString())).willReturn(
                UserManageDto.builder().userId("user1").userNm("User One").build()
        );

        mockMvc.perform(get(BASE_URL + "/user1")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.userNm").value("User One"));
    }

    @Test
    @DisplayName("사용자 등록 성공")
    void insertUser_Success() throws Exception {
        UserManageDto dto = UserManageDto.builder().userId("newuser").build();

        mockMvc.perform(post(BASE_URL)
                        .with(csrf())
                        .content(objectMapper.writeValueAsString(dto))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("사용자 정보 수정 성공")
    void updateUser_Success() throws Exception {
        UserManageDto dto = UserManageDto.builder().userId("user1").userNm("Updated").build();

        mockMvc.perform(put(BASE_URL + "/user1")
                        .with(csrf())
                        .content(objectMapper.writeValueAsString(dto))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("사용자 삭제 성공")
    void deleteUser_Success() throws Exception {
        mockMvc.perform(delete(BASE_URL + "/user1")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("사용자 다중 삭제 성공")
    void deleteUsers_Success() throws Exception {
        List<String> userIds = List.of("user1", "user2");

        mockMvc.perform(delete(BASE_URL)
                        .with(csrf())
                        .content(objectMapper.writeValueAsString(userIds))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("비밀번호 변경 성공")
    void updatePassword_Success() throws Exception {
        mockMvc.perform(patch(BASE_URL + "/user1/password")
                        .with(csrf())
                        .content("newPassword123")
                        .contentType(MediaType.TEXT_PLAIN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("아이디 중복 확인 성공")
    void checkIdDplct_Success() throws Exception {
        given(userManageService.checkIdDplct("user1")).willReturn(1);

        mockMvc.perform(get(BASE_URL + "/check-id")
                        .param("userId", "user1")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value(true));
    }
}
