package nuri.api.controller.foundation.controller.system.log;

import nuri.foundation.core.exception.GlobalExceptionHandler;
import nuri.business.service.log.LogManageService;
import nuri.business.service.log.dto.SysLogDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("SystemLogApiController 테스트")
class SystemLogApiControllerTest {

    private MockMvc mockMvc;

    @Mock
    private LogManageService logManageService;

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
    @DisplayName("시스템 로그 목록 조회 성공 — 단일 Page 쿼리로 2중 COUNT 를 피한다")
    void testGetSysLogList() throws Exception {
        SysLogDto row = SysLogDto.builder().sysLogSn(1L).dmndId("REQ_1").build();
        when(logManageService.selectSysLogPage(any())).thenReturn(
                new org.springframework.data.domain.PageImpl<>(
                        java.util.List.of(row), org.springframework.data.domain.PageRequest.of(0, 10), 1));

        mockMvc.perform(get("/api/v1/admin/system/logs/system")
                .param("page", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.total").value(1))
                .andExpect(jsonPath("$.data.page").value(1))
                .andExpect(jsonPath("$.data.list[0].sysLogSn").value(1));

        verify(logManageService).selectSysLogPage(any());
        verify(logManageService, never()).selectSysLogListTotCnt(any());
    }

    @Test
    @DisplayName("시스템 로그 상세 조회 성공")
    void testGetSysLog() throws Exception {
        SysLogDto dto = new SysLogDto();
        dto.setSysLogSn(101L);
        dto.setDmndId("REQ_001");
        when(logManageService.selectSysLogDetail(anyLong())).thenReturn(dto);

        mockMvc.perform(get("/api/v1/admin/system/logs/system/101"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.sysLogSn").value(101))
                .andExpect(jsonPath("$.data.dmndId").value("REQ_001"));
    }
}
