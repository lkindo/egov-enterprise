package com.company.project.api.controller.system.content.banner;

import com.company.project.service.system.content.banner.EgovBannerService;
import com.company.project.service.system.content.banner.dto.BannerDto;
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

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(BannerController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("BannerController 테스트")
class BannerControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private EgovBannerService bannerService;

    @Test
    @DisplayName("배너 목록 조회 성공")
    void getBanners_Success() throws Exception {
        // Given
        Page<BannerDto> page = new PageImpl<>(List.of(BannerDto.builder().bannerId("B1").bannerNm("Banner 1").build()));
        given(bannerService.getBannerList(eq("test"), any())).willReturn(page);

        // When & Then
        mockMvc.perform(get("/api/v1/banners")
                .param("keyword", "test")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].bannerId").value("B1"));
    }

    @Test
    @DisplayName("배너 상세 조회 성공")
    void getBanner_Success() throws Exception {
        // Given
        BannerDto dto = BannerDto.builder().bannerId("B1").bannerNm("Banner 1").build();
        given(bannerService.getBanner("B1")).willReturn(dto);

        // When & Then
        mockMvc.perform(get("/api/v1/banners/B1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.bannerId").value("B1"));
    }

    @Test
    @DisplayName("배너 등록 성공")
    void insertBanner_Success() throws Exception {
        // When & Then
        mockMvc.perform(post("/api/v1/banners")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"bannerNm\":\"New Banner\", \"linkUrl\":\"http://link\"}")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(bannerService).insertBanner(any(BannerDto.class));
    }

    @Test
    @DisplayName("배너 수정 성공")
    void updateBanner_Success() throws Exception {
        // When & Then
        mockMvc.perform(put("/api/v1/banners/B1")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"bannerNm\":\"Updated Banner\"}")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(bannerService).updateBanner(any(BannerDto.class));
    }

    @Test
    @DisplayName("배너 삭제 성공")
    void deleteBanner_Success() throws Exception {
        // When & Then
        mockMvc.perform(delete("/api/v1/banners/B1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(bannerService).deleteBanner("B1");
    }

    @Test
    @DisplayName("반영된 배너 목록 조회 성공")
    void getReflectedBanners_Success() throws Exception {
        // Given
        List<BannerDto> list = List.of(BannerDto.builder().bannerId("B1").build());
        given(bannerService.getReflectedBanners()).willReturn(list);

        // When & Then
        mockMvc.perform(get("/api/v1/banners/reflected")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].bannerId").value("B1"));
    }
}
