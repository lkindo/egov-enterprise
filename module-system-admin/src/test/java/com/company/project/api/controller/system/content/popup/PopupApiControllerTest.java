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
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(PopupApiController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("PopupApiController 테스트")
class PopupApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PopupService popupService;

    @Test
    @DisplayName("팝업 목록 조회 성공")
    void getPopups_Success() throws Exception {
        // Given
        PopupDto dto = PopupDto.builder().popupId("P1").popupTitleName("Popup 1").build();
        given(popupService.getPopupList(any(), any()))
                .willReturn(new PageImpl<>(List.of(dto), PageRequest.of(0, 10), 1));

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/popups")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.resultList[0].popupId").value("P1"));
    }

    @Test
    @DisplayName("팝업 상세 조회 성공")
    void getPopup_Success() throws Exception {
        // Given
        PopupDto dto = PopupDto.builder().popupId("P1").popupTitleName("Popup 1").build();
        given(popupService.getPopup("P1")).willReturn(dto);

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/popups/P1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.popupId").value("P1"));
    }
}
