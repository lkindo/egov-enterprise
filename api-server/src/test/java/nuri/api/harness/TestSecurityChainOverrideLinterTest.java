package nuri.api.harness;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.fail;

/**
 * 🧪 테스트가 프로덕션 시큐리티 체인을 우회하는 지점을 <b>동결</b>하는 린터.
 *
 * <p>[근거 — Wave 1 결정 원장 A-1] 보안 테스트가 프로덕션 {@code ApiSecurityConfig} 가 아니라
 * <b>테스트가 스스로 작성한 필터체인</b>을 검증하고 있었다. 원장은 재작성과 함께
 * "재발 방지 린터(테스트에서 {@code SecurityFilterChain} {@code @Bean} 선언 및
 * {@code mock-security*} 프로파일 금지)도 함께 신설" 하라고 못 박았다 — 린터 없이 고치면
 * 다음 사람이 같은 구조를 다시 만들기 때문이다. 실제로 지금 그렇게 된 상태다.
 *
 * <p><b>왜 '금지' 가 아니라 '동결' 인가.</b> 현행 위반 3건은 실사용 중이고 한 번에 걷어내면
 * 다수 테스트가 동시에 깨진다. 지금 필요한 것은 <b>더 늘지 않게 막는 것</b>이다.
 * 그래서 census 를 동결한다 — 새 우회 지점이 생기면 붉어지고, 기존 항목을 해소하면 그것도 붉어져
 * (동결 목록과 실제가 어긋나므로) 해소 사실을 목록에 반영하도록 강제한다.
 * <b>목록을 늘려 red 를 없애는 것은 AGENTS.md Evidence guardrails H2가 금지하는 신호 은폐다</b> — 늘릴 때는 사유를 남긴다.
 *
 * <p><b>동결 대상</b>
 * <ul>
 *   <li>테스트/테스트픽스처 소스에서 {@code SecurityFilterChain} 을 반환하는 {@code @Bean} 선언 —
 *       프로덕션 체인을 대체(특히 {@code @Primary})하면 그 위의 모든 인가 단언이
 *       <b>테스트 픽스처를 검증하는 것</b>이 된다.</li>
 *   <li>{@code mock-security} / {@code mock-security-test} 프로파일 문자열 —
 *       {@code ApiSecurityConfig} 는 {@code @Profile("!mock-security & !mock-security-test & ...")} 이라
 *       이 프로파일에서는 <b>로드조차 되지 않는다</b>.</li>
 * </ul>
 *
 * <p><b>현행 위반의 성격</b> — 활성 위험은
 * {@code .agent/memory/known-gaps.md}의 {@code GAP-TEST-001}에서 관리한다.
 * <ul>
 *   <li>{@code business-core}/{@code business-app} 의 {@code TestSecurityConfig} 는
 *       {@code anyRequest().permitAll()} 이며 {@code IntegrationTest} 가 그것을 물린다.
 *       따라서 이 stereotype을 쓰는 MockMvc 테스트는 production 인증·인가 체인을 증명하지 않는다.</li>
 *   <li>{@code api-server} 의 {@code SecurityTestConfig} 는 {@code /api/v1/admin/** → hasRole("ADMIN")} 을
 *       하드코딩하는데 프로덕션 인가는 DB secure-paths 기반이라, 그 위의 admin 401/403 단언은 운영 계약이 아니다.</li>
 * </ul>
 *
 * <p>Spring 컨텍스트를 띄우지 않는 순수 정적 테스트(소스 텍스트 파싱).
 * {@code nuri.api.harness.*} 패키지라 {@code :api-server:harnessTest} 에 자동 편입되고,
 * 그 태스크는 {@code .githooks/pre-push} 가 기계로 강제한다.
 */
@Tag("governance-harness")
class TestSecurityChainOverrideLinterTest {

    private static final Logger log = LoggerFactory.getLogger(TestSecurityChainOverrideLinterTest.class);

