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
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * 🔗 교차 도메인 결합 census — {@code business-app} 서비스가 다른 도메인에 <b>직접</b> 결합한 지점을 동결한다.
 *
 * <p>[왜 필요한가] 저장소 문서는 "교차 도메인 결합은 port/interface 로 역전돼 있다" 고 서술하지만
 * 실제로는 구체 Service 주입과 타 도메인 Repository 직접 참조가 남아 있다. 그런데 그것을 판정하는
 * 게이트가 <b>없다</b>:
 * <ul>
 *   <li>{@code DomainIsolationTest} 는 {@code @AnalyzeClasses(packages = "nuri.business.domain")} 로
 *       <b>엔티티 패키지만</b> 보며, javadoc 이 "서비스 계층은 본 규칙의 대상이 아니다" 라고
 *       명시적으로 배제한다.</li>
 *   <li>{@code LayeredArchitectureRules} 의 계층 규칙은 Service↔Domain <b>수직</b> 방향만 보고,
 *       {@code Service mayOnlyBeAccessedByLayers("Service")} 로 서비스→서비스를 명시 허용한다.</li>
 *   <li>서비스 슬라이스 규칙은 <b>순환만</b> 금지한다. 현행 결합은 전부 비순환이라 통과한다.</li>
 * </ul>
 * 즉 서비스 계층의 <b>수평(도메인 간)</b> 결합은 구조적으로 탐지 불가였다.
 *
 * <p>[판정 축] 타깃이 어느 모듈이냐로 의미가 갈린다.
 * <ul>
 *   <li><b>app → core</b>: 코어는 삭제 대상이 아니므로 허용 가능한 결합이다. 다만 '허용' 과
 *       '미탐지' 를 구분하기 위해 수를 동결한다.</li>
 *   <li><b>app → app</b>: 업무 도메인을 통째로 들어내는 재사용성을 실제로 깨는 부채다.
 *       이쪽이 이 게이트의 주된 관심사다.</li>
 * </ul>
 *
 * <p><b>⚠ 구현 주의</b>: 주입 필드만 보면 import된 예외·메서드 signature·event listener 타입을 놓친다.
 * 이 게이트는 일반 import와 인라인 FQN을 실제 소유 모듈의 {@code .java} 파일로 해석하고,
 * 파일별 owner→target edge를 하나로 합쳐 전수 census한다.
 *
 * <p>Spring 컨텍스트를 띄우지 않는 순수 정적 소스 스캔이다.
 */
@Tag("governance-harness")
class CrossDomainCouplingLinterTest {

    private static final Logger log = LoggerFactory.getLogger(CrossDomainCouplingLinterTest.class);

    private static final String APP_SERVICE_BASE = "business-app/src/main/java/nuri/business/service";

    private static final Pattern IMPORT_DECL = Pattern.compile("^import\\s+(static\\s+)?([\\w.]+);", Pattern.MULTILINE);

    /** import 없이 signature/본문에 직접 쓴 business 타입 후보. 실제 .java 소유 타입으로 역추적해 오탐을 버린다. */
    private static final Pattern INLINE_BUSINESS_TYPE = Pattern.compile(
            "(?<![\\w.])(nuri\\.business\\.(?:service|domain|repository)\\.[\\w.]+)");

    /** {@code nuri.business.(service|domain|repository).<도메인>...} 에서 도메인 세그먼트를 뽑는다. */
    private static final Pattern BUSINESS_TYPE = Pattern.compile(
            "^nuri\\.business\\.(?:service|domain|repository)\\.(\\w+)");

    /**
     * app → app 결합 동결(2026-08-30 전수 타입 참조 실측 4건).
     *
     * <p>전수 scanner 도입 직후 실측은 6건이었다. 주입 scanner가 놓치던 comment→board
     * ({@code BoardErrorCode})는 comment 소유 오류 계약으로 옮겼고, dashboard→board
     * ({@code PostCreatedEvent})는 foundation 공용 이벤트로 내려 6→4로 상환했다.
     * 잔여는 dashboard→notification, stats→board, informalsanction→sms/mail이다.
     */
    private static final int APP_TO_APP_COUPLING = 4;

