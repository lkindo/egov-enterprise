package nuri.api.harness;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.yaml.snakeyaml.Yaml;

import java.io.IOException;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.fail;

/**
 * 🧾 GitHub Actions 워크플로 매니페스트 파싱 게이트.
 *
 * <p>[고친 결함 · 2026-08-03~04] {@code .github/workflows/secret-scan-history.yml} 은 {@code run: |}
 * 블록 스칼라 안의 heredoc 본문이 <b>컬럼 0</b> 에 있었다. 그러면 YAML 블록이 그 줄에서 끝나고
 * 파일 전체가 invalid 가 된다. GitHub 은 {@code on:} 을 읽지도 못해 <b>잡을 만들지 못한 채
 * startup_failure</b> 로 죽었고, push 마다 빨간 X 만 남겼다 — 그 워크플로는 <b>한 번도 실행된 적이 없다</b>.
 *
 * <p>[왜 게이트인가] 이 실패 양식이 고약한 이유는 <b>실패가 조용하다</b>는 데 있다. 워크플로 파일은
 * 컴파일되지 않고, 어떤 로컬 게이트도 읽지 않으며, 저장소 안에서는 정상으로 보인다. 결과적으로
 * "게이트가 있다" 는 서술만 남고 집행은 0 이 된다 — GEMINI.md §0.7-H5 가 지목한 바로 그 상태다.
 *
 * <p>[판정 축] {@code .github/workflows/*.yml|yaml} 전부에 대해
 * ① YAML 로 파싱될 것 ② 최상위가 매핑일 것 ③ {@code on}(트리거)과 {@code jobs} 가 있고
 * {@code jobs} 가 비어 있지 않을 것. 문법만 보는 얕은 검사이며 액션 스키마 전체를 검증하지는 않는다 —
 * 그래도 이번에 실제로 발생한 실패(파싱 불가·트리거 소실)는 정확히 이 축에서 잡힌다.
 *
 * <p><b>⚠ YAML 의 {@code on:} 함정</b>: YAML 1.1 은 {@code on} 을 불리언 {@code true} 로 읽는다.
 * SnakeYAML 도 그렇게 파싱하므로 키 조회 시 {@code "on"} 과 {@code Boolean.TRUE} 를 모두 본다.
 * (이 사실을 모르면 "트리거가 없다"는 거짓 위반이 난다.)
 */
class WorkflowManifestLinterTest {

    private static final Logger log = LoggerFactory.getLogger(WorkflowManifestLinterTest.class);

    private static final String WORKFLOW_DIR = ".github/workflows";

    @Test
    @DisplayName("🧾 모든 GitHub Actions 워크플로가 파싱되고 트리거·잡을 갖는다 — 조용히 실행되지 않는 워크플로 차단")
    void auditWorkflowManifestsParseAndDeclareJobs() throws IOException {
        Path dir = resolveRepoRoot().resolve(WORKFLOW_DIR);
        if (!Files.isDirectory(dir)) {
            fail("게이트 무결성 파손: 워크플로 디렉터리를 찾을 수 없습니다 — " + dir.toAbsolutePath());
        }

        List<Path> manifests;
        try (Stream<Path> stream = Files.list(dir)) {
            manifests = stream
                    .filter(p -> p.getFileName().toString().matches(".*\\.ya?ml$"))
                    .sorted()
                    .toList();
        }

        // 게이트 무결성(false-green 방지): 스캔이 조용히 0 에 수렴하면 vacuous 통과가 된다.
        if (manifests.size() < 5) {
            fail("게이트 무결성 파손: 워크플로 파일 스캔 건수(" + manifests.size()
                    + ")가 예상 하한(5) 미만 — 경로/스캔 파손 의심. 실측 기준값은 8건(2026-08-04)이다.");
        }

        List<String> violations = new ArrayList<>();
        for (Path manifest : manifests) {
            String name = manifest.getFileName().toString();
            Object parsed;
            try (Reader reader = Files.newBufferedReader(manifest, StandardCharsets.UTF_8)) {
                parsed = new Yaml().load(reader);
            } catch (RuntimeException ex) {
                violations.add(name + " — YAML 파싱 실패: " + firstLine(ex.getMessage()));
                continue;
            }

            if (!(parsed instanceof Map<?, ?> root)) {
                violations.add(name + " — 최상위가 매핑이 아님(빈 파일 또는 스칼라)");
                continue;
            }

            // YAML 1.1 에서 on 은 불리언 true 로 읽힌다.
            Object triggers = root.containsKey("on") ? root.get("on") : root.get(Boolean.TRUE);
            if (triggers == null) {
                violations.add(name + " — 트리거(on) 선언 없음: 어떤 이벤트로도 실행되지 않는다");
            }

            Object jobs = root.get("jobs");
            if (!(jobs instanceof Map<?, ?> jobMap) || jobMap.isEmpty()) {
                violations.add(name + " — jobs 가 없거나 비어 있음");
            }
        }

        if (!violations.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            sb.append("\n========================================================================\n");
            sb.append("🧾 [WORKFLOW MANIFEST GATE] 실행될 수 없는 워크플로가 있습니다!\n");
            sb.append("========================================================================\n");
            violations.forEach(v -> sb.append("❌ ").append(v).append('\n'));
            sb.append("\n💡 invalid 워크플로는 GitHub 에서 startup_failure 로 죽는다 — 잡이 만들어지지도 않으므로\n");
            sb.append("   '게이트가 돌고 있다'는 전제가 통째로 거짓이 된다(§0.7-H5).\n");
            sb.append("   흔한 원인: run: | 블록 안의 heredoc 본문을 컬럼 0 으로 내려 블록 스칼라를 종료시킨 경우.\n");
            fail(sb.toString());
        }

        log.info("✅ 워크플로 매니페스트 {}건 전부 파싱·트리거·잡 선언 확인.", manifests.size());
    }

