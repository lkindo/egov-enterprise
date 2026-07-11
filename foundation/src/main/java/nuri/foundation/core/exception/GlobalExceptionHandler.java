package nuri.foundation.core.exception;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;

import nuri.foundation.core.response.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import java.util.stream.Collectors;

/**
 * 전역 예외 처리기 (Global Exception Handler)
 * - 모든 모듈의 예외를 ApiResponse 규격으로 통합 반환
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    private final MessageSource messageSource;

    /**
     * 프레임워크(Spring) 기본 생성 경로 — MessageSource(EgovMessageConfig 정의)를 주입받아
     * ErrorCode.code 키로 Accept-Language 기반 로케일 메시지를 해석한다.
     */
    @Autowired
    public GlobalExceptionHandler(MessageSource messageSource) {
        this.messageSource = messageSource;
    }

    /**
     * MessageSource 없이 인스턴스화하기 위한 폴백 생성자(주로 MockMvc standalone 단위 테스트).
     * 이 경로에서는 i18n 해석을 건너뛰고 ErrorCode 기본 메시지(영문)/기본 문자열로 폴백한다.
     */
    public GlobalExceptionHandler() {
        this.messageSource = null;
    }

    /**
     * 비즈니스 로직 예외 처리
     */
    @ExceptionHandler(BusinessException.class)
    protected ResponseEntity<ApiResponse<Void>> handleBusinessException(BusinessException e) {
        log.warn(">>> BusinessException: {} - {}", e.getErrorCode().getCode(), e.getMessage());
        ErrorCode errorCode = e.getErrorCode();
        return new ResponseEntity<>(ApiResponse.error(errorCode, resolveMessage(errorCode, e.getMessage())), errorCode.getStatus());
    }

    /**
     * Bean Validation (@Valid) 예외 처리
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    protected ResponseEntity<ApiResponse<Object>> handleMethodArgumentNotValidException(
            MethodArgumentNotValidException e) {
        log.warn(">>> Validation Failed: {}", e.getBindingResult().getObjectName());
        String message = e.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining(", "));
        return ResponseEntity.badRequest().body(ApiResponse.error(CommonErrorCode.INVALID_INPUT_VALUE, message));
    }

    /**
     * 권한 부족 예외 처리 (Spring Security)
     */
    @ExceptionHandler(AccessDeniedException.class)
    protected ResponseEntity<ApiResponse<Void>> handleAccessDeniedException(AccessDeniedException e) {
        log.warn(">>> Access Denied: {}", e.getMessage());
        return new ResponseEntity<>(ApiResponse.error(CommonErrorCode.ACCESS_DENIED, resolve(CommonErrorCode.ACCESS_DENIED)), HttpStatus.FORBIDDEN);
    }

    /**
     * 인증 실패 예외 처리 (Spring Security)
     */
    @ExceptionHandler(AuthenticationException.class)
    protected ResponseEntity<ApiResponse<Void>> handleAuthenticationException(AuthenticationException e) {
        log.warn(">>> Authentication Failed: {}", e.getMessage());
        return new ResponseEntity<>(ApiResponse.error(CommonErrorCode.UNAUTHORIZED, resolveMessage(CommonErrorCode.UNAUTHORIZED, e.getMessage())), HttpStatus.UNAUTHORIZED);
    }

    /**
     * 낙관적 락 충돌 예외 처리
     */
    @ExceptionHandler(OptimisticLockingFailureException.class)
    protected ResponseEntity<ApiResponse<Void>> handleOptimisticLockingFailureException(
            OptimisticLockingFailureException e) {
        log.error(">>> Concurrency Conflict", e);
        // [정합성 H5] body.status(과거 INVALID_INPUT_VALUE=400)와 HTTP 409가 어긋나던 것을 바로잡음:
        // CONCURRENT_MODIFICATION(409)로 생성하여 envelope status와 전송 status를 일치시킨다.
        return new ResponseEntity<>(
                ApiResponse.error(CommonErrorCode.CONCURRENT_MODIFICATION,
                        resolve("handler.optimistic_lock", null, "데이터가 이미 수정되었습니다. 다시 시도해주세요.")),
                HttpStatus.CONFLICT);
    }

    /**
     * 부적절한 인자 전달 예외 처리
     */
    @ExceptionHandler(IllegalArgumentException.class)
    protected ResponseEntity<ApiResponse<Void>> handleIllegalArgumentException(IllegalArgumentException e) {
        log.warn(">>> Illegal Argument: {}", e.getMessage());
        return ResponseEntity.badRequest().body(ApiResponse.error(CommonErrorCode.INVALID_INPUT_VALUE, resolveMessage(CommonErrorCode.INVALID_INPUT_VALUE, e.getMessage())));
    }

    /**
     * JSON 역직렬화 오류 처리 (예: 정의되지 않은 필드 전송 시)
     */
    @ExceptionHandler(org.springframework.http.converter.HttpMessageNotReadableException.class)
    protected ResponseEntity<ApiResponse<Void>> handleHttpMessageNotReadableException(
            org.springframework.http.converter.HttpMessageNotReadableException e) {
        log.warn(">>> JSON Deserialization Failed: {}", e.getMessage());
        String detailMessage = resolve("handler.message_not_readable", null,
                "잘못된 데이터 형식이거나 정의되지 않은 필드가 포함되어 있습니다.");
        if (e.getCause() instanceof com.fasterxml.jackson.databind.exc.UnrecognizedPropertyException) {
            com.fasterxml.jackson.databind.exc.UnrecognizedPropertyException cause =
                (com.fasterxml.jackson.databind.exc.UnrecognizedPropertyException) e.getCause();
            detailMessage = resolve("handler.unrecognized_field", new Object[]{cause.getPropertyName()},
                    String.format("정의되지 않은 필드 '%s'가 포함되어 있습니다.", cause.getPropertyName()));
        }
        return ResponseEntity.badRequest().body(ApiResponse.error(CommonErrorCode.INVALID_INPUT_VALUE, detailMessage));
    }

    /**
     * 지원하지 않는 HTTP 메서드 호출 예외 처리
     */
    @ExceptionHandler(org.springframework.web.HttpRequestMethodNotSupportedException.class)
    protected ResponseEntity<ApiResponse<Void>> handleHttpRequestMethodNotSupportedException(
            org.springframework.web.HttpRequestMethodNotSupportedException e) {
        return new ResponseEntity<>(ApiResponse.error(CommonErrorCode.METHOD_NOT_ALLOWED, resolve(CommonErrorCode.METHOD_NOT_ALLOWED)), HttpStatus.METHOD_NOT_ALLOWED);
    }

    /**
     * 지원하지 않는 미디어 타입 호출 예외 처리
     */
    @ExceptionHandler(org.springframework.web.HttpMediaTypeNotSupportedException.class)
    protected ResponseEntity<ApiResponse<Void>> handleHttpMediaTypeNotSupportedException(
            org.springframework.web.HttpMediaTypeNotSupportedException e) {
        return new ResponseEntity<>(ApiResponse.error(CommonErrorCode.UNSUPPORTED_MEDIA_TYPE, resolve(CommonErrorCode.UNSUPPORTED_MEDIA_TYPE)), HttpStatus.UNSUPPORTED_MEDIA_TYPE);
    }

    /**
     * 최상위 공통 예외 처리
     * 백엔드 헌법 제7조 2항 및 정보 노출(Information Disclosure) 취약점 방어를 위해
     * 내부 상세 메시지는 서버 로그(log.error)로만 남기고, 클라이언트 응답은 마스킹하여 반환.
     */
    @ExceptionHandler(Exception.class)
    protected ResponseEntity<ApiResponse<Void>> handleException(Exception e) {
        log.error(">>> Internal Server Error: {} - ExceptionType: {}", e.getMessage(), e.getClass().getName(), e);
        return new ResponseEntity<>(
                ApiResponse.error(CommonErrorCode.INTERNAL_SERVER_ERROR,
                        resolve("handler.internal_error", null, "서버 내부 오류가 발생했습니다. 지속될 경우 관리자에게 문의해 주세요.")),
                HttpStatus.INTERNAL_SERVER_ERROR);
    }

    /**
     * ErrorCode.code 를 메시지 키로 사용하여 현재 로케일(Accept-Language)에 맞는 메시지를 해석한다.
     * 키가 없으면 ErrorCode.getMessage() (영문 기본값)로 폴백한다.
     */
    private String resolve(ErrorCode errorCode) {
        return resolve(errorCode.getCode(), null, errorCode.getMessage());
    }

    /**
     * 임의의 메시지 키를 현재 로케일로 해석한다. 미등록 시(또는 MessageSource 미주입 시) defaultMessage 로 폴백한다.
     */
    private String resolve(String code, Object[] args, String defaultMessage) {
        if (messageSource == null) {
            return defaultMessage;
        }
        return messageSource.getMessage(code, args, defaultMessage, LocaleContextHolder.getLocale());
    }

    /**
     * 호출부에서 커스텀 메시지를 직접 지정한 경우(ErrorCode 기본 메시지와 다름)에는 그 메시지를 그대로 존중하고,
     * 그 외(기본 메시지이거나 null)에는 ErrorCode.code 키로 로케일별 메시지를 해석한다.
     */
    private String resolveMessage(ErrorCode errorCode, String rawMessage) {
        if (rawMessage != null && !rawMessage.equals(errorCode.getMessage())) {
            return rawMessage;
        }
        return resolve(errorCode);
    }
}