    /** 스캔 루트 — 저장소 루트 기준 상대 경로. 프로덕션 소스가 아니라 <b>테스트/픽스처</b>만 본다. */
    private static final List<String> SCAN_ROOTS = List.of(
            "api-server/src/test/java",
            "business-core/src/test/java",
            "business-core/src/testFixtures/java",
            "business-app/src/test/java",
            // business-app/src/testFixtures/java 는 2026-08-05 에 소멸했다 — business-core 의 것과
            // FQN 까지 동일한 18파일 복제였고, business-app 은 이제 그것을 재노출해 쓴다.
            // 소스가 없는 루트를 남기면 이 게이트가 '무결성 파손' 으로 하드 실패한다(설계대로다).
            "foundation/src/test/java");

    private static final String ACTUAL_OUT = "build/harness/test-security-override.actual.txt";

    /**
     * {@code SecurityFilterChain} 을 반환하는 메서드 선언. 필드/파라미터/import 는 잡지 않는다
     * ({@code ApiSecurityConfigTest} 처럼 프로덕션 체인을 <b>주입받아 검증</b>하는 것은 정상이며 오히려 권장이다).
     */
    private static final Pattern CHAIN_BEAN_DECL = Pattern.compile(
            "SecurityFilterChain\\s+(\\w+)\\s*\\(");

    /** {@code mock-security} 또는 {@code mock-security-test} 프로파일 문자열. */
    private static final Pattern MOCK_SECURITY_PROFILE = Pattern.compile(
            "\"(mock-security-test|mock-security)\"");

    /**
     * [동결 census] {@code 파일명#종류=건수}. 2026-08-03 실측.
     *
     * <p>⚠ 이 목록을 늘려 red 를 없애기 전에 자문할 것: <b>지금 고치는 것이 위반인가, 빨간 신호인가?</b>
     * 늘려야 한다면 왜 그 테스트가 프로덕션 체인 위에서 돌 수 없는지를 커밋 메시지에 남긴다.
     */
    /** mock 보안 체인을 끌어오는 stereotype 사용처. 선언처가 아니라 **사용처**를 센다. */
    private static final Pattern USES_MOCK_CHAIN_STEREOTYPE = Pattern.compile("@IntegrationTest\\b");

    /** HTTP 계층을 실제로 때리는 표식. */
    private static final Pattern MOCK_MVC_USAGE = Pattern.compile("\\bMockMvc\\b|\\bmockMvc\\s*\\.");

    /**
     * 인가가 걸린 API 경로를 때리는 표식.
     *
     * <p>MockMvc 사용만으로 위반을 판정하면 {@code /swagger-ui}·{@code /v3/api-docs} 처럼
     * {@code ApiSecurityConfig} 의 {@code securityMatchers}({@code /api/v1/**} 등) <b>밖</b> 경로만
     * 때리는 테스트까지 잡힌다. 그 경로는 mock 체인이든 운영 체인이든 판정이 같으므로 위반이 아니다.
     * 이름 예외 목록을 두는 대신 판정 자체를 좁힌다 — 목록은 늘어나지만 의미는 늘어나지 않는다.
     */
    private static final Pattern SECURED_API_PATH = Pattern.compile("\"/api/v1/");

    /**
     * mock 체인 stereotype 사용처 수 동결(2026-08-20 실측).
     *
     * <p>HTTP 계열 4건을 {@code @ApiHttpIntegrationTest} 로 옮긴 뒤 남은 비-HTTP 서비스 통합
     * 사용처다. 늘리지 말고, 줄이면 이 값을 함께 낮춘다.
     */
    private static final int MOCK_CHAIN_STEREOTYPE_USERS = 3;

    private static final Set<String> FROZEN_OVERRIDES = new TreeSet<>(Arrays.asList(
            // api-server — @Primary 로 프로덕션 체인을 대체하고, admin 인가를 하드코딩한다.
            //   ⚠ 이 설정 자체는 남아 있으나 **이제 아무도 @Import 하지 않는다**(아래 해소 기록 참조).
            //     참조가 0인 것과 파일이 없는 것은 다르므로, 파일이 사라질 때까지는 동결 상태로 둔다.
            "SecurityTestConfig#chainBean=1",
            "SecurityTestConfig#mockProfile=1",
            // business-core — anyRequest().permitAll(). 2026-08-05 이전에는 business-app 에도
            //   FQN 까지 동일한 사본이 있어 건수가 2였다. 사본 소멸로 1이 됐다(위반 자체는 미해소).
            "TestSecurityConfig#chainBean=1",
            "TestSecurityConfig#mockProfile=1",
            "IntegrationTest#mockProfile=1"));

