package nuri.api.harness;

import com.fasterxml.jackson.core.StreamReadFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.json.JsonMapper;
import nuri.foundation.core.annotation.PrivacyAccess;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.core.annotation.AnnotationUtils;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;

import java.io.IOException;
import java.lang.reflect.Field;
import java.lang.reflect.GenericArrayType;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.lang.reflect.TypeVariable;
import java.lang.reflect.WildcardType;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.function.Predicate;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * 🧾 개인정보 접근 증적 census — {@link PrivacyAccess} 부착 지점을 <b>양방향</b>으로 동결한다.
 *
 * <p>[왜 필요한가] {@code tb_privacy_log} 는 컴플라이언스 증적이다. 무엇이 기록되는지가
 * 코드 어딘가에 흩어져 있으면 두 방향으로 조용히 깨진다.
 * <ul>
 *   <li><b>누락</b> — 개인정보를 새로 노출하는 엔드포인트를 만들고 애노테이션을 빠뜨리면
 *       증적 없이 조회가 일어난다. 화면은 정상이라 아무도 눈치채지 못한다.</li>
 *   <li><b>삭제</b> — 기존 애노테이션을 지우면 기록이 멈추는데, 표가 비어 가는 것은
 *       "접근이 없었다"로 오독된다.</li>
 * </ul>
 * 그래서 부착 지점의 <b>정확한 집합</b>을 동결하고, 늘거나 줄면 red 로 만든다.
 *
 * <p><b>판정 원장은 소스가 아니라 {@code config/governance/privacy-access-census.json} 이다.</b>
 * 종전에는 선언 목록과 민감 응답 타입을 이 클래스의 상수·타입 참조로 두었는데, 재사용 base 투영은
 * 제거된 pack 의 타입을 참조하는 파일을 통째로 지우므로 <b>남는 코어 컨트롤러까지 검사하던 이 게이트가
 * 축소 프로필에서 사라졌다</b>(GAP-PACK-001 ④). 원장은 항목마다 소유 pack 을 적고, 이 게이트는
 * 현재 트리의 pack manifest 에 남은 pack 의 항목만 기대한다. 원장은 메타 게이트가 해시로 동결하고,
 * pack 태그가 생성기의 실제 제거 계획과 맞는지는 {@code scripts/privacy-access-census-contract.test.mjs} 가 대조한다.
 *
 * <p><b>빠진 pack 의 항목은 "클래스가 없다" 로만 인정한다.</b> 제외 pack 인데 클래스가 로드되면 pack 태그가
 * 틀린 것이고, 로드 중 링크 오류가 나면 판정할 수 없는 것이다 — 둘 다 조용히 건너뛰지 않고 red 다.
 *
 * <p><b>이 원장을 고칠 때 함께 판단할 것.</b> 본인 정보 조회(마이페이지)는 대상이 아니다 —
 * 자기 정보 열람을 증적에 섞으면 타인 조회 기록이 희석된다. 반대로 응답에 타인의 주민등록번호·
 * 연락처·주소·생년월일이 새로 실리면 반드시 등재해야 한다.
 *
 * <p>Spring 컨텍스트를 띄우지 않는 순수 정적 테스트(컴포넌트 클래스패스 스캔·리플렉션).
 * 이 파일은 어떤 도메인 타입도 참조하지 않아야 한다 — 참조 한 줄이 투영에서 게이트 전체를 지운다.
 */
@Tag("governance-harness")
@DisplayName("개인정보 접근 증적 census")
class PrivacyAccessCensusLinterTest {

    private static final String SCAN_BASE = "nuri";
    private static final String CENSUS_REGISTRY = "config/governance/privacy-access-census.json";
    private static final String PACK_MANIFEST = "config/reusable-base-profiles.json";

    /**
     * 게이트 무결성(false-green 방지): 컨트롤러 스캔이 조용히 0으로 수렴하면 census 는
     * "부착 0건 == 선언 0건" 으로 vacuous 통과할 수 있다. 가장 작은 프로필(core)에서도 이 하한을 넘는지는
     * 계약 테스트가 생성기의 제거 계획으로 확인한다.
     */
    private static final int CONTROLLER_FLOOR = 30;

