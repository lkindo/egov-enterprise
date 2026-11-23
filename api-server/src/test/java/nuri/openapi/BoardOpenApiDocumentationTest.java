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

/** Domain fixture is removed with its explicit source dependency; common spec generation remains. */
@ApiHttpIntegrationTest
@org.springframework.test.context.TestPropertySource(properties = {
    "springdoc.api-docs.enabled=true", "springdoc.swagger-ui.enabled=true",
    "springdoc.default-flat-param-object=true"
})
class BoardOpenApiDocumentationTest {
  @Autowired private MockMvc mockMvc;

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
    assertNullableProperties(schemas.path(BoardDto.class.getSimpleName()),
        "ansSn", "pstTtl", "pstCn", "upPstSn", "sortOrdr", "ttlBoldYn", "inqCnt",
        "useYn", "pstBgngYmd", "pstEndYmd", "userId", "userNm", "atchFileSn", "scrtYn",
        "evntDt", "qnaSttsCd", "qnaCatCd", "likeCnt", "commentCnt", "fileCnt",
        "crtDt", "ansLv",
        // [2026-10-23 ADR-0040 결정 3·10] 게시판 목록·상세 밖의 경로는 싣지 않는 서버 판정 게시 상태와 게시글 버전.
        "postingStatus", "version",
        // [ADR-0040 결정 5] 게시판 목록·상세에서만 싣는 서버 판정 고정 여부와 고정 중일 때의 종료일.
        "pinned", "upendFixEndYmd");
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

