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
 * OpenAPI 臾몄꽌???뚯뒪?? * API 臾몄꽌 援ъ“ 諛??ㅽ럺 ?뺤씤
 */
@SpringBootTest(properties = { "springdoc.api-docs.enabled=true", "springdoc.swagger-ui.enabled=true" })
@AutoConfigureMockMvc
@ActiveProfiles({"test", "security-test"})
class OpenApiDocumentationTest {

  @Autowired
  private MockMvc mockMvc;

  @Test
  @DisplayName("Swagger UI ?붾뱶?ъ씤???묎렐 ?뺤씤")
  void swaggerUi_endpoint_accessibility() throws Exception {
    // When & Then - Swagger UI ?묎렐 ?뺤씤
    mockMvc.perform(get("/swagger-ui/index.html")
        .contentType(MediaType.TEXT_HTML))
        .andExpect(status().isOk());
  }

  @Test
  @DisplayName("OpenAPI ?ㅽ럺 JSON 議고쉶 諛??대낫?닿린")
  void openApiSpec_endpoint_accessibility() throws Exception {
    // When & Then - OpenAPI ?ㅽ럺 ?뺤씤
    String content = mockMvc.perform(get("/v3/api-docs")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.openapi").exists())
        .andReturn().getResponse().getContentAsString();

    // ?쒖뒪???꾨줈?쇳떚濡?寃쎈줈媛 吏?뺣맂 寃쎌슦 ?뚯씪濡????    String exportPath = System.getProperty("openapi.export.path");
    if (exportPath != null && !exportPath.isEmpty()) {
      java.nio.file.Path path = java.nio.file.Paths.get(exportPath);
      java.nio.file.Files.createDirectories(path.getParent());
      java.nio.file.Files.write(path, content.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }
  }
}
