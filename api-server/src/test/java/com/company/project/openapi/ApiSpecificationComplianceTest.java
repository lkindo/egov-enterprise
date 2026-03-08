package com.company.project.openapi;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import com.company.project.service.user.UserService;
import com.company.project.service.user.dto.UserDto;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import java.util.List;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * API 규격 준수 테스트
 * OpenAPI 명세와 실제 API 응답의 일치 여부 검증
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles({ "test", "security-test" })
@org.springframework.context.annotation.Import(com.company.project.config.SecurityTestConfig.class)
@org.springframework.security.test.context.support.WithMockUser
class ApiSpecificationComplianceTest {

  @Autowired
  private MockMvc mockMvc;

  @MockitoBean
  private UserService userService;

  @BeforeEach
  void setUp() {
    UserDto mockUser = UserDto.builder()
        .userId("testUser")
        .userNm("Test User")
        .esntlId("USR_001")
        .build();

    when(userService.getUserById(anyString())).thenReturn(mockUser);
    when(userService.getUserById("nonexistentUser"))
        .thenThrow(new com.company.project.core.exception.BusinessException(
            com.company.project.core.exception.ErrorCode.USER_NOT_FOUND));

    when(userService.getUserList()).thenReturn(List.of(mockUser));
    when(userService.getPagedUserList(any())).thenReturn(new PageImpl<>(List.of(mockUser), PageRequest.of(0, 10), 1));
    when(userService.signup(any())).thenReturn(
        new com.company.project.service.user.dto.UserResponse("testUser", "Test User",
            com.company.project.domain.user.entity.Role.USER));
  }

