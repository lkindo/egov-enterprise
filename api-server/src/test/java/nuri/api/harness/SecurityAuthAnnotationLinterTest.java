package nuri.api.harness;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.annotation.AnnotationUtils;
import org.springframework.security.access.annotation.Secured;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.mvc.method.RequestMappingInfo;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.fail;

/**
 * 🔐 Spring Security API 권한 제어 어노테이션 유실 방지 하네스
 * 
 * 모든 REST 컨트롤러의 엔드포인트를 리플렉션 기술로 전수 조사하여,
 * 화이트리스트(Public API)를 제외한 모든 비공개 비즈니스 API에
 * @PreAuthorize 또는 @Secured 와 같은 보안 어노테이션이 반드시 선언되어 있는지 오딧합니다.
 * 이를 통해 개발자가 실수로 특정 API에 권한 제어를 누락하는 것을 차단합니다.
 */
@SpringBootTest(classes = nuri.ApiServerApplication.class)
@ActiveProfiles("test")
class SecurityAuthAnnotationLinterTest {

    @Autowired
    private WebApplicationContext context;

    // 허용되는 비인가/퍼블릭 및 공통 엔드포인트 화이트리스트 패턴
    private static final List<String> PUBLIC_PATH_WHITELIST = List.of(
            "/api/v1/health",
            "/api/v1/auth",
            "/api/v1/public",
            "/api/v1/menus",       // 프론트엔드 UI 라우터 참조용 허용
            "/api/v1/images",
            "/api/v1/users/signup",
            "/api/v1/users/check-id",
            "/actuator/health",
            "/error"
    );

    @Test
    @DisplayName("🔐 Spring Security API 권한 제어 어노테이션 유실 오딧")
    void auditSecurityAnnotationsOnRestControllers() {
        RequestMappingHandlerMapping mapping = context.getBean("requestMappingHandlerMapping", RequestMappingHandlerMapping.class);
        Map<RequestMappingInfo, HandlerMethod> handlerMethods = mapping.getHandlerMethods();

        List<String> violations = new ArrayList<>();

        for (Map.Entry<RequestMappingInfo, HandlerMethod> entry : handlerMethods.entrySet()) {
            RequestMappingInfo mappingInfo = entry.getKey();
            HandlerMethod handlerMethod = entry.getValue();

            Method method = handlerMethod.getMethod();
            Class<?> controllerClass = handlerMethod.getBeanType();

            // 1. WebSocket/STOMP 등 비-REST 엔드포인트 패스
            if (AnnotationUtils.findAnnotation(controllerClass, RestController.class) == null &&
                AnnotationUtils.findAnnotation(controllerClass, Controller.class) == null) {
                continue;
            }

            // 2. api-server의 커스텀 신규 API 컨트롤러(nuri.api.controller)만 엄격 린트 대상 지정
            // (레거시/공통 패키지는 글로벌 Spring Security 필터로 격리되어 오딧 대상에서 제외)
            if (!controllerClass.getPackageName().startsWith("nuri.api.controller")) {
                continue;
            }

            // [MIGRATION EXCEPTION] business-suite와 foundation에서 병합된 컨트롤러들은 
            // ApiSecurityConfig의 글로벌 필터링 정책을 우선 따르므로 강제 Linter 대상에서 제외합니다.
            String packageName = controllerClass.getPackageName();
            if (packageName.startsWith("nuri.api.controller.business") || packageName.startsWith("nuri.api.controller.foundation")) {
                continue;
            }

            // 3. 해당 메서드에 연결된 URL 추출
            Set<String> patterns = mappingInfo.getDirectPaths();
            if (patterns.isEmpty()) {
                patterns = mappingInfo.getPatternValues();
            }

            for (String pattern : patterns) {
                // 3. 화이트리스트에 포함되는 패턴은 오딧 건너뜀 (Public API)
                if (isWhitelisted(pattern)) {
                    continue;
                }

                // 4. 권한 제어 어노테이션이 클래스 레벨 또는 메서드 레벨에 존재하는지 확인
                boolean hasPreAuthorize = AnnotationUtils.findAnnotation(method, PreAuthorize.class) != null ||
                                          AnnotationUtils.findAnnotation(controllerClass, PreAuthorize.class) != null;
                
                boolean hasSecured = AnnotationUtils.findAnnotation(method, Secured.class) != null ||
                                      AnnotationUtils.findAnnotation(controllerClass, Secured.class) != null;

                // 4.2 커스텀 PermitAllRoute 어노테이션이 선언되어 있는지도 확인
                boolean hasPermitAllRoute = AnnotationUtils.findAnnotation(method, nuri.foundation.core.annotation.PermitAllRoute.class) != null ||
                                            AnnotationUtils.findAnnotation(controllerClass, nuri.foundation.core.annotation.PermitAllRoute.class) != null;

                // 5. 어떠한 권한 검증 어노테이션도 없으면 위반 처리
                if (!hasPreAuthorize && !hasSecured && !hasPermitAllRoute) {
                    violations.add(String.format("Controller: %s\n   Method: %s\n   Endpoint: %s\n   -> [해결책] @PreAuthorize(\"hasRole('...')\") 또는 @PreAuthorize(\"isAuthenticated()\")를 기입하십시오.",
                            controllerClass.getSimpleName(), method.getName(), pattern));
                }
            }
        }

        if (!violations.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            sb.append("\n========================================================================\n");
            sb.append("🚨 [SECURITY HARNESS] 권한 제어 어노테이션 누락 감지! 빌드 실패 처리!\n");
            sb.append("========================================================================\n");
            for (String v : violations) {
                sb.append("❌ ").append(v).append("\n");
            }
            sb.append("\n해결책: 비공개 API에 권한 어노테이션을 누락하면 심각한 제로데이 권한 우회 위협(OWASP Top 10)에 처합니다.\n");
            sb.append("만약 의도적인 퍼블릭 API라면 'SecurityAuthAnnotationLinterTest.java'의 화이트리스트에 등록하거나,\n");
            sb.append("해당 API에 @PreAuthorize(\"isAuthenticated()\") 또는 적절한 Role 권한을 강제 적용하십시오.\n");
            fail(sb.toString());
        }
    }

