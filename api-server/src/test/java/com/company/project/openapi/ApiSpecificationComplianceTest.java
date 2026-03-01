package com.company.project.openapi;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureWebMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * API ëª…ì„¸?€ ?¤ì œ ?™ì‘ ê°??¼ì¹˜???ŒìŠ¤??
 * OpenAPI ëª…ì„¸???•ì˜???€ë¡??¤ì œ APIê°€ ?™ì‘?˜ëŠ”ì§€ ?•ì¸
 */
@SpringBootTest
@AutoConfigureWebMvc
@ActiveProfiles("test")
class ApiSpecificationComplianceTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("API ëª…ì„¸???°ë¥¸ ?¬ìš©???±ë¡ ?”ë“œ?¬ì¸???™ì‘ ?•ì¸")
    void userSignup_specification_compliance() throws Exception {
        // Given
        String validUserSignupRequest = """
                {
                    "userId": "testUser123",
                    "password": "Password123!",
                    "userNm": "?ŒìŠ¤???¬ìš©??,
                    "passwordHint": "password hint",
                    "passwordCnsr": "password answer",
                    "role": "USER"
                }
                """;

        // When & Then - API ëª…ì„¸???°ë¼ POST /api/v1/users/signup ?”ë“œ?¬ì¸?¸ê? ?™ì‘?´ì•¼ ??
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(validUserSignupRequest))
                .andExpect(status().isOk()) // ëª…ì„¸???°ë¼ 200 OK ë°˜í™˜
                .andExpect(content().contentType(MediaType.APPLICATION_JSON));
    }

    @Test
    @DisplayName("API ëª…ì„¸???°ë¥¸ ?¬ìš©??ëª©ë¡ ì¡°íšŒ ?”ë“œ?¬ì¸???™ì‘ ?•ì¸")
    void userGetList_specification_compliance() throws Exception {
        // When & Then - API ëª…ì„¸???°ë¼ GET /api/v1/users ?”ë“œ?¬ì¸?¸ê? ?™ì‘?´ì•¼ ??
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk()) // ëª…ì„¸???°ë¼ 200 OK ë°˜í™˜
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray()); // ëª…ì„¸???°ë¼ ë°°ì—´ ?•íƒœ???°ì´??ë°˜í™˜
    }

    @Test
    @DisplayName("API ëª…ì„¸???°ë¥¸ ?¬ìš©???¨ì¼ ì¡°íšŒ ?”ë“œ?¬ì¸???™ì‘ ?•ì¸")
    void userGetById_specification_compliance() throws Exception {
        // When & Then - API ëª…ì„¸???°ë¼ GET /api/v1/users/{id} ?”ë“œ?¬ì¸?¸ê? ?™ì‘?´ì•¼ ??
        mockMvc.perform(get("/api/v1/users/testUser")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk()) // ëª…ì„¸???°ë¼ 200 OK ë°˜í™˜
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").exists()); // ëª…ì„¸???°ë¼ ?¨ì¼ ê°ì²´ ?•íƒœ???°ì´??ë°˜í™˜
    }

    @Test
    @DisplayName("API ëª…ì„¸???°ë¥¸ ?˜ëª»???”ì²­ ??400 ë°˜í™˜ ?•ì¸")
    void invalidRequest_specification_compliance() throws Exception {
        // Given
        String invalidRequest = """
                {
                    "userId": "",
                    "password": "short",
                    "userNm": ""
                }
                """; // Invalid request according to API spec

        // When & Then - API ëª…ì„¸???°ë¼ ?˜ëª»???”ì²­ ??400 Bad Request ë°˜í™˜
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalidRequest))
                .andExpect(status().isBadRequest()) // ëª…ì„¸???°ë¼ 400 Bad Request ë°˜í™˜
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("API ëª…ì„¸???°ë¥¸ ?¸ì¦ ?„ìš” ?”ë“œ?¬ì¸???‘ê·¼ ??401 ë°˜í™˜ ?•ì¸")
    void unauthorizedAccess_specification_compliance() throws Exception {
        // When & Then - API ëª…ì„¸???°ë¼ ?¸ì¦???„ìš”???”ë“œ?¬ì¸?¸ì— ?‘ê·¼ ??401 Unauthorized ë°˜í™˜
        mockMvc.perform(get("/api/v1/admin/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized()) // ëª…ì„¸???°ë¼ 401 Unauthorized ë°˜í™˜
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("API ëª…ì„¸???°ë¥¸ ì¡´ì¬?˜ì? ?ŠëŠ” ë¦¬ì†Œ???”ì²­ ??404 ë°˜í™˜ ?•ì¸")
    void notFoundResource_specification_compliance() throws Exception {
        // When & Then - API ëª…ì„¸???°ë¼ ì¡´ì¬?˜ì? ?ŠëŠ” ë¦¬ì†Œ???”ì²­ ??404 Not Found ë°˜í™˜
        mockMvc.perform(get("/api/v1/users/nonexistentUser")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound()) // ëª…ì„¸???°ë¼ 404 Not Found ë°˜í™˜
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("API ëª…ì„¸???°ë¥¸ HTTP ë©”ì„œ??ë¶ˆì¼ì¹???405 ë°˜í™˜ ?•ì¸")
    void methodNotAllowed_specification_compliance() throws Exception {
        // When & Then - API ëª…ì„¸???°ë¼ ?ˆìš©?˜ì? ?ŠëŠ” HTTP ë©”ì„œ???¬ìš© ??405 Method Not Allowed ë°˜í™˜
        mockMvc.perform(put("/api/v1/users") // PUT?€ ëª…ì„¸???†ìŒ, GETë§??ˆì„ ê²½ìš°
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isMethodNotAllowed()) // ëª…ì„¸???°ë¼ 405 Method Not Allowed ë°˜í™˜
                .andExpect(content().contentType(MediaType.APPLICATION_JSON));
    }

    @Test
    @DisplayName("API ëª…ì„¸???°ë¥¸ ?˜ì´ì§??Œë¼ë¯¸í„° ?¬ìš© ?•ì¸")
    void pagingParameters_specification_compliance() throws Exception {
        // When & Then - API ëª…ì„¸???°ë¼ ?˜ì´ì§??Œë¼ë¯¸í„°ë¥??¬ìš©?˜ëŠ” ?”ë“œ?¬ì¸???ŒìŠ¤??
        mockMvc.perform(get("/api/v1/users?page=0&size=10&sort=userId,asc")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk()) // ëª…ì„¸???°ë¼ 200 OK ë°˜í™˜
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").exists())
                .andExpect(jsonPath("$.data.content").isArray());
    }

    @Test
    @DisplayName("API ëª…ì„¸???°ë¥¸ ì¿¼ë¦¬ ?Œë¼ë¯¸í„° ?¬ìš© ?•ì¸")
    void queryParameters_specification_compliance() throws Exception {
        // When & Then - API ëª…ì„¸???°ë¼ ì¿¼ë¦¬ ?Œë¼ë¯¸í„°ë¥??¬ìš©?˜ëŠ” ?”ë“œ?¬ì¸???ŒìŠ¤??
        mockMvc.perform(get("/api/v1/users/search?searchType=name&searchKeyword=test")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk()) // ëª…ì„¸???°ë¼ 200 OK ë°˜í™˜
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("API ëª…ì„¸???°ë¥¸ ?”ì²­ ?¤ë” ?”êµ¬?¬í•­ ?•ì¸")
    void requiredHeaders_specification_compliance() throws Exception {
        // When & Then - API ëª…ì„¸???°ë¼ ?¹ì • ?¤ë”ê°€ ?„ìš”???”ë“œ?¬ì¸???ŒìŠ¤??
        mockMvc.perform(post("/api/v1/users/signup")
                .header("Content-Type", "application/json") // ëª…ì„¸???°ë¼ Content-Type ?¤ë” ?„ìš”
                .content("""
                        {
                            "userId": "headerTestUser",
                            "password": "Password123!",
                            "userNm": "?¤ë” ?ŒìŠ¤???¬ìš©??
                        }
                        """))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON));
    }

    @Test
    @DisplayName("API ëª…ì„¸???°ë¥¸ ?‘ë‹µ êµ¬ì¡° ?•ì¸")
    void responseStructure_specification_compliance() throws Exception {
        // When & Then - API ëª…ì„¸???°ë¼ ?‘ë‹µ êµ¬ì¡°ê°€ ?¼ì¹˜?˜ëŠ”ì§€ ?•ì¸
        mockMvc.perform(get("/api/v1/users/testUser")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success").exists()) // ëª…ì„¸???°ë¼ success ?„ë“œ ì¡´ì¬
                .andExpect(jsonPath("$.data").exists()) // ëª…ì„¸???°ë¼ data ?„ë“œ ì¡´ì¬
                .andExpect(jsonPath("$.error").doesNotExist()); // ëª…ì„¸???°ë¼ error ?„ë“œ???±ê³µ ???†ìŒ
    }

    @Test
    @DisplayName("API ëª…ì„¸???°ë¥¸ ?¤ë¥˜ ?‘ë‹µ êµ¬ì¡° ?•ì¸")
    void errorResponseStructure_specification_compliance() throws Exception {
        // Given
        String invalidRequest = """
                {
                    "userId": "a",  // Too short
                    "password": "123",  // Doesn't meet requirements
                    "userNm": ""
                }
                """;

        // When & Then - API ëª…ì„¸???°ë¼ ?¤ë¥˜ ?‘ë‹µ êµ¬ì¡°ê°€ ?¼ì¹˜?˜ëŠ”ì§€ ?•ì¸
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalidRequest))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success").value(false)) // ëª…ì„¸???°ë¼ success??false
                .andExpect(jsonPath("$.data").value(null)) // ëª…ì„¸???°ë¼ data??null
                .andExpect(jsonPath("$.error").exists()); // ëª…ì„¸???°ë¼ error ?„ë“œ ì¡´ì¬
    }

    @Test
    @DisplayName("API ëª…ì„¸???°ë¥¸ ?”ì²­ ë³¸ë¬¸ ?¬ê¸° ?œí•œ ?•ì¸")
    void requestSizeLimit_specification_compliance() throws Exception {
        // Given
        String largeRequest = """
                {
                    "userId": "largeRequestUser",
                    "password": "Password123!",
                    "userNm": "%s"
                }
                """.formatted("A".repeat(10000)); // Large string exceeding limits

        // When & Then - API ëª…ì„¸???°ë¼ ?”ì²­ ë³¸ë¬¸ ?¬ê¸° ?œí•œ???ˆëŠ” ê²½ìš°
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(largeRequest))
                .andExpect(status().isPayloadTooLarge()); // ëª…ì„¸???°ë¼ 413 Payload Too Large ?ëŠ” 400
    }

    @Test
    @DisplayName("API ëª…ì„¸???°ë¥¸ ì§€?ë˜??ë¯¸ë””???€???•ì¸")
    void supportedMediaTypes_specification_compliance() throws Exception {
        // When & Then - API ëª…ì„¸???°ë¼ ì§€?ë˜??ë¯¸ë””???€???•ì¸
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON) // ëª…ì„¸???°ë¼ JSON ì§€??
                .content("""
                        {
                            "userId": "mediaTypeUser",
                            "password": "Password123!",
                            "userNm": "ë¯¸ë””???€???ŒìŠ¤???¬ìš©??
                        }
                        """))
                .andExpect(status().isOk());

        // When & Then - ëª…ì„¸???°ë¼ ì§€?ë˜ì§€ ?ŠëŠ” ë¯¸ë””???€?…ì? ê±°ë??˜ì–´????
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.TEXT_PLAIN) // ëª…ì„¸???°ë¼ ì§€?ë˜ì§€ ?ŠëŠ” ?€??
                .content("plain text"))
                .andExpect(status().isUnsupportedMediaType());
    }

    @Test
    @DisplayName("API ëª…ì„¸???°ë¥¸ URL ê²½ë¡œ ?¨í„´ ?•ì¸")
    void urlPathPattern_specification_compliance() throws Exception {
        // When & Then - API ëª…ì„¸???°ë¼ ?•ì˜??URL ?¨í„´?´ì–´????
        mockMvc.perform(get("/api/v1/users/valid-user_123") // Valid pattern according to spec
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        // Additional path pattern tests would go here based on specific API specs
    }

    @Test
    @DisplayName("API ëª…ì„¸???°ë¥¸ ?¸ì¦ ? í° ?¬ìš© ?•ì¸")
    void authTokenUsage_specification_compliance() throws Exception {
        // When & Then - API ëª…ì„¸???°ë¼ ?¸ì¦???„ìš”???”ë“œ?¬ì¸?¸ì— ? í° ?¬í•¨ ?”ì²­
        mockMvc.perform(get("/api/v1/users/my-info")
                .header("Authorization", "Bearer valid-token") // ëª…ì„¸???°ë¼ Bearer ? í° ?¬ìš©
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON));
    }
}
