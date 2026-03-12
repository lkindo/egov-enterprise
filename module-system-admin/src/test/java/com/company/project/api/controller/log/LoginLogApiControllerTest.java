package com.company.project.api.controller.log;

import com.company.project.service.log.LoginLogManageService;
import com.company.project.service.log.dto.LoginLogDto;
import egovframework.com.cmm.ComDefaultVO;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(LoginLogApiController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("LoginLogApiController 테스트")
class LoginLogApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private LoginLogManageService loginLogManageService;

    @MockitoBean
    private EgovPropertyService propertiesService;

    @Test
    @DisplayName("로그인 로그 목록 조회 성공")
    void selectLoginLogList_Success() throws Exception {
        // Given
        given(propertiesService.getInt("pageUnit")).willReturn(10);
        given(propertiesService.getInt("pageSize")).willReturn(10);
        given(loginLogManageService.selectLoginLogList(any(ComDefaultVO.class))).willReturn(List.of(LoginLogDto.builder().logId("LOG1").build()));
        given(loginLogManageService.selectLoginLogListTotCnt(any(ComDefaultVO.class))).willReturn(1);

        // When & Then
        mockMvc.perform(get("/api/v1/log/login/list")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.list[0].logId").value("LOG1"));
    }

    @Test
    @DisplayName("로그인 로그 상세 조회 성공")
    void selectLoginLog_Success() throws Exception {
        // Given
        given(loginLogManageService.selectLoginLog(anyString())).willReturn(LoginLogDto.builder().logId("LOG1").build());

        // When & Then
        mockMvc.perform(get("/api/v1/log/login/LOG1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.logId").value("LOG1"));
    }
}