  /**
   * [2026-11-23 GAP-BOARD-004] 작성자 이름 조회에 대체 이름이 없어져, 인증 뒤 작성자 계정이 삭제된 등록은 404(U001)이다. 등록 두 연산은
   * 경로 변수 유무와 관계없이 404 와 실제로 낼 수 있는 코드(게시판 B001·첨부 묶음 C007·작성자 U001)를 선언해야 한다 — 공통 주입은 경로
   * 변수가 없는 JSON 등록에 404 를 붙이지 않고, 붙이는 경우에도 C003/C007 만 적는다.
   */
  @Test
  @DisplayName("게시글 등록 두 연산은 404 와 실제 오류 코드(B001·C007·U001)를 문서화한다")
  void boardPostCreateNotFoundCodes_areDocumented() throws Exception {
    String content = mockMvc.perform(get("/v3/api-docs")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
    tools.jackson.databind.JsonNode paths =
        tools.jackson.databind.json.JsonMapper.builder().configureForJackson2().build().readTree(content).path("paths");
    for (String path : java.util.List.of("/api/v1/boards/posts", "/api/v1/boards/{bbsId}/posts/with-files")) {
      tools.jackson.databind.JsonNode notFound = paths.path(path).path("post").path("responses").path("404");
      assertThat(notFound.path("description").asString())
          .as(path).contains("(code: B001/C007/U001)").doesNotContain("C003");
      assertThat(notFound.path("content").path("application/json").path("schema").path("$ref").asString())
          .as(path).isEqualTo("#/components/schemas/ApiResponseVoid");
    }
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
        .doesNotContain("atchPsbltyFileSz")
        // [2026-10-23 ADR-0040 결정 3·6] 예약 게시 설정은 늘 싣는다(기존 게시판 기본값 N).
        .contains("rsvtPstgPsbltyYn");
    assertThat(schemas.path("BoardMetaDto").path("required").valueStream()
        .map(tools.jackson.databind.JsonNode::asString).toList())
        .contains("rsvtPstgPsbltyYn");
  }

  @Test
  @DisplayName("[ADR-0040 §6 B1] 운영 게시 기간 경로와 목록의 게시 상태 조건이 문서화된다")
  void boardOperationPeriodContracts_areDocumented() throws Exception {
    String content = mockMvc.perform(get("/v3/api-docs")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$['paths']['/api/v1/admin/system/board-masters/{bbsId}/posts/{pstSn}/period']['patch']").exists())
        .andExpect(jsonPath("$['paths']['/api/v1/admin/system/board-masters/{bbsId}/posts/batch/period']['post']").exists())
        .andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
    tools.jackson.databind.JsonNode root =
        tools.jackson.databind.json.JsonMapper.builder().configureForJackson2().build().readTree(content);
    tools.jackson.databind.JsonNode postingStatus = root.path("paths").path("/api/v1/boards/{bbsId}").path("get")
        .path("parameters").valueStream().filter(parameter -> "postingStatus".equals(parameter.path("name").asString()))
        .findFirst().orElseThrow();
    assertThat(postingStatus.path("required").asBoolean(false)).isFalse();
    assertThat(postingStatus.path("schema").path("enum").valueStream()
        .map(tools.jackson.databind.JsonNode::asString).toList())
        .containsExactly("SCHEDULED", "POSTING", "ENDED");
    assertThat(root.path("components").path("schemas").path("BoardPostPeriodRequest").path("required").valueStream()
        .map(tools.jackson.databind.JsonNode::asString).toList())
        .containsExactly("version");
  }

  @Test
  @DisplayName("[ADR-0040 §6 B2] 상단 고정 경로·목록의 고정 조건·고정 정책 필드가 문서화된다")
  void boardPinContracts_areDocumented() throws Exception {
    String content = mockMvc.perform(get("/v3/api-docs")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$['paths']['/api/v1/admin/system/board-masters/{bbsId}/posts/{pstSn}/pin']['patch']").exists())
        .andExpect(jsonPath("$['paths']['/api/v1/admin/system/board-masters/{bbsId}/posts/batch/pin']['post']").exists())
        .andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
    tools.jackson.databind.JsonNode root =
        tools.jackson.databind.json.JsonMapper.builder().configureForJackson2().build().readTree(content);
    tools.jackson.databind.JsonNode pinned = root.path("paths").path("/api/v1/boards/{bbsId}").path("get")
        .path("parameters").valueStream().filter(parameter -> "pinned".equals(parameter.path("name").asString()))
        .findFirst().orElseThrow();
    assertThat(pinned.path("required").asBoolean(false)).isFalse();
    assertThat(pinned.path("schema").path("type").asString()).isEqualTo("boolean");
    tools.jackson.databind.JsonNode schemas = root.path("components").path("schemas");
    assertThat(schemas.path("BoardPostPinRequest").path("required").valueStream()
        .map(tools.jackson.databind.JsonNode::asString).toList())
        .containsExactly("upendFixYn");
    assertThat(schemas.path("BoardPostPinBatchRequest").path("required").valueStream()
        .map(tools.jackson.databind.JsonNode::asString).toList())
        .containsExactlyInAnyOrder("pstSns", "upendFixYn");
    assertThat(schemas.path("BoardMasterDetailResponse").path("required").valueStream()
        .map(tools.jackson.databind.JsonNode::asString).toList())
        .contains("upendFixPsbltyYn", "upendFixUplmtNocs", "upendFixBscDayCnt");
    assertThat(schemas.path("BoardMetaDto").path("required").valueStream()
        .map(tools.jackson.databind.JsonNode::asString).toList())
        .contains("upendFixPsbltyYn");
    tools.jackson.databind.JsonNode limit = schemas.path("BoardMasterUpdateRequest").path("properties").path("upendFixUplmtNocs");
    assertThat(limit.path("minimum").asInt()).isEqualTo(1);
    assertThat(limit.path("maximum").asInt()).isEqualTo(100);
  }

  @Test
  @DisplayName("[ADR-0040 §6 B3] 추천 취소 경로와 비밀글 정책·추천 받기 필드가 문서화된다")
  void boardPostPolicyContracts_areDocumented() throws Exception {
    String content = mockMvc.perform(get("/v3/api-docs")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$['paths']['/api/v1/boards/{bbsId}/posts/{pstSn}/like']['delete']['operationId']")
            .value("cancelLikePost"))
        .andExpect(jsonPath("$['paths']['/api/v1/boards/{bbsId}/posts/{pstSn}/like']['patch']['operationId']")
            .value("likePost"))
        .andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
    tools.jackson.databind.JsonNode schemas =
        tools.jackson.databind.json.JsonMapper.builder().configureForJackson2().build().readTree(content)
            .path("components").path("schemas");
    for (String schema : java.util.List.of("BoardMasterDetailResponse", "BoardMetaDto")) {
      assertThat(schemas.path(schema).path("required").valueStream()
          .map(tools.jackson.databind.JsonNode::asString).toList())
          .as(schema).contains("prvtPstPlcyCd", "rcmdtnUseYn");
    }
    for (String schema : java.util.List.of("BoardMasterUpdateRequest", "BoardMasterDto", "BoardMetaDto",
        "BoardMasterDetailResponse")) {
      tools.jackson.databind.JsonNode properties = schemas.path(schema).path("properties");
      assertThat(properties.path("prvtPstPlcyCd").path("enum").valueStream()
          .map(tools.jackson.databind.JsonNode::asString).toList())
          .as(schema).containsExactly("NONE", "OPTIONAL", "REQUIRED");
      assertThat(properties.path("rcmdtnUseYn").path("enum").valueStream()
          .map(tools.jackson.databind.JsonNode::asString).toList())
          .as(schema).containsExactly("Y", "N");
    }
    for (String request : java.util.List.of("BoardMasterUpdateRequest", "BoardMasterDto")) {
      assertThat(schemas.path(request).path("required").valueStream()
          .map(tools.jackson.databind.JsonNode::asString).toList())
          .as("%s — 보내지 않으면 지금 값(생성은 NONE·Y)이다", request)
          .doesNotContain("prvtPstPlcyCd", "rcmdtnUseYn");
    }
  }
}
