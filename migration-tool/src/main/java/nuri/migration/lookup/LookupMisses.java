package nuri.migration.lookup;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 표 하나에서 {@code at_most_one} 조회의 짝 없는 행 수(ADR-0029 L3d). 실행마다 표 전체를 다시 읽으므로 끝까지 적재한
 * 실행의 집계가 곧 표 집계다 — 이미 커밋된 행도 checkpoint 대조를 위해 다시 조회하며 함께 센다. 값은 담지 않는다.
 */
public final class LookupMisses {

    private final Map<String, Long> counts = new LinkedHashMap<>();

    /**
     * 짝 없는 행 하나를 센다. 상한을 넘으면 세지 않고 false 를 돌려준다 — 집계는 상한을 넘지 않는다.
     *
     * @param alias      조회 별칭
     * @param maxMissing 표 전체에서 받는 짝 없는 행 수
     */
    public boolean add(String alias, long maxMissing) {
        long next = counts.getOrDefault(alias, 0L) + 1;
        if (next > maxMissing) {
            return false;
        }
        counts.put(alias, next);
        return true;
    }

    /** 별칭마다 센 수(처음 센 순서). 짝 없는 행이 없던 별칭은 없다. */
    public Map<String, Long> counts() {
        return Collections.unmodifiableMap(new LinkedHashMap<>(counts));
    }
}
