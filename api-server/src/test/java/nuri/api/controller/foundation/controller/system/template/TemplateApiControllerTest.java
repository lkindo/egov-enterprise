package nuri.api.controller.foundation.controller.system.template;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.mockito.Mockito.verify;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.any;

import nuri.business.service.template.dto.TemplateDto;
import nuri.business.service.template.TmplatInfoService;
import com.querydsl.jpa.impl.JPAQueryFactory;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import nuri.business.security.annotation.WithMockCustomUser;

import java.util.List;

import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import nuri.business.support.ControllerTestSupport;

@WebMvcTest(TemplateApiController.class)
@DisplayName("TemplateApiController 단위 테스트")
class TemplateApiControllerTest extends ControllerTestSupport {

    @MockitoBean
    private TmplatInfoService tmplatInfoService;

    @MockitoBean
    private JPAQueryFactory jpaQueryFactory;

    @Test
    @WithMockCustomUser(role = "ADMIN")
    @DisplayName("템플릿 목록 조회 테스트")
    void selectTmplatInfoListTest() throws Exception {
        given(tmplatInfoService.selectTmplatInfoList()).willReturn(List.of(TemplateDto.builder().build()));

        mockMvc.perform(get("/api/v1/admin/system/templates"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    @WithMockCustomUser(role = "ADMIN")
    @DisplayName("템플릿 등록 테스트")
    void insertTmplatInfoTest() throws Exception {
        // [2026-08-29] tb_tmplt_info 는 다섯 컬럼이 전부 NOT NULL 이다. 종전 payload 는
        //   tmpltSeCd·tmpltPath 를 빼고도 통과했는데, 그 요청은 운영에서 DB 제약 위반으로 죽었다.
        mockMvc.perform(post("/api/v1/admin/system/templates")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tmpltId\":\"T1\", \"tmpltNm\":\"Test Template\","
                                + " \"tmpltSeCd\":\"TMPT01\", \"tmpltPath\":\"/t.html\", \"useYn\":\"Y\"}"))
                .andExpect(status().isOk());
    }

    /**
     * 서버가 저장할 수 없는 요청은 <b>요청 단계에서</b> 거절해야 한다.
     *
     * <p>종전에는 이런 요청이 검증을 통과해 DB 제약 위반(500)까지 갔고, 화면에는 필드별 사유
     * 없이 "등록에 실패했습니다" 만 떴다. 400 + 필드 오류라야 사용자가 무엇을 고칠지 안다.
     *
     * <p>⚠ 빠뜨린 필드를 <b>하나씩</b> 검사한다. 여러 개를 한꺼번에 빼면 아무 하나 때문에 400 이
     * 나므로, 나머지 제약을 걷어도 테스트가 green 이라 red 를 증명하지 못한다(실측으로 확인).
     */
    @ParameterizedTest(name = "{0} 를 빠뜨리면 400")
    @ValueSource(strings = {"tmpltId", "tmpltNm", "tmpltSeCd", "tmpltPath", "useYn"})
    @WithMockCustomUser(role = "ADMIN")
    @DisplayName("NOT NULL 컬럼을 빠뜨린 등록은 400으로 거절한다 — 500까지 가지 않는다")
    void insertTmplatInfoRejectsIncompletePayload(String omitted) throws Exception {
        Map<String, String> payload = new LinkedHashMap<>(Map.of(
                "tmpltId", "T1",
                "tmpltNm", "Test Template",
                "tmpltSeCd", "TMPT01",
                "tmpltPath", "/t.html",
                "useYn", "Y"));
        payload.remove(omitted);

        mockMvc.perform(post("/api/v1/admin/system/templates")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(new ObjectMapper().writeValueAsString(payload)))
                .andExpect(status().isBadRequest());
    }

    // [2026-09-05 DEC-OPS-036] 수정·삭제 경로.
    @Test
    @WithMockCustomUser(role = "ADMIN")
    @DisplayName("템플릿 수정 — 경로의 ID 와 본문을 서비스에 위임한다")
    void updateTmplatInfoTest() throws Exception {
        given(tmplatInfoService.updateTmplatInfo(eq("T1"), any(TemplateDto.class)))
                .willReturn(TemplateDto.builder().tmpltId("T1").tmpltNm("Renamed").tmpltSeCd("TMPT01").tmpltPath("/t.html").useYn("Y").build());

        mockMvc.perform(put("/api/v1/admin/system/templates/T1")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tmpltId\":\"T1\", \"tmpltNm\":\"Renamed\","
                                + " \"tmpltSeCd\":\"TMPT01\", \"tmpltPath\":\"/t.html\", \"useYn\":\"Y\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.tmpltNm").value("Renamed"));
    }

    @Test
    @WithMockCustomUser(role = "ADMIN")
    @DisplayName("템플릿 삭제")
    void deleteTmplatInfoTest() throws Exception {
        mockMvc.perform(delete("/api/v1/admin/system/templates/T1").with(csrf()))
                .andExpect(status().isOk());

        verify(tmplatInfoService).deleteTmplatInfo("T1");
    }
}