    // ── 해소 기록 (목록에서 뺀 것은 '완화' 가 아니라 '상환' 이다) ─────────────────────────
    //
    // [2026-08-03 해소] `BaseSecurityTest#mockProfile=1` 제거.
    //   Wave 1 P1-1 이행으로 BaseSecurityTest 에서 `@ActiveProfiles({"test","mock-security-test"})`
    //   와 `@Import(SecurityTestConfig.class)` 가 빠졌다 — 이제 그 계열 보안 테스트는
    //   **프로덕션 ApiSecurityConfig 위에서** 돈다. 이 게이트가 신설 목적으로 삼았던 바로 그 상태다.
    //
    //   ⚠ 이 줄을 지우는 것은 AGENTS.md Evidence guardrails H2가 금지하는 '신호 지우기'와 형태가 같으므로 근거를 남긴다:
    //     · 제거 근거는 **실측**이다 — BaseSecurityTest 에 mock-security 문자열이 0건이고,
    //       PrivilegeEscalationVulnerabilityTest 3건이 실존 엔드포인트에서 401 이 아니라 403 을 단언하며 그린이다.
    //       (401 이었다면 '미인증 차단' 을 증명할 뿐 '일반 사용자의 권한 상승 차단' 은 증명하지 못한다.)
    //     · 게이트가 이 해소를 **red 로 알려서** 목록을 줄이게 만들었다. 그것이 이 게이트의 설계 의도다
    //       — 늘어날 때만이 아니라 줄어들 때도 손대게 해서, 목록이 실태와 조용히 어긋나지 않게 한다.
    //
    // [2026-08-05 중복 정리] TestSecurityConfig#chainBean / #mockProfile / IntegrationTest#mockProfile 을 2 → 1.
    //   ⚠ **위반이 해소된 것이 아니다.** `anyRequest().permitAll()` 은 business-core 사본에 그대로 살아 있다
    //   (known-gaps.md GAP-TEST-001). 줄어든 것은 **중복** 이다 —
    //   business-app/src/testFixtures 가 business-core 와 FQN 까지 동일한 18파일 복제였고,
    //   api-server 가 양쪽 testFixtures 를 동시에 의존해 같은 이름의 클래스가 클래스패스 순서로
    //   서로를 가리고 있었다. 사본을 지우고 business-app 이 business-core 것을 재노출하도록 바꿨다.
    //   따라서 이 감소는 '상환' 이 아니라 '중복 정리' 다. **부채는 1건으로 남아 계속 red 신호를 낸다.**

