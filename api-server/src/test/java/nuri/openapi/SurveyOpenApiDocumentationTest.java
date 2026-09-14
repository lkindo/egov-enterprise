package nuri.openapi;

import nuri.api.support.ApiHttpIntegrationTest;
import nuri.business.service.survey.dto.SurveyResultDto;
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
class SurveyOpenApiDocumentationTest {
  @Autowired private MockMvc mockMvc;
  @Autowired private com.fasterxml.jackson.databind.ObjectMapper objectMapper;

  @Test
  @DisplayName("Survey의 실제 JSON null 생산 방식과 OpenAPI nullable 계약이 일치한다")
  void generatedSurveyJsonNullabilityContract_matchesRuntimeSerialization() throws Exception {
    String content = mockMvc.perform(get("/v3/api-docs")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
    com.fasterxml.jackson.databind.JsonNode schemas = objectMapper.readTree(content)
        .path("components").path("schemas");

    nuri.business.service.survey.dto.SurveyResultDto survey =
        nuri.business.service.survey.dto.SurveyResultDto.builder()
            .srvyRspnsSn(1L)
            .srvySn(2L)
            .srvyTmpltSn(3L)
            .srvyQstnSn(4L)
            .srvyArtclSn(5L)
            .build();
    com.fasterxml.jackson.databind.JsonNode surveyJson = objectMapper.valueToTree(survey);
    assertThat(surveyJson.path("rspdntAnsCn").isNull()).isTrue();
    assertThat(surveyJson.path("rspnsNm").isNull()).isTrue();
    assertThat(surveyJson.path("etcAnsCn").isNull()).isTrue();
    assertThat(surveyJson.path("frstRgtrId").isNull()).isTrue();
    assertThat(surveyJson.path("crtDt").isNull()).isTrue();
    assertNullableProperties(schemas.path("SurveyResultDto"),
        "rspdntAnsCn", "rspnsNm", "etcAnsCn", "frstRgtrId", "crtDt");
  }


}
