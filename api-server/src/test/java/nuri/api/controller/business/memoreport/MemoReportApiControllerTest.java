package nuri.api.controller.business.memoreport;

import nuri.business.service.memoreport.MemoReportService;
import nuri.business.service.memoreport.dto.MemoReportDto;
import nuri.foundation.core.exception.GlobalExceptionHandler;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
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
import java.util.List;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class MemoReportApiControllerTest {

    private MockMvc mockMvc;
    private MemoReportService memoReportService;
    private ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        memoReportService = mock(MemoReportService.class);
        
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
        when(memoReportService.getMyReportList(anyString(), any(), any())).thenReturn(new PageImpl<>(Collections.emptyList()));
        mockMvc.perform(get("/api/v1/memo-reports/my")).andExpect(status().isOk());
    }

    @Test
    @DisplayName("수신 메모보고 목록 조회 - 성공")
    void getReceivedReports_success() throws Exception {
        when(memoReportService.getReceivedReportList(anyString(), any(), any())).thenReturn(new PageImpl<>(Collections.emptyList()));
        mockMvc.perform(get("/api/v1/memo-reports/received")).andExpect(status().isOk());
    }

    /**
     * [2026-08-29] 발신함·수신함이 검색어를 실제로 서비스까지 넘긴다.
     *
     * 종전에는 두 엔드포인트가 searchKeyword 를 선언하지 않아 Spring 이 조용히 버렸다 —
     * 화면의 조회 조건이 기본 탭에서 무동작이었다. 파라미터가 다시 사라지면 여기서 red 다.
     */
    @Test
    @DisplayName("발신함·수신함이 검색어를 서비스로 전달한다")
    void scopedLists_passSearchKeyword() throws Exception {
        when(memoReportService.getMyReportList(anyString(), any(), any())).thenReturn(new PageImpl<>(Collections.emptyList()));
        when(memoReportService.getReceivedReportList(anyString(), any(), any())).thenReturn(new PageImpl<>(Collections.emptyList()));

        mockMvc.perform(get("/api/v1/memo-reports/my").param("searchKeyword", "보고")).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/memo-reports/received").param("searchKeyword", "보고")).andExpect(status().isOk());

        verify(memoReportService).getMyReportList(anyString(), eq("보고"), any());
        verify(memoReportService).getReceivedReportList(anyString(), eq("보고"), any());
    }

    @Test
    @DisplayName("메모보고 상세 조회 - 성공")
    void getMemoReport_success() throws Exception {
        when(memoReportService.getMemoReport(1L)).thenReturn(MemoReportDto.builder().memoRptSn(1L).build());
        mockMvc.perform(get("/api/v1/memo-reports/1")).andExpect(status().isOk());
    }

    @Test
    @DisplayName("메모보고 등록 - 성공")
    void createMemoReport_success() throws Exception {
        when(memoReportService.createMemoReport(eq("testUser"), any())).thenReturn(2L);
        mockMvc.perform(post("/api/v1/memo-reports")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "memoRptSn": 999,
                          "rptTtl": "Subject",
                          "memoRptYmd": "20260906",
                          "userId": "forged-writer",
                          "wrterNm": "forged-writer-name",
                          "rptrId": "USER",
                          "rptrNm": "forged-recipient-name",
                          "rptCn": "Content",
                          "drctnMttr": "forged-instruction",
                          "drctnMttrRegDt": "2026-09-06T01:00:00",
                          "rptrInqDt": "2026-09-06T02:00:00",
                          "crtDt": "2026-09-06T03:00:00"
                        }
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value(2));

        ArgumentCaptor<MemoReportDto> dto = ArgumentCaptor.forClass(MemoReportDto.class);
        verify(memoReportService).createMemoReport(eq("testUser"), dto.capture());
        assertEquals("Subject", dto.getValue().getRptTtl());
        assertEquals("USER", dto.getValue().getRptrId());
        assertNull(dto.getValue().getMemoRptSn());
        assertNull(dto.getValue().getUserId());
        assertNull(dto.getValue().getWrterNm());
        assertNull(dto.getValue().getRptrNm());
        assertNull(dto.getValue().getDrctnMttr());
        assertNull(dto.getValue().getDrctnMttrRegDt());
        assertNull(dto.getValue().getRptrInqDt());
        assertNull(dto.getValue().getCrtDt());
    }

    @Test
    @DisplayName("메모보고 등록은 직접 저장 문자열의 필수·물리 길이 계약을 검증한다")
    void createMemoReport_rejectsInvalidStorageContract() throws Exception {
        List<Map<String, Object>> invalidBodies = List.of(
                Map.of("rptTtl", " ", "memoRptYmd", "20260906", "rptrId", "USER", "rptCn", "내용"),
                Map.of("rptTtl", "제목", "memoRptYmd", "20260906", "rptrId", " ", "rptCn", "내용"),
                Map.of("rptTtl", "가".repeat(101), "memoRptYmd", "20260906", "rptrId", "USER", "rptCn", "내용"),
                Map.of("rptTtl", "제목", "memoRptYmd", "202609061", "rptrId", "USER", "rptCn", "내용"),
                Map.of("rptTtl", "제목", "memoRptYmd", "20260906", "rptrId", "U".repeat(21), "rptCn", "내용"),
                Map.of("rptTtl", "제목", "memoRptYmd", "20260906", "rptrId", "USER", "rptCn", "가".repeat(4001)));

        for (Map<String, Object> body : invalidBodies) {
            mockMvc.perform(post("/api/v1/memo-reports")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(body)))
                    .andExpect(status().isBadRequest());
        }

        verifyNoInteractions(memoReportService);
    }

    @Test
    @DisplayName("메모보고 수정 - 성공")
    void updateMemoReport_success() throws Exception {
        MemoReportDto dto = MemoReportDto.builder().rptTtl("Update").rptrId("USER").build();
        mockMvc.perform(put("/api/v1/memo-reports/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());
        verify(memoReportService).updateMemoReport(eq(1L), eq("testUser"), any());
    }

    @Test
    @DisplayName("메모보고 수정도 직접 저장 문자열 계약을 우회하지 않는다")
    void updateMemoReport_rejectsInvalidStorageContract() throws Exception {
        mockMvc.perform(put("/api/v1/memo-reports/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "rptTtl", "제목",
                                "memoRptYmd", "20260906",
                                "rptrId", "USER",
                                "rptCn", "가".repeat(4001)))))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(memoReportService);
    }

    @Test
    @DisplayName("지시사항 typed JSON 업데이트 - 성공")
    void updateDrctMatter_typedJsonSuccess() throws Exception {
        mockMvc.perform(patch("/api/v1/memo-reports/1/instr-cn")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"drctnMttr":"Do it now"}
                        """))
                .andExpect(status().isOk());
        verify(memoReportService).updateDrctMatter(1L, "Do it now");
    }

    @Test
    @DisplayName("지시사항은 공백이 아니고 물리 컬럼 2000자 이하여야 한다")
    void updateDrctMatter_rejectsInvalidTypedJson() throws Exception {
        for (String instruction : new String[]{"   ", "가".repeat(2001)}) {
            mockMvc.perform(patch("/api/v1/memo-reports/1/instr-cn")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(
                                    java.util.Map.of("drctnMttr", instruction))))
                    .andExpect(status().isBadRequest());
        }

        verifyNoInteractions(memoReportService);
    }

    @Test
    @DisplayName("기존 application/json 문자열 지시사항 요청도 호환한다")
    void updateDrctMatter_legacyJsonStringCompatibility() throws Exception {
        mockMvc.perform(patch("/api/v1/memo-reports/1/instr-cn")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString("Legacy JSON instruction")))
                .andExpect(status().isOk());

        verify(memoReportService).updateDrctMatter(1L, "Legacy JSON instruction");
    }

    @Test
    @DisplayName("메모보고 삭제 - 성공")
    void deleteMemoReport_success() throws Exception {
        mockMvc.perform(delete("/api/v1/memo-reports/1")).andExpect(status().isOk());
        verify(memoReportService).deleteMemoReport(1L);
    }
}
