package nuri.api.harness;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
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
import java.util.concurrent.TimeUnit;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.fail;
import static org.assertj.core.api.Assertions.assertThat;

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
 * "게이트가 있다" 는 서술만 남고 집행은 0 이 된다 — AGENTS.md Evidence guardrails H5가 지목한 바로 그 상태다.
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
@Tag("governance-harness")
class WorkflowManifestLinterTest {

    private static final Logger log = LoggerFactory.getLogger(WorkflowManifestLinterTest.class);

    private static final String WORKFLOW_DIR = ".github/workflows";

    private static JsonNode artifactContract;

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
        if (ReusableHarnessProfile.current().projected()) {
            // ADR-0018: 생산자 workflow는 비활성 이력이다. 활성 계약은 Node 정본으로 exact-match한다.
            requireArtifactContract(resolveRepoRoot());
            assertThat(manifests.stream().map(path -> path.getFileName().toString()).toList())
                    .as("생성물의 유일한 활성 workflow는 제품 검증 CI여야 한다")
                    .containsExactly("ci.yml");
        } else if (manifests.size() < 5) {
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
            sb.append("   '게이트가 돌고 있다'는 전제가 통째로 거짓이 된다(AGENTS.md Evidence guardrails H5).\n");
            sb.append("   흔한 원인: run: | 블록 안의 heredoc 본문을 컬럼 0 으로 내려 블록 스칼라를 종료시킨 경우.\n");
            fail(sb.toString());
        }

