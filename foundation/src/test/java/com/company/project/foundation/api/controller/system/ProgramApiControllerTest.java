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
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
                .build();
    }

    @Test
    @DisplayName("프로그램 목록 조회 성공")
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
    @DisplayName("프로그램 상세 조회 성공")
    void testGetProgram() throws Exception {
        // Given
        ProgramDto dto = ProgramDto.builder()
                .progrmFileNm("Prog001")
                .progrmKoreanNm("프로그램 001")
                .build();
        when(programService.selectProgrmById("Prog001")).thenReturn(dto);

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/programs/Prog001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.progrmFileNm").value("Prog001"));
    }

    @Test
    @DisplayName("프로그램 등록 성공")
    void testCreateProgram() throws Exception {
        // Given
        ProgramDto dto = ProgramDto.builder()
                .progrmFileNm("NewProg")
                .progrmKoreanNm("신규 프로그램")
                .build();

        // When & Then
        mockMvc.perform(post("/api/v1/admin/system/programs")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());

        verify(programService, times(1)).insertProgrm(any(ProgramDto.class));
    }

    @Test
    @DisplayName("프로그램 수정 성공")
    void testUpdateProgram() throws Exception {
        // Given
        ProgramDto dto = ProgramDto.builder()
                .progrmKoreanNm("수정된 프로그램")
                .build();

        // When & Then
        mockMvc.perform(put("/api/v1/admin/system/programs/Prog001")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());

        verify(programService, times(1)).updateProgrm(any(ProgramDto.class));
    }

    @Test
    @DisplayName("프로그램 삭제 성공")
    void testDeleteProgram() throws Exception {
        // When & Then
        mockMvc.perform(delete("/api/v1/admin/system/programs/Prog001"))
                .andExpect(status().isOk());

        verify(programService, times(1)).deleteProgrm(any(ProgramDto.class));
    }
}
