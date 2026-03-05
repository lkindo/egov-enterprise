package com.company.project.integration;

import com.company.project.config.MinimalTestConfig;
import com.company.project.service.banner.EgovBannerService;
import com.company.project.service.banner.dto.BannerDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
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
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;

@SpringBootTest(classes = MinimalTestConfig.class)
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
class BannerIntegrationTest {

        @Autowired
        private MockMvc mockMvc;

        @MockitoBean
        private EgovBannerService bannerService;

        @Test
        @DisplayName("GET /api/v1/banners - 배너목록조회API")
        void getBanners_ReturnsPage() throws Exception {
                // Given
                BannerDto dto = BannerDto.builder()
                                .bannerId("BNR_001")
                                .bannerNm("테스트배너")
                                .reflctAt("Y")
                                .build();
                Page<BannerDto> page = new PageImpl<>(Arrays.asList(dto),
                                org.springframework.data.domain.PageRequest.of(0, 10), 1);
                when(bannerService.getBannerList(any(), any(Pageable.class))).thenReturn(page);

                // When & Then
                mockMvc.perform(get("/api/v1/banners")
                                .param("page", "0")
                                .param("size", "10")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andDo(print())
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data.content[0].bannerId").value("BNR_001"))
                                .andExpect(jsonPath("$.data.content[0].bannerNm").value("테스트배너"));

                verify(bannerService, times(1)).getBannerList(any(), any(Pageable.class));
        }

        @Test
        @DisplayName("GET /test/ping - TestPingController 동작 확인")
        void testPing_ReturnsPong() throws Exception {
                mockMvc.perform(get("/test/ping"))
                                .andExpect(status().isOk())
                                .andExpect(content().string("PONG from TestPingController"));
        }

        @Test
        @DisplayName("GET /api/v1/banners/reflected - 메인화면 배너조회API")
        void getReflectedBanners_ReturnsList() throws Exception {
                // Given
                BannerDto dto = BannerDto.builder()
                                .bannerId("BNR_001")
                                .bannerNm("반사된배너")
                                .reflctAt("Y")
                                .build();
                List<BannerDto> list = Arrays.asList(dto);
                when(bannerService.getReflectedBanners()).thenReturn(list);

                // When & Then
                mockMvc.perform(get("/api/v1/banners/reflected")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andDo(print())
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data[0].bannerNm").value("반사된배너"));

                verify(bannerService, times(1)).getReflectedBanners();
        }

        @Test
        @DisplayName("POST /api/v1/banners - 배너등록API")
        void insertBanner_CallsService() throws Exception {
                // When & Then
                mockMvc.perform(post("/api/v1/banners")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                                {
                                                  "bannerNm": "테스트배너",
                                                  "linkUrl": "http://test.com",
                                                  "reflctAt": "Y",
                                                  "sortOrdr": 1
                                                }
                                                """))
                                .andDo(print())
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true));

                verify(bannerService, times(1)).insertBanner(any(BannerDto.class));
        }

        @Test
        @DisplayName("DELETE /api/v1/banners/{id} - 배너삭제API")
        void deleteBanner_CallsService() throws Exception {
                // When & Then
                mockMvc.perform(delete("/api/v1/banners/BNR_001")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andDo(print())
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true));

                verify(bannerService, times(1)).deleteBanner("BNR_001");
        }
}
