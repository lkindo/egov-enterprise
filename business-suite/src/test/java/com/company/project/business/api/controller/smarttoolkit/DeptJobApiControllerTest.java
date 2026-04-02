package com.company.project.business.api.controller.smarttoolkit;

import com.company.project.foundation.security.service.CustomUserDetails;
import com.company.project.business.service.deptjob.EgovDeptJobBoxService;
import com.company.project.business.service.deptjob.dto.DeptJobBoxDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.doNothing;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(DeptJobApiController.class)
@DisplayName("DeptJobApiController 테스트")
class DeptJobApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private EgovDeptJobBoxService egovDeptJobBoxService;

    @Test
    @DisplayName("부서 업무함 목록 조회 성공")
    @WithMockUser
    void getDeptJobBoxList_Success() throws Exception {
        // Given
        Page<DeptJobBoxDto> page = new PageImpl<>(List.of(DeptJobBoxDto.builder().deptJobbxId("BOX1").build()));
        given(egovDeptJobBoxService.getDeptJobBoxList(anyString(), any(Pageable.class))).willReturn(page);

        // When & Then
        mockMvc.perform(get("/api/v1/dept-jobs/boxes")
                .param("pageIndex", "1")
                .param("pageUnit", "10")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("부서 업무함 상세 조회 성공")
    @WithMockUser
    void getDeptJobBox_Success() throws Exception {
        // Given
        given(egovDeptJobBoxService.getDeptJobBox("BOX1")).willReturn(DeptJobBoxDto.builder().deptJobbxId("BOX1").build());

        // When & Then
        mockMvc.perform(get("/api/v1/dept-jobs/boxes/BOX1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("부서 업무함 등록 성공")
    void createDeptJobBox_Success() throws Exception {
        // Given
        CustomUserDetails userDetails = CustomUserDetails.builder()
                .esntlId("USR_001")
                .build();
        given(egovDeptJobBoxService.createDeptJobBox(eq("USR_001"), any(DeptJobBoxDto.class))).willReturn("NEW_ID");

        // When & Then
        mockMvc.perform(post("/api/v1/dept-jobs/boxes")
                        .with(user(userDetails))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(DeptJobBoxDto.builder()
                                .deptJobbxNm("Test Box")
                                .deptId("D1")
                                .build())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("부서 업무함 수정 성공")
    void updateDeptJobBox_Success() throws Exception {
        // Given
        CustomUserDetails userDetails = CustomUserDetails.builder()
                .esntlId("USR_001")
                .build();
        doNothing().when(egovDeptJobBoxService).updateDeptJobBox(eq("BOX1"), eq("USR_001"), any(DeptJobBoxDto.class));

        // When & Then
        mockMvc.perform(put("/api/v1/dept-jobs/boxes/BOX1")
                        .with(user(userDetails))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(DeptJobBoxDto.builder()
                                .deptJobbxNm("Updated Box")
                                .deptId("D1")
                                .build())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("부서 업무함 삭제 성공")
    void deleteDeptJobBox_Success() throws Exception {
        // Given
        CustomUserDetails userDetails = CustomUserDetails.builder()
                .esntlId("USR_001")
                .build();
        doNothing().when(egovDeptJobBoxService).deleteDeptJobBox("BOX1");

        // When & Then
        mockMvc.perform(delete("/api/v1/dept-jobs/boxes/BOX1")
                        .with(user(userDetails))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
