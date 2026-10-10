package nuri.openapi;

import nuri.api.support.ApiHttpIntegrationTest;
import nuri.business.service.addressbook.dto.AddressBookDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * 주소록 문서 계약 — 주소록 DTO 를 참조하므로 주소록을 고르지 않은 생성물에서는 함께 빠진다(Phase 2 D6).
 * 종전에는 공통 문서 테스트 안에 경로 문자열로만 있어, 주소록이 없는 core·collaboration 생성물에서 처음부터 붉었다.
 */
@ApiHttpIntegrationTest
@org.springframework.test.context.TestPropertySource(properties = {
    "springdoc.api-docs.enabled=true", "springdoc.swagger-ui.enabled=true",
    "springdoc.default-flat-param-object=true"
})
class AddressBookOpenApiDocumentationTest {
  @Autowired private MockMvc mockMvc;
  @Autowired private tools.jackson.databind.ObjectMapper objectMapper;

  @Test
  @DisplayName("주소록 수정은 성공·충돌 응답과 상세 상태 토큰을 함께 문서화한다")
  void addressBookSnapshotUpdateContract_isDocumented() throws Exception {
    tools.jackson.databind.JsonNode document = objectMapper.readTree(mockMvc.perform(get("/v3/api-docs"))
        .andExpect(status().isOk())
        .andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8));
    tools.jackson.databind.JsonNode responses = document.path("paths")
        .path("/api/v1/address-books/{adbkSn}").path("put").path("responses");
    for (String code : java.util.List.of("200", "409")) {
      assertThat(responses.path(code).path("content").path("application/json").path("schema")
          .path("$ref").asString()).isEqualTo("#/components/schemas/ApiResponseVoid");
    }
    assertThat(responses.path("409").path("description").asString()).contains("C013");
    tools.jackson.databind.JsonNode token = document.path("components").path("schemas")
        .path(AddressBookDto.class.getSimpleName()).path("properties").path("editToken");
    assertThat(token.path("minLength").asInt()).isEqualTo(64);
    assertThat(token.path("maxLength").asInt()).isEqualTo(64);
    assertThat(token.path("pattern").asString()).isEqualTo("^[a-f0-9]{64}$");
  }
}
