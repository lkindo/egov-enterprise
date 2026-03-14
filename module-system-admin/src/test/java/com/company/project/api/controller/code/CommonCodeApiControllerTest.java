package com.company.project.api.controller.code;

import com.company.project.service.code.CommonCodeService;
import com.company.project.service.code.dto.CmmnClCodeDto;
import com.company.project.service.code.dto.CmmnCodeDto;
import com.company.project.service.code.dto.CmmnDetailCodeDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(CommonCodeApiController.class)
@DisplayName("CommonCodeApiController 테스트")
class CommonCodeApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private CommonCodeService commonCodeService;

    @MockitoBean
    private EgovPropertyService propertiesService;

    private static final String BASE_URL = "/api/v1/admin/system/codes";

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("분류코드 목록 조회 API 테스트")
    void getClCodeList_Success() throws Exception {
        given(propertiesService.getInt("pageUnit")).willReturn(10);
        given(propertiesService.getInt("pageSize")).willReturn(10);
        given(commonCodeService.selectCmmnClCodeList(any())).willReturn(Collections.singletonList(new CmmnClCodeDto()));
        given(commonCodeService.selectCmmnClCodeListTotCnt(any())).willReturn(1);

        mockMvc.perform(get(BASE_URL + "/cl")
                        .param("pageIndex", "1")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("분류코드 상세 조회 API 테스트")
    void getClCode_Success() throws Exception {
        CmmnClCodeDto dto = new CmmnClCodeDto();
        dto.setClCode("CL01");
        given(commonCodeService.selectCmmnClCodeDetail(any())).willReturn(dto);

        mockMvc.perform(get(BASE_URL + "/cl/CL01")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.clCode").value("CL01"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("분류코드 등록 API 테스트")
    void createClCode_Success() throws Exception {
        CmmnClCodeDto dto = new CmmnClCodeDto();
        dto.setClCode("CL02");
        dto.setClCodeNm("Test Name");

        mockMvc.perform(post(BASE_URL + "/cl")
                        .with(csrf())
                        .content(objectMapper.writeValueAsString(dto))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("공통코드 목록 조회 API 테스트")
    void getCmmnCodeList_Success() throws Exception {
        given(propertiesService.getInt("pageUnit")).willReturn(10);
        given(propertiesService.getInt("pageSize")).willReturn(10);
        given(commonCodeService.selectCmmnCodeList(any())).willReturn(Collections.singletonList(new CmmnCodeDto()));
        given(commonCodeService.selectCmmnCodeListTotCnt(any())).willReturn(1);

        mockMvc.perform(get(BASE_URL + "/cmmn")
                        .param("pageIndex", "1")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("상세코드 목록 조회 API 테스트")
    void getDetailCodeList_Success() throws Exception {
        given(propertiesService.getInt("pageUnit")).willReturn(10);
        given(propertiesService.getInt("pageSize")).willReturn(10);
        given(commonCodeService.selectCmmnDetailCodeList(any())).willReturn(Collections.singletonList(new CmmnDetailCodeDto()));
        given(commonCodeService.selectCmmnDetailCodeListTotCnt(any())).willReturn(1);

        mockMvc.perform(get(BASE_URL + "/detail")
                        .param("pageIndex", "1")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
