package nuri.migration.keymap;

import java.util.Locale;
import java.util.UUID;

/**
 * 표준 대리키(esntl_id 등) 생성기 — {@code prefix + 절단 UUID 대문자 hex}.
 *
 * <p>온라인 앱의 {@code IdGenerationUtil.generateId(prefix, length)}(foundation)와 같은 형식을 만든다 —
 * 접두사를 그대로 앞에 두고, UUID 를 하이픈 없는 hex 로 펼쳐 {@code length} 자리로 자른 뒤 대문자로 쓴다.
 * 알파벳은 {@code [0-9A-F]} 이고 {@code length} 는 1..32 다. migration-tool 은 실행 시 foundation 에
 * 의존하지 않으므로(DEC-OPS-005, build.gradle: "foundation 미의존 = lean") 여기서 독립 구현하고, 두 구현이
 * 같은 형식을 만드는지는 시험 범위의 계약 시험({@code StandardIdGeneratorTest})이 foundation 원본을 직접
 * 컴파일해 대조한다(DEC-OPS-306). 2026-10-13 까지는 소문자 hex 를 만들어 주석의 "동일한 형태"가 사실이 아니었다.
 *
 * <p>UUID 는 비결정적이라 레거시 키에서 재도출 불가 — 그래서 {@link KeyMapRegistry}가 레거시키→신규키 대응을
 * 반드시 영속한다.
 */
public final class StandardIdGenerator {

    /**
     * mapping 의 {@code idStrategy.generator} 는 접두사만 주므로, 접두사를 포함한 총 길이를 이 값에 맞춘다.
     * 온라인 앱의 20자 ID 호출(USR_+16, ORGNZT_+13, BBSMSTR_+12)과 같은 길이다.
     */
    static final int DEFAULT_TOTAL_LENGTH = 20;

    /** UUID 하이픈 제거 hex 의 자릿수 — {@code IdGenerationUtil.generateId} 의 length 상한과 같다. */
    static final int MAX_HEX_LENGTH = 32;

    /**
     * 온라인 앱이 쓰는 가장 짧은 hex 자릿수({@code GROUP_} + 10). 이보다 짧으면 충돌 위험이 커서 plan 이 거부한다
     * ({@code TargetStandardValidator}).
     */
    public static final int MIN_HEX_LENGTH = 10;

    private StandardIdGenerator() {
    }

    /**
     * mapping 접두사로 ID 를 만든다 — 앞뒤 공백을 걷은 접두사에 총 {@value #DEFAULT_TOTAL_LENGTH}자가 되도록
     * hex 를 붙인다(접두사가 19자를 넘으면 hex 1자).
     *
     * @throws IllegalArgumentException 접두사가 null 인 경우(온라인 앱과 같다)
     */
    public static String generate(String prefix) {
        if (prefix == null) {
            throw new IllegalArgumentException("prefix must not be null");
        }
        return generate(prefix.trim(), hexLength(prefix));
    }

    /** {@link #generate(String)} 가 접두사 뒤에 붙이는 hex 자릿수. */
    public static int hexLength(String prefix) {
        return Math.max(1, DEFAULT_TOTAL_LENGTH - prefix.trim().length());
    }

    /**
     * {@code IdGenerationUtil.generateId(prefix, length)} 와 같은 규칙으로 ID 를 만든다.
     *
     * @throws IllegalArgumentException 접두사가 null 이거나 length 가 1..32 밖인 경우
     */
    public static String generate(String prefix, int length) {
        if (prefix == null) {
            throw new IllegalArgumentException("prefix must not be null");
        }
        if (length <= 0 || length > MAX_HEX_LENGTH) {
            throw new IllegalArgumentException("length must be in range 1..32 but was " + length);
        }
        return prefix + UUID.randomUUID().toString().replace("-", "").substring(0, length)
                .toUpperCase(Locale.ROOT);
    }
}