    @Test
    @DisplayName("🧪 테스트가 프로덕션 시큐리티 체인을 우회하는 지점 동결 — 신규 우회 차단 (Wave 1 A-1)")
    void auditTestSecurityChainOverrides() throws IOException {
        java.util.Map<String, Integer> counts = new java.util.TreeMap<>();
        int scannedFiles = 0;

        for (String root : SCAN_ROOTS) {
            Path dir = resolveFromRepoRoot(root);
            if (!Files.isDirectory(dir)) {
                fail("게이트 무결성 파손: 스캔 루트를 찾을 수 없습니다 — " + root
                        + " (workingDir=" + Paths.get("").toAbsolutePath() + "). 조용한 skip 은 false-green 입니다.");
            }
            List<Path> files = HarnessSourceIndex.filesUnder(dir).stream()
                        .filter(p -> p.toString().endsWith(".java"))
                        // 이 린터 자신은 판정 대상이 아니다(패턴 문자열이 자기 자신에 매칭된다).
                        .filter(p -> !p.getFileName().toString().equals("TestSecurityChainOverrideLinterTest.java"))
                        .sorted()
                        .collect(Collectors.toList());
            scannedFiles += files.size();
            for (Path file : files) {
                collect(file, counts);
            }
        }

        // 게이트 무결성(false-green 방지): 스캔이 조용히 붕괴하면 census 가 비어 통과한다.
        if (scannedFiles < 100) {
            fail("게이트 무결성 파손: 테스트 소스 스캔 건수(" + scannedFiles
                    + ")가 예상 하한(100) 미만 — 경로/스캔 파손 의심. 빈 census 로 통과시키지 않습니다.");
        }

        Set<String> actual = new TreeSet<>();
        counts.forEach((key, count) -> actual.add(key + "=" + count));
        writeActual(actual);

        // [2026-08-20 신설] 종전 census 는 **선언처만** 셌다. `@IntegrationTest` 는 애노테이션 파일
        //   하나라 census 에 1로만 잡히고, 그것을 쓰는 테스트가 6개든 60개든 값이 변하지 않는다 —
        //   즉 우회의 폭발 반경이 무제한으로 커져도 이 게이트는 계속 초록이었다.
        //   그래서 (1) 사용처 수를 동결하고, (2) mock 체인 위에서 HTTP 를 때리는 조합을 금지한다.
        List<String> mockChainHttpUsers = new ArrayList<>();
        int integrationTestUsers = 0;
        for (String root : SCAN_ROOTS) {
            for (Path file : HarnessSourceIndex.filesUnder(resolveFromRepoRoot(root))) {
                if (!file.toString().endsWith(".java")) continue;
                String name = file.getFileName().toString();
                if (name.equals("IntegrationTest.java") || name.equals("TestSecurityChainOverrideLinterTest.java")) {
                    continue;
                }
                // 주석을 먼저 지운다 — 그러지 않으면 '이 stereotype 을 쓰지 말라' 고 설명하는
                // 주석까지 사용처로 잡혀 census 가 부풀고, 게이트가 자기 문서를 위반으로 신고한다.
                String code = HarnessBaselineIntegrityTest.stripCommentsPreservingStrings(
                        HarnessSourceIndex.read(file));
                if (!USES_MOCK_CHAIN_STEREOTYPE.matcher(code).find()) continue;
                integrationTestUsers++;
                if (MOCK_MVC_USAGE.matcher(code).find() && SECURED_API_PATH.matcher(code).find()) {
                    mockChainHttpUsers.add(file.getFileName().toString());
                }
            }
        }

        List<String> stereotypeViolations = new ArrayList<>();
        if (!mockChainHttpUsers.isEmpty()) {
            stereotypeViolations.add("mock 보안 체인 stereotype 위에서 MockMvc 를 사용하는 테스트: "
                    + String.join(", ", mockChainHttpUsers)
                    + " — 이 컨텍스트는 운영 ApiSecurityConfig 를 로드하지 않으므로 인증·인가를"
                    + " 전혀 증명하지 못합니다. HTTP 검증은 @ApiHttpIntegrationTest 로 옮기십시오.");
        }
        if (integrationTestUsers != MOCK_CHAIN_STEREOTYPE_USERS) {
            stereotypeViolations.add("mock 체인 stereotype 사용처가 " + MOCK_CHAIN_STEREOTYPE_USERS
                    + " → " + integrationTestUsers + " 로 변했습니다."
                    + " 늘었다면 우회 범위가 넓어진 것이고, 줄었다면 상수를 낮춰 되돌릴 수 없게 하십시오.");
        }

        List<String> added = new ArrayList<>();
        List<String> changed = new ArrayList<>();
        for (String entry : actual) {
            if (!FROZEN_OVERRIDES.contains(entry)) {
                added.add(entry);
            }
        }
        for (String entry : FROZEN_OVERRIDES) {
            if (!actual.contains(entry)) {
                changed.add(entry);
            }
        }

        if (!stereotypeViolations.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            sb.append("\n========================================================================\n");
            sb.append("🧪 [MOCK CHAIN STEREOTYPE] 운영 보안 체인 우회의 적용 범위가 변했습니다!\n");
            sb.append("========================================================================\n");
            stereotypeViolations.forEach(v -> sb.append("❌ ").append(v).append('\n'));
            sb.append("\n💡 @IntegrationTest 는 프로파일·@Primary permitAll 체인·TestApplication 스캔배제의\n");
            sb.append("   3중 우회로 운영 체인을 로드하지 않는다. 그 위의 MockMvc 단언은 인증·인가에 대해\n");
            sb.append("   아무것도 증명하지 못한다(실측: 무자격 /api/v1/admin/** 200 단언 10건).\n");
            fail(sb.toString());
        }

        if (!added.isEmpty() || !changed.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            sb.append("\n========================================================================\n");
            sb.append("🧪 [TEST SECURITY OVERRIDE LINTER] 테스트의 프로덕션 체인 우회가 변동했습니다!\n");
            sb.append("========================================================================\n");
            for (String v : added) {
                sb.append("❌ 신규/증가: ").append(v).append(" — 동결 census 에 없는 우회 지점\n");
            }
            for (String v : changed) {
                sb.append("⚠️ 감소/소실: ").append(v).append(" — 동결 항목이 현재 소스에 없음(해소했다면 목록을 함께 줄이십시오)\n");
            }
            sb.append("\n💡 이 게이트가 지키는 것: 보안 테스트가 **자기가 쓴 필터체인**을 검증해\n");
            sb.append("   프로덕션 ApiSecurityConfig 가 한 번도 실행되지 않는 구조(Wave 1 A-1)의 재발.\n");
            sb.append("   새 보안 테스트는 ApiSecurityConfigTest 방식을 따르십시오 —\n");
            sb.append("   @ContextConfiguration(classes = ApiSecurityConfig.class) 로 운영 설정을 직접 로드합니다.\n");
            sb.append("\n💡 늘리기 전에 자문할 것: 지금 고치는 것이 '위반' 입니까, '빨간 신호' 입니까? (AGENTS.md Evidence guardrails H2)\n");
            sb.append("   산출된 실제 census: ").append(Paths.get(ACTUAL_OUT).toAbsolutePath()).append("\n");
            fail(sb.toString());
        }

        log.info("✅ 테스트 시큐리티 우회 census 동결 유지 — {}개 항목(테스트 소스 {}건 스캔).",
                actual.size(), scannedFiles);
    }