    /**
     * 비-admin 경로 쓰기 엔드포인트 중 클래스/메서드 @PreAuthorize 대신 <b>다른 계층에서 인가</b>하는 컨트롤러.
     * (서비스 계층 소유권 가드 SecurityUtil.assertOwnerOrAdmin, 또는 자기서비스/공개, 또는 서비스 내부 hasRole 검사)
     *
     * <p>⚠ 신규 <b>관리자 콘텐츠</b> 컨트롤러(비-admin 경로)는 이 목록에 추가하지 말고 반드시 쓰기 메서드에
     * {@code @PreAuthorize("hasAnyRole('ADMIN','SYSTEM')")} 를 붙일 것. 이 목록에 무분별 추가는 인가 우회를 방치한다.
     */
    private static final Set<String> WRITE_AUTHZ_GUARDED_ELSEWHERE = Set.of(
            "AddressBookApiController",   // 소유권 가드(assertOwnerOrAdmin)
            "ScrapApiController",         // 소유권 가드
            "ScheduleApiController",      // 소유권 가드
            "MemoReportApiController",    // 소유권 가드
            "CommentApiController",       // 소유권 가드(익명 댓글은 비밀번호)
            "WorkReportApiController",    // 소유권 가드(assertOwnerOrAdmin)
            "NoteApiController",          // 소유권 가드(by-id 스코프)
            "MailApiController",          // 사용자 본인 메일
            "NotificationApiController",  // 사용자 본인 알림
            "BbsApiController",           // 게시글 작성=자기서비스, 수정/삭제=소유권 가드
            "BoardApiController",         // 동상
            "PollApiController",          // 투표=자기서비스, 관리 CRUD=서비스 hasRole(ADMIN)
            "CommunityUserApiController", // 커뮤니티 가입=자기서비스
            "ApprovalApiController",          // 결재 확정=서비스 소유권(aprvrId) 검사
            "InformalSanctionApiController",  // 결재(비정형)=서비스 소유권(confirm=aprvrId, update/delete=aplcntId) 검사
            "FileApiController",              // 파일 업로드=자기서비스(본인 첨부)
            "DeptJobApiController"            // [보류] 부서 공유 리소스 — 소유 모델 제품결정 대기(임시 예외; 결정 후 가드 추가)
    );

