package nuri.migration.keymap;

import java.util.UUID;

/**
 * 표준 대리키(esntl_id 등) 생성기 — {@code prefix + 절단 UUID}.
 *
 * <p>프레임워크 표준 {@code IdGenerationUtil}(foundation)과 동일한 형태를 재현한다. migration-tool 은
 * 코어 재사용성을 위해 foundation 에 의존하지 않으므로(build.gradle: "foundation 미의존 = lean") 여기서
 * 독립 구현한다. UUID 는 비결정적이라 레거시 키에서 재도출 불가 — 그래서 {@link KeyMapRegistry}가
 * 레거시키→신규키 대응을 반드시 영속한다.
 */
public final class StandardIdGenerator {

    /** 표준 esntl_id 총 길이(prefix 포함) 상한. */
    private static final int MAX_LEN = 20;

    private StandardIdGenerator() {
    }

    public static String generate(String prefix) {
        String p = prefix == null ? "" : prefix.trim();
        String hex = UUID.randomUUID().toString().replace("-", "");
        int take = Math.max(1, MAX_LEN - p.length());
        return p + hex.substring(0, Math.min(take, hex.length()));
    }
}
