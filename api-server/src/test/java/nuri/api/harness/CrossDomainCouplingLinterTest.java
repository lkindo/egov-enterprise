package nuri.api.harness;

import com.fasterxml.jackson.core.StreamReadFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.json.JsonMapper;
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
import java.util.Comparator;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.function.Predicate;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * 🔗 교차 도메인 결합 census — {@code business-app} 서비스가 다른 도메인에 <b>직접</b> 결합한 지점을 동결한다.
 *
 * <p>[왜 필요한가] 저장소 문서는 "교차 도메인 결합은 port/interface 로 역전돼 있다" 고 서술하지만
 * 실제로는 구체 Service 주입과 타 도메인 Repository 직접 참조가 남아 있다. 그런데 그것을 판정하는
 * 게이트가 <b>없었다</b>:
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
 *       '미탐지' 를 구분하기 위해 동결한다.</li>
 *   <li><b>app → app</b>: 업무 도메인을 통째로 들어내는 재사용성을 실제로 깨는 부채다.
 *       이쪽이 이 게이트의 주된 관심사다.</li>
 * </ul>
 *
 * <p><b>동결 원장은 {@code config/governance/cross-domain-coupling-census.json} 이다.</b> 종전에는 app→app·app→core
 * 개수만 상수로 동결했는데, 이제 edge(소유 파일·소유 도메인·대상 도메인·대상 모듈·참조 타입 FQN)를 <b>정확한 집합</b>으로
 * 비교한다 — 한 edge 가 사라지고 다른 edge 가 생겨 개수가 같아지는 교체도 red 다. 각 edge 에는 그 소유 파일과 참조
 * 타입이 모두 살아남는 가장 작은 재사용 pack 을 적는다. 축소 프로필(재사용 base 투영)에서는 남은 pack 의 edge 만
 * 기대하며, 빠진 pack 의 edge 는 <b>그 소스 파일 중 하나가 실제로 없을 때만</b> 기대에서 뺀다 — 전부 남아 있으면
 * pack 태그가 틀린 것이라 red 다. 태그가 생성기의 실제 제거 계획과 맞는지는
 * {@code scripts/cross-domain-coupling-census-contract.test.mjs} 가 대조한다.
 *
 * <p><b>⚠ 구현 주의</b>: 주입 필드만 보면 import된 예외·메서드 signature·event listener 타입을 놓친다.
 * 이 게이트는 일반 import와 인라인 FQN을 실제 소유 모듈의 main 소스 파일로 해석하고,
 * 파일별 owner→target edge를 하나로 합쳐 전수 census한다. 이 파일은 business 도메인 타입을 참조하지 않는다 —
 * 참조 한 줄이 재사용 base 투영에서 이 게이트를 통째로 지운다.
 *
 * <p>Spring 컨텍스트를 띄우지 않는 순수 정적 소스 스캔이다.
 */
@Tag("governance-harness")
class CrossDomainCouplingLinterTest {

    private static final Logger log = LoggerFactory.getLogger(CrossDomainCouplingLinterTest.class);

    private static final String APP_SERVICE_BASE = "business-app/src/main/java/nuri/business/service";
    private static final String CENSUS_REGISTRY = "config/governance/cross-domain-coupling-census.json";
    private static final String PACK_MANIFEST = "config/reusable-base-profiles.json";

    private static final Pattern IMPORT_DECL = Pattern.compile("^import\\s+(static\\s+)?([\\w.]+);", Pattern.MULTILINE);

    /** import 없이 signature/본문에 직접 쓴 business 타입 후보. 실제 .java 소유 타입으로 역추적해 오탐을 버린다. */
    private static final Pattern INLINE_BUSINESS_TYPE = Pattern.compile(
            "(?<![\\w.])(nuri\\.business\\.(?:service|domain|repository)\\.[\\w.]+)");

    /** {@code nuri.business.(service|domain|repository).<도메인>...} 에서 도메인 세그먼트를 뽑는다. */
    private static final Pattern BUSINESS_TYPE = Pattern.compile(
            "^nuri\\.business\\.(?:service|domain|repository)\\.(\\w+)");

    private static final Pattern EDGE_FILE = Pattern.compile("[a-z][a-z0-9_]*(?:/[A-Za-z0-9_]+)*/[A-Z][A-Za-z0-9_]*\\.java");
    private static final Pattern DOMAIN_NAME = Pattern.compile("[a-z][a-z0-9_]*");