        log.info("✅ 워크플로 매니페스트 {}건 전부 파싱·트리거·잡 선언 확인.", manifests.size());
    }

    @Test
    @DisplayName("OpenAPI 생성과 드리프트 검사는 같은 저장소 루트의 절대경로를 사용한다")
    void auditOpenApiExportMatchesDriftCheckRoot() throws IOException {
        Path root = resolveRepoRoot();
        if (ReusableHarnessProfile.current().projected()) {
            requireArtifactContract(root);
            return;
        }
        assertThat(openApiExportViolations(HarnessSourceIndex.read(root.resolve(WORKFLOW_DIR).resolve("ci.yml"))))
                .as("Test JVM의 모듈별 workingDir가 OpenAPI 검증 산출물을 바꾸면 안 된다").isEmpty();
    }

    @Test
    @DisplayName("OpenAPI 상대경로·다른 파일 검사·생략된 검사 fixture는 red")
    void openApiExportRejectsDisconnectedOutputFixtures() throws IOException {
        Path root = resolveRepoRoot();
        if (ReusableHarnessProfile.current().projected()) {
            requireArtifactContract(root);
            return;
        }
        String source = HarnessSourceIndex.read(root.resolve(WORKFLOW_DIR).resolve("ci.yml"));
        String argument = "\"-Dopenapi.export.path=$GITHUB_WORKSPACE/api-docs.json\"";
        String tracked = "git ls-files --error-unmatch -- \"$GITHUB_WORKSPACE/api-docs.json\"";
        String drift = "git diff --exit-code -- \"$GITHUB_WORKSPACE/api-docs.json\"";
        assertThat(openApiExportViolations(source)).isEmpty();
        for (String[] mutation : List.of(
                new String[]{argument, "-Dopenapi.export.path=api-docs.json"},
                new String[]{argument, "\"-Dopenapi.export.path=$GITHUB_WORKSPACE/api-server/api-docs.json\""},
                new String[]{argument, "-Dopenapi.export.path=$GITHUB_WORKSPACE/api-docs.json"},
                new String[]{"./gradlew onlineBuild", "# ./gradlew onlineBuild"},
                new String[]{tracked, "# " + tracked},
                new String[]{drift, "git diff --exit-code -- \"$GITHUB_WORKSPACE/api-server/api-docs.json\""},
                new String[]{drift, "# " + drift},
                new String[]{"id: api-docs-gate", "id: api-docs-gate\n        if: false"})) {
            assertThat(source).contains(mutation[0]);
            assertThat(openApiExportViolations(source.replace(mutation[0], mutation[1])))
                    .as("OpenAPI 경로 부정 대조군: %s", mutation[1]).isNotEmpty();
        }
    }

    private List<String> openApiExportViolations(String source) {
        Map<?, ?> workflow = asMap(new Yaml().load(source));
        List<?> steps = asList(asMap(asMap(workflow.get("jobs")).get("backend-scope")).get("steps"));
        String buildName = "Build and Test with Gradle";
        String gateName = "Verify committed api-docs.json is fresh (contract drift gate)";
        Map<?, ?> build = findStep(steps, buildName);
        Map<?, ?> gate = findStep(steps, gateName);
        List<String> violations = new ArrayList<>();
        String exportArgument = "\"-Dopenapi.export.path=$GITHUB_WORKSPACE/api-docs.json\"";
        String run = Objects.toString(build.get("run"), "");
        if (run.lines().map(String::strip).noneMatch(line -> line.startsWith("./gradlew ")
                && line.contains(" onlineBuild ") && line.contains(exportArgument))) {
            violations.add("OpenAPI 생성은 인용된 workspace 절대경로를 사용해야 함");
        }
        List<String> checks = Objects.toString(gate.get("run"), "").lines().map(String::strip).toList();
        if (!checks.contains("git ls-files --error-unmatch -- \"$GITHUB_WORKSPACE/api-docs.json\"")
                || !checks.contains("git diff --exit-code -- \"$GITHUB_WORKSPACE/api-docs.json\"")) {
            violations.add("OpenAPI 추적·드리프트 검사가 생성된 루트 파일과 결속되지 않음");
        }
        if (indexOfStep(steps, gateName) <= indexOfStep(steps, buildName)
                || build.containsKey("if") || build.containsKey("continue-on-error")
                || gate.containsKey("if") || gate.containsKey("continue-on-error")) {
            violations.add("OpenAPI 생성 후 드리프트 검사를 조건 없이 실행해야 함");
        }
        return violations;
    }

    @Test
    @DisplayName("🚀 릴리스는 main의 필수 CI 증거와 실제 이미지 발행 없이는 생성되지 않는다")
    void auditReleaseRequiresCompleteCiEvidenceAndPublishedImages() throws IOException {
        Path repoRoot = resolveRepoRoot();
        if (ReusableHarnessProfile.current().projected()) {
            requireArtifactContract(repoRoot);
            String runner = HarnessSourceIndex.read(repoRoot.resolve("scripts/verify-reusable-artifact.mjs"));
            assertThat(runner).contains("environmentApproved: false", "runtimeScenariosExecuted: false");
            assertArtifactBoundaryDocumentation(repoRoot);
            // exact-match 계약은 contents:read, remoteApplied:false, branch/integrationId:null과
            // 활성 workflow가 ci.yml뿐임을 검사한다. 보관된 release.yml을 발행 권한으로 읽지 않는다.
            return;
        }
        Path releasePath = repoRoot.resolve(WORKFLOW_DIR).resolve("release.yml");
        if (!Files.isRegularFile(releasePath)) {
            fail("게이트 무결성 파손: release.yml 을 찾을 수 없습니다 — " + releasePath.toAbsolutePath());
        }

        Path requiredChecksPath = repoRoot.resolve(".github/required-checks.json");
        if (!Files.isRegularFile(requiredChecksPath)) {
            fail("게이트 무결성 파손: required check SSOT 를 찾을 수 없습니다 — "
                    + requiredChecksPath.toAbsolutePath());
        }
        JsonNode requiredChecks = JsonMapper.builder().configureForJackson2().build()
                .readTree(HarnessSourceIndex.read(requiredChecksPath))
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
        String ciWorkflow = HarnessSourceIndex.read(repoRoot.resolve(WORKFLOW_DIR).resolve("ci.yml"));
        if (!ciWorkflow.contains("npm run test:operational-contracts")) {
            violations.add("ci.yml 에 required check를 포함한 운영 계약 집계 실행 경로가 없음");
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

        violations.addAll(releasePublicationViolations(root));

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
        if (ReusableHarnessProfile.current().projected()) {
            requireArtifactContract(root);
            assertArtifactBoundaryDocumentation(root);
            // 생성물은 현재 프로필의 compile/harness/schema를 실행한다. 생산자 coverage 수치와
            // 여섯 required context를 승계했다는 주장을 하지 않으며 실제 실행 graph를 검사한다.
            return;
        }
        String ci = HarnessSourceIndex.read(root.resolve(WORKFLOW_DIR).resolve("ci.yml"));
        String gradle = HarnessSourceIndex.read(root.resolve("build.gradle"));
        String verify = HarnessSourceIndex.read(root.resolve("scripts/verify.mjs"));
        String vitest = HarnessSourceIndex.read(root.resolve("frontend/vitest.config.mts"));

        List<String> violations = new ArrayList<>();
        if (!ci.contains("onlineBuild jacocoOnlineCoverageVerification")
                || !ci.contains("node scripts/verify.mjs migration")
                || !verify.contains(":migration-tool:bootJar jacocoMigrationCoverageVerification")) {
            violations.add("CI 온라인/독립 이관 검증이 각각 JaCoCo 하한을 강제하지 않음");
        }
        if (!gradle.matches("(?s).*tasks\\.register\\('localGate'\\).*?jacocoRootCoverageVerification.*")) {
            violations.add("localGate가 JaCoCo 하한 태스크에 결속되지 않음");
        }
        // 수치의 단일 정본은 config/governance/gates.json 이다. Node 운영 계약이 실제 Gradle/Vitest
        // 소비자의 값을 exact-match 하므로, 이 Java 게이트는 실행 데이터와 실행 경로만 검사한다.
        // 같은 임계값을 여기에도 복제하면 강화 변경 때 두 원장을 함께 고쳐야 하고 drift가 생긴다.
        if (!ci.contains("npm run test:operational-contracts")) {
            violations.add("ci.yml이 중앙 품질 래칫 계약을 실행하지 않음");
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
        violations.addAll(scopedCoverageViolations(gradle));
        if (!vitest.contains("src/app/**") || !vitest.contains("src/services/**")
                || !vitest.contains("src/components/**")) {
            violations.add("프런트 coverage include가 핵심 소스 축을 재지 않음");
        }

        if (!violations.isEmpty()) {
            fail("\n📈 [COVERAGE WIRING GATE] 보고서만 만들고 통과시키는 경로가 열렸습니다:\n❌ "
                    + String.join("\n❌ ", violations));
        }
        log.info("✅ Backend/Frontend coverage 실행 경로와 중앙 품질 래칫 계약이 CI/localGate에 결속됨.");
    }

    @Test
    @DisplayName("📈 분리 커버리지는 반대 모듈·과거 실행 데이터·누락된 태스크를 허용하지 않는다")
    void scopedCoverageRejectsMissingInputsAndCrossScopeData() throws IOException {
        if (ReusableHarnessProfile.current().projected()) {
            requireArtifactContract(resolveRepoRoot());
            return;
        }
        String gradle = HarnessSourceIndex.read(resolveRepoRoot().resolve("build.gradle"));
        assertThat(scopedCoverageViolations(gradle)).isEmpty();
        for (String[] mutation : List.of(
                new String[]{"it.name != 'migration-tool'", "true"},
                new String[]{"it.name == 'migration-tool'", "true"},
                new String[]{"dependsOn { coverageScopeTests(projects) }", "// omitted test dependency"},
                new String[]{"data == null || !data.isFile() || data.length() == 0", "false"},
                new String[]{"!testTask.state.executed || testTask.state.noSource", "false"},
                new String[]{"if (projects.isEmpty()) throw new GradleException", "if (false) throw new GradleException"},
                new String[]{"coverageScopeClasses([p]).every { it.isEmpty() }", "false"},
                new String[]{"def jacocoOnlineExecutionData = coverageScopeData(onlineCoverageProjects)",
                        "def jacocoOnlineExecutionData = jacocoAggregateExecutionData"},
                new String[]{"? jacocoMigrationShardExecutionData : coverageScopeData(migrationCoverageProjects)",
                        "def jacocoMigrationExecutionData = jacocoAggregateExecutionData"},
                new String[]{"def migrationShardExecutionRoot = providers.gradleProperty('migrationShardExecutionRoot')",
                        "def migrationShardExecutionRoot = providers.gradleProperty('unreviewedRoot')"},
                new String[]{"if (data.size() != 3)", "if (false)"},
                new String[]{"!file.isFile() || file.length() == 0", "false"},
                new String[]{"executionData.setFrom(jacocoOnlineExecutionData)", "// omitted online execution data"},
                new String[]{"classDirectories.setFrom(jacocoMigrationClassDirectories)", "// omitted migration classes"},
                new String[]{"dependsOn tasks.named('jacocoMigrationReport')", "// omitted migration report"})) {
            String changed = gradle.replace(mutation[0], mutation[1]);
            assertThat(changed).as(mutation[0]).isNotEqualTo(gradle);
            assertThat(scopedCoverageViolations(changed)).as(mutation[0]).isNotEmpty();
        }
    }

    private static List<String> scopedCoverageViolations(String source) {
        String gradle = HarnessSourceIndex.stripCommentsPreservingStrings(source).replace("\r\n", "\n");
        List<String> violations = new ArrayList<>();
        for (String fragment : List.of(
                "def onlineCoverageProjects = subprojects.findAll { it.name != 'migration-tool' }",
                "def migrationCoverageProjects = subprojects.findAll { it.name == 'migration-tool' }",
                "projects.collectMany { p -> p.tasks.withType(Test).matching { it.name != 'schemaValidationTest' }.toList() }",
                "exclude: jacocoAggregateExcludes",
                "coverageScopeTests(projects).collect { testTask ->",
                "testTask.extensions.getByType(org.gradle.testing.jacoco.plugins.JacocoTaskExtension).destinationFile",
                "dependsOn { coverageScopeTests(projects) }",
                "if (projects.isEmpty()) throw new GradleException",
                "coverageScopeClasses([p]).every { it.isEmpty() }",
                "if (testTasks.isEmpty()) throw new GradleException",
                "testTask.state.upToDate || testTask.state.skipMessage == 'FROM-CACHE'",
                "!testTask.state.executed || testTask.state.noSource",
                "testTask.state.skipped && !validCachedResult",
                "data == null || !data.isFile() || data.length() == 0",
                "dependsOn inputsGate",
                "classDirectories.setFrom(classFiles)",
                "executionData.setFrom(executionFiles)",
                "dependsOn onlineCoverageProjects.collect { p -> p.tasks.named('build') }")) {
            if (!gradle.contains(fragment)) violations.add("분리 coverage 입력/실행 계약 누락: " + fragment);
        }
        for (String fragment : List.of(
                "def jacocoOnlineClassDirectories = coverageScopeClasses(onlineCoverageProjects)",
                "def jacocoOnlineExecutionData = coverageScopeData(onlineCoverageProjects)",
                "registerCoverageScopeReport('jacocoOnlineReport', onlineCoverageProjects,",
                "dependsOn tasks.named('jacocoOnlineReport')",
                "classDirectories.setFrom(jacocoOnlineClassDirectories)",
                "executionData.setFrom(jacocoOnlineExecutionData)")) {
            if (!gradle.contains(fragment)) violations.add("Online coverage 바인딩 누락: " + fragment);
        }
        for (String fragment : List.of(
                "def jacocoMigrationClassDirectories = coverageScopeClasses(migrationCoverageProjects)",
                "def migrationShardExecutionRoot = providers.gradleProperty('migrationShardExecutionRoot')",
                "def migrationShardedCoverage = migrationShardExecutionRoot.isPresent()",
                "include: '**/*.exec'",
                "? jacocoMigrationShardExecutionData : coverageScopeData(migrationCoverageProjects)",
                "acceptsMigrationShards && migrationShardedCoverage",
                "dependsOn projects.collect { p -> p.tasks.named('classes') }",
                "if (data.size() != 3)",
                "!file.isFile() || file.length() == 0",
                "registerCoverageScopeReport('jacocoMigrationReport', migrationCoverageProjects,",
                "dependsOn tasks.named('jacocoMigrationReport')",
                "classDirectories.setFrom(jacocoMigrationClassDirectories)",
                "executionData.setFrom(jacocoMigrationExecutionData)")) {
            if (!gradle.contains(fragment)) violations.add("Migration coverage 바인딩 누락: " + fragment);
        }
        return violations;
    }

    @Test
    @DisplayName("📦 프런트는 린트·운영 의존성·임시 시크릿·번들 예산·테스트를 강제한다")
    void auditFrontendBuildIsFailFastAndBundleBudgetIsBlocking() throws IOException {
        Path root = resolveRepoRoot();
        if (ReusableHarnessProfile.current().projected()) {
            requireArtifactContract(root);
            String runner = HarnessSourceIndex.read(root.resolve("scripts/verify-reusable-artifact.mjs"));
            assertThat(runner).contains("randomBytes(44)", "JWT_SECRET", "result.status !== 0",
                    "throw new Error", "report.result = 'failed'; throw error");
            assertArtifactBoundaryDocumentation(root);
            return;
        }
        String ci = HarnessSourceIndex.read(root.resolve(WORKFLOW_DIR).resolve("ci.yml"));
        String packageJson = HarnessSourceIndex.read(root.resolve("frontend/package.json"));
        String verify = HarnessSourceIndex.read(root.resolve("scripts/verify.mjs"));
        String budget = HarnessSourceIndex.read(root.resolve("frontend/scripts/check-bundle-budget.mjs"));
        String auditPolicy = HarnessSourceIndex.read(root.resolve("scripts/frontend-audit-policy.mjs"));

        List<String> violations = new ArrayList<>();
        int secretIndex = ci.indexOf("Generate ephemeral JWT secret (frontend build only)");
        int buildIndex = ci.indexOf("pnpm run build", secretIndex);
        int bundleIndex = ci.indexOf("pnpm run bundle:check", buildIndex);
        int testIndex = ci.indexOf("pnpm run test", bundleIndex);
        // 종전 판정축은 ci.yml 의 인라인 `pnpm audit --prod --audit-level high` 문자열이었다.
        // 그 명령은 운영 의존성 high 이상만 보므로 개발 의존성의 critical 을 놓쳤고, 종료코드로만
        // 판정해 JSON 형식 오류·집계 불일치를 조용히 통과시켰다. 지금은 같은 lockfile 을 한 번
        // 조회해 판정하는 정책 스크립트로 대체됐다 — 축이 사라진 게 아니라 좁은 축이 넓은 축으로
        // 교체된 것이므로, 게이트가 실제로 존재하고 우회 불가한지를 세 지점에서 다시 결속한다.
        if (!ci.contains("node ../scripts/frontend-audit-policy.mjs")) {
            violations.add("운영 의존성 취약점 차단 게이트(frontend-audit-policy) 가 CI 에서 실행되지 않음");
        }
        if (!auditPolicy.contains("severity === 'critical' || (severity === 'high' && production)")) {
            violations.add("audit 정책이 critical 전체와 운영 의존성 high 를 차단 대상으로 삼지 않음");
        }
        // 조회·해석 실패를 통과시키면 '취약점 0건' 과 '조회 실패' 가 구분되지 않는다(H5 거짓 그린).
        if (!auditPolicy.contains("frontend dependency audit failed closed")
                || !auditPolicy.contains("process.exitCode = 2")) {
            violations.add("audit 정책이 조회·형식 오류에서 fail-closed 하지 않음");
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
        if (!budget.contains("BUDGETS") || !budget.contains("gzipSync")
                || !budget.contains(".byteLength")) {
            violations.add("번들 gzip 예산 판정 구현 누락");
        }
        if (!ci.contains("npm run test:operational-contracts")) {
            violations.add("프런트 품질 수치의 중앙 registry exact-match 계약이 CI에서 실행되지 않음");
        }

        if (!violations.isEmpty()) {
            fail("\n📦 [FRONTEND BUILD GATE] 운영 빌드 또는 성능 예산 우회 경로가 열렸습니다:\n❌ "
                    + String.join("\n❌ ", violations));
        }
        log.info("✅ frontend-build와 local verify가 임시 JWT_SECRET 및 고정 gzip 번들 예산을 강제합니다.");
    }

    /**
     * The Node policy is the exact-match SSOT for active product CI, aliases, history integrity and
     * unapplied institution policy. Execute it, rather than copying its workflow template into Java.
     * Node is already a required tool in the artifact CI. Missing Node/output and timeout fail closed.
     */
    static synchronized JsonNode requireArtifactContract(Path root) throws IOException {
        if (artifactContract == null) {
            String probe = """
                    import { pathToFileURL } from 'node:url';
                    import { resolve } from 'node:path';
                    const policy = await import(pathToFileURL(resolve('scripts/reusable-artifact-entrypoints-contract.mjs')));
                    const runner = await import(pathToFileURL(resolve('scripts/verify-reusable-artifact.mjs')));
                    const scopes = Object.fromEntries(['full', 'contracts', 'backend', 'frontend']
                      .map(scope => [scope, runner.verificationCommands(scope)]));
                    let unknownScopeRejected = false;
                    try { runner.verificationCommands('unknown'); } catch { unknownScopeRejected = true; }
                    let unknownProfileRejected = false;
                    try { policy.reusableArtifactEntrypoints('unknown', 'VERSION=8.28.0 --no-git --log-opts='); }
                    catch { unknownProfileRejected = true; }
                    process.stdout.write(JSON.stringify({ errors: policy.validateReusableArtifactEntrypoints(process.cwd()),
                      scopes, unknownScopeRejected, unknownProfileRejected }));
                    """;
            Process process = new ProcessBuilder("node", "--input-type=module", "--eval", probe)
                    .directory(root.toFile()).redirectErrorStream(true).start();
            try {
                if (!process.waitFor(30, TimeUnit.SECONDS)) {
                    process.destroyForcibly();
                    fail("생성물 CI 계약 검사 Node 프로세스 timeout");
                }
                String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
                assertThat(process.exitValue()).as("생성물 CI 계약 검사 실행 실패: %s", output).isZero();
                artifactContract = JsonMapper.builder().configureForJackson2().build().readTree(output);
            } catch (InterruptedException interrupted) {
                process.destroyForcibly();
                Thread.currentThread().interrupt();
                throw new IOException("생성물 CI 계약 검사 중단", interrupted);
            }
        }
        assertThat(artifactContract).as("생성물 CI 계약 검사 결과가 비어 있음").isNotNull();
        assertThat(artifactContract.path("errors").isArray()).isTrue();
        assertThat(artifactContract.path("errors")).as("활성 생성물 CI 계약 위반").isEmpty();
        assertThat(artifactContract.path("unknownScopeRejected").asBoolean()).isTrue();
        assertThat(artifactContract.path("unknownProfileRejected").asBoolean()).isTrue();
        assertThat(artifactGraphViolations(artifactContract.path("scopes")))
                .as("실제 생성물 검증 graph에서 필수 실행 단계 또는 scope 경계가 바뀜").isEmpty();
        assertArtifactGraphRejectsMutations(artifactContract.path("scopes"));
        return artifactContract;
    }

    private static List<String> artifactGraphViolations(JsonNode scopes) throws IOException {
        ObjectMapper mapper = JsonMapper.builder().configureForJackson2().build();
        JsonNode common = mapper.readTree("""
                [["node", ["scripts/verify-reusable-governance.mjs"]],
                 ["node", ["--test", "scripts/reusable-ui-governance-contract.test.mjs"]],
                 ["node", ["--test", "scripts/reusable-artifact-entrypoints-contract.test.mjs"]]]
                """);
        JsonNode backend = mapper.readTree("""
                ["gradle", ["compileJava", "compileTestJava", ":api-server:harnessTest",
                  ":api-server:schemaValidationTest", "--no-daemon", "--warning-mode", "fail",
                  "--console=plain", "-Dfile.encoding=UTF-8"]]
                """);
        JsonNode frontend = mapper.readTree("""
                [["pnpm", ["-C", "frontend", "exec", "tsc", "--noEmit"]],
                 ["pnpm", ["-C", "frontend", "run", "lint"]],
                 ["pnpm", ["-C", "frontend", "run", "build"]]]
                """);
        List<String> violations = new ArrayList<>();
        for (String scope : List.of("contracts", "backend", "frontend", "full")) {
            var expected = mapper.createArrayNode().addAll((tools.jackson.databind.node.ArrayNode) common);
            if (scope.equals("backend") || scope.equals("full")) expected.add(backend);
            if (scope.equals("frontend") || scope.equals("full")) {
                expected.addAll((tools.jackson.databind.node.ArrayNode) frontend);
            }
            if (!expected.equals(scopes.path(scope))) violations.add("Unexpected product command graph: " + scope);
        }
        return violations;
    }

    private static void assertArtifactGraphRejectsMutations(JsonNode actual) throws IOException {
        // 실제 runner에서 받은 graph의 각 단계를 지운다. 검출기가 noop가 되거나 schema 명령을
        // 잃어도 통과하는 회귀는 이 부정 대조군 자체가 red를 낸다.
        for (int index = 0; index < actual.path("full").size(); index++) {
            JsonNode missingStage = actual.deepCopy();
            ((tools.jackson.databind.node.ArrayNode) missingStage.path("full")).remove(index);
            assertThat(artifactGraphViolations(missingStage)).contains("Unexpected product command graph: full");
        }
        for (String task : List.of("compileJava", "compileTestJava", ":api-server:harnessTest",
                ":api-server:schemaValidationTest")) {
            JsonNode missingTask = actual.deepCopy();
            var arguments = (tools.jackson.databind.node.ArrayNode) missingTask.path("full").get(3).get(1);
            for (int index = arguments.size() - 1; index >= 0; index--) {
                if (arguments.get(index).asString().equals(task)) arguments.remove(index);
            }
            assertThat(artifactGraphViolations(missingTask)).contains("Unexpected product command graph: full");
        }
        var changedScope = (tools.jackson.databind.node.ObjectNode) actual.deepCopy();
        changedScope.set("full", actual.path("contracts"));
        assertThat(artifactGraphViolations(changedScope)).contains("Unexpected product command graph: full");
    }

    private static void assertArtifactBoundaryDocumentation(Path root) throws IOException {
        String boundary = HarnessSourceIndex.read(root.resolve("REUSABLE_VERIFICATION.md"));
        assertThat(boundary).contains("artifact-verification", "remoteApplied=false",
                "동등한 보증이 아니다", "비활성 이력", "기관 운영 승인이 아니다");
    }

    /** 로그인한 레지스트리와 실제 push 대상이 같은지 본다. 어긋나면 릴리스만 성공하고 이미지는 다른 곳에 남는다. */
    private void assertGhcrImage(List<?> steps, String name, List<String> violations) {
        int index = indexOfStep(steps, name);
        if (index < 0) {
            violations.add(name + " 단계 없음");
            return;
        }
        String images = Objects.toString(asMap(asMap(steps.get(index)).get("with")).get("images"), "");
        if (!images.startsWith("ghcr.io/")) {
            violations.add(name + " 의 이미지 이름이 ghcr.io/ 로 시작하지 않음: " + images);
        }
    }

    private int assertLocalImageBuild(List<?> steps, String name, List<String> violations) {
        int index = indexOfStep(steps, name);
        if (index < 0) {
            violations.add(name + " 단계 없음");
            return -1;
        }
        Map<?, ?> step = asMap(steps.get(index));
        Map<?, ?> with = asMap(step.get("with"));
        if (!"false".equals(Objects.toString(with.get("push"), ""))
                || !"true".equals(Objects.toString(with.get("load"), ""))) {
            violations.add(name + " 는 push=false/load=true 로 로컬 이미지만 만들어야 함");
        }
        if (step.containsKey("if") || step.containsKey("continue-on-error")) {
            violations.add(name + " 에 조건부/오류 무시가 존재");
        }
        return index;
    }

    private List<String> releasePublicationViolations(Map<?, ?> root) {
        List<String> violations = new ArrayList<>();
        String publishCondition = "github.event_name == 'push' && startsWith(github.ref, 'refs/tags/v')";
        Map<?, ?> jobs = asMap(root.get("jobs"));
        List<?> verifySteps = asList(asMap(jobs.get("verify")).get("steps"));
        Map<?, ?> build = asMap(jobs.get("build-and-push"));
        List<?> steps = asList(build.get("steps"));
        if (!"verify".equals(build.get("needs"))) violations.add("build-and-push.needs=verify 누락");
        Map<?, ?> permissions = asMap(build.get("permissions"));
        if (!"write".equals(permissions.get("packages")) || !"write".equals(permissions.get("contents"))) {
            violations.add("발행 잡의 packages/contents write 권한 누락");
        }
        if (!"false".equals(Objects.toString(asMap(root.get("env")).get("DOCKER_BUILD_RECORD_UPLOAD"), ""))) {
            violations.add("dry-run build record upload 금지 누락");
        }
        if (!publishCondition.equals(findStep(verifySteps,
                "Require tagged commit on main with complete CI evidence").get("if"))) {
            violations.add("main/필수 체크 검증의 태그 발행 조건 불일치");
        }
        int preflight = indexOfStep(verifySteps, "Validate release API build configuration");
        if (preflight < 0 || preflight >= indexOfStep(verifySteps, "Compilation integrity gate (AGENTS.md Verification)")) {
            violations.add("API URL preflight가 컴파일보다 먼저 실행되지 않음");
        }
        Map<?, ?> preflightStep = findStep(verifySteps, "Validate release API build configuration");
        if (!"node frontend/scripts/validate-api-build-urls.mjs".equals(preflightStep.get("run"))
                || preflightStep.containsKey("if") || preflightStep.containsKey("continue-on-error")) {
            violations.add("공용 URL preflight 실행 경로 불일치");
        }
        for (String name : List.of("BACKEND_API_URL", "NEXT_PUBLIC_API_URL")) {
            if (!("${{ vars." + name + " }}").equals(asMap(preflightStep.get("env")).get(name))) {
                violations.add("preflight repository variable 바인딩 불일치: " + name);
            }
        }
        for (List<?> stageSteps : List.of(verifySteps, steps)) {
            for (Object rawStep : stageSteps) {
                Map<?, ?> step = asMap(rawStep);
                Map<?, ?> with = asMap(step.get("with"));
                String uses = Objects.toString(step.get("uses"), "");
                if (with.containsKey("cache-to") || with.containsKey("cache")
                        || uses.startsWith("actions/upload-artifact@")) {
                    violations.add("dry-run 외부 cache/artifact 쓰기 경로");
                }
                if (uses.startsWith("docker/setup-buildx-action@")
                        && !"false".equals(Objects.toString(with.get("cache-binary"), ""))) {
                    violations.add("dry-run Buildx binary cache 쓰기 금지 누락");
                }
            }
        }
        assertGhcrImage(steps, "Extract metadata (tags, labels) for Backend", violations);
        assertGhcrImage(steps, "Extract metadata (tags, labels) for Frontend", violations);
        int backend = assertLocalImageBuild(steps, "Build Backend locally", violations);
        int frontend = assertLocalImageBuild(steps, "Build Frontend locally", violations);
        int verify = indexOfStep(steps, "Verify both local release images");
        int scan = indexOfStep(steps, "Scan both release images and generate SBOMs");
        int login = indexOfStep(steps, "Login to GitHub Container Registry");
        int publish = indexOfStep(steps, "Publish verified images and complete manifest");
        int release = indexOfStep(steps, "Create GitHub Release");
        if (backend < 0 || frontend < 0 || verify <= backend || verify <= frontend
                || scan <= verify || login <= scan || publish <= login || release <= publish) {
            violations.add("두 빌드 → 동일 이미지 검증 → scan/SBOM → 로그인 → 두 push/manifest → Release 순서 불일치");
        }
        Map<?, ?> verifyStep = findStep(steps, "Verify both local release images");
        if (!"node scripts/release-images.mjs verify".equals(verifyStep.get("run"))
                || verifyStep.containsKey("if") || verifyStep.containsKey("continue-on-error")) {
            violations.add("두 이미지 검증 실행 경로 불일치");
        }
        Map<?, ?> scanStep = findStep(steps, "Scan both release images and generate SBOMs");
        if (!"node scripts/release-images.mjs scan".equals(scanStep.get("run"))
                || scanStep.containsKey("if") || scanStep.containsKey("continue-on-error")) {
            violations.add("두 이미지 scan/SBOM 실행 경로 불일치");
        }
        for (String stage : List.of("Verify both local release images", "Scan both release images and generate SBOMs",
                "Publish verified images and complete manifest")) {
            Map<?, ?> environment = asMap(findStep(steps, stage).get("env"));
            if (!"${{ steps.build-backend.outputs.imageid }}".equals(environment.get("BACKEND_IMAGE_ID"))
                    || !"${{ steps.build-frontend.outputs.imageid }}".equals(environment.get("FRONTEND_IMAGE_ID"))) {
                violations.add("검증·스캔·발행 이미지 identity 바인딩 불일치: " + stage);
            }
        }
        for (String name : List.of("Login to GitHub Container Registry",
                "Publish verified images and complete manifest", "Create GitHub Release")) {
            Map<?, ?> step = findStep(steps, name);
            if (!publishCondition.equals(step.get("if")) || step.containsKey("continue-on-error")) {
                violations.add("발행 단계의 태그 전용/오류 차단 조건 불일치: " + name);
            }
        }
        Map<?, ?> loginWith = asMap(findStep(steps, "Login to GitHub Container Registry").get("with"));
        if (!"ghcr.io".equals(loginWith.get("registry"))
                || !"${{ secrets.GITHUB_TOKEN }}".equals(loginWith.get("password"))) {
            violations.add("GHCR 로그인 대상/자격 바인딩 불일치");
        }
        if (!"node scripts/release-images.mjs publish".equals(
                findStep(steps, "Publish verified images and complete manifest").get("run"))) {
            violations.add("완성 manifest 발행 실행 경로 누락");
        }
        Map<?, ?> releaseWith = asMap(findStep(steps, "Create GitHub Release").get("with"));
        List<String> releaseAssets = Objects.toString(releaseWith.get("files"), "").lines().map(String::strip)
                .filter(line -> !line.isEmpty()).toList();
        if (!List.of("release-manifest.json", "release-scan-evidence.json", "release-scan/output/api.cdx.json",
                "release-scan/output/frontend.cdx.json", "release-scan/output/api.vuln.json",
                "release-scan/output/frontend.vuln.json").equals(releaseAssets)
                || !"true".equals(Objects.toString(releaseWith.get("fail_on_unmatched_files"), ""))) {
            violations.add("Release 완성 manifest 자산 fail-closed 계약 누락");
        }
        return violations;
    }

    @Test
    @DisplayName("릴리스 dry-run 외부 쓰기·불완전 manifest·검증 우회 fixture는 red")
    void releasePublicationBoundaryRejectsUnsafeFixtures() throws IOException {
        if (ReusableHarnessProfile.current().projected()) return;
        String source = HarnessSourceIndex.read(resolveRepoRoot().resolve(WORKFLOW_DIR).resolve("release.yml"));
        assertThat(releasePublicationViolations(asMap(new Yaml().load(source)))).isEmpty();
        List<String> fixtures = List.of(
                source.replace("push: false", "push: true"),
                source.replace("load: true", "load: false"),
                source.replace("DOCKER_BUILD_RECORD_UPLOAD: 'false'", "DOCKER_BUILD_RECORD_UPLOAD: 'true'"),
                source.replace("cache-binary: false", "cache-binary: true"),
                source.replace("cache-from: type=gha", "cache-from: type=gha\n          cache-to: type=gha"),
                source.replace("node scripts/release-images.mjs verify", "echo skipped"),
                source.replace("node scripts/release-images.mjs publish", "echo skipped"),
                source.replace("node scripts/release-images.mjs scan", "echo skipped"),
                source.replace("name: Scan both release images and generate SBOMs", "name: Skipped image scan"),
                source.replace("BACKEND_IMAGE_ID: ${{ steps.build-backend.outputs.imageid }}", "BACKEND_IMAGE_ID: wrong-image"),
                source.replace("            release-manifest.json", "            incomplete.json"),
                source.replace("            release-scan/output/frontend.cdx.json", "            missing-sbom.json"),
                source.replace("            release-scan/output/frontend.vuln.json", "            missing-vulnerability-report.json"),
                source.replace("fail_on_unmatched_files: true", "fail_on_unmatched_files: false"),
                source.replace("if: github.event_name == 'push' && startsWith(github.ref, 'refs/tags/v')", "if: always()"));
        for (String fixture : fixtures) {
            assertThat(fixture).isNotEqualTo(source);
            assertThat(releasePublicationViolations(asMap(new Yaml().load(fixture)))).isNotEmpty();
        }
    }

    /**
     * 주간 ZAP 이 API 를 실제로 스캔하는지 정적으로 본다.
     *
     * <p>[2026-09-24] 종전 full-scan 은 {@code /v3/api-docs} 를 웹 페이지로 크롤링해 JSON 안의 API 경로를 찾지
     * 못했다. 리포트의 대상 URL 은 문서·health·robots·sitemap·{@code /} 다섯 개뿐이었고 워크플로는 매주
     * 성공했다. 스캔이 "돌았다" 는 것과 "API 를 두드렸다" 는 것은 다르므로 형태를 고정한다:
     * OpenAPI 를 읽는 API 스캔, 그 앞의 스캐너 로그인과 토큰 확인, 토큰 유효시간 안의 능동 스캔 상한,
     * 그 뒤의 세션 유지 확인, 그리고 스캐너 요청이 429 로 막히지 않도록 잡에서 올린 요청 제한 한도.
     */
    @Test
    @DisplayName("🛡️ 주간 ZAP 은 OpenAPI 로 API 를 로그인한 상태로 스캔하고 세션이 끝까지 살아 있었는지 확인한다")
    void auditZapScanReachesDocumentedApiWhileAuthenticated() throws IOException {
        Path repoRoot = resolveRepoRoot();
        if (ReusableHarnessProfile.current().projected()) {
            // 생성 산출물의 활성 워크플로는 ci.yml 뿐이다(위 릴리스 검사와 같은 경계).
            return;
        }
        Path zapPath = repoRoot.resolve(WORKFLOW_DIR).resolve("zap-scan.yml");
        if (!Files.isRegularFile(zapPath)) {
            fail("게이트 무결성 파손: zap-scan.yml 을 찾을 수 없습니다 — " + zapPath.toAbsolutePath());
        }
        List<String> violations = zapScanViolations(HarnessSourceIndex.read(zapPath));
        if (!violations.isEmpty()) {
            fail("zap-scan.yml 이 API 를 인증 상태로 스캔하지 않습니다:\n  - " + String.join("\n  - ", violations));
        }

        String compliant = """
                jobs:
                  zap_scan:
                    env:
                      RATE_LIMIT_REQUESTS_PER_MINUTE: '1000000'
                    steps:
                      - name: Authenticate API scanner
                        run: |
                          code=$(curl -H "Authorization: Bearer $token" http://localhost:8080/api/v1/auth/me)
                          echo "ZAP_AUTH_HEADER_VALUE=Bearer $token" >> "$GITHUB_ENV"
                      - name: ZAP API Scan
                        uses: zaproxy/action-api-scan@5158fe4d9d8fcc75ea204db81317cce7f9e5453d  # v0.10.0
                        with:
                          target: 'http://localhost:8080/v3/api-docs'
                          format: openapi
                          cmd_options: '-z "-config scanner.maxScanDurationInMins=40"'
                      - name: Verify scanner session survived
                        run: |
                          code=$(curl -H "Authorization: Bearer $SCANNER_TOKEN" http://localhost:8080/api/v1/auth/me)
                          exit 1
                """;
        assertThat(zapScanViolations(compliant)).as("적합한 형태는 통과한다").isEmpty();
        Map<String, String> mutations = new java.util.LinkedHashMap<>();
        mutations.put("문서 URL 크롤링으로 되돌림", compliant.replace("zaproxy/action-api-scan@", "zaproxy/action-full-scan@"));
        mutations.put("OpenAPI 형식 누락", compliant.replace("format: openapi", "format: soap"));
        mutations.put("로그인 단계 제거", compliant.replace("ZAP_AUTH_HEADER_VALUE", "NOT_AUTH"));
        mutations.put("능동 스캔 상한 제거", compliant.replace("scanner.maxScanDurationInMins=40", "scanner.threadPerHost=2"));
        mutations.put("상한이 토큰 유효시간 이상", compliant.replace("maxScanDurationInMins=40", "maxScanDurationInMins=60"));
        mutations.put("세션 확인 제거", compliant.replace("$SCANNER_TOKEN", "$OTHER"));
        mutations.put("세션 확인이 실패하지 않음", compliant.replace("          exit 1\n", ""));
        mutations.put("요청 제한 한도를 올리지 않음", compliant.replace("RATE_LIMIT_REQUESTS_PER_MINUTE: '1000000'", "OTHER: '1'"));
        mutations.forEach((label, source) -> assertThat(zapScanViolations(source)).as(label).isNotEmpty());
        log.info("✅ ZAP API 스캔: OpenAPI·로그인·상한·세션 확인 결속, 변형 {}종 red.", mutations.size());
    }

    private List<String> zapScanViolations(String source) {
        Object parsed = new Yaml().load(source);
        Map<?, ?> job = asMap(asMap(asMap(parsed).get("jobs")).get("zap_scan"));
        List<?> steps = asList(job.get("steps"));
        List<String> violations = new ArrayList<>();
        String limit = Objects.toString(asMap(job.get("env")).get("RATE_LIMIT_REQUESTS_PER_MINUTE"), "");
        if (!limit.matches("\\d+") || Long.parseLong(limit) < 100_000) {
            violations.add("스캔 잡이 요청 제한 한도를 올리지 않는다 — 스캐너 요청이 429 로 막혀 공격이 핸들러에 닿지 않는다");
        }
        int scan = -1;
        int auth = -1;
        int session = -1;
        for (int i = 0; i < steps.size(); i++) {
            Map<?, ?> step = asMap(steps.get(i));
            String uses = Objects.toString(step.get("uses"), "");
            String run = Objects.toString(step.get("run"), "");
            if (uses.startsWith("zaproxy/action-full-scan@")
                    && Objects.toString(asMap(step.get("with")).get("target"), "").contains("api-docs")) {
                violations.add("full-scan 이 API 문서 URL 을 웹 페이지로 크롤링한다 — API 경로를 찾지 못한다");
            }
            if (uses.startsWith("zaproxy/action-api-scan@")) {
                scan = i;
                Map<?, ?> with = asMap(step.get("with"));
                if (!"openapi".equals(Objects.toString(with.get("format"), ""))
                        || !Objects.toString(with.get("target"), "").endsWith("/v3/api-docs")) {
                    violations.add("API 스캔이 OpenAPI 정의(/v3/api-docs)를 읽지 않는다");
                }
                java.util.regex.Matcher cap = java.util.regex.Pattern
                        .compile("scanner\\.maxScanDurationInMins=(\\d+)")
                        .matcher(Objects.toString(with.get("cmd_options"), ""));
                if (!cap.find() || Integer.parseInt(cap.group(1)) >= 60) {
                    violations.add("능동 스캔 상한이 없거나 액세스 토큰 유효시간(60분) 이상이다 — 중간부터 로그인 없이 스캔한다");
                }
            }
            if (run.contains("ZAP_AUTH_HEADER_VALUE") && run.contains("GITHUB_ENV") && run.contains("/auth/me")) {
                auth = i;
            }
            if (run.contains("$SCANNER_TOKEN") && run.contains("/auth/me") && run.contains("exit 1")) {
                session = i;
            }
        }
        if (scan < 0) {
            violations.add("OpenAPI 를 읽는 API 스캔(zaproxy/action-api-scan) 단계가 없다");
            return violations;
        }
        if (auth < 0 || auth > scan) {
            violations.add("API 스캔 앞에 스캐너 로그인·토큰 확인 단계가 없다");
        }
        if (session < scan) {
            violations.add("API 스캔 뒤에 스캐너 세션 유지를 확인하고 실패시키는 단계가 없다");
        }
        return violations;
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