    /**
     * app → core 결합 동결(2026-08-30 전수 타입 참조 실측 24건).
     *
     * <p>코어는 삭제 대상이 아니라 허용 가능하지만, '허용' 과 '미탐지' 를 구분하기 위해 동결한다.
     *
     * <p>종전 9는 주입 필드만 센 값이었다. import/signature/event/FQN까지 넓힌 현재 edge 기준은 24다.
     * 코어는 삭제 대상이 아니므로 허용 가능하지만 숫자를 올릴 때는 신설 edge와 사유를 함께 남긴다.
     *
     * <p>[2026-09-05 DEC-OPS-035] 24 → 26. {@code mail → user}·{@code sms → user}
     * ({@code UserContactService}) 신설 — 메일·문자 발송이 수신자를 esntlId 로 받아 서버가 연락처를
     * 해석한다. 사용자 검색 응답은 개인정보를 담지 않으므로(의도) 화면이 주소를 알 수 없고, 해석은 코어
     * 사용자 도메인만 할 수 있다. 결과는 발송에만 쓰고 응답으로 내보내지 않는다(H3).
     */
    private static final int APP_TO_CORE_COUPLING = 26;

    /** 스캔 붕괴로 인한 vacuous 통과 차단용 하한(교차 edge 실측 30건 대비 여유). */
    private static final int CROSS_DOMAIN_REFERENCE_FLOOR = 25;

    @Test
    @DisplayName("red proof: 주입 필드가 아닌 import/signature/event 및 inline FQN 결합도 탐지한다")
    void detectsImportedAndInlineTypeReferencesOutsideInjectedFields() {
        Path root = HarnessSourceIndex.repoRoot();
        String importedEvent = """
                package nuri.business.service.dashboard;
                import nuri.business.service.informalsanction.event.SanctionStatusChangedEvent;
                class Listener { void handle(SanctionStatusChangedEvent event) {} }
                """;
        String inlineRepository = """
                package nuri.business.service.dashboard;
                class Listener {
                    void handle(nuri.business.domain.notification.NotificationRepository repository) {}
                }
                """;

        assertEquals(1, scanReferences(root, "dashboard/Listener.java", importedEvent).size());
        assertEquals(1, scanReferences(root, "dashboard/Listener.java", inlineRepository).size());
        assertTrue(scanReferences(root, "dashboard/Listener.java",
                "package nuri.business.service.dashboard; class Local { void x(DashboardStatsUpdatedEvent e) {} }")
                .isEmpty());
    }

    @Test
    @DisplayName("🔗 business-app 교차 도메인 결합 census 동결 — 서비스 계층 수평 결합 탐지")
    void auditCrossDomainCoupling() throws IOException {
        Path repoRoot = HarnessSourceIndex.repoRoot();
        Path base = repoRoot.resolve(APP_SERVICE_BASE);
        List<Path> sources = HarnessSourceIndex.javaSources(base);

        List<String> appToApp = new ArrayList<>();
        List<String> appToCore = new ArrayList<>();
        int crossDomainReferences = 0;

        for (Path source : sources) {
            String relative = base.relativize(source).toString().replace('\\', '/');
            if (relative.contains("/dto/")) continue;
            String ownerDomain = relative.contains("/") ? relative.substring(0, relative.indexOf('/')) : "";
            if (ownerDomain.isEmpty()) continue;

            String code = HarnessBaselineIntegrityTest.stripCommentsPreservingStrings(
                    HarnessSourceIndex.read(source));
            List<CouplingReference> references = scanReferences(repoRoot, relative, code);
            crossDomainReferences += references.size();
            for (CouplingReference reference : references) {
                if (reference.module().equals("business-app")) {
                    appToApp.add(reference.entry());
                } else if (reference.module().equals("business-core")) {
                    appToCore.add(reference.entry());
                }
            }
        }

        writeActual(repoRoot, "build/harness/cross-domain-app-to-app.actual.txt", appToApp);
        writeActual(repoRoot, "build/harness/cross-domain-app-to-core.actual.txt", appToCore);

        List<String> violations = new ArrayList<>();
        if (crossDomainReferences < CROSS_DOMAIN_REFERENCE_FLOOR) {
            violations.add("교차 타입 참조 스캔 하한 미달: " + crossDomainReferences + " < "
                    + CROSS_DOMAIN_REFERENCE_FLOOR
                    + " — import/인라인 FQN/signature/event 탐지가 파손됐을 가능성이 있습니다.");
        }
        if (appToApp.size() != APP_TO_APP_COUPLING) {
            violations.add("app→app 교차 도메인 결합이 " + APP_TO_APP_COUPLING + " → " + appToApp.size()
                    + " 로 변했습니다:\n   " + String.join("\n   ", new TreeSet<>(appToApp))
                    + "\n   늘었다면 도메인 삭제 가능성이 그만큼 줄어든 것입니다 — port/event 로 역전하십시오."
                    + "\n   역전했다면 상수를 낮춰 되돌릴 수 없게 하십시오.");
        }
        if (appToCore.size() != APP_TO_CORE_COUPLING) {
            violations.add("app→core 결합이 " + APP_TO_CORE_COUPLING + " → " + appToCore.size()
                    + " 로 변했습니다:\n   " + String.join("\n   ", new TreeSet<>(appToCore))
                    + "\n   코어 타깃은 허용 가능하지만 '허용' 과 '미탐지' 를 구분하기 위해 동결합니다.");
        }

        if (!violations.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            sb.append("\n========================================================================\n");
            sb.append("🔗 [CROSS DOMAIN COUPLING LINTER] 서비스 계층 교차 결합이 변동했습니다!\n");
            sb.append("========================================================================\n");
            violations.forEach(v -> sb.append("❌ ").append(v).append('\n'));
            sb.append("\n💡 DomainIsolationTest 는 엔티티 패키지만 보고 서비스 계층을 명시 배제한다.\n");
            sb.append("   그 사각을 이 census 가 덮는다 — 늘어도 red, 줄어도 red 다.\n");
            fail(sb.toString());
        }

        log.info("✅ 교차 도메인 결합 census 일치 — 전수 edge {}건, app→app {}건, app→core {}건.",
                crossDomainReferences, appToApp.size(), appToCore.size());
    }

