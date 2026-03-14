package com.company.project.api.controller.system;

import com.company.project.service.program.ProgramService;
import com.company.project.service.program.dto.ProgramDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ProgramAdminController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("ProgramAdminController 테스트")
class ProgramAdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private ProgramService programService;

    private final String BASE_URL = "/api/v1/admin/system/programs";

    @Test
    @DisplayName("프로그램 목록 조회 성공")
    void getProgramList_Success() throws Exception {
        given(programService.selectProgrmList(any())).willReturn(Collections.singletonList(new ProgramDto()));
        given(programService.selectProgrmListTotCnt(any())).willReturn(1);

        mockMvc.perform(get(BASE_URL)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("프로그램 상세 조회 성공")
    void getProgram_Success() throws Exception {
        given(programService.selectProgrmById(anyString())).willReturn(
                ProgramDto.builder().progrmFileNm("MyProg").progrmKoreanNm("My Program").build()
        );

        mockMvc.perform(get(BASE_URL + "/MyProg")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.progrmKoreanNm").value("My Program"));
    }

    @Test
    @DisplayName("프로그램 등록 성공")
    void createProgram_Success() throws Exception {
        ProgramDto dto = ProgramDto.builder().progrmFileNm("NewProg").build();

        mockMvc.perform(post(BASE_URL)
                        .with(csrf())
                        .content(objectMapper.writeValueAsString(dto))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("프로그램 수정 성공")
    void updateProgram_Success() throws Exception {
        ProgramDto dto = ProgramDto.builder().progrmFileNm("MyProg").build();

        mockMvc.perform(put(BASE_URL + "/MyProg")
                        .with(csrf())
                        .content(objectMapper.writeValueAsString(dto))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("프로그램 삭제 성공")
    void deleteProgram_Success() throws Exception {
        mockMvc.perform(delete(BASE_URL + "/MyProg")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