    private static final List<String> TARGET_MODULES = List.of("business-app", "business-core");

    /**
     * 원장 전체 edge 하한(anti-shrink). 원장은 메타 게이트가 해시로 동결하지만, 하한은 원장 자체를 비워 게이트를
     * 무력화하는 경로를 한 번 더 막는다. 프로필과 무관하게 원장 <b>전체</b>에 적용한다(2026-09-14 실측 38건).
     */
    private static final int CROSS_DOMAIN_REFERENCE_FLOOR = 25;

    @Test
    @DisplayName("red proof: 주입 필드가 아닌 import/signature/event 및 inline FQN 결합도 탐지한다")
    void detectsImportedAndInlineTypeReferencesOutsideInjectedFields() throws IOException {
        Path fixture = Files.createTempDirectory("cross-domain-coupling-fixture");
        stub(fixture, "business-app", "nuri.business.service.approvalx.event.StatusChangedEvent");
        stub(fixture, "business-app", "nuri.business.domain.alertx.AlertRepository");
        stub(fixture, "business-core", "nuri.business.service.accountx.AccountService");

        List<CouplingReference> imported = scanReferences(fixture, "boardx/Listener.java",
                "package nuri.business.service.boardx;\n"
                        + "import nuri.business.service.approvalx.event.StatusChangedEvent;\n"
                        + "class Listener { void handle(StatusChangedEvent event) {} }\n");
        assertThat(imported).extracting(CouplingReference::key)
                .containsExactly("business-app|boardx/Listener.java|boardx->approvalx"
                        + "|nuri.business.service.approvalx.event.StatusChangedEvent");

        List<CouplingReference> inline = scanReferences(fixture, "boardx/Listener.java",
                "package nuri.business.service.boardx;\n"
                        + "class Listener { void handle(nuri.business.domain.alertx.AlertRepository repository) {} }\n");
        assertThat(inline).extracting(CouplingReference::module).containsExactly("business-app");

        List<CouplingReference> core = scanReferences(fixture, "boardx/Service.java",
                "package nuri.business.service.boardx;\n"
                        + "import nuri.business.service.accountx.AccountService;\n"
                        + "class Service { AccountService accounts; }\n");
        assertThat(core).extracting(CouplingReference::module).containsExactly("business-core");

        assertThat(scanReferences(fixture, "boardx/Local.java",
                "package nuri.business.service.boardx; class Local { void x(LocalEvent e) {} }")).isEmpty();
        assertThat(scanReferences(fixture, "boardx/Unknown.java",
                "package nuri.business.service.boardx;\nimport nuri.business.service.ghostx.Missing;\nclass Unknown {}"))
                .as("소스 파일로 해석되지 않는 타입은 edge 가 아니다")
                .isEmpty();
    }

