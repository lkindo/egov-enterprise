package com.company.project.integration;

import com.company.project.service.pwm.PopupService;
import com.company.project.service.pwm.dto.PopupDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Arrays;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest(controllers = com.company.project.api.controller.pwm.PopupController.class)
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
class PopupIntegrationTest {

        @org.springframework.context.annotation.Configuration
        @org.springframework.boot.autoconfigure.EnableAutoConfiguration(exclude = {
                        org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration.class,
                        org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration.class,
                        org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration.class,
                        org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration.class
        })
        @org.springframework.context.annotation.ComponentScan(basePackages = "com.company.project.api.controller.pwm")
        static class TestConfig {
        }
 
        @Autowired
        private MockMvc mockMvc;
 
        @MockitoBean
        private PopupService popupService;
 
        @MockitoBean
        private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

        @Test
        @DisplayName("GET /api/v1/popups - 팝업 목록 조회 API 테스트")
        void getPopups_ReturnsPage() throws Exception {
                // Given
                PopupDto dto = PopupDto.builder()
                                .popupId("POP_001")
                                .popupTitleNm("테스트 팝업")
                                .ntceAt("Y")
                                .build();
                Page<PopupDto> page = new PageImpl<>(Arrays.asList(dto));
                when(popupService.getPopupList(any(), any(Pageable.class))).thenReturn(page);

                // When & Then
                mockMvc.perform(get("/api/v1/popups")
                                .param("page", "0")
                                .param("size", "10")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data.content[0].popupTitleNm").value("테스트 팝업"));

                verify(popupService, times(1)).getPopupList(any(), any(Pageable.class));
        }

        @Test
        @DisplayName("GET /api/v1/popups/active - 활성 팝업 조회 API 테스트")
        void getActivePopups_ReturnsList() throws Exception {
                // Given
                PopupDto dto = PopupDto.builder()
                                .popupId("POP_001")
                                .popupTitleNm("활성 팝업")
                                .build();
                when(popupService.getActivePopups()).thenReturn(Arrays.asList(dto));

                // When & Then
                mockMvc.perform(get("/api/v1/popups/active")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data[0].popupTitleNm").value("활성 팝업"));

                verify(popupService, times(1)).getActivePopups();
        }

        @Test
        @WithMockUser(username = "admin")
        @DisplayName("POST /api/v1/popups - 팝업 등록 API 테스트")
        void createPopup_CallsService() throws Exception {
                // Given
                when(popupService.createPopup(anyString(), any(PopupDto.class))).thenReturn("POP_001");

                // When & Then
                mockMvc.perform(post("/api/v1/popups")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                                {
                                                    "popupTitleNm": "신규 팝업",
                                                    "ntceBgnde": "2026-02-01",
                                                    "ntceEndde": "2026-02-28",
                                                    "ntceAt": "Y"
                                                }
                                                """))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data").value("POP_001"));

                verify(popupService, times(1)).createPopup(anyString(), any(PopupDto.class));
        }

        @Test
        @DisplayName("DELETE /api/v1/popups/{id} - 팝업 삭제 API 테스트")
        void deletePopup_CallsService() throws Exception {
                // When & Then
                mockMvc.perform(delete("/api/v1/popups/POP_001")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true));

                verify(popupService, times(1)).deletePopup("POP_001");
        }
}
