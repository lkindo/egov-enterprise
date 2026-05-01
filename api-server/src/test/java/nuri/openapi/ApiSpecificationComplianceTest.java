package nuri.openapi;

import nuri.api.controller.UserApiController;
import nuri.api.interceptor.OperationalAuditInterceptor;
import nuri.foundation.core.exception.GlobalExceptionHandler;
import nuri.foundation.service.user.UserService;
import nuri.foundation.service.user.dto.UserDto;
import nuri.foundation.service.user.dto.UserResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
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
    when(userService.signup(any())).thenReturn(new UserResponse("testUser", "Test User", "USER"));


    mockMvc = MockMvcBuilders.standaloneSetup(new UserApiController(userService))
        .addInterceptors(operationalAuditInterceptor)
        .setControllerAdvice(new GlobalExceptionHandler())
        .build();
  }

  @Test
  @DisplayName("API 규격 준수 - 사용자 등록 API 응답 및 구조 검증")
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
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.success").value(true))
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
