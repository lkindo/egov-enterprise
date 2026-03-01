package com.company.project.openapi;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureWebMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;

/**
 * OpenAPI 문서 기반 ?�스??
 * API 문서?� ?�제 ?�드?�인??�??�치???�인
 */
@SpringBootTest
@AutoConfigureWebMvc
@ActiveProfiles("test")
class OpenApiDocumentationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("OpenAPI 문서 ?�드?�인???�근 ?�스??)
    void openApiDocumentation_endpoint_accessibility() throws Exception {
        // When & Then - Swagger UI ?�근 ?�스??
        mockMvc.perform(get("/swagger-ui/index.html")
                .contentType(MediaType.TEXT_HTML))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("OpenAPI ?�펙 문서 ?�근 ?�스??)
    void openApiSpec_endpoint_accessibility() throws Exception {
        // When & Then - OpenAPI ?�펙 문서 ?�근 ?�스??
        mockMvc.perform(get("/v3/api-docs")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON));
    }

    @Test
    @DisplayName("?�정 API 그룹 OpenAPI ?�펙 ?�근 ?�스??)
    void openApiSpec_specificGroup_accessibility() throws Exception {
        // When & Then - ?�정 API 그룹 ?�펙 ?�근 ?�스??
        mockMvc.perform(get("/v3/api-docs/user-api")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON));
    }
}
