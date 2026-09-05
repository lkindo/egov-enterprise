package nuri.api.harness;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.config.YamlPropertiesFactoryBean;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.core.io.FileSystemResource;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.mvc.method.RequestMappingInfo;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.fail;

/**
 * 쓰기 인가 의미 정책 하네스.
 *
 * <p>종전 구현은 {@code @PreAuthorize}가 <em>존재</em>하기만 하면
 * {@code permitAll()} 같은 완화도 통과시켰고, 서비스의 수동 소유권 판정은 별도 census 밖이었다.
 * 이 구현은 {@code config/governance/authorization-policies.json}을 단일 정책표로 삼아 다음을 결속한다.
 *
 * <ol>
 *   <li>Spring MVC가 실제 등록한 모든 POST/PUT/PATCH/DELETE 경로, HTTP 메서드, handler</li>
 *   <li>합성 애노테이션까지 펼친 정확한 {@code @PreAuthorize} SpEL과 URL 필터 게이트</li>
 *   <li>{@code STRICT_OWNER}, {@code OWNER_OR_ADMIN}, {@code ADMIN_OR_SYSTEM} 등 도메인 의미</li>
 *   <li>{@code SecurityUtil} 호출 전수와 Note/Memo/File 등 손수 작성한 guard의 메서드 내부 fingerprint</li>
 * </ol>
 *
 * <p><b>정직한 한계</b>: 엔드포인트/애노테이션은 Spring 런타임 리플렉션으로 exact-match한다. 서비스는
 * 별도 Java AST 라이브러리를 추가하지 않고 주석을 제거한 소스의 메서드 body를 lexical 분석하므로,
 * 필요한 guard 문장이 같은 메서드에 남는 것은 증명하지만 모든 제어흐름에서 도달함까지 증명하지는 않는다.
 * 이 한계는 registry에도 기록하며, 실제 guard 완화/삭제 mutation이 red가 되는 것으로 유효성을 보완한다.
 */
@SpringBootTest(classes = nuri.ApiServerApplication.class)
@ActiveProfiles("test")
@Tag("governance-harness")
class SecurityAuthAnnotationLinterTest {

    private static final String POLICY_FILE = "config/governance/authorization-policies.json";
    private static final String RBAC_SEED_FILE =
            "api-server/src/main/resources/db/migration/V2_11__seed_authorization_chain.sql";
    /** V2_84 — 설문 별칭 게이트 제거 계보(제품 결정 2026-08-20: 설문 제출 일반 개방). */
    private static final String SURVEY_ALIAS_REMOVAL_SEED_FILE =
            "api-server/src/main/resources/db/migration/V2_84__open_survey_alias_to_authenticated.sql";
    private static final String ROLE_HIERARCHY_SEED_FILE =
            "api-server/src/main/resources/db/migration/V2_3__seed_role_hierarchy.sql";
    private static final String MAIN_APPLICATION_FILE = "api-server/src/main/resources/application.yml";
    private static final String HELPER_ACTUAL_OUT = "build/harness/authorization-helper-census.actual.txt";
    private static final String MANUAL_ACTUAL_OUT = "build/harness/authorization-manual-deny-census.actual.txt";
    private static final String READ_SURFACE_ACTUAL_OUT = "build/harness/authorization-read-surface.actual.txt";

