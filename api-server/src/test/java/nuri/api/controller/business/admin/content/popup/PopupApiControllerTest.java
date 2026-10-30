package nuri.api.controller.business.admin.content.popup;

import nuri.business.support.ControllerTestSupport;
import nuri.business.service.promotion.popup.PopupService;
import nuri.business.service.promotion.popup.dto.PopupDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import nuri.business.security.annotation.WithMockCustomUser;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PopupApiController.class)
@org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc(addFilters = false)
@DisplayName("PopupApiController 단위 테스트")
class PopupApiControllerTest extends ControllerTestSupport {

    @MockitoBean
    private PopupService popupService;

    @Test
    @DisplayName("팝업 목록 조회 성공")
    @WithMockCustomUser
    void getPopups_Success() throws Exception {
        // given
        given(popupService.getPopupList(anyString(), any(Pageable.class)))
                .willReturn(new PageImpl<>(List.of(PopupDto.builder().popupSn(1L).build())));

        // when & then
        mockMvc.perform(get("/api/v1/admin/system/popups")
                        .param("searchWrd", "test"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("팝업 상세 조회 성공")
    @WithMockCustomUser
    void getPopup_Success() throws Exception {
        // given
        given(popupService.getPopup(1L)).willReturn(PopupDto.builder().popupSn(1L).build());

        // when & then
        mockMvc.perform(get("/api/v1/admin/system/popups/1"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("팝업 등록 성공")
    @WithMockCustomUser
    void createPopup_Success() throws Exception {
        // given
        PopupDto dto = PopupDto.builder().popupTtlNm("Popup").build();
        given(popupService.createPopup(anyString(), any(PopupDto.class))).willReturn(1L);

        // when & then
        mockMvc.perform(post("/api/v1/admin/system/popups")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isCreated());
    }

    @Test
    @DisplayName("팝업 삭제 성공")
    @WithMockCustomUser
    void deletePopup_Success() throws Exception {
        // when & then
        mockMvc.perform(delete("/api/v1/admin/system/popups/1"))
                .andExpect(status().isOk());
    }

    static java.util.stream.Stream<org.junit.jupiter.params.provider.Arguments> invalidPopupDimensions() {
        return java.util.stream.Stream.of("popupWdthSz", "popupVrtcSz")
                .flatMap(field -> java.util.stream.Stream.of("100", "\"5000\"")
                        .map(raw -> org.junit.jupiter.params.provider.Arguments.of(field, raw)));
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.MethodSource("invalidPopupDimensions")
    @DisplayName("팝업 크기는 JSON 문자열과 승인된 표시 범위를 지킨다")
    @WithMockCustomUser
    void dimensionsRejectRawNumbersAndOutOfPolicyStrings(String field, String rawSize) throws Exception {
        given(popupService.createPopup(anyString(), any(PopupDto.class))).willReturn(1L);
        mockMvc.perform(post("/api/v1/admin/system/popups")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"popupTtlNm\":\"Popup\",\"" + field + "\":" + rawSize + "}"))
                .andExpect(status().isBadRequest());
        org.mockito.Mockito.verifyNoInteractions(popupService);
    }

    static java.util.stream.Stream<org.junit.jupiter.params.provider.Arguments> nonStringOrNonCanonicalSizes() {
        java.util.List<String> rawValues = java.util.List.of("100", "true", "false", "{}", "[]", "[\"100\"]", "100.0",
                "\"\"", "\" \"", "\"99\"", "\"4001\"", "\"0100\"", "\"100.0\"", "\"+100\"",
                "\"-100\"", "\"1e3\"", "\"abc\"", "\"Infinity\"", "\"100\\n\"", "\"100\\r\\n\"");
        return java.util.stream.Stream.of("popupWdthSz", "popupVrtcSz")
                .flatMap(field -> rawValues.stream().map(raw -> org.junit.jupiter.params.provider.Arguments.of(field, raw)));
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.MethodSource("nonStringOrNonCanonicalSizes")
    @WithMockCustomUser
    void dimensionsRejectOtherNonCanonicalValuesOnBothWrites(String field, String rawSize) throws Exception {
        String body = "{\"popupTtlNm\":\"Popup\",\"version\":0,\"" + field + "\":" + rawSize + "}";
        mockMvc.perform(post("/api/v1/admin/system/popups").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest());
        mockMvc.perform(put("/api/v1/admin/system/popups/1").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest());
        org.mockito.Mockito.verifyNoInteractions(popupService);
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.NullSource
    @org.junit.jupiter.params.provider.ValueSource(strings = {"100", "999", "1000", "3999", "4000"})
    @WithMockCustomUser
    void canonicalOrNullDimensionsKeepTheirOriginalValue(String size) throws Exception {
        String raw = objectMapper.writeValueAsString(size);
        assertPopupWriteMapping(",\"popupWdthSz\":" + raw + ",\"popupVrtcSz\":" + raw, size);
    }

    @Test
    @WithMockCustomUser
    void omittedDimensionsRemainNull() throws Exception {
        assertPopupWriteMapping("", null);
    }

    private void assertPopupWriteMapping(String dimensions, String size) throws Exception {
        given(popupService.createPopup(anyString(), any(PopupDto.class))).willReturn(1L);
        String body = "{\"popupTtlNm\":\"Popup\",\"fileUrl\":\"/api/v1/files/9\","
                + "\"popupWdthPstn\":\"10\",\"popupVrtcPstn\":\"20\","
                + "\"ntceBgnde\":\"2026-10-01\",\"ntceEndde\":\"2026-11-01\","
                + "\"stopvewSetupYn\":\"Y\",\"ntceYn\":\"N\",\"version\":0,"
                + "\"popupSn\":999,\"frstRgtrId\":\"forged\",\"crtDt\":\"2026-09-01T00:00:00\"" + dimensions + "}";
        mockMvc.perform(post("/api/v1/admin/system/popups").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated());
        mockMvc.perform(put("/api/v1/admin/system/popups/1").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk());
        var created = org.mockito.ArgumentCaptor.forClass(PopupDto.class);
        var updated = org.mockito.ArgumentCaptor.forClass(PopupDto.class);
        org.mockito.Mockito.verify(popupService).createPopup(anyString(), created.capture());
        org.mockito.Mockito.verify(popupService).updatePopup(org.mockito.ArgumentMatchers.eq(1L), anyString(), updated.capture());
        for (PopupDto request : List.of(created.getValue(), updated.getValue())) {
            org.assertj.core.api.Assertions.assertThat(request.getPopupWdthSz()).isEqualTo(size);
            org.assertj.core.api.Assertions.assertThat(request.getPopupVrtcSz()).isEqualTo(size);
            org.assertj.core.api.Assertions.assertThat(request.getPopupTtlNm()).isEqualTo("Popup");
            org.assertj.core.api.Assertions.assertThat(request.getFileUrl()).isEqualTo("/api/v1/files/9");
            org.assertj.core.api.Assertions.assertThat(request.getPopupWdthPstn()).isEqualTo("10");
            org.assertj.core.api.Assertions.assertThat(request.getPopupVrtcPstn()).isEqualTo("20");
            org.assertj.core.api.Assertions.assertThat(request.getNtceBgnde()).isEqualTo("2026-10-01");
            org.assertj.core.api.Assertions.assertThat(request.getNtceEndde()).isEqualTo("2026-11-01");
            org.assertj.core.api.Assertions.assertThat(request.getStopvewSetupYn()).isEqualTo("Y");
            org.assertj.core.api.Assertions.assertThat(request.getNtceYn()).isEqualTo("N");
            org.assertj.core.api.Assertions.assertThat(request.getVersion()).isZero();
            org.assertj.core.api.Assertions.assertThat(request.getPopupSn()).isNull();
            org.assertj.core.api.Assertions.assertThat(request.getFrstRgtrId()).isNull();
            org.assertj.core.api.Assertions.assertThat(request.getCrtDt()).isNull();
        }
    }

    @Test
    @WithMockCustomUser
    void legacyDimensionsRemainReadable() throws Exception {
        given(popupService.getPopup(1L)).willReturn(PopupDto.builder()
                .popupSn(1L).popupTtlNm("Legacy").popupWdthSz("0100").popupVrtcSz("5000").build());

        mockMvc.perform(get("/api/v1/admin/system/popups/1")).andExpect(status().isOk())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.data.popupWdthSz").value("0100"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.data.popupVrtcSz").value("5000"));
    }

    @Test
    @WithMockCustomUser
    void invalidDimensionIdentifiesTheFieldToCorrect() throws Exception {
        mockMvc.perform(put("/api/v1/admin/system/popups/1").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"popupTtlNm\":\"Popup\",\"version\":0,\"popupWdthSz\":\"0100\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.errors[0].field").value("popupWdthSz"));
        org.mockito.Mockito.verifyNoInteractions(popupService);
    }
}
