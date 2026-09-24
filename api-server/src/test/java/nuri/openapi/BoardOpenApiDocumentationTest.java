package nuri.openapi;

import nuri.api.support.ApiHttpIntegrationTest;
import nuri.business.service.board.dto.BoardDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.hamcrest.Matchers.hasItem;
import static org.assertj.core.api.Assertions.assertThat;
import static nuri.openapi.OpenApiDocumentationTest.assertNullableProperties;
import static nuri.openapi.OpenApiDocumentationTest.isNullableSchema;

/** Domain fixture is removed with its explicit source dependency; common spec generation remains. */
@ApiHttpIntegrationTest
@org.springframework.test.context.TestPropertySource(properties = {
    "springdoc.api-docs.enabled=true", "springdoc.swagger-ui.enabled=true",
    "springdoc.default-flat-param-object=true"
})
class BoardOpenApiDocumentationTest {
  @Autowired private MockMvc mockMvc;
  @Autowired private tools.jackson.databind.ObjectMapper objectMapper;

  @Test
  @DisplayName("공개 FAQ 전용 경로와 closed response schema가 OpenAPI에 노출된다")
  void publicFaqQueryContract_isDocumented() throws Exception {
    String content = mockMvc.perform(get("/v3/api-docs")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$['paths']['/api/v1/boards/public-faqs']['get']").exists())
        .andExpect(jsonPath("$['paths']['/api/v1/boards/public-faqs/{pstSn}']['get']").exists())
        .andExpect(jsonPath(
            "$['paths']['/api/v1/boards/{bbsId}']['get']['parameters'][?(@['name'] == 'publicOnly')]")
            .isEmpty())
        .andExpect(jsonPath("$.components.schemas.PublicFaqListItemResponse.properties.pstCn").doesNotExist())
        .andExpect(jsonPath("$.components.schemas.PublicFaqListItemResponse.properties.userId").doesNotExist())
        .andExpect(jsonPath("$.components.schemas.PublicFaqDetailResponse.properties.userId").doesNotExist())
        .andExpect(jsonPath("$.components.schemas.PublicFaqDetailResponse.required")
            .value(hasItem("bbsId")))
        .andExpect(jsonPath("$.components.schemas.PublicFaqDetailResponse.required")
            .value(hasItem("useYn")))
        .andExpect(jsonPath("$.components.schemas.PublicFaqDetailResponse.required")
            .value(hasItem("scrtYn")))
        .andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8);

    tools.jackson.databind.JsonNode schemas =
        tools.jackson.databind.json.JsonMapper.builder().configureForJackson2().build().readTree(content)
            .path("components").path("schemas");
    assertNullableProperties(schemas.path("BoardDto"),
        "ansSn", "pstTtl", "pstCn", "upPstSn", "sortOrdr", "ttlBoldYn", "inqCnt",
        "useYn", "pstBgngYmd", "pstEndYmd", "userId", "userNm", "atchFileSn", "scrtYn",
        "evntDt", "qnaSttsCd", "qnaCatCd", "likeCnt", "commentCnt", "fileCnt",
        "crtDt", "frstRegisterNm", "ansLv");
    assertNullableProperties(schemas.path("PublicFaqListItemResponse"),
        "pstTtl", "inqCnt", "crtDt");
    assertNullableProperties(schemas.path("PublicFaqDetailResponse"),
        "pstTtl", "pstCn", "inqCnt", "crtDt");
  }

  @Test
  @DisplayName("게시글 등록은 JSON이 아니라 실제 multipart 요청 계약을 문서화한다")
  void boardPostMultipartContract_isDocumented() throws Exception {
    String content = mockMvc.perform(get("/v3/api-docs")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
    tools.jackson.databind.JsonNode operation =
        tools.jackson.databind.json.JsonMapper.builder().configureForJackson2().build().readTree(content)
            .path("paths").path("/api/v1/boards/{bbsId}/posts/with-files").path("post");
    tools.jackson.databind.JsonNode mediaTypes = operation.path("requestBody").path("content");

    assertThat(mediaTypes.has("multipart/form-data")).isTrue();
    assertThat(mediaTypes.has("application/json")).isFalse();
    assertThat(mediaTypes.path("multipart/form-data").path("schema").path("properties").has("board"))
        .isTrue();
  }

  @Test
  @DisplayName("게시판 마스터 조회는 쓰기 DTO가 아닌 실제 응답 projection을 문서화한다")
  void boardMasterReadContracts_areDocumented() throws Exception {
    String content = mockMvc.perform(get("/v3/api-docs")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
    tools.jackson.databind.JsonNode schemas =
        tools.jackson.databind.json.JsonMapper.builder().configureForJackson2().build().readTree(content)
            .path("components").path("schemas");
    tools.jackson.databind.JsonNode summary = schemas.path("BoardMasterSummaryResponse");
    tools.jackson.databind.JsonNode detail = schemas.path("BoardMasterDetailResponse");

    assertThat(summary.path("properties").has("bbsId")).isTrue();
    assertThat(summary.path("properties").has("atchPsbltyFileSz")).isFalse();
    assertThat(detail.path("properties").has("atchPsbltyFileSz")).isTrue();
    assertThat(detail.path("required").valueStream()
        .map(tools.jackson.databind.JsonNode::asString).toList())
        .doesNotContain("atchPsbltyFileSz");
  }

}
