package nuri.api.controller.foundation.controller.system.service.isg;

import nuri.foundation.core.exception.GlobalExceptionHandler;
import nuri.business.service.isg.InternetSvcGuidanceService;
import nuri.business.service.isg.dto.InternetSvcGuidanceDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("InternetSvcGuidanceApiController 테스트")
class InternetSvcGuidanceApiControllerTest {

    private MockMvc mockMvc;

    @Mock
    private InternetSvcGuidanceService isgService;

    @InjectMocks
    private InternetSvcGuidanceApiController internetSvcGuidanceApiController;

    private ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        objectMapper.registerModule(new JavaTimeModule());
        mockMvc = MockMvcBuilders.standaloneSetup(internetSvcGuidanceApiController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
                .build();
    }

    @Test
    @DisplayName("서비스 안내 목록 조회 성공")
    void testGetIsgList() throws Exception {
        // Given
        Page<InternetSvcGuidanceDto> page = new PageImpl<>(Collections.emptyList());
        when(isgService.getIntnetSvcGuidanceList(any(), any())).thenReturn(page);

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/isg")
                .param("page", "0")
                .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("서비스 안내 상세 조회 성공")
    void testGetIsg() throws Exception {
        // Given
        InternetSvcGuidanceDto dto = InternetSvcGuidanceDto.builder()
                .intnetSvcId("ISG_0001")
                .intnetSvcNm("테스트 서비스")
                .intnetSvcDc("테스트 설명")
                .build();
        when(isgService.getIntnetSvcGuidance("ISG_0001")).thenReturn(dto);

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/isg/ISG_0001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.intnetSvcId").value("ISG_0001"))
                .andExpect(jsonPath("$.data.intnetSvcNm").value("테스트 서비스"));
    }

    @Test
    @DisplayName("서비스 안내 등록 성공")
    void testRegisterIsg() throws Exception {
        // Given
        InternetSvcGuidanceDto dto = InternetSvcGuidanceDto.builder()
                .intnetSvcNm("새 서비스")
                .intnetSvcDc("새 설명")
                .build();

        // When & Then
        mockMvc.perform(post("/api/v1/admin/system/isg")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());

        verify(isgService, times(1)).registerIntnetSvcGuidance(any(InternetSvcGuidanceDto.class));
    }

    @Test
    @DisplayName("서비스 안내 수정 성공")
    void testUpdateIsg() throws Exception {
        // Given
        InternetSvcGuidanceDto dto = InternetSvcGuidanceDto.builder()
                .intnetSvcNm("수정 서비스")
                .intnetSvcDc("수정 설명")
                .build();

        // When & Then
        mockMvc.perform(put("/api/v1/admin/system/isg/ISG_0001")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());

        verify(isgService, times(1)).updateIntnetSvcGuidance(any(InternetSvcGuidanceDto.class));
    }

    @Test
    @DisplayName("서비스 안내 삭제 성공")
    void testDeleteIsg() throws Exception {
        // When & Then
        mockMvc.perform(delete("/api/v1/admin/system/isg/ISG_0001"))
                .andExpect(status().isOk());

        verify(isgService, times(1)).deleteIntnetSvcGuidance("ISG_0001");
    }
}
