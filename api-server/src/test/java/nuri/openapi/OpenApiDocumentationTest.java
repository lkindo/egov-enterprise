package nuri.openapi;

import nuri.business.support.IntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

/**
 * OpenAPI 문서화 테스트
 * API 문서화 생성 및 검증
 */
@IntegrationTest
@AutoConfigureMockMvc
@org.springframework.test.context.TestPropertySource(properties = {
    "springdoc.api-docs.enabled=true",
    "springdoc.swagger-ui.enabled=true"
})
class OpenApiDocumentationTest {

  @Autowired
  private MockMvc mockMvc;

  @Test
  @DisplayName("Swagger UI 엔드포인트 접근성 확인")
  void swaggerUi_endpoint_accessibility() throws Exception {
    // When & Then - Swagger UI 엔드포인트 확인
    mockMvc.perform(get("/swagger-ui/index.html")
        .contentType(MediaType.TEXT_HTML))
        .andExpect(status().isOk());
  }

  @Test
  @DisplayName("OpenAPI 스펙 JSON 생성 확인")
  void openApiSpec_endpoint_accessibility() throws Exception {
    // When & Then - OpenAPI 스펙 확인
    mockMvc.perform(get("/v3/api-docs")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.openapi").exists());

    // 테스트 환경에서는 파일 내보내기 기능 비활성화
    // String exportPath = System.getProperty("openapi.export.path");
    // if (exportPath != null && !exportPath.isEmpty()) {
    //   java.nio.file.Path path = java.nio.file.Paths.get(exportPath);
    //   java.nio.file.Files.createDirectories(path.getParent());
    //   java.nio.file.Files.write(path, content.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    // }
  }
}
