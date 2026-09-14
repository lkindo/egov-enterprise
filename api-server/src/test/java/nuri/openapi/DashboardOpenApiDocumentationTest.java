package nuri.openapi;

import nuri.api.support.ApiHttpIntegrationTest;
import nuri.api.controller.business.main.DashboardResponse;
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
class DashboardOpenApiDocumentationTest {
  @Autowired private MockMvc mockMvc;
  @Autowired private com.fasterxml.jackson.databind.ObjectMapper objectMapper;

  @Test
  @DisplayName("대시보드는 Map이 아닌 필수 필드가 있는 응답 DTO를 문서화한다")
  void dashboardResponseContract_isDocumented() throws Exception {
    String content = mockMvc.perform(get("/v3/api-docs")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
    com.fasterxml.jackson.databind.JsonNode document =
        new com.fasterxml.jackson.databind.ObjectMapper().readTree(content);
    com.fasterxml.jackson.databind.JsonNode schema = document.path("components")
        .path("schemas").path("DashboardResponse");
    java.util.List<String> required = schema.path("required").valueStream()
        .map(com.fasterxml.jackson.databind.JsonNode::asText).toList();

    assertThat(schema.isMissingNode()).isFalse();
    assertThat(schema.path("properties").has("taskList")).isTrue();
    assertThat(schema.path("properties").has("notiList")).isTrue();
    assertThat(schema.path("properties").has("pendingApprovalCount")).isTrue();
    assertThat(schema.path("properties").has("extensions")).isFalse();
    assertThat(required).contains("taskList", "notiList", "pendingApprovalCount");
  }

}
