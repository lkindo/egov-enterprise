package com.company.project.api.controller.code;

import com.company.project.service.code.AdministCodeService;
import com.company.project.service.code.dto.AdministCodeDto;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AdministCodeApiController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("AdministCodeApiController 테스트")
class AdministCodeApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AdministCodeService administCodeService;

    @Test
    @DisplayName("행정코드 목록 조회 성공")
    void getAdministCodeList_Success() throws Exception {
        // Given
        AdministCodeDto dto = AdministCodeDto.builder()
                .administZoneCode("1100000000")
                .administZoneNm("서울특별시")
                .build();
        Page<AdministCodeDto> page = new PageImpl<>(List.of(dto), PageRequest.of(0, 10), 1);
        given(administCodeService.getAdministCodeList(anyString(), any())).willReturn(page);

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/codes/administ")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.list[0].administZoneCode").value("1100000000"));
    }

    @Test
    @DisplayName("행정코드 상세 조회 성공")
    void getAdministCodeDetail_Success() throws Exception {
        // Given
        AdministCodeDto dto = AdministCodeDto.builder()
                .administZoneCode("1100000000")
                .administZoneNm("서울특별시")
                .build();
        given(administCodeService.getAdministCodeDetail("1100000000")).willReturn(dto);

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/codes/administ/1100000000")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.administZoneNm").value("서울특별시"));
    }
}