    private static void collect(Path file, java.util.Map<String, Integer> sink) throws IOException {
        String code = HarnessBaselineIntegrityTest.stripCommentsPreservingStrings(
                HarnessSourceIndex.read(file));
        String className = file.getFileName().toString().replace(".java", "");

        Matcher chain = CHAIN_BEAN_DECL.matcher(code);
        while (chain.find()) {
            sink.merge(className + "#chainBean", 1, (a, b) -> a + b);
        }
        Matcher profile = MOCK_SECURITY_PROFILE.matcher(code);
        java.util.Set<String> seenInFile = new TreeSet<>();
        while (profile.find()) {
            // 한 파일 안의 @Profile / @ActiveProfiles 는 같은 선언의 두 표현일 수 있으므로 파일당 1회로 센다.
            seenInFile.add(profile.group(1));
        }
        if (!seenInFile.isEmpty()) {
            sink.merge(className + "#mockProfile", 1, (a, b) -> a + b);
        }
    }

    private static void writeActual(Set<String> actual) {
        try {
            Path out = Paths.get(ACTUAL_OUT);
            Files.createDirectories(out.getParent());
            Files.writeString(out, String.join(System.lineSeparator(), actual) + System.lineSeparator(),
                    StandardCharsets.UTF_8);
        } catch (IOException e) {
            log.warn("census 산출 파일 기록 실패(판정에는 영향 없음): {}", e.getMessage());
        }
    }

    /** 실행 워킹디렉터리가 모듈일 수도 루트일 수도 있으므로 settings.gradle 을 기준으로 루트를 찾는다. */
    private static Path resolveFromRepoRoot(String relative) {
        Path cur = Paths.get("").toAbsolutePath();
        while (cur != null) {
            if (Files.exists(cur.resolve("settings.gradle")) || Files.exists(cur.resolve("settings.gradle.kts"))) {
                return cur.resolve(relative);
            }
            cur = cur.getParent();
        }
        return Paths.get(relative);
    }
}