    @Test
    @DisplayName("🔗 business-app 교차 도메인 결합 census 동결 — 서비스 계층 수평 결합 탐지")
    void auditCrossDomainCoupling() throws IOException {
        Path repoRoot = HarnessSourceIndex.repoRoot();
        Registry registry = Registry.parse(readRepoFile(repoRoot, CENSUS_REGISTRY));
        Set<String> presentPacks = presentPacks(registry, readRepoFile(repoRoot, PACK_MANIFEST));

        Path base = repoRoot.resolve(APP_SERVICE_BASE);
        // 축소 프로필에서는 business-app 서비스가 통째로 빠질 수 있다 — 그때 스캔 결과는 빈 집합이고,
        //   원장이 남은 pack 의 edge 를 기대하면 아래 정확한 집합 비교가 red 로 말한다.
        List<Path> sources = Files.isDirectory(base) ? HarnessSourceIndex.javaSources(base) : List.of();

        List<CouplingReference> actual = new ArrayList<>();
        for (Path source : sources) {
            String relative = base.relativize(source).toString().replace('\\', '/');
            if (relative.contains("/dto/")) continue;
            if (!relative.contains("/")) continue;
            String code = HarnessSourceIndex.stripCommentsPreservingStrings(HarnessSourceIndex.read(source));
            actual.addAll(scanReferences(repoRoot, relative, code));
        }
        writeActual(repoRoot, actual);

        List<String> violations = new ArrayList<>();
        if (registry.edges().size() < CROSS_DOMAIN_REFERENCE_FLOOR) {
            violations.add("원장 edge 하한 미달: " + registry.edges().size() + " < " + CROSS_DOMAIN_REFERENCE_FLOOR
                    + " — 원장을 비워 결합 census 를 무력화하지 마십시오.");
        }
        Set<String> expected = expectedEdgeKeys(registry, presentPacks,
                path -> Files.isRegularFile(repoRoot.resolve(path)), violations);
        violations.addAll(compare(expected, actual));

        if (!violations.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            sb.append("\n========================================================================\n");
            sb.append("🔗 [CROSS DOMAIN COUPLING LINTER] 서비스 계층 교차 결합이 원장과 어긋납니다!\n");
            sb.append("========================================================================\n");
            violations.forEach(v -> sb.append("❌ ").append(v).append('\n'));
            sb.append("\n💡 app→app 이 늘었다면 도메인 삭제 가능성이 그만큼 줄어든 것입니다 — port/event 로 역전하십시오.\n");
            sb.append("   역전했다면 원장에서 edge 를 지워 되돌릴 수 없게 하십시오. app→core 는 허용 가능하지만\n");
            sb.append("   '허용' 과 '미탐지' 를 구분하기 위해 동결합니다. 스캔 결과는 build/harness/cross-domain-coupling.actual.json.\n");
            fail(sb.toString());
        }

        long appToApp = actual.stream().filter(reference -> reference.module().equals("business-app")).count();
        log.info("✅ 교차 도메인 결합 census 일치 — 남은 pack {} 기준 edge {}건(app→app {}건, app→core {}건), 원장 전체 {}건.",
                presentPacks, actual.size(), appToApp, actual.size() - appToApp, registry.edges().size());
    }

    @Test
    @DisplayName("부정 증명: 원장 대조는 교체·누락·신규 edge 와 틀린 pack 태그를 red 로 만들고 실제 부재만 뺀다")
    void registryComparisonIsExactAndPackAware() {
        Registry registry = Registry.parse(json("{'schemaVersion':1,'packs':['base','extra'],'edges':["
                + "{'file':'kept/KeptService.java','owner':'kept','target':'account','module':'business-core',"
                + "'types':['nuri.business.service.account.AccountService'],'pack':'base'},"
                + "{'file':'gone/GoneService.java','owner':'gone','target':'kept','module':'business-app',"
                + "'types':['nuri.business.service.kept.KeptService'],'pack':'extra'}]}"));
        String keptKey = "business-core|kept/KeptService.java|kept->account|nuri.business.service.account.AccountService";
        String goneKey = "business-app|gone/GoneService.java|gone->kept|nuri.business.service.kept.KeptService";
        CouplingReference kept = new CouplingReference("business-core", "kept/KeptService.java", "kept", "account",
                new TreeSet<>(Set.of("nuri.business.service.account.AccountService")));
        CouplingReference gone = new CouplingReference("business-app", "gone/GoneService.java", "gone", "kept",
                new TreeSet<>(Set.of("nuri.business.service.kept.KeptService")));

        // 실제 트리를 흉내 낸 파일 집합 — 참조 타입은 edge 의 대상 모듈에만 있다.
        Set<String> realFiles = Set.of(
                "business-app/src/main/java/nuri/business/service/kept/KeptService.java",
                "business-app/src/main/java/nuri/business/service/gone/GoneService.java",
                "business-core/src/main/java/nuri/business/service/account/AccountService.java");

        // ① 모든 pack 이 있으면 두 edge 를 모두 기대하고, 정확히 같으면 위반이 없다.
        List<String> none = new ArrayList<>();
        Set<String> all = expectedEdgeKeys(registry, Set.of("base", "extra"), realFiles::contains, none);
        assertThat(all).containsExactlyInAnyOrder(keptKey, goneKey);
        assertThat(compare(all, List.of(kept, gone))).isEmpty();

        // ② 원장에 없는 edge, 원장에 있는데 스캔되지 않은 edge 는 각각 red 다.
        assertThat(compare(all, List.of(kept))).anySatisfy(v -> assertThat(v).contains("사라진 edge").contains(goneKey));
        assertThat(compare(Set.of(keptKey), List.of(kept, gone))).anySatisfy(v -> assertThat(v).contains("원장에 없는 edge"));

        // ③ 같은 소유·대상이라도 참조 타입이 바뀌면 다른 edge 다(개수 동결이 놓치던 교체).
        CouplingReference swapped = new CouplingReference("business-core", "kept/KeptService.java", "kept", "account",
                new TreeSet<>(Set.of("nuri.business.service.account.AccountRepository")));
        assertThat(compare(Set.of(keptKey), List.of(swapped))).hasSize(2);

        // ④ 빠진 pack 의 edge 는 소스 중 하나가 실제로 없을 때만 기대에서 빠진다.
        List<String> dropped = new ArrayList<>();
        Set<String> reduced = expectedEdgeKeys(registry, Set.of("base"),
                path -> realFiles.contains(path) && !path.contains("/gone/"), dropped);
        assertThat(reduced).containsExactly(keptKey);
        assertThat(dropped).isEmpty();

        // ⑤ 빠진 pack 인데 소스가 전부 남아 있으면 pack 태그가 틀린 것이다. 실제와 같은 파일 집합으로 판정한다 —
        //    "모든 경로가 있다" 는 합성 술어로는 대상 모듈 밖 경로를 섞는 결함이 가려진다.
        List<String> mistagged = new ArrayList<>();
        expectedEdgeKeys(registry, Set.of("base"), realFiles::contains, mistagged);
        assertThat(mistagged).singleElement().asString().contains("pack 태그").contains("gone/GoneService.java");
    }