    @Test
    @DisplayName("🚀 릴리스는 main의 필수 CI 증거와 실제 이미지 발행 없이는 생성되지 않는다")
    void auditReleaseRequiresCompleteCiEvidenceAndPublishedImages() throws IOException {
        Path repoRoot = resolveRepoRoot();
        Path releasePath = repoRoot.resolve(WORKFLOW_DIR).resolve("release.yml");
        if (!Files.isRegularFile(releasePath)) {
            fail("게이트 무결성 파손: release.yml 을 찾을 수 없습니다 — " + releasePath.toAbsolutePath());
        }

        Path requiredChecksPath = repoRoot.resolve(".github/required-checks.json");
        if (!Files.isRegularFile(requiredChecksPath)) {
            fail("게이트 무결성 파손: required check SSOT 를 찾을 수 없습니다 — "
                    + requiredChecksPath.toAbsolutePath());
        }
        JsonNode requiredChecks = new ObjectMapper()
                .readTree(Files.readString(requiredChecksPath, StandardCharsets.UTF_8))
                .path("requiredChecks");
        if (!requiredChecks.isArray() || requiredChecks.isEmpty()) {
            fail("required check SSOT 의 requiredChecks 배열이 비어 있거나 유효하지 않습니다.");
        }

        Map<?, ?> root;
        try (Reader reader = Files.newBufferedReader(releasePath, StandardCharsets.UTF_8)) {
            Object parsed = new Yaml().load(reader);
            if (!(parsed instanceof Map<?, ?> parsedRoot)) {
                fail("release.yml 최상위가 매핑이 아닙니다.");
                return;
            }
            root = parsedRoot;
        }

        List<String> violations = new ArrayList<>();
        String ciWorkflow = Files.readString(repoRoot.resolve(WORKFLOW_DIR).resolve("ci.yml"),
                StandardCharsets.UTF_8);
        if (!ciWorkflow.contains("node --test scripts/required-checks-contract.test.mjs")) {
            violations.add("ci.yml 에 required check SSOT 회귀 테스트 실행 경로가 없음");
        }
        Map<?, ?> permissions = asMap(root.get("permissions"));
        if (!"read".equals(Objects.toString(permissions.get("checks"), ""))) {
            violations.add("permissions.checks=read 누락 — 태그 SHA의 CI check-run을 검증할 수 없음");
        }

        Map<?, ?> jobs = asMap(root.get("jobs"));
        Map<?, ?> verify = asMap(jobs.get("verify"));
        List<?> verifySteps = asList(verify.get("steps"));
        Map<?, ?> ciEvidenceStep = findStep(verifySteps,
                "Require tagged commit on main with complete CI evidence");
        String ciEvidenceRun = Objects.toString(ciEvidenceStep.get("run"), "");
        for (String requiredFragment : List.of(
                "git merge-base --is-ancestor",
                ".github/required-checks.json",
                ".branch",
                ".requiredChecks",
                "map(.context)",
                ".integrationId",
                ".app.id",
                "filter=latest")) {
            if (!ciEvidenceRun.contains(requiredFragment)) {
                violations.add("태그 SHA 검증 단계 누락: " + requiredFragment);
            }
        }

        Map<?, ?> buildAndPush = asMap(jobs.get("build-and-push"));
        if (!"verify".equals(Objects.toString(buildAndPush.get("needs"), ""))) {
            violations.add("build-and-push.needs=verify 누락 — 검증 실패 후에도 발행 가능");
        }

        List<?> releaseSteps = asList(buildAndPush.get("steps"));
        Map<?, ?> credentialStep = findStep(releaseSteps, "Require Docker Hub release credentials");
        String credentialRun = Objects.toString(credentialStep.get("run"), "");
        if (!credentialRun.contains("DOCKERHUB_USERNAME") || !credentialRun.contains("DOCKERHUB_TOKEN")) {
            violations.add("Docker Hub 자격증명 fail-fast 단계가 username/token을 모두 검증하지 않음");
        }

        int backendPush = assertUnconditionalPush(releaseSteps, "Build and push Backend", violations);
        int frontendPush = assertUnconditionalPush(releaseSteps, "Build and push Frontend", violations);
        int githubRelease = indexOfStep(releaseSteps, "Create GitHub Release");
        if (githubRelease < 0) {
            violations.add("GitHub Release 생성 단계 없음");
        } else if (githubRelease <= backendPush || githubRelease <= frontendPush) {
            violations.add("GitHub Release가 두 이미지 push보다 먼저 실행됨");
        }

        if (!violations.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            sb.append("\n========================================================================\n");
            sb.append("🚀 [RELEASE EVIDENCE GATE] 검증 또는 산출물 없는 릴리스 경로가 열렸습니다!\n");
            sb.append("========================================================================\n");
            violations.forEach(v -> sb.append("❌ ").append(v).append('\n'));
            sb.append("\n💡 태그 대상은 required-checks.json 의 필수 CI 전부가 success 여야 하며, Docker 이미지를 실제로\n");
            sb.append("   push하지 못하면 GitHub Release도 발행해서는 안 됩니다.\n");
            fail(sb.toString());
        }

        log.info("✅ release.yml 이 SSOT의 main 필수 CI {}종과 Backend/Frontend 이미지 push를 릴리스 전제로 강제합니다.",
                requiredChecks.size());
    }