    /**
     * 읽기 인가 표면 동결 해시(2026-08-23 실측: endpoint 169건).
     *
     * <p>분포: RBAC_ADMIN_OR_SYSTEM 96 · DEFAULT_AUTHENTICATED 62 · RBAC_ALIAS_ADMIN_OR_SYSTEM 4 ·
     * PUBLIC_FILTER 6({@code auth/me}, {@code health}, {@code menus/head}, {@code menus/left},
     * {@code users/check-id}, {@code public/debug/error}). 마지막 항목은 {@code @Profile("!prod")}
     * 라 운영에는 등재되지 않는다.
     *
     * <p>이 테스트는 {@code @ActiveProfiles("test")} 컨텍스트를 읽으므로 census 는 prod 등록 집합과
     * 정확히 같지 않다. 그래도 회차 간에는 결정적이라 <b>표면의 변화</b>를 잡는 목적에는 충분하다.
     *
     * <p>갱신 시 사유를 커밋 메시지에 남긴다. 특히 PUBLIC_FILTER 가 늘거나 {@code @PreAuthorize} 가
     * 사라지는 방향이면 그것은 인가 <b>완화</b>이므로 별도 승인 없이 갱신하지 않는다.
     */
    private static final String READ_SURFACE_SHA256 =
            // [2026-08-20 V2_84 갱신] 설문 별칭 GET 6행의 gate 가 RBAC_ALIAS_ADMIN_OR_SYSTEM →
            // DEFAULT_AUTHENTICATED 로 바뀌고 메서드 SpEL 이 부여됐다(목록·상세·문항·stats 는
            // isAuthenticated — 제품 결정에 따른 의도된 개방 / 템플릿 2행은 hasAnyRole 로 관리 유지).
            // [2026-08-22 공개 FAQ 경계 갱신] 고정 FAQ 게시판의 active/public 목록·상세 GET 2행을
            // DEFAULT_AUTHENTICATED 로 추가했다. 비밀글·비활성 글은 서버 조회 경계에서 제외하며,
            // 관리자 경로 공개 노출 하드 불변식은 계속 그린이다. endpoint 수 166 -> 168.
            // [2026-08-23 로그인 로그 export 신설(D4)] GET /api/v1/admin/system/logs/login/export.xlsx
            // 1행 추가 — RBAC_ADMIN_OR_SYSTEM|hasAnyRole('ADMIN','SYSTEM'). 기존 목록 API 와 같은
            // ADMIN/SYSTEM 축에 @AdminOrSystem 메서드 인가를 더한 것이라 완화가 아니라 강화다.
            // endpoint 수 168 -> 169.
            // [2026-08-26 로그 4종 export 신설] GET .../logs/{system,user,web,privacy}/export.xlsx
            // 4행 추가 — 모두 RBAC_ADMIN_OR_SYSTEM|hasAnyRole('ADMIN','SYSTEM') 로, 각 목록 API 와
            // **같은 인가 축**에 @AdminOrSystem 메서드 인가를 더한 것이라 완화가 아니라 강화다
            // (AGENTS H3 — 도메인 의미 보존). 로그인 로그 export 와 같은 규칙을 공유한다.
            // [2026-08-26 첨부 정합성 진단 신설] GET /api/v1/admin/files/integrity 1행 추가 —
            // RBAC_ADMIN_OR_SYSTEM|hasAnyRole('ADMIN','SYSTEM'). 응답에 저장 경로가 들어가므로
            // 첨부 목록 조회와 **같은 ADMIN/SYSTEM 축**으로 제한했다(완화 아님, H3). endpoint 수
            // 173 -> 174.
            // [2026-08-27 개인정보 로그 SYSTEM 배제] GET .../logs/privacy 와 .../logs/privacy/export.xlsx
            // 2행의 메서드 SpEL 이 hasRole('ADMIN') / hasAnyRole('ADMIN','SYSTEM') →
            // hasRole('ADMIN') and !hasRole('SYSTEM') 로 바뀌었다. **인가 축소이며 완화가 아니다.**
            // 배경: 이 저장소는 DB 역할 계층 ROLE_SYSTEM > ROLE_ADMIN 을 메서드 인가에도 주입하므로
            // (RoleHierarchyConfig#methodSecurityExpressionHandler) hasRole('ADMIN') 이 SYSTEM 도
            // 통과시켜, 컨트롤러 javadoc 이 명시한 "SYSTEM 제외"(2026-08-05 사용자 결정)가 실제로는
            // 집행되지 않고 있었다. PrivacyLogSystemRoleExclusionTest 가 계층이 살아 있는 상태에서
            // 두 경로의 SYSTEM 403 을 고정하며, 종전 애노테이션으로 되돌리면 red 가 되는 것을 확인했다.
            // endpoint 수 174 로 불변(행 수 변화 없음, gate 는 URL 축이라 RBAC_ADMIN_OR_SYSTEM 유지).
            // [2026-08-27 로그인 정책 인가 이중화] LoginPolicyApiController 의 GET 2행에 메서드 SpEL
            // hasAnyRole('ADMIN','SYSTEM') 이 부여됐다. **완화가 아니라 강화다** — 종전에는 메서드 인가가
            // 0건이고 URL 게이트(ADMIN_ALL) 한 겹뿐이라, 그 매핑 한 줄이 빠지면 접속 IP 제한·허용 시간대·
            // OTP 설정이 함께 열리는 단일 실패점이었다. ADMIN_ALL 은 운영 시드에서 ROLE_ADMIN·ROLE_SYSTEM
            // 두 롤에 매핑돼 있어 실효 접근 집합은 그대로다(동작 무변경). endpoint 수 174 불변.
            // [2026-09-02 게시글 통합 검색 신설] GET /api/v1/boards/search 1행 추가 —
            // DEFAULT_AUTHENTICATED|isAuthenticated(). 같은 컨트롤러의 다른 조회와 동일한 인가 축이며,
            // **새 노출면을 만들지 않는다**: 서비스가 게시판 목록 조회와 같은 술어
            // (BoardPredicate.searchBoard + 활성 게시판 조인 + 비밀글 가시성)를 그대로 재사용하므로
            // 이 API 로 보이는 글은 모두 해당 게시판 목록에서 이미 보이는 글이다(H3 인가 의미 보존).
            // 종전에는 이 엔드포인트가 없어 /search 화면의 게시글 탭이 항상 빈 결과였다.
            // 변경이 이 한 줄뿐임을 실측으로 확인했다 — 이 행을 제거하면 직전 해시
            // b88c86ca… 가 정확히 재현된다. endpoint 수 174 -> 175.
            // [2026-09-02 SMS 발송 가능 상태 조회 신설] GET /api/v1/admin/operation/sms/delivery-status
            // 1행 추가 — RBAC_ADMIN_OR_SYSTEM|-. 같은 컨트롤러의 다른 조회와 **동일한 URL 게이트**이며
            // (컨트롤러 전체가 /api/v1/admin/operation/sms 아래), 응답은 게이트웨이 연결 여부와
            // sender 구현체 단순 클래스명뿐이라 개인정보·자격이 실리지 않는다.
            // 신설 이유: 발송 이력·수신자 결과는 **보낸 뒤에야** 알 수 있는데, 게이트웨이가 없는
            // 배포에서는 모든 결과가 실패로 정해져 있다. 그 사실을 문안 작성 전에 알리기 위한
            // 조회 창구다(종전 배너는 하드코딩이라 파생 제품에서 반대로 거짓말했다).
            // 변경이 이 한 줄뿐임을 실측으로 확인했다 — 이 행을 제거하면 직전 해시 cd681f2a… 가
            // 정확히 재현된다. endpoint 수 175 -> 176.
            "6e3763bbceee080c7dc467bde31ec48d960315cf6e2dbe187212cf4655e6bb2d";

    /** 스캔 붕괴로 인한 vacuous 통과 차단용 하한(실측 166 대비 여유). */
    private static final int READ_ENDPOINT_FLOOR = 120;

