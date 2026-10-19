package nuri.api.support;

import nuri.business.security.annotation.WithMockCustomUser;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * ADR-0036 의 페이징·생성 응답 규약을 <b>운영과 같은 Spring 컨텍스트</b>에서 HTTP 로 확인한다.
 *
 * <p>standalone MockMvc 는 Boot 설정·필터를 읽지 않아 리졸버가 운영과 다를 수 있다(테스트 application.yml 섀도잉과 같은 함정).
 * 그래서 여기서는 실제 리졸버(one-indexed)·{@link PaginationRequestFilter}·운영 보안 체인을 지난 응답만 본다.
 * 두 바인딩 방식을 하나씩 고른다 — {@code Pageable}(스크랩 목록)과 {@code BaseSearchDto}(업무보고 목록).
 */
@ApiHttpIntegrationTest
@WithMockCustomUser(role = "ADMIN")
@DisplayName("ADR-0036 — 1 기반 페이지·잘못된 입력 400·생성 201 (운영 컨텍스트)")
class PaginationConventionIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JsonMapper jsonMapper;

    @Test
    @DisplayName("Pageable 목록: page=1·2 는 겹치지 않고 응답 page 가 요청과 같으며, 옛 이름은 별칭으로 받는다")
    void pageableListIsOneBasedAndAliased() throws Exception {
        for (int i = 1; i <= 3; i++) {
            mockMvc.perform(post("/api/v1/scraps").contentType(MediaType.APPLICATION_JSON)
                            .content("{\"scrapNm\":\"규약 스크랩 " + i + "\",\"scrapUrl\":\"https://example.com/adr-0036/" + i
                                    + "\",\"useYn\":\"Y\"}"))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.status").value(201))
                    .andExpect(jsonPath("$.data").isNumber());
        }

        JsonNode first = data(mockMvc.perform(get("/api/v1/scraps").param("page", "1").param("size", "2"))
                .andExpect(status().isOk()).andReturn());
        JsonNode second = data(mockMvc.perform(get("/api/v1/scraps").param("page", "2").param("size", "2"))
                .andExpect(status().isOk()).andReturn());

        assertThat(first.get("page").asInt()).isEqualTo(1);
        assertThat(second.get("page").asInt()).isEqualTo(2);
        assertThat(first.get("total").asLong()).isGreaterThanOrEqualTo(3);
        assertThat(first.get("list")).hasSize(2);
        assertThat(ids(first, "scrapSn")).doesNotContainAnyElementsOf(ids(second, "scrapSn"));

        JsonNode aliased = data(mockMvc.perform(get("/api/v1/scraps").param("pageIndex", "2").param("pageUnit", "2"))
                .andExpect(status().isOk()).andReturn());
        assertThat(aliased.get("page").asInt()).isEqualTo(2);
        assertThat(ids(aliased, "scrapSn")).isEqualTo(ids(second, "scrapSn"));
    }

    @Test
    @DisplayName("BaseSearchDto 목록: page=1·2 는 겹치지 않고 응답 page 가 요청과 같으며, 옛 이름은 별칭으로 받는다")
    void baseSearchListIsOneBasedAndAliased() throws Exception {
        for (int i = 1; i <= 3; i++) {
            mockMvc.perform(post("/api/v1/work-reports").contentType(MediaType.APPLICATION_JSON)
                            .content("{\"rptTtl\":\"규약 보고 " + i + "\",\"rptCn\":\"본문\",\"rptYmd\":\"20261019\"}"))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.status").value(201))
                    .andExpect(jsonPath("$.data").isNumber());
        }

        JsonNode first = data(mockMvc.perform(get("/api/v1/work-reports").param("page", "1").param("size", "2"))
                .andExpect(status().isOk()).andReturn());
        JsonNode second = data(mockMvc.perform(get("/api/v1/work-reports").param("page", "2").param("size", "2"))
                .andExpect(status().isOk()).andReturn());

        assertThat(first.get("page").asInt()).isEqualTo(1);
        assertThat(second.get("page").asInt()).isEqualTo(2);
        assertThat(first.get("list")).hasSize(2);
        assertThat(ids(first, "rptpSn")).doesNotContainAnyElementsOf(ids(second, "rptpSn"));

        JsonNode aliased = data(mockMvc.perform(get("/api/v1/work-reports").param("pageIndex", "2").param("pageUnit", "2"))
                .andExpect(status().isOk()).andReturn());
        assertThat(aliased.get("page").asInt()).isEqualTo(2);
        assertThat(ids(aliased, "rptpSn")).isEqualTo(ids(second, "rptpSn"));
    }

    @Test
    @DisplayName("옛 0 기반 page=0·범위 밖 size·읽지 않던 옛 이름·새 이름과 겹친 별칭은 400 이다")
    void invalidPagingInputIsRejected() throws Exception {
        for (String path : List.of("/api/v1/scraps", "/api/v1/work-reports")) {
            for (String[] query : List.of(
                    new String[] {"page", "0"}, new String[] {"page", "-1"}, new String[] {"page", "abc"},
                    new String[] {"size", "0"}, new String[] {"size", "101"},
                    new String[] {"pageNo", "1"}, new String[] {"pageSize", "10"},
                    new String[] {"recordCountPerPage", "10"}, new String[] {"firstIndex", "0"})) {
                mockMvc.perform(get(path).param(query[0], query[1]))
                        .andExpect(status().isBadRequest())
                        .andExpect(jsonPath("$.status").value(400))
                        .andExpect(jsonPath("$.errors[0].field").value(query[0]));
            }
            mockMvc.perform(get(path).param("page", "1").param("pageIndex", "1"))
                    .andExpect(status().isBadRequest());
            mockMvc.perform(get(path).param("pageUnit", "101"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errors[0].field").value("size"));
        }
    }

    private JsonNode data(MvcResult result) throws Exception {
        return jsonMapper.readTree(result.getResponse().getContentAsString()).get("data");
    }

    private static List<Long> ids(JsonNode page, String field) {
        List<Long> ids = new ArrayList<>();
        page.get("list").forEach(row -> ids.add(row.get(field).asLong()));
        return ids;
    }
}
