package com.company.project.foundation.api.controller.system;

import com.company.project.foundation.core.exception.GlobalExceptionHandler;
import com.company.project.foundation.service.usermanagement.EgovDeptManageService;
import com.company.project.foundation.service.usermanagement.dto.DeptManageDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("DeptApiController 테스트")
class DeptApiControllerTest {

    private MockMvc mockMvc;

    @Mock
    private EgovDeptManageService deptManageService;

    @InjectMocks
    private DeptApiController deptApiController;

    private ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        mockMvc = MockMvcBuilders.standaloneSetup(deptApiController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
                .build();
    }

    @Test
    @DisplayName("부서 목록 조회 성공")
    void testGetDepts() throws Exception {
        // Given
        when(deptManageService.getDeptManageList(any(), any()))
                .thenReturn(new PageImpl<>(Collections.emptyList()));

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/depts")
                .param("page", "0")
                .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("부서 상세 조회 성공")
    void testGetDept() throws Exception {
        // Given
        DeptManageDto dto = DeptManageDto.builder()
                .orgnztId("ORGNZT_001")
                .orgnztNm("개발부")
                .build();
        when(deptManageService.getDeptManage("ORGNZT_001")).thenReturn(dto);

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/depts/ORGNZT_001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.orgnztId").value("ORGNZT_001"));
    }

    @Test
    @DisplayName("부서 등록 성공")
    void testInsertDept() throws Exception {
        // Given
        DeptManageDto dto = DeptManageDto.builder()
                .orgnztId("ORGNZT_NEW")
                .orgnztNm("신규부서")
                .build();

        // When & Then
        mockMvc.perform(post("/api/v1/admin/system/depts")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());

        verify(deptManageService, times(1)).insertDeptManage(any(DeptManageDto.class));
    }

    @Test
    @DisplayName("부서 삭제 성공")
    void testDeleteDept() throws Exception {
        // When & Then
        mockMvc.perform(delete("/api/v1/admin/system/depts/ORGNZT_001"))
                .andExpect(status().isOk());

        verify(deptManageService, times(1)).deleteDeptManage("ORGNZT_001");
    }
}
