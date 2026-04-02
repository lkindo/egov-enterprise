package com.company.project.foundation.api.controller.system;

import com.company.project.foundation.core.exception.GlobalExceptionHandler;
import com.company.project.foundation.service.system.DeptManageService;
import com.company.project.foundation.service.system.dto.DeptManageDto;
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

@DisplayName("DeptApiController 테스트")
class DeptApiControllerTest {

    private MockMvc mockMvc;

    @Mock
    private DeptManageService deptManageService;

    @InjectMocks
    private DeptApiController deptApiController;

    private ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        mockMvc = MockMvcBuilders.standaloneSetup(deptApiController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("부서 목록 조회 성공")
    void testGetDepts() throws Exception {
        // Given
        when(deptManageService.selectDeptManageList(any())).thenReturn(Collections.emptyList());
        when(deptManageService.selectDeptManageListTotCnt(any())).thenReturn(0);

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/departments")
                .param("pageIndex", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("부서 상세 조회 성공")
    void testGetDept() throws Exception {
        // Given
        DeptManageDto dto = new DeptManageDto();
        dto.setOrgnztId("ORG_001");
        dto.setOrgnztNm("총무부");
        when(deptManageService.selectDeptManage("ORG_001")).thenReturn(dto);

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/departments/ORG_001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.orgnztId").value("ORG_001"));
    }

    @Test
    @DisplayName("부서 등록 성공")
    void testCreateDept() throws Exception {
        // Given
        DeptManageDto dto = new DeptManageDto();
        dto.setOrgnztId("ORG_NEW");
        dto.setOrgnztNm("신규 부서");

        // When & Then
        mockMvc.perform(post("/api/v1/admin/system/departments")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());

        verify(deptManageService, times(1)).insertDeptManage(any(DeptManageDto.class));
    }

    @Test
    @DisplayName("부서 삭제 성공")
    void testDeleteDept() throws Exception {
        // When & Then
        mockMvc.perform(delete("/api/v1/admin/system/departments/ORG_001"))
                .andExpect(status().isOk());

        verify(deptManageService, times(1)).deleteDeptManage("ORG_001");
    }
}