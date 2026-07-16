package nuri.api.controller.business.memoreport;

import nuri.business.service.memoreport.EgovMemoReportService;
import nuri.business.service.memoreport.dto.MemoReportDto;
import nuri.foundation.core.exception.GlobalExceptionHandler;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;
import java.util.Collections;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class MemoReportApiControllerTest {

    private MockMvc mockMvc;
    private EgovMemoReportService memoReportService;
    private ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        memoReportService = mock(EgovMemoReportService.class);
        
        HandlerMethodArgumentResolver userDetailsResolver = new HandlerMethodArgumentResolver() {
            @Override
            public boolean supportsParameter(MethodParameter parameter) {
                return parameter.getParameterType().equals(UserDetails.class);
            }

            @Override
            public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
                                        NativeWebRequest webRequest, WebDataBinderFactory binderFactory) {
                UserDetails user = mock(UserDetails.class);
                when(user.getUsername()).thenReturn("testUser");
                return user;
            }
        };

        mockMvc = MockMvcBuilders.standaloneSetup(new MemoReportApiController(memoReportService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new org.springframework.data.web.PageableHandlerMethodArgumentResolver(), userDetailsResolver)
                .build();
    }

    @Test
    @DisplayName("메모보고 목록 조회 - 성공")
    void getMemoReports_success() throws Exception {
        when(memoReportService.getMemoReportList(any(), any())).thenReturn(new PageImpl<>(Collections.emptyList()));
        mockMvc.perform(get("/api/v1/memo-reports")).andExpect(status().isOk());
    }

    @Test
    @DisplayName("나의 메모보고 목록 조회 - 성공")
    void getMyReports_success() throws Exception {
        when(memoReportService.getMyReportList(anyString(), any())).thenReturn(new PageImpl<>(Collections.emptyList()));
        mockMvc.perform(get("/api/v1/memo-reports/my")).andExpect(status().isOk());
    }

    @Test
    @DisplayName("수신 메모보고 목록 조회 - 성공")
    void getReceivedReports_success() throws Exception {
        when(memoReportService.getReceivedReportList(anyString(), any())).thenReturn(new PageImpl<>(Collections.emptyList()));
        mockMvc.perform(get("/api/v1/memo-reports/received")).andExpect(status().isOk());
    }

    @Test
    @DisplayName("메모보고 상세 조회 - 성공")
    void getMemoReport_success() throws Exception {
        when(memoReportService.getMemoReport("R1")).thenReturn(MemoReportDto.builder().rptId("R1").build());
        mockMvc.perform(get("/api/v1/memo-reports/R1")).andExpect(status().isOk());
    }

    @Test
    @DisplayName("메모보고 등록 - 성공")
    void createMemoReport_success() throws Exception {
        MemoReportDto dto = MemoReportDto.builder().rptTtl("Subject").build();
        when(memoReportService.createMemoReport(eq("testUser"), any())).thenReturn("R_NEW");
        mockMvc.perform(post("/api/v1/memo-reports")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value("R_NEW"));
    }

    @Test
    @DisplayName("메모보고 수정 - 성공")
    void updateMemoReport_success() throws Exception {
        MemoReportDto dto = MemoReportDto.builder().rptTtl("Update").build();
        mockMvc.perform(put("/api/v1/memo-reports/R1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());
        verify(memoReportService).updateMemoReport(eq("R1"), eq("testUser"), any());
    }

    @Test
    @DisplayName("지시사항 업데이트 - 성공")
    void updateDrctMatter_success() throws Exception {
        mockMvc.perform(patch("/api/v1/memo-reports/R1/instr-cn")
                .contentType(MediaType.TEXT_PLAIN)
                .content("Do it now"))
                .andExpect(status().isOk());
        verify(memoReportService).updateDrctMatter("R1", "Do it now");
    }

    @Test
    @DisplayName("메모보고 삭제 - 성공")
    void deleteMemoReport_success() throws Exception {
        mockMvc.perform(delete("/api/v1/memo-reports/R1")).andExpect(status().isOk());
        verify(memoReportService).deleteMemoReport("R1");
    }
}
