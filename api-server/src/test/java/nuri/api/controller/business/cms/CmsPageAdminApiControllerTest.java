package nuri.api.controller.business.cms;

import nuri.business.security.annotation.WithMockCustomUser;
import nuri.business.service.cms.CmsPageAdminService;
import nuri.business.service.cms.dto.CmsPageCreateRequest;
import nuri.business.support.ControllerTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(CmsPageAdminApiController.class)
@DisplayName("CmsPageAdminApiController 입력 계약")
class CmsPageAdminApiControllerTest extends ControllerTestSupport {

    private static final String DOCUMENT = """
            {"schemaVersion":1,"sections":[{"id":"a","label":"","layout":"one","tone":"default","spacing":"normal",
             "cells":[{"kind":"rich","doc":{"type":"doc","content":[{"type":"paragraph"}]}}]}]}""";

    @MockitoBean
    private CmsPageAdminService cmsPageAdminService;

    @Test
    @WithMockCustomUser
    @DisplayName("페이지를 만들면 201 과 새 일련번호를 돌려준다(ADR-0036)")
    void createsAPageWith201() throws Exception {
        when(cmsPageAdminService.createPage(any(CmsPageCreateRequest.class))).thenReturn(5L);

        mockMvc.perform(post("/api/v1/admin/system/content-pages")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"contsPathNm\":\"service-guide\",\"contsTtl\":\"안내\",\"document\":" + DOCUMENT + "}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data").value(5));
    }

    @Test
    @WithMockCustomUser
    @DisplayName("주소 형식이 틀리거나 제목·문서가 없으면 서비스 전에 400")
    void rejectsInvalidCreateRequestsBeforeTheService() throws Exception {
        for (String body : new String[]{
                "{\"contsPathNm\":\"Service Guide\",\"contsTtl\":\"안내\",\"document\":" + DOCUMENT + "}",
                "{\"contsPathNm\":\"guide\",\"contsTtl\":\" \",\"document\":" + DOCUMENT + "}",
                "{\"contsPathNm\":\"guide\",\"contsTtl\":\"안내\"}"}) {
            mockMvc.perform(post("/api/v1/admin/system/content-pages")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest());
        }
        verifyNoInteractions(cmsPageAdminService);
    }

    @Test
    @WithMockCustomUser
    @DisplayName("게시는 화면이 읽은 버전이 없으면 400 이고, 있으면 그 버전과 변경 설명으로 게시한다")
    void publishRequiresTheReadVersion() throws Exception {
        mockMvc.perform(post("/api/v1/admin/system/content-pages/3/publish")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(cmsPageAdminService);

        mockMvc.perform(post("/api/v1/admin/system/content-pages/3/publish")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"version\":4,\"rvsnRsn\":\"문의처 변경\"}"))
                .andExpect(status().isOk());
        verify(cmsPageAdminService).publish(eq(3L), any());
    }

    @Test
    @WithMockCustomUser
    @DisplayName("초안 삭제는 읽은 버전을 쿼리로 받는다 — 없으면 서비스 전에 400(ADR-0042)")
    void deleteRequiresTheReadVersion() throws Exception {
        mockMvc.perform(delete("/api/v1/admin/system/content-pages/3").with(csrf()))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(cmsPageAdminService);

        mockMvc.perform(delete("/api/v1/admin/system/content-pages/3").param("version", "2").with(csrf()))
                .andExpect(status().isOk());
        verify(cmsPageAdminService).deleteDraftPage(3L, 2);
    }

    @Test
    @WithMockCustomUser
    @DisplayName("파기는 주소 확인과 처리 근거 번호가 있어야 하고, 근거 번호에 자유 서술을 받지 않는다(ADR-0042)")
    void purgeRequiresTheTypedPathAndACaseReference() throws Exception {
        for (String body : new String[]{
                "{\"version\":2,\"caseReference\":\"INC-1\"}",
                "{\"version\":2,\"contsPathNm\":\"guide\"}",
                "{\"version\":2,\"contsPathNm\":\"guide\",\"caseReference\":\"주민번호 노출\"}",
                "{\"contsPathNm\":\"guide\",\"caseReference\":\"INC-1\"}"}) {
            mockMvc.perform(post("/api/v1/admin/system/content-pages/3/purge")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest());
        }
        mockMvc.perform(post("/api/v1/admin/system/content-pages/3/revisions/7/purge")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"version\":2,\"caseReference\":\"요청서 참고\"}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(cmsPageAdminService);

        mockMvc.perform(post("/api/v1/admin/system/content-pages/3/purge")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"version\":2,\"contsPathNm\":\"guide\",\"caseReference\":\"INC-2026.001\"}"))
                .andExpect(status().isOk());
        verify(cmsPageAdminService).purgePage(eq(3L), any());
        mockMvc.perform(post("/api/v1/admin/system/content-pages/3/revisions/7/purge")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"version\":2,\"caseReference\":\"INC-2026.001\"}"))
                .andExpect(status().isOk());
        verify(cmsPageAdminService).purgeRevision(eq(3L), eq(7L), any());
    }
}