    private static final List<String> SOURCE_ROOTS = List.of(
            "business-core/src/main/java",
            "business-app/src/main/java",
            "api-server/src/main/java",
            "foundation/src/main/java");
    private static final Set<RequestMethod> WRITE_METHODS = Set.of(
            RequestMethod.POST, RequestMethod.PUT, RequestMethod.PATCH, RequestMethod.DELETE);
    private static final Set<String> KNOWN_POLICIES = Set.of(
            "PUBLIC",
            "AUTHENTICATED",
            "STRICT_SELF",
            "SELF_WITH_CREDENTIAL",
            "STRICT_OWNER",
            "OWNER_OR_ADMIN",
            "PARTICIPANT_OR_ADMIN",
            "REACHABILITY_WITH_PRIVACY",
            "ADMIN_OR_SYSTEM",
            "ADMIN_ROLE_WITH_HIERARCHY",
            "SYSTEM_ACCOUNT_IMMUTABLE");
    private static final Set<String> OWNER_POLICIES = Set.of(
            "STRICT_SELF",
            "SELF_WITH_CREDENTIAL",
            "STRICT_OWNER",
            "OWNER_OR_ADMIN",
            "PARTICIPANT_OR_ADMIN",
            "REACHABILITY_WITH_PRIVACY");
    private static final Pattern GUARD_CALL = Pattern.compile(
            "SecurityUtil\\s*\\.\\s*(assertOwnerByEsntlId|assertOwnerOrAdminByEsntlId|assertOwnerOrAdmin|assertAdmin)\\s*\\(");
    private static final Pattern MANUAL_DENY = Pattern.compile(
            "CommonErrorCode\\s*\\.\\s*(?:ACCESS_DENIED|HANDLE_ACCESS_DENIED)");

    @Autowired
    private WebApplicationContext context;

    @Value("${security.whitelist:#{T(java.util.Collections).emptyList()}}")
    private List<String> publicPaths;

    @Value("${rbac.db-auth.secure-paths:#{T(java.util.Collections).emptyList()}}")
    private List<String> securePaths;

    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    @Test
    @DisplayName("쓰기 endpoint/method/handler/SpEL/정책 의미 matrix exact-match")
    void auditWriteAuthorizationPolicyMatrix() throws Exception {
        PolicyRegistry registry = loadRegistry();
        validateRegistryShape(registry);

        Map<String, EndpointPolicy> expected = new LinkedHashMap<>();
        for (EndpointPolicy row : registry.endpointPolicies()) {
            EndpointPolicy previous = expected.put(row.key(), row);
            if (previous != null) {
                fail("인가 정책 registry 중복 endpoint: " + row.key());
            }
        }

        Map<String, ActualEndpoint> actual = discoverWriteEndpoints();
        if (actual.size() < 180) {
            fail("쓰기 endpoint discovery가 예상 하한(180) 미만입니다: " + actual.size()
                    + " — scan/context 붕괴를 green으로 처리할 수 없습니다.");
        }

        List<String> violations = new ArrayList<>();
        for (ActualEndpoint endpoint : actual.values()) {
            EndpointPolicy policy = expected.get(endpoint.key());
            if (policy == null) {
                violations.add("미등록 쓰기 endpoint: " + endpoint.describe());
                continue;
            }
            if (!policy.handler().equals(endpoint.handler())) {
                violations.add(endpoint.key() + " handler drift: expected=" + policy.handler()
                        + ", actual=" + endpoint.handler());
            }
            if (!policy.methodSecurity().equals(endpoint.methodSecurity())) {
                violations.add(endpoint.key() + " method-security drift: expected='"
                        + policy.methodSecurity() + "', actual='" + endpoint.methodSecurity() + "'");
            }
            if (!policy.routeGate().equals(endpoint.routeGate())) {
                violations.add(endpoint.key() + " URL gate drift: expected=" + policy.routeGate()
                        + ", actual=" + endpoint.routeGate());
            }
        }
        for (EndpointPolicy policy : expected.values()) {
            if (!actual.containsKey(policy.key())) {
                violations.add("stale/삭제 endpoint registry 행: " + policy.key() + " -> " + policy.handler());
            }
        }

        validateEndpointSemantics(registry, violations);
        validateRbacSourceSemantics(violations);
        failIfAny("WRITE AUTHORIZATION POLICY MATRIX", violations);
    }