    private static final Set<String> SENSITIVE_FIELD_NAMES = Set.of(
            "emladdr", "email", "emailaddress",
            "mbltelno", "mobilephone", "mobilenumber", "hometelno",
            "brthymd", "brdtymd", "brdt", "birthdate", "dateofbirth",
            "rcptntelno", "recipientphone", "rspdntnm",
            "homeaddr", "daddr", "residentregistrationnumber", "rrn", "ssn");

    private static final Pattern TYPE_NAME = Pattern.compile("[a-z][a-z0-9_]*(?:\\.[a-z][a-z0-9_]*)*\\.[A-Z][A-Za-z0-9_]*");
    private static final Pattern METHOD_NAME = Pattern.compile("[a-z][A-Za-z0-9_]*");

    @Test
    @DisplayName("🔒 @PrivacyAccess 부착 지점이 선언 census 와 정확히 일치한다")
    void privacyAccessHandlersMatchDeclaredCensus() {
        Path root = HarnessSourceIndex.repoRoot();
        Registry registry = Registry.parse(readRepoFile(root, CENSUS_REGISTRY));
        Set<String> presentPacks = presentPacks(registry, readRepoFile(root, PACK_MANIFEST));
        ClassLoader loader = PrivacyAccessCensusLinterTest.class.getClassLoader();
        ReusableHarnessProfile profile = ReusableHarnessProfile.current();
        Expectations expected = expectationsFor(registry, name -> Class.forName(name, false, loader),
                profile.customDomains() ? entry -> profile.retainsType(entry.typeName())
                        : entry -> presentPacks.contains(entry.pack()));

        Set<String> actual = new TreeSet<>();
        Set<String> sensitiveGetHandlers = new TreeSet<>();
        Set<String> scannedControllers = new TreeSet<>();
        Set<Class<?>> fieldDerivedSensitiveTypes = scanFieldDerivedSensitiveDtos(loader);
        assertThat(fieldDerivedSensitiveTypes)
                .as("수동 민감 응답 roster의 각 타입은 DTO 필드명이라는 독립 신호로도 탐지돼야 한다")
                .containsAll(expected.sensitiveTypes());

        ClassPathScanningCandidateComponentProvider scanner =
                new ClassPathScanningCandidateComponentProvider(true);
        for (var bd : scanner.findCandidateComponents(SCAN_BASE)) {
            String className = bd.getBeanClassName();
            Class<?> clazz = loadForScan(className, loader);
            if (AnnotationUtils.findAnnotation(clazz, RequestMapping.class) == null) {
                continue;
            }
            scannedControllers.add(clazz.getName());
            for (Method m : clazz.getDeclaredMethods()) {
                String handler = clazz.getName() + "#" + m.getName();
                PrivacyAccess annotation = AnnotationUtils.findAnnotation(m, PrivacyAccess.class);
                if (annotation != null) {
                    assertThat(annotation.value())
                            .as("%s 의 조회 항목 서술은 비어 있을 수 없다", handler)
                            .isNotBlank();
                    actual.add(handler);
                }
                if (isGetHandler(m)
                        && (containsType(m.getGenericReturnType(), expected.sensitiveTypes())
                        || containsType(m.getGenericReturnType(), fieldDerivedSensitiveTypes))) {
                    sensitiveGetHandlers.add(handler);
                }
            }
        }

        if (scannedControllers.size() < CONTROLLER_FLOOR) {
            fail("게이트 무결성 파손: 컨트롤러 스캔 건수(" + scannedControllers.size() + ")가 하한("
                    + CONTROLLER_FLOOR + ") 미만입니다. 스캔 경로가 끊겼는지 확인하십시오.");
        }
        List<String> unanchored = new ArrayList<>(expected.controllers());
        unanchored.removeAll(scannedControllers);
        assertThat(unanchored)
                .as("남은 pack 의 원장 컨트롤러는 모두 요청 매핑 컴포넌트로 스캔돼야 한다 — "
                        + "스캔 밖으로 빠진 컨트롤러는 부착 여부를 판정할 수 없다")
                .isEmpty();

        List<String> missing = new ArrayList<>(expected.handlers());
        missing.removeAll(actual);
        List<String> unexpected = new ArrayList<>(actual);
        unexpected.removeAll(expected.handlers());

        if (!missing.isEmpty() || !unexpected.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            sb.append("🔒 [PRIVACY-ACCESS CENSUS] 개인정보 접근 증적 부착 지점이 선언과 어긋납니다.\n");
            if (!unexpected.isEmpty()) {
                sb.append("   · census 에 없는 신규 부착: ").append(unexpected).append('\n');
                sb.append("     → 의도한 추가라면 ").append(CENSUS_REGISTRY)
                        .append(" 의 declaredHandlers 에 소유 pack 과 함께 등재하십시오.\n");
            }
            if (!missing.isEmpty()) {
                sb.append("   · 선언됐지만 사라진 부착: ").append(missing).append('\n');
                sb.append("     → 증적이 멈춥니다. 제거가 의도라면 사유와 함께 원장에서 지우십시오.\n");
            }
            fail(sb.toString());
        }

        Set<String> expectedSensitiveGetHandlers = new TreeSet<>(expected.handlers());
        expectedSensitiveGetHandlers.addAll(expected.exemptions().keySet());
        List<String> uncoveredSensitiveGets = new ArrayList<>(sensitiveGetHandlers);
        uncoveredSensitiveGets.removeAll(expectedSensitiveGetHandlers);
        List<String> staleDeclarationsOrExemptions = new ArrayList<>(expectedSensitiveGetHandlers);
        staleDeclarationsOrExemptions.removeAll(sensitiveGetHandlers);

        if (!uncoveredSensitiveGets.isEmpty() || !staleDeclarationsOrExemptions.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            sb.append("🔒 [PRIVACY-RESPONSE CENSUS] GET 응답 타입 기반 개인정보 탐지가 선언과 어긋납니다.\n");
            if (!uncoveredSensitiveGets.isEmpty()) {
                sb.append("   · 증적 또는 명시 예외가 없는 민감 응답: ").append(uncoveredSensitiveGets).append('\n');
            }
            if (!staleDeclarationsOrExemptions.isEmpty()) {
                sb.append("   · 민감 응답으로 탐지되지 않는 선언/예외: ")
                        .append(staleDeclarationsOrExemptions).append('\n');
            }
            fail(sb.toString());
        }
    }

