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
 * API 嶺뚮ㅏ援욆땻??사용자 사용자
 * OpenAPI 嶺뚮ㅏ援욆땻?사용자롫짗?API
 */
@SpringBootTest
@AutoConfigureWebMvc
@ActiveProfiles("test")
class ApiSpecificationComplianceTest {

  @Autowired
  private MockMvc mockMvc;

  @Test
  @DisplayName("API 嶺뚮ㅏ援욆땻?테스트사용자가입?검증 성공)")
  void userSignup_specification_compliance() throws Exception {
    // Given
    String validUserSignupRequest = """
        {
          "userId": "testUser123",
          "password": "Password123!",
          "userNm": "사용자",
          "passwordHint": "password hint",
          "passwordCnsr": "password answer",
          "role": "USER"
        }
        """;

    // When & Then - API 嶺뚮ㅏ援욆땻?테스트POST /api/v1/users/signup 필드 검증 성공
    mockMvc.perform(post("/api/v1/users/signup")
        .contentType(MediaType.APPLICATION_JSON)
        .content(validUserSignupRequest))
        .andExpect(status().isOk()) // 嶺뚮ㅏ援욆땻?테스트200 OK 결과
        .andExpect(content().contentType(MediaType.APPLICATION_JSON));
  }

  @Test
  @DisplayName("API 嶺뚮ㅏ援욆땻?테스트사용자嶺뚮ㅄ維뽨빳??브퀗????검증 성공)")
  void userGetList_specification_compliance() throws Exception {
    // When & Then - API 嶺뚮ㅏ援욆땻?테스트GET /api/v1/users 필드 검증 성공
    mockMvc.perform(get("/api/v1/users")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk()) // 嶺뚮ㅏ援욆땻?테스트200 OK 결과
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data").isArray()); // 嶺뚮ㅏ援욆땻?테스트 배열 형태 검증
  }

  @Test
  @DisplayName("API 嶺뚮ㅏ援욆땻?테스트사용자브퀗????검증 성공)")
  void userGetById_specification_compliance() throws Exception {
    // When & Then - API 嶺뚮ㅏ援욆땻?테스트GET /api/v1/users/{id
          // } 필드 검증 성공
    mockMvc.perform(get("/api/v1/users/testUser")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk()) // 嶺뚮ㅏ援욆땻?테스트200 OK 결과
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data").exists()); // 嶺뚮ㅏ援욆땻?테스트단일 객체 결과
  }

  @Test
  @DisplayName("API 嶺뚮ㅏ援욆땻?테스트 잘못된 요청 400 결과)")
  void invalidRequest_specification_compliance() throws Exception {
    // Given
    String invalidRequest = """
        {
          "userId": "",
          "password": "short",
          "userNm": ""
        }
        """; // Invalid request according to API spec"

    // When & Then - API 嶺뚮ㅏ援욆땻?테스트 잘못된 요청 400 Bad Request 결과
    mockMvc.perform(post("/api/v1/users/signup")
        .contentType(MediaType.APPLICATION_JSON)
        .content(invalidRequest))
        .andExpect(status().isBadRequest()) // 嶺뚮ㅏ援욆땻?테스트400 Bad Request 결과
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.success").value(false));
  }

  @Test
  @DisplayName("API 嶺뚮ㅏ援욆땻?테스트 醫롫윪凉사용자 醫롫윥獄사용자인증없이 401)")
  void unauthorizedAccess_specification_compliance() throws Exception {
    // When & Then - API 嶺뚮ㅏ援욆땻?테스트 醫롫윪凉?사용자롫윥獄사용자醫롫윪??성공 401 Unauthorized 결과
    mockMvc.perform(get("/api/v1/admin/users")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isUnauthorized()) // 嶺뚮ㅏ援욆땻?테스트401 Unauthorized 결과
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.success").value(false));
  }

