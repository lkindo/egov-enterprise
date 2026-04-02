package com.company.project.foundation.api.controller.system;

import com.company.project.foundation.core.exception.GlobalExceptionHandler;
import com.company.project.foundation.service.program.ProgramService;
import com.company.project.foundation.service.program.dto.ProgramDto;
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

import org.springframework.data.web.PageableHandlerMethodArgumentResolver;

@DisplayName("ProgramApiController ?åÏä§??)
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
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
                .build();
    }

    @Test
    @DisplayName("?ÑÎ°úÍ∑∏Îû® Î™©Î°ù Ï°∞Ìöå ?±Í≥µ")
    void testGetProgramList() throws Exception {
        // Given
        when(programService.selectProgrmList(any())).thenReturn(Collections.emptyList());
        when(programService.selectProgrmListTotCnt(any())).thenReturn(0);

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/programs")
                .param("page", "0")
                .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("?ÑÎ°úÍ∑∏Îû® ?ÅÏÑ∏ Ï°∞Ìöå ?±Í≥µ")
    void testGetProgram() throws Exception {
        // Given
        ProgramDto dto = ProgramDto.builder()
                .progrmFileNm("Prog001")
                .progrmKoreanNm("?ÑÎ°úÍ∑∏Îû® 001")
                .build();
        when(programService.selectProgrmById("Prog001")).thenReturn(dto);

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/programs/Prog001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.progrmFileNm").value("Prog001"));
    }

    @Test
    @DisplayName("?ÑÎ°úÍ∑∏Îû® ?±Î°ù ?±Í≥µ")
    void testCreateProgram() throws Exception {
        // Given
        ProgramDto dto = ProgramDto.builder()
                .progrmFileNm("NewProg")
                .progrmKoreanNm("?†Í∑ú ?ÑÎ°úÍ∑∏Îû®")
                .build();

        // When & Then
        mockMvc.perform(post("/api/v1/admin/system/programs")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());

        verify(programService, times(1)).insertProgrm(any(ProgramDto.class));
    }

    @Test
    @DisplayName("?ÑÎ°úÍ∑∏Îû® ?òÏ†ï ?±Í≥µ")
    void testUpdateProgram() throws Exception {
        // Given
        ProgramDto dto = ProgramDto.builder()
                .progrmKoreanNm("?òÏ†ï???ÑÎ°úÍ∑∏Îû®")
                .build();

        // When & Then
        mockMvc.perform(put("/api/v1/admin/system/programs/Prog001")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());

        verify(programService, times(1)).updateProgrm(any(ProgramDto.class));
    }

    @Test
    @DisplayName("?ÑÎ°úÍ∑∏Îû® ??†ú ?±Í≥µ")
    void testDeleteProgram() throws Exception {
        // When & Then
        mockMvc.perform(delete("/api/v1/admin/system/programs/Prog001"))
                .andExpect(status().isOk());

        verify(programService, times(1)).deleteProgrm(any(ProgramDto.class));
    }
}