    @Test
    @DisplayName("부정 증명: pack 필터는 '클래스 없음' 만 부재로 인정하고 태그 오류·링크 오류·누락을 red 로 만든다")
    void packFilterAcceptsOnlyMissingClassesAsAbsence() {
        Registry registry = Registry.parse(json("{'schemaVersion':1,'packs':['base','extra'],"
                + "'declaredHandlers':["
                + "{'controller':'example.kept.KeptController','method':'list','pack':'base'},"
                + "{'controller':'example.gone.GoneController','method':'list','pack':'extra'}],"
                + "'sensitiveGetExemptions':["
                + "{'controller':'example.gone.GoneController','method':'mine','pack':'extra','reason':'본인 조회'}],"
                + "'knownSensitiveResponseTypes':["
                + "{'type':'example.kept.KeptDto','pack':'base'},"
                + "{'type':'example.gone.GoneDto','pack':'extra'}]}"));

        // ① 모든 pack 이 있으면 전 항목을 기대한다.
        Expectations all = expectationsFor(registry, Set.of("base", "extra"), name -> Object.class);
        assertThat(all.handlers()).containsExactlyInAnyOrder(
                "example.kept.KeptController#list", "example.gone.GoneController#list");
        assertThat(all.exemptions()).containsOnlyKeys("example.gone.GoneController#mine");

        // ② 빠진 pack 의 클래스가 정말 없으면 그 항목만 조용히 빠진다.
        Expectations reduced = expectationsFor(registry, Set.of("base"), name -> {
            if (name.startsWith("example.gone.")) {
                throw new ClassNotFoundException(name);
            }
            return Object.class;
        });
        assertThat(reduced.handlers()).containsExactly("example.kept.KeptController#list");
        assertThat(reduced.exemptions()).isEmpty();
        assertThat(reduced.controllers()).containsExactly("example.kept.KeptController");

        // ③ 빠진 pack 인데 클래스가 남아 있으면 pack 태그가 틀린 것이다.
        assertThatThrownBy(() -> expectationsFor(registry, Set.of("base"), name -> Object.class))
                .isInstanceOf(AssertionError.class)
                .hasMessageContaining("example.gone.GoneController")
                .hasMessageContaining("pack 태그");

        // ④ 빠진 pack 의 클래스가 링크 오류로 로드되지 않으면 부재인지 판정할 수 없다.
        assertThatThrownBy(() -> expectationsFor(registry, Set.of("base"), name -> {
            if (name.startsWith("example.gone.")) {
                throw new NoClassDefFoundError(name);
            }
            return Object.class;
        }))
                .isInstanceOf(AssertionError.class)
                .hasMessageContaining("링크 오류");

        // ⑤ 남은 pack 의 클래스가 없으면 원장이 낡은 것이다.
        assertThatThrownBy(() -> expectationsFor(registry, Set.of("base", "extra"), name -> {
            if (name.equals("example.kept.KeptDto")) {
                throw new ClassNotFoundException(name);
            }
            return Object.class;
        }))
                .isInstanceOf(AssertionError.class)
                .hasMessageContaining("example.kept.KeptDto");
    }

