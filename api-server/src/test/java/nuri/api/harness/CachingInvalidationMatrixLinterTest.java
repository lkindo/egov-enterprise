package nuri.api.harness;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.RegexPatternTypeFilter;

import java.lang.reflect.Method;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.fail;

/**
 * 🧊 캐시 무효화 매트릭스 린터 — 횡단관심사 §2.C 의 **마지막 무게이트 영역**(캐싱) 봉합.
 *
 * <p>[근거] {@code docs/03-guides/cross-cutting-conventions.md} 요약표에서 6개 횡단관심사 중 <b>캐싱만
 * 집행 게이트가 0</b> 이었다. 그 공백에서 실제 결함이 살고 있었다 — {@code InstitutionCodeService} 에
 * {@code @CacheEvict("institutionCodes")} 가 있는데 그 이름을 <b>채우는 @Cacheable 이 저장소 어디에도
 * 없었다</b>. Caffeine 은 캐시 이름을 동적 생성하므로 이 애노테이션은 조용히 아무것도 하지 않으면서
 * "무효화하고 있다"는 거짓 안전감만 준다.
 *
 * <p>[왜 테스트로 못 잡는가] {@code CacheConfig} 가 {@code @Profile("!test")} 라 <b>테스트에서는 캐싱이
 * 아예 꺼져 있다.</b> 따라서 어떤 단위/통합 테스트도 캐시 배선 오류를 검출할 수 없다. 정적 게이트만이
 * 이 계열을 막는다.
 *
 * <p>[규칙 — 양방향 매트릭스]
 * <ul>
 *   <li><b>NO_EVICT</b>: {@code @Cacheable}/{@code @CachePut} 로 채우는데 {@code @CacheEvict} 가 없다
 *       → 쓰기 후에도 옛 값이 남는 <b>영구 stale</b>. (TTL 만으로 충분한 캐시는 {@link #TTL_ONLY_CACHES} 에 사유와 함께 등재)</li>
 *   <li><b>DEAD_EVICT</b>: {@code @CacheEvict} 하는데 그 이름을 채우는 곳이 없다 → 오타이거나 잔재.
 *       무효화가 <b>조용히 실패</b>하므로 증상은 "가끔 옛 데이터가 보인다" 로만 나타난다.</li>
 * </ul>
 *
 * <p>이 매트릭스는 캐시명 상수화 없이도 오타를 잡는다 — 오타난 이름은 한쪽 집합에만 나타나기 때문이다.
 * (상수화는 44개 애노테이션의 일괄 치환이라 AGENTS.md Evidence guardrails H4상 별도 판단 사항으로 남긴다.)
 *
 * <p>Spring 컨텍스트를 띄우지 않는 순수 정적 테스트(클래스패스 리플렉션).
 * pre-push 의 {@code :api-server:harnessTest} 로 기계강제된다.
 */
@Tag("governance-harness")
class CachingInvalidationMatrixLinterTest {

    private static final Logger log = LoggerFactory.getLogger(CachingInvalidationMatrixLinterTest.class);

    private static final String SCAN_BASE = "nuri";

    /**
     * [동결 2026-07-28] TTL 만으로 충분해 명시적 무효화를 두지 않는 캐시. **현재 없음.**
     * 추가하려면 "왜 stale 을 허용해도 되는가"를 사유로 남긴다 — 이 목록은 곧 "옛 값을 봐도 된다"는 선언이다(AGENTS.md Evidence guardrails H2).
     */
    private static final Set<String> TTL_ONLY_CACHES = Set.of();

    /** 게이트 무결성 하한 — 스캔이 조용히 0건이면 vacuous 통과가 되므로 차단. */
    private static final int MIN_CACHE_METHODS = 10;

    @Test
    @DisplayName("🧊 캐시는 채우는 곳과 지우는 곳이 짝을 이룬다 (횡단관심사 §2.C · 캐싱)")
    void cachePopulationAndEvictionAreSymmetric() {
        Map<String, Set<String>> populated = new TreeMap<>();
        Map<String, Set<String>> evicted = new TreeMap<>();
        int annotatedMethods = 0;

        ClassPathScanningCandidateComponentProvider scanner =
                new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new RegexPatternTypeFilter(Pattern.compile(".*")));

        for (var bd : scanner.findCandidateComponents(SCAN_BASE)) {
            String className = bd.getBeanClassName();
            if (className == null) continue;
            Class<?> clazz;
            try {
                clazz = Class.forName(className, false, getClass().getClassLoader());
            } catch (Throwable ignored) {
                continue; // 로드 불가 클래스 — 검사 대상 아님
            }
            Method[] methods;
            try {
                methods = clazz.getDeclaredMethods();
            } catch (Throwable ignored) {
                continue;
            }
            for (Method m : methods) {
                boolean touched = false;
                for (Cacheable a : collectCacheable(m)) {
                    record(populated, names(a.cacheNames(), a.value()), clazz, m);
                    touched = true;
                }
                for (CachePut a : collectCachePut(m)) {
                    record(populated, names(a.cacheNames(), a.value()), clazz, m);
                    touched = true;
                }
                for (CacheEvict a : collectCacheEvict(m)) {
                    record(evicted, names(a.cacheNames(), a.value()), clazz, m);
                    touched = true;
                }
                if (touched) annotatedMethods++;
            }
        }

