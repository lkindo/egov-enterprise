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
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

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
 * <p><b>⚠ 구현 주의</b>: 주입 필드의 상당수가 {@code private final nuri.business.domain.log.UserLogRepository x;}
 * 처럼 <b>인라인 FQN</b> 형태다. 타입이 소문자 패키지로 시작하므로 {@code [A-Z]} 앵커만 쓰는 스캔은
 * 이들을 통째로 놓친다 — 실제로 이 census 를 만들 때 1차 스캔이 그렇게 실패했다. 위반 주입 검증도
 * 반드시 FQN 형태로 해야 의미가 있다.
 *
 * <p>Spring 컨텍스트를 띄우지 않는 순수 정적 소스 스캔이다.
 */
@Tag("governance-harness")
class CrossDomainCouplingLinterTest {

    private static final Logger log = LoggerFactory.getLogger(CrossDomainCouplingLinterTest.class);

    private static final String APP_SERVICE_BASE = "business-app/src/main/java/nuri/business/service";

    /** 주입 필드 — 단순명과 인라인 FQN 을 모두 받는다. */
    private static final Pattern INJECTED_FIELD = Pattern.compile(
            "private\\s+final\\s+([\\w.]*[A-Z]\\w*(?:Service|Repository))\\s+\\w+\\s*;");

    private static final Pattern IMPORT_DECL = Pattern.compile("^import\\s+(static\\s+)?([\\w.]+);", Pattern.MULTILINE);

    /** {@code nuri.business.(service|domain|repository).<도메인>...} 에서 도메인 세그먼트를 뽑는다. */
    private static final Pattern BUSINESS_TYPE = Pattern.compile(
            "^nuri\\.business\\.(?:service|domain|repository)\\.(\\w+)");

    /**
     * app → app 결합 동결(2026-08-20 실측 6건).
     *
     * <p>board→comment 2건(이벤트 리스너), dashboard→notification, stats→board,
     * informalsanction→sms, informalsanction→mail.
     *
     * <p>이것이 "도메인 통째 삭제" 재사용성을 실제로 깨는 부채다. 늘리지 말고, 역전하면 값을 낮춘다.
     */
    private static final int APP_TO_APP_COUPLING = 6;

    /**
     * app → core 결합 동결(2026-08-20 실측 8건).
     *
     * <p>코어는 삭제 대상이 아니라 허용 가능하지만, '허용' 과 '미탐지' 를 구분하기 위해 동결한다.
     */
    private static final int APP_TO_CORE_COUPLING = 8;

    /** 스캔 붕괴로 인한 vacuous 통과 차단용 하한(실측 74건 대비 여유). */
    private static final int INJECTED_FIELD_FLOOR = 55;

    @Test
    @DisplayName("🔗 business-app 교차 도메인 결합 census 동결 — 서비스 계층 수평 결합 탐지")
    void auditCrossDomainCoupling() throws IOException {
        Path repoRoot = HarnessSourceIndex.repoRoot();
        Path base = repoRoot.resolve(APP_SERVICE_BASE);
        List<Path> sources = HarnessSourceIndex.javaSources(base);

        List<String> appToApp = new ArrayList<>();
        List<String> appToCore = new ArrayList<>();
        int injectedFields = 0;

        for (Path source : sources) {
            String relative = base.relativize(source).toString().replace('\\', '/');
            if (relative.contains("/dto/")) continue;
            String ownerDomain = relative.contains("/") ? relative.substring(0, relative.indexOf('/')) : "";
            if (ownerDomain.isEmpty()) continue;

            String code = HarnessBaselineIntegrityTest.stripCommentsPreservingStrings(
                    HarnessSourceIndex.read(source));
            Map<String, String> imports = collectImports(code);

            Matcher field = INJECTED_FIELD.matcher(code);
            while (field.find()) {
                injectedFields++;
                String declared = field.group(1);
                String fqn = declared.contains(".") ? declared : imports.get(declared);
                if (fqn == null) continue; // 같은 패키지 타입 — 동일 도메인이므로 교차 결합이 아니다

                Matcher business = BUSINESS_TYPE.matcher(fqn);
                if (!business.find()) continue;
                String targetDomain = business.group(1);
                if (targetDomain.equals(ownerDomain)) continue;

                // 소스 경로를 포함한다 — 같은 owner→target 이 서로 다른 파일에 있을 때(board→comment 2건)
                // 경로가 없으면 산출 집합에서 합쳐져 개수와 목록이 어긋난다.
                String entry = relative + ": " + ownerDomain + " -> " + targetDomain
                        + " (" + simpleName(fqn) + ")";
                if (livesInModule(repoRoot, "business-app", fqn)) {
                    appToApp.add(entry);
                } else if (livesInModule(repoRoot, "business-core", fqn)) {
                    appToCore.add(entry);
                }
            }
        }

        writeActual(repoRoot, "build/harness/cross-domain-app-to-app.actual.txt", appToApp);
        writeActual(repoRoot, "build/harness/cross-domain-app-to-core.actual.txt", appToCore);

        List<String> violations = new ArrayList<>();
        if (injectedFields < INJECTED_FIELD_FLOOR) {
            violations.add("주입 필드 스캔 하한 미달: " + injectedFields + " < " + INJECTED_FIELD_FLOOR
                    + " — 경로/정규식 파손 의심(특히 인라인 FQN 미매칭). 빈 census 로 통과시키지 않습니다.");
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

        log.info("✅ 교차 도메인 결합 census 일치 — 주입 {}건, app→app {}건, app→core {}건.",
                injectedFields, appToApp.size(), appToCore.size());
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

    private static boolean livesInModule(Path repoRoot, String module, String fqn) {
        return Files.isRegularFile(repoRoot.resolve(module).resolve("src/main/java")
                .resolve(fqn.replace('.', '/') + ".java"));
    }

    private static void writeActual(Path repoRoot, String relative, List<String> values) throws IOException {
        Path out = repoRoot.resolve(relative);
        Files.createDirectories(out.getParent());
        Files.write(out, new TreeSet<>(values), StandardCharsets.UTF_8);
    }
}
