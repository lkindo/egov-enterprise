package nuri.foundation.core.exception;


import nuri.foundation.core.persistence.VendorErrorCodes;
import nuri.foundation.core.persistence.VendorSqlDialect;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.storage.StorageObjectMissingException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationServiceException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import java.util.Optional;
import java.util.stream.Collectors;

/** 모든 모듈의 예외를 ApiResponse 규격으로 통합해 돌려준다. */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    /** 검증 오류 응답의 순서 — 필드, 제약 코드, 문구 순. 값이 없으면 뒤로 보낸다. */
    private static final java.util.Comparator<org.springframework.validation.FieldError> FIELD_ERROR_ORDER =
            java.util.Comparator.comparing(org.springframework.validation.FieldError::getField)
                    .thenComparing(org.springframework.validation.FieldError::getCode,
                            java.util.Comparator.nullsLast(java.util.Comparator.naturalOrder()))
                    .thenComparing(org.springframework.validation.FieldError::getDefaultMessage,
                            java.util.Comparator.nullsLast(java.util.Comparator.naturalOrder()));

    private final MessageSource messageSource;

    /** 활성 벤더의 오류 번호 표. 번호의 뜻이 벤더마다 달라 다른 벤더의 표는 쓰지 않는다(ADR-0047). */
    private final VendorErrorCodes errorCodes;

    /**
     * Spring 기본 생성 경로. ErrorCode.code 키로 Accept-Language 로케일 메시지를 해석한다.
     * 벤더 포트가 없는 조각 컨텍스트(@WebMvcTest 등)는 기본 벤더인 PostgreSQL 처럼 SQLState 로만 가른다.
     */
    @Autowired
    public GlobalExceptionHandler(MessageSource messageSource, ObjectProvider<VendorSqlDialect> vendorSql) {
        this(messageSource, Optional.ofNullable(vendorSql.getIfAvailable()).map(VendorSqlDialect::errorCodes)
                .orElse(VendorErrorCodes.NONE));
    }

    /** 벤더 표 없이 SQLState 로만 가른다. */
    public GlobalExceptionHandler(MessageSource messageSource) {
        this(messageSource, VendorErrorCodes.NONE);
    }

    /** MessageSource 없는 폴백(주로 MockMvc standalone 시험). i18n 해석 없이 ErrorCode 기본 메시지(영문)·기본 문자열을 쓴다. */
    public GlobalExceptionHandler() {
        this(null, VendorErrorCodes.NONE);
    }

    /** 벤더 DB 위 standalone 시험이 그 벤더의 표로 응답을 대조할 때 쓴다. */
    public GlobalExceptionHandler(VendorErrorCodes errorCodes) {
        this(null, errorCodes);
    }

    private GlobalExceptionHandler(MessageSource messageSource, VendorErrorCodes errorCodes) {
        this.messageSource = messageSource;
        this.errorCodes = java.util.Objects.requireNonNull(errorCodes, "errorCodes");
    }

    /**
     * 저장소 드리프트(DB 에 첨부 레코드는 있으나 실물이 없음). 응답은 다른 404 와 똑같이 두어 존재 여부를 누출하지 않고, 유실이
     * WARN 에 묻히지 않도록 ERROR 로 복구 대상(저장소 경로·저장 파일명)을 남긴다. 원본 파일명은 사용자 입력이라 남기지 않는다.
     */
    @ExceptionHandler(StorageObjectMissingException.class)
    protected ResponseEntity<ApiResponse<Void>> handleStorageObjectMissing(StorageObjectMissingException e) {
        log.error(">>> STORAGE DRIFT: DB 에는 첨부가 있으나 저장소에 실물이 없습니다."
                + " path='{}' storedFileName='{}' — 저장소 설정이 바뀌었거나 파일이 유실됐습니다.",
                e.getStoragePath(), e.getStoredFileName());

        ErrorCode errorCode = e.getErrorCode();
        return new ResponseEntity<>(
                ApiResponse.error(errorCode, resolveMessage(errorCode, e.getMessage())), errorCode.getStatus());
    }

    @ExceptionHandler(BusinessException.class)
    protected ResponseEntity<ApiResponse<Void>> handleBusinessException(BusinessException e) {
        log.warn(">>> BusinessException: {} - {}", e.getErrorCode().getCode(), e.getMessage());
        ErrorCode errorCode = e.getErrorCode();
        return new ResponseEntity<>(ApiResponse.error(errorCode, resolveMessage(errorCode, e.getMessage())), errorCode.getStatus());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    protected ResponseEntity<ApiResponse<Object>> handleMethodArgumentNotValidException(
            MethodArgumentNotValidException e) {
        log.warn(">>> Validation Failed: {}", e.getBindingResult().getObjectName());

        // 합친 message 는 그것을 읽는 클라이언트를 위해 두고 필드별 오류를 덧붙인다. Bean Validation 은 위반 순서를 보장하지
        //   않아 필드 → 제약 코드 → 문구 순으로 고정한다(필드마다 보이는 첫 오류가 요청마다 바뀌지 않게). 제약 코드는 언어와
        //   무관해 ko/en 응답이 같은 제약의 문구를 고른다.
        java.util.List<org.springframework.validation.FieldError> sorted =
                e.getBindingResult().getFieldErrors().stream()
                        .sorted(FIELD_ERROR_ORDER)
                        .toList();

        String message = sorted.stream()
                .map(error -> error.getDefaultMessage())
                .collect(Collectors.joining(", "));

        java.util.List<nuri.foundation.core.response.FieldErrorItem> fieldErrors = sorted.stream()
                .map(error -> new nuri.foundation.core.response.FieldErrorItem(
                        error.getField(), error.getDefaultMessage()))
                .toList();

        return ResponseEntity.badRequest()
                .body(ApiResponse.error(CommonErrorCode.INVALID_INPUT_VALUE, message, fieldErrors));
    }

    /** 검증 오류 항목의 정렬 — 필드/파라미터명, 제약 코드, 문구 순. */
    private static final java.util.Comparator<ValidationEntry> VALIDATION_ENTRY_ORDER =
            java.util.Comparator.comparing(ValidationEntry::field,
                            java.util.Comparator.nullsLast(java.util.Comparator.naturalOrder()))
                    .thenComparing(ValidationEntry::code,
                            java.util.Comparator.nullsLast(java.util.Comparator.naturalOrder()))
                    .thenComparing(ValidationEntry::message,
                            java.util.Comparator.nullsLast(java.util.Comparator.naturalOrder()));

    private record ValidationEntry(String field, String code, String message) {
    }

    /**
     * 컨테이너 원소·메서드 파라미터 검증 실패. {@code List<@Valid T>} 같은 메서드 수준 제약은
     * {@link HandlerMethodValidationException}으로 오므로 일반 DTO 검증과 같은 400 계약으로 맞춘다.
     */
    @ExceptionHandler(HandlerMethodValidationException.class)
    protected ResponseEntity<ApiResponse<Object>> handleHandlerMethodValidationException(
            HandlerMethodValidationException e) {
        log.warn(">>> Handler Method Validation Failed: {}", e.getMethod().getName());
        java.util.List<ValidationEntry> entries = e.getParameterValidationResults().stream()
                .flatMap(result -> {
                    String fallbackParam = result.getMethodParameter().getParameterName();
                    if (fallbackParam == null || fallbackParam.isBlank()) {
                        fallbackParam = "parameter" + result.getMethodParameter().getParameterIndex();
                    }
                    final String paramName = fallbackParam;
                    return result.getResolvableErrors().stream().map(error -> {
                        if (error instanceof org.springframework.validation.FieldError fe) {
                            return new ValidationEntry(fe.getField(), fe.getCode(), fe.getDefaultMessage());
                        }
                        String[] codes = error.getCodes();
                        String code = (codes != null && codes.length > 0) ? codes[0] : null;
                        return new ValidationEntry(paramName, code, error.getDefaultMessage());
                    });
                })
                .sorted(VALIDATION_ENTRY_ORDER)
                .toList();

        if (entries.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(CommonErrorCode.INVALID_INPUT_VALUE,
                            resolve(CommonErrorCode.INVALID_INPUT_VALUE)));
        }
        String message = entries.stream()
                .map(ValidationEntry::message)
                .filter(m -> m != null && !m.isBlank())
                .collect(Collectors.joining(", "));
        if (message.isBlank()) {
            message = resolve(CommonErrorCode.INVALID_INPUT_VALUE);
        }
        java.util.List<nuri.foundation.core.response.FieldErrorItem> fieldErrors = entries.stream()
                .map(entry -> new nuri.foundation.core.response.FieldErrorItem(entry.field(), entry.message()))
                .toList();
        return ResponseEntity.badRequest()
                .body(ApiResponse.error(CommonErrorCode.INVALID_INPUT_VALUE, message, fieldErrors));
    }

    @ExceptionHandler(AccessDeniedException.class)
    protected ResponseEntity<ApiResponse<Void>> handleAccessDeniedException(AccessDeniedException e) {
        log.warn(">>> Access Denied: {}", e.getMessage());
        return new ResponseEntity<>(ApiResponse.error(CommonErrorCode.ACCESS_DENIED, resolve(CommonErrorCode.ACCESS_DENIED)), HttpStatus.FORBIDDEN);
    }

    /**
     * 인증 실패 응답은 사유와 무관하게 한 문구다. 인증 제공자가 비밀번호 확인 전에 계정 상태를 보므로, 예외 메시지를 돌려주면
     * 비밀번호 없이도 없는·잠긴·비활성 계정을 구분할 수 있다. 사유는 서버 로그에만 남긴다 — BFF 처럼 API 직접 호출도 사유를 감춘다.
     */
    @ExceptionHandler(AuthenticationException.class)
    protected ResponseEntity<ApiResponse<Void>> handleAuthenticationException(AuthenticationException e) {
        log.warn(">>> Authentication Failed: {} ({})", e.getMessage(), e.getClass().getSimpleName());
        return new ResponseEntity<>(ApiResponse.error(CommonErrorCode.UNAUTHORIZED, resolve(CommonErrorCode.UNAUTHORIZED)), HttpStatus.UNAUTHORIZED);
    }

    /** 인증 저장소·인코더·principal 계약 장애는 자격 증명 거부와 구분한다. */
    @ExceptionHandler(AuthenticationServiceException.class)
    protected ResponseEntity<ApiResponse<Void>> handleAuthenticationServiceException(AuthenticationServiceException e) {
        // 예외 메시지나 원인에는 연결 정보가 포함될 수 있다. 응답과 이 경계의 로그에는 복제하지 않는다.
        log.error(">>> Authentication service failure: {}", e.getClass().getSimpleName());
        java.util.Set<Throwable> visited = java.util.Collections.newSetFromMap(new java.util.IdentityHashMap<>());
        for (Throwable cause = e; cause != null && visited.add(cause); cause = cause.getCause()) {
            if (cause instanceof org.springframework.transaction.CannotCreateTransactionException
                    || cause instanceof org.springframework.dao.DataAccessResourceFailureException) {
                return connectionUnavailableResponse();
            }
        }
        // 확인된 연결 장애만 503이다. 파손된 해시·인코더 설정·principal 계약 오류는 500으로 남긴다.
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error(CommonErrorCode.INTERNAL_SERVER_ERROR, resolve(CommonErrorCode.INTERNAL_SERVER_ERROR)));
    }

    @ExceptionHandler(OptimisticLockingFailureException.class)
    protected ResponseEntity<ApiResponse<Void>> handleOptimisticLockingFailureException(
            OptimisticLockingFailureException e) {
        log.error(">>> Concurrency Conflict", e);
        // envelope status 와 전송 status 가 같은 409 가 되도록 CONCURRENT_MODIFICATION 으로 만든다.
        return new ResponseEntity<>(
                ApiResponse.error(CommonErrorCode.CONCURRENT_MODIFICATION,
                        resolve("handler.optimistic_lock", null, "데이터가 이미 수정되었습니다. 다시 시도해주세요.")),
                HttpStatus.CONFLICT);
    }

    /** 잠금 획득 실패·교착/직렬화 충돌은 최신 상태를 확인해야 하는 409이다. 쓰기를 자동 재시도하지 않는다. */
    @ExceptionHandler(org.springframework.dao.PessimisticLockingFailureException.class)
    protected ResponseEntity<ApiResponse<Void>> handlePessimisticLockingFailure(
            org.springframework.dao.PessimisticLockingFailureException e) {
        log.warn(">>> Database concurrency conflict: {}", e.getClass().getSimpleName());
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiResponse.error(CommonErrorCode.CONCURRENT_MODIFICATION,
                        resolve(CommonErrorCode.CONCURRENT_MODIFICATION)));
    }

    @ExceptionHandler(org.springframework.dao.QueryTimeoutException.class)
    protected ResponseEntity<ApiResponse<Void>> handleQueryTimeout(org.springframework.dao.QueryTimeoutException e) {
        log.error(">>> Database query timed out: {}", e.getClass().getSimpleName());
        return connectionUnavailableResponse();
    }

    /** JDBC 기본 변환기가 분류하지 않은 PostgreSQL 잠금 실패와 벤더 번호의 잠금 실패도 같은 동시성 계약을 따른다. */
    @ExceptionHandler(org.springframework.dao.DataAccessException.class)
    protected ResponseEntity<ApiResponse<Void>> handleUnclassifiedDataAccess(org.springframework.dao.DataAccessException e) {
        String sqlState = extractSqlState(e);
        int vendorCode = extractVendorCode(e);
        // Oracle 의 길이 초과(72000)·숫자 변환(42000), MySQL·MariaDB 의 CHECK·기본값 없음·형식(HY000·22007)은
        // 무결성 위반으로 번역되지 않아 이 경로로 온다.
        if (errorCodes.rejectsValue(vendorCode, extractVendorMessage(e))) {
            log.warn(">>> Rejected database value: {} SQLState={}", e.getClass().getSimpleName(), sqlState);
            return invalidValueResponse();
        }
        log.error(">>> Unclassified database failure: {} SQLState={}", e.getClass().getSimpleName(), sqlState);
        if ("55P03".equals(sqlState) || "40001".equals(sqlState) || "40P01".equals(sqlState)
                || errorCodes.lockFailures().contains(vendorCode)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiResponse.error(CommonErrorCode.CONCURRENT_MODIFICATION,
                            resolve(CommonErrorCode.CONCURRENT_MODIFICATION)));
        }
        if ("57014".equals(sqlState) || errorCodes.cancelled().contains(vendorCode)) {
            return connectionUnavailableResponse();
        }
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error(CommonErrorCode.INTERNAL_SERVER_ERROR,
                        resolve(CommonErrorCode.INTERNAL_SERVER_ERROR)));
    }

    /**
     * 데이터 무결성 위반. check-then-act 사전 검사를 동시 요청이 함께 통과해 나는 유니크 위반은 500 이 아닌
     * 409(DUPLICATE_RESOURCE)다. 도메인 의미가 필요한 제약(예: 투표 이중참여)은 서비스가 BusinessException 으로 먼저 바꾼다.
     */
    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    protected ResponseEntity<ApiResponse<Void>> handleDataIntegrityViolation(
            org.springframework.dao.DataIntegrityViolationException e) {
        String sqlState = extractSqlState(e);
        // SQL 본문·실패한 행/값은 개인정보를 포함할 수 있으므로 이 경계에서는 종류만 기록한다.
        log.warn(">>> Data Integrity Violation: SQLState={}", sqlState);

        // 제약의 종류로 나눈다. CHECK(V2_24 의 `_yn` 등)·NOT NULL 위반은 허용되지 않는 값이라 400, UNIQUE·FK 는 409 다.
        //   DTO 마다 @Pattern 을 뿌리지 않고(H4) 여기서 SQLState 로 가른다. Oracle·MySQL·MariaDB 는 CHECK·NOT NULL 의
        //   SQLState 가 23000·HY000 이라 활성 벤더의 오류 번호로 가른다.
        int vendorCode = extractVendorCode(e);
        // 드라이버가 SQLState 를 입력 오류 계열로 바꿔 올리는 서버 계산 오류(MySQL 의 0 나누기 1365 → 22001)는 아래 분기보다 먼저 500 이다.
        if (errorCodes.serverFaults().contains(vendorCode)) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error(CommonErrorCode.INTERNAL_SERVER_ERROR,
                            resolve(CommonErrorCode.INTERNAL_SERVER_ERROR)));
        }
        if ("23514".equals(sqlState) || "23502".equals(sqlState)
                || "22001".equals(sqlState) || "22003".equals(sqlState)
                || "22007".equals(sqlState) || "22008".equals(sqlState) || "22P02".equals(sqlState)
                || errorCodes.rejectsValue(vendorCode, extractVendorMessage(e))) {
            return invalidValueResponse();
        }
        // 22 전체를 입력 오류로 취급하면 0으로 나누기·시퀀스 고갈 같은 서버 결함을 감춘다.
        if (sqlState != null && !sqlState.startsWith("23") && !errorCodes.duplicates().contains(vendorCode)) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error(CommonErrorCode.INTERNAL_SERVER_ERROR,
                            resolve(CommonErrorCode.INTERNAL_SERVER_ERROR)));
        }
        return new ResponseEntity<>(
                ApiResponse.error(CommonErrorCode.DUPLICATE_RESOURCE,
                        resolve("handler.data_integrity", null,
                                "요청이 기존 데이터 제약과 충돌합니다. 이미 존재하거나 사용 중인 값일 수 있습니다.")),
                HttpStatus.CONFLICT);
    }

    private ResponseEntity<ApiResponse<Void>> invalidValueResponse() {
        return ResponseEntity.badRequest().body(ApiResponse.error(CommonErrorCode.INVALID_INPUT_VALUE,
                resolve("handler.constraint_invalid_value", null,
                        "허용되지 않는 값이 포함되어 있습니다. 입력값을 확인해 주십시오.")));
    }

    /** 원인 체인의 벤더 오류 번호. 없으면 0 이다. 어느 표에도 0 은 없다. */
    private static int extractVendorCode(Throwable cause) {
        java.util.Set<Throwable> visited = java.util.Collections.newSetFromMap(new java.util.IdentityHashMap<>());
        for (Throwable t = cause; t != null && visited.add(t); t = t.getCause()) {
            if (t instanceof java.sql.SQLException sqlEx && sqlEx.getErrorCode() != 0) {
                return sqlEx.getErrorCode();
            }
        }
        return 0;
    }

    /**
     * 벤더 오류 번호를 낸 예외의 메시지. 번호 하나가 여러 위반을 함께 쓰는 벤더(SQL Server 547)는 메시지의 제약 종류로 가른다.
     * 메시지는 판정에만 쓰고 기록하지 않는다 — 값이 들어 있을 수 있다.
     */
    private static String extractVendorMessage(Throwable cause) {
        java.util.Set<Throwable> visited = java.util.Collections.newSetFromMap(new java.util.IdentityHashMap<>());
        for (Throwable t = cause; t != null && visited.add(t); t = t.getCause()) {
            if (t instanceof java.sql.SQLException sqlEx && sqlEx.getErrorCode() != 0) {
                return sqlEx.getMessage();
            }
        }
        return null;
    }

    /** Spring/Hibernate 원인 체인의 SQLState를 읽으며 순환한 예외 체인에도 종료한다. */
    private static String extractSqlState(Throwable cause) {
        java.util.Set<Throwable> visited = java.util.Collections.newSetFromMap(new java.util.IdentityHashMap<>());
        for (Throwable t = cause; t != null && visited.add(t); t = t.getCause()) {
            if (t instanceof java.sql.SQLException sqlEx && sqlEx.getSQLState() != null) {
                return sqlEx.getSQLState();
            }
        }
        return null;
    }

    @ExceptionHandler(IllegalArgumentException.class)
    protected ResponseEntity<ApiResponse<Void>> handleIllegalArgumentException(IllegalArgumentException e) {
        log.warn(">>> Illegal Argument: {}", e.getMessage());
        return ResponseEntity.badRequest().body(ApiResponse.error(CommonErrorCode.INVALID_INPUT_VALUE, resolveMessage(CommonErrorCode.INVALID_INPUT_VALUE, e.getMessage())));
    }

    @ExceptionHandler(org.springframework.http.converter.HttpMessageNotReadableException.class)
    protected ResponseEntity<ApiResponse<Void>> handleHttpMessageNotReadableException(
            org.springframework.http.converter.HttpMessageNotReadableException e) {
        log.warn(">>> JSON Deserialization Failed: {}", e.getMessage());
        String detailMessage = resolve("handler.message_not_readable", null,
                "잘못된 데이터 형식이거나 정의되지 않은 필드가 포함되어 있습니다.");
        // HTTP 변환기가 Jackson 3 이라 원인 예외도 tools.jackson 타입이다(ADR-0024). Jackson 2 타입으로 판별하면
        //   조용히 빗나가 필드 이름이 없는 일반 메시지로 떨어진다.
        if (e.getCause() instanceof tools.jackson.databind.exc.UnrecognizedPropertyException cause) {
            detailMessage = resolve("handler.unrecognized_field", new Object[]{cause.getPropertyName()},
                    String.format("정의되지 않은 필드 '%s'가 포함되어 있습니다.", cause.getPropertyName()));
        }
        return ResponseEntity.badRequest().body(ApiResponse.error(CommonErrorCode.INVALID_INPUT_VALUE, detailMessage));
    }

    @ExceptionHandler(org.springframework.web.HttpRequestMethodNotSupportedException.class)
    protected ResponseEntity<ApiResponse<Void>> handleHttpRequestMethodNotSupportedException(
            org.springframework.web.HttpRequestMethodNotSupportedException e) {
        return new ResponseEntity<>(ApiResponse.error(CommonErrorCode.METHOD_NOT_ALLOWED, resolve(CommonErrorCode.METHOD_NOT_ALLOWED)), HttpStatus.METHOD_NOT_ALLOWED);
    }

    @ExceptionHandler(org.springframework.web.HttpMediaTypeNotSupportedException.class)
    protected ResponseEntity<ApiResponse<Void>> handleHttpMediaTypeNotSupportedException(
            org.springframework.web.HttpMediaTypeNotSupportedException e) {
        return new ResponseEntity<>(ApiResponse.error(CommonErrorCode.UNSUPPORTED_MEDIA_TYPE, resolve(CommonErrorCode.UNSUPPORTED_MEDIA_TYPE)), HttpStatus.UNSUPPORTED_MEDIA_TYPE);
    }

    /** 경로·쿼리 파라미터 타입 불일치(예: Long 자리에 {@code abc})는 잘못된 요청이라 500 이 아닌 400 이다. */
    @ExceptionHandler(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class)
    protected ResponseEntity<ApiResponse<Void>> handleMethodArgumentTypeMismatch(
            org.springframework.web.method.annotation.MethodArgumentTypeMismatchException e) {
        return new ResponseEntity<>(ApiResponse.error(CommonErrorCode.INVALID_TYPE_VALUE, resolve(CommonErrorCode.INVALID_TYPE_VALUE)), HttpStatus.BAD_REQUEST);
    }

    /**
     * 필수 요청 값 누락은 500 이 아닌 400 이다. 이 클래스는 {@code ResponseEntityExceptionHandler} 를 상속하지 않아, 따로 잡지
     * 않으면 최상위 {@code Exception} 처리로 떨어진다. 파라미터 이름은 서버 코드가 정한 값이라 안내에 싣는다.
     */
    @ExceptionHandler({
            org.springframework.web.bind.MissingServletRequestParameterException.class,
            org.springframework.web.multipart.support.MissingServletRequestPartException.class,
            org.springframework.web.bind.UnsatisfiedServletRequestParameterException.class })
    protected ResponseEntity<ApiResponse<Void>> handleMissingRequestInput(Exception e) {
        log.warn(">>> Missing request input: {}", e.getMessage());
        String name = e instanceof org.springframework.web.bind.MissingServletRequestParameterException missing
                ? missing.getParameterName()
                : e instanceof org.springframework.web.multipart.support.MissingServletRequestPartException part
                        ? part.getRequestPartName()
                        : null;
        String message = name == null
                ? resolve(CommonErrorCode.INVALID_INPUT_VALUE)
                : resolve("handler.missing_parameter", new Object[]{name},
                        String.format("필수 요청 값 '%s'이(가) 없습니다.", name));
        return ResponseEntity.badRequest().body(ApiResponse.error(CommonErrorCode.INVALID_INPUT_VALUE, message));
    }

    /**
     * 업로드가 서블릿 크기 한도({@code spring.servlet.multipart.max-file-size}·{@code max-request-size})를 넘었다 — edge
     * nginx 가 본문 한도 초과에 주는 상태와 같은 413 이다. 한도는 환경 변수로 바뀌므로 문구에 숫자를 싣지 않는다.
     */
    @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
    protected ResponseEntity<ApiResponse<Void>> handleMaxUploadSizeExceeded(
            org.springframework.web.multipart.MaxUploadSizeExceededException e) {
        log.warn(">>> Upload size exceeded: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.CONTENT_TOO_LARGE).body(ApiResponse.error(HttpStatus.CONTENT_TOO_LARGE,
                CommonErrorCode.INVALID_INPUT_VALUE,
                resolve("handler.upload_too_large", null, "업로드한 파일이 허용 크기를 넘었습니다.")));
    }

    /**
     * multipart 본문 형식 오류(잘리거나 경계가 맞지 않는 본문, 경계 없는 Content-Type, form-data 아닌 유형)만 400 이다. 같은
     * 예외가 서버 쪽 임시 파일 IO 실패에서도 나와, 가장 안쪽 원인이 형식 거부일 때만 좁히고 나머지는 500 이다. 컨테이너
     * 클래스를 로드하지 않도록 이름으로 판별한다.
     */
    @ExceptionHandler(org.springframework.web.multipart.MultipartException.class)
    protected ResponseEntity<ApiResponse<Void>> handleMultipart(org.springframework.web.multipart.MultipartException e) {
        if (malformedMultipartBody(e)) {
            log.warn(">>> Malformed multipart request: {}", rootCause(e).getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(CommonErrorCode.INVALID_INPUT_VALUE,
                    resolve("handler.malformed_multipart", null, "파일 업로드 요청의 형식이 올바르지 않습니다.")));
        }
        return handleException(e);
    }

    private static final java.util.Set<String> MALFORMED_MULTIPART_ROOT_CAUSES = java.util.Set.of(
            "org.apache.tomcat.util.http.fileupload.MultipartStream$MalformedStreamException",
            "org.apache.tomcat.util.http.fileupload.FileUploadException",
            "org.apache.tomcat.util.http.fileupload.impl.InvalidContentTypeException");

    static boolean malformedMultipartBody(Throwable e) {
        return MALFORMED_MULTIPART_ROOT_CAUSES.contains(rootCause(e).getClass().getName());
    }

    private static Throwable rootCause(Throwable e) {
        Throwable root = e;
        while (root.getCause() != null && root.getCause() != root) {
            root = root.getCause();
        }
        return root;
    }

    /**
     * 없는 필드로 정렬을 요청했다 — 500 이 아닌 400. 예) {@code ?sort=foo} 는 Spring Data 가
     * {@code PropertyReferenceException} 으로 거부한다. 입력값은 응답에 되비추지 않는다.
     */
    @ExceptionHandler(org.springframework.data.core.PropertyReferenceException.class)
    protected ResponseEntity<ApiResponse<Void>> handleUnknownSortProperty(
            org.springframework.data.core.PropertyReferenceException e) {
        log.warn(">>> Unknown sort property: {}", e.getMessage());
        return invalidSort();
    }

    /**
     * 요청의 정렬 값 때문에 난 경우만 400 이다 — 파생 쿼리의 {@code QueryUtils.checkSortExpression} 거부, 또는 {@code @Query}
     * 정렬에서 Hibernate {@code UnknownPathException} 의 속성이 요청 {@code sort} 값에 실제로 있을 때. 같은 예외 타입이 코드
     * 결함(잘못된 저장소 사용·JPQL 오타)에서도 나오므로 나머지는 500 이다.
     */
    @ExceptionHandler(org.springframework.dao.InvalidDataAccessApiUsageException.class)
    protected ResponseEntity<ApiResponse<Void>> handleInvalidDataAccessApiUsage(
            org.springframework.dao.InvalidDataAccessApiUsageException e, jakarta.servlet.http.HttpServletRequest request) {
        if (rejectedBySortCheck(e) || unknownSortProperty(e, request.getParameterValues("sort"))) {
            log.warn(">>> Rejected sort: {}", e.getMessage());
            return invalidSort();
        }
        return handleException(e);
    }

    private static final java.util.regex.Pattern UNRESOLVED_ATTRIBUTE =
            java.util.regex.Pattern.compile("attribute '([^']+)'");

    static boolean unknownSortProperty(Throwable e, String[] sortParameters) {
        if (sortParameters == null || sortParameters.length == 0) {
            return false;
        }
        for (Throwable cause = e; cause != null; cause = cause.getCause()) {
            if (!"org.hibernate.query.sqm.UnknownPathException".equals(cause.getClass().getName())) {
                continue;
            }
            java.util.regex.Matcher attribute = UNRESOLVED_ATTRIBUTE.matcher(String.valueOf(cause.getMessage()));
            if (!attribute.find()) {
                return false;
            }
            // 점 경로는 처음 해석하지 못한 조각만 보고된다(sort=www.google.com → attribute 'www').
            for (String sort : sortParameters) {
                for (String token : sort.split(",")) {
                    for (String segment : token.trim().split("\\.")) {
                        if (segment.equals(attribute.group(1))) {
                            return true;
                        }
                    }
                }
            }
            return false;
        }
        return false;
    }

    static boolean rejectedBySortCheck(Throwable e) {
        for (StackTraceElement frame : e.getStackTrace()) {
            if ("org.springframework.data.jpa.repository.query.QueryUtils".equals(frame.getClassName())
                    && "checkSortExpression".equals(frame.getMethodName())) {
                return true;
            }
        }
        return false;
    }

    @ExceptionHandler(InvalidSortParameterException.class)
    protected ResponseEntity<ApiResponse<Void>> handleInvalidSortParameter(InvalidSortParameterException e) {
        log.warn(">>> Rejected sort parameter format");
        return invalidSort();
    }

    private ResponseEntity<ApiResponse<Void>> invalidSort() {
        return ResponseEntity.badRequest().body(ApiResponse.error(CommonErrorCode.INVALID_INPUT_VALUE,
                resolve("handler.invalid_sort", null, "정렬 기준이 올바르지 않습니다.")));
    }

    /** 미매핑 경로(존재하지 않는 엔드포인트/정적 리소스)는 500 이 아닌 404 다. */
    @ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class)
    protected ResponseEntity<ApiResponse<Void>> handleNoResourceFound(
            org.springframework.web.servlet.resource.NoResourceFoundException e) {
        return new ResponseEntity<>(ApiResponse.error(CommonErrorCode.RESOURCE_NOT_FOUND, resolve(CommonErrorCode.RESOURCE_NOT_FOUND)), HttpStatus.NOT_FOUND);
    }

    /**
     * 미매핑 경로의 {@code NoHandlerFoundException} 경유 — 위 {@code NoResourceFoundException} 과 짝이다. 어느 쪽인지는
     * {@code spring.web.resources.add-mappings} 가 정한다(true=운영 기본값 → 앞의 것, false=테스트 프로파일 → 이것). 둘을 같은
     * 404 로 묶어 정적 리소스 매핑을 꺼도 없는 경로가 500 이 되지 않게 한다.
     */
    @ExceptionHandler(org.springframework.web.servlet.NoHandlerFoundException.class)
    protected ResponseEntity<ApiResponse<Void>> handleNoHandlerFound(
            org.springframework.web.servlet.NoHandlerFoundException e) {
        return new ResponseEntity<>(ApiResponse.error(CommonErrorCode.RESOURCE_NOT_FOUND, resolve(CommonErrorCode.RESOURCE_NOT_FOUND)), HttpStatus.NOT_FOUND);
    }

    /**
     * DB 커넥션 획득 실패(Hikari 풀 고갈 / DB 다운)는 '지금 처리 불가'라 500 이 아닌 503 + {@code Retry-After} 다 — LB·클라이언트가
     * 재시도를 판단하고 모니터링이 버그와 구분한다. Hikari 예외는 Spring 변환을 거쳐 트랜잭션 시작 시
     * {@code CannotCreateTransactionException}, 쿼리 중 {@code DataAccessResourceFailureException} 으로 온다.
     */
    @ExceptionHandler({
            org.springframework.transaction.CannotCreateTransactionException.class,
            org.springframework.dao.DataAccessResourceFailureException.class })
    protected ResponseEntity<ApiResponse<Void>> handleConnectionUnavailable(Exception e) {
        log.error(">>> DB connection unavailable (pool exhausted or DB down): {}", e.getMessage(), e);
        return connectionUnavailableResponse();
    }

    private ResponseEntity<ApiResponse<Void>> connectionUnavailableResponse() {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .header(HttpHeaders.RETRY_AFTER, "5")
                .body(ApiResponse.error(CommonErrorCode.SERVER_OVERLOAD,
                        resolve("handler.service_unavailable", null,
                                "일시적으로 요청을 처리할 수 없습니다. 잠시 후 다시 시도해 주세요.")));
    }

    /** 최상위 처리. 정보 노출 방어로 내부 상세 메시지는 서버 로그에만 남기고 응답은 가린다(백엔드 헌법 제7조 2항). */
    @ExceptionHandler(Exception.class)
    protected ResponseEntity<ApiResponse<Void>> handleException(Exception e) {
        // 이름 없는 쿼리 파라미터(`?=`)는 Tomcat 이 InvalidParameterException 으로 거부한다 — 잘못된 요청이라 400 이다.
        //   컨테이너를 바꿔도 이 클래스가 로드되지 않도록 이름으로만 판별한다.
        if ("org.apache.tomcat.util.http.InvalidParameterException".equals(e.getClass().getName())) {
            log.warn(">>> Invalid request parameter: {}", e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(CommonErrorCode.INVALID_INPUT_VALUE,
                    resolve(CommonErrorCode.INVALID_INPUT_VALUE)));
        }
        log.error(">>> Internal Server Error: {} - ExceptionType: {}", e.getMessage(), e.getClass().getName(), e);
        return new ResponseEntity<>(
                ApiResponse.error(CommonErrorCode.INTERNAL_SERVER_ERROR,
                        resolve("handler.internal_error", null, "서버 내부 오류가 발생했습니다. 지속될 경우 관리자에게 문의해 주세요.")),
                HttpStatus.INTERNAL_SERVER_ERROR);
    }

    /** ErrorCode.code 키를 현재 로케일(Accept-Language)로 해석한다. 키가 없으면 ErrorCode.getMessage()(영문 기본값)다. */
    private String resolve(ErrorCode errorCode) {
        return resolve(errorCode.getCode(), null, errorCode.getMessage());
    }

    /** 키가 미등록이거나 MessageSource 가 없으면 defaultMessage 로 폴백한다. */
    private String resolve(String code, Object[] args, String defaultMessage) {
        if (messageSource == null) {
            return defaultMessage;
        }
        return messageSource.getMessage(code, args, defaultMessage, LocaleContextHolder.getLocale());
    }

    /** 호출부가 지정한 문구(ErrorCode 기본 메시지와 다름)는 그대로 쓰고, 기본 메시지이거나 null 이면 로케일 메시지로 해석한다. */
    private String resolveMessage(ErrorCode errorCode, String rawMessage) {
        if (rawMessage != null && !rawMessage.equals(errorCode.getMessage())) {
            return rawMessage;
        }
        return resolve(errorCode);
    }
}
