package com.company.project.api.controller.code;

import com.company.project.service.code.InstitutionCodeService;
import com.company.project.service.code.dto.InstitutionCodeDto;
import com.company.project.service.code.dto.InstitutionCodeRecptnDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(InstitutionCodeApiController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("InstitutionCodeApiController 테스트")
class InstitutionCodeApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private InstitutionCodeService institutionCodeService;

    @Test
    @DisplayName("기관코드 목록 조회 성공")
    void getInstitutionCodeList_Success() throws Exception {
        // Given
        InstitutionCodeDto dto = InstitutionCodeDto.builder()
                .insttCode("1100000")
                .allInsttNm("테스트기관")
                .build();
        Page<InstitutionCodeDto> page = new PageImpl<>(List.of(dto), PageRequest.of(0, 10), 1);
        given(institutionCodeService.getInstitutionCodeList(anyString(), any())).willReturn(page);

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/codes/institution")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.list[0].insttCode").value("1100000"));
    }

    @Test
    @DisplayName("기관코드 수신 내역 조회 성공")
    void getInstitutionCodeRecptnList_Success() throws Exception {
        // Given
        InstitutionCodeRecptnDto dto = InstitutionCodeRecptnDto.builder()
                .insttCode("1100000")
                .allInsttNm("테스트수신기관")
                .build();
        Page<InstitutionCodeRecptnDto> page = new PageImpl<>(List.of(dto), PageRequest.of(0, 10), 1);
        given(institutionCodeService.getInstitutionCodeRecptnList(anyString(), any(), any())).willReturn(page);

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/codes/institution/receptions")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.list[0].allInsttNm").value("테스트수신기관"));
    }

    @Test
    @DisplayName("기관코드 수신 처리 성공")
    void processInstitutionCodeRecptn_Success() throws Exception {
        // When & Then
        mockMvc.perform(post("/api/v1/admin/system/codes/institution/receptions/process")
                .param("occrrncDe", "20240314")
                .param("insttCode", "1100000")
                .param("opertSn", "1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
