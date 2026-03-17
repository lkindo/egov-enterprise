package com.company.project.api.controller.system.log;

import com.company.project.service.log.LoginLogManageService;
import com.company.project.service.log.dto.LoginLogDto;
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
    void getLoginLogList_Success() throws Exception {
        // Given
        LoginLogDto dto = new LoginLogDto();
        dto.setLogId("LOG1");
        given(loginLogManageService.selectLoginLogList(any())).willReturn(List.of(dto));
        given(loginLogManageService.selectLoginLogListTotCnt(any())).willReturn(1);
        given(propertiesService.getInt(anyString())).willReturn(10);

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/logs/login")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.list[0].logId").value("LOG1"));
    }
}
