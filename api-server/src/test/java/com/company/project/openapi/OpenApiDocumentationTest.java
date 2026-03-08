package com.company.project.openapi;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

/**
 * OpenAPI 문서화 테스트
 * API 문서 구조 및 스펙 확인
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class OpenApiDocumentationTest {

  @Autowired
  private MockMvc mockMvc;

  @Test
  @DisplayName("Swagger UI 엔드포인트 접근 확인")
  void swaggerUi_endpoint_accessibility() throws Exception {
    // When & Then - Swagger UI 접근 확인
    mockMvc.perform(get("/swagger-ui/index.html")
        .contentType(MediaType.TEXT_HTML))
        .andExpect(status().isOk());
  }

  @Test
  @DisplayName("OpenAPI 스펙 JSON 조회 및 내보내기")
  void openApiSpec_endpoint_accessibility() throws Exception {
    // When & Then - OpenAPI 스펙 확인
    String content = mockMvc.perform(get("/v3/api-docs")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.openapi").exists())
        .andReturn().getResponse().getContentAsString();

    // 시스템 프로퍼티로 경로가 지정된 경우 파일로 저장
    String exportPath = System.getProperty("openapi.export.path");
    if (exportPath != null && !exportPath.isEmpty()) {
      java.nio.file.Path path = java.nio.file.Paths.get(exportPath);
      java.nio.file.Files.createDirectories(path.getParent());
      java.nio.file.Files.write(path, content.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }
  }
}