    @Test
    @DisplayName("custom 개인정보 census는 같은 pack의 선택 핸들러를 유지하고 클래스 소실·예상 밖 생존을 거부한다")
    void customSourcePlanPreservesSelectedPrivacyHandlers() {
        Registry registry = Registry.parse(json("{'schemaVersion':1,'packs':['shared'],"
                + "'declaredHandlers':[{'controller':'example.kept.Controller','method':'list','pack':'shared'},"
                + "{'controller':'example.gone.Controller','method':'list','pack':'shared'}],"
                + "'sensitiveGetExemptions':[],'knownSensitiveResponseTypes':[]}"));
        Predicate<Entry> selected = entry -> entry.typeName().startsWith("example.kept.");
        Expectations projection = expectationsFor(registry, name -> {
            if (name.startsWith("example.gone.")) throw new ClassNotFoundException(name);
            return Object.class;
        }, selected);
        assertThat(projection.handlers()).containsExactly("example.kept.Controller#list");
        assertThatThrownBy(() -> expectationsFor(registry, name -> {
            throw new ClassNotFoundException(name);
        }, selected)).isInstanceOf(AssertionError.class).hasMessageContaining("example.kept.Controller");
        assertThatThrownBy(() -> expectationsFor(registry, name -> Object.class, selected))
                .isInstanceOf(AssertionError.class).hasMessageContaining("example.gone.Controller");
        assertThatThrownBy(() -> expectationsFor(registry, name -> {
            if (name.startsWith("example.gone.")) throw new NoClassDefFoundError(name);
            return Object.class;
        }, selected)).isInstanceOf(AssertionError.class).hasMessageContaining("링크 오류");
    }

