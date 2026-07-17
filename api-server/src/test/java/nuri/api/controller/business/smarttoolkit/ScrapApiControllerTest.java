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
        Page<ScrapDto> page = new PageImpl<>(List.of(ScrapDto.builder().scrapId("SCR1").scrapNm("Scrap").build()));
        given(egovScrapService.getMyScrapList(anyString(), any(Pageable.class))).willReturn(page);

        // When & Then
        mockMvc.perform(get("/api/v1/scraps")
                .param("pageIndex", "1")
                .param("pageUnit", "10")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.list[0].scrapId").value("SCR1"));
    }

    @Test
    @DisplayName("스크랩 상세 조회 성공")
    void getScrap_Success() throws Exception {
        // Given
        given(egovScrapService.getScrap(anyString())).willReturn(ScrapDto.builder().scrapId("SCR1").scrapNm("Scrap").build());

        // When & Then
        mockMvc.perform(get("/api/v1/scraps/SCR1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.scrapId").value("SCR1"));
    }
}
