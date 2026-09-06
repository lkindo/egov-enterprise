package nuri.api.controller.business.report;

import com.fasterxml.jackson.databind.ObjectMapper;
import nuri.business.service.report.WorkReportService;
import nuri.business.service.report.dto.WorkReportDto;
import nuri.foundation.core.exception.GlobalExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("WorkReportApiController 단위 테스트")
class WorkReportApiControllerTest {

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @Mock
    private WorkReportService workReportService;

    @InjectMocks
    private WorkReportApiController workReportApiController;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        mockMvc = MockMvcBuilders.standaloneSetup(workReportApiController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
                .build();
    }

    @Test
    @DisplayName("업무보고 목록 조회")
    void getWorkReportList() throws Exception {
        Page<WorkReportDto> page = new PageImpl<>(Collections.emptyList(), PageRequest.of(0, 10), 0);
        when(workReportService.getWorkReportList(nullable(String.class), nullable(String.class), any(), any())).thenReturn(page);

        mockMvc.perform(get("/api/v1/work-reports")
                        .param("searchKeyword", "test")
                        .param("pageIndex", "1")
                        .param("pageUnit", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("업무보고 상세 조회")
    void getWorkReport() throws Exception {
        WorkReportDto dto = new WorkReportDto();
        dto.setRptpSn(1L);
        when(workReportService.getWorkReport(1L)).thenReturn(dto);

        mockMvc.perform(get("/api/v1/work-reports/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("업무보고 등록")
    void registerWorkReport() throws Exception {
        doNothing().when(workReportService).createWorkReport(any(WorkReportDto.class));

        mockMvc.perform(post("/api/v1/work-reports")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "rptTtl", "Subject",
                                "rptpSn", 999,
                                "userId", "forged-owner",
                                "userNm", "forged-name",
                                "rptSttsCd", "forged-status",
                                "rptTypeCd", "forged-type"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        ArgumentCaptor<WorkReportDto> dto = ArgumentCaptor.forClass(WorkReportDto.class);
        verify(workReportService).createWorkReport(dto.capture());
        assertNull(dto.getValue().getRptpSn());
        assertNull(dto.getValue().getUserId());
        assertNull(dto.getValue().getUserNm());
        assertNull(dto.getValue().getRptSttsCd());
        assertNull(dto.getValue().getRptTypeCd());
    }

    @Test
    @DisplayName("업무보고 등록은 직접 저장 문자열의 필수·물리 길이 계약을 검증한다")
    void registerWorkReport_rejectsInvalidStorageContract() throws Exception {
        List<Map<String, Object>> invalidBodies = List.of(
                Map.of("rptTtl", " ", "rptCn", "내용", "rptSeCd", "1", "rptYmd", "20260906"),
                Map.of("rptTtl", "가".repeat(101), "rptCn", "내용", "rptSeCd", "1", "rptYmd", "20260906"),
                Map.of("rptTtl", "제목", "rptCn", "가".repeat(4001), "rptSeCd", "1", "rptYmd", "20260906"),
                Map.of("rptTtl", "제목", "rptCn", "내용", "rptSeCd", "1".repeat(13), "rptYmd", "20260906"),
                Map.of("rptTtl", "제목", "rptCn", "내용", "rptSeCd", "1", "rptYmd", "202609061"));

        for (Map<String, Object> body : invalidBodies) {
            mockMvc.perform(post("/api/v1/work-reports")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(body)))
                    .andExpect(status().isBadRequest());
        }

        verifyNoInteractions(workReportService);
    }

    @Test
    @DisplayName("업무보고 수정")
    void updateWorkReport() throws Exception {
        doNothing().when(workReportService).updateWorkReport(any(WorkReportDto.class));

        mockMvc.perform(put("/api/v1/work-reports/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "rptpSn", 999,
                                "rptTtl", "New Subject",
                                "rptYmd", "20260906",
                                "userId", "forged-owner",
                                "userNm", "forged-name",
                                "rptSttsCd", "forged-status",
                                "rptTypeCd", "forged-type"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        ArgumentCaptor<WorkReportDto> dto = ArgumentCaptor.forClass(WorkReportDto.class);
        verify(workReportService).updateWorkReport(dto.capture());
        assertEquals(1L, dto.getValue().getRptpSn(), "본문 ID가 아니라 path ID를 사용해야 한다");
        assertEquals("20260906", dto.getValue().getRptYmd());
        assertNull(dto.getValue().getUserId());
        assertNull(dto.getValue().getUserNm());
        assertNull(dto.getValue().getRptSttsCd());
        assertNull(dto.getValue().getRptTypeCd());
    }

    @Test
    @DisplayName("업무보고 수정도 직접 저장 문자열 계약을 우회하지 않는다")
    void updateWorkReport_rejectsInvalidStorageContract() throws Exception {
        mockMvc.perform(put("/api/v1/work-reports/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "rptTtl", "제목",
                                "rptCn", "내용",
                                "rptSeCd", "1".repeat(13),
                                "rptYmd", "20260906"))))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(workReportService);
    }

    @Test
    @DisplayName("업무보고 삭제")
    void deleteWorkReport() throws Exception {
        doNothing().when(workReportService).deleteWorkReport(1L);

        mockMvc.perform(delete("/api/v1/work-reports/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
