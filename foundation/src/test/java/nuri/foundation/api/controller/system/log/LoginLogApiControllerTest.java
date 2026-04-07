package nuri.foundation.api.controller.system.log;

import nuri.foundation.core.exception.GlobalExceptionHandler;
import nuri.foundation.service.log.LoginLogManageService;
import nuri.foundation.service.log.dto.LoginLogDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("LoginLogApiController 테스트")
class LoginLogApiControllerTest {

    private MockMvc mockMvc;

    @Mock
    private LoginLogManageService loginLogManageService;

    @Mock
    private EgovPropertyService propertiesService;

    @InjectMocks
    private LoginLogApiController loginLogApiController;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        mockMvc = MockMvcBuilders.standaloneSetup(loginLogApiController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("로그인 로그 목록 조회 성공")
    void testGetLoginLogList() throws Exception {
        when(propertiesService.getInt("pageUnit")).thenReturn(10);
        when(propertiesService.getInt("pageSize")).thenReturn(10);
        when(loginLogManageService.selectLoginLogList(any())).thenReturn(Collections.emptyList());
        when(loginLogManageService.selectLoginLogListTotCnt(any())).thenReturn(0);

        mockMvc.perform(get("/api/v1/admin/system/logs/login"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("로그인 로그 상세 조회 성공")
    void testGetLoginLog() throws Exception {
        LoginLogDto dto = new LoginLogDto();
        dto.setLogId("LOG_001");
        when(loginLogManageService.selectLoginLog("LOG_001")).thenReturn(dto);

        mockMvc.perform(get("/api/v1/admin/system/logs/login/LOG_001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.logId").value("LOG_001"));
    }
}