    @Test
    @DisplayName("📈 백엔드·프런트 커버리지 하한이 CI와 localGate 양쪽 실행 경로에 결속된다")
    void auditCoverageThresholdsAreBlockingAndWired() throws IOException {
        Path root = resolveRepoRoot();
        String ci = Files.readString(root.resolve(WORKFLOW_DIR).resolve("ci.yml"), StandardCharsets.UTF_8);
        String gradle = Files.readString(root.resolve("build.gradle"), StandardCharsets.UTF_8);
        String vitest = Files.readString(root.resolve("frontend/vitest.config.mts"), StandardCharsets.UTF_8);

        List<String> violations = new ArrayList<>();
        if (!ci.contains("jacocoRootCoverageVerification")) {
            violations.add("ci.yml backend-build가 JaCoCo 하한을 강제하지 않음");
        }
        if (!gradle.matches("(?s).*tasks\\.register\\('localGate'\\).*?jacocoRootCoverageVerification.*")) {
            violations.add("localGate가 JaCoCo 하한 태스크에 결속되지 않음");
        }
        // [2026-08-15 정정] 종전에는 `minimum = 0.50` 을 **문자열로 일치**시켰다.
        //   그 결과 하한을 0.85 로 **올리는 강화 변경까지 red** 가 됐다 — 이 클래스가 스스로 선언한
        //   원칙("래칫은 문자열 일치가 아니라 방향성을 검증한다", extractInteger javadoc)과 정면으로
        //   어긋나고, 바로 아래 프런트 vitest 래칫은 이미 방향성으로 구현돼 있어 두 축이 갈라져 있었다.
        //   문자열 고정은 커버리지 하한을 **영원히 50% 에 묶는다** — 게이트를 강화할 수 없는 게이트다.
        //   값을 추출해 하한 이상인지로 판정한다(완화는 여전히 red).
        Double lineFloor = extractDouble(gradle,
                "(?s)jacocoRootCoverageVerification.*?counter\\s*=\\s*'LINE'.*?minimum\\s*=\\s*([0-9.]+)");
        if (lineFloor == null) {
            violations.add("백엔드 전체 라인 커버리지 하한(LINE) 선언이 없음");
        } else if (lineFloor < 0.50) {
            violations.add("백엔드 전체 라인 커버리지 하한 완화: " + lineFloor + " < 0.50");
        }
        // BRANCH 하한(2026-08-15 신설)도 함께 고정한다. LINE 만 보면 조건 분기를 통째로 건너뛴
        // 테스트가 라인 수치만 채우고 통과하므로, 그 룰이 조용히 삭제되는 것을 막는다(§0.7-H5).
        Double branchFloor = extractDouble(gradle,
                "(?s)jacocoRootCoverageVerification.*?counter\\s*=\\s*'BRANCH'.*?minimum\\s*=\\s*([0-9.]+)");
        if (branchFloor == null) {
            violations.add("백엔드 분기 커버리지 하한(BRANCH) 선언이 없음");
        } else if (branchFloor < 0.70) {
            violations.add("백엔드 분기 커버리지 하한 완화: " + branchFloor + " < 0.70");
        }
        if (!gradle.matches("(?s).*tasks\\.register\\('jacocoRootCoverageVerification'.*?"
                + "classDirectories\\.setFrom\\(jacocoAggregateClassDirectories\\).*?"
                + "executionData\\.setFrom\\(jacocoAggregateExecutionData\\).*?violationRules.*")) {
            violations.add("JaCoCo verification에 클래스/실행 데이터가 없어 태스크가 SKIPPED될 수 있음");
        }
        if (!gradle.contains("subproject.fileTree(dir: \"${subproject.projectDir}/build/jacoco\"")
                || !gradle.contains("include: \"*.exec\", exclude: \"schemaValidationTest.exec\"")
                || gradle.contains("rootProject.buildDir}/jacoco/test.exec")
                || !gradle.contains("key != 'user.dir'")) {
            violations.add("JaCoCo 실행 데이터가 프로젝트·Test 태스크별로 격리되지 않아 덮어쓰기 가능");
        }
        Map<String, Integer> coverageFloors = Map.of(
                "statements", 20,
                "branches", 15,
                "functions", 14,
                "lines", 20);
        for (Map.Entry<String, Integer> floor : coverageFloors.entrySet()) {
            Integer actual = extractInteger(vitest,
                    "(?m)^\\s*" + Pattern.quote(floor.getKey()) + "\\s*:\\s*(\\d+)\\s*,?\\s*$");
            if (actual == null) {
                violations.add("프런트 전체소스 coverage 래칫 누락: " + floor.getKey());
            } else if (actual < floor.getValue()) {
                violations.add("프런트 전체소스 coverage 래칫 완화: " + floor.getKey()
                        + "=" + actual + " < " + floor.getValue());
            }
        }
        if (!vitest.contains("src/app/**") || !vitest.contains("src/services/**")
                || !vitest.contains("src/components/**")) {
            violations.add("프런트 coverage include가 핵심 소스 축을 재지 않음");
        }

        if (!violations.isEmpty()) {
            fail("\n📈 [COVERAGE WIRING GATE] 보고서만 만들고 통과시키는 경로가 열렸습니다:\n❌ "
                    + String.join("\n❌ ", violations));
        }
        log.info("✅ Backend JaCoCo(LINE {} / BRANCH {})와 Frontend 전체소스 래칫이 CI/localGate에 결속됨.",
                lineFloor, branchFloor);
    }