  @Test
  @DisplayName("API 嶺뚮ㅏ援욆땻?테스트 브퀡????존재하지 않는 사용자 404)")
  void notFoundResource_specification_compliance() throws Exception {
    // When & Then - API 嶺뚮ㅏ援욆땻?테스트 브퀡????찾을 수 없는 사용자 404 Not Found 결과
    mockMvc.perform(get("/api/v1/users/nonexistentUser")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isNotFound()) // 嶺뚮ㅏ援욆땻?테스트404 Not Found 결과
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.success").value(false));
  }

  @Test
  @DisplayName("API 嶺뚮ㅏ援욆땻?테스트HTTP 嶺뚮∥?꾥땻??HTTP 메서드 불허 405)")
  void methodNotAllowed_specification_compliance() throws Exception {
    // When & Then - API 嶺뚮ㅏ援욆땻?테스트HTTP 嶺뚮∥?꾥땻?사용자 405 Method Not Allowed 결과
    mockMvc.perform(put("/api/v1/users") // PUT???嶺뚮ㅏ援욆땻? GET?사용자롪퍔???
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isMethodNotAllowed()) // 嶺뚮ㅏ援욆땻?테스트405 Method Not Allowed 결과
        .andExpect(content().contentType(MediaType.APPLICATION_JSON));
  }

  @Test
  @DisplayName("API 嶺뚮ㅏ援욆땻?테스트 페이지 조회 타입 확인)")
  void pagingParameters_specification_compliance() throws Exception {
    // When & Then - API 嶺뚮ㅏ援욆땻?테스트 페이지 목록조회 필드
    mockMvc.perform(get("/api/v1/users?page=0&size=10&sort=userId,asc")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk()) // 嶺뚮ㅏ援욆땻?테스트200 OK 결과
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data").exists())
        .andExpect(jsonPath("$.data.content").isArray());
  }

  @Test
  @DisplayName("API 嶺뚮ㅏ援욆땻?테스트 검색 결과 타입 확인)")
  void queryParameters_specification_compliance() throws Exception {
    // When & Then - API 嶺뚮ㅏ援욆땻?테스트 검색 쿼리 필드
    mockMvc.perform(get("/api/v1/users/search?searchType=name&searchKeyword=test")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk()) // 嶺뚮ㅏ援욆땻?테스트200 OK 결과
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.success").value(true));
  }

