package com.company.project.api.controller.system.content.popup;

import com.company.project.service.system.content.popup.PopupService;
import com.company.project.service.system.content.popup.dto.PopupDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(PopupController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("PopupController 테스트")
class PopupControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PopupService popupService;

    @Test
    @DisplayName("활성 팝업 목록 조회 성공")
    void getActivePopups_Success() throws Exception {
        // Given
        given(popupService.getActivePopups()).willReturn(List.of(PopupDto.builder().popupId("P1").build()));

        // When & Then
        mockMvc.perform(get("/api/v1/popups/active")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].popupId").value("P1"));
    }

    @Test
    @DisplayName("팝업 상세 조회 성공")
    void getPopup_Success() throws Exception {
        // Given
        given(popupService.getPopup("P1")).willReturn(PopupDto.builder().popupId("P1").build());

        // When & Then
        mockMvc.perform(get("/api/v1/popups/P1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.popupId").value("P1"));
    }
}
