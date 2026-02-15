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
 * API 명세와 실제 동작 간 일치성 테스트
 * OpenAPI 명세에 정의된 대로 실제 API가 동작하는지 확인
 */
@SpringBootTest
@AutoConfigureWebMvc
@ActiveProfiles("test")
class ApiSpecificationComplianceTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("API 명세에 따른 사용자 등록 엔드포인트 동작 확인")
    void userSignup_specification_compliance() throws Exception {
        // Given
        String validUserSignupRequest = """
                {
                    "userId": "testUser123",
                    "password": "Password123!",
                    "userNm": "테스트 사용자",
                    "passwordHint": "password hint",
                    "passwordCnsr": "password answer",
                    "role": "USER"
                }
                """;

        // When & Then - API 명세에 따라 POST /api/v1/users/signup 엔드포인트가 동작해야 함
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(validUserSignupRequest))
                .andExpect(status().isOk()) // 명세에 따라 200 OK 반환
                .andExpect(content().contentType(MediaType.APPLICATION_JSON));
    }

    @Test
    @DisplayName("API 명세에 따른 사용자 목록 조회 엔드포인트 동작 확인")
    void userGetList_specification_compliance() throws Exception {
        // When & Then - API 명세에 따라 GET /api/v1/users 엔드포인트가 동작해야 함
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk()) // 명세에 따라 200 OK 반환
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray()); // 명세에 따라 배열 형태의 데이터 반환
    }

    @Test
    @DisplayName("API 명세에 따른 사용자 단일 조회 엔드포인트 동작 확인")
    void userGetById_specification_compliance() throws Exception {
        // When & Then - API 명세에 따라 GET /api/v1/users/{id} 엔드포인트가 동작해야 함
        mockMvc.perform(get("/api/v1/users/testUser")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk()) // 명세에 따라 200 OK 반환
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").exists()); // 명세에 따라 단일 객체 형태의 데이터 반환
    }

    @Test
    @DisplayName("API 명세에 따른 잘못된 요청 시 400 반환 확인")
    void invalidRequest_specification_compliance() throws Exception {
        // Given
        String invalidRequest = """
                {
                    "userId": "",
                    "password": "short",
                    "userNm": ""
                }
                """; // Invalid request according to API spec

        // When & Then - API 명세에 따라 잘못된 요청 시 400 Bad Request 반환
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalidRequest))
                .andExpect(status().isBadRequest()) // 명세에 따라 400 Bad Request 반환
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("API 명세에 따른 인증 필요 엔드포인트 접근 시 401 반환 확인")
    void unauthorizedAccess_specification_compliance() throws Exception {
        // When & Then - API 명세에 따라 인증이 필요한 엔드포인트에 접근 시 401 Unauthorized 반환
        mockMvc.perform(get("/api/v1/admin/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized()) // 명세에 따라 401 Unauthorized 반환
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("API 명세에 따른 존재하지 않는 리소스 요청 시 404 반환 확인")
    void notFoundResource_specification_compliance() throws Exception {
        // When & Then - API 명세에 따라 존재하지 않는 리소스 요청 시 404 Not Found 반환
        mockMvc.perform(get("/api/v1/users/nonexistentUser")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound()) // 명세에 따라 404 Not Found 반환
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("API 명세에 따른 HTTP 메서드 불일치 시 405 반환 확인")
    void methodNotAllowed_specification_compliance() throws Exception {
        // When & Then - API 명세에 따라 허용되지 않는 HTTP 메서드 사용 시 405 Method Not Allowed 반환
        mockMvc.perform(put("/api/v1/users") // PUT은 명세에 없음, GET만 있을 경우
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isMethodNotAllowed()) // 명세에 따라 405 Method Not Allowed 반환
                .andExpect(content().contentType(MediaType.APPLICATION_JSON));
    }

    @Test
    @DisplayName("API 명세에 따른 페이징 파라미터 사용 확인")
    void pagingParameters_specification_compliance() throws Exception {
        // When & Then - API 명세에 따라 페이징 파라미터를 사용하는 엔드포인트 테스트
        mockMvc.perform(get("/api/v1/users?page=0&size=10&sort=userId,asc")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk()) // 명세에 따라 200 OK 반환
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").exists())
                .andExpect(jsonPath("$.data.content").isArray());
    }

    @Test
    @DisplayName("API 명세에 따른 쿼리 파라미터 사용 확인")
    void queryParameters_specification_compliance() throws Exception {
        // When & Then - API 명세에 따라 쿼리 파라미터를 사용하는 엔드포인트 테스트
        mockMvc.perform(get("/api/v1/users/search?searchType=name&searchKeyword=test")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk()) // 명세에 따라 200 OK 반환
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("API 명세에 따른 요청 헤더 요구사항 확인")
    void requiredHeaders_specification_compliance() throws Exception {
        // When & Then - API 명세에 따라 특정 헤더가 필요한 엔드포인트 테스트
        mockMvc.perform(post("/api/v1/users/signup")
                .header("Content-Type", "application/json") // 명세에 따라 Content-Type 헤더 필요
                .content("""
                        {
                            "userId": "headerTestUser",
                            "password": "Password123!",
                            "userNm": "헤더 테스트 사용자"
                        }
                        """))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON));
    }

    @Test
    @DisplayName("API 명세에 따른 응답 구조 확인")
    void responseStructure_specification_compliance() throws Exception {
        // When & Then - API 명세에 따라 응답 구조가 일치하는지 확인
        mockMvc.perform(get("/api/v1/users/testUser")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success").exists()) // 명세에 따라 success 필드 존재
                .andExpect(jsonPath("$.data").exists()) // 명세에 따라 data 필드 존재
                .andExpect(jsonPath("$.error").doesNotExist()); // 명세에 따라 error 필드는 성공 시 없음
    }

    @Test
    @DisplayName("API 명세에 따른 오류 응답 구조 확인")
    void errorResponseStructure_specification_compliance() throws Exception {
        // Given
        String invalidRequest = """
                {
                    "userId": "a",  // Too short
                    "password": "123",  // Doesn't meet requirements
                    "userNm": ""
                }
                """;

        // When & Then - API 명세에 따라 오류 응답 구조가 일치하는지 확인
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalidRequest))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success").value(false)) // 명세에 따라 success는 false
                .andExpect(jsonPath("$.data").value(null)) // 명세에 따라 data는 null
                .andExpect(jsonPath("$.error").exists()); // 명세에 따라 error 필드 존재
    }

    @Test
    @DisplayName("API 명세에 따른 요청 본문 크기 제한 확인")
    void requestSizeLimit_specification_compliance() throws Exception {
        // Given
        String largeRequest = """
                {
                    "userId": "largeRequestUser",
                    "password": "Password123!",
                    "userNm": "%s"
                }
                """.formatted("A".repeat(10000)); // Large string exceeding limits

        // When & Then - API 명세에 따라 요청 본문 크기 제한이 있는 경우
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(largeRequest))
                .andExpect(status().isPayloadTooLarge()); // 명세에 따라 413 Payload Too Large 또는 400
    }

    @Test
    @DisplayName("API 명세에 따른 지원되는 미디어 타입 확인")
    void supportedMediaTypes_specification_compliance() throws Exception {
        // When & Then - API 명세에 따라 지원되는 미디어 타입 확인
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON) // 명세에 따라 JSON 지원
                .content("""
                        {
                            "userId": "mediaTypeUser",
                            "password": "Password123!",
                            "userNm": "미디어 타입 테스트 사용자"
                        }
                        """))
                .andExpect(status().isOk());

        // When & Then - 명세에 따라 지원되지 않는 미디어 타입은 거부되어야 함
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.TEXT_PLAIN) // 명세에 따라 지원되지 않는 타입
                .content("plain text"))
                .andExpect(status().isUnsupportedMediaType());
    }

    @Test
    @DisplayName("API 명세에 따른 URL 경로 패턴 확인")
    void urlPathPattern_specification_compliance() throws Exception {
        // When & Then - API 명세에 따라 정의된 URL 패턴이어야 함
        mockMvc.perform(get("/api/v1/users/valid-user_123") // Valid pattern according to spec
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        // Additional path pattern tests would go here based on specific API specs
    }

    @Test
    @DisplayName("API 명세에 따른 인증 토큰 사용 확인")
    void authTokenUsage_specification_compliance() throws Exception {
        // When & Then - API 명세에 따라 인증이 필요한 엔드포인트에 토큰 포함 요청
        mockMvc.perform(get("/api/v1/users/my-info")
                .header("Authorization", "Bearer valid-token") // 명세에 따라 Bearer 토큰 사용
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON));
    }
}