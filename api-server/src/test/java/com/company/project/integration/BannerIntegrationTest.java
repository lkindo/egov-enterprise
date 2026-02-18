package com.company.project.integration;

import com.company.project.config.MinimalTestConfig;
import com.company.project.service.banner.EgovBannerService;
import com.company.project.service.banner.dto.BannerDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Arrays;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(classes = MinimalTestConfig.class)
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
class BannerIntegrationTest {

        @Autowired
        private MockMvc mockMvc;

        @MockBean
        private EgovBannerService bannerService;

        @Test
        @DisplayName("GET /api/v1/banners - 배너 목록 조회 API 테스트")
        void getBanners_ReturnsPage() throws Exception {
                // Given
                BannerDto dto = BannerDto.builder()
                                .bannerId("BNR_001")
                                .bannerNm("테스트 배너")
                                .reflctAt("Y")
                                .build();
                Page<BannerDto> page = new PageImpl<>(Arrays.asList(dto));
                when(bannerService.getBannerList(any(), any(Pageable.class))).thenReturn(page);

                // When & Then
                mockMvc.perform(get("/api/v1/banners")
                                .param("page", "0")
                                .param("size", "10")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data.content[0].bannerId").value("BNR_001"))
                                .andExpect(jsonPath("$.data.content[0].bannerNm").value("테스트 배너"));

                verify(bannerService, times(1)).getBannerList(any(), any(Pageable.class));
        }

        @Test
        @DisplayName("GET /api/v1/banners/reflected - 반영된 배너 목록 조회 API 테스트")
        void getReflectedBanners_ReturnsList() throws Exception {
                // Given
                BannerDto dto = BannerDto.builder()
                                .bannerId("BNR_001")
                                .bannerNm("반영 배너")
                                .reflctAt("Y")
                                .build();
                List<BannerDto> list = Arrays.asList(dto);
                when(bannerService.getReflectedBanners()).thenReturn(list);

                // When & Then
                mockMvc.perform(get("/api/v1/banners/reflected")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data[0].bannerNm").value("반영 배너"));

                verify(bannerService, times(1)).getReflectedBanners();
        }

        @Test
        @DisplayName("POST /api/v1/banners - 배너 등록 API 테스트")
        void insertBanner_CallsService() throws Exception {
                // When & Then
                mockMvc.perform(post("/api/v1/banners")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                                {
                                                    "bannerNm": "새 배너",
                                                    "linkUrl": "http://test.com",
                                                    "reflctAt": "Y",
                                                    "sortOrdr": 1
                                                }
                                                """))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true));

                verify(bannerService, times(1)).insertBanner(any(BannerDto.class));
        }

        @Test
        @DisplayName("DELETE /api/v1/banners/{id} - 배너 삭제 API 테스트")
        void deleteBanner_CallsService() throws Exception {
                // When & Then
                mockMvc.perform(delete("/api/v1/banners/BNR_001")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true));

                verify(bannerService, times(1)).deleteBanner("BNR_001");
        }
}
