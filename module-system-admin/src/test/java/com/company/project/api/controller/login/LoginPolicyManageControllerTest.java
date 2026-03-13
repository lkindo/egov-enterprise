package com.company.project.api.controller.login;

import com.company.project.service.login.LoginPolicyManageService;
import com.company.project.service.login.dto.LoginPolicyDto;
import com.company.project.service.login.dto.LoginPolicyVO;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.MessageSource;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(LoginPolicyManageController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("LoginPolicyManageController 테스트")
class LoginPolicyManageControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private LoginPolicyManageService loginPolicyManageService;

    @MockitoBean
    private EgovPropertyService propertiesService;

    @MockitoBean
    private MessageSource messageSource;

    @Test
    @WithMockUser
    @DisplayName("REST API: 로그인 정책 목록 조회")
    void getLoginPolicyList_Success() throws Exception {
        given(propertiesService.getInt("pageUnit")).willReturn(10);
        given(propertiesService.getInt("pageSize")).willReturn(10);
        given(loginPolicyManageService.selectLoginPolicyList(any())).willReturn(Collections.emptyList());
        given(loginPolicyManageService.selectLoginPolicyListTotCnt(any())).willReturn(0);

        mockMvc.perform(get("/api/v1/admin/user/login-policies")
                .accept(MediaType.APPLICATION_JSON));
    }

    @Test
    @WithMockUser
    @DisplayName("REST API: 로그인 정책 목록 조회 - 속성 조회 실패 시 기본값 사용")
    void getLoginPolicyList_PropertyException() throws Exception {
        given(propertiesService.getInt("pageUnit")).willThrow(new RuntimeException("Property Error"));
        given(loginPolicyManageService.selectLoginPolicyList(any())).willReturn(Collections.emptyList());
        given(loginPolicyManageService.selectLoginPolicyListTotCnt(any())).willReturn(0);

        mockMvc.perform(get("/api/v1/admin/user/login-policies")
                .accept(MediaType.APPLICATION_JSON));
    }

    @Test
    @WithMockUser
    @DisplayName("REST API: 로그인 정책 상세 조회")
    void getLoginPolicy_Success() throws Exception {
        LoginPolicyDto dto = new LoginPolicyDto();
        dto.setEmplyrId("user01");
        given(loginPolicyManageService.selectLoginPolicy("user01")).willReturn(dto);

        mockMvc.perform(get("/api/v1/admin/user/login-policies/{emplyrId}", "user01")
                .accept(MediaType.APPLICATION_JSON));
    }

    @Test
    @WithMockUser
    @DisplayName("REST API: 로그인 정책 저장 - 신규 등록")
    void saveLoginPolicy_Insert() throws Exception {
        LoginPolicyDto request = new LoginPolicyDto();
        request.setIpInfo("127.0.0.1");

        given(loginPolicyManageService.selectLoginPolicy("user01")).willReturn(null); // 신규

        mockMvc.perform(put("/api/v1/admin/user/login-policies/{emplyrId}", "user01")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)));

        verify(loginPolicyManageService).insertLoginPolicy(any(LoginPolicyDto.class));
    }

    @Test
    @WithMockUser
    @DisplayName("REST API: 로그인 정책 저장 - 기존 수정")
    void saveLoginPolicy_Update() throws Exception {
        LoginPolicyDto request = new LoginPolicyDto();
        request.setIpInfo("127.0.0.1");

        LoginPolicyDto existing = new LoginPolicyDto();
        existing.setRegYn("Y");
        given(loginPolicyManageService.selectLoginPolicy("user01")).willReturn(existing);

        mockMvc.perform(put("/api/v1/admin/user/login-policies/{emplyrId}", "user01")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)));

        verify(loginPolicyManageService).updateLoginPolicy(any(LoginPolicyDto.class));
    }

    @Test
    @WithMockUser
    @DisplayName("JSP: 로그인 정책 목록 뷰 이동")
    void selectLoginPolicyListView_Success() throws Exception {
        mockMvc.perform(get("/uat/uap/selectLoginPolicyListView.do"));
    }

    @Test
    @WithMockUser
    @DisplayName("JSP: 로그인 정책 목록 조회")
    void selectLoginPolicyList_Success() throws Exception {
        given(propertiesService.getInt("pageUnit")).willReturn(10);
        given(propertiesService.getInt("pageSize")).willReturn(10);
        given(loginPolicyManageService.selectLoginPolicyList(any())).willReturn(Collections.emptyList());
        given(loginPolicyManageService.selectLoginPolicyListTotCnt(any())).willReturn(0);
        given(messageSource.getMessage(anyString(), any(), any())).willReturn("Success");

        mockMvc.perform(get("/uat/uap/selectLoginPolicyList.do"));
    }

    @Test
    @WithMockUser
    @DisplayName("JSP: 로그인 정책 상세 조회 (미등록 상태)")
    void selectLoginPolicy_NotRegistered() throws Exception {
        LoginPolicyDto dto = new LoginPolicyDto();
        dto.setRegYn("N");
        given(loginPolicyManageService.selectLoginPolicy("user01")).willReturn(dto);
        given(messageSource.getMessage(anyString(), any(), any())).willReturn("Success");

        mockMvc.perform(get("/uat/uap/getLoginPolicy.do")
                .param("emplyrId", "user01"));
    }

    @Test
    @WithMockUser
    @DisplayName("JSP: 로그인 정책 상세 조회 (등록 상태)")
    void selectLoginPolicy_Registered() throws Exception {
        LoginPolicyDto dto = new LoginPolicyDto();
        dto.setRegYn("Y");
        given(loginPolicyManageService.selectLoginPolicy("user01")).willReturn(dto);
        given(messageSource.getMessage(anyString(), any(), any())).willReturn("Success");

        mockMvc.perform(get("/uat/uap/getLoginPolicy.do")
                .param("emplyrId", "user01"));
    }

    @Test
    @WithMockUser
    @DisplayName("JSP: 로그인 정책 등록 뷰 이동")
    void insertLoginPolicyView_Success() throws Exception {
        LoginPolicyDto dto = new LoginPolicyDto();
        given(loginPolicyManageService.selectLoginPolicy("user01")).willReturn(dto);

        mockMvc.perform(get("/uat/uap/addLoginPolicyView.do")
                .param("emplyrId", "user01"));
    }

    @Test
    @WithMockUser
    @DisplayName("JSP: 로그인 정책 등록 성공")
    void insertLoginPolicy_Success() throws Exception {
        mockMvc.perform(post("/uat/uap/addLoginPolicy.do")
                .param("emplyrId", "user01")
                .param("ipInfo", "127.0.0.1"));

        verify(loginPolicyManageService).insertLoginPolicy(any(LoginPolicyDto.class));
    }

    @Test
    @WithMockUser
    @DisplayName("JSP: 로그인 정책 수정 성공")
    void updateLoginPolicy_Success() throws Exception {
        mockMvc.perform(post("/uat/uap/updtLoginPolicy.do")
                .param("emplyrId", "user01")
                .param("ipInfo", "127.0.0.2"));

        verify(loginPolicyManageService).updateLoginPolicy(any(LoginPolicyDto.class));
    }

    @Test
    @WithMockUser
    @DisplayName("JSP: 로그인 정책 삭제 성공")
    void deleteLoginPolicy_Success() throws Exception {
        mockMvc.perform(post("/uat/uap/removeLoginPolicy.do")
                .param("emplyrId", "user01"));

        verify(loginPolicyManageService).deleteLoginPolicy("user01");
    }
}
