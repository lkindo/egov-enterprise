package com.company.project.foundation.api.controller.code;

import com.company.project.foundation.core.exception.GlobalExceptionHandler;
import com.company.project.foundation.service.code.CommonCodeService;
import com.company.project.foundation.service.code.dto.CmmnCodeDto;
import com.company.project.foundation.service.code.dto.CmmnDetailCodeDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.egovframe.rte.fdl.property.EgovPropertyService;
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

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("CommonCodeApiController ?�스??)
class CommonCodeApiControllerTest {

    private MockMvc mockMvc;

    @Mock
    private CommonCodeService commonCodeService;

    @Mock
    private EgovPropertyService propertiesService;

    @InjectMocks
    private CommonCodeApiController commonCodeApiController;

    private ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        mockMvc = MockMvcBuilders.standaloneSetup(commonCodeApiController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
        
        when(propertiesService.getInt("pageUnit")).thenReturn(10);
        when(propertiesService.getInt("pageSize")).thenReturn(10);
    }

    @Test
    @DisplayName("분류코드 목록 조회 ?�공")
    void testGetClCodeList() throws Exception {
        // Given
        when(commonCodeService.selectCmmnClCodeList(any())).thenReturn(Collections.emptyList());
        when(commonCodeService.selectCmmnClCodeListTotCnt(any())).thenReturn(0);

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/codes/cl")
                .param("pageIndex", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("공통코드 ?�록 ?�공")
    void testCreateCmmnCode() throws Exception {
        // Given
        CmmnCodeDto dto = new CmmnCodeDto();
        dto.setCodeId("GROUP_001");
        dto.setCodeIdNm("그룹�?);
        dto.setClCode("CL001");
        dto.setUseAt("Y");

        // When & Then
        mockMvc.perform(post("/api/v1/admin/system/codes/cmmn")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());

        verify(commonCodeService, times(1)).insertCmmnCode(any(CmmnCodeDto.class));
    }

    @Test
    @DisplayName("?�세코드 ?�세 조회 ?�공")
    void testGetDetailCode() throws Exception {
        // Given
        CmmnDetailCodeDto dto = new CmmnDetailCodeDto();
        dto.setCodeId("GROUP_001");
        dto.setCode("CODE_001");
        dto.setCodeNm("?�세코드�?);

        when(commonCodeService.selectCmmnDetailCodeDetail(any())).thenReturn(dto);

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/codes/detail/GROUP_001/CODE_001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.codeNm").value("?�세코드�?));
    }

    @Test
    @DisplayName("?�세코드 ??�� ?�공")
    void testDeleteDetailCode() throws Exception {
        // When & Then
        mockMvc.perform(delete("/api/v1/admin/system/codes/detail/GROUP_001/CODE_001"))
                .andExpect(status().isOk());

        verify(commonCodeService, times(1)).deleteCmmnDetailCode(any(CmmnDetailCodeDto.class));
    }
}
