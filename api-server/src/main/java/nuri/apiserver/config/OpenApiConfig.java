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
     * (GEMINI.md §0.7-H4 — 의미가 다른 호출부를 같은 방식으로 쓸어담지 않는다.)
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
