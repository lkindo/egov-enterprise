package com.company.project.foundation.core.exception;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import java.lang.reflect.Method;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class GlobalExceptionHandlerTest {

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new TestController())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @RestController
    static class TestController {
        @GetMapping("/test/business-exception")
        public void throwBusinessException() {
            throw new BusinessException(ErrorCode.ENTITY_NOT_FOUND);
        }

        @GetMapping("/test/runtime-exception")
        public void throwRuntimeException() {
            throw new RuntimeException("Unexpected error");
        }

        @GetMapping("/test/illegal-argument")
        public void throwIllegalArgumentException() {
            throw new IllegalArgumentException("Invalid argument");
        }

        @GetMapping("/test/access-denied")
        public void throwAccessDenied() {
            throw new AccessDeniedException("Access Denied");
        }

        @GetMapping("/test/auth-exception")
        public void throwAuthException() {
            throw new BadCredentialsException("Invalid credentials");
        }

        @GetMapping("/test/optimistic-lock")
        public void throwOptimisticLock() {
            throw new OptimisticLockingFailureException("Locked");
        }

        @PostMapping("/test/validation")
        public void throwValidation() throws Exception {
            BindingResult bindingResult = new BeanPropertyBindingResult(new Object(), "testObject");
            bindingResult.addError(new FieldError("testObject", "field", "must not be null"));
            
            Method method = TestController.class.getMethod("throwValidation");
            MethodParameter parameter = new MethodParameter(method, -1);
            
            throw new MethodArgumentNotValidException(parameter, bindingResult);
        }
    }

    @Test
    @DisplayName("BusinessException 처리 테스트")
    void handleBusinessExceptionTest() throws Exception {
        mockMvc.perform(get("/test/business-exception"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(ErrorCode.ENTITY_NOT_FOUND.getCode()))
                .andExpect(jsonPath("$.message").value(ErrorCode.ENTITY_NOT_FOUND.getMessage()));
    }

    @Test
    @DisplayName("IllegalArgumentException 처리 테스트")
    void handleIllegalArgumentExceptionTest() throws Exception {
        mockMvc.perform(get("/test/illegal-argument"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(ErrorCode.INVALID_INPUT_VALUE.getCode()))
                .andExpect(jsonPath("$.message").value("Invalid argument"));
    }

    @Test
    @DisplayName("AccessDeniedException 처리 테스트")
    void handleAccessDeniedExceptionTest() throws Exception {
        mockMvc.perform(get("/test/access-denied"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(ErrorCode.ACCESS_DENIED.getCode()));
    }

    @Test
    @DisplayName("AuthenticationException 처리 테스트")
    void handleAuthenticationExceptionTest() throws Exception {
        mockMvc.perform(get("/test/auth-exception"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value(ErrorCode.UNAUTHORIZED.getCode()));
    }

    @Test
    @DisplayName("OptimisticLockingFailureException 처리 테스트")
    void handleOptimisticLockingFailureExceptionTest() throws Exception {
        mockMvc.perform(get("/test/optimistic-lock"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value(ErrorCode.INVALID_INPUT_VALUE.getCode()));
    }

    @Test
    @DisplayName("MethodArgumentNotValidException 처리 테스트")
    void handleMethodArgumentNotValidExceptionTest() throws Exception {
        mockMvc.perform(post("/test/validation"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(ErrorCode.INVALID_INPUT_VALUE.getCode()))
                .andExpect(jsonPath("$.message").value("must not be null"));
    }

    @Test
    @DisplayName("HttpRequestMethodNotSupportedException 처리 테스트")
    void handleMethodNotSupportedExceptionTest() throws Exception {
        mockMvc.perform(post("/test/business-exception")) // GET only endpoint called with POST
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.code").value(ErrorCode.METHOD_NOT_ALLOWED.getCode()));
    }

    @Test
    @DisplayName("일반 Exception 처리 테스트")
    void handleExceptionTest() throws Exception {
        mockMvc.perform(get("/test/runtime-exception"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value(ErrorCode.INTERNAL_SERVER_ERROR.getCode()));
    }
}
