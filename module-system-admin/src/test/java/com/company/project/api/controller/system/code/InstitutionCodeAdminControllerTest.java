package com.company.project.api.controller.system.code;

import com.company.project.service.code.InstitutionCodeService;
import com.company.project.service.code.dto.InstitutionCodeDto;
import com.company.project.security.jwt.JwtTokenProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(InstitutionCodeAdminController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("InstitutionCodeAdminController 테스트")
class InstitutionCodeAdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private InstitutionCodeService institutionCodeService;

    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;

    @Test
    @DisplayName("기관코드 목록 조회 성공")
    void getInstitutionCodeList_Success() throws Exception {
        // given
        InstitutionCodeDto dto = InstitutionCodeDto.builder()
                .insttCode("INST001")
                .allInsttNm("테스트 기관")
                .build();
        Page<InstitutionCodeDto> page = new PageImpl<>(Collections.singletonList(dto));
        given(institutionCodeService.getInstitutionCodeList(any(), any())).willReturn(page);

        // when & then
        mockMvc.perform(get("/api/v1/admin/system/codes/institution")
                        .param("pageIndex", "1")
                        .param("pageUnit", "10")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.resultList[0].allInsttNm").value("테스트 기관"));
    }

    @Test
    @DisplayName("기관코드 상세 조회 성공")
    void getInstitutionCodeDetail_Success() throws Exception {
        // given
        InstitutionCodeDto dto = InstitutionCodeDto.builder()
                .insttCode("INST001")
                .allInsttNm("테스트 기관")
                .build();
        given(institutionCodeService.getInstitutionCodeDetail("INST001")).willReturn(dto);

        // when & then
        mockMvc.perform(get("/api/v1/admin/system/codes/institution/INST001")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.allInsttNm").value("테스트 기관"));
    }
}
