package nuri.api.controller.business.smarttoolkit;

import nuri.business.service.scrap.ScrapService;
import nuri.business.service.scrap.dto.ScrapDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
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
                .param("pageIndex", "1")
                .param("pageUnit", "10")
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

    @Test
    @DisplayName("스크랩 등록은 DB가 채번한 일련번호를 반환한다")
    void createScrap_ReturnsGeneratedSn() throws Exception {
        given(egovScrapService.createScrap(anyString(), any(ScrapDto.class))).willReturn(2L);

        mockMvc.perform(post("/api/v1/scraps")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"scrapNm":"Scrap","scrapUrl":"https://example.com","useYn":"Y"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value(2));
    }
}
