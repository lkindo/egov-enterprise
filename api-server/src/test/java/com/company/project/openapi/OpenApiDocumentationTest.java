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
 * OpenAPI Î¨∏ÏÑú Í∏∞Î∞ò ?åÏä§??
 * API Î¨∏ÏÑú?Ä ?§Ï†ú ?îÎìú?¨Ïù∏??Í∞??ºÏπò???ïÏù∏
 */
@SpringBootTest
@AutoConfigureWebMvc
@ActiveProfiles("test")
class OpenApiDocumentationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("OpenAPI Î¨∏ÏÑú ?îÎìú?¨Ïù∏???ëÍ∑º ?åÏä§??)
    void openApiDocumentation_endpoint_accessibility() throws Exception {
        // When & Then - Swagger UI ?ëÍ∑º ?åÏä§??
        mockMvc.perform(get("/swagger-ui/index.html")
                .contentType(MediaType.TEXT_HTML))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("OpenAPI ?§Ìéô Î¨∏ÏÑú ?ëÍ∑º ?åÏä§??)
    void openApiSpec_endpoint_accessibility() throws Exception {
        // When & Then - OpenAPI ?§Ìéô Î¨∏ÏÑú ?ëÍ∑º ?åÏä§??
        mockMvc.perform(get("/v3/api-docs")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON));
    }

    @Test
    @DisplayName("?πÏ†ï API Í∑∏Î£π OpenAPI ?§Ìéô ?ëÍ∑º ?åÏä§??)
    void openApiSpec_specificGroup_accessibility() throws Exception {
        // When & Then - ?πÏ†ï API Í∑∏Î£π ?§Ìéô ?ëÍ∑º ?åÏä§??
        mockMvc.perform(get("/v3/api-docs/user-api")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON));
    }
}
