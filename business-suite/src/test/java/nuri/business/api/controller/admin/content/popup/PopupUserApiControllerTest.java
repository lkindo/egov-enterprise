package nuri.business.api.controller.admin.content.popup;

import nuri.foundation.service.system.content.popup.PopupService;
import nuri.foundation.service.system.content.popup.dto.PopupDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("PopupUserApiController 단위 테스트")
class PopupUserApiControllerTest {

    private MockMvc mockMvc;

    @Mock
    private PopupService popupService;

    @InjectMocks
    private PopupUserApiController popupUserApiController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(popupUserApiController).build();
    }

    @Test
    @DisplayName("활성 팝업 목록 조회")
    void getActivePopups() throws Exception {
        when(popupService.getActivePopups()).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/popups/active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("팝업 상세 조회")
    void getPopup() throws Exception {
        PopupDto dto = new PopupDto();
        dto.setPopupId("P1");
        when(popupService.getPopup("P1")).thenReturn(dto);

        mockMvc.perform(get("/api/v1/popups/P1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
