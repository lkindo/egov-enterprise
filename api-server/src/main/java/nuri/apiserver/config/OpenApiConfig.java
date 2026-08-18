package nuri.apiserver.config;

import org.springdoc.core.models.GroupedOpenApi;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;

/**
 * OpenAPI 3.0 (Swagger) 설정
 * 
 * API 문서를 자동 생성하고, JWT 인증을 지원합니다.
 * - http://localhost:8080/swagger-ui.html
 */
@Configuration
public class OpenApiConfig {

    static {
        // [W1-15] 유령 required 파라미터 제거.
        //
        //   springdoc 은 @AuthenticationPrincipal 을 기본으로 무시하지만(SpringDocSecurityConfiguration),
        //   이 프로젝트는 자체 메타애노테이션 @LoginUser 를 쓴다(14개소). springdoc 은 그것을 모르므로
        //   CustomUserDetails 를 **클라이언트가 보내야 하는 파라미터**로 문서화했다 —
        //   실제로는 서버가 SecurityContext 에서 주입하는 값이라, 스펙이 존재하지 않는 요구를 광고한 셈이다.
        //   그 결과 생성된 타입·Zod 스키마에도 유령 필드가 실렸다.
        //
        //   타입 기준(addRequestWrapperToIgnore)으로도 막는다 — @LoginUser 없이 CustomUserDetails 를
        //   직접 선언하는 경우까지 덮기 위해서다. 컨트롤러 파라미터는 하나도 건드리지 않는다.
        org.springdoc.core.utils.SpringDocUtils.getConfig()
                .addAnnotationsToIgnore(nuri.business.security.annotation.LoginUser.class)
                .addRequestWrapperToIgnore(nuri.foundation.security.service.CustomUserDetails.class);
    }

    /**
     * [W1-15] 표준 응답 봉투의 produces 를 와일드카드에서 {@code application/json} 으로 정정한다.
     *
     * <p>전 358개 응답이 와일드카드({@code *}&#47;{@code *})로 선언돼 있어, 생성된 클라이언트가
     * 응답 타입을 좁히지 못했다.
     * 다만 전역 {@code springdoc.default-produces-media-type} 으로 일괄 치환하면
     * <b>파일 다운로드 4건(string/binary)까지 JSON 이라고 거짓 표기</b>한다.
     *
     * <p>그래서 일괄 치환 대신 <b>스키마를 근거로 개별 판정</b>한다 — 응답 스키마가
     * 우리 표준 봉투({@code ApiResponse*})를 가리킬 때만 JSON 으로 확정하고, 그 외(바이너리 등)는
     * 손대지 않는다. 판정 근거가 스펙 자체에 있으므로 대상이 늘거나 줄어도 자동으로 맞는다.
     * (AGENTS.md Evidence guardrails H4 — 의미가 다른 호출부를 같은 방식으로 쓸어담지 않는다.)
     */
    @Bean
    public org.springdoc.core.customizers.OperationCustomizer jsonEnvelopeProducesCustomizer() {
        return (operation, handlerMethod) -> {
            io.swagger.v3.oas.models.responses.ApiResponses responses = operation.getResponses();
            if (responses == null) {
                return operation;
            }
            responses.values().forEach(response -> {
                io.swagger.v3.oas.models.media.Content content = response.getContent();
                if (content == null) {
                    return;
                }
                io.swagger.v3.oas.models.media.MediaType wildcard = content.get("*/*");
                if (wildcard == null || content.containsKey(APPLICATION_JSON)) {
                    return;
                }
                String ref = wildcard.getSchema() == null ? null : wildcard.getSchema().get$ref();
                if (ref == null || !ref.startsWith(ENVELOPE_REF_PREFIX)) {
                    return; // 표준 봉투가 아니다 — 실제 미디어 타입을 모르므로 그대로 둔다.
                }
                content.remove("*/*");
                content.addMediaType(APPLICATION_JSON, wildcard);
            });
            return operation;
        };
    }

    private static final String APPLICATION_JSON = "application/json";

