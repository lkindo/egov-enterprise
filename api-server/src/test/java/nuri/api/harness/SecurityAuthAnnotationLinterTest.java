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
 * <p>화이트리스트(Public API) 또는 DB 구동 인가 대상(URL 매핑)을 제외한 비공개 비즈니스 API 에
 * {@code @PreAuthorize}/{@code @Secured} 등 인가 애노테이션이 선언돼 있는지 리플렉션으로 오딧한다.
 *
 * <p><b>⚠ 이 게이트가 실제로 보는 범위 — 2026-08-03 재정정</b>
 *
 * <p>이 절은 두 번 틀렸다. 처음엔 "모든 엔드포인트를 전수 조사" 라는 <b>과장</b>이었고(2026-08-02 정정),
 * 그 다음엔 정정본이 <b>낡아서</b> 틀렸다 — 패키지 skip 이 삭제됐는데 서술은 "3개 클래스만·7.0%" 로
 * 남아 있었다. 게이트의 자기 서술은 집행이 바뀔 때마다 함께 바뀌어야 한다.
 *
 * <p><b>Test#1</b>({@link #auditSecurityAnnotationsOnRestControllers}) — <b>패키지 skip 없음</b>.
 * {@code nuri.api.controller} 하위 <b>전 컨트롤러의 읽기·쓰기 모두</b>를 순회한다.
 * ({@code .business}/{@code .foundation} 을 통째로 건너뛰던 조건은 삭제됐다.)
 * 다만 아래 중 하나에 해당하면 통과시킨다 — <b>이것이 실질 커버리지를 결정한다</b>:
 * <ol>
 *   <li>{@link #PUBLIC_PATH_WHITELIST} 매칭 (공개 API)</li>
 *   <li>{@code @PreAuthorize}/{@code @Secured} 선언이 있음 — <b>내용은 보지 않는다</b></li>
 *   <li>{@link #isDbProtected}: {@code rbac.db-auth.secure-paths} 에 매칭 — 즉 URL 시큐리티에 위임</li>
 * </ol>
 *
 * <p><b>Test#2</b>({@link #auditWriteEndpointAuthorizationOnNonAdminPaths}) — <b>쓰기</b>
 * (POST/PUT/DELETE/PATCH)만 보고, {@code /api/v1/admin/} 접두는 URL 시큐리티에 위임해 skip.
 *
 * <p><b>남아 있는 사각지대 (커버리지를 과신하지 말 것)</b>
 * <ul>
 *   <li><b>3번 통과가 지배적이다.</b> 다수 엔드포인트가 {@code secure-paths} <b>문자열 목록</b> 매칭만으로
 *       통과한다. 그 목록에서 빠진 신규 도메인은 <b>런타임 인가와 이 린터가 동시에</b> 뚫린다 —
 *       단일 실패점이며, 로드맵 P1-22 가 지목한 미해결 항목이다.</li>
 *   <li>2번은 <b>애노테이션의 존재</b>만 본다. {@code @PreAuthorize("isAuthenticated()")} 는 인증만 요구하므로
 *       IDOR 방어력이 없다 — 그럼에도 이 게이트는 통과시킨다(예: {@code FileApiController} 첨부 다운로드).</li>
 * </ul>
 * <p>요컨대 <b>"모든 컨트롤러를 순회한다"는 참이지만 "모든 인가를 검증한다"는 거짓</b>이다.
 * 이 게이트의 그린은 "인가 애노테이션이 빠지지 않았다" 이지 "인가가 옳다" 가 아니다.
 *
 * <p><b>이 게이트가 보장하지 <u>않는</u> 것</b>
 * <ul>
 *   <li>애노테이션의 <b>내용</b>은 보지 않는다. {@code @PreAuthorize("permitAll()")} 도 통과한다.
 *       역할 값 정합은 {@code RbacAuthorizationMatrixTest} 가 담당한다.</li>
 *   <li>DB 구동 인가 판정은 테스트 프로파일에서 {@code tb_prgrm_lst} 가 비어 있어
 *       사실상 {@code rbac.db-auth.secure-paths} 만으로 이뤄진다({@link #initDbProtectedUrls} 의 조회 실패 경로 참조).</li>
 * </ul>
 */
@SpringBootTest(classes = nuri.ApiServerApplication.class)
@ActiveProfiles("test")
class SecurityAuthAnnotationLinterTest {

    @Autowired
    private WebApplicationContext context;

    @Autowired
    private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    @org.springframework.beans.factory.annotation.Value("${rbac.db-auth.secure-paths:#{T(java.util.Collections).emptyList()}}")
    private List<String> securePaths;

    private final org.springframework.util.AntPathMatcher pathMatcher = new org.springframework.util.AntPathMatcher();
    private List<String> dbProtectedUrls = null;

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

    private void initDbProtectedUrls() {
        if (dbProtectedUrls == null) {
            dbProtectedUrls = new ArrayList<>();
            // 1. application.yml의 secure-paths 목록 추가
            if (securePaths != null) {
                dbProtectedUrls.addAll(securePaths);
            }
            // 2. DB tb_prgrm_lst 조회된 URL 목록 추가
            try {
                List<String> urlsFromDb = jdbcTemplate.queryForList("SELECT url FROM tb_prgrm_lst WHERE url IS NOT NULL", String.class);
                dbProtectedUrls.addAll(urlsFromDb);
            } catch (Exception e) {
                System.out.println("[SecurityLinter] tb_prgrm_lst 조회 실패 (테이블 부재 등): " + e.getMessage());
            }
        }
    }

    private boolean isDbProtected(String pattern) {
        initDbProtectedUrls();
        for (String protectedPattern : dbProtectedUrls) {
            if (pathMatcher.match(protectedPattern, pattern) || pathMatcher.match(pattern, protectedPattern)) {
                return true;
            }
        }
        return false;
    }

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

            // 2. api-server의 커스텀 신규 API 컨트롤러(nuri.api.controller) 전수 오딧 대상 지정
            if (!controllerClass.getPackageName().startsWith("nuri.api.controller")) {
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

                // 5. 어떠한 권한 검증 어노테이션도 없으나, DB 구동 인가(프로그램 목록/securePaths)로 검증되고 있다면 통과
                if (!hasPreAuthorize && !hasSecured && !hasPermitAllRoute) {
                    if (isDbProtected(pattern)) {
                        continue;
                    }
                    violations.add(String.format("Controller: %s\n   Method: %s\n   Endpoint: %s\n   -> [해결책] @PreAuthorize(\"hasRole('...')\") 또는 @PreAuthorize(\"isAuthenticated()\")를 기입하거나 DB 인가 가드 대상에 등록하십시오.",
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
                // DB 구동 인가로 보호되고 있다면 통과
                if (isDbProtected(pattern)) {
                    continue;
                }

                violations.add(String.format("Controller: %s\n   Method: %s\n   Endpoint: %s\n   -> [해결책] 관리자 콘텐츠면 @PreAuthorize(\"hasAnyRole('ADMIN','SYSTEM')\") 를 붙이거나 DB 인가 가드 대상에 등록하고, 소유권/자기서비스면 @PreAuthorize(\"isAuthenticated()\") 와 서비스 소유권 가드를 함께 적용하십시오.",
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
            sb.append("관리자 콘텐츠는 @PreAuthorize 또는 DB 인가 가드로, 소유권/자기서비스는 컨트롤러 인증과 서비스 소유권 가드로 인가를 반드시 명시하십시오.\n");
            fail(sb.toString());
        }
    }

    /**
     * 화이트리스트 매칭. <b>경로 세그먼트 경계</b>를 인식한다.
     *
     * <p>[2026-08-02] 종전에는 경계 없는 {@code startsWith} 라 {@code /api/v1/menus} 화이트리스트가
     * {@code /api/v1/menus-admin/...} 같은 <b>다른 리소스</b>까지 면제했다. 현재 저장소에 그런 경로는
     * 없으나(실측 181개 리터럴 중 0건), 신규 경로가 조용히 면제되는 통로이므로 닫는다.
     * 정확 일치 또는 {@code 화이트패턴 + "/"} 접두만 인정한다.
     */
    private boolean isWhitelisted(String pattern) {
        for (String whitePattern : PUBLIC_PATH_WHITELIST) {
            if (pattern.equals(whitePattern) || pattern.startsWith(whitePattern + "/")) {
                return true;
            }
        }
        return false;
    }
}
