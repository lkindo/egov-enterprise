package nuri.foundation.api.controller.system.log;

import nuri.foundation.core.exception.GlobalExceptionHandler;
import nuri.foundation.service.log.LogManageService;
import nuri.foundation.service.log.dto.SysLogDto;
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

@DisplayName("SystemLogApiController 테스트")
class SystemLogApiControllerTest {

    private MockMvc mockMvc;

    @Mock
    private LogManageService logManageService;

    @Mock
    private EgovPropertyService propertiesService;

    @InjectMocks
    private SystemLogApiController systemLogApiController;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        mockMvc = MockMvcBuilders.standaloneSetup(systemLogApiController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("시스템 로그 목록 조회 성공")
    void testGetSysLogList() throws Exception {
        when(propertiesService.getInt("pageUnit")).thenReturn(10);
        when(propertiesService.getInt("pageSize")).thenReturn(10);
        when(logManageService.selectSysLogList(any())).thenReturn(Collections.emptyList());
        when(logManageService.selectSysLogListTotCnt(any())).thenReturn(0);

        mockMvc.perform(get("/api/v1/admin/system/logs/system")
                .param("pageIndex", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("시스템 로그 상세 조회 성공")
    void testGetSysLog() throws Exception {
        SysLogDto dto = new SysLogDto();
        dto.setDmndId("REQ_001");
        when(logManageService.selectSysLogDetail("REQ_001")).thenReturn(dto);

        mockMvc.perform(get("/api/v1/admin/system/logs/system/REQ_001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.requstId").value("REQ_001"));
    }
}
