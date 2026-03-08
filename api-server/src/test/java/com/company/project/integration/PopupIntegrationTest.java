package com.company.project.integration;

import com.company.project.service.popup.PopupService;
import com.company.project.service.popup.dto.PopupDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import java.util.Arrays;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest(controllers = com.company.project.api.controller.popup.PopupController.class)
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
        @org.springframework.context.annotation.Import({
                        com.company.project.config.MinimalTestConfig.class,
                        com.company.project.api.controller.popup.PopupController.class
        })
        static class TestConfig {
        }

        @Autowired
        private MockMvc mockMvc;

        @MockitoBean
        private PopupService popupService;

        @MockitoBean
        private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

        @Test
        @DisplayName("GET /api/v1/popups/active - 활성 팝업 조회 API")
        void getActivePopups_ReturnsList() throws Exception {
                // Given
                PopupDto dto = PopupDto.builder()
                                .popupId("POP_001")
                                .popupTitleName("활성 팝업")
                                .build();
                when(popupService.getActivePopups()).thenReturn(Arrays.asList(dto));

                // When & Then
                mockMvc.perform(get("/api/v1/popups/active")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data[0].popupTitleName").value("활성 팝업"));

                verify(popupService, times(1)).getActivePopups();
        }

        @Test
        @DisplayName("GET /api/v1/popups/{id} - 팝업 상세 조회 API")
        void getPopup_ReturnsDto() throws Exception {
                // Given
                PopupDto dto = PopupDto.builder()
                                .popupId("POP_001")
                                .popupTitleName("특정 팝업")
                                .build();
                when(popupService.getPopup(anyString())).thenReturn(dto);

                // When & Then
                mockMvc.perform(get("/api/v1/popups/POP_001")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data.popupTitleName").value("특정 팝업"));

                verify(popupService, times(1)).getPopup("POP_001");
        }
}