        if (annotatedMethods < MIN_CACHE_METHODS) {
            fail("게이트 무결성 파손: 캐시 애노테이션 메서드(" + annotatedMethods + ")가 예상 하한("
                    + MIN_CACHE_METHODS + ") 미만 — 클래스패스 스캔 파손 의심. 조용한 skip 은 false-green.");
        }

        Set<String> noEvict = new TreeSet<>(populated.keySet());
        noEvict.removeAll(evicted.keySet());
        noEvict.removeAll(TTL_ONLY_CACHES);

        Set<String> deadEvict = new TreeSet<>(evicted.keySet());
        deadEvict.removeAll(populated.keySet());

        if (!noEvict.isEmpty() || !deadEvict.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            sb.append("🧊 [CACHE MATRIX] 캐시 채움↔무효화 짝이 맞지 않습니다:\n");
            for (String c : noEvict) {
                sb.append("  - NO_EVICT   '").append(c).append("' — 채우는 곳 ")
                  .append(populated.get(c)).append(" / 지우는 곳 없음 → 쓰기 후에도 옛 값이 남습니다.\n");
            }
            for (String c : deadEvict) {
                sb.append("  - DEAD_EVICT '").append(c).append("' — 지우는 곳 ")
                  .append(evicted.get(c)).append(" / 채우는 곳 없음 → 이 무효화는 아무것도 하지 않습니다.\n");
            }
            sb.append("\n💡 DEAD_EVICT 는 오타이거나 캐싱 제거 후 남은 잔재입니다. Caffeine 은 캐시명을 동적\n");
            sb.append("   생성하므로 예외 없이 조용히 통과하며, 증상은 '가끔 옛 데이터가 보인다' 로만 나타납니다.\n");
            sb.append("   TTL 만으로 충분한 캐시라면 TTL_ONLY_CACHES 에 **사유와 함께** 등재하십시오.\n");
            fail(sb.toString());
        }

        log.info("✅ 캐시 무효화 매트릭스 정합: 캐시 {}종, 애노테이션 메서드 {}건, 불일치 0 (TTL 전용 {}종).",
                populated.size(), annotatedMethods, TTL_ONLY_CACHES.size());
    }

    // ---- 수집 유틸 ---------------------------------------------------------------------

    private static void record(Map<String, Set<String>> sink, Set<String> cacheNames, Class<?> clazz, Method m) {
        for (String n : cacheNames) {
            sink.computeIfAbsent(n, k -> new TreeSet<>()).add(clazz.getSimpleName() + "." + m.getName());
        }
    }

    /** cacheNames() 우선, 비어 있으면 value(). 둘 다 비면 빈 집합(기본 캐시명 추론은 쓰지 않는 관례). */
    private static Set<String> names(String[] cacheNames, String[] value) {
        Set<String> out = new HashSet<>();
        for (String s : cacheNames.length > 0 ? cacheNames : value) {
            if (s != null && !s.isBlank()) {
                out.add(s);
            }
        }
        return out;
    }

    // @Caching 으로 묶인 경우까지 훑는다 — 저장소에 실제 사용례가 있다.
    private static Cacheable[] collectCacheable(Method m) {
        Caching c = m.getAnnotation(Caching.class);
        Cacheable single = m.getAnnotation(Cacheable.class);
        if (c == null) return single != null ? new Cacheable[]{single} : new Cacheable[0];
        return merge(single, c.cacheable(), Cacheable[]::new);
    }

    private static CachePut[] collectCachePut(Method m) {
        Caching c = m.getAnnotation(Caching.class);
        CachePut single = m.getAnnotation(CachePut.class);
        if (c == null) return single != null ? new CachePut[]{single} : new CachePut[0];
        return merge(single, c.put(), CachePut[]::new);
    }

    private static CacheEvict[] collectCacheEvict(Method m) {
        Caching c = m.getAnnotation(Caching.class);
        CacheEvict single = m.getAnnotation(CacheEvict.class);
        if (c == null) return single != null ? new CacheEvict[]{single} : new CacheEvict[0];
        return merge(single, c.evict(), CacheEvict[]::new);
    }

    private static <T> T[] merge(T single, T[] grouped, java.util.function.IntFunction<T[]> factory) {
        T[] out = factory.apply(grouped.length + (single != null ? 1 : 0));
        System.arraycopy(grouped, 0, out, 0, grouped.length);
        if (single != null) {
            out[grouped.length] = single;
        }
        return out;
    }
}
