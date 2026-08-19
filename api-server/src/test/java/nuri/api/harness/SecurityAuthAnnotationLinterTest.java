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
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.Set;
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
    private static final String ROLE_HIERARCHY_SEED_FILE =
            "api-server/src/main/resources/db/migration/V2_3__seed_role_hierarchy.sql";
    private static final String MAIN_APPLICATION_FILE = "api-server/src/main/resources/application.yml";
    private static final String HELPER_ACTUAL_OUT = "build/harness/authorization-helper-census.actual.txt";
    private static final String MANUAL_ACTUAL_OUT = "build/harness/authorization-manual-deny-census.actual.txt";

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
            "OWNER_OR_ADMIN_OR_CREDENTIAL",
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
            "OWNER_OR_ADMIN_OR_CREDENTIAL",
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
