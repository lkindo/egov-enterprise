package com.company.project.api.controller.system.login;

import com.company.project.service.login.LoginPolicyManageService;
import com.company.project.service.login.dto.LoginPolicyDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.egovframe.rte.fdl.property.EgovPropertyService;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(LoginPolicyApiController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("LoginPolicyApiController 테스트")
class LoginPolicyApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private LoginPolicyManageService loginPolicyManageService;

    @MockitoBean
    private EgovPropertyService propertiesService;

    @Test
    @DisplayName("로그인 정책 목록 조회 성공")
    void getLoginPolicyList_Success() throws Exception {
        // Given
        LoginPolicyDto dto = new LoginPolicyDto();
        dto.setEmplyrId("USER1");
        given(loginPolicyManageService.selectLoginPolicyList(any())).willReturn(List.of(dto));
        given(loginPolicyManageService.selectLoginPolicyListTotCnt(any())).willReturn(1);
        given(propertiesService.getInt(anyString())).willReturn(10);

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/login-policies")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.resultList[0].emplyrId").value("USER1"));
    }

    @Test
    @DisplayName("로그인 정책 상세 조회 성공")
    void getLoginPolicy_Success() throws Exception {
        // Given
        LoginPolicyDto dto = new LoginPolicyDto();
        dto.setEmplyrId("USER1");
        dto.setIpInfo("127.0.0.1");
        given(loginPolicyManageService.selectLoginPolicy("USER1")).willReturn(dto);

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/login-policies/USER1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.emplyrId").value("USER1"))
                .andExpect(jsonPath("$.data.ipInfo").value("127.0.0.1"));
    }

    @Test
    @DisplayName("로그인 정책 저장 성공 (신규)")
    void saveLoginPolicy_Insert_Success() throws Exception {
        // Given
        LoginPolicyDto dto = new LoginPolicyDto();
        dto.setEmplyrId("USER2");
        given(loginPolicyManageService.selectLoginPolicy("USER2")).willReturn(null);

        // When & Then
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/v1/admin/system/login-policies/USER2")
                .content("{\"ipInfo\":\"127.0.0.1\", \"dplctPermAt\":\"Y\"}")
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("로그인 정책 삭제 성공")
    void deleteLoginPolicy_Success() throws Exception {
        // When & Then
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete("/api/v1/admin/system/login-policies/USER1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