    /**
     * 읽기(GET) endpoint 인가 표면 동결 census.
     *
     * <p>[왜 필요한가] 이 린터가 재작성되면서 판정 대상이 {@link #WRITE_METHODS} 로 좁혀졌다. 종전 구현은
     * HTTP method 구분 없이 {@code nuri.api.controller} 의 <b>모든 handler</b> 를 순회하며 인가 선언을
     * 강제했으므로, 좁히는 과정에서 <b>읽기 축이 통째로 사라졌고 이를 넘겨받은 게이트가 없었다.</b>
     * 그 상태에서는 인가 선언 없는 GET 을 새로 추가해도 어떤 게이트도 반응하지 않는다.
     *
     * <p>[왜 census 인가] 읽기 endpoint 전량에 즉시 {@code @PreAuthorize} 를 요구하면 정당하게
     * '인증만 요구' 인 조회까지 막게 되고, 그 대량 변경은 이 게이트의 목적(회귀 차단)과 무관하다.
     * 대신 <b>인가 표면 자체를 동결</b>한다 — endpoint 가 늘거나 줄거나, 어떤 GET 의 route gate 가
     * 바뀌거나, {@code @PreAuthorize} 가 붙거나 떨어지면 census 해시가 달라져 red 가 된다.
     * 즉 막는 것이 아니라 <b>조용히 바뀔 수 없게</b> 만든다.
     *
     * <p>[함께 거는 하드 불변식] 관리자 경로({@code /api/v1/admin/**})의 GET 이 공개 필터로 빠지는 것은
     * 어떤 경우에도 사고다. 이것만은 census 와 무관하게 즉시 실패시킨다.
     */
    @Test
    @DisplayName("읽기 endpoint 인가 표면 동결 census + 관리자 경로 공개 노출 차단")
    void auditReadEndpointAuthorizationSurface() throws Exception {
        Map<String, String> census = new TreeMap<>();
        List<String> violations = new ArrayList<>();

        // ⚠ 이 클래스가 주입받는 publicPaths 는 **test 프로파일** 값이다 —
        //   api-server/src/test/resources/application.yml 이 main 을 shadow 하기 때문이다.
        //   census 의 drift 판정에는 그것으로 충분하지만, '운영에서 관리자 경로가 공개로 열렸는가' 는
        //   운영 설정으로 판정해야 한다. 실제로 main 의 whitelist 에 /api/v1/admin/system/** 을 넣어
        //   보면 test 값만 보는 판정은 green 이었다(2026-08-19 실측). 그래서 운영 파일을 직접 읽는다.
        List<String> productionPublicPaths = loadProductionWhitelist();
        if (productionPublicPaths.isEmpty()) {
            violations.add("운영 whitelist 를 읽지 못했습니다 — " + MAIN_APPLICATION_FILE
                    + " 의 security.whitelist 파싱 실패(빈 목록을 통과로 처리하면 이 축이 vacuous 해집니다)");
        }

        RequestMappingHandlerMapping mappings = context.getBean(
                "requestMappingHandlerMapping", RequestMappingHandlerMapping.class);
        for (Map.Entry<RequestMappingInfo, HandlerMethod> entry : mappings.getHandlerMethods().entrySet()) {
            HandlerMethod handler = entry.getValue();
            if (!handler.getBeanType().getPackageName().startsWith("nuri.api.controller")) {
                continue;
            }
            Set<RequestMethod> declared = entry.getKey().getMethodsCondition().getMethods();
            // method 미선언 매핑은 GET 을 포함한 전 method 를 받는다. 읽기 축에서 빠뜨리면 안 된다.
            if (!declared.isEmpty() && !declared.contains(RequestMethod.GET)) {
                continue;
            }
            for (String path : entry.getKey().getPatternValues()) {
                String gate = routeGate(path);
                String preAuthorize = mergedPreAuthorizeValue(handler);
                if (path.startsWith("/api/v1/admin/") && matchesAny(productionPublicPaths, path)) {
                    violations.add("관리자 경로 GET 이 운영 whitelist 로 공개 노출됨: " + path
                            + " (" + handler.getBeanType().getSimpleName()
                            + "#" + handler.getMethod().getName() + ")");
                }
                census.put("GET " + path, gate + "|" + (preAuthorize.isEmpty() ? "-" : preAuthorize));
            }
        }

        List<String> lines = census.entrySet().stream()
                .map(e -> e.getKey() + " => " + e.getValue())
                .toList();
        writeActual(READ_SURFACE_ACTUAL_OUT, new TreeSet<>(lines));

        // vacuous 통과 차단 — 스캔이 조용히 0 에 수렴하면 이 게이트는 없는 것과 같다.
        if (census.size() < READ_ENDPOINT_FLOOR) {
            violations.add("읽기 endpoint 스캔 하한 미달: " + census.size() + " < " + READ_ENDPOINT_FLOOR
                    + " — 스캔 경로 파손 의심");
        }

        String actualHash = sha256Hex(String.join("\n", lines));
        if (!READ_SURFACE_SHA256.equals(actualHash)) {
            violations.add("읽기 인가 표면이 바뀌었습니다: endpoints=" + census.size()
                    + ", sha256=" + actualHash
                    + " (매니페스트=" + READ_SURFACE_SHA256 + ")."
                    + " 산출물 " + READ_SURFACE_ACTUAL_OUT + " 을 diff 해 무엇이 바뀌었는지 확인하고,"
                    + " 정당한 변경이면 사유와 함께 상수를 갱신하십시오."
                    + " 인가를 약화하는 변경(공개 전환·@PreAuthorize 제거)인지 먼저 자문할 것.");
        }

        failIfAny("READ ENDPOINT AUTHORIZATION SURFACE", violations);
    }

    @Test
    @DisplayName("SecurityUtil helper + 수동 owner/participant/privacy guard 의미 census exact-match")
    void auditServiceAuthorizationGuardMatrix() throws Exception {
        PolicyRegistry registry = loadRegistry();
        validateRegistryShape(registry);

        Set<String> expectedHelpers = new TreeSet<>();
        Set<String> registeredGuardTargets = new HashSet<>();
        List<String> violations = new ArrayList<>();

        for (ServiceGuardPolicy guard : registry.serviceGuardPolicies()) {
            if (!registeredGuardTargets.add(guard.target())) {
                violations.add("중복 service guard target: " + guard.target());
            }
            for (GuardMechanism mechanism : guard.mechanisms()) {
                expectedHelpers.add(guard.target() + "#" + mechanism.helper() + "=" + mechanism.count());
                validateHelperMeaning(guard, mechanism, violations);
            }
        }

        SourceCensus census = scanSources();
        writeActual(HELPER_ACTUAL_OUT, census.helperCalls());
        writeActual(MANUAL_ACTUAL_OUT, census.manualDenials());

        compareExact("SecurityUtil helper", expectedHelpers, census.helperCalls(), violations);

        Set<String> expectedManualDenials = new TreeSet<>();
        for (ManualGuardPolicy guard : registry.manualGuardPolicies()) {
            if (!registeredGuardTargets.add(guard.target())) {
                // Helper와 manual fingerprint가 같은 method를 함께 보호하는 것은 의도적이다.
                boolean alsoHelperProtected = registry.serviceGuardPolicies().stream()
                        .anyMatch(candidate -> candidate.target().equals(guard.target()));
                if (!alsoHelperProtected) {
                    violations.add("중복 manual guard target: " + guard.target());
                }
            }
            if (guard.denyReferences() > 0) {
                expectedManualDenials.add(guard.target() + "=" + guard.denyReferences());
            }
            validateManualGuardBody(guard, violations);
        }
        compareExact("수동 deny", expectedManualDenials, census.manualDenials(), violations);

        Set<String> allGuardTargets = new HashSet<>();
        registry.serviceGuardPolicies().forEach(guard -> allGuardTargets.add(guard.target()));
        registry.manualGuardPolicies().forEach(guard -> allGuardTargets.add(guard.target()));
        for (EndpointPolicy endpoint : registry.endpointPolicies()) {
            if (endpoint.guardRef() != null && !allGuardTargets.contains(endpoint.guardRef())) {
                violations.add(endpoint.key() + "가 존재하지 않는 guardRef를 참조: " + endpoint.guardRef());
            }
        }

        if (census.scannedFiles() < 200) {
            violations.add("service source scan 하한 미달: " + census.scannedFiles() + " < 200");
        }
        failIfAny("SERVICE AUTHORIZATION GUARD MATRIX", violations);
    }