    /** 표준 응답 봉투 스키마 참조 접두사 ({@code ApiResponseVoid}, {@code ApiResponseBoardDto} …). */
    private static final String ENVELOPE_REF_PREFIX = "#/components/schemas/ApiResponse";

    /** 에러 응답 본문 스키마. {@code data} 는 항상 null 이므로 Void 봉투가 정확한 표현이다. */
    private static final String ERROR_ENVELOPE_SCHEMA = "ApiResponseVoid";
    private static final String ERROR_ENVELOPE_REF = "#/components/schemas/" + ERROR_ENVELOPE_SCHEMA;

    /**
     * 미인증 접근이 허용되는 경로. {@code ApiSecurityConfig} 와 <b>같은 프로퍼티</b>를 읽는다 —
     * SSOT 는 {@code application.yml} 의 {@code security.whitelist} 하나이며, 여기서 복제하지 않는다.
     *
     * <p>⚠ 이 스펙은 <b>테스트 컨텍스트</b>에서 산출된다({@code OpenApiDocumentationTest}).
     * {@code src/test/resources/application.yml} 이 main 을 shadow 하므로 그쪽에도 같은 키가 선언돼
     * 있어야 하며, 실제로 선언돼 있다(그 파일 주석 참조). 한쪽만 지우면 컨텍스트 로딩이 깨진다.
     */
    @org.springframework.beans.factory.annotation.Value("${security.whitelist}")
    private java.util.List<String> whitelist;

    /**
     * [2026-08-15] 공통 에러 응답을 스펙에 주입한다.
     *
     * <p>[문제] 실측 결과 <b>357개 오퍼레이션 전부가 {@code 200} 만 선언</b>하고 있었다.
     * 반면 {@code CommonErrorCode} 에는 24종의 코드가 HttpStatus 매핑까지 갖춰 정의돼 있고
     * {@code GlobalExceptionHandler} 가 그것을 실제로 반환한다 — <b>계약이 코드에는 있고 스펙에는
     * 없는</b> 상태였다. 그 결과 {@code openapi-typescript} 가 생성하는 타입에 에러 형태가 없어,
     * 클라이언트는 실패 응답을 추측으로 처리해야 했다. 계약 드리프트 게이트 3종은 성공 경로만
     * 지키고 있었던 셈이다.
     *
     * <p>[왜 컨트롤러 66개에 애노테이션을 달지 않는가] 그 방식은 66개 파일을 건드리고, 새 컨트롤러가
     * 추가될 때마다 사람이 기억해야 하므로 <b>반드시 빠진다</b>. 여기서 한 번 주입하면 대상이 늘거나
     * 줄어도 자동으로 맞는다.
     *
     * <p>[왜 일괄 주입이 아닌가 — AGENTS.md Evidence guardrails H4] 모든 오퍼레이션에 같은 코드를 쓸어 담으면 스펙이 거짓말을
     * 한다. 그래서 <b>스펙 자체를 근거로 개별 판정</b>한다(위 {@code jsonEnvelopeProducesCustomizer}
     * 와 같은 원칙):
     * <ul>
     *   <li>{@code 400}·{@code 500} — 모든 오퍼레이션. 검증 실패와 서버 오류는 어느 경로에서나 난다.</li>
     *   <li>{@code 401}·{@code 403} — <b>whitelist 에 매칭되지 않는</b> 경로만. permitAll 경로는
     *       미인증으로 401 을 내지 않으므로 붙이면 오히려 틀린 문서가 된다.</li>
     *   <li>{@code 404} — <b>경로 변수를 가진</b> 오퍼레이션만. 식별자로 조회하지 않는 목록 API 에
     *       404 를 광고할 이유가 없다.</li>
     *   <li>{@code 409} — <b>붙이지 않는다.</b> 중복·낙관적 락 충돌은 도메인마다 성립 조건이 달라
     *       기계가 판정할 수 없다. 필요한 컨트롤러가 {@code @ApiResponse} 로 개별 선언할 몫이다.</li>
     * </ul>
     *
     * <p>이미 선언된 상태 코드는 <b>덮어쓰지 않는다</b> — 컨트롤러가 명시한 구체적 설명이 이 일반
     * 설명보다 항상 정확하기 때문이다.
     *
     * <p>{@code OperationCustomizer} 가 아니라 {@code OpenApiCustomizer} 인 이유: 401/404 판정에
     * <b>경로 문자열</b>이 필요한데, {@code Operation} 객체는 자신이 어느 경로에 속하는지 모른다.
     */
    @Bean
    public org.springdoc.core.customizers.OpenApiCustomizer commonErrorResponsesCustomizer() {
        return openApi -> {
            if (openApi.getPaths() == null) {
                return;
            }
            boolean envelopeAvailable = openApi.getComponents() != null
                    && openApi.getComponents().getSchemas() != null
                    && openApi.getComponents().getSchemas().containsKey(ERROR_ENVELOPE_SCHEMA);

            java.util.List<org.springframework.web.util.pattern.PathPattern> publicPatterns =
                    parsePatterns(this.whitelist);

            openApi.getPaths().forEach((path, pathItem) -> {
                boolean isPublic = matchesAny(publicPatterns, path);
                boolean hasPathVariable = path.indexOf('{') >= 0;

                pathItem.readOperations().forEach(operation -> {
                    io.swagger.v3.oas.models.responses.ApiResponses responses = operation.getResponses();
                    if (responses == null) {
                        return;
                    }
                    putIfAbsent(responses, "400",
                            "요청 값이 유효하지 않음 — 검증 실패 시 errors[] 에 필드별 사유가 실린다 (code: C001/C005/C009)",
                            envelopeAvailable);
                    if (!isPublic) {
                        putIfAbsent(responses, "401",
                                "인증되지 않음 — 토큰이 없거나 만료·위조 (code: A001/A002/A003)",
                                envelopeAvailable);
                        putIfAbsent(responses, "403",
                                "권한 부족 — 인증은 되었으나 해당 자원에 대한 권한이 없음 (code: C010)",
                                envelopeAvailable);
                    }
                    if (hasPathVariable) {
                        putIfAbsent(responses, "404",
                                "대상을 찾을 수 없음 (code: C003/C007)",
                                envelopeAvailable);
                    }
                    putIfAbsent(responses, "500",
                            "서버 내부 오류 (code: C004/S001)",
                            envelopeAvailable);
                });
            });
        };
    }

