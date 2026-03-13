package com.company.project.api.controller.code;

import com.company.project.service.code.AdministCodeService;
import com.company.project.service.code.dto.AdministCodeDto;
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

@WebMvcTest(AdministCodeApiController.class)
class AdministCodeApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AdministCodeService administCodeService;

    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("행정코드 목록 조회 API 테스트")
    void getAdministCodeList_Success() throws Exception {
        // given
        AdministCodeDto dto = AdministCodeDto.builder()
                .administZoneCode("1100000000")
                .administZoneNm("서울특별시")
                .build();
        Page<AdministCodeDto> page = new PageImpl<>(Collections.singletonList(dto));
        given(administCodeService.getAdministCodeList(any(), any())).willReturn(page);

        // when & then
        mockMvc.perform(get("/api/v1/admin/codes/administ")
                        .param("pageIndex", "1")
                        .param("pageUnit", "10")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.list[0].administZoneNm").value("서울특별시"))
                .andExpect(jsonPath("$.totalCount").value(1));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("행정코드 상세 조회 API 테스트")
    void getAdministCodeDetail_Success() throws Exception {
        // given
        AdministCodeDto dto = AdministCodeDto.builder()
                .administZoneCode("1100000000")
                .administZoneNm("서울특별시")
                .build();
        given(administCodeService.getAdministCodeDetail("1100000000")).willReturn(dto);

        // when & then
        mockMvc.perform(get("/api/v1/admin/codes/administ/1100000000")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.administZoneNm").value("서울특별시"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("행정코드 상세 조회 실패 API 테스트 (404)")
    void getAdministCodeDetail_NotFound() throws Exception {
        // given
        given(administCodeService.getAdministCodeDetail("9999999999")).willReturn(null);

        // when & then
        mockMvc.perform(get("/api/v1/admin/codes/administ/9999999999")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }
}
