package nuri.api.controller.business.admin.content.popup;

import nuri.business.service.promotion.popup.PopupService;
import nuri.business.service.promotion.popup.dto.PopupDto;
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

import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
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
        PopupDto dto = new PopupDto();
        dto.setPopupSn(1L);
        dto.setPopupTtlNm("운영 안내");
        dto.setFrstRgtrId("private-admin-login");
        when(popupService.getActivePopups()).thenReturn(Collections.singletonList(dto));

        mockMvc.perform(get("/api/v1/popups/active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].popupTtlNm").value("운영 안내"))
                .andExpect(jsonPath("$.data[0].frstRgtrId").doesNotExist());
    }

    @Test
    @DisplayName("팝업 상세 조회 — 사용자 경로는 게시 중인 팝업만 묻는다(관리용 단건 조회를 쓰지 않는다)")
    void getPopup() throws Exception {
        PopupDto dto = new PopupDto();
        dto.setPopupSn(1L);
        dto.setFrstRgtrId("private-admin-login");
        org.mockito.Mockito.lenient().when(popupService.getPublishedPopup(1L)).thenReturn(dto);
        // 관리용 단건 조회도 같은 값을 주게 둔다 — 사용자 경로가 그쪽을 부르면 응답은 같아도 아래 verify 가 잡는다.
        org.mockito.Mockito.lenient().when(popupService.getPopup(1L)).thenReturn(dto);

        mockMvc.perform(get("/api/v1/popups/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.popupSn").value(1))
                .andExpect(jsonPath("$.data.frstRgtrId").doesNotExist());
        verify(popupService, never()).getPopup(anyLong());
    }

    @Test
    @DisplayName("🔒 게시하지 않았거나 기간 밖인 팝업은 사용자 단건 조회에서 404 다")
    void getPopup_unpublishedIsNotFound() throws Exception {
        MockMvc withHandler = MockMvcBuilders.standaloneSetup(popupUserApiController)
                .setControllerAdvice(new nuri.foundation.core.exception.GlobalExceptionHandler())
                .build();
        when(popupService.getPublishedPopup(2L)).thenThrow(new nuri.foundation.core.exception.BusinessException(
                nuri.foundation.core.exception.CommonErrorCode.RESOURCE_NOT_FOUND));

        withHandler.perform(get("/api/v1/popups/2"))
                .andExpect(status().isNotFound());
        verify(popupService, never()).getPopup(anyLong());
    }
}
