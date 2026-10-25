package nuri.api.controller.business.cms;

import nuri.business.security.annotation.WithMockCustomUser;
import nuri.business.service.cms.CmsPageReadService;
import nuri.business.service.cms.dto.CmsPublishedPageDto;
import nuri.business.service.cms.dto.CmsPublishedPageSummaryDto;
import nuri.business.support.ControllerTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(CmsPageApiController.class)
@DisplayName("CmsPageApiController 응답 계약")
class CmsPageApiControllerTest extends ControllerTestSupport {

    @MockitoBean
    private CmsPageReadService cmsPageReadService;

    @Test
    @WithMockCustomUser
    @DisplayName("업무 홈 소개가 없으면 data 를 비우지 않고 page 만 비운다 — 본문이 비면 생성 응답 계약이 위반으로 읽는다")
    void homeIntroWithoutDesignationKeepsTheEnvelopeObject() throws Exception {
        when(cmsPageReadService.getHomeIntro()).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/content-home"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isMap())
                .andExpect(jsonPath("$.data.page").doesNotExist());
    }

    @Test
    @WithMockCustomUser
    @DisplayName("업무 홈 소개가 있으면 page 에 현재 게시본을 싣는다")
    void homeIntroCarriesThePublishedPage() throws Exception {
        when(cmsPageReadService.getHomeIntro()).thenReturn(Optional.of(new CmsPublishedPageDto(
                "welcome", "환영합니다", null, Map.of("schemaVersion", 1), 2, null)));

        mockMvc.perform(get("/api/v1/content-home"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.page.contsPathNm").value("welcome"))
                .andExpect(jsonPath("$.data.page.revisionNumber").value(2));
    }

    @Test
    @WithMockCustomUser
    @DisplayName("안내 페이지 목록은 1 기반 page 를 서비스의 0 기반 쪽으로 넘기고 검색어를 그대로 준다(ADR-0036·0042)")
    void publishedListPassesTheKeywordAndPage() throws Exception {
        when(cmsPageReadService.getPublishedPages(eq("안내"), any())).thenReturn(new PageImpl<>(List.of(
                new CmsPublishedPageSummaryDto("guide", "이용 안내", "요약", null)), PageRequest.of(0, 20), 1));

        mockMvc.perform(get("/api/v1/content-pages").param("keyword", "안내").param("page", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.list[0].contsPathNm").value("guide"))
                .andExpect(jsonPath("$.data.total").value(1));
        verify(cmsPageReadService).getPublishedPages(eq("안내"), argThat(pageable -> pageable.getPageNumber() == 0));
    }
}
