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
class CommentOpenApiDocumentationTest {
  @Autowired private MockMvc mockMvc;
  @Autowired private com.fasterxml.jackson.databind.ObjectMapper objectMapper;

  @Test
  @DisplayName("댓글 DTO는 응답 nullable 필드와 요청 비밀번호 방향을 정확히 문서화한다")
  void commentDtoNullabilityAndAccessContract_isDocumented() throws Exception {
    String content = mockMvc.perform(get("/v3/api-docs")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8);

    com.fasterxml.jackson.databind.JsonNode properties =
        new com.fasterxml.jackson.databind.ObjectMapper().readTree(content)
            .path("components").path("schemas").path("CommentDto").path("properties");
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
        .containsExactlyInAnyOrder("wrterId", "wrterNm", "frstRgtrId", "crtDt");
    assertThat(readOnlyProperties)
        .containsExactlyInAnyOrder("wrterId", "wrterNm", "frstRgtrId", "crtDt");
    assertThat(properties.path("pswd").path("writeOnly").asBoolean(false)).isTrue();
    assertThat(properties.path("pswd").path("readOnly").asBoolean(false)).isFalse();
    assertThat(isNullableSchema(properties.path("pswd"))).isFalse();
  }

}