    private Map<String, ActualEndpoint> discoverWriteEndpoints() {
        RequestMappingHandlerMapping mappings = context.getBean(
                "requestMappingHandlerMapping", RequestMappingHandlerMapping.class);
        Map<String, ActualEndpoint> actual = new LinkedHashMap<>();

        mappings.getHandlerMethods().entrySet().stream()
                .sorted(Comparator.comparing(entry -> entry.getValue().toString()))
                .forEach(entry -> collectEndpoint(entry, actual));
        return actual;
    }

    private void collectEndpoint(Map.Entry<RequestMappingInfo, HandlerMethod> entry,
            Map<String, ActualEndpoint> sink) {
        HandlerMethod handler = entry.getValue();
        if (!handler.getBeanType().getPackageName().startsWith("nuri.api.controller")) {
            return;
        }
        Set<RequestMethod> declaredMethods = entry.getKey().getMethodsCondition().getMethods();
        Set<RequestMethod> effectiveMethods = declaredMethods.isEmpty() ? WRITE_METHODS : declaredMethods;
        for (RequestMethod method : effectiveMethods) {
            if (!WRITE_METHODS.contains(method)) {
                continue;
            }
            for (String path : entry.getKey().getPatternValues()) {
                ActualEndpoint endpoint = new ActualEndpoint(
                        method.name(),
                        path,
                        handler.getBeanType().getName() + "#" + handler.getMethod().getName(),
                        mergedPreAuthorizeValue(handler),
                        routeGate(path));
                ActualEndpoint previous = sink.put(endpoint.key(), endpoint);
                if (previous != null) {
                    fail("동일 HTTP method+path가 여러 handler에 등록됨: " + previous.describe()
                            + " <> " + endpoint.describe());
                }
            }
        }
    }

    private String mergedPreAuthorizeValue(HandlerMethod handler) {
        PreAuthorize method = AnnotatedElementUtils.findMergedAnnotation(handler.getMethod(), PreAuthorize.class);
        if (method != null) {
            return method.value();
        }
        PreAuthorize type = AnnotatedElementUtils.findMergedAnnotation(handler.getBeanType(), PreAuthorize.class);
        return type != null ? type.value() : "";
    }

    private String routeGate(String path) {
        if (matchesAny(publicPaths, path)) {
            return "PUBLIC_FILTER";
        }
        if (matchesAny(securePaths, path)) {
            return path.startsWith("/api/v1/admin/")
                    ? "RBAC_ADMIN_OR_SYSTEM"
                    : "RBAC_ALIAS_ADMIN_OR_SYSTEM";
        }
        return "DEFAULT_AUTHENTICATED";
    }

    private boolean matchesAny(List<String> patterns, String path) {
        return patterns != null && patterns.stream().anyMatch(pattern -> pathMatcher.match(pattern, path));
    }

    private void validateRegistryShape(PolicyRegistry registry) {
        List<String> violations = new ArrayList<>();
        if (registry.schemaVersion() != 1) {
            violations.add("지원하지 않는 schemaVersion: " + registry.schemaVersion());
        }
        if (!"write-authorization-policy-ssot".equals(registry.authority())) {
            violations.add("authority drift: " + registry.authority());
        }
        if (!registry.policyDefinitions().keySet().equals(KNOWN_POLICIES)) {
            violations.add("policyDefinitions exact set drift: expected=" + KNOWN_POLICIES
                    + ", actual=" + registry.policyDefinitions().keySet());
        }
        if (registry.endpointPolicies().size() < 180) {
            violations.add("endpoint registry 하한 미달: " + registry.endpointPolicies().size());
        }
        if (registry.serviceGuardPolicies().size() < 40) {
            violations.add("SecurityUtil guard registry 하한 미달: " + registry.serviceGuardPolicies().size());
        }
        if (registry.manualGuardPolicies().size() < 10) {
            violations.add("manual guard registry 하한 미달: " + registry.manualGuardPolicies().size());
        }
        failIfAny("AUTHORIZATION REGISTRY INTEGRITY", violations);
    }

    private void validateEndpointSemantics(PolicyRegistry registry, List<String> violations) throws IOException {
        Map<String, String> guardPolicies = new HashMap<>();
        registry.serviceGuardPolicies().forEach(guard -> guardPolicies.put(guard.target(), guard.policy()));
        registry.manualGuardPolicies().forEach(guard -> guardPolicies.put(guard.target(), guard.policy()));

        for (EndpointPolicy endpoint : registry.endpointPolicies()) {
            if (!KNOWN_POLICIES.contains(endpoint.policy())) {
                violations.add(endpoint.key() + " unknown policy: " + endpoint.policy());
                continue;
            }
            if ("permitAll()".equals(endpoint.methodSecurity()) && !"PUBLIC".equals(endpoint.policy())) {
                violations.add(endpoint.key() + " non-public policy에 permitAll() 선언");
            }
            if (!"PUBLIC".equals(endpoint.policy())
                    && "PUBLIC_FILTER".equals(endpoint.routeGate())
                    && (endpoint.methodSecurity().isBlank()
                            || "permitAll()".equals(endpoint.methodSecurity()))) {
                violations.add(endpoint.key() + " non-public policy인데 인증 집행 근거가 없음");
            }
            if ("PUBLIC".equals(endpoint.policy())) {
                if (!"PUBLIC_FILTER".equals(endpoint.routeGate())
                        && !"permitAll()".equals(endpoint.methodSecurity())) {
                    violations.add(endpoint.key() + " PUBLIC이나 permitAll 집행 근거가 없음");
                }
                continue;
            }
            if (OWNER_POLICIES.contains(endpoint.policy())) {
                if (endpoint.guardRef() == null) {
                    violations.add(endpoint.key() + " " + endpoint.policy() + "에 service guardRef 누락");
                } else if (!compatibleGuardPolicy(endpoint.policy(), guardPolicies.get(endpoint.guardRef()))) {
                    violations.add(endpoint.key() + " endpoint/guard 의미 불일치: endpoint="
                            + endpoint.policy() + ", guard=" + guardPolicies.get(endpoint.guardRef()));
                }
            }
            validateHandlerBinding(endpoint, violations);
            if ("ADMIN_ROLE_WITH_HIERARCHY".equals(endpoint.policy())
                    && !"hasRole('ADMIN')".equals(endpoint.methodSecurity())) {
                violations.add(endpoint.key() + " ADMIN_ROLE_WITH_HIERARCHY는 hasRole('ADMIN') exact 필요");
            }
            if ("ADMIN_OR_SYSTEM".equals(endpoint.policy())) {
                boolean methodGate = "hasAnyRole('ADMIN','SYSTEM')".equals(endpoint.methodSecurity())
                        || "hasRole('ADMIN')".equals(endpoint.methodSecurity());
                boolean urlGate = endpoint.routeGate().startsWith("RBAC_");
                boolean serviceGate = endpoint.guardRef() != null
                        && "ADMIN_OR_SYSTEM".equals(guardPolicies.get(endpoint.guardRef()));
                if (!methodGate && !urlGate && !serviceGate) {
                    violations.add(endpoint.key() + " ADMIN_OR_SYSTEM 집행 근거(method/url/service) 없음");
                }
            }
        }
    }

