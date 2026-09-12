package nuri.api.harness;

import com.fasterxml.jackson.databind.ObjectMapper;
import nuri.business.security.authorization.PermissionPolicy;
import nuri.business.security.authorization.PermissionCodes;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.test.context.ActiveProfiles;
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
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.fail;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * 기능 권한과 자원 관계 가드 정책 하네스.
 *
 * <p>종전 구현은 {@code @PreAuthorize}가 <em>존재</em>하기만 하면
 * {@code permitAll()} 같은 완화도 통과시켰고, 서비스의 수동 소유권 판정은 별도 census 밖이었다.
 * 이 구현은 {@code config/governance/authorization-policies.json}을 단일 정책표로 삼아 다음을 결속한다.
 *
 * <ol>
 *   <li>Spring MVC가 실제 등록한 모든 경로·HTTP 메서드·handler와 명시적 operation binding</li>
 *   <li>합성 애노테이션까지 펼친 정확한 {@code @PreAuthorize} SpEL과 URL 필터 게이트</li>
 *   <li>기능 permission과 {@code STRICT_OWNER} 등 기존 자원 관계·개인정보 제약</li>
 *   <li>{@code SecurityUtil} 호출 전수와 Note/Memo/File 등 손수 작성한 guard의 메서드 내부 fingerprint</li>
 * </ol>
 *
 * <p><b>정직한 한계</b>: MVC 엔드포인트/애노테이션은 Spring 런타임 리플렉션으로 exact-match한다.
 * EXTERNAL Actuator/SockJS 정책은 source/runtime registry와 HTTP 경계 배선을 검사하며, 프레임워크가
 * 특정 환경에서 실제 노출하는 모든 transport URL의 런타임 census를 주장하지 않는다. 서비스는
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
    /** Flyway migration 디렉터리 — 재사용 base 투영본 판별에 쓴다. */
    private static final String MIGRATION_DIR = "api-server/src/main/resources/db/migration";
    /**
     * 재사용 base 투영본 표지 — 생성기가 원본 V2 체인을 검증된 V1 baseline 번들로 통째로 교체한다.
     * 이 파일이 있고 V2 가 하나도 없으면 이 저장소는 파생 base 이며, 아래 역사 계보 파일은
     * <b>존재할 수 없다</b>.
     */
    private static final String BASE_BASELINE_MIGRATION =
            "api-server/src/main/resources/db/migration/V1_0__baseline.sql";
    /** base 부트스트랩 시드 — 투영본에서 V2_11·V2_3 과 같은 의미의 인가 anchor 를 심는다. */
    private static final String BASE_BOOTSTRAP_SEED_FILE =
            "api-server/src/main/resources/db/migration/R__zz_seed_base_admin.sql";
    private static final String HELPER_ACTUAL_OUT = "build/harness/authorization-helper-census.actual.txt";
    private static final String MANUAL_ACTUAL_OUT = "build/harness/authorization-manual-deny-census.actual.txt";
    private static final String READ_SURFACE_ACTUAL_OUT = "build/harness/authorization-read-surface.actual.txt";

    // 2026-09-11: read surface hash is replaced by the full reviewed operationBindings exact set.
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
            "SecurityUtil\\s*\\.\\s*(assertOwnerByEsntlId|assertOwnerOrAdminByEsntlId|assertOwnerOrAdmin|assertAdmin|assertPermission|assertOwnerOrPermissionByEsntlId|assertOwnerOrPermission)\\s*\\(");
    private static final Pattern MANUAL_DENY = Pattern.compile(
            "CommonErrorCode\\s*\\.\\s*(?:ACCESS_DENIED|HANDLE_ACCESS_DENIED)");

    @Autowired
    private WebApplicationContext context;

    @Autowired
    private PermissionPolicy permissionPolicy;
    private Map<String, List<Path>> guardSourcePaths;

    @Test
    @DisplayName("전체 HTTP 바인딩은 실행 중 handler·permission catalog·메서드 인가와 정확히 일치")
    void auditAllOperationBindings() throws Exception {
        PolicyRegistry registry = loadRegistry();
        validateRegistryShape(registry);
        List<String> violations = operationViolations(registry,
                discoverEndpoints(Set.of(RequestMethod.values())));
        Set<String> source = new TreeSet<>();
        registry.operationBindings().forEach(row -> source.add(row.signature()));
        Set<String> runtime = new TreeSet<>();
        permissionPolicy.bindings().forEach(row -> runtime.add(new OperationBinding(row.method(), row.path(),
                row.handler(), row.access(), row.permission(), row.excludedGroups()).signature()));
        compareExact("source/runtime operation bindings", source, runtime, violations);
        var catalog = new ObjectMapper().readTree(resolveFromRepoRoot(registry.permissionCatalog()).toFile());
        Set<String> catalogCodes = new TreeSet<>();
        for (var entry : catalog.path("permissions")) {
            if (!catalogCodes.add(entry.path("code").asText())) {
                violations.add("permission catalog 중복 코드: " + entry.path("code").asText());
            }
        }
        compareExact("generated/source permission codes", catalogCodes, PermissionCodes.ALL, violations);
        failIfAny("ALL OPERATION AUTHORIZATION BINDINGS", violations);
    }

    @Test
    @DisplayName("의도적 handler 누락·permitAll 완화·미등록 경로가 comparator에서 red")
    void operationComparatorRejectsMissingWeakenedOrUnknownEndpoints() throws Exception {
        PolicyRegistry registry = loadRegistry();
        Map<String, ActualEndpoint> original = discoverEndpoints(Set.of(RequestMethod.values()));
        assertTrue(operationViolations(registry, original).isEmpty(), "정상 runtime 집합이 먼저 green이어야 함");
        ActualEndpoint target = original.values().stream()
                .filter(row -> row.path().startsWith("/api/v1/admin/")).findFirst().orElseThrow();
        Map<String, ActualEndpoint> missing = new LinkedHashMap<>(original);
        missing.remove(target.key());
        assertFalse(operationViolations(registry, missing).isEmpty(), "handler 누락이 green이 될 수 없음");
        Map<String, ActualEndpoint> weakened = new LinkedHashMap<>(original);
        weakened.put(target.key(), new ActualEndpoint(target.method(), target.path(), target.handler(),
                "permitAll()", target.routeGate()));
        assertFalse(operationViolations(registry, weakened).isEmpty(), "permitAll 완화 탐지");
        Map<String, ActualEndpoint> unknown = new LinkedHashMap<>(original);
        unknown.put("GET /api/v1/unregistered-probe", new ActualEndpoint("GET", "/api/v1/unregistered-probe",
                target.handler(), target.methodSecurity(), target.routeGate()));
        assertFalse(operationViolations(registry, unknown).isEmpty(), "unknown endpoint fail-closed");

        List<OperationBinding> unknownPermission = new ArrayList<>(registry.operationBindings());
        int index = java.util.stream.IntStream.range(0, unknownPermission.size())
                .filter(i -> "PERMISSION".equals(unknownPermission.get(i).access())).findFirst().orElseThrow();
        OperationBinding bound = unknownPermission.get(index);
        unknownPermission.set(index, new OperationBinding(bound.method(), bound.path(), bound.handler(),
                bound.access(), "NOT_IN_CATALOG", bound.excludedGroups()));
        assertFalse(operationViolations(registry.withOperations(unknownPermission), original).isEmpty(),
                "존재하지 않는 permission 코드 fail-closed");

        List<OperationBinding> privacyExpanded = registry.operationBindings().stream()
                .map(row -> row.handler().contains("PrivacyLogApiController#")
                        ? new OperationBinding(row.method(), row.path(), row.handler(), row.access(), row.permission(), List.of())
                        : row).toList();
        assertFalse(operationViolations(registry.withOperations(privacyExpanded), original).isEmpty(),
                "SYSTEM 개인정보 배제 조건 삭제 탐지");
    }

    private List<String> operationViolations(PolicyRegistry registry, Map<String, ActualEndpoint> actual) {
        List<String> violations = new ArrayList<>();
        Map<String, OperationBinding> expected = operationMap(registry, violations);
        if (expected.size() < 350 || actual.size() < 350) {
            violations.add("전체 operation endpoint 하한(350) 미달");
        }
        actual.values().forEach(endpoint -> validateOperationMatch(expected.get(endpoint.key()), endpoint, violations));
        expected.values().stream().filter(row -> !row.external() && !actual.containsKey(row.key()))
                .forEach(row -> violations.add("stale operation binding: " + row.key()));
        return violations;
    }

    private static Map<String, OperationBinding> operationMap(PolicyRegistry registry, List<String> violations) {
        Map<String, OperationBinding> expected = new LinkedHashMap<>();
        for (OperationBinding row : registry.operationBindings()) {
            if (expected.put(row.key(), row) != null) violations.add("중복 operation endpoint: " + row.key());
            if (!Set.of("PUBLIC", "AUTHENTICATED", "PERMISSION", "DENY").contains(row.access())) {
                violations.add("unknown operation access: " + row.key());
            }
            if ("PERMISSION".equals(row.access())
                    ? row.permission() == null || !PermissionCodes.ALL.contains(row.permission())
                    : row.permission() != null) {
                violations.add("operation permission catalog drift: " + row.key());
            }
            if (row.path().startsWith("/api/v1/admin/")
                    && !Set.of("PERMISSION", "DENY").contains(row.access())) {
                violations.add("관리 기능을 명시적 permission 없이 공개: " + row.key());
            }
            if (row.handler().contains("PrivacyLogApiController#")
                    && (row.excludedGroups() == null || !row.excludedGroups().equals(List.of("ROLE_SYSTEM")))) {
                violations.add("개인정보 SYSTEM 배제 drift: " + row.key());
            }
            if (row.external() && !(row.path().equals("/actuator") || row.path().startsWith("/actuator/")
                    || row.path().equals("/ws") || row.path().startsWith("/ws/"))) {
                violations.add("MVC 경로를 EXTERNAL로 숨김: " + row.key());
            }
        }
        return expected;
    }

    private static void validateOperationMatch(OperationBinding binding, ActualEndpoint endpoint,
                                               List<String> violations) {
        if (binding == null) {
            violations.add("미등록 operation endpoint: " + endpoint.key());
        } else {
            if (!binding.handler().equals(endpoint.handler())) violations.add("operation handler drift: " + endpoint.key());
            if (!methodGuard(binding.handler()).equals(endpoint.methodSecurity())) {
                violations.add("operation method-security drift: " + endpoint.key() + " => " + endpoint.methodSecurity());
            }
            if (!binding.routeGate().equals(endpoint.routeGate())) violations.add("operation gate drift: " + endpoint.key());
        }
    }

    private static String methodGuard(String handler) {
        return "@permissionPolicy.allowed(authentication, '" + handler + "')";
    }

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
        validateCurrentAndHistoricalAuthorizationSources(violations);
        failIfAny("WRITE AUTHORIZATION POLICY MATRIX", violations);
    }

    /** Every current read route is bound to an explicit reviewed operation and method guard. */
    @Test
    @DisplayName("읽기 endpoint exact policy + 관리자 공개 노출 차단")
    void auditReadEndpointAuthorizationSurface() throws Exception {
        PolicyRegistry registry = loadRegistry();
        List<String> violations = new ArrayList<>();
        Map<String, ActualEndpoint> actual = discoverEndpoints(Set.of(RequestMethod.GET));
        Map<String, OperationBinding> expected = operationMap(registry, violations);
        if (actual.size() < READ_ENDPOINT_FLOOR) {
            violations.add("읽기 endpoint 스캔 하한 미달: " + actual.size());
        }
        Set<String> census = new TreeSet<>();
        for (ActualEndpoint endpoint : actual.values()) {
            OperationBinding binding = expected.get(endpoint.key());
            validateOperationMatch(binding, endpoint, violations);
            if (endpoint.path().startsWith("/api/v1/admin/")
                    && binding != null && !Set.of("PERMISSION", "DENY").contains(binding.access())) {
                violations.add("관리자 GET 기능 권한 경계가 열림: " + endpoint.key());
            }
            census.add(endpoint.describe());
        }
        for (OperationBinding binding : expected.values()) {
            if (!binding.external() && "GET".equals(binding.method()) && !actual.containsKey(binding.key())) {
                violations.add("삭제된 읽기 endpoint 정책: " + binding.key());
            }
        }
        writeActual(READ_SURFACE_ACTUAL_OUT, census);
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
        return discoverEndpoints(WRITE_METHODS);
    }

    private Map<String, ActualEndpoint> discoverEndpoints(Set<RequestMethod> requestedMethods) {
        RequestMappingHandlerMapping mappings = context.getBean(
                "requestMappingHandlerMapping", RequestMappingHandlerMapping.class);
        Map<String, ActualEndpoint> actual = new LinkedHashMap<>();

        mappings.getHandlerMethods().entrySet().stream()
                .sorted(Comparator.comparing(entry -> entry.getValue().toString()))
                .forEach(entry -> collectEndpoint(entry, requestedMethods, actual));
        return actual;
    }

    private void collectEndpoint(Map.Entry<RequestMappingInfo, HandlerMethod> entry,
            Set<RequestMethod> requestedMethods,
            Map<String, ActualEndpoint> sink) {
        HandlerMethod handler = entry.getValue();
        if (!handler.getBeanType().getPackageName().startsWith("nuri.api.controller")) {
            return;
        }
        Set<RequestMethod> declaredMethods = entry.getKey().getMethodsCondition().getMethods();
        Set<RequestMethod> effectiveMethods = declaredMethods.isEmpty() ? Set.of(RequestMethod.values()) : declaredMethods;
        for (RequestMethod method : effectiveMethods) {
            if (!requestedMethods.contains(method)) {
                continue;
            }
            for (String path : entry.getKey().getPatternValues()) {
                ActualEndpoint endpoint = new ActualEndpoint(
                        method.name(),
                        path,
                        handler.getBeanType().getName() + "#" + handler.getMethod().getName(),
                        mergedPreAuthorizeValue(handler),
                        routeGate(method.name(), path));
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

    private String routeGate(String method, String path) {
        return permissionPolicy.bindings().stream()
                .filter(row -> row.method().equals(method) && row.path().equals(path))
                .map(row -> new OperationBinding(row.method(), row.path(), row.handler(), row.access(),
                        row.permission(), row.excludedGroups()).routeGate())
                .findFirst().orElse("UNREGISTERED_DENY");
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
        if (registry.operationBindings() == null || registry.operationBindings().size() < 350) {
            violations.add("operation binding registry 하한 미달");
        }
        if (!"config/governance/permission-catalog.json".equals(registry.permissionCatalog())) {
            violations.add("operation catalog 원본 경로 drift");
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
                    && (!methodGuard(endpoint.handler()).equals(endpoint.methodSecurity())
                        || !"OPERATION_PERMISSION".equals(endpoint.routeGate()))) {
                violations.add(endpoint.key() + " 관리자 기능의 명시적 operation 권한 경계 필요");
            }
            if ("ADMIN_OR_SYSTEM".equals(endpoint.policy())) {
                boolean methodGate = methodGuard(endpoint.handler()).equals(endpoint.methodSecurity());
                boolean urlGate = "OPERATION_PERMISSION".equals(endpoint.routeGate());
                boolean serviceGate = endpoint.guardRef() != null
                        && "ADMIN_OR_SYSTEM".equals(guardPolicies.get(endpoint.guardRef()));
                if ((!methodGate || !urlGate) && !serviceGate) {
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
        String code = HarnessSourceIndex.stripCommentsPreservingStrings(HarnessSourceIndex.read(source));
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

    private void validateCurrentAndHistoricalAuthorizationSources(List<String> violations) throws IOException {
        String config = normalizedSource(resolveFromRepoRoot(
                "api-server/src/main/java/nuri/api/config/ApiSecurityConfig.java"));
        for (String token : List.of(
                "auth.anyRequest().access(new nuri.business.security.authorization.OperationAuthorizationManager(",
                "pathMatcher(\"/api/v1/**\")", "pathMatcher(\"/actuator/**\")",
                "pathMatcher(\"/ws\")", "pathMatcher(\"/ws/**\")")) {
            if (!config.contains(normalize(token))) violations.add("현재 HTTP 인가 실행 경계 소실: " + token);
        }
        /*
          [2026-09-12] 재사용 base 투영본에는 아래 역사 계보 파일(V2_11·V2_3·V2_84)이 **존재하지 않는다**
          — 생성기가 원본 V2 체인을 검증된 V1 baseline 번들로 통째로 교체하기 때문이다. 종전에는 그
          자리에서 NoSuchFileException 이 나 이 보안 게이트가 투영본에서 통째로 red 였다(demo 실측).

          ⚠ "파일이 없으면 통과" 로 두면 본체에서 V2_11 을 지우는 은폐 경로가 열린다. 그래서 판별은
            **V1 baseline 이 있고 V2 가 하나도 없을 때만** 성립한다 — 본체에는 V2 가 101개 있으므로
            V2_11 하나를 지워도 이 분기로 새지 않고 종전대로 red 다.
          ⚠ 그리고 건너뛰지 않는다. 투영본에서는 같은 의미의 인가 anchor 를 base 부트스트랩 시드에서
            검사한다 — 그 파일마저 없으면 읽기 실패로 fail-closed 다. 설문·도움말 별칭 토큰은
            요구하지 않는다: 부트스트랩 시드는 ADMIN_ALL·ACTUATOR_ALL 만 심으며(별칭 없음),
            설문 별칭 게이트는 V2_84 가 제거한 것이 제품 결정이다(DEC-OPS-010).
        */
        if (isProjectedReusableBase()) {
            String bootstrap = normalizedSource(resolveFromRepoRoot(BASE_BOOTSTRAP_SEED_FILE));
            for (String token : List.of(
                    "('ADMIN_ALL', '관리자 전체', '/api/v1/admin/**'",
                    "('ROLE_ADMIN', 'ADMIN_ALL')",
                    "('ROLE_SYSTEM', 'ADMIN_ALL')",
                    "('ROLE_SYSTEM', 'ROLE_ADMIN', 'SYSTEM')")) {
                if (!bootstrap.contains(normalize(token))) {
                    violations.add("base bootstrap 인가 anchor 소실: " + token);
                }
            }
            return;
        }

        // 불변 migration은 과거 데이터 계보만 증명한다. 현재 인가는 위 실행 경계와 operation registry로 판정한다.
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
            violations.add("ROLE_SYSTEM > ROLE_ADMIN 역사적 hierarchy seed 소실");
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
        String code = HarnessSourceIndex.stripCommentsPreservingStrings(
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
            List<String> violations) throws IOException {
        String expectedPolicy;
        String expectedAxis;
        switch (mechanism.helper()) {
            case "assertOwnerByEsntlId" -> {
                expectedPolicy = "STRICT_OWNER";
                expectedAxis = "ESNTL_ID";
            }
            case "assertOwnerOrPermissionByEsntlId" -> {
                expectedPolicy = "OWNER_OR_ADMIN";
                expectedAxis = "ESNTL_ID";
            }
            case "assertOwnerOrPermission" -> {
                expectedPolicy = "OWNER_OR_ADMIN";
                expectedAxis = "LOGIN_ID";
            }
            case "assertAdmin", "assertOwnerOrAdmin", "assertOwnerOrAdminByEsntlId" -> {
                violations.add(guard.target() + " retired role-based helper cannot authorize operations: " + mechanism.helper());
                return;
            }
            case "assertPermission" -> {
                expectedPolicy = "ADMIN_OR_SYSTEM";
                expectedAxis = "PERMISSION";
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
        if (mechanism.helper().contains("Permission")) {
            validatePermissionArguments(guard, mechanism, violations);
        }
    }

    private void validatePermissionArguments(ServiceGuardPolicy guard, GuardMechanism mechanism,
                                             List<String> violations) throws IOException {
        String[] target = guard.target().split("#", 2);
        String source = sourceForGuard(target[0]);
        String body = extractMethodBody(source, target[1], guard.parameterCount());
        if (body == null) {
            violations.add(guard.target() + " permission guard body 부재");
            return;
        }
        int argumentIndex = mechanism.helper().equals("assertPermission") ? 0 : 1;
        String expected;
        if (guard.permissionParameter() == null) {
            if (mechanism.permission() == null || !PermissionCodes.ALL.contains(mechanism.permission())) {
                violations.add(guard.target() + " permission 코드 누락/미등록");
                return;
            }
            expected = "\"" + mechanism.permission() + "\"";
        } else {
            expected = guard.permissionParameter().name();
            if (expected == null || !expected.matches("[a-zA-Z][a-zA-Z0-9]*")
                    || guard.permissionParameter().callers() == null || guard.permissionParameter().callers().isEmpty()) {
                violations.add(guard.target() + " permission parameter/caller 계약 부재");
                return;
            }
            validatePermissionCallers(guard, source, target[1], violations);
        }
        if (!exactPermissionCalls(body, mechanism.helper(), argumentIndex, expected, mechanism.count())) {
            violations.add(guard.target() + " " + mechanism.helper() + " exact permission argument/count drift");
        }
    }

    private static boolean exactPermissionCalls(String body, String helper, int index, String expected, int count) {
        List<List<String>> calls = callArguments(body, "SecurityUtil\\s*\\.\\s*" + Pattern.quote(helper));
        return calls.size() == count && calls.stream()
                .allMatch(args -> args.size() == index + 1 && expected.equals(args.get(index)));
    }

    @Test
    @DisplayName("기능 guard 코드변경·삭제·인자순서 변경은 red, 중첩 owner getter는 정상 파싱")
    void permissionArgumentComparatorRejectsChangedRemovedAndReorderedGrants() {
        String valid = "SecurityUtil.assertOwnerOrPermission(owner.get(lookup(1, 2)), \"BOARD_UPDATE_ALL\");";
        assertTrue(exactPermissionCalls(valid, "assertOwnerOrPermission", 1, "\"BOARD_UPDATE_ALL\"", 1));
        assertFalse(exactPermissionCalls(valid.replace("BOARD_UPDATE_ALL", "BOARD_READ_ALL"),
                "assertOwnerOrPermission", 1, "\"BOARD_UPDATE_ALL\"", 1));
        assertFalse(exactPermissionCalls("return;", "assertOwnerOrPermission", 1, "\"BOARD_UPDATE_ALL\"", 1));
        assertFalse(exactPermissionCalls("SecurityUtil.assertOwnerOrPermission(\"BOARD_UPDATE_ALL\", owner);",
                "assertOwnerOrPermission", 1, "\"BOARD_UPDATE_ALL\"", 1));
        assertEquals("AUTHRT_ASSIGN", literalCallerPermission(List.of("\"AUTHRT_ASSIGN\""), 0));
        assertNull(literalCallerPermission(List.of("request.permission()"), 0));
        assertNull(literalCallerPermission(List.of("\"AUTHRT_ASSIGN\"", "ignored"), 0));
        assertNull(literalCallerPermission(List.of(), 0));
    }

    private void validatePermissionCallers(ServiceGuardPolicy guard, String source, String method,
                                           List<String> violations) throws IOException {
        Map<String, String> sources = new TreeMap<>();
        if (guard.permissionParameter().qualifiedCallers()) {
            for (String root : SOURCE_ROOTS) {
                for (Path file : HarnessSourceIndex.javaSources(resolveFromRepoRoot(root))) {
                    String code = HarnessSourceIndex.stripCommentsPreservingStrings(HarnessSourceIndex.read(file));
                    if (!Pattern.compile(Pattern.quote(method) + "\\s*\\(").matcher(code).find()) continue;
                    String className = file.getFileName().toString().replace(".java", "");
                    if (sources.put(className, code) != null) violations.add("Ambiguous permission caller source: " + className);
                }
            }
        } else sources.put("", source);
        int index = guard.permissionParameter().argumentIndex() == null ? 1 : guard.permissionParameter().argumentIndex();
        if (index < 0 || index > 1) { violations.add(guard.target() + " unsupported permission argument index"); return; }
        Map<String, String> actual = new TreeMap<>();
        for (var entry : sources.entrySet()) {
            Matcher declarations = Pattern.compile("(?m)^\\s*(?:public|protected|private)\\s+(?:(?:static|final|synchronized)\\s+)*"
                    + "[\\w.$<>?,\\[\\] ]+\\s+(\\w+)\\s*\\(").matcher(entry.getValue());
            while (declarations.find()) {
                String caller = declarations.group(1);
                String body = extractMethodBody(entry.getValue(), caller);
                if (body == null) continue;
                for (List<String> args : callArguments(body, "(?<![\\w$])" + Pattern.quote(method))) {
                    String permission = literalCallerPermission(args, index);
                    if (permission == null) { violations.add(guard.target() + " 호출부의 literal permission 필요: " + caller); continue; }
                    String key = entry.getKey().isEmpty() ? caller : entry.getKey() + "#" + caller;
                    if (!PermissionCodes.ALL.contains(permission) || actual.put(key, permission) != null) {
                        violations.add(guard.target() + " 중복/미등록 permission caller: " + key);
                    }
                }
            }
        }
        if (!actual.equals(guard.permissionParameter().callers())) {
            violations.add(guard.target() + " permission caller 집합/코드 drift: " + actual);
        }
    }

    private static String literalCallerPermission(List<String> args, int index) {
        if (args.size() != index + 1 || !args.get(index).matches("\"[A-Z][A-Z0-9_]*\"")) return null;
        return args.get(index).substring(1, args.get(index).length() - 1);
    }

    private String sourceForGuard(String className) throws IOException {
        if (guardSourcePaths == null) {
            guardSourcePaths = new HashMap<>();
            for (String root : SOURCE_ROOTS) {
                for (Path file : HarnessSourceIndex.javaSources(resolveFromRepoRoot(root))) {
                    guardSourcePaths.computeIfAbsent(file.getFileName().toString().replace(".java", ""),
                            ignored -> new ArrayList<>()).add(file);
                }
            }
        }
        List<Path> matches = guardSourcePaths.getOrDefault(className, List.of());
        if (matches.size() != 1) throw new IOException("Ambiguous or missing guard source: " + className);
        return HarnessSourceIndex.stripCommentsPreservingStrings(HarnessSourceIndex.read(matches.get(0)));
    }

    /** Balanced call parser keeps nested owner getters and quoted delimiters out of argument boundaries. */
    private static List<List<String>> callArguments(String body, String calleePattern) {
        List<List<String>> result = new ArrayList<>();
        Matcher calls = Pattern.compile(calleePattern + "\\s*\\(").matcher(body);
        while (calls.find()) {
            List<String> arguments = new ArrayList<>();
            int start = calls.end();
            int depth = 0;
            boolean quoted = false;
            boolean escaped = false;
            boolean closed = false;
            for (int i = start; i < body.length(); i++) {
                char ch = body.charAt(i);
                if (escaped) { escaped = false; continue; }
                if (quoted && ch == '\\') { escaped = true; continue; }
                if (ch == '"') { quoted = !quoted; continue; }
                if (quoted) continue;
                if (ch == '(' || ch == '[' || ch == '{') depth++;
                else if (ch == ')' && depth == 0) {
                    arguments.add(body.substring(start, i).trim());
                    closed = true;
                    break;
                } else if (ch == ')' || ch == ']' || ch == '}') depth--;
                else if (ch == ',' && depth == 0) {
                    arguments.add(body.substring(start, i).trim());
                    start = i + 1;
                }
            }
            if (!closed) throw new IllegalArgumentException("Unclosed authorization call");
            result.add(arguments);
        }
        return result;
    }

    private void validateManualGuardBody(ManualGuardPolicy guard, List<String> violations)
            throws IOException {
        Path source = resolveFromRepoRoot(guard.source());
        if (!Files.isRegularFile(source)) {
            violations.add(guard.target() + " source 부재: " + guard.source());
            return;
        }
        String methodName = guard.target().substring(guard.target().indexOf('#') + 1);
        String code = HarnessSourceIndex.stripCommentsPreservingStrings(
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
        return extractMethodBody(code, methodName, null);
    }

    private static String extractMethodBody(String code, String methodName, Integer parameterCount) {
        Pattern declaration = Pattern.compile(
                "(?m)^\\s*(?:public|protected|private)\\s+(?:(?:static|final|synchronized)\\s+)*"
                        + "[\\w.$<>?,\\[\\] ]+\\s+" + Pattern.quote(methodName) + "\\s*\\(");
        Matcher matcher = declaration.matcher(code);
        int selectedEnd = -1;
        while (matcher.find()) {
            if (parameterCount != null && declarationParameterCount(code, matcher.end()) != parameterCount) continue;
            if (selectedEnd >= 0) return null; // Same-arity overloads need a more precise contract, never first-match approval.
            selectedEnd = matcher.end();
            if (parameterCount == null) break;
        }
        if (selectedEnd < 0) return null;
        int open = code.indexOf('{', selectedEnd);
        int semicolon = code.indexOf(';', selectedEnd);
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

    private static int declarationParameterCount(String code, int start) {
        int parentheses = 0, brackets = 0, braces = 0, angles = 0, commas = 0;
        boolean quoted = false, character = false, escaped = false;
        for (int i = start; i < code.length(); i++) {
            char ch = code.charAt(i);
            if (escaped) { escaped = false; continue; }
            if ((quoted || character) && ch == '\\') { escaped = true; continue; }
            if (!character && ch == '"') { quoted = !quoted; continue; }
            if (!quoted && ch == '\'') { character = !character; continue; }
            if (quoted || character) continue;
            if (ch == ')' && parentheses == 0) return code.substring(start, i).isBlank() ? 0 : commas + 1;
            if (ch == '(') parentheses++;
            else if (ch == ')') parentheses--;
            else if (ch == '[') brackets++;
            else if (ch == ']') brackets--;
            else if (ch == '{') braces++;
            else if (ch == '}') braces--;
            else if (ch == '<') angles++;
            else if (ch == '>') angles--;
            else if (ch == ',' && parentheses == 0 && brackets == 0 && braces == 0 && angles == 0) commas++;
        }
        return -1;
    }

    @Test
    @DisplayName("퇴역 overload가 실제 guard를 가리지 않고 잘못된 인자 개수·중복·guard 삭제는 red")
    void permissionGuardSelectsOnlyTheDeclaredOverload() {
        String source = """
                public void grant(String group, String menus) { throw invalid(); }
                public void grant(String group, String menus, String version) {
                    SecurityUtil.assertPermission("AUTHRT_GRANT");
                }
                """;
        String actual = extractMethodBody(source, "grant", 3);
        assertNotNull(actual);
        assertTrue(exactPermissionCalls(actual, "assertPermission", 0, "\"AUTHRT_GRANT\"", 1));
        assertFalse(exactPermissionCalls(extractMethodBody(source, "grant", 2),
                "assertPermission", 0, "\"AUTHRT_GRANT\"", 1));
        assertNull(extractMethodBody(source, "grant", 4));
        assertNull(extractMethodBody(source + "\npublic void grant(Long group, String menus, String version) {}", "grant", 3));
        assertFalse(exactPermissionCalls(extractMethodBody(source.replace("SecurityUtil.assertPermission(\"AUTHRT_GRANT\");", ""), "grant", 3),
                "assertPermission", 0, "\"AUTHRT_GRANT\"", 1));
        assertEquals(2, declarationParameterCount("@Named(\"a,b\") Map<String, List<Long>> map, String[] names)", 0));
        assertEquals(0, declarationParameterCount(")", 0));
        assertEquals(-1, declarationParameterCount("String unterminated", 0));
    }

    private PolicyRegistry loadRegistry() throws IOException {
        Path file = resolveFromRepoRoot(POLICY_FILE);
        if (!Files.isRegularFile(file)) {
            fail("인가 정책 registry 부재: " + file.toAbsolutePath());
        }
        return new ObjectMapper().readValue(file.toFile(), PolicyRegistry.class);
    }

    /**
     * 재사용 base 투영본인가 — V1 baseline 이 있고 역사적 V2 체인이 하나도 없는 상태.
     *
     * <p>두 조건을 <b>함께</b> 요구하는 것이 핵심이다. 파일 부재만 보면 본체에서 역사 파일을 지우는
     * 은폐가 통과하고, V1 존재만 보면 V1 을 하나 심는 것으로 검사를 끌 수 있다.
     */
    private static boolean isProjectedReusableBase() throws IOException {
        if (!Files.isRegularFile(resolveFromRepoRoot(BASE_BASELINE_MIGRATION))) {
            return false;
        }
        Path migrationDir = resolveFromRepoRoot(MIGRATION_DIR);
        return Files.isDirectory(migrationDir)
                && HarnessSourceIndex.filesUnder(migrationDir,
                        path -> path.getFileName().toString().startsWith("V2_")).isEmpty();
    }

    private static String normalizedSource(Path path) throws IOException {
        return normalize(HarnessSourceIndex.stripCommentsPreservingStrings(
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
            List<ManualGuardPolicy> manualGuardPolicies,
            String permissionCatalog,
            List<OperationBinding> operationBindings) {
        PolicyRegistry withOperations(List<OperationBinding> operations) {
            return new PolicyRegistry(schemaVersion, authority, description, analysisModel, policyDefinitions,
                    endpointPolicies, serviceGuardPolicies, manualGuardPolicies, permissionCatalog, operations);
        }
    }

    private record OperationBinding(String method, String path, String handler, String access, String permission,
                                    List<String> excludedGroups) {
        String key() { return method + " " + path; }
        boolean external() { return handler.startsWith("EXTERNAL#"); }
        String routeGate() {
            return switch (access) {
                case "PUBLIC" -> "PUBLIC_FILTER";
                case "AUTHENTICATED" -> "EXPLICIT_AUTHENTICATED";
                case "PERMISSION" -> "OPERATION_PERMISSION";
                default -> "EXPLICIT_DENY";
            };
        }
        String signature() {
            return key() + "|" + handler + "|" + access + "|" + permission + "|"
                    + (excludedGroups == null ? List.of() : excludedGroups.stream().sorted().toList());
        }
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
            List<GuardMechanism> mechanisms,
            PermissionParameter permissionParameter,
            Integer parameterCount) {
    }

    private record PermissionParameter(String name, Map<String, String> callers, Integer argumentIndex, boolean qualifiedCallers) {}

    private record GuardMechanism(
            String helper,
            int count,
            String identityAxis,
            String permission) {
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
