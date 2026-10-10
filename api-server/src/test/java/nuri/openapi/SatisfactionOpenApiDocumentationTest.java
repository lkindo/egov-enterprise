package nuri.openapi;

import nuri.api.support.ApiHttpIntegrationTest;
import nuri.business.service.board.dto.SatisfactionDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.assertj.core.api.Assertions.assertThat;
import static nuri.openapi.OpenApiDocumentationTest.resolveLocalReference;

/**
 * 만족도 문서 계약 — 만족도 DTO 를 참조하므로 게시판을 고르지 않은 생성물에서는 함께 빠진다(Phase 2 D6).
 * 종전에는 공통 문서 테스트 안에 경로 문자열로만 있어, 게시판이 없는 core 생성물에서 처음부터 붉었다.
 */
@ApiHttpIntegrationTest
@org.springframework.test.context.TestPropertySource(properties = {
    "springdoc.api-docs.enabled=true", "springdoc.swagger-ui.enabled=true",
    "springdoc.default-flat-param-object=true"
})
class SatisfactionOpenApiDocumentationTest {
  @Autowired private MockMvc mockMvc;
  @Autowired private tools.jackson.databind.ObjectMapper objectMapper;

  @Test
  @DisplayName("만족도 공개 DTO와 삭제 계약에는 익명 비밀번호 증명 surface가 없다")
  void satisfactionPasswordProofSurface_isRetired() throws Exception {
    String content = mockMvc.perform(get("/v3/api-docs")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
    tools.jackson.databind.JsonNode document = objectMapper.readTree(content);

    tools.jackson.databind.JsonNode schema =
        document.path("components").path("schemas").path(SatisfactionDto.class.getSimpleName());
    tools.jackson.databind.JsonNode delete = document.path("paths")
        .path("/api/v1/boards/{bbsId}/posts/{pstSn}/satisfactions/{dgstfnSn}")
        .path("delete");

    assertThat(schema.isObject()).isTrue();
    assertThat(schema.path("properties").has("pswd")).isFalse();
    assertThat(delete.isObject()).isTrue();
    assertThat(delete.path("parameters").valueStream()
        .map(parameter -> resolveLocalReference(document, parameter))
        .filter(parameter -> "query".equals(parameter.path("in").asString()))
        .map(parameter -> parameter.path("name").asString())
        .toList()).isEmpty();
  }
}