    @Test
    @DisplayName("부정 증명: 원장·pack 어휘의 형식 오류는 fail-closed 로 거부한다")
    void registryAndVocabularyAreFailClosed() {
        String edge = "{'file':'kept/KeptService.java','owner':'kept','target':'account','module':'business-core',"
                + "'types':['nuri.business.service.account.AccountService'],'pack':'base'}";
        String head = "{'schemaVersion':1,'packs':['base'],'edges':[";

        assertThatThrownBy(() -> Registry.parse(json("{'schemaVersion':1,'packs':['base'],'packs':['base'],'edges':[]}")))
                .as("중복 키").isInstanceOf(AssertionError.class);
        assertThatThrownBy(() -> Registry.parse(json(head + edge.replace("'pack':'base'", "'pack':'other'") + "]}")))
                .as("어휘 밖 pack").isInstanceOf(AssertionError.class).hasMessageContaining("other");
        assertThatThrownBy(() -> Registry.parse(json(head + edge + "," + edge + "]}")))
                .as("중복 edge").isInstanceOf(AssertionError.class).hasMessageContaining("중복");
        assertThatThrownBy(() -> Registry.parse(json(head + edge.replace("business-core", "foundation") + "]}")))
                .as("모듈 어휘").isInstanceOf(AssertionError.class).hasMessageContaining("module");
        assertThatThrownBy(() -> Registry.parse(json(head + edge.replace("'owner':'kept'", "'owner':'other'") + "]}")))
                .as("소유 도메인과 파일 경로 불일치").isInstanceOf(AssertionError.class).hasMessageContaining("owner");
        assertThatThrownBy(() -> Registry.parse(json(head
                + edge.replace("nuri.business.service.account.AccountService", "nuri.business.service.billing.Invoice") + "]}")))
                .as("참조 타입이 대상 도메인 소속이 아님").isInstanceOf(AssertionError.class).hasMessageContaining("target");
        assertThatThrownBy(() -> Registry.parse(json(head + edge.replace("'pack':'base'", "'pack':'base','note':'x'") + "]}")))
                .as("모르는 필드").isInstanceOf(AssertionError.class).hasMessageContaining("note");
        assertThatThrownBy(() -> Registry.parse(json(head + edge.replace("kept/KeptService.java", "../KeptService.java") + "]}")))
                .as("경로 형식").isInstanceOf(AssertionError.class);

        Registry registry = Registry.parse(json("{'schemaVersion':1,'packs':['base','extra'],'edges':[" + edge + "]}"));
        assertThat(presentPacks(registry, json("{'packs':{'base':{}}}"))).containsExactly("base");
        assertThatThrownBy(() -> presentPacks(registry, json("{'packs':{'base':{},'newcomer':{}}}")))
                .as("원장 어휘에 없는 manifest pack").isInstanceOf(AssertionError.class).hasMessageContaining("newcomer");
    }

