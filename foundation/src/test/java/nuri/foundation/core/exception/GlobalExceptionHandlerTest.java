package nuri.foundation.core.exception;

import nuri.foundation.core.response.ApiResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import tools.jackson.databind.exc.UnrecognizedPropertyException;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("GlobalExceptionHandler 테스트")
class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    @DisplayName("[W1-04] 미매핑 경로(NoHandlerFoundException)는 500 이 아니라 404")
    void testHandleNoHandlerFound() {
        var ex = new org.springframework.web.servlet.NoHandlerFoundException(
                "GET", "/api/v1/does-not-exist", new org.springframework.http.HttpHeaders());

        ResponseEntity<ApiResponse<Void>> response = handler.handleNoHandlerFound(ex);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertFalse(response.getBody().success());
        assertEquals("C007", response.getBody().code());
        // 짝이 되는 NoResourceFoundException 과 결론이 같아야 한다 —
        // 어느 예외가 던져지는지는 spring.web.resources.add-mappings 에 갈리는데,
        // 그 설정 하나로 404 가 500 으로 바뀌면 안 된다.
        assertEquals(404, response.getBody().status());
    }

    @Test
    @DisplayName("[W0-13] 커넥션 풀 고갈(CannotCreateTransactionException)은 500 이 아니라 503 + Retry-After")
    void testHandleConnectionUnavailable_transaction() {
        var cause = new java.sql.SQLTransientConnectionException(
                "Connection is not available, request timed out after 30000ms");
        var ex = new org.springframework.transaction.CannotCreateTransactionException("pool exhausted", cause);

        ResponseEntity<ApiResponse<Void>> response = handler.handleConnectionUnavailable(ex);

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        assertEquals("5", response.getHeaders().getFirst(org.springframework.http.HttpHeaders.RETRY_AFTER));
        assertFalse(response.getBody().success());
        assertEquals("S002", response.getBody().code());
        // envelope 의 status 와 실제 전송 status 가 일치해야 한다(정합성 H5).
        assertEquals(503, response.getBody().status());
    }

    @Test
    @DisplayName("[W0-13] 쿼리 중 커넥션 유실(DataAccessResourceFailureException)도 503")
    void testHandleConnectionUnavailable_dataAccess() {
        var ex = new org.springframework.dao.DataAccessResourceFailureException("db down");

        ResponseEntity<ApiResponse<Void>> response = handler.handleConnectionUnavailable(ex);

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        assertEquals("5", response.getHeaders().getFirst(org.springframework.http.HttpHeaders.RETRY_AFTER));
    }

    @Test
    @DisplayName("BusinessException 처리 테스트")
    void testHandleBusinessException() {
        BusinessException ex = new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND);
        ResponseEntity<ApiResponse<Void>> response = handler.handleBusinessException(ex);
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertFalse(response.getBody().success());
        assertEquals("C007", response.getBody().code());
    }

    @Test
    @DisplayName("MethodArgumentNotValidException 처리 테스트")
    void testHandleMethodArgumentNotValidException() {
        MethodArgumentNotValidException ex = mock(MethodArgumentNotValidException.class);
        BindingResult bindingResult = mock(BindingResult.class);
        FieldError fieldError = new FieldError("objectName", "field", "defaultMessage");
        
        when(ex.getBindingResult()).thenReturn(bindingResult);
        when(bindingResult.getObjectName()).thenReturn("objectName");
        when(bindingResult.getFieldErrors()).thenReturn(List.of(fieldError));
        
        ResponseEntity<ApiResponse<Object>> response = handler.handleMethodArgumentNotValidException(ex);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertFalse(response.getBody().success());
        assertEquals("defaultMessage", response.getBody().message());
    }

    @Test
    @DisplayName("HandlerMethodValidationException 처리 테스트")
    void testHandleHandlerMethodValidationException() {
        HandlerMethodValidationException ex = mock(HandlerMethodValidationException.class);
        java.lang.reflect.Method method = mock(java.lang.reflect.Method.class);
        when(ex.getMethod()).thenReturn(method);
        when(method.getName()).thenReturn("validatedMethod");

        ResponseEntity<ApiResponse<Object>> response =
                handler.handleHandlerMethodValidationException(ex);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertFalse(response.getBody().success());
        assertEquals(400, response.getBody().status());
    }

    @Test
    @DisplayName("AccessDeniedException 처리 테스트")
    void testHandleAccessDeniedException() {
        AccessDeniedException ex = new AccessDeniedException("Access Denied");
        ResponseEntity<ApiResponse<Void>> response = handler.handleAccessDeniedException(ex);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertFalse(response.getBody().success());
    }

    @Test
    @DisplayName("AuthenticationException 처리 테스트")
    void testHandleAuthenticationException() {
        AuthenticationException ex = new org.springframework.security.authentication.BadCredentialsException("Auth Failed");
        ResponseEntity<ApiResponse<Void>> response = handler.handleAuthenticationException(ex);
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertFalse(response.getBody().success());
    }

    /**
     * [2026-09-14] 인증 제공자는 비밀번호 확인 전에 계정 상태를 검사한다. 예외 메시지가 응답에 실리면
     * 비밀번호 없이 없는 계정·잠긴 계정·비활성 계정을 구분할 수 있다. 세 경우의 응답이 같아야 한다.
     */
    @Test
    @DisplayName("인증 실패 응답은 계정 없음·잠김·비활성을 구분해 드러내지 않는다")
    void authenticationFailureResponseDoesNotRevealAccountState() {
        AuthenticationException unknown = new org.springframework.security.authentication.BadCredentialsException("Invalid User ID or Password");
        AuthenticationException disabled = new org.springframework.security.authentication.DisabledException("User account is not active");
        AuthenticationException locked = new org.springframework.security.authentication.LockedException("User account is locked.");

        ApiResponse<Void> unknownBody = handler.handleAuthenticationException(unknown).getBody();
        ApiResponse<Void> disabledBody = handler.handleAuthenticationException(disabled).getBody();
        ApiResponse<Void> lockedBody = handler.handleAuthenticationException(locked).getBody();

        assertEquals(unknownBody.message(), disabledBody.message());
        assertEquals(unknownBody.message(), lockedBody.message());
        assertEquals(unknownBody.code(), lockedBody.code());
        assertFalse(lockedBody.message().contains("lock"), "잠김 사유가 응답에 실리면 안 된다: " + lockedBody.message());
        assertFalse(disabledBody.message().contains("active"), "비활성 사유가 응답에 실리면 안 된다: " + disabledBody.message());
    }

    @Test
    @DisplayName("OptimisticLockingFailureException 처리 테스트")
    void testHandleOptimisticLockingFailureException() {
        OptimisticLockingFailureException ex = new OptimisticLockingFailureException("Lock Failed");
        ResponseEntity<ApiResponse<Void>> response = handler.handleOptimisticLockingFailureException(ex);
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertFalse(response.getBody().success());
    }

    @Test
    @DisplayName("IllegalArgumentException 처리 테스트")
    void testHandleIllegalArgumentException() {
        IllegalArgumentException ex = new IllegalArgumentException("Invalid Arg");
        ResponseEntity<ApiResponse<Void>> response = handler.handleIllegalArgumentException(ex);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertFalse(response.getBody().success());
        assertEquals("Invalid Arg", response.getBody().message());
    }

    @Test
    @DisplayName("HttpMessageNotReadableException 처리 테스트 (일반)")
    void testHandleHttpMessageNotReadableException_Normal() {
        org.springframework.http.HttpInputMessage inputMessage = mock(org.springframework.http.HttpInputMessage.class);
        HttpMessageNotReadableException ex = new HttpMessageNotReadableException("Not Readable", inputMessage);
        ResponseEntity<ApiResponse<Void>> response = handler.handleHttpMessageNotReadableException(ex);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertFalse(response.getBody().success());
    }

    @Test
    @DisplayName("HttpMessageNotReadableException 처리 테스트 (UnrecognizedProperty)")
    void testHandleHttpMessageNotReadableException_Unrecognized() {
        UnrecognizedPropertyException cause = mock(UnrecognizedPropertyException.class);
        when(cause.getPropertyName()).thenReturn("unknownField");
        org.springframework.http.HttpInputMessage inputMessage = mock(org.springframework.http.HttpInputMessage.class);
        HttpMessageNotReadableException ex = new HttpMessageNotReadableException("Not Readable", cause, inputMessage);
        
        ResponseEntity<ApiResponse<Void>> response = handler.handleHttpMessageNotReadableException(ex);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertFalse(response.getBody().success());
        assertTrue(response.getBody().message().contains("unknownField"));
    }

    /**
     * 위 테스트는 원인 예외를 직접 만들어 넣으므로 실제 변환기가 어떤 타입을 던지는지는 보지 못한다.
     * Jackson 3 변환기의 원인 예외는 tools.jackson 타입이며, 핸들러가 다른 버전 타입으로 판별하면 필드 이름이 없는
     * 일반 메시지로 조용히 떨어진다(ADR-0024 2단계). 실제 변환기를 거쳐 확인한다.
     */
    @Test
    @DisplayName("실제 Jackson 3 변환기의 알 수 없는 필드 오류도 필드 이름을 알린다")
    void unknownFieldThroughRealConverterNamesTheField() throws Exception {
        tools.jackson.databind.json.JsonMapper mapper = tools.jackson.databind.json.JsonMapper.builder()
                .configureForJackson2()
                .enable(tools.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
                .build();
        org.springframework.test.web.servlet.MockMvc mockMvc = org.springframework.test.web.servlet.setup.MockMvcBuilders
                .standaloneSetup(new ProbeController())
                .setControllerAdvice(handler)
                .setMessageConverters(new org.springframework.http.converter.json.JacksonJsonHttpMessageConverter(mapper))
                .build();

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/probe")
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"a\",\"strayField\":1}"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isBadRequest())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.message")
                        .value(org.hamcrest.Matchers.containsString("strayField")));
    }

    @org.springframework.web.bind.annotation.RestController
    static class ProbeController {
        record Probe(String name) {
        }

        @org.springframework.web.bind.annotation.PostMapping("/probe")
        String accept(@org.springframework.web.bind.annotation.RequestBody Probe probe) {
            return probe.name();
        }
    }

    @Test
    @DisplayName("HttpRequestMethodNotSupportedException 처리 테스트")
    void testHandleHttpRequestMethodNotSupportedException() {
        HttpRequestMethodNotSupportedException ex = new HttpRequestMethodNotSupportedException("POST");
        ResponseEntity<ApiResponse<Void>> response = handler.handleHttpRequestMethodNotSupportedException(ex);
        assertEquals(HttpStatus.METHOD_NOT_ALLOWED, response.getStatusCode());
        assertFalse(response.getBody().success());
    }

    @Test
    @DisplayName("HttpMediaTypeNotSupportedException 처리 테스트")
    void testHandleHttpMediaTypeNotSupportedException() {
        HttpMediaTypeNotSupportedException ex = new HttpMediaTypeNotSupportedException("application/json");
        ResponseEntity<ApiResponse<Void>> response = handler.handleHttpMediaTypeNotSupportedException(ex);
        assertEquals(HttpStatus.UNSUPPORTED_MEDIA_TYPE, response.getStatusCode());
        assertFalse(response.getBody().success());
    }

    @Test
    @DisplayName("일반 Exception 처리 테스트")
    void testHandleException() {
        Exception ex = new Exception("unexpected error");
        ResponseEntity<ApiResponse<Void>> response = handler.handleException(ex);
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertNotNull(response.getBody());
    }

    @Test
    @DisplayName("DataIntegrityViolationException 처리 테스트 (409 Conflict, 중복 자원)")
    void testHandleDataIntegrityViolation() {
        org.springframework.dao.DataIntegrityViolationException ex =
                new org.springframework.dao.DataIntegrityViolationException("duplicate key value violates unique constraint \"uk_x\"");
        ResponseEntity<ApiResponse<Void>> response = handler.handleDataIntegrityViolation(ex);
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertFalse(response.getBody().success());
        assertEquals("C008", response.getBody().code());
    }

    // ── §2.D 불변식 전파: DB 제약의 **종류**가 API 응답 의미로 이어져야 한다 ──────────────
    // V2_24 로 `_yn` 컬럼 60개에 CHECK 가 생겼는데, 종전에는 모든 무결성 위반이 409 "이미 존재하거나
    // 사용 중인 값" 으로 뭉개졌다. 허용되지 않는 **값**을 보낸 클라이언트에게 "중복" 이라 답하는 것은
    // 의미가 틀리다. SQLState 로 갈라 CHECK/NOT NULL 은 400 으로 돌려준다.

    private static org.springframework.dao.DataIntegrityViolationException dive(String sqlState, String msg) {
        return new org.springframework.dao.DataIntegrityViolationException(
                msg, new java.sql.SQLException(msg, sqlState));
    }

    @Test
    @DisplayName("CHECK 제약 위반(23514)은 409 가 아니라 400 이다 — '중복' 이 아니라 '허용되지 않는 값'")
    void testCheckViolationMapsToBadRequest() {
        ResponseEntity<ApiResponse<Void>> response = handler.handleDataIntegrityViolation(
                dive("23514", "new row violates check constraint \"ck_tb_x_dlt_yn\""));
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertFalse(response.getBody().success());
        assertEquals("C001", response.getBody().code());
    }

    @Test
    @DisplayName("NOT NULL 제약 위반(23502)도 400 이다")
    void testNotNullViolationMapsToBadRequest() {
        ResponseEntity<ApiResponse<Void>> response = handler.handleDataIntegrityViolation(
                dive("23502", "null value in column \"x\" violates not-null constraint"));
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("C001", response.getBody().code());
    }

    @Test
    @DisplayName("UNIQUE 위반(23505)은 종전대로 409 를 유지한다 — 이 경우엔 '중복' 이 맞는 의미다")
    void testUniqueViolationStaysConflict() {
        ResponseEntity<ApiResponse<Void>> response = handler.handleDataIntegrityViolation(
                dive("23505", "duplicate key value violates unique constraint \"uk_x\""));
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertEquals("C008", response.getBody().code());
    }

    @Test
    @DisplayName("FK 위반(23503)은 409 를 유지한다 — 참조 무결성 충돌은 '충돌' 이 맞다")
    void testForeignKeyViolationStaysConflict() {
        ResponseEntity<ApiResponse<Void>> response = handler.handleDataIntegrityViolation(
                dive("23503", "violates foreign key constraint \"fk_x\""));
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertEquals("C008", response.getBody().code());
    }
}
