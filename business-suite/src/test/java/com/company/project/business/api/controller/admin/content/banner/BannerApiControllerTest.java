package com.company.project.business.api.controller.admin.content.banner;

import com.company.project.foundation.service.system.content.banner.EgovBannerService;
import com.company.project.foundation.service.system.content.banner.dto.BannerDto;
import com.company.project.foundation.core.exception.GlobalExceptionHandler;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.util.Collections;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class BannerApiControllerTest {

    private MockMvc mockMvc;
    private EgovBannerService bannerService;
    private ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        bannerService = mock(EgovBannerService.class);
        mockMvc = MockMvcBuilders.standaloneSetup(new BannerApiController(bannerService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new org.springframework.data.web.PageableHandlerMethodArgumentResolver())
                .build();
    }

    @Test
    @DisplayName("배너 목록 조회 - 성공")
    void getBanners_success() throws Exception {
        when(bannerService.getBannerList(any(), any())).thenReturn(new PageImpl<>(Collections.emptyList()));
        mockMvc.perform(get("/api/v1/admin/system/banners").param("keyword", "test")).andExpect(status().isOk());
    }

    @Test
    @DisplayName("배너 상세 조회 - 성공")
    void getBanner_success() throws Exception {
        when(bannerService.getBanner("B1")).thenReturn(BannerDto.builder().build());
        mockMvc.perform(get("/api/v1/admin/system/banners/B1")).andExpect(status().isOk());
    }

    @Test
    @DisplayName("배너 등록/수정/삭제 - 성공")
    void banner_crud_success() throws Exception {
        BannerDto dto = BannerDto.builder().build();

        mockMvc.perform(post("/api/v1/admin/system/banners")
                .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());

        mockMvc.perform(put("/api/v1/admin/system/banners/B1")
                .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/api/v1/admin/system/banners/B1")).andExpect(status().isOk());
    }

    @Test
    @DisplayName("메인화면용 배너 목록 조회 - 성공")
    void getReflectedBanners_success() throws Exception {
        when(bannerService.getReflectedBanners()).thenReturn(Collections.emptyList());
        mockMvc.perform(get("/api/v1/admin/system/banners/reflected")).andExpect(status().isOk());
    }
}