    static List<CouplingReference> scanReferences(Path repoRoot, String relative, String code) {
        String ownerDomain = relative.contains("/") ? relative.substring(0, relative.indexOf('/')) : "";
        if (ownerDomain.isEmpty()) return List.of();

        Set<String> candidates = new TreeSet<>(collectImports(code).values());
        Matcher inline = INLINE_BUSINESS_TYPE.matcher(code);
        while (inline.find()) candidates.add(inline.group(1));

        Map<String, Set<String>> typesByEdge = new TreeMap<>();
        Map<String, String> moduleByEdge = new HashMap<>();
        for (String candidate : candidates) {
            ResolvedType resolved = resolveType(repoRoot, candidate);
            if (resolved == null) continue;
            Matcher business = BUSINESS_TYPE.matcher(resolved.fqn());
            if (!business.find()) continue;
            String targetDomain = business.group(1);
            if (targetDomain.equals(ownerDomain)) continue;

            String edge = ownerDomain + " -> " + targetDomain;
            String key = resolved.module() + "|" + edge;
            typesByEdge.computeIfAbsent(key, ignored -> new TreeSet<>()).add(simpleName(resolved.fqn()));
            moduleByEdge.put(key, resolved.module());
        }

        List<CouplingReference> references = new ArrayList<>();
        typesByEdge.forEach((key, types) -> {
            String edge = key.substring(key.indexOf('|') + 1);
            references.add(new CouplingReference(moduleByEdge.get(key),
                    relative + ": " + edge + " (" + String.join(", ", types) + ")"));
        });
        return references;
    }

    private static Map<String, String> collectImports(String code) {
        Map<String, String> imports = new HashMap<>();
        Matcher matcher = IMPORT_DECL.matcher(code);
        while (matcher.find()) {
            if (matcher.group(1) != null) continue; // static import 는 타입이 아니다
            String fqn = matcher.group(2);
            imports.put(simpleName(fqn), fqn);
        }
        return imports;
    }

    private static String simpleName(String fqn) {
        int last = fqn.lastIndexOf('.');
        return last < 0 ? fqn : fqn.substring(last + 1);
    }

    private static ResolvedType resolveType(Path repoRoot, String candidate) {
        String fqn = candidate;
        while (fqn.contains(".")) {
            for (String module : List.of("business-app", "business-core")) {
                if (livesInModule(repoRoot, module, fqn)) return new ResolvedType(module, fqn);
            }
            fqn = fqn.substring(0, fqn.lastIndexOf('.'));
        }
        return null;
    }

    private static boolean livesInModule(Path repoRoot, String module, String fqn) {
        return Files.isRegularFile(repoRoot.resolve(module).resolve("src/main/java")
                .resolve(fqn.replace('.', '/') + ".java"));
    }

    private static void writeActual(Path repoRoot, String relative, List<String> values) throws IOException {
        Path out = repoRoot.resolve(relative);
        Files.createDirectories(out.getParent());
        Files.write(out, new TreeSet<>(values), StandardCharsets.UTF_8);
    }

    record CouplingReference(String module, String entry) {}

    private record ResolvedType(String module, String fqn) {}
}
