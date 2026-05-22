package nuri.business.api.controller.admin.content.popup;

import nuri.foundation.support.ControllerTestSupport;
import nuri.foundation.service.system.content.popup.PopupService;
import nuri.foundation.service.system.content.popup.dto.PopupDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PopupApiController.class)
@org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc(addFilters = false)
@DisplayName("PopupApiController 단위 테스트")
class PopupApiControllerTest extends ControllerTestSupport {

    @MockitoBean
    private PopupService popupService;

    @Test
    @DisplayName("팝업 목록 조회 성공")
    @WithMockUser
    void getPopups_Success() throws Exception {
        // given
        given(popupService.getPopupList(anyString(), any(Pageable.class)))
                .willReturn(new PageImpl<>(List.of(PopupDto.builder().popupId("POP_01").build())));

        // when & then
        mockMvc.perform(get("/api/v1/admin/system/popups")
                        .param("searchWrd", "test"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("팝업 상세 조회 성공")
    @WithMockUser
    void getPopup_Success() throws Exception {
        // given
        given(popupService.getPopup("POP_01")).willReturn(PopupDto.builder().popupId("POP_01").build());

        // when & then
        mockMvc.perform(get("/api/v1/admin/system/popups/POP_01"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("팝업 등록 성공")
    @WithMockUser
    void createPopup_Success() throws Exception {
        // given
        PopupDto dto = PopupDto.builder().popupTtlNm("Popup").build();
        given(popupService.createPopup(anyString(), any(PopupDto.class))).willReturn("POP_01");

        // when & then
        mockMvc.perform(post("/api/v1/admin/system/popups")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("팝업 삭제 성공")
    @WithMockUser
    void deletePopup_Success() throws Exception {
        // when & then
        mockMvc.perform(delete("/api/v1/admin/system/popups/POP_01"))
                .andExpect(status().isOk());
    }
}