    /**
     * 🔐 비-admin 경로 <b>쓰기(POST/PUT/DELETE/PATCH)</b> 엔드포인트 인가 누락 오딧.
     *
     * <p>{@code /api/v1/admin/**} 는 URL 시큐리티(ApiSecurityConfig)가 ADMIN/SYSTEM 으로 보호하므로 제외한다.
     * 그 외 경로의 쓰기 엔드포인트는 {@code anyRequest().authenticated()} 만 걸려 일반 사용자도 도달하므로,
     * 관리자 콘텐츠라면 메서드/클래스 {@code @PreAuthorize} 로, 소유권/자기서비스라면 위 allow-list(다른 계층 인가)로
     * 반드시 인가를 명시해야 한다. (기존 린터가 통째로 skip 하던 business/foundation 패키지의 인가 누락 재발 방지)
     */
    @Test
    @DisplayName("🔐 비-admin 경로 쓰기 엔드포인트 인가 누락 오딧 (business/foundation 포함)")
    void auditWriteEndpointAuthorizationOnNonAdminPaths() {
        RequestMappingHandlerMapping mapping = context.getBean("requestMappingHandlerMapping", RequestMappingHandlerMapping.class);
        Map<RequestMappingInfo, HandlerMethod> handlerMethods = mapping.getHandlerMethods();

        List<String> violations = new ArrayList<>();

        for (Map.Entry<RequestMappingInfo, HandlerMethod> entry : handlerMethods.entrySet()) {
            RequestMappingInfo mappingInfo = entry.getKey();
            HandlerMethod handlerMethod = entry.getValue();
            Method method = handlerMethod.getMethod();
            Class<?> controllerClass = handlerMethod.getBeanType();

            if (AnnotationUtils.findAnnotation(controllerClass, RestController.class) == null &&
                AnnotationUtils.findAnnotation(controllerClass, Controller.class) == null) {
                continue;
            }
            if (!controllerClass.getPackageName().startsWith("nuri.api.controller")) {
                continue;
            }

            // 쓰기(상태변경) HTTP 메서드만 대상
            Set<RequestMethod> httpMethods = mappingInfo.getMethodsCondition().getMethods();
            boolean isWrite = httpMethods.stream().anyMatch(m ->
                    m == RequestMethod.POST || m == RequestMethod.PUT || m == RequestMethod.DELETE || m == RequestMethod.PATCH);
            if (!isWrite) {
                continue;
            }

            Set<String> patterns = mappingInfo.getDirectPaths();
            if (patterns.isEmpty()) {
                patterns = mappingInfo.getPatternValues();
            }

            for (String pattern : patterns) {
                // /api/v1/admin/** 는 URL 시큐리티가 보호하므로 메서드 어노테이션 불요
                if (pattern.startsWith("/api/v1/admin/")) {
                    continue;
                }
                if (isWhitelisted(pattern)) {
                    continue;
                }

                boolean hasPreAuthorize = AnnotationUtils.findAnnotation(method, PreAuthorize.class) != null ||
                                          AnnotationUtils.findAnnotation(controllerClass, PreAuthorize.class) != null;
                boolean hasSecured = AnnotationUtils.findAnnotation(method, Secured.class) != null ||
                                     AnnotationUtils.findAnnotation(controllerClass, Secured.class) != null;
                if (hasPreAuthorize || hasSecured) {
                    continue;
                }
                // 다른 계층(서비스 소유권/자기서비스)에서 인가하는 것으로 명시된 컨트롤러
                if (WRITE_AUTHZ_GUARDED_ELSEWHERE.contains(controllerClass.getSimpleName())) {
                    continue;
                }

                violations.add(String.format("Controller: %s\n   Method: %s\n   Endpoint: %s\n   -> [해결책] 관리자 콘텐츠면 @PreAuthorize(\"hasAnyRole('ADMIN','SYSTEM')\") 를 붙이고, 소유권/자기서비스면 WRITE_AUTHZ_GUARDED_ELSEWHERE 에 근거와 함께 등록하십시오.",
                        controllerClass.getSimpleName(), method.getName(), pattern));
            }
        }

        if (!violations.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            sb.append("\n========================================================================\n");
            sb.append("🚨 [SECURITY HARNESS] 비-admin 경로 쓰기 엔드포인트 인가 누락 감지! 빌드 실패 처리!\n");
            sb.append("========================================================================\n");
            for (String v : violations) {
                sb.append("❌ ").append(v).append("\n");
            }
            sb.append("\n비-admin 경로 쓰기는 anyRequest().authenticated() 만 걸려 일반 사용자도 도달합니다.\n");
            sb.append("관리자 콘텐츠는 @PreAuthorize 로, 소유권/자기서비스는 allow-list 로 인가를 반드시 명시하십시오.\n");
            fail(sb.toString());
        }
    }

    private boolean isWhitelisted(String pattern) {
        for (String whitePattern : PUBLIC_PATH_WHITELIST) {
            if (pattern.startsWith(whitePattern) || pattern.equals(whitePattern)) {
                return true;
            }
        }
        return false;
    }
}