    /**
     * 에러 응답을 <b>없을 때만</b> 넣는다. 컨트롤러가 이미 선언한 코드는 그쪽이 더 정확하므로 존중한다.
     */
    private static void putIfAbsent(io.swagger.v3.oas.models.responses.ApiResponses responses,
            String statusCode, String description, boolean envelopeAvailable) {
        if (responses.containsKey(statusCode)) {
            return;
        }
        io.swagger.v3.oas.models.responses.ApiResponse response =
                new io.swagger.v3.oas.models.responses.ApiResponse().description(description);
        if (envelopeAvailable) {
            response.content(new io.swagger.v3.oas.models.media.Content()
                    .addMediaType(APPLICATION_JSON, new io.swagger.v3.oas.models.media.MediaType()
                            .schema(new io.swagger.v3.oas.models.media.Schema<>().$ref(ERROR_ENVELOPE_REF))));
        }
        responses.addApiResponse(statusCode, response);
    }

    /**
     * whitelist 패턴을 파싱한다. 파싱 실패한 패턴은 <b>조용히 버리지 않고</b> 예외로 드러낸다 —
     * 매칭에서 빠지면 그 경로에 401 이 잘못 붙는데, 그것은 문서가 틀리는 방향의 실패라 침묵시키면 안 된다.
     */
    private static java.util.List<org.springframework.web.util.pattern.PathPattern> parsePatterns(
            java.util.List<String> patterns) {
        if (patterns == null) {
            return java.util.List.of();
        }
        org.springframework.web.util.pattern.PathPatternParser parser =
                new org.springframework.web.util.pattern.PathPatternParser();
        return patterns.stream()
                .map(pattern -> pattern.trim())
                .filter(pattern -> !pattern.isEmpty())
                .map(pattern -> parser.parse(pattern))
                .toList();
    }

