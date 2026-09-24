package nuri.openapi;

import nuri.api.support.ApiHttpIntegrationTest;
import nuri.business.service.operation.ExternalHrService;
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
class OperationOpenApiDocumentationTest {
  @Autowired private MockMvc mockMvc;
  @Autowired private tools.jackson.databind.ObjectMapper objectMapper;

  @Test
  @DisplayName("외부인사 중복 등록의 409 오류 봉투를 OpenAPI에 문서화한다")
  void externalHrDuplicateConflict_isDocumented() throws Exception {
    String content = mockMvc.perform(get("/v3/api-docs")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
    tools.jackson.databind.JsonNode document = objectMapper.readTree(content);
    tools.jackson.databind.JsonNode responses = document
        .path("paths").path("/api/v1/admin/operation/external-hr").path("post")
        .path("responses");
    tools.jackson.databind.JsonNode success = responses.path("200");
    tools.jackson.databind.JsonNode conflict = responses.path("409");

    assertThat(success.path("content").path("application/json")
        .path("schema").path("$ref").asString())
        .isEqualTo("#/components/schemas/ApiResponseExternalHrDto");
    assertThat(document.path("components").path("schemas")
        .path("ApiResponseExternalHrDto").isObject()).isTrue();
    assertThat(conflict.isObject()).isTrue();
    assertThat(conflict.path("description").asString()).contains("중복");
    assertThat(conflict.path("content").path("application/json")
        .path("schema").path("$ref").asString())
        .isEqualTo("#/components/schemas/ApiResponseVoid");
  }

}
