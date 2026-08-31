package nuri.api.harness;

import com.fasterxml.jackson.annotation.JsonAnyGetter;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.RegexPatternTypeFilter;

import java.io.IOException;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * 🔗 DTO 필드 ↔ api-docs.json 스키마 property 린터 — SSOT 계약체인 최상류(§2.D) **필드 레벨** 보호.
 *
 * <p>[근거] {@link ApiDocsPathCoverageLinterTest} 가 최상류를 **경로(path)** 수준에서 봉합했으나, 그 주석이
 * 스스로 밝히듯 <b>"필드레벨 스키마↔DTO 대조는 파싱복잡·오탐위험으로 스코프 밖"</b> 이었다. 그래서 지금은
 * <b>경로는 지키는데 필드는 안 지킨다</b> — 개발자가 DTO 에 필드를 더하거나 이름을 바꾸고 api-docs.json
 * 재생성을 잊으면, pre-push 하류 게이트(codegen:verify/:zod)는 <b>api-docs 와 산출물의 일치만</b> 보므로
 * <b>전부 GREEN 인 채</b> 프론트가 stale 계약으로 동작한다. 이 린터가 그 마지막 구멍을 오프라인으로 막는다.
 *
 * <p>[규칙 — 양방향, 화이트리스트 동결]
 * <ul>
 *   <li><b>MISSING_IN_DTO</b>: api-docs 스키마에는 있는데 DTO 에 없는 property (필드 삭제·개명 후 미재생성)</li>
 *   <li><b>MISSING_IN_DOCS</b>: DTO 에는 있는데 api-docs 스키마에 없는 필드 (필드 추가 후 미재생성)</li>
 * </ul>
 * 현 시점 잔여는 {@link #GRANDFATHERED} 로 동결하고 <b>신규 드리프트만 차단</b>한다. 수량이 아니라
 * <b>항목(집합)</b> 으로 동결한다 — 수량 하한은 "하나 고치고 하나 새로 넣기" 우회를 허용하기 때문이다.
 *
 * <p>[오탐 억제] {@code @JsonIgnore} 제외 · {@code @JsonProperty} 개명 반영 · static/synthetic 제외 ·
 * getter 파생 property 인정(springdoc 은 getter 기준으로도 스키마를 만든다) · 동일 simpleName 클래스가
 * 둘 이상이면 모호하므로 검사 제외.
 *
 * <p>Spring 컨텍스트를 띄우지 않는 순수 정적 테스트(api-docs.json 파싱 + 클래스패스 리플렉션).
 * pre-push 의 {@code :api-server:harnessTest} 로 기계강제된다.
 */
@Tag("governance-harness")
class ApiDocsSchemaFieldLinterTest {

    private static final Logger log = LoggerFactory.getLogger(ApiDocsSchemaFieldLinterTest.class);

    @Test
    @DisplayName("@JsonAnyGetter backing store는 named property가 아니며 일반 Map은 계속 검사한다")
    void jsonAnyGetterBackingStore_isExcludedWithoutHidingNamedMaps() {
        assertFalse(jsonPropertyNames(DynamicPropertiesFixture.class, false).contains("extensions"));
        assertFalse(jsonPropertyNames(DynamicPropertiesFixture.class, true).contains("extensions"));
        assertTrue(jsonPropertyNames(NamedMapFixture.class, false).contains("extensions"));
        assertTrue(jsonPropertyNames(NamedMapFixture.class, true).contains("extensions"));
    }

    /** DTO 클래스를 찾을 베이스 패키지. */
    private static final String SCAN_BASE = "nuri";

    /**
     * [동결 2026-07-28] 이 게이트 신설 시점의 기존 드리프트. **방향은 감소만 허용**한다.
     * 항목을 지우려면 실제로 api-docs.json 을 재생성해 드리프트를 해소한 뒤 여기서도 지운다.
     * 새 항목을 추가하는 것은 "계약을 깨고 게이트를 넓히는" 행위이므로 사유를 커밋 메시지에 남긴다(AGENTS.md Evidence guardrails H2).
     */
    private static final Set<String> GRANDFATHERED = Set.of(
            // (신설 직후 실측으로 채운다 — 아래 assert 가 실제 잔여를 출력한다)
    );

    /** 게이트 무결성 하한 — 스캔이 조용히 0건이 되면 vacuous 통과가 되므로 차단. */
    private static final int MIN_SCHEMAS = 50;
    private static final int MIN_MATCHED_CLASSES = 20;

    @Test
    @DisplayName("🔗 DTO 필드와 api-docs.json 스키마 property 가 일치한다 (SSOT 계약체인 · 필드 레벨)")
    void dtoFieldsMatchApiDocsSchemaProperties() throws IOException {
        Map<String, Set<String>> schemas = loadSchemaProperties();
        if (schemas.size() < MIN_SCHEMAS) {
            fail("게이트 무결성 파손: api-docs.json schemas(" + schemas.size() + ")가 예상 하한("
                    + MIN_SCHEMAS + ") 미만 — 파일/파싱 파손 의심.");
        }

        Map<String, Class<?>> bySimpleName = indexClassesBySimpleName();

        Set<String> violations = new TreeSet<>();
        int matched = 0;

        for (Map.Entry<String, Set<String>> e : schemas.entrySet()) {
            String schemaName = e.getKey();
            Class<?> clazz = bySimpleName.get(schemaName);
            if (clazz == null) {
                continue; // 매칭 클래스 없음(제네릭 래퍼·인라인 스키마 등) — 자연 제외
            }
            matched++;

            Set<String> docProps = e.getValue();
            Set<String> dtoAll = jsonPropertyNames(clazz, true);   // 필드 + getter 파생
            Set<String> dtoFields = jsonPropertyNames(clazz, false); // 필드만

            for (String p : docProps) {
                if (!dtoAll.contains(p)) {
                    violations.add("MISSING_IN_DTO " + schemaName + "." + p);
                }
            }
            for (String f : dtoFields) {
                if (!docProps.contains(f)) {
                    violations.add("MISSING_IN_DOCS " + schemaName + "." + f);
                }
            }
        }

        if (matched < MIN_MATCHED_CLASSES) {
            fail("게이트 무결성 파손: api-docs 스키마와 매칭된 DTO 클래스(" + matched + ")가 예상 하한("
                    + MIN_MATCHED_CLASSES + ") 미만 — 클래스패스 스캔/이름매칭 파손 의심.");
        }

        Set<String> fresh = new TreeSet<>(violations);
        fresh.removeAll(GRANDFATHERED);

        Set<String> stale = new TreeSet<>(GRANDFATHERED);
        stale.removeAll(violations);
        if (!stale.isEmpty()) {
            // 해소된 항목이 목록에 남아 있다 — 실패시키지는 않되(개선을 막지 않는다) 눈에 띄게 알린다.
            log.warn("🔗 [API-DOCS FIELD GATE] 해소된 동결 항목 {}건이 GRANDFATHERED 에 남아 있습니다. 목록에서 지우십시오:\n  {}",
                    stale.size(), String.join("\n  ", stale));
        }

        if (!fresh.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            sb.append("🔗 [API-DOCS FIELD GATE] DTO ↔ api-docs.json 필드 드리프트 ")
              .append(fresh.size()).append("건 (동결분 제외):\n");
            fresh.forEach(v -> sb.append("  - ").append(v).append('\n'));
            sb.append("\n💡 MISSING_IN_DOCS = DTO 에 필드를 더했는데 api-docs.json 을 재생성하지 않았습니다.\n");
            sb.append("   MISSING_IN_DTO  = api-docs.json 이 이미 없는 필드를 계약으로 들고 있습니다.\n");
            sb.append("   어느 쪽이든 프론트가 stale 계약으로 동작합니다 — 백엔드를 띄워 api-docs.json 을 재생성하고\n");
            sb.append("   'pnpm -C frontend codegen:file && pnpm -C frontend codegen:zod' 로 산출물까지 갱신하십시오.\n");
            fail(sb.toString());
        }

        log.info("✅ DTO ↔ api-docs 필드 정합: 스키마 {}건 중 매칭 DTO {}건 검사, 신규 드리프트 0 (동결 {}건).",
                schemas.size(), matched, GRANDFATHERED.size());
    }

    // ---- api-docs.json components.schemas 로드 -----------------------------------------

    private Map<String, Set<String>> loadSchemaProperties() throws IOException {
        Path apiDocs = resolveApiDocs();
        JsonNode root = new ObjectMapper().readTree(HarnessSourceIndex.read(apiDocs));
        JsonNode schemas = root.path("components").path("schemas");
        if (!schemas.isObject()) {
            fail("게이트 무결성 파손: api-docs.json 에 components.schemas 가 없습니다 (" + apiDocs + ").");
            return Map.of();
        }
        Map<String, Set<String>> result = new HashMap<>();
        for (Iterator<String> it = schemas.fieldNames(); it.hasNext(); ) {
            String name = it.next();
            JsonNode props = schemas.get(name).path("properties");
            if (!props.isObject()) {
                continue; // enum·배열 등 property 없는 스키마 — 검사 대상 아님
            }
            Set<String> set = new TreeSet<>();
            props.fieldNames().forEachRemaining(set::add);
            if (!set.isEmpty()) {
                result.put(name, set);
            }
        }
        return result;
    }

    private static Path resolveApiDocs() {
        // repo root/api-docs.json (codegen 규약). cwd 가 저장소 루트 또는 api-server 일 수 있음.
        for (Path base : new Path[]{Paths.get(""), Paths.get("").toAbsolutePath().getParent()}) {
            if (base == null) continue;
            Path candidate = base.resolve("api-docs.json");
            if (Files.exists(candidate)) {
                return candidate;
            }
        }
        fail("게이트 무결성 파손: api-docs.json 을 찾을 수 없습니다 (cwd=" + Paths.get("").toAbsolutePath()
                + "). 조용한 skip 은 false-green → 실패 처리.");
        return Paths.get("api-docs.json"); // unreachable
    }

    // ---- 클래스패스 스캔 ---------------------------------------------------------------

    /** simpleName → Class. 동일 simpleName 이 둘 이상이면 모호하므로 제외(null 매핑 대신 제거). */
    private Map<String, Class<?>> indexClassesBySimpleName() {
        ClassPathScanningCandidateComponentProvider scanner =
                new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new RegexPatternTypeFilter(Pattern.compile(".*")));

        Map<String, Class<?>> index = new HashMap<>();
        Set<String> ambiguous = new HashSet<>();
        scanner.findCandidateComponents(SCAN_BASE).forEach(bd -> {
            String className = bd.getBeanClassName();
            if (className == null) return;
            try {
                Class<?> clazz = Class.forName(className, false, getClass().getClassLoader());
                String simple = clazz.getSimpleName();
                Class<?> prev = index.put(simple, clazz);
                if (prev != null && !prev.equals(clazz)) {
                    ambiguous.add(simple);
                }
            } catch (Throwable ignored) {
                // 로드 불가 클래스(선택적 의존 등) — 검사 대상 아님
            }
        });
        ambiguous.forEach(index::remove);
        return index;
    }

    // ---- DTO property 이름 산출 --------------------------------------------------------

    /**
     * 직렬화되는 property 이름 집합.
     *
     * @param includeGetters true 면 getter 파생 이름까지 포함(springdoc 은 getter 기준으로도 스키마를 만든다).
     *                       false 면 **선언 필드만** — "DTO 에 있는데 문서에 없다" 판정용.
     */
    private Set<String> jsonPropertyNames(Class<?> clazz, boolean includeGetters) {
        Set<String> names = new TreeSet<>();
        for (Class<?> c = clazz; c != null && c != Object.class; c = c.getSuperclass()) {
            for (Field f : c.getDeclaredFields()) {
                if (f.isSynthetic() || Modifier.isStatic(f.getModifiers()) || Modifier.isTransient(f.getModifiers())) {
                    continue;
                }
                // Jackson 은 필드와 접근자(getter/record accessor)의 애노테이션을 **병합**한다.
                // 필드에 @JsonIgnore 가 없어도 getter 에 있으면 직렬화되지 않는다
                // (실사례: CustomUserDetails.password — 필드 무표시, getPassword() 에 @JsonIgnore).
                if (f.isAnnotationPresent(JsonIgnore.class)
                        || f.isAnnotationPresent(JsonAnyGetter.class)
                        || isIgnoredViaAccessor(clazz, f.getName())
                        || isDynamicViaAccessor(clazz, f.getName())) {
                    continue;
                }
                JsonProperty jp = f.getAnnotation(JsonProperty.class);
                names.add(jp != null && !jp.value().isBlank() ? jp.value() : f.getName());
            }
            if (!includeGetters) {
                continue;
            }
            for (Method m : c.getDeclaredMethods()) {
                if (m.isSynthetic() || Modifier.isStatic(m.getModifiers()) || m.getParameterCount() != 0) {
                    continue;
                }
                if (m.isAnnotationPresent(JsonIgnore.class)) {
                    continue;
                }
                // @JsonAnyGetter의 Map 원소는 필드/getter 이름의 property가 아니라 응답 루트의
                // 동적 property로 펼쳐진다. 따라서 getter 이름을 OpenAPI named property로 세면 안 된다.
                if (m.isAnnotationPresent(JsonAnyGetter.class)) {
                    continue;
                }
                JsonProperty jp = m.getAnnotation(JsonProperty.class);
                if (jp != null && !jp.value().isBlank()) {
                    names.add(jp.value());
                    continue;
                }
                String n = m.getName();
                if (n.startsWith("get") && n.length() > 3) {
                    names.add(decapitalize(n.substring(3)));
                } else if (n.startsWith("is") && n.length() > 2 && isBooleanReturn(m)) {
                    names.add(decapitalize(n.substring(2)));
                } else if (isRecordAccessor(c, m)) {
                    names.add(n); // record 접근자는 이름 그대로가 property
                }
            }
        }
        return names;
    }

    /** 필드에 대응하는 접근자(getX/isX/record accessor)에 {@code @JsonIgnore} 가 붙어 있는지. */
    private static boolean isIgnoredViaAccessor(Class<?> clazz, String fieldName) {
        String cap = fieldName.isEmpty()
                ? fieldName
                : Character.toUpperCase(fieldName.charAt(0)) + fieldName.substring(1);
        for (Class<?> c = clazz; c != null && c != Object.class; c = c.getSuperclass()) {
            for (Method m : c.getDeclaredMethods()) {
                if (m.getParameterCount() != 0 || !m.isAnnotationPresent(JsonIgnore.class)) {
                    continue;
                }
                String n = m.getName();
                if (n.equals("get" + cap) || n.equals("is" + cap) || n.equals(fieldName)) {
                    return true;
                }
            }
        }
        return false;
    }

    /** 필드가 {@link JsonAnyGetter} 접근자의 backing store라면 named property가 아니다. */
    private static boolean isDynamicViaAccessor(Class<?> clazz, String fieldName) {
        String cap = fieldName.isEmpty()
                ? fieldName
                : Character.toUpperCase(fieldName.charAt(0)) + fieldName.substring(1);
        for (Class<?> c = clazz; c != null && c != Object.class; c = c.getSuperclass()) {
            for (Method m : c.getDeclaredMethods()) {
                if (m.getParameterCount() != 0 || !m.isAnnotationPresent(JsonAnyGetter.class)) {
                    continue;
                }
                String n = m.getName();
                if (n.equals("get" + cap) || n.equals(fieldName)) {
                    return true;
                }
            }
        }
        return false;
    }

    private static boolean isBooleanReturn(Method m) {
        return m.getReturnType() == boolean.class || m.getReturnType() == Boolean.class;
    }

    private static boolean isRecordAccessor(Class<?> c, Method m) {
        if (!c.isRecord()) {
            return false;
        }
        for (var rc : c.getRecordComponents()) {
            if (rc.getName().equals(m.getName())) {
                return true;
            }
        }
        return false;
    }

    private static final class DynamicPropertiesFixture {
        private final Map<String, Object> extensions = Map.of();

        @JsonAnyGetter
        public Map<String, Object> getExtensions() {
            return extensions;
        }
    }

    private static final class NamedMapFixture {
        private final Map<String, Object> extensions = Map.of();

        public Map<String, Object> getExtensions() {
            return extensions;
        }
    }

    private static String decapitalize(String s) {
        if (s.isEmpty()) {
            return s;
        }
        // Java Beans 규약: 앞 두 글자가 모두 대문자면 그대로(URL → URL)
        if (s.length() > 1 && Character.isUpperCase(s.charAt(0)) && Character.isUpperCase(s.charAt(1))) {
            return s;
        }
        return Character.toLowerCase(s.charAt(0)) + s.substring(1);
    }
}