    /** 남은 pack 기준 기대 edge 키. 빠진 pack 의 edge 는 소스 중 하나가 실제로 없을 때만 뺀다. */
    static Set<String> expectedEdgeKeys(Registry registry, Set<String> presentPacks, Predicate<String> fileExists,
                                        List<String> violations) {
        Set<String> expected = new TreeSet<>();
        for (Edge edge : registry.edges()) {
            if (presentPacks.contains(edge.pack())) {
                expected.add(edge.key());
                continue;
            }
            boolean anyMissing = edge.sourcePaths().stream().anyMatch(path -> !fileExists.test(path));
            if (!anyMissing) {
                violations.add(edge.file() + " (" + edge.owner() + " -> " + edge.target() + ") 는 빠진 pack '" + edge.pack()
                        + "' 소유로 적혀 있는데 소스가 모두 남아 있습니다 — pack 태그가 틀렸습니다.");
            }
        }
        return expected;
    }

    static List<String> compare(Set<String> expected, List<CouplingReference> actual) {
        Set<String> actualKeys = new TreeSet<>();
        actual.forEach(reference -> actualKeys.add(reference.key()));
        List<String> violations = new ArrayList<>();
        for (String key : actualKeys) {
            if (!expected.contains(key)) {
                violations.add("원장에 없는 edge: " + key);
            }
        }
        for (String key : expected) {
            if (!actualKeys.contains(key)) {
                violations.add("원장에 있는데 사라진 edge: " + key);
            }
        }
        return violations;
    }

