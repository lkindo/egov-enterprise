package nuri.api.controller.business.report;

import com.fasterxml.jackson.databind.ObjectMapper;
import nuri.business.service.report.EgovWorkReportService;
import nuri.business.service.report.dto.WorkReportDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
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
    private EgovWorkReportService workReportService;

    @InjectMocks
    private WorkReportApiController workReportApiController;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        mockMvc = MockMvcBuilders.standaloneSetup(workReportApiController)
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
                .build();
    }

    @Test
    @DisplayName("업무보고 목록 조회")
    void getWorkReportList() throws Exception {
        Page<WorkReportDto> page = new PageImpl<>(Collections.emptyList(), PageRequest.of(0, 10), 0);
        when(workReportService.getWorkReportList(anyString(), any(), any(), any())).thenReturn(page);

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
        dto.setReportId("R1");
        when(workReportService.getWorkReport("R1")).thenReturn(dto);

        mockMvc.perform(get("/api/v1/work-reports/R1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("업무보고 등록")
    void registerWorkReport() throws Exception {
        WorkReportDto dto = new WorkReportDto();
        dto.setReportSubject("Subject");
        doNothing().when(workReportService).createWorkReport(any(WorkReportDto.class));

        mockMvc.perform(post("/api/v1/work-reports")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("업무보고 수정")
    void updateWorkReport() throws Exception {
        WorkReportDto dto = new WorkReportDto();
        dto.setReportSubject("New Subject");
        doNothing().when(workReportService).updateWorkReport(any(WorkReportDto.class));

        mockMvc.perform(put("/api/v1/work-reports/R1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("업무보고 삭제")
    void deleteWorkReport() throws Exception {
        doNothing().when(workReportService).deleteWorkReport("R1");

        mockMvc.perform(delete("/api/v1/work-reports/R1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
