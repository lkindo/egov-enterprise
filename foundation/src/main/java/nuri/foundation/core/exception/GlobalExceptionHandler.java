package nuri.foundation.core.exception;


import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.storage.StorageObjectMissingException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
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
     * 저장소 드리프트 — DB 에는 첨부 레코드가 있는데 저장소에 실물이 없다.
     *
     * <p>[왜 별도 핸들러인가] 응답은 다른 404 와 <b>똑같아야 한다</b>(존재 여부 누출 방지).
     * 달라야 하는 것은 <b>서버가 이 사건을 어떻게 기록하는가</b>다. 일반 404 와 같은 WARN 한 줄로
     * 묻히면 파일 유실을 아무도 모른 채 사용자가 깨진 이미지로 발견하게 된다(2026-08-26 실측).
     *
     * <p>그래서 ERROR 로 올리고 <b>저장소 경로·파일명</b>을 함께 남긴다 — 복구 대상을 특정할 수 있어야
     * 조치가 가능하다. 원본 파일명은 사용자 입력이라 남기지 않는다.
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

        // [W1-14] 종전에는 필드 오류들을 ", " 로 이어 붙인 문장 하나만 내려보내, 클라이언트가
        //   **어떤 입력이 틀렸는지** 알 수 없었다. 사용자는 폼 전체를 훑으며 스스로 찾아야 했다.
        //   message 는 그대로 두어 그것을 읽던 클라이언트를 깨지 않고, 필드 정보를 덧붙이기만 한다.
        String message = e.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getDefaultMessage())
                .collect(Collectors.joining(", "));

        java.util.List<nuri.foundation.core.response.FieldErrorItem> fieldErrors =
                e.getBindingResult().getFieldErrors().stream()
                        .map(error -> new nuri.foundation.core.response.FieldErrorItem(
                                error.getField(), error.getDefaultMessage()))
                        .toList();

        return ResponseEntity.badRequest()
                .body(ApiResponse.error(CommonErrorCode.INVALID_INPUT_VALUE, message, fieldErrors));
    }

    /**
     * 컨테이너 원소·메서드 파라미터 검증 실패 처리.
     *
     * <p>Spring 6은 {@code List<@Valid T>}처럼 메서드 수준 제약을
     * {@link HandlerMethodValidationException}으로 전달하므로 일반 DTO 검증과 같은 400 계약으로 맞춘다.</p>
     */
    @ExceptionHandler(HandlerMethodValidationException.class)
    protected ResponseEntity<ApiResponse<Object>> handleHandlerMethodValidationException(
            HandlerMethodValidationException e) {
        log.warn(">>> Handler Method Validation Failed: {}", e.getMethod().getName());
        return ResponseEntity.badRequest()
                .body(ApiResponse.error(CommonErrorCode.INVALID_INPUT_VALUE,
                        resolve(CommonErrorCode.INVALID_INPUT_VALUE)));
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
     *
     * <p>응답 메시지는 실패 사유와 무관하게 하나로 둔다. 인증 제공자는 비밀번호 확인 전에 계정 상태를
     * 검사하므로(잠긴 동안 비밀번호 정답 여부를 알려 주지 않기 위해서다), 예외 메시지를 그대로 돌려주면
     * 비밀번호 없이도 "없는 계정·잠긴 계정·비활성 계정" 을 구분할 수 있었다. 사유는 서버 로그에만 남긴다.
     * 브라우저 로그인 경로(BFF)는 이미 모든 4xx 를 같은 문구로 바꾸며, 이 처리는 API 직접 호출도 같게 만든다.
     */
    @ExceptionHandler(AuthenticationException.class)
    protected ResponseEntity<ApiResponse<Void>> handleAuthenticationException(AuthenticationException e) {
        log.warn(">>> Authentication Failed: {} ({})", e.getMessage(), e.getClass().getSimpleName());
        return new ResponseEntity<>(ApiResponse.error(CommonErrorCode.UNAUTHORIZED, resolve(CommonErrorCode.UNAUTHORIZED)), HttpStatus.UNAUTHORIZED);
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
     * 데이터 무결성 위반(주로 유니크 제약) 예외 처리 — 500 이 아닌 409(Conflict).
     * check-then-act(중복 검사 후 insert) 패턴은 동시 요청 경합 시 pre-check 를 함께 통과해
     * 두 번째 커밋/flush 에서 유니크 제약 위반이 발생한다. 데이터는 제약으로 보호되지만, 미처리 시
     * 500 으로 응답되어 계약이 어긋난다. 이를 409(DUPLICATE_RESOURCE)로 정정한다.
     * (NOT NULL/FK 등 서버측 위반도 여기로 오지만, 원인은 log 로 남겨 모니터링 가시성을 유지한다.)
     * ※ 특정 제약을 도메인 의미로 변환해야 하는 경로(예: 투표 이중참여)는 서비스에서 BusinessException 으로
     *    선(先)변환하므로 이 핸들러에 도달하지 않는다.
     */
    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    protected ResponseEntity<ApiResponse<Void>> handleDataIntegrityViolation(
            org.springframework.dao.DataIntegrityViolationException e) {
        Throwable cause = e.getMostSpecificCause();
        log.warn(">>> Data Integrity Violation: {}", cause != null ? cause.getMessage() : e.getMessage());

        // [2026-07-28 §2.D] 제약의 **종류**로 나눈다. 종전에는 모든 무결성 위반을 409 "이미 존재하거나
        //   사용 중인 값" 으로 뭉갰다. 그런데 V2_24 로 `_yn` 컬럼 60개에 CHECK 가 생기면서, 클라이언트가
        //   `dltYn:"X"` 같은 **허용되지 않는 값**을 보내도 "중복입니다" 라는 **의미가 틀린 409** 가 나갔다.
        //   불변식이 DB 에만 있고 API 응답 의미로 전파되지 않던 것(§2.D "불변식이 한 레이어에만 존재").
        //   DTO 56곳에 @Pattern 을 뿌리는 대신(AGENTS.md Evidence guardrails H4 일괄치환 회피) 여기서 SQLState 로 갈라
        //   CHECK/NOT NULL 은 400 으로 정정한다. UNIQUE/FK 는 종전대로 409(의미가 맞다).
        String sqlState = extractSqlState(cause);
        if ("23514".equals(sqlState) || "23502".equals(sqlState)) { // check_violation / not_null_violation
            return ResponseEntity.badRequest().body(ApiResponse.error(CommonErrorCode.INVALID_INPUT_VALUE,
                    resolve("handler.constraint_invalid_value", null,
                            "허용되지 않는 값이 포함되어 있습니다. 입력값을 확인해 주십시오.")));
        }
        return new ResponseEntity<>(
                ApiResponse.error(CommonErrorCode.DUPLICATE_RESOURCE,
                        resolve("handler.data_integrity", null,
                                "요청이 기존 데이터 제약과 충돌합니다. 이미 존재하거나 사용 중인 값일 수 있습니다.")),
                HttpStatus.CONFLICT);
    }

    /** 원인 체인에서 SQLState 를 찾는다(Postgres: 23514=CHECK, 23502=NOT NULL, 23505=UNIQUE, 23503=FK). */
    private static String extractSqlState(Throwable cause) {
        for (Throwable t = cause; t != null; t = t.getCause() == t ? null : t.getCause()) {
            if (t instanceof java.sql.SQLException sqlEx && sqlEx.getSQLState() != null) {
                return sqlEx.getSQLState();
            }
        }
        return null;
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
        // [ADR-0024 2단계] HTTP 변환기가 Jackson 3 이므로 원인 예외도 tools.jackson 타입이다. 종전 Jackson 2 타입으로
        //   판별하면 조용히 빗나가 필드 이름이 없는 일반 메시지로 떨어진다.
        if (e.getCause() instanceof tools.jackson.databind.exc.UnrecognizedPropertyException cause) {
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
     * 경로/쿼리 파라미터 타입 불일치 예외 처리 — 500 이 아닌 400(Bad Request).
     * 예) GET /api/v1/menus/abc (menuNo=Long 기대) → TypeMismatch. 잘못된 요청이므로 400 이 정확하다.
     */
    @ExceptionHandler(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class)
    protected ResponseEntity<ApiResponse<Void>> handleMethodArgumentTypeMismatch(
            org.springframework.web.method.annotation.MethodArgumentTypeMismatchException e) {
        return new ResponseEntity<>(ApiResponse.error(CommonErrorCode.INVALID_TYPE_VALUE, resolve(CommonErrorCode.INVALID_TYPE_VALUE)), HttpStatus.BAD_REQUEST);
    }

    /**
     * 필수 요청 값 누락 — 500 이 아닌 400(Bad Request).
     *
     * <p>[2026-09-24 ZAP API 스캔] 이 클래스는 {@code ResponseEntityExceptionHandler} 를 상속하지 않아, Spring 이
     * 기본으로 400 을 주는 누락 예외까지 최상위 {@code Exception} 처리로 떨어져 500 이 됐다 — 예)
     * {@code GET /api/v1/comments}(pstSn 없음), {@code GET /api/v1/menus/left?menuNo=}(빈 값). 요청이 잘못된 것이다.
     * 파라미터 이름은 서버 코드가 정한 값이라 안내에 싣는다.
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
     * 업로드가 서블릿 크기 한도({@code spring.servlet.multipart.max-file-size}·{@code max-request-size})를 넘었다 — 413.
     *
     * <p>[2026-09-24 ZAP API 스캔 후속] 처리기가 없어 한도를 넘는 파일을 올린 사용자가 "서버 내부 오류" 를 받았다
     * (11MB 파일로 재현). edge nginx 가 본문 한도를 넘긴 요청에 주는 상태와 같은 413 이다. 한도는 환경 변수로
     * 바뀌므로 문구에 숫자를 싣지 않는다.
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
     * multipart 본문을 해석하지 못했다. 본문 형식이 잘못된 경우만 400 이다 — 잘리거나 경계가 맞지 않는 본문,
     * 경계가 없는 Content-Type, form-data 가 아닌 multipart 유형.
     *
     * <p>같은 예외가 임시 파일을 쓰지 못한 서버 쪽 IO 실패에서도 나오므로, 원인 사슬의 가장 안쪽 예외가 형식 거부일
     * 때만 좁히고 나머지는 종전대로 500 이다. 컨테이너 클래스를 로드하지 않도록 이름으로 판별한다.
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
     * 요청의 정렬 값 때문에 난 경우만 400 이다. 두 갈래가 있다.
     * <ul>
     *   <li>{@code ?sort=[crtDt,DESC]} — 파생 쿼리에서 {@code QueryUtils.checkSortExpression} 이 거부한다.</li>
     *   <li>{@code ?sort=nope} — {@code @Query} 에 정렬을 붙이는 저장소에서 Hibernate 가
     *       {@code UnknownPathException}("Could not resolve attribute 'nope'")으로 거부한다.</li>
     * </ul>
     * 같은 예외 타입은 코드 결함(잘못된 저장소 사용·JPQL 오타)에서도 나오므로, 정렬 검사 프레임이거나 해석하지
     * 못한 속성이 요청의 {@code sort} 값에 실제로 있을 때만 좁히고 나머지는 종전대로 500 이다.
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

    /**
     * 미매핑 경로(존재하지 않는 엔드포인트/정적 리소스) 예외 처리 — 500 이 아닌 404(Not Found).
     * Spring Boot 3.2+ DispatcherServlet 은 미매핑 요청에서 NoResourceFoundException 을 던진다.
     */
    @ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class)
    protected ResponseEntity<ApiResponse<Void>> handleNoResourceFound(
            org.springframework.web.servlet.resource.NoResourceFoundException e) {
        return new ResponseEntity<>(ApiResponse.error(CommonErrorCode.RESOURCE_NOT_FOUND, resolve(CommonErrorCode.RESOURCE_NOT_FOUND)), HttpStatus.NOT_FOUND);
    }

    /**
     * 미매핑 경로 — {@code NoHandlerFoundException} 경유. 위 {@code NoResourceFoundException} 과 짝이다.
     *
     * <p>[W1-04 발견] 둘 중 어느 예외가 던져지는지는 {@code spring.web.resources.add-mappings} 에 갈린다.
     * <ul>
     *   <li>add-mappings=true(운영 기본값) → 정적 리소스 핸들러가 받아 {@code NoResourceFoundException}</li>
     *   <li>add-mappings=false(테스트 프로파일) → {@code NoHandlerFoundException}</li>
     * </ul>
     * 종전에는 전자만 처리해 후자가 최상위 {@code Exception} 핸들러로 떨어졌고, 그 결과
     * <b>존재하지 않는 API 경로가 404 가 아니라 500</b> 으로 응답했다.
     * 테스트 프로파일에서만 발현하던 잠복 결함이지만, 정적 리소스 매핑을 끄는 순간
     * 운영에서도 모든 404 가 500 이 된다 — 두 예외를 같은 결론으로 묶어 그 분기를 없앤다.
     *
     * <p>이 갭은 인가 테스트의 단언을 {@code not(403)} 에서 강화하면서 드러났다.
     * 종전 단언은 500 응답도 '인가 통과' 로 계상했기 때문에 존재하지 않는 경로를 검사하고 있다는
     * 사실 자체가 보이지 않았다.
     */
    @ExceptionHandler(org.springframework.web.servlet.NoHandlerFoundException.class)
    protected ResponseEntity<ApiResponse<Void>> handleNoHandlerFound(
            org.springframework.web.servlet.NoHandlerFoundException e) {
        return new ResponseEntity<>(ApiResponse.error(CommonErrorCode.RESOURCE_NOT_FOUND, resolve(CommonErrorCode.RESOURCE_NOT_FOUND)), HttpStatus.NOT_FOUND);
    }

    /**
     * DB 커넥션 획득 실패(Hikari 풀 고갈 / DB 다운) — 500 이 아닌 503(Service Unavailable).
     *
     * <p>풀 고갈은 '서버 고장'이 아니라 '지금 처리 불가'다. 500 으로 내보내면 LB·클라이언트가
     * 재시도 가능한 상황인지 판단할 수 없고, 모니터링에서도 애플리케이션 버그와 구분되지 않는다.
     * 표준 {@code Retry-After} 를 함께 내려 재시도 가능함을 알린다.
     *
     * <p>HikariCP 의 {@code SQLTransientConnectionException} 은 Spring 예외 변환을 거쳐 도달하므로
     * 그 타입을 직접 잡으면 매칭되지 않는다. 실제 도달 경로는 두 갈래다:
     * <ul>
     *   <li>트랜잭션 시작 시점 → {@code CannotCreateTransactionException}</li>
     *   <li>쿼리 실행 중 → {@code DataAccessResourceFailureException}</li>
     * </ul>
     *
     * <p>[순서] 이 핸들러가 connection-timeout 단축보다 반드시 먼저 들어가야 한다.
     * 타임아웃만 줄이면 거절이 대량 500 으로 표면화된다.
     */
    @ExceptionHandler({
            org.springframework.transaction.CannotCreateTransactionException.class,
            org.springframework.dao.DataAccessResourceFailureException.class })
    protected ResponseEntity<ApiResponse<Void>> handleConnectionUnavailable(Exception e) {
        log.error(">>> DB connection unavailable (pool exhausted or DB down): {}", e.getMessage(), e);
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .header(HttpHeaders.RETRY_AFTER, "5")
                .body(ApiResponse.error(CommonErrorCode.SERVER_OVERLOAD,
                        resolve("handler.service_unavailable", null,
                                "일시적으로 요청을 처리할 수 없습니다. 잠시 후 다시 시도해 주세요.")));
    }

    /**
     * 최상위 공통 예외 처리
     * 백엔드 헌법 제7조 2항 및 정보 노출(Information Disclosure) 취약점 방어를 위해
     * 내부 상세 메시지는 서버 로그(log.error)로만 남기고, 클라이언트 응답은 마스킹하여 반환.
     */
    @ExceptionHandler(Exception.class)
    protected ResponseEntity<ApiResponse<Void>> handleException(Exception e) {
        // [2026-09-24 ZAP API 스캔] 이름 없는 쿼리 파라미터(`?=`)는 Tomcat 이 파라미터를 읽을 때
        //   InvalidParameterException(IllegalStateException 계열)으로 거부한다. 요청이 잘못된 것이라 400 이다.
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