    private static boolean compatibleGuardPolicy(String endpointPolicy, String guardPolicy) {
        if (endpointPolicy.equals(guardPolicy)) {
            return true;
        }
        // /users/me처럼 controller가 target ID를 현재 principal로 고정하면, 더 넓은 재사용 service
        // guard(OWNER_OR_ADMIN) 위에서도 endpoint 자체는 STRICT_SELF다. 그 좁힘은 아래 handler token으로 고정한다.
        return "STRICT_SELF".equals(endpointPolicy) && "OWNER_OR_ADMIN".equals(guardPolicy);
    }

    private void validateHandlerBinding(EndpointPolicy endpoint, List<String> violations) throws IOException {
        List<String> tokens = endpoint.handlerRequiredTokens();
        if (tokens == null || tokens.isEmpty()) {
            if ("STRICT_SELF".equals(endpoint.policy()) || "SELF_WITH_CREDENTIAL".equals(endpoint.policy())) {
                violations.add(endpoint.key() + " " + endpoint.policy() + "에 handler binding evidence 누락");
            }
            return;
        }
        int separator = endpoint.handler().lastIndexOf('#');
        if (separator <= 0 || separator == endpoint.handler().length() - 1) {
            violations.add(endpoint.key() + " handler 형식 오류: " + endpoint.handler());
            return;
        }
        String className = endpoint.handler().substring(0, separator);
        String methodName = endpoint.handler().substring(separator + 1);
        Path source = resolveFromRepoRoot("api-server/src/main/java/" + className.replace('.', '/') + ".java");
        if (!Files.isRegularFile(source)) {
            violations.add(endpoint.key() + " handler source 부재: " + source);
            return;
        }
        String code = HarnessBaselineIntegrityTest.stripCommentsPreservingStrings(HarnessSourceIndex.read(source));
        String body = extractMethodBody(code, methodName);
        if (body == null) {
            violations.add(endpoint.key() + " handler body 탐지 실패: " + endpoint.handler());
            return;
        }
        String normalizedBody = normalize(body);
        for (String token : tokens) {
            if (!normalizedBody.contains(normalize(token))) {
                violations.add(endpoint.key() + " handler binding token 소실: " + token);
            }
        }
    }

    private void validateRbacSourceSemantics(List<String> violations) throws IOException {
        YamlPropertiesFactoryBean yaml = new YamlPropertiesFactoryBean();
        yaml.setResources(new FileSystemResource(resolveFromRepoRoot(MAIN_APPLICATION_FILE)));
        Properties application = yaml.getObject();
        if (application == null || !"true".equals(application.getProperty("rbac.db-auth.enabled"))) {
            violations.add("main application.yml의 rbac.db-auth.enabled=true 선언 소실");
        }
        String rbac = normalizedSource(resolveFromRepoRoot(RBAC_SEED_FILE));
        for (String token : List.of(
                "('ADMIN_ALL', '관리자 전체', '/api/v1/admin/**'",
                "('ADMIN_SURVEY_ALIAS', '설문 관리 별칭', '/api/v1/surveys/**'",
                "('ADMIN_HELP_ALIAS', '도움말 관리 별칭', '/api/v1/help/**'",
                "('ROLE_ADMIN', 'ADMIN_ALL')",
                "('ROLE_SYSTEM', 'ADMIN_ALL')",
                "('ROLE_ADMIN', 'ADMIN_SURVEY_ALIAS')",
                "('ROLE_SYSTEM', 'ADMIN_SURVEY_ALIAS')",
                "('ROLE_ADMIN', 'ADMIN_HELP_ALIAS')",
                "('ROLE_SYSTEM', 'ADMIN_HELP_ALIAS')")) {
            if (!rbac.contains(normalize(token))) {
                violations.add("RBAC seed 의미 token 소실: " + token);
            }
        }
        String hierarchy = normalizedSource(resolveFromRepoRoot(ROLE_HIERARCHY_SEED_FILE));
        if (!hierarchy.contains(normalize("('ROLE_SYSTEM', 'ROLE_ADMIN', 'SYSTEM')"))) {
            violations.add("ROLE_SYSTEM > ROLE_ADMIN hierarchy seed 소실 — ADMIN_ROLE_WITH_HIERARCHY 의미 drift");
        }

        // [2026-08-20 V2_84] 위 V2_11 토큰은 파일 계보(불변 마이그레이션)의 사실이고, DB 의 현재
        // 상태는 V2_84 가 전진시켰다 — 설문 별칭 게이트 제거(제품 결정: 설문 제출 일반 개방).
        // V2_84 가 사라지면 registry 의 DEFAULT_AUTHENTICATED 선언과 DB 상태가 어긋나므로
        // 제거 계보 자체를 여기에 결속한다.
        String surveyOpen = normalizedSource(resolveFromRepoRoot(SURVEY_ALIAS_REMOVAL_SEED_FILE));
        for (String token : List.of(
                "DELETE FROM public.tb_role_prgrm_map WHERE prgrm_file_nm = 'ADMIN_SURVEY_ALIAS'",
                "DELETE FROM public.tb_prgrm_lst WHERE prgrm_file_nm = 'ADMIN_SURVEY_ALIAS'")) {
            if (!surveyOpen.contains(normalize(token))) {
                violations.add("V2_84 설문 별칭 게이트 제거 token 소실: " + token);
            }
        }
    }