    @Test
    @DisplayName("부정 증명: 원장·pack 어휘의 형식 오류는 fail-closed 로 거부한다")
    void registryAndVocabularyAreFailClosed() {
        String entry = "{'controller':'example.kept.KeptController','method':'list','pack':'base'}";
        String tail = "'sensitiveGetExemptions':[],'knownSensitiveResponseTypes':[]}";

        assertThatThrownBy(() -> Registry.parse(json("{'schemaVersion':1,'packs':['base'],"
                + "'packs':['base'],'declaredHandlers':[" + entry + "]," + tail)))
                .as("중복 키").isInstanceOf(AssertionError.class);
        assertThatThrownBy(() -> Registry.parse(json("{'schemaVersion':1,'packs':['base'],'declaredHandlers':["
                + "{'controller':'example.kept.KeptController','method':'list','pack':'other'}]," + tail)))
                .as("어휘 밖 pack").isInstanceOf(AssertionError.class).hasMessageContaining("other");
        assertThatThrownBy(() -> Registry.parse(json("{'schemaVersion':1,'packs':['base'],'declaredHandlers':["
                + entry + "," + entry + "]," + tail)))
                .as("중복 핸들러").isInstanceOf(AssertionError.class).hasMessageContaining("중복");
        assertThatThrownBy(() -> Registry.parse(json("{'schemaVersion':1,'packs':['base'],'declaredHandlers':["
                + "{'controller':'example.kept.Outer$Inner','method':'list','pack':'base'}]," + tail)))
                .as("중첩 타입").isInstanceOf(AssertionError.class);
        assertThatThrownBy(() -> Registry.parse(json("{'schemaVersion':1,'packs':['base'],'declaredHandlers':[],"
                + "'sensitiveGetExemptions':[{'controller':'example.kept.KeptController','method':'me',"
                + "'pack':'base','reason':' '}],'knownSensitiveResponseTypes':[]}")))
                .as("빈 예외 사유").isInstanceOf(AssertionError.class).hasMessageContaining("사유");
        assertThatThrownBy(() -> Registry.parse(json("{'schemaVersion':1,'packs':['base'],'declaredHandlers':["
                + "{'controller':'example.kept.KeptController','method':'list','pack':'base','packs':'x'}],"
                + tail)))
                .as("모르는 필드").isInstanceOf(AssertionError.class).hasMessageContaining("packs");

        Registry registry = Registry.parse(json("{'schemaVersion':1,'packs':['base','extra'],'declaredHandlers':["
                + entry + "]," + tail));
        assertThat(presentPacks(registry, json("{'packs':{'base':{}}}"))).containsExactly("base");
        assertThatThrownBy(() -> presentPacks(registry, json("{'packs':{'base':{},'newcomer':{}}}")))
                .as("원장 어휘에 없는 manifest pack").isInstanceOf(AssertionError.class)
                .hasMessageContaining("newcomer");
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
                        + " 의 packs 어휘에 없습니다. 새 pack 의 개인정보 표면을 먼저 판정하십시오.");
            }
            present.add(name);
        }
        return present;
    }

    /**
     * 남은 pack 만의 기대 집합을 계산한다. 순수 함수 — 클래스 로드는 주입된 resolver 로만 한다.
     *
     * <p>빠진 pack 의 항목은 resolver 가 {@link ClassNotFoundException} 을 던질 때만 제외한다.
     */
    static Expectations expectationsFor(Registry registry, Set<String> presentPacks, TypeResolver resolver) {
        return expectationsFor(registry, resolver, entry -> presentPacks.contains(entry.pack()));
    }

    /** Custom targets come from the recorded source plan, independently of class loading. */
    static Expectations expectationsFor(Registry registry, TypeResolver resolver, Predicate<Entry> included) {
        List<String> violations = new ArrayList<>();
        Map<String, Class<?>> resolved = new LinkedHashMap<>();
        Set<String> judged = new HashSet<>();
        for (Entry entry : registry.allEntries()) {
            String type = entry.typeName();
            if (!judged.add(type + "@" + entry.pack())) {
                continue;
            }
            boolean present = included.test(entry);
            try {
                Class<?> loaded = resolved.containsKey(type) ? resolved.get(type) : resolver.resolve(type);
                resolved.put(type, loaded);
                if (!present) {
                    violations.add(type + " 는 빠진 pack '" + entry.pack()
                            + "' 소유로 적혀 있는데 클래스가 남아 있습니다 — pack 태그가 틀렸습니다.");
                }
            } catch (ClassNotFoundException ex) {
                if (present) {
                    violations.add(type + " 는 남은 pack '" + entry.pack()
                            + "' 소유인데 클래스가 없습니다 — 원장이 낡았습니다.");
                }
            } catch (LinkageError ex) {
                violations.add(type + " 로드 중 링크 오류(" + ex + ") — 부재인지 판정할 수 없습니다.");
            }
        }
        if (!violations.isEmpty()) {
            throw new AssertionError("🔒 [PRIVACY-ACCESS CENSUS] pack 판정 실패:\n   · "
                    + String.join("\n   · ", violations));
        }

        Set<String> handlers = new TreeSet<>();
        Set<String> controllers = new TreeSet<>();
        for (Entry entry : registry.declaredHandlers()) {
            if (included.test(entry)) {
                handlers.add(entry.key());
                controllers.add(entry.typeName());
            }
        }
        Map<String, String> exemptions = new TreeMap<>();
        for (Entry entry : registry.sensitiveGetExemptions()) {
            if (included.test(entry)) {
                exemptions.put(entry.key(), entry.reason());
                controllers.add(entry.typeName());
            }
        }
        Set<Class<?>> sensitiveTypes = new LinkedHashSet<>();
        for (Entry entry : registry.knownSensitiveResponseTypes()) {
            if (included.test(entry)) {
                sensitiveTypes.add(resolved.get(entry.typeName()));
            }
        }
        return new Expectations(Set.copyOf(handlers), Map.copyOf(exemptions), Set.copyOf(sensitiveTypes),
                Set.copyOf(controllers));
    }

    @FunctionalInterface
    interface TypeResolver {
        Class<?> resolve(String fqn) throws ClassNotFoundException;
    }

    record Expectations(Set<String> handlers, Map<String, String> exemptions, Set<Class<?>> sensitiveTypes,
                        Set<String> controllers) {
    }

    /** 원장 항목 한 줄. 핸들러 항목은 {@code controller}+{@code method}, 타입 항목은 {@code type} 만 쓴다. */
    record Entry(String typeName, String method, String pack, String reason) {
        String key() {
            return typeName + "#" + method;
        }
    }

    record Registry(Set<String> packs, List<Entry> declaredHandlers, List<Entry> sensitiveGetExemptions,
                    List<Entry> knownSensitiveResponseTypes) {

        List<Entry> allEntries() {
            List<Entry> all = new ArrayList<>(declaredHandlers);
            all.addAll(sensitiveGetExemptions);
            all.addAll(knownSensitiveResponseTypes);
            return all;
        }

        static Registry parse(String json) {
            JsonNode root = readJson(json, CENSUS_REGISTRY);
            requireFields(root, CENSUS_REGISTRY, Set.of("schemaVersion", "description", "packs",
                    "declaredHandlers", "sensitiveGetExemptions", "knownSensitiveResponseTypes"),
                    Set.of("schemaVersion", "packs", "declaredHandlers", "sensitiveGetExemptions",
                            "knownSensitiveResponseTypes"));
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
            List<Entry> handlers = handlerEntries(root.get("declaredHandlers"), "declaredHandlers", packs, false);
            List<Entry> exemptions = handlerEntries(root.get("sensitiveGetExemptions"), "sensitiveGetExemptions",
                    packs, true);
            Set<String> handlerKeys = new HashSet<>();
            for (Entry entry : handlers) {
                handlerKeys.add(entry.key());
            }
            for (Entry entry : exemptions) {
                if (handlerKeys.contains(entry.key())) {
                    throw new AssertionError(entry.key() + " 가 선언과 예외에 동시에 있습니다.");
                }
            }
            List<Entry> types = new ArrayList<>();
            Set<String> typeNames = new HashSet<>();
            for (JsonNode node : array(root.get("knownSensitiveResponseTypes"), "knownSensitiveResponseTypes")) {
                requireFields(node, "knownSensitiveResponseTypes", Set.of("type", "pack"), Set.of("type", "pack"));
                String type = typeName(node.get("type"), "knownSensitiveResponseTypes");
                if (!typeNames.add(type)) {
                    throw new AssertionError("knownSensitiveResponseTypes 에 중복 타입: " + type);
                }
                types.add(new Entry(type, null, pack(node.get("pack"), packs), null));
            }
            return new Registry(Set.copyOf(packs), List.copyOf(handlers), List.copyOf(exemptions), List.copyOf(types));
        }

        private static List<Entry> handlerEntries(JsonNode nodes, String section, Set<String> packs,
                                                  boolean requireReason) {
            Set<String> allowed = requireReason
                    ? Set.of("controller", "method", "pack", "reason", "note")
                    : Set.of("controller", "method", "pack", "note");
            Set<String> required = requireReason
                    ? Set.of("controller", "method", "pack", "reason")
                    : Set.of("controller", "method", "pack");
            List<Entry> entries = new ArrayList<>();
            Set<String> keys = new HashSet<>();
            for (JsonNode node : array(nodes, section)) {
                requireFields(node, section, allowed, required);
                String controller = typeName(node.get("controller"), section);
                String method = node.get("method").asText();
                if (!node.get("method").isTextual() || !METHOD_NAME.matcher(method).matches()) {
                    throw new AssertionError(section + " 의 method 형식 오류: " + node.get("method"));
                }
                String reason = null;
                if (requireReason) {
                    reason = node.get("reason").isTextual() ? node.get("reason").asText() : "";
                    if (reason.isBlank()) {
                        throw new AssertionError(section + " " + controller + "#" + method
                                + " 에 검토 가능한 사유가 없습니다.");
                    }
                }
                Entry entry = new Entry(controller, method, pack(node.get("pack"), packs), reason);
                if (!keys.add(entry.key())) {
                    throw new AssertionError(section + " 에 중복 핸들러: " + entry.key());
                }
                entries.add(entry);
            }
            return entries;
        }

        private static Iterable<JsonNode> array(JsonNode node, String section) {
            if (node == null || !node.isArray()) {
                throw new AssertionError(CENSUS_REGISTRY + " 의 " + section + " 는 배열이어야 합니다.");
            }
            return node;
        }

        private static String typeName(JsonNode node, String section) {
            String value = node.isTextual() ? node.asText() : "";
            if (!TYPE_NAME.matcher(value).matches()) {
                throw new AssertionError(section + " 의 타입 이름은 중첩 없는 FQN 이어야 합니다: " + node);
            }
            return value;
        }

        private static String pack(JsonNode node, Set<String> packs) {
            String value = node.isTextual() ? node.asText() : "";
            if (!packs.contains(value)) {
                throw new AssertionError("원장 항목의 pack '" + value + "' 가 packs 어휘 " + packs + " 에 없습니다.");
            }
            return value;
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

    private static String readRepoFile(Path root, String relative) {
        try {
            return HarnessSourceIndex.read(root.resolve(relative));
        } catch (IOException ex) {
            throw new AssertionError(relative + " 를 읽지 못했습니다 — 원장 없이는 판정하지 않습니다.", ex);
        }
    }

    private static String json(String singleQuoted) {
        return singleQuoted.replace('\'', '"');
    }

    private static Class<?> loadForScan(String className, ClassLoader loader) {
        try {
            return Class.forName(className, false, loader);
        } catch (ClassNotFoundException | LinkageError ex) {
            throw new AssertionError("컴포넌트 로드 실패 — 스캔에서 조용히 제외하면 부착 누락을 판정할 수 없습니다: "
                    + className, ex);
        }
    }

    private static boolean isGetHandler(Method method) {
        RequestMapping mapping = AnnotatedElementUtils.findMergedAnnotation(method, RequestMapping.class);
        return mapping != null && Arrays.asList(mapping.method()).contains(RequestMethod.GET);
    }

    private static Set<Class<?>> scanFieldDerivedSensitiveDtos(ClassLoader loader) {
        ClassPathScanningCandidateComponentProvider scanner =
                new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter((metadataReader, metadataReaderFactory) -> isApplicationDtoName(
                metadataReader.getClassMetadata().getClassName()));

        Set<Class<?>> sensitiveTypes = new HashSet<>();
        for (var bd : scanner.findCandidateComponents(SCAN_BASE)) {
            String className = bd.getBeanClassName();
            try {
                Class<?> dtoType = Class.forName(className, false, loader);
                if (hasSensitiveFieldGraph(dtoType, new HashSet<>())) {
                    sensitiveTypes.add(dtoType);
                }
            } catch (ClassNotFoundException | LinkageError ex) {
                throw new AssertionError("민감 DTO 필드 census 로드 실패: " + className, ex);
            }
        }
        return sensitiveTypes;
    }

    private static boolean containsType(Type type, Set<Class<?>> targetTypes) {
        return containsType(type, targetTypes, new HashSet<>());
    }

    private static boolean containsType(Type type, Set<Class<?>> targetTypes, Set<Type> visited) {
        if (type == null || !visited.add(type)) {
            return false;
        }
        if (type instanceof Class<?> clazz) {
            return targetTypes.contains(clazz)
                    || (clazz.isArray() && containsType(clazz.getComponentType(), targetTypes, visited));
        }
        if (type instanceof ParameterizedType parameterizedType) {
            if (containsType(parameterizedType.getRawType(), targetTypes, visited)
                    || containsType(parameterizedType.getOwnerType(), targetTypes, visited)) {
                return true;
            }
            return Arrays.stream(parameterizedType.getActualTypeArguments())
                    .anyMatch(argument -> containsType(argument, targetTypes, visited));
        }
        if (type instanceof GenericArrayType genericArrayType) {
            return containsType(genericArrayType.getGenericComponentType(), targetTypes, visited);
        }
        if (type instanceof WildcardType wildcardType) {
            return Arrays.stream(wildcardType.getUpperBounds())
                    .anyMatch(bound -> containsType(bound, targetTypes, visited))
                    || Arrays.stream(wildcardType.getLowerBounds())
                    .anyMatch(bound -> containsType(bound, targetTypes, visited));
        }
        if (type instanceof TypeVariable<?> typeVariable) {
            return Arrays.stream(typeVariable.getBounds())
                    .anyMatch(bound -> containsType(bound, targetTypes, visited));
        }
        return false;
    }

    private static boolean hasSensitiveFieldGraph(Class<?> dtoType, Set<Class<?>> visited) {
        if (!visited.add(dtoType)) {
            return false;
        }
        for (Field field : dtoType.getDeclaredFields()) {
            if (field.isSynthetic() || Modifier.isStatic(field.getModifiers())) {
                continue;
            }
            if (SENSITIVE_FIELD_NAMES.contains(field.getName().toLowerCase(Locale.ROOT))
                    || typeHasSensitiveFieldGraph(field.getGenericType(), visited)) {
                return true;
            }
        }
        return false;
    }

    private static boolean typeHasSensitiveFieldGraph(Type type, Set<Class<?>> visited) {
        if (type instanceof Class<?> clazz) {
            if (clazz.isArray()) {
                return typeHasSensitiveFieldGraph(clazz.getComponentType(), visited);
            }
            return isApplicationDtoName(clazz.getName()) && hasSensitiveFieldGraph(clazz, visited);
        }
        if (type instanceof ParameterizedType parameterizedType) {
            return Arrays.stream(parameterizedType.getActualTypeArguments())
                    .anyMatch(argument -> typeHasSensitiveFieldGraph(argument, visited));
        }
        if (type instanceof GenericArrayType genericArrayType) {
            return typeHasSensitiveFieldGraph(genericArrayType.getGenericComponentType(), visited);
        }
        if (type instanceof WildcardType wildcardType) {
            return Arrays.stream(wildcardType.getUpperBounds())
                    .anyMatch(bound -> typeHasSensitiveFieldGraph(bound, visited))
                    || Arrays.stream(wildcardType.getLowerBounds())
                    .anyMatch(bound -> typeHasSensitiveFieldGraph(bound, visited));
        }
        if (type instanceof TypeVariable<?> typeVariable) {
            return Arrays.stream(typeVariable.getBounds())
                    .anyMatch(bound -> typeHasSensitiveFieldGraph(bound, visited));
        }
        return false;
    }

    private static boolean isApplicationDtoName(String className) {
        return className.startsWith("nuri.business.service.")
                && className.contains(".dto.")
                && className.endsWith("Dto");
    }
}
