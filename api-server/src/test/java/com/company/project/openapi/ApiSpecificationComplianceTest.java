package com.company.project.openapi;

import com.company.project.api.controller.UserApiController;
import com.company.project.api.interceptor.OperationalAuditInterceptor;
import com.company.project.core.exception.GlobalExceptionHandler;
import com.company.project.service.user.UserService;
import com.company.project.service.user.dto.UserDto;
import com.company.project.service.user.dto.UserResponse;
import com.company.project.domain.user.entity.Role;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.util.List;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * API 규격 준수 테스트 (Standalone)
 */
class ApiSpecificationComplianceTest {

  private MockMvc mockMvc;
  private UserService userService;
  private OperationalAuditInterceptor operationalAuditInterceptor;

  @BeforeEach
  void setUp() throws Exception {
    userService = mock(UserService.class);
    operationalAuditInterceptor = mock(OperationalAuditInterceptor.class);
    when(operationalAuditInterceptor.preHandle(any(), any(), any())).thenReturn(true);

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
    when(userService.signup(any())).thenReturn(new UserResponse("testUser", "Test User", Role.USER));

    mockMvc = MockMvcBuilders.standaloneSetup(new UserApiController(userService))
        .addInterceptors(operationalAuditInterceptor)
        .setControllerAdvice(new GlobalExceptionHandler())
        .build();
  }

  @Test
  @DisplayName("API 규격 준수 - 사용자 등록 API 응답 검증")
  void userSignup_specification_compliance() throws Exception {
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

    mockMvc.perform(post("/api/v1/users/signup")
        .contentType(MediaType.APPLICATION_JSON)
        .content(validUserSignupRequest))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON));
  }

  @Test
  @DisplayName("API 규격 준수 - 사용자 목록 조회 API 응답 검증")
  void userGetList_specification_compliance() throws Exception {
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
    String invalidRequest = """
        {
          "userId": "",
          "password": "short",
          "userNm": ""
        }
        """;

    mockMvc.perform(post("/api/v1/users/signup")
        .contentType(MediaType.APPLICATION_JSON)
        .content(invalidRequest))
        .andExpect(status().isBadRequest())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.success").value(false));
  }

  @Test
  @DisplayName("API 규격 준수 - 존재하지 않는 자원 접근 시 404 에러 응답 검증")
  void notFoundResource_specification_compliance() throws Exception {
    mockMvc.perform(get("/api/v1/users/nonexistentUser")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isNotFound())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.success").value(false));
  }

  @Test
  @DisplayName("API 규격 준수 - 페이징 파라미터 처리 검증")
  void pagingParameters_specification_compliance() throws Exception {
    mockMvc.perform(get("/api/v1/users/paged?page=0&size=10&sort=userId,asc")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data").exists())
        .andExpect(jsonPath("$.data.list").isArray());
  }

  @Test
  @DisplayName("API 규격 준수 - 공통 응답 구조 일치 여부 검증")
  void responseStructure_specification_compliance() throws Exception {
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
    String invalidRequest = """
        {
          "userId": "a",
          "password": "123",
          "userNm": ""
        }
        """;

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
  @DisplayName("API 규격 준수 - 지원하지 않는 Media Type 처리 검증")
  void supportedMediaTypes_specification_compliance() throws Exception {
    mockMvc.perform(post("/api/v1/users/signup")
        .contentType(MediaType.TEXT_PLAIN)
        .content("plain text"))
        .andExpect(status().isUnsupportedMediaType());
  }
}