    private SourceCensus scanSources() throws IOException {
        Set<String> helpers = new TreeSet<>();
        Set<String> denials = new TreeSet<>();
        int files = 0;
        for (String root : SOURCE_ROOTS) {
            Path directory = resolveFromRepoRoot(root);
            if (!Files.isDirectory(directory)) {
                fail("인가 source scan root 부재: " + root);
            }
            List<Path> javaFiles = HarnessSourceIndex.javaSources(directory).stream()
                    .sorted()
                    .toList();
            files += javaFiles.size();
            for (Path file : javaFiles) {
                if (!file.getFileName().toString().equals("SecurityUtil.java")) {
                    collectSourceCensus(file, helpers, denials);
                }
            }
        }
        return new SourceCensus(helpers, denials, files);
    }

    private void collectSourceCensus(Path file, Set<String> helpers, Set<String> denials) throws IOException {
        String code = HarnessBaselineIntegrityTest.stripCommentsPreservingStrings(
                HarnessSourceIndex.read(file));
        String className = file.getFileName().toString().replace(".java", "");
        Map<String, Integer> helperCounts = new HashMap<>();
        Matcher guardMatcher = GUARD_CALL.matcher(code);
        while (guardMatcher.find()) {
            String target = className + "#" + findEnclosingMethod(code, guardMatcher.start())
                    + "#" + guardMatcher.group(1);
            helperCounts.merge(target, 1, Integer::sum);
        }
        helperCounts.forEach((target, count) -> helpers.add(target + "=" + count));

        Map<String, Integer> denyCounts = new HashMap<>();
        String portablePath = file.toString().replace('\\', '/');
        if (portablePath.contains("/nuri/business/service/")) {
            Matcher denyMatcher = MANUAL_DENY.matcher(code);
            while (denyMatcher.find()) {
                String method = findEnclosingMethod(code, denyMatcher.start());
                denyCounts.merge(className + "#" + method, 1, Integer::sum);
            }
        }
        denyCounts.forEach((target, count) -> denials.add(target + "=" + count));
    }

    private static String findEnclosingMethod(String code, int position) {
        String prefix = code.substring(0, position);
        Pattern declaration = Pattern.compile(
                "(?:public|protected|private|static|final|synchronized|\\s)+\\s+[\\w\\<\\>\\[\\]]+\\s+"
                        + "([a-zA-Z0-9_]+)\\s*\\([^\\)]*\\)\\s*(?:throws\\s+[\\w\\s,]+)?\\s*\\{");
        Matcher matcher = declaration.matcher(prefix);
        String lastMethod = "unknown";
        while (matcher.find()) {
            lastMethod = matcher.group(1);
        }
        return lastMethod;
    }

    private void validateHelperMeaning(ServiceGuardPolicy guard, GuardMechanism mechanism,
            List<String> violations) {
        String expectedPolicy;
        String expectedAxis;
        switch (mechanism.helper()) {
            case "assertOwnerByEsntlId" -> {
                expectedPolicy = "STRICT_OWNER";
                expectedAxis = "ESNTL_ID";
            }
            case "assertOwnerOrAdminByEsntlId" -> {
                expectedPolicy = "OWNER_OR_ADMIN";
                expectedAxis = "ESNTL_ID";
            }
            case "assertOwnerOrAdmin" -> {
                expectedPolicy = "OWNER_OR_ADMIN";
                expectedAxis = "LOGIN_ID";
            }
            case "assertAdmin" -> {
                expectedPolicy = "ADMIN_OR_SYSTEM";
                expectedAxis = "ROLE";
            }
            default -> {
                violations.add(guard.target() + " unknown SecurityUtil helper: " + mechanism.helper());
                return;
            }
        }
        if (!expectedPolicy.equals(guard.policy())) {
            violations.add(guard.target() + " helper/policy drift: " + mechanism.helper()
                    + " means " + expectedPolicy + ", registry=" + guard.policy());
        }
        if (!expectedAxis.equals(mechanism.identityAxis())) {
            violations.add(guard.target() + " identity axis drift: " + mechanism.helper()
                    + " means " + expectedAxis + ", registry=" + mechanism.identityAxis());
        }
        if (mechanism.count() < 1) {
            violations.add(guard.target() + " helper count must be positive: " + mechanism.count());
        }
    }

    private void validateManualGuardBody(ManualGuardPolicy guard, List<String> violations)
            throws IOException {
        Path source = resolveFromRepoRoot(guard.source());
        if (!Files.isRegularFile(source)) {
            violations.add(guard.target() + " source 부재: " + guard.source());
            return;
        }
        String methodName = guard.target().substring(guard.target().indexOf('#') + 1);
        String code = HarnessBaselineIntegrityTest.stripCommentsPreservingStrings(
                HarnessSourceIndex.read(source));
        String body = extractMethodBody(code, methodName);
        if (body == null) {
            violations.add(guard.target() + " method body 탐지 실패");
            return;
        }
        String normalizedBody = normalize(body);
        for (String token : guard.requiredTokens()) {
            if (!normalizedBody.contains(normalize(token))) {
                violations.add(guard.target() + " required guard token 소실: " + token);
            }
        }
        for (String token : guard.forbiddenTokens()) {
            if (normalizedBody.contains(normalize(token))) {
                violations.add(guard.target() + " forbidden/완화 token 출현: " + token);
            }
        }
    }