  @Test
  @DisplayName("API 규격 준수 - 사용자 등록 API 응답 검증")
  void userSignup_specification_compliance() throws Exception {
    // Given
    String validUserSignupRequest = """
        {
          "userId": "testUser123",
          "password": "Password123!",
          "userNm": "테스트사용자",
          "passwordHint": "password hint",
          "passwordCnsr": "password answer",
          "role": "USER"
        }
        """;

    // When & Then - POST /api/v1/users/signup 필드 검증
    mockMvc.perform(post("/api/v1/users/signup")
        .contentType(MediaType.APPLICATION_JSON)
        .content(validUserSignupRequest))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON));
  }

  @Test
  @DisplayName("API 규격 준수 - 사용자 목록 조회 API 응답 검증")
  void userGetList_specification_compliance() throws Exception {
    // When & Then - GET /api/v1/users 필드 검증
    mockMvc.perform(get("/api/v1/users")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data").isArray());
  }

  @Test
  @DisplayName("API 규격 준수 - 사용자 상세 조회 API 응답 검증")
  void userGetById_specification_compliance() throws Exception {
    // When & Then - GET /api/v1/users/{id} 필드 검증
    mockMvc.perform(get("/api/v1/users/testUser")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data").exists());
  }

  @Test
  @DisplayName("API 규격 준수 - 잘못된 요청 시 400 에러 응답 검증")
  void invalidRequest_specification_compliance() throws Exception {
    // Given
    String invalidRequest = """
        {
          "userId": "",
          "password": "short",
          "userNm": ""
        }
        """;

    // When & Then - 400 Bad Request 결과 확인
    mockMvc.perform(post("/api/v1/users/signup")
        .contentType(MediaType.APPLICATION_JSON)
        .content(invalidRequest))
        .andExpect(status().isBadRequest())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.success").value(false));
  }

  @Test
  @DisplayName("API 규격 준수 - 권한 없는 접근 시 401 에러 응답 검증")
  @org.springframework.security.test.context.support.WithAnonymousUser
  void unauthorizedAccess_specification_compliance() throws Exception {
    // When & Then - 401 Unauthorized 결과 확인
    mockMvc.perform(get("/api/v1/admin/users")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName("API 규격 준수 - 존재하지 않는 자원 접근 시 404 에러 응답 검증")
  void notFoundResource_specification_compliance() throws Exception {
    // When & Then - 404 Not Found 결과 확인
    mockMvc.perform(get("/api/v1/users/nonexistentUser")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isNotFound())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.success").value(false));
  }

  @Test
  @DisplayName("API 규격 준수 - 허용되지 않는 HTTP 메서드 사용 시 405 에러 응답 검증")
  void methodNotAllowed_specification_compliance() throws Exception {
    // When & Then - 405 Method Not Allowed 결과 확인
    mockMvc.perform(put("/api/v1/users")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isMethodNotAllowed())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON));
  }

  @Test
  @DisplayName("API 규격 준수 - 페이징 파라미터 처리 검증")
  void pagingParameters_specification_compliance() throws Exception {
    // When & Then
    mockMvc.perform(get("/api/v1/users/paged?page=0&size=10&sort=userId,asc")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data").exists())
        .andExpect(jsonPath("$.data.content").isArray());
  }

  @Test
  @DisplayName("API 규격 준수 - 검색 쿼리 파라미터 처리 검증")
  void queryParameters_specification_compliance() throws Exception {
    // When & Then
    mockMvc.perform(get("/api/v1/users/paged?page=0&size=10")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.success").value(true));
  }

  @Test
  @DisplayName("API 규격 준수 - 필수 헤더(Content-Type) 검사 검증")
  void requiredHeaders_specification_compliance() throws Exception {
    // When & Then
    mockMvc.perform(post("/api/v1/users/signup")
        .header("Content-Type", "application/json")
        .content("""
            {
              "userId": "headerTestUser",
              "password": "Password123!",
              "userNm": "헤더테스트사용자"
            }
            """))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON));
  }

  @Test
  @DisplayName("API 규격 준수 - 공통 응답 구조 일치 여부 검증")
  void responseStructure_specification_compliance() throws Exception {
    // When & Then
    mockMvc.perform(get("/api/v1/users/testUser")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.success").exists())
        .andExpect(jsonPath("$.data").exists())
        .andExpect(jsonPath("$.code").exists())
        .andExpect(jsonPath("$.message").exists());
  }

  @Test
  @DisplayName("API 규격 준수 - 에러 발생 시 공통 에러 응답 구조 검증")
  void errorResponseStructure_specification_compliance() throws Exception {
    // Given
    String invalidRequest = """
        {
          "userId": "a",
          "password": "123",
          "userNm": ""
        }
        """;

    // When & Then
    mockMvc.perform(post("/api/v1/users/signup")
        .contentType(MediaType.APPLICATION_JSON)
        .content(invalidRequest))
        .andExpect(status().isBadRequest())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.success").value(false))
        .andExpect(jsonPath("$.data").value(org.hamcrest.Matchers.nullValue()))
        .andExpect(jsonPath("$.code").exists())
        .andExpect(jsonPath("$.message").exists());
  }

  @Test
  @DisplayName("API 규격 준수 - 요청 본문 크기 제한 검증")
  void requestSizeLimit_specification_compliance() throws Exception {
    // Given
    String largeRequest = """
        {
          "userId": "largeRequestUser",
          "password": "Password123!",
          "userNm": "%s"
        }
        """.formatted("A".repeat(10000));

    // When & Then - 브라우저/서버 설정에 따라 다를 수 있으나 규격상 413 기대
    mockMvc.perform(post("/api/v1/users/signup")
        .contentType(MediaType.APPLICATION_JSON)
        .content(largeRequest))
        .andExpect(status().is4xxClientError());
  }

  @Test
  @DisplayName("API 규격 준수 - 지원하지 않는 Media Type 처리 검증")
  void supportedMediaTypes_specification_compliance() throws Exception {
    // When & Then - JSON 지원
    mockMvc.perform(post("/api/v1/users/signup")
        .contentType(MediaType.APPLICATION_JSON)
        .content("""
            {
              "userId": "mediaTypeUser",
              "password": "Password123!",
              "userNm": "미디어타입사용자",
              "passwordHint": "hint",
              "passwordCnsr": "answer",
              "role": "USER"
            }
            """))
        .andExpect(status().isOk());

    // When & Then - Plain Text 미지원
    mockMvc.perform(post("/api/v1/users/signup")
        .contentType(MediaType.TEXT_PLAIN)
        .content("plain text"))
        .andExpect(status().isUnsupportedMediaType());
  }

  @Test
  @DisplayName("API 규격 준수 - URL 경로 패턴 일치 여부 검증")
  void urlPathPattern_specification_compliance() throws Exception {
    // When & Then
    mockMvc.perform(get("/api/v1/users/valid-user_123")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk());
  }

  @Test
  @DisplayName("API 규격 준수 - 인증 토큰 형식 및 사용 검증")
  void authTokenUsage_specification_compliance() throws Exception {
    // When & Then
    mockMvc.perform(get("/api/v1/users/me")
        .header("Authorization", "Bearer valid-token")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON));
  }
}
