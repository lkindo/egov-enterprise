package nuri.api.controller.foundation.controller.system;

import nuri.business.core.exception.GlobalExceptionHandler;
import nuri.business.service.program.ProgramService;
import nuri.business.service.program.dto.ProgramDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("ProgramApiController 테스트")
class ProgramApiControllerTest {

    private MockMvc mockMvc;

    @Mock
    private ProgramService programService;

    @InjectMocks
    private ProgramApiController programApiController;

    private ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        mockMvc = MockMvcBuilders.standaloneSetup(programApiController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new org.springframework.data.web.PageableHandlerMethodArgumentResolver())
                .build();
    }

    @Test
    @DisplayName("프로그램 목록 조회 성공")
    void testGetPrograms() throws Exception {
        // Given
        when(programService.selectProgrmList(any())).thenReturn(Collections.emptyList());
        when(programService.selectProgrmListTotCnt(any())).thenReturn(0);

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/programs")
                .param("pageIndex", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("프로그램 상세 조회 성공")
    void testGetProgram() throws Exception {
        // Given
        ProgramDto dto = new ProgramDto();
        dto.setPrgrmFileNm("PROG_01");
        dto.setPrgrmKornNm("프로그램01");
        when(programService.selectProgrmById("PROG_01")).thenReturn(dto);

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/programs/PROG_01"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.prgrmFileNm").value("PROG_01"));
    }

    @Test
    @DisplayName("프로그램 등록 성공")
    void testCreateProgram() throws Exception {
        // Given
        ProgramDto dto = new ProgramDto();
        dto.setPrgrmFileNm("PROG_NEW");
        dto.setPrgrmKornNm("신규 프로그램");

        // When & Then
        mockMvc.perform(post("/api/v1/admin/system/programs")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());

        verify(programService, times(1)).insertProgrm(any(ProgramDto.class));
    }

    @Test
    @DisplayName("프로그램 삭제 성공")
    void testDeleteProgram() throws Exception {
        // When & Then
        mockMvc.perform(delete("/api/v1/admin/system/programs/PROG_01"))
                .andExpect(status().isOk());

        verify(programService, times(1)).deleteProgrm(any(ProgramDto.class));
    }
}