    private static String extractMethodBody(String code, String methodName) {
        Pattern declaration = Pattern.compile(
                "(?m)^\\s*(?:public|protected|private)\\s+(?:(?:static|final|synchronized)\\s+)*"
                        + "[\\w.$<>?,\\[\\] ]+\\s+" + Pattern.quote(methodName) + "\\s*\\(");
        Matcher matcher = declaration.matcher(code);
        if (!matcher.find()) {
            return null;
        }
        int open = code.indexOf('{', matcher.end());
        int semicolon = code.indexOf(';', matcher.end());
        if (open < 0 || (semicolon >= 0 && semicolon < open)) {
            return null;
        }
        int depth = 0;
        boolean inString = false;
        boolean inChar = false;
        boolean escaped = false;
        for (int index = open; index < code.length(); index++) {
            char ch = code.charAt(index);
            if (escaped) {
                escaped = false;
                continue;
            }
            if ((inString || inChar) && ch == '\\') {
                escaped = true;
                continue;
            }
            if (!inChar && ch == '"') {
                inString = !inString;
                continue;
            }
            if (!inString && ch == '\'') {
                inChar = !inChar;
                continue;
            }
            if (inString || inChar) {
                continue;
            }
            if (ch == '{') {
                depth++;
            } else if (ch == '}' && --depth == 0) {
                return code.substring(open, index + 1);
            }
        }
        return null;
    }

    private PolicyRegistry loadRegistry() throws IOException {
        Path file = resolveFromRepoRoot(POLICY_FILE);
        if (!Files.isRegularFile(file)) {
            fail("인가 정책 registry 부재: " + file.toAbsolutePath());
        }
        return new ObjectMapper().readValue(file.toFile(), PolicyRegistry.class);
    }

    private static String normalizedSource(Path path) throws IOException {
        return normalize(HarnessBaselineIntegrityTest.stripCommentsPreservingStrings(
                HarnessSourceIndex.read(path)));
    }

    private static String normalize(String value) {
        return value.replaceAll("\\s+", "").trim();
    }

    private static void compareExact(String label, Set<String> expected, Set<String> actual,
            List<String> violations) {
        for (String entry : expected) {
            if (!actual.contains(entry)) {
                violations.add(label + " 소실/변경: " + entry);
            }
        }
        for (String entry : actual) {
            if (!expected.contains(entry)) {
                violations.add(label + " 미등록 신규/변경: " + entry);
            }
        }
    }

    /** 운영 프로파일의 {@code security.whitelist}. test 리소스가 main 을 shadow 하므로 파일에서 직접 읽는다. */
    private List<String> loadProductionWhitelist() {
        YamlPropertiesFactoryBean yaml = new YamlPropertiesFactoryBean();
        yaml.setResources(new FileSystemResource(resolveFromRepoRoot(MAIN_APPLICATION_FILE)));
        Properties application = yaml.getObject();
        if (application == null) {
            return List.of();
        }
        String csv = application.getProperty("security.whitelist");
        if (csv == null || csv.isBlank()) {
            return List.of();
        }
        return Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .toList();
    }

    private static String sha256Hex(String value) {
        try {
            byte[] digest = java.security.MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256을 사용할 수 없습니다", e);
        }
    }

    private static void writeActual(String relative, Set<String> values) {
        try {
            Path path = Paths.get(relative);
            Files.createDirectories(path.getParent());
            Files.write(path, values, StandardCharsets.UTF_8);
        } catch (IOException ignored) {
            // 실제 산출물은 진단 편의용이다. 비교 자체는 메모리에서 수행하므로 IO 실패가 green을 만들지 않는다.
        }
    }

    private static void failIfAny(String title, List<String> violations) {
        if (violations.isEmpty()) {
            return;
        }
        StringBuilder message = new StringBuilder("\n============================================================\n")
                .append("[SECURITY HARNESS] ").append(title).append(" drift\n")
                .append("============================================================\n");
        violations.forEach(violation -> message.append("- ").append(violation).append('\n'));
        message.append("정당한 정책 변경은 도메인 의미/identity axis를 재판정한 뒤 registry와 함께 갱신해야 합니다.");
        fail(message.toString());
    }

    private static Path resolveFromRepoRoot(String relative) {
        Path root = Paths.get(relative);
        if (Files.exists(root)) {
            return root;
        }
        return Paths.get("..", relative);
    }

    private record PolicyRegistry(
            int schemaVersion,
            String authority,
            String description,
            AnalysisModel analysisModel,
            Map<String, String> policyDefinitions,
            List<EndpointPolicy> endpointPolicies,
            List<ServiceGuardPolicy> serviceGuardPolicies,
            List<ManualGuardPolicy> manualGuardPolicies) {
    }

    private record AnalysisModel(
            String endpointEvidence,
            String serviceEvidence,
            List<String> knownLimits) {
    }

    private record EndpointPolicy(
            String method,
            String path,
            String handler,
            String policy,
            String methodSecurity,
            String routeGate,
            String guardRef,
            List<String> handlerRequiredTokens) {
        String key() {
            return method + " " + path;
        }
    }

    private record ServiceGuardPolicy(
            String target,
            String policy,
            List<GuardMechanism> mechanisms) {
    }

    private record GuardMechanism(
            String helper,
            int count,
            String identityAxis) {
    }

    private record ManualGuardPolicy(
            String target,
            String source,
            String policy,
            int denyReferences,
            List<String> requiredTokens,
            List<String> forbiddenTokens) {
    }

    private record ActualEndpoint(
            String method,
            String path,
            String handler,
            String methodSecurity,
            String routeGate) {
        String key() {
            return method + " " + path;
        }

        String describe() {
            return key() + " -> " + handler + " [SpEL='" + methodSecurity + "', route=" + routeGate + "]";
        }
    }

    private record SourceCensus(
            Set<String> helperCalls,
            Set<String> manualDenials,
            int scannedFiles) {
    }
}