    @Test
    @DisplayName("📦 프런트는 린트·운영 의존성·임시 시크릿·번들 예산·테스트를 강제한다")
    void auditFrontendBuildIsFailFastAndBundleBudgetIsBlocking() throws IOException {
        Path root = resolveRepoRoot();
        String ci = Files.readString(root.resolve(WORKFLOW_DIR).resolve("ci.yml"), StandardCharsets.UTF_8);
        String packageJson = Files.readString(root.resolve("frontend/package.json"), StandardCharsets.UTF_8);
        String verify = Files.readString(root.resolve("scripts/verify.mjs"), StandardCharsets.UTF_8);
        String budget = Files.readString(
                root.resolve("frontend/scripts/check-bundle-budget.mjs"), StandardCharsets.UTF_8);

        List<String> violations = new ArrayList<>();
        int secretIndex = ci.indexOf("Generate ephemeral JWT secret (frontend build only)");
        int buildIndex = ci.indexOf("pnpm run build", secretIndex);
        int bundleIndex = ci.indexOf("pnpm run bundle:check", buildIndex);
        int testIndex = ci.indexOf("pnpm run test", bundleIndex);
        Integer maxWarnings = extractInteger(packageJson,
                "\\\"lint\\\"\\s*:\\s*\\\"[^\\\"]*--max-warnings\\s+(\\d+)");
        if (maxWarnings == null) {
            violations.add("프런트 ESLint warning 래칫 누락");
        } else if (maxWarnings > 295) {
            violations.add("프런트 ESLint warning 래칫 완화: " + maxWarnings + " > 295");
        }
        if (!ci.contains("pnpm audit --prod --audit-level high")) {
            violations.add("운영 의존성 high 취약점 차단 게이트 누락");
        }
        if (secretIndex < 0 || !ci.substring(secretIndex, Math.max(secretIndex, buildIndex))
                .contains("openssl rand -hex 44")) {
            violations.add("frontend-build의 운영 모드 빌드 전에 회차별 JWT_SECRET 생성이 없음");
        }
        if (!(secretIndex < buildIndex && buildIndex < bundleIndex && bundleIndex < testIndex)) {
            violations.add("frontend-build가 build → bundle:check → test를 강제 순서로 실행하지 않음");
        }
        if (!packageJson.contains("\"bundle:check\": \"node scripts/check-bundle-budget.mjs\"")) {
            violations.add("frontend package.json의 bundle:check 진입점 누락");
        }
        if (!verify.contains("run('pnpm -C frontend run bundle:check')")) {
            violations.add("로컬 통합 verify가 번들 예산을 실행하지 않음");
        }
        if (!verify.contains("randomBytes(44)") || !verify.contains("frontendBuildEnv")
                || !verify.contains("JWT_SECRET")) {
            violations.add("로컬 통합 verify가 운영 빌드용 일회성 JWT_SECRET을 안전하게 생성하지 않음");
        }
        for (String threshold : List.of(
                "total: 2_250_000", "single: 150_000", "total: 40_000", "single: 38_000")) {
            if (!budget.contains(threshold)) {
                violations.add("번들 gzip 고정 래칫 누락/완화: " + threshold);
            }
        }

        if (!violations.isEmpty()) {
            fail("\n📦 [FRONTEND BUILD GATE] 운영 빌드 또는 성능 예산 우회 경로가 열렸습니다:\n❌ "
                    + String.join("\n❌ ", violations));
        }
        log.info("✅ frontend-build와 local verify가 임시 JWT_SECRET 및 고정 gzip 번들 예산을 강제합니다.");
    }

