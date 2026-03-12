package com.company.project.api.controller.code;

import com.company.project.service.code.CommonCodeService;
import com.company.project.service.code.dto.CmmnClCodeDto;
import com.company.project.service.code.dto.CmmnCodeDto;
import com.company.project.service.code.dto.CmmnDetailCodeDto;
import egovframework.com.cmm.ComDefaultVO;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("CodeApiController 테스트")
class CodeApiControllerTest {

    private MockMvc mockMvc;

    @Mock
    private CommonCodeService commonCodeService;

    @Mock
    private EgovPropertyService propertiesService;

    @InjectMocks
    private CodeApiController codeApiController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(codeApiController).build();
    }

    // --- Classification Code Tests ---

    @Test
    @DisplayName("분류코드 목록 조회 성공")
    void getClCodeList_Success() throws Exception {
        given(propertiesService.getInt("pageUnit")).willReturn(10);
        given(propertiesService.getInt("pageSize")).willReturn(10);
        given(commonCodeService.selectCmmnClCodeList(any(ComDefaultVO.class)))
                .willReturn(Collections.singletonList(new CmmnClCodeDto()));
        given(commonCodeService.selectCmmnClCodeListTotCnt(any(ComDefaultVO.class))).willReturn(1);

        mockMvc.perform(get("/api/v1/admin/codes/cl")
                        .param("pageIndex", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.list").isArray());
    }

    @Test
    @DisplayName("분류코드 상세 조회 성공")
    void getClCode_Success() throws Exception {
        CmmnClCodeDto dto = new CmmnClCodeDto();
        dto.setClCode("CL1");
        given(commonCodeService.selectCmmnClCodeDetail(any(CmmnClCodeDto.class))).willReturn(dto);

        mockMvc.perform(get("/api/v1/admin/codes/cl/CL1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.clCode").value("CL1"));
    }

    @Test
    @DisplayName("분류코드 등록 성공")
    void createClCode_Success() throws Exception {
        mockMvc.perform(post("/api/v1/admin/codes/cl")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"clCode\":\"CL_NEW\", \"clCodeNm\":\"New Class\"}"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("분류코드 수정 성공")
    void updateClCode_Success() throws Exception {
        mockMvc.perform(put("/api/v1/admin/codes/cl/CL1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"clCodeNm\":\"Updated Name\"}"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("분류코드 삭제 성공")
    void deleteClCode_Success() throws Exception {
        mockMvc.perform(delete("/api/v1/admin/codes/cl/CL1"))
                .andExpect(status().isOk());
    }

    // --- Common Code Tests ---

    @Test
    @DisplayName("공통코드 목록 조회 성공")
    void getCmmnCodeList_Success() throws Exception {
        given(propertiesService.getInt("pageUnit")).willReturn(10);
        given(propertiesService.getInt("pageSize")).willReturn(10);
        given(commonCodeService.selectCmmnCodeList(any(ComDefaultVO.class)))
                .willReturn(Collections.singletonList(new CmmnCodeDto()));
        given(commonCodeService.selectCmmnCodeListTotCnt(any(ComDefaultVO.class))).willReturn(1);

        mockMvc.perform(get("/api/v1/admin/codes/cmmn"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("공통코드 상세 조회 성공")
    void getCmmnCode_Success() throws Exception {
        CmmnCodeDto dto = new CmmnCodeDto();
        dto.setCodeId("CD1");
        given(commonCodeService.selectCmmnCodeDetail(any(CmmnCodeDto.class))).willReturn(dto);

        mockMvc.perform(get("/api/v1/admin/codes/cmmn/CD1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.codeId").value("CD1"));
    }

    // --- Detail Code Tests ---

    @Test
    @DisplayName("상세코드 목록 조회 성공")
    void getDetailCodeList_Success() throws Exception {
        given(propertiesService.getInt("pageUnit")).willReturn(10);
        given(propertiesService.getInt("pageSize")).willReturn(10);
        given(commonCodeService.selectCmmnDetailCodeList(any(ComDefaultVO.class)))
                .willReturn(Collections.singletonList(new CmmnDetailCodeDto()));
        given(commonCodeService.selectCmmnDetailCodeListTotCnt(any(ComDefaultVO.class))).willReturn(1);

        mockMvc.perform(get("/api/v1/admin/codes/detail"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("상세코드 상세 조회 성공")
    void getDetailCode_Success() throws Exception {
        CmmnDetailCodeDto dto = new CmmnDetailCodeDto();
        dto.setCode("D1");
        given(commonCodeService.selectCmmnDetailCodeDetail(any(CmmnDetailCodeDto.class))).willReturn(dto);

        mockMvc.perform(get("/api/v1/admin/codes/detail/CD1/D1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.code").value("D1"));
    }
}
