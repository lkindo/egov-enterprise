package com.company.project.api.controller.code;

import com.company.project.service.code.InstitutionCodeService;
import com.company.project.service.code.dto.InstitutionCodeDto;
import com.company.project.security.jwt.JwtTokenProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(InstitutionCodeApiController.class)
class InstitutionCodeApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private InstitutionCodeService institutionCodeService;

    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("기관코드 목록 조회 API 테스트")
    void getInstitutionCodeList_Success() throws Exception {
        // given
        InstitutionCodeDto dto = InstitutionCodeDto.builder()
                .insttCode("INST001")
                .allInsttNm("테스트 기관")
                .build();
        Page<InstitutionCodeDto> page = new PageImpl<>(Collections.singletonList(dto));
        given(institutionCodeService.getInstitutionCodeList(any(), any())).willReturn(page);

        // when & then
        mockMvc.perform(get("/api/v1/admin/codes/institution")
                        .param("pageIndex", "1")
                        .param("pageUnit", "10")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.list[0].allInsttNm").value("테스트 기관"))
                .andExpect(jsonPath("$.totalCount").value(1));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("기관코드 상세 조회 API 테스트")
    void getInstitutionCodeDetail_Success() throws Exception {
        // given
        InstitutionCodeDto dto = InstitutionCodeDto.builder()
                .insttCode("INST001")
                .allInsttNm("테스트 기관")
                .build();
        given(institutionCodeService.getInstitutionCodeDetail("INST001")).willReturn(dto);

        // when & then
        mockMvc.perform(get("/api/v1/admin/codes/institution/INST001")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.allInsttNm").value("테스트 기관"));
    }
}
