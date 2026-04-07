package nuri.foundation.api.controller.code;

import nuri.foundation.core.exception.GlobalExceptionHandler;
import nuri.foundation.service.code.CommonCodeService;
import nuri.foundation.service.code.dto.CmmnClCodeDto;
import nuri.foundation.service.code.dto.CmmnCodeDto;
import nuri.foundation.service.code.dto.CmmnDetailCodeDto;
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
import static org.mockito.Mockito.when;
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
        
        when(propertiesService.getInt("pageUnit")).thenReturn(10);
        when(propertiesService.getInt("pageSize")).thenReturn(10);
    }

    // --- Classification Code Tests ---

    @Test
    @DisplayName("분류코드 목록 조회 성공")
    void testGetClCodeList() throws Exception {
        when(commonCodeService.selectCmmnClCodeList(any())).thenReturn(Collections.emptyList());
        when(commonCodeService.selectCmmnClCodeListTotCnt(any())).thenReturn(0);

        mockMvc.perform(get("/api/v1/admin/system/codes/cl"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("분류코드 상세 조회 성공")
    void testGetClCode() throws Exception {
        CmmnClCodeDto dto = new CmmnClCodeDto();
        dto.setClCode("CLC01");
        when(commonCodeService.selectCmmnClCodeDetail(any())).thenReturn(dto);

        mockMvc.perform(get("/api/v1/admin/system/codes/cl/CLC01"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.clCode").value("CLC01"));
    }

    @Test
    @DisplayName("분류코드 등록 성공")
    void testCreateClCode() throws Exception {
        CmmnClCodeDto dto = new CmmnClCodeDto();
        dto.setClCode("CLC_NEW");
        dto.setClCodeNm("New CL Code");

        mockMvc.perform(post("/api/v1/admin/system/codes/cl")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());
    }

    // --- Common Code Tests ---

    @Test
    @DisplayName("공통코드 목록 조회 성공")
    void testGetCmmnCodeList() throws Exception {
        when(commonCodeService.selectCmmnCodeList(any())).thenReturn(Collections.emptyList());
        when(commonCodeService.selectCmmnCodeListTotCnt(any())).thenReturn(0);

        mockMvc.perform(get("/api/v1/admin/system/codes/cmmn"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("공통코드 상세 조회 성공")
    void testGetCmmnCode() throws Exception {
        CmmnCodeDto dto = new CmmnCodeDto();
        dto.setCodeId("CD001");
        when(commonCodeService.selectCmmnCodeDetail(any())).thenReturn(dto);

        mockMvc.perform(get("/api/v1/admin/system/codes/cmmn/CD001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.codeId").value("CD001"));
    }

    // --- Detail Code Tests ---

    @Test
    @DisplayName("상세코드 목록 조회 성공")
    void testGetDetailCodeList() throws Exception {
        when(commonCodeService.selectCmmnDetailCodeList(any())).thenReturn(Collections.emptyList());
        when(commonCodeService.selectCmmnDetailCodeListTotCnt(any())).thenReturn(0);

        mockMvc.perform(get("/api/v1/admin/system/codes/detail"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("상세코드 상세 조회 성공")
    void testGetDetailCode() throws Exception {
        CmmnDetailCodeDto dto = new CmmnDetailCodeDto();
        dto.setCodeId("CD001");
        dto.setCode("DS01");
        when(commonCodeService.selectCmmnDetailCodeDetail(any())).thenReturn(dto);

        mockMvc.perform(get("/api/v1/admin/system/codes/detail/CD001/DS01"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.code").value("DS01"));
    }
}