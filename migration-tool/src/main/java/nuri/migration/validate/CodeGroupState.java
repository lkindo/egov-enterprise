package nuri.migration.validate;

import java.util.Collections;
import java.util.Set;
import java.util.TreeSet;

/**
 * [ADR-0029 L4 D7] 대상 DB 의 공통코드 그룹 하나 — 헤더({@code tb_com_cd}) 유무와 사용 중·사용 안 함 상세코드
 * ({@code tb_com_dtl_cd}). 상세코드 값은 쓰기 전 게이트가 메모리 안에서만 쓰고, {@code toString} 으로 내지 않는다.
 */
public record CodeGroupState(boolean headerPresent, Set<String> active, Set<String> inactive) {

    private static final CodeGroupState ABSENT = new CodeGroupState(false, Set.of(), Set.of());

    public CodeGroupState {
        active = active == null ? Set.of() : Collections.unmodifiableSet(new TreeSet<>(active));
        inactive = inactive == null ? Set.of() : Collections.unmodifiableSet(new TreeSet<>(inactive));
    }

    /** 헤더가 없는 그룹. */
    public static CodeGroupState absent() {
        return ABSENT;
    }

    @Override
    public String toString() {
        return "CodeGroupState[" + (headerPresent ? "present" : "absent") + "]";
    }
}
