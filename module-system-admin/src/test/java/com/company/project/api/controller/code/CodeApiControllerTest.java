package com.company.project.api.controller.code;

import com.company.project.service.code.CommonCodeService;
import com.company.project.service.code.dto.CmmnClCodeDto;
import com.company.project.service.code.dto.CmmnCodeDto;
import com.company.project.service.code.dto.CmmnDetailCodeDto;
import egovframework.com.cmm.ComDefaultVO;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(CodeApiController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("CodeApiController 테스트")
class CodeApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CommonCodeService commonCodeService;

    @MockitoBean
    private EgovPropertyService propertiesService;

    @Test
    @DisplayName("분류코드 목록 조회 성공")
    void getClCodeList_Success() throws Exception {
        // Given
        given(propertiesService.getInt("pageUnit")).willReturn(10);
        given(propertiesService.getInt("pageSize")).willReturn(10);
        given(commonCodeService.selectCmmnClCodeList(any(ComDefaultVO.class))).willReturn(List.of(CmmnClCodeDto.builder().clCode("CL1").build()));
        given(commonCodeService.selectCmmnClCodeListTotCnt(any(ComDefaultVO.class))).willReturn(1);

        // When & Then
        mockMvc.perform(get("/api/v1/admin/codes/cl")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.list[0].clCode").value("CL1"));
    }

    @Test
    @DisplayName("분류코드 상세 조회 성공")
    void getClCode_Success() throws Exception {
        // Given
        given(commonCodeService.selectCmmnClCodeDetail(any())).willReturn(CmmnClCodeDto.builder().clCode("CL1").clCodeNm("Name").build());

        // When & Then
        mockMvc.perform(get("/api/v1/admin/codes/cl/CL1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.clCode").value("CL1"));
    }

    @Test
    @DisplayName("분류코드 등록 성공")
    void createClCode_Success() throws Exception {
        // When & Then
        mockMvc.perform(post("/api/v1/admin/codes/cl")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"clCode\":\"CL1\", \"clCodeNm\":\"Name\", \"useAt\":\"Y\"}")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("분류코드 수정 성공")
    void updateClCode_Success() throws Exception {
        // When & Then
        mockMvc.perform(put("/api/v1/admin/codes/cl/CL1")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"clCodeNm\":\"Updated Name\", \"useAt\":\"Y\"}")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("분류코드 삭제 성공")
    void deleteClCode_Success() throws Exception {
        // When & Then
        mockMvc.perform(delete("/api/v1/admin/codes/cl/CL1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("공통코드 목록 조회 성공")
    void getCmmnCodeList_Success() throws Exception {
        // Given
        given(propertiesService.getInt("pageUnit")).willReturn(10);
        given(propertiesService.getInt("pageSize")).willReturn(10);
        given(commonCodeService.selectCmmnCodeList(any(ComDefaultVO.class))).willReturn(List.of(CmmnCodeDto.builder().codeId("CODE1").build()));
        given(commonCodeService.selectCmmnCodeListTotCnt(any(ComDefaultVO.class))).willReturn(1);

        // When & Then
        mockMvc.perform(get("/api/v1/admin/codes/cmmn")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.list[0].codeId").value("CODE1"));
    }

    @Test
    @DisplayName("공통코드 상세 조회 성공")
    void getCmmnCode_Success() throws Exception {
        // Given
        given(commonCodeService.selectCmmnCodeDetail(any())).willReturn(CmmnCodeDto.builder().codeId("CODE1").build());

        // When & Then
        mockMvc.perform(get("/api/v1/admin/codes/cmmn/CODE1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.codeId").value("CODE1"));
    }

    @Test
    @DisplayName("공통코드 등록 성공")
    void createCmmnCode_Success() throws Exception {
        // When & Then
        mockMvc.perform(post("/api/v1/admin/codes/cmmn")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"codeId\":\"CODE1\", \"codeIdNm\":\"Name\", \"useAt\":\"Y\"}")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("공통코드 수정 성공")
    void updateCmmnCode_Success() throws Exception {
        // When & Then
        mockMvc.perform(put("/api/v1/admin/codes/cmmn/CODE1")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"codeIdNm\":\"Updated\", \"useAt\":\"Y\"}")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("공통코드 삭제 성공")
    void deleteCmmnCode_Success() throws Exception {
        // When & Then
        mockMvc.perform(delete("/api/v1/admin/codes/cmmn/CODE1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("상세코드 목록 조회 성공")
    void getDetailCodeList_Success() throws Exception {
        // Given
        given(propertiesService.getInt("pageUnit")).willReturn(10);
        given(propertiesService.getInt("pageSize")).willReturn(10);
        given(commonCodeService.selectCmmnDetailCodeList(any(ComDefaultVO.class))).willReturn(List.of(CmmnDetailCodeDto.builder().code("D1").build()));
        given(commonCodeService.selectCmmnDetailCodeListTotCnt(any(ComDefaultVO.class))).willReturn(1);

        // When & Then
        mockMvc.perform(get("/api/v1/admin/codes/detail")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.list[0].code").value("D1"));
    }

    @Test
    @DisplayName("상세코드 상세 조회 성공")
    void getDetailCode_Success() throws Exception {
        // Given
        given(commonCodeService.selectCmmnDetailCodeDetail(any())).willReturn(CmmnDetailCodeDto.builder().code("D1").build());

        // When & Then
        mockMvc.perform(get("/api/v1/admin/codes/detail/CODE1/D1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.code").value("D1"));
    }

    @Test
    @DisplayName("상세코드 등록 성공")
    void createDetailCode_Success() throws Exception {
        // When & Then
        mockMvc.perform(post("/api/v1/admin/codes/detail")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"codeId\":\"CODE1\", \"code\":\"D1\", \"codeNm\":\"Name\", \"useAt\":\"Y\"}")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("상세코드 수정 성공")
    void updateDetailCode_Success() throws Exception {
        // When & Then
        mockMvc.perform(put("/api/v1/admin/codes/detail/CODE1/D1")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"codeNm\":\"Updated\", \"useAt\":\"Y\"}")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("상세코드 삭제 성공")
    void deleteDetailCode_Success() throws Exception {
        // When & Then
        mockMvc.perform(delete("/api/v1/admin/codes/detail/CODE1/D1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }
}


