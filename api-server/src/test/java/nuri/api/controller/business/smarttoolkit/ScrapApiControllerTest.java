package nuri.api.controller.business.smarttoolkit;

import nuri.business.service.scrap.ScrapService;
import nuri.business.service.scrap.dto.ScrapDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;

import java.util.List;
import java.util.stream.Stream;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import nuri.business.support.ControllerTestSupport;

@WebMvcTest(ScrapApiController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("ScrapApiController 테스트")
class ScrapApiControllerTest extends ControllerTestSupport {

    @MockitoBean
    private ScrapService egovScrapService;

    @Test
    @DisplayName("스크랩 목록 조회 성공")
    void getMyScrapList_Success() throws Exception {
        // Given
        Page<ScrapDto> page = new PageImpl<>(List.of(ScrapDto.builder().scrapSn(1L).scrapNm("Scrap").build()));
        given(egovScrapService.getMyScrapList(anyString(), any(Pageable.class))).willReturn(page);

        // When & Then
        mockMvc.perform(get("/api/v1/scraps")
                .param("page", "1")
                .param("size", "10")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.list[0].scrapSn").value(1));
    }

    @Test
    @DisplayName("스크랩 상세 조회 성공")
    void getScrap_Success() throws Exception {
        // Given
        given(egovScrapService.getScrap(1L)).willReturn(ScrapDto.builder().scrapSn(1L).scrapNm("Scrap").build());

        // When & Then
        mockMvc.perform(get("/api/v1/scraps/1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.scrapSn").value(1));
    }

    @ParameterizedTest(name = "useYn={0}")
    @ValueSource(strings = {"Y", "N"})
    @DisplayName("스크랩 등록은 DB가 채번한 일련번호를 반환한다")
    void createScrap_ReturnsGeneratedSn(String useYn) throws Exception {
        given(egovScrapService.createScrap(anyString(), any(ScrapDto.class))).willReturn(2L);

        mockMvc.perform(post("/api/v1/scraps")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"scrapNm":"Scrap","scrapUrl":"https://example.com","useYn":"%s"}
                                """.formatted(useYn)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data").value(2));

        verify(egovScrapService).createScrap(anyString(), argThat(dto -> useYn.equals(dto.getUseYn())));
    }

    @ParameterizedTest(name = "useYn={0}")
    @ValueSource(strings = {"Y", "N"})
    @DisplayName("스크랩 수정은 명시한 Y 또는 N을 서비스에 전달한다")
    void updateScrap_AcceptsExplicitUseYn(String useYn) throws Exception {
        mockMvc.perform(put("/api/v1/scraps/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"scrapNm":"Scrap","scrapUrl":"https://example.com","useYn":"%s"}
                                """.formatted(useYn)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(egovScrapService).updateScrap(eq(1L), anyString(), argThat(dto -> useYn.equals(dto.getUseYn())));
    }

    static Stream<Arguments> invalidUseYnBodies() {
        return Stream.of(
                Arguments.of("누락", "{\"scrapNm\":\"Scrap\",\"scrapUrl\":\"https://example.com\"}"),
                Arguments.of("null", "{\"scrapNm\":\"Scrap\",\"scrapUrl\":\"https://example.com\",\"useYn\":null}"),
                Arguments.of("빈 문자열", "{\"scrapNm\":\"Scrap\",\"scrapUrl\":\"https://example.com\",\"useYn\":\"\"}"),
                Arguments.of("공백", "{\"scrapNm\":\"Scrap\",\"scrapUrl\":\"https://example.com\",\"useYn\":\" \"}"),
                Arguments.of("허용 외 값", "{\"scrapNm\":\"Scrap\",\"scrapUrl\":\"https://example.com\",\"useYn\":\"X\"}"));
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("invalidUseYnBodies")
    @DisplayName("스크랩 등록은 유효한 useYn이 없으면 서비스 호출 전에 400으로 거부한다")
    void createScrap_RejectsInvalidUseYn(String ignored, String body) throws Exception {
        mockMvc.perform(post("/api/v1/scraps")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(egovScrapService);
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("invalidUseYnBodies")
    @DisplayName("스크랩 수정은 유효한 useYn이 없으면 서비스 호출 전에 400으로 거부한다")
    void updateScrap_RejectsInvalidUseYn(String ignored, String body) throws Exception {
        mockMvc.perform(put("/api/v1/scraps/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(egovScrapService);
    }
}
