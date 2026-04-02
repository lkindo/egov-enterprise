package com.company.project.foundation.api.controller.system.login;

import com.company.project.foundation.core.exception.GlobalExceptionHandler;
import com.company.project.foundation.service.login.LoginPolicyManageService;
import com.company.project.foundation.service.login.dto.LoginPolicyDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("LoginPolicyApiController ?岇姢??)
class LoginPolicyApiControllerTest {

    private MockMvc mockMvc;

    @Mock
    private LoginPolicyManageService loginPolicyManageService;

    @Mock
    private EgovPropertyService propertiesService;

    @InjectMocks
    private LoginPolicyApiController loginPolicyApiController;

    private ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        mockMvc = MockMvcBuilders.standaloneSetup(loginPolicyApiController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
        
        when(propertiesService.getInt(anyString())).thenReturn(10);
    }

    @Test
    @DisplayName("搿滉犯???曥眳 氇╇ 臁绊殞 ?标车")
    void testGetLoginPolicyList() throws Exception {
        // Given
        when(loginPolicyManageService.selectLoginPolicyList(any())).thenReturn(Collections.emptyList());
        when(loginPolicyManageService.selectLoginPolicyListTotCnt(any())).thenReturn(0);

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/login-policies")
                .param("pageIndex", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("搿滉犯???曥眳 ?侅劯 臁绊殞 ?标车")
    void testGetLoginPolicy() throws Exception {
        // Given
        LoginPolicyDto dto = LoginPolicyDto.builder()
                .emplyrId("user01")
                .emplyrNm("?毄??1")
                .regYn("Y")
                .build();
        when(loginPolicyManageService.selectLoginPolicy("user01")).thenReturn(dto);

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/login-policies/user01"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.emplyrId").value("user01"));
    }

    @Test
    @DisplayName("搿滉犯???曥眳 ?�???标车 - ?犼窚")
    void testSaveLoginPolicy_New() throws Exception {
        // Given
        LoginPolicyDto dto = LoginPolicyDto.builder().ipInfo("127.0.0.1").build();
        when(loginPolicyManageService.selectLoginPolicy("user01")).thenReturn(LoginPolicyDto.builder().regYn("N").build());

        // When & Then
        mockMvc.perform(put("/api/v1/admin/system/login-policies/user01")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());

        verify(loginPolicyManageService, times(1)).insertLoginPolicy(any());
    }

    @Test
    @DisplayName("搿滉犯???曥眳 ?�???标车 - 旮办〈 ?呺嵃?错姼")
    void testSaveLoginPolicy_Update() throws Exception {
        // Given
        LoginPolicyDto dto = LoginPolicyDto.builder().ipInfo("127.0.0.1").build();
        when(loginPolicyManageService.selectLoginPolicy("user01")).thenReturn(LoginPolicyDto.builder().regYn("Y").build());

        // When & Then
        mockMvc.perform(put("/api/v1/admin/system/login-policies/user01")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());

        verify(loginPolicyManageService, times(1)).updateLoginPolicy(any());
    }

    @Test
    @DisplayName("搿滉犯???曥眳 ??牅 ?标车")
    void testDeleteLoginPolicy() throws Exception {
        // When & Then
        mockMvc.perform(delete("/api/v1/admin/system/login-policies/user01"))
                .andExpect(status().isOk());

        verify(loginPolicyManageService, times(1)).deleteLoginPolicy("user01");
    }
}