    private static boolean matchesAny(
            java.util.List<org.springframework.web.util.pattern.PathPattern> patterns, String path) {
        org.springframework.http.server.PathContainer container =
                org.springframework.http.server.PathContainer.parsePath(path);
        return patterns.stream().anyMatch(pattern -> pattern.matches(container));
    }

    /**
     * 전체 API 그룹 (v1)
     */
    @Bean
    public GroupedOpenApi allApi() {
        return GroupedOpenApi.builder()
                .group("all")
                .pathsToMatch("/api/v1/**")
                .build();
    }

    /**
     * 관리자 API 그룹
     */
    @Bean
    public GroupedOpenApi adminApi() {
        return GroupedOpenApi.builder()
                .group("admin")
                .pathsToMatch("/api/v1/admin/**")
                .build();
    }

    /**
     * 공통코드 API 그룹
     */
    @Bean
    public GroupedOpenApi commonCodeApi() {
        return GroupedOpenApi.builder()
                .group("common-code")
                .pathsToMatch("/api/v1/common-codes/**")
                .build();
    }

    /**
     * 사용자 API 그룹
     */
    @Bean
    public GroupedOpenApi userApi() {
        return GroupedOpenApi.builder()
                .group("user")
                .pathsToMatch("/api/v1/users/**")
                .build();
    }

    /**
     * 게시판 API 그룹
     */
    @Bean
    public GroupedOpenApi boardApi() {
        return GroupedOpenApi.builder()
                .group("board")
                .pathsToMatch("/api/v1/boards/**")
                .build();
    }

    /**
     * 파운데이션 API 그룹
     */
    @Bean
    public GroupedOpenApi foundationApi() {
        return GroupedOpenApi.builder()
            .group("1-foundation")
            .pathsToMatch("/api/v1/auth/**", "/api/v1/users/**", "/api/v1/codes/**")
            .build();
    }

    /**
     * 비즈니스 스위트 API 그룹
     */
    @Bean
    public GroupedOpenApi businessApi() {
        return GroupedOpenApi.builder()
            .group("2-business-suite")
            .pathsToMatch("/api/v1/**")
            .pathsToExclude("/api/v1/auth/**", "/api/v1/users/**", "/api/v1/codes/**")
            .build();
    }

    /**
     * OpenAPI 커스텀 설정
     */
    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("eGov Enterprise API")
                        .description("""
                                ### 전자정부 프레임워크 모더니제이션 API 문서
                                
                                본 API 는 Next.js 15 + Spring Boot 3.4 기반의 전자정부 표준프레임워크 공통 컴포넌트를 제공합니다.
                                
                                #### 주요 기능
                                - 시스템 관리 (공통코드, 메뉴, 권한)
                                - 협업 (게시판, 동호회, 주소록)
                                - 운영 지원 (일정, 보고서, 설문)
                                - 통계 및 분석
                                
                                #### 인증
                                - JWT 토큰 기반 인증
                                - Bearer 토큰을 Authorization 헤더에 추가
                                """)
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("eGov Enterprise Team")
                                .email("support@egovframe.go.kr")
                                .url("https://www.egovframe.go.kr"))
                        .license(new License()
                                .name("Apache 2.0")
                                .url("https://www.apache.org/licenses/LICENSE-2.0")))
                .addServersItem(new Server()
                        .url("/api/v1")
                        .description("Current environment"))
                .addServersItem(new Server()
                        .url("http://localhost:8080/api/v1")
                        .description("Local Development"))
                .addSecurityItem(new SecurityRequirement()
                        .addList("bearerAuth"))
                .components(new Components()
                        .addSecuritySchemes("bearerAuth",
                                new SecurityScheme()
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")
                                        .in(SecurityScheme.In.HEADER)
                                        .name("Authorization")
                                        .description("JWT 토큰을 입력하세요 (Bearer 제외)")));
    }
}
