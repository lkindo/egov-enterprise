package com.company.project.openapi.test;

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
 * OpenAPI 문서 기반 테스트
 * API 문서와 실제 엔드포인트 간 일치성 확인
 */
@SpringBootTest
@AutoConfigureWebMvc
@ActiveProfiles("test")
class OpenApiDocumentationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("OpenAPI 문서 엔드포인트 접근 테스트")
    void openApiDocumentation_endpoint_accessibility() throws Exception {
        // When & Then - Swagger UI 접근 테스트
        mockMvc.perform(get("/swagger-ui/index.html")
                .contentType(MediaType.TEXT_HTML))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("OpenAPI 스펙 문서 접근 테스트")
    void openApiSpec_endpoint_accessibility() throws Exception {
        // When & Then - OpenAPI 스펙 문서 접근 테스트
        mockMvc.perform(get("/v3/api-docs")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON));
    }

    @Test
    @DisplayName("특정 API 그룹 OpenAPI 스펙 접근 테스트")
    void openApiSpec_specificGroup_accessibility() throws Exception {
        // When & Then - 특정 API 그룹 스펙 접근 테스트
        mockMvc.perform(get("/v3/api-docs/user-api")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON));
    }
}