  @Test
  @DisplayName("API 嶺뚮ㅏ援욆땻?테스트사용자 Content-Type 올바른 사용)")
  void requiredHeaders_specification_compliance() throws Exception {
    // When & Then - API 嶺뚮ㅏ援욆땻?테스트사용자 Content-Type 검증
    mockMvc.perform(post("/api/v1/users/signup")
        .header("Content-Type", "application/json") // 嶺뚮ㅏ援욆땻?테스트Content-Type 타입 확인
        .content("""
            {
              "userId": "headerTestUser",
              "password": "Password123!",
              "userNm": "테스트사용자"
            }
            """))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON));
  }

  @Test
  @DisplayName("API 嶺뚮ㅏ援욆땻?테스트 응답 형식 검증 검증)")
  void responseStructure_specification_compliance() throws Exception {
    // When & Then - API 嶺뚮ㅏ援욆땻?테스트 응답 형식 검증  회원
    mockMvc.perform(get("/api/v1/users/testUser")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.success").exists()) // 嶺뚮ㅏ援욆땻?테스트success 필드 확인
        .andExpect(jsonPath("$.data").exists()) // 嶺뚮ㅏ援욆땻?테스트data 필드 확인
        .andExpect(jsonPath("$.error").doesNotExist()); // 嶺뚮ㅏ援욆땻?테스트error 필드 존재 성공
  }

  @Test
  @DisplayName("API 嶺뚮ㅏ援욆땻?테스트 실패 응답 형식 검증 검증)")
  void errorResponseStructure_specification_compliance() throws Exception {
    // Given
    String invalidRequest = """
        {
          "userId": "a", // Too short
          "password": "123", // Doesn't meet requirements
          "userNm": ""
        }
        """;

    // When & Then - API 嶺뚮ㅏ援욆땻?테스트 실패 응답 형식 검증 확인
    mockMvc.perform(post("/api/v1/users/signup")
        .contentType(MediaType.APPLICATION_JSON)
        .content(invalidRequest))
        .andExpect(status().isBadRequest())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.success").value(false)) // 嶺뚮ㅏ援욆땻?테스트success??false
        .andExpect(jsonPath("$.data").value(null)) // 嶺뚮ㅏ援욆땻?테스트data??null
        .andExpect(jsonPath("$.error").exists()); // 嶺뚮ㅏ援욆땻?테스트error 필드 확인
  }

  @Test
  @DisplayName("API 嶺뚮ㅏ援욆땻?테스트사용자곌랜梨뜻룇 성공 이후 )")
  void requestSizeLimit_specification_compliance() throws Exception {
    // Given
    String largeRequest = """
        {
          "userId": "largeRequestUser",
          "password": "Password123!",
          "userNm": "%s"
        }
        """.formatted("A".repeat(10000)); // Large string exceeding limits"

    // When & Then - API 嶺뚮ㅏ援욆땻?테스트사용자곌랜梨뜻룇 성공 이후 이전 경로
    mockMvc.perform(post("/api/v1/users/signup")
        .contentType(MediaType.APPLICATION_JSON)
        .content(largeRequest))
        .andExpect(status().isPayloadTooLarge()); // 嶺뚮ㅏ援욆땻?테스트413 Payload Too Large 테스트400
  }

  @Test
  @DisplayName("API 嶺뚮ㅏ援욆땻?테스트嶺뚯솘테스트 亦껋꼶梨띌??????)")
  void supportedMediaTypes_specification_compliance() throws Exception {
    // When & Then - API 嶺뚮ㅏ援욆땻?테스트嶺뚯솘테스트 亦껋꼶梨띌?????
    mockMvc.perform(post("/api/v1/users/signup")
        .contentType(MediaType.APPLICATION_JSON) // 嶺뚮ㅏ援욆땻?테스트JSON 嶺뚯솘???
        .content("""
            {
              "userId": "mediaTypeUser",
              "password": "Password123!",
              "userNm": "亦껋꼶梨띌?????사용자"
            }
            """))
        .andExpect(status().isOk());

    // When & Then - 嶺뚮ㅏ援욆땻?테스트嶺뚯솘테스트깅툦彛? 테스트亦껋꼶梨띌?????? 濾곌쑨??
    mockMvc.perform(post("/api/v1/users/signup")
        .contentType(MediaType.TEXT_PLAIN) // 嶺뚮ㅏ援욆땻?테스트嶺뚯솘테스트깅툦彛? 테스트 ?
        .content("plain text"))
        .andExpect(status().isUnsupportedMediaType());
  }

  @Test
  @DisplayName("API 嶺뚮ㅏ援욆땻?테스트URL 패턴 불일치 404)")
  void urlPathPattern_specification_compliance() throws Exception {
    // When & Then - API 嶺뚮ㅏ援욆땻?테스트잘못된 URL 처리
    mockMvc.perform(get("/api/v1/users/valid-user_123") // Valid pattern according to spec
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk());

    // Additional path pattern tests would go here based on specific API specs
  }

  @Test
  @DisplayName("API 嶺뚮ㅏ援욆땻?테스트 醫롫윪凉?토큰 타입 검증)")
  void authTokenUsage_specification_compliance() throws Exception {
    // When & Then - API 嶺뚮ㅏ援욆땻?테스트 醫롫윪凉??인증 토큰 타입 검증
    mockMvc.perform(get("/api/v1/users/my-info")
        .header("Authorization", "Bearer valid-token") // 嶺뚮ㅏ援욆땻?테스트Bearer Bearer 토큰
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON));
  }
}
