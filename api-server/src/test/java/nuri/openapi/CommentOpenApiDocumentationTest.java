package nuri.openapi;

import nuri.api.support.ApiHttpIntegrationTest;
import nuri.business.service.comment.dto.CommentDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.assertj.core.api.Assertions.assertThat;
import static nuri.openapi.OpenApiDocumentationTest.isNullableSchema;

/** Domain fixture is removed with its explicit source dependency; common spec generation remains. */
@ApiHttpIntegrationTest
@org.springframework.test.context.TestPropertySource(properties = {
    "springdoc.api-docs.enabled=true", "springdoc.swagger-ui.enabled=true",
    "springdoc.default-flat-param-object=true"
})
class CommentOpenApiDocumentationTest {
  @Autowired private MockMvc mockMvc;

  @Test
  @DisplayName("댓글 DTO는 내부 신원을 숨기고 표시명·편집 판정을 문서화하며 폐기된 비밀번호를 계약에 두지 않는다")
  void commentDtoNullabilityAndAccessContract_isDocumented() throws Exception {
    String content = mockMvc.perform(get("/v3/api-docs")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8);

    tools.jackson.databind.JsonNode properties =
        tools.jackson.databind.json.JsonMapper.builder().configureForJackson2().build().readTree(content)
            .path("components").path("schemas").path(CommentDto.class.getSimpleName()).path("properties");
    java.util.Set<String> nullableProperties = new java.util.HashSet<>();
    java.util.Set<String> readOnlyProperties = new java.util.HashSet<>();
    properties.properties().forEach(entry -> {
      if (isNullableSchema(entry.getValue())) {
        nullableProperties.add(entry.getKey());
      }
      if (entry.getValue().path("readOnly").asBoolean(false)) {
        readOnlyProperties.add(entry.getKey());
      }
    });

    assertThat(nullableProperties)
        .containsExactlyInAnyOrder("wrterNm", "crtDt");
    assertThat(readOnlyProperties)
        .containsExactlyInAnyOrder("wrterNm", "editable", "deletable", "crtDt");
    assertThat(properties.has("wrterId")).isFalse();
    assertThat(properties.has("frstRgtrId")).isFalse();
    // [2026-10-19] 익명 댓글 비밀번호는 요청으로도 받지 않는다 — 평문 저장 경로였다(ADR-0011 의 만족도와 같은 정리).
    assertThat(properties.has("pswd")).as("댓글 계약에 폐기된 비밀번호 필드가 남아 있다").isFalse();
  }

}