    private int assertUnconditionalPush(List<?> steps, String name, List<String> violations) {
        int index = indexOfStep(steps, name);
        if (index < 0) {
            violations.add(name + " 단계 없음");
            return -1;
        }
        Map<?, ?> step = asMap(steps.get(index));
        Map<?, ?> with = asMap(step.get("with"));
        Object push = with.get("push");
        if (!Boolean.TRUE.equals(push) && !"true".equalsIgnoreCase(Objects.toString(push, ""))) {
            violations.add(name + " 의 push가 true가 아님 — 빌드만 하고 릴리스가 성공할 수 있음");
        }
        if (step.containsKey("if")) {
            violations.add(name + " 에 조건부 if가 존재 — 이미지 발행을 건너뛸 수 있음");
        }
        return index;
    }

    private Map<?, ?> findStep(List<?> steps, String name) {
        int index = indexOfStep(steps, name);
        return index < 0 ? Map.of() : asMap(steps.get(index));
    }

    private int indexOfStep(List<?> steps, String name) {
        for (int i = 0; i < steps.size(); i++) {
            Map<?, ?> step = asMap(steps.get(i));
            if (name.equals(Objects.toString(step.get("name"), ""))) {
                return i;
            }
        }
        return -1;
    }

    private Map<?, ?> asMap(Object value) {
        return value instanceof Map<?, ?> map ? map : Map.of();
    }

    private List<?> asList(Object value) {
        return value instanceof List<?> list ? list : List.of();
    }

    /**
     * 래칫은 과거 값과의 문자열 일치가 아니라 방향성을 검증한다.
     * 커버리지 하한을 올리거나 warning 상한을 낮춘 강화 변경은 통과해야 한다.
     */
    private Integer extractInteger(String content, String regex) {
        Matcher matcher = Pattern.compile(regex).matcher(content);
        return matcher.find() ? Integer.valueOf(matcher.group(1)) : null;
    }

    /** {@link #extractInteger} 의 소수 판. JaCoCo 하한은 {@code 0.85} 형태의 비율이다. */
    private Double extractDouble(String content, String regex) {
        Matcher matcher = Pattern.compile(regex).matcher(content);
        return matcher.find() ? Double.valueOf(matcher.group(1)) : null;
    }

    /** api-server 모듈에서 실행되므로 저장소 루트는 한 단계 위다(다른 하네스 린터와 동일 관례). */
    private Path resolveRepoRoot() {
        Path cwd = Paths.get("").toAbsolutePath();
        return Files.isDirectory(cwd.resolve(WORKFLOW_DIR)) ? cwd : cwd.getParent();
    }

    private String firstLine(String message) {
        if (message == null) {
            return "(원인 메시지 없음)";
        }
        int idx = message.indexOf('\n');
        return idx < 0 ? message : message.substring(0, idx);
    }
}
