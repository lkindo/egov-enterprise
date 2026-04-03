package com.company.project.foundation.api.controller.code;
 
import com.company.project.foundation.core.exception.GlobalExceptionHandler;
import com.company.project.foundation.service.code.CommonCodeService;
import com.company.project.foundation.service.code.dto.CmmnCodeDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
 
import java.util.Collections;
 
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
 
@DisplayName("CommonCodeApiController 테스트")
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
                
        lenient().when(propertiesService.getInt(anyString())).thenReturn(10);
    }
 
    @Test
    @DisplayName("공통코드 목록 조회 성공")
    void testGetCommonCodes() throws Exception {
        // Given
        when(commonCodeService.selectCmmnCodeList(any())).thenReturn(Collections.emptyList());
        when(commonCodeService.selectCmmnCodeListTotCnt(any())).thenReturn(0);
 
        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/codes/cmmn")
                .param("pageIndex", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
 
    @Test
    @DisplayName("공통코드 상세 조회 성공")
    void testGetCommonCode() throws Exception {
        // Given
        CmmnCodeDto dto = CmmnCodeDto.builder()
                .codeId("C001")
                .codeIdNm("공통코드01")
                .build();
        when(commonCodeService.selectCmmnCodeDetail(any(CmmnCodeDto.class))).thenReturn(dto);
 
        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/codes/cmmn/C001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.codeId").value("C001"));
    }
 
    @Test
    @DisplayName("공통코드 등록 성공")
    void testCreateCommonCode() throws Exception {
        // Given
        CmmnCodeDto dto = CmmnCodeDto.builder()
                .codeId("C_NEW")
                .codeIdNm("신규 공통코드")
                .build();
 
        // When & Then
        mockMvc.perform(post("/api/v1/admin/system/codes/cmmn")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());
 
        verify(commonCodeService, times(1)).insertCmmnCode(any(CmmnCodeDto.class));
    }
 
    @Test
    @DisplayName("공통코드 삭제 성공")
    void testDeleteCommonCode() throws Exception {
        // When & Then
        mockMvc.perform(delete("/api/v1/admin/system/codes/cmmn/C001"))
                .andExpect(status().isOk());
 
        verify(commonCodeService, times(1)).deleteCmmnCode(any(CmmnCodeDto.class));
    }
}