    static List<CouplingReference> scanReferences(Path repoRoot, String relative, String code) {
        String ownerDomain = relative.contains("/") ? relative.substring(0, relative.indexOf('/')) : "";
        if (ownerDomain.isEmpty()) return List.of();

        Set<String> candidates = new TreeSet<>(collectImports(code).values());
        Matcher inline = INLINE_BUSINESS_TYPE.matcher(code);
        while (inline.find()) candidates.add(inline.group(1));

        Map<String, Set<String>> typesByEdge = new TreeMap<>();
        for (String candidate : candidates) {
            ResolvedType resolved = resolveType(repoRoot, candidate);
            if (resolved == null) continue;
            Matcher business = BUSINESS_TYPE.matcher(resolved.fqn());
            if (!business.find()) continue;
            String targetDomain = business.group(1);
            if (targetDomain.equals(ownerDomain)) continue;
            typesByEdge.computeIfAbsent(resolved.module() + "|" + targetDomain, ignored -> new TreeSet<>())
                    .add(resolved.fqn());
        }

        List<CouplingReference> references = new ArrayList<>();
        typesByEdge.forEach((key, types) -> references.add(new CouplingReference(
                key.substring(0, key.indexOf('|')), relative, ownerDomain, key.substring(key.indexOf('|') + 1),
                new TreeSet<>(types))));
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
            for (String module : TARGET_MODULES) {
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

    private static void stub(Path root, String module, String fqn) throws IOException {
        Path file = root.resolve(module).resolve("src/main/java").resolve(fqn.replace('.', '/') + ".java");
        Files.createDirectories(file.getParent());
        Files.writeString(file, "class " + simpleName(fqn) + " {}\n", StandardCharsets.UTF_8);
    }

    private static void writeActual(Path repoRoot, List<CouplingReference> actual) throws IOException {
        Path dir = repoRoot.resolve("build/harness");
        Files.createDirectories(dir);
        Set<String> appToApp = new TreeSet<>();
        Set<String> appToCore = new TreeSet<>();
        for (CouplingReference reference : actual) {
            (reference.module().equals("business-app") ? appToApp : appToCore).add(reference.display());
        }
        Files.write(dir.resolve("cross-domain-app-to-app.actual.txt"), appToApp, StandardCharsets.UTF_8);
        Files.write(dir.resolve("cross-domain-app-to-core.actual.txt"), appToCore, StandardCharsets.UTF_8);

        List<CouplingReference> sorted = new ArrayList<>(actual);
        sorted.sort(Comparator.comparing(CouplingReference::key));
        StringBuilder json = new StringBuilder("[\n");
        for (int i = 0; i < sorted.size(); i++) {
            CouplingReference reference = sorted.get(i);
            json.append("  {\"file\": \"").append(reference.file()).append("\", \"owner\": \"").append(reference.owner())
                    .append("\", \"target\": \"").append(reference.target()).append("\", \"module\": \"")
                    .append(reference.module()).append("\", \"types\": [");
            int index = 0;
            for (String type : reference.types()) {
                json.append(index++ == 0 ? "" : ", ").append('"').append(type).append('"');
            }
            json.append("]}").append(i + 1 < sorted.size() ? ",\n" : "\n");
        }
        json.append("]\n");
        Files.writeString(dir.resolve("cross-domain-coupling.actual.json"), json.toString(), StandardCharsets.UTF_8);
    }

    /** 원장의 pack 어휘와 현재 트리 manifest 의 pack 을 대조해 남은 pack 을 돌려준다. */
    static Set<String> presentPacks(Registry registry, String manifestJson) {
        JsonNode packs = readJson(manifestJson, PACK_MANIFEST).get("packs");
        if (packs == null || !packs.isObject() || packs.isEmpty()) {
            throw new AssertionError(PACK_MANIFEST + " 의 packs 가 비어 있거나 객체가 아닙니다.");
        }
        Set<String> present = new TreeSet<>();
        for (Iterator<String> names = packs.fieldNames(); names.hasNext(); ) {
            String name = names.next();
            if (!registry.packs().contains(name)) {
                throw new AssertionError("pack manifest 의 '" + name + "' 가 " + CENSUS_REGISTRY
                        + " 의 packs 어휘에 없습니다. 새 pack 의 결합 edge 를 먼저 판정하십시오.");
            }
            present.add(name);
        }
        return present;
    }

    private static String readRepoFile(Path root, String relative) {
        try {
            return HarnessSourceIndex.read(root.resolve(relative));
        } catch (IOException ex) {
            throw new AssertionError(relative + " 를 읽지 못했습니다 — 원장 없이는 판정하지 않습니다.", ex);
        }
    }

    private static JsonNode readJson(String json, String source) {
        try {
            return JsonMapper.builder()
                    .enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION)
                    .build()
                    .readTree(json);
        } catch (IOException ex) {
            throw new AssertionError(source + " 를 JSON 으로 읽지 못했습니다: " + ex.getMessage(), ex);
        }
    }

    private static String json(String singleQuoted) {
        return singleQuoted.replace('\'', '"');
    }

    record CouplingReference(String module, String file, String owner, String target, Set<String> types) {
        String key() {
            return module + "|" + file + "|" + owner + "->" + target + "|" + String.join(",", types);
        }

        String display() {
            List<String> simple = new ArrayList<>();
            types.forEach(type -> simple.add(simpleName(type)));
            simple.sort(null);
            return file + ": " + owner + " -> " + target + " (" + String.join(", ", simple) + ")";
        }
    }

    private record ResolvedType(String module, String fqn) {}

    /** 원장 edge 한 줄. {@code types} 는 해석된 main 소스 FQN 의 정렬된 집합이다. */
    record Edge(String file, String owner, String target, String module, Set<String> types, String pack) {
        String key() {
            return module + "|" + file + "|" + owner + "->" + target + "|" + String.join(",", types);
        }

        /**
         * 이 edge 가 투영에서 살아남는 데 필요한 소스 파일(저장소 상대 경로). 참조 타입은 edge 의 대상 모듈에만 있다 —
         * 스캔이 타입을 해석된 모듈별로 묶기 때문이다. 다른 모듈 경로까지 넣으면 늘 "하나는 없다" 가 되어 태그 오류 판정이 죽는다.
         */
        List<String> sourcePaths() {
            List<String> paths = new ArrayList<>();
            paths.add(APP_SERVICE_BASE + "/" + file);
            for (String type : types) {
                paths.add(module + "/src/main/java/" + type.replace('.', '/') + ".java");
            }
            return paths;
        }
    }

    record Registry(Set<String> packs, List<Edge> edges) {

        static Registry parse(String json) {
            JsonNode root = readJson(json, CENSUS_REGISTRY);
            requireFields(root, CENSUS_REGISTRY, Set.of("schemaVersion", "description", "packs", "edges"),
                    Set.of("schemaVersion", "packs", "edges"));
            if (root.get("schemaVersion").asInt(-1) != 1) {
                throw new AssertionError(CENSUS_REGISTRY + " schemaVersion 은 1 이어야 합니다.");
            }
            Set<String> packs = new LinkedHashSet<>();
            JsonNode packNodes = root.get("packs");
            if (!packNodes.isArray() || packNodes.isEmpty()) {
                throw new AssertionError(CENSUS_REGISTRY + " packs 는 비어 있지 않은 배열이어야 합니다.");
            }
            for (JsonNode pack : packNodes) {
                if (!pack.isTextual() || pack.asText().isBlank() || !packs.add(pack.asText())) {
                    throw new AssertionError(CENSUS_REGISTRY + " packs 에 빈 값·중복·비문자열이 있습니다: " + pack);
                }
            }
            JsonNode edgeNodes = root.get("edges");
            if (!edgeNodes.isArray()) {
                throw new AssertionError(CENSUS_REGISTRY + " edges 는 배열이어야 합니다.");
            }
            List<Edge> edges = new ArrayList<>();
            Set<String> keys = new LinkedHashSet<>();
            for (JsonNode node : edgeNodes) {
                requireFields(node, "edges", Set.of("file", "owner", "target", "module", "types", "pack"),
                        Set.of("file", "owner", "target", "module", "types", "pack"));
                String file = text(node, "file");
                String owner = text(node, "owner");
                String target = text(node, "target");
                String module = text(node, "module");
                String pack = text(node, "pack");
                if (!EDGE_FILE.matcher(file).matches()) {
                    throw new AssertionError("edges.file 은 서비스 기준 상대 .java 경로여야 합니다: " + file);
                }
                if (!DOMAIN_NAME.matcher(owner).matches() || !file.startsWith(owner + "/")) {
                    throw new AssertionError("edges.owner '" + owner + "' 가 파일 경로의 첫 도메인과 다릅니다: " + file);
                }
                if (!DOMAIN_NAME.matcher(target).matches() || target.equals(owner)) {
                    throw new AssertionError("edges.target '" + target + "' 가 도메인 이름이 아니거나 owner 와 같습니다: " + file);
                }
                if (!TARGET_MODULES.contains(module)) {
                    throw new AssertionError("edges.module 은 " + TARGET_MODULES + " 중 하나여야 합니다: " + module);
                }
                if (!packs.contains(pack)) {
                    throw new AssertionError("edges.pack '" + pack + "' 가 packs 어휘 " + packs + " 에 없습니다: " + file);
                }
                JsonNode typeNodes = node.get("types");
                if (!typeNodes.isArray() || typeNodes.isEmpty()) {
                    throw new AssertionError("edges.types 는 비어 있지 않은 배열이어야 합니다: " + file);
                }
                List<String> typeList = new ArrayList<>();
                for (JsonNode typeNode : typeNodes) {
                    String type = typeNode.isTextual() ? typeNode.asText() : "";
                    Matcher business = BUSINESS_TYPE.matcher(type);
                    if (!business.find() || !business.group(1).equals(target) || type.contains("$")) {
                        throw new AssertionError("edges.types '" + type + "' 가 target 도메인 '" + target
                                + "' 의 중첩 없는 business 타입 FQN 이 아닙니다: " + file);
                    }
                    typeList.add(type);
                }
                List<String> sortedTypes = new ArrayList<>(new TreeSet<>(typeList));
                if (!sortedTypes.equals(typeList)) {
                    throw new AssertionError("edges.types 는 중복 없이 정렬돼야 합니다: " + file + " " + typeList);
                }
                Edge edge = new Edge(file, owner, target, module, new TreeSet<>(typeList), pack);
                if (!keys.add(edge.key())) {
                    throw new AssertionError("edges 에 중복 edge: " + edge.key());
                }
                edges.add(edge);
            }
            return new Registry(Set.copyOf(packs), List.copyOf(edges));
        }

        private static String text(JsonNode node, String field) {
            JsonNode value = node.get(field);
            if (value == null || !value.isTextual() || value.asText().isBlank()) {
                throw new AssertionError("edges." + field + " 는 비어 있지 않은 문자열이어야 합니다: " + node);
            }
            return value.asText();
        }

        private static void requireFields(JsonNode node, String section, Set<String> allowed, Set<String> required) {
            if (node == null || !node.isObject()) {
                throw new AssertionError(section + " 항목은 객체여야 합니다: " + node);
            }
            for (Iterator<String> names = node.fieldNames(); names.hasNext(); ) {
                String name = names.next();
                if (!allowed.contains(name)) {
                    throw new AssertionError(section + " 에 모르는 필드 '" + name + "' 가 있습니다: " + node);
                }
            }
            for (String name : required) {
                if (!node.hasNonNull(name)) {
                    throw new AssertionError(section + " 항목에 '" + name + "' 가 없습니다: " + node);
                }
            }
        }
    }
}
