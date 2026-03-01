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
 * API 명세?� ?�제 ?�작 �??�치???�스??
 * OpenAPI 명세???�의???��??�제 API가 ?�작?�는지 ?�인
 */
@SpringBootTest
@AutoConfigureWebMvc
@ActiveProfiles("test")
class ApiSpecificationComplianceTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("API 명세???�른 ?�용???�록 ?�드?�인???�작 ?�인")
    void userSignup_specification_compliance() throws Exception {
        // Given
        String validUserSignupRequest = """
                {
                    "userId": "testUser123",
                    "password": "Password123!",
                    "userNm": "?�스???�용??,
                    "passwordHint": "password hint",
                    "passwordCnsr": "password answer",
                    "role": "USER"
                }
                """;

        // When & Then - API 명세???�라 POST /api/v1/users/signup ?�드?�인?��? ?�작?�야 ??
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(validUserSignupRequest))
                .andExpect(status().isOk()) // 명세???�라 200 OK 반환
                .andExpect(content().contentType(MediaType.APPLICATION_JSON));
    }

    @Test
    @DisplayName("API 명세???�른 ?�용??목록 조회 ?�드?�인???�작 ?�인")
    void userGetList_specification_compliance() throws Exception {
        // When & Then - API 명세???�라 GET /api/v1/users ?�드?�인?��? ?�작?�야 ??
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk()) // 명세???�라 200 OK 반환
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray()); // 명세???�라 배열 ?�태???�이??반환
    }

    @Test
    @DisplayName("API 명세???�른 ?�용???�일 조회 ?�드?�인???�작 ?�인")
    void userGetById_specification_compliance() throws Exception {
        // When & Then - API 명세???�라 GET /api/v1/users/{id
                    } ?�드?�인?��? ?�작?�야 ??
        mockMvc.perform(get("/api/v1/users/testUser")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk()) // 명세???�라 200 OK 반환
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").exists()); // 명세???�라 ?�일 객체 ?�태???�이??반환
    }

    @Test
    @DisplayName("API 명세???�른 ?�못???�청 ??400 반환 ?�인")
    void invalidRequest_specification_compliance() throws Exception {
        // Given
        String invalidRequest = """
                {
                    "userId": "",
                    "password": "short",
                    "userNm": ""
                }
                """; // Invalid request according to API spec

        // When & Then - API 명세???�라 ?�못???�청 ??400 Bad Request 반환
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalidRequest))
                .andExpect(status().isBadRequest()) // 명세???�라 400 Bad Request 반환
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("API 명세???�른 ?�증 ?�요 ?�드?�인???�근 ??401 반환 ?�인")
    void unauthorizedAccess_specification_compliance() throws Exception {
        // When & Then - API 명세???�라 ?�증???�요???�드?�인?�에 ?�근 ??401 Unauthorized 반환
        mockMvc.perform(get("/api/v1/admin/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized()) // 명세???�라 401 Unauthorized 반환
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("API 명세???�른 존재?��? ?�는 리소???�청 ??404 반환 ?�인")
    void notFoundResource_specification_compliance() throws Exception {
        // When & Then - API 명세???�라 존재?��? ?�는 리소???�청 ??404 Not Found 반환
        mockMvc.perform(get("/api/v1/users/nonexistentUser")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound()) // 명세???�라 404 Not Found 반환
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("API 명세???�른 HTTP 메서??불일�???405 반환 ?�인")
    void methodNotAllowed_specification_compliance() throws Exception {
        // When & Then - API 명세???�라 ?�용?��? ?�는 HTTP 메서???�용 ??405 Method Not Allowed 반환
        mockMvc.perform(put("/api/v1/users") // PUT?� 명세???�음, GET�??�을 경우
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isMethodNotAllowed()) // 명세???�라 405 Method Not Allowed 반환
                .andExpect(content().contentType(MediaType.APPLICATION_JSON));
    }

    @Test
    @DisplayName("API 명세???�른 ?�이�??�라미터 ?�용 ?�인")
    void pagingParameters_specification_compliance() throws Exception {
        // When & Then - API 명세???�라 ?�이�??�라미터�??�용?�는 ?�드?�인???�스??
        mockMvc.perform(get("/api/v1/users?page=0&size=10&sort=userId,asc")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk()) // 명세???�라 200 OK 반환
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").exists())
                .andExpect(jsonPath("$.data.content").isArray());
    }

    @Test
    @DisplayName("API 명세???�른 쿼리 ?�라미터 ?�용 ?�인")
    void queryParameters_specification_compliance() throws Exception {
        // When & Then - API 명세???�라 쿼리 ?�라미터�??�용?�는 ?�드?�인???�스??
        mockMvc.perform(get("/api/v1/users/search?searchType=name&searchKeyword=test")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk()) // 명세???�라 200 OK 반환
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("API 명세???�른 ?�청 ?�더 ?�구?�항 ?�인")
    void requiredHeaders_specification_compliance() throws Exception {
        // When & Then - API 명세???�라 ?�정 ?�더가 ?�요???�드?�인???�스??
        mockMvc.perform(post("/api/v1/users/signup")
                .header("Content-Type", "application/json") // 명세???�라 Content-Type ?�더 ?�요
                .content("""
                        {
                            "userId": "headerTestUser",
                            "password": "Password123!",
                            "userNm": "?�더 ?�스???�용??
                        }
                        """))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON));
    }

    @Test
    @DisplayName("API 명세???�른 ?�답 구조 ?�인")
    void responseStructure_specification_compliance() throws Exception {
        // When & Then - API 명세???�라 ?�답 구조가 ?�치?�는지 ?�인
        mockMvc.perform(get("/api/v1/users/testUser")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success").exists()) // 명세???�라 success ?�드 존재
                .andExpect(jsonPath("$.data").exists()) // 명세???�라 data ?�드 존재
                .andExpect(jsonPath("$.error").doesNotExist()); // 명세???�라 error ?�드???�공 ???�음
    }

    @Test
    @DisplayName("API 명세???�른 ?�류 ?�답 구조 ?�인")
    void errorResponseStructure_specification_compliance() throws Exception {
        // Given
        String invalidRequest = """
                {
                    "userId": "a",  // Too short
                    "password": "123",  // Doesn't meet requirements
                    "userNm": ""
                }
                """;

        // When & Then - API 명세???�라 ?�류 ?�답 구조가 ?�치?�는지 ?�인
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalidRequest))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success").value(false)) // 명세???�라 success??false
                .andExpect(jsonPath("$.data").value(null)) // 명세???�라 data??null
                .andExpect(jsonPath("$.error").exists()); // 명세???�라 error ?�드 존재
    }

    @Test
    @DisplayName("API 명세???�른 ?�청 본문 ?�기 ?�한 ?�인")
    void requestSizeLimit_specification_compliance() throws Exception {
        // Given
        String largeRequest = """
                {
                    "userId": "largeRequestUser",
                    "password": "Password123!",
                    "userNm": "%s"
                }
                """.formatted("A".repeat(10000)); // Large string exceeding limits

        // When & Then - API 명세???�라 ?�청 본문 ?�기 ?�한???�는 경우
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(largeRequest))
                .andExpect(status().isPayloadTooLarge()); // 명세???�라 413 Payload Too Large ?�는 400
    }

    @Test
    @DisplayName("API 명세???�른 지?�되??미디???�???�인")
    void supportedMediaTypes_specification_compliance() throws Exception {
        // When & Then - API 명세???�라 지?�되??미디???�???�인
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON) // 명세???�라 JSON 지??
                .content("""
                        {
                            "userId": "mediaTypeUser",
                            "password": "Password123!",
                            "userNm": "미디???�???�스???�용??
                        }
                        """))
                .andExpect(status().isOk());

        // When & Then - 명세???�라 지?�되지 ?�는 미디???�?��? 거�??�어????
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.TEXT_PLAIN) // 명세???�라 지?�되지 ?�는 ?�??
                .content("plain text"))
                .andExpect(status().isUnsupportedMediaType());
    }

    @Test
    @DisplayName("API 명세???�른 URL 경로 ?�턴 ?�인")
    void urlPathPattern_specification_compliance() throws Exception {
        // When & Then - API 명세???�라 ?�의??URL ?�턴?�어????
        mockMvc.perform(get("/api/v1/users/valid-user_123") // Valid pattern according to spec
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        // Additional path pattern tests would go here based on specific API specs
    }

    @Test
    @DisplayName("API 명세???�른 ?�증 ?�큰 ?�용 ?�인")
    void authTokenUsage_specification_compliance() throws Exception {
        // When & Then - API 명세???�라 ?�증???�요???�드?�인?�에 ?�큰 ?�함 ?�청
        mockMvc.perform(get("/api/v1/users/my-info")
                .header("Authorization", "Bearer valid-token") // 명세???�라 Bearer ?�큰 ?�용
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON));
    }
}
