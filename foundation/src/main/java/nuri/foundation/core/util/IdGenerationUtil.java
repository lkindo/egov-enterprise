package nuri.foundation.core.util;

import nuri.foundation.constants.Constants;
import java.util.UUID;

/**
 * 고유 ID 생성을 위한 통합 유틸리티 클래스
 *
 * <p>⚠ [주의] generateId는 랜덤 UUID(128비트)를 {@code length} hex 자리로 <b>절단</b>한다.
 * length가 작을수록 엔트로피가 급감하며(예: 10자리 = 40비트 → 약 130만건 누적 시 birthday 충돌),
 * 여기서 만든 값은 PK로 저장되지만 충돌 시 재시도 로직이 없다.
 * 대량/영속으로 엔트로피가 부족한 도메인은 DB 시퀀스 기반 무충돌 채번
 * ({@code @GeneratedValue(SEQUENCE)} 또는 nextval, 예: {@code Board.pstId})을 고려한다.
 * (구 egov {@code EgovTableIdGnrService}/{@code EgovIdGnrConfig} 는 2026-07 채번 통일로 제거됨.)
 */
public final class IdGenerationUtil {

    private IdGenerationUtil() {
        // 정적 유틸리티 — 인스턴스화 금지
    }

    /**
     * 지정된 접두사와 UUID를 조합하여 고유 ID를 생성합니다.
     *
     * @param prefix ID 접두사 (null 불가)
     * @param length UUID hex에서 추출할 길이 (1..32)
     * @return 생성된 고유 ID
     * @throws IllegalArgumentException prefix가 null이거나 length가 1..32 범위를 벗어난 경우
     */
    public static String generateId(String prefix, int length) {
        if (prefix == null) {
            throw new IllegalArgumentException("prefix must not be null");
        }
        if (length <= 0 || length > 32) {
            throw new IllegalArgumentException("length must be in range 1..32 but was " + length);
        }
        return prefix + UUID.randomUUID().toString().replace("-", "").substring(0, length).toUpperCase();
    }

    /** {@code generateUniqueId} 의 최대 재시도 횟수. 충돌 확률이 극히 낮아 소수 시도로 충분(초과 시 예외). */
    private static final int MAX_UNIQUE_RETRIES = 5;

    /**
     * 충돌하지 않는 고유 ID를 생성합니다 — {@code exists} 로 중복을 검사하며 최대 {@link #MAX_UNIQUE_RETRIES}회 재시도한다.
     *
     * <p>{@link #generateId(String, int)} 는 UUID를 {@code length} 로 <b>절단</b>하므로 엔트로피가 낮은 도메인에서
     * 이론상 birthday 충돌 위험이 있다. PK 쓰기 경로에서는 이 메서드로 리포지토리 존재검사를 넘겨 충돌을 무재현화한다.
     *
     * @param exists 후보 ID가 이미 존재하는지 검사(보통 {@code repository::existsById})
     * @throws IllegalStateException 재시도 한도 내 고유 ID 확보 실패 시(사실상 발생 불가 — 방어적)
     */
    public static String generateUniqueId(String prefix, int length, java.util.function.Predicate<String> exists) {
        if (exists == null) {
            throw new IllegalArgumentException("exists predicate must not be null");
        }
        for (int i = 0; i < MAX_UNIQUE_RETRIES; i++) {
            String candidate = generateId(prefix, length);
            if (!exists.test(candidate)) {
                return candidate;
            }
        }
        throw new IllegalStateException(
                "고유 ID 생성 실패: " + MAX_UNIQUE_RETRIES + "회 시도 내 미충돌 값 확보 불가(prefix=" + prefix + ", length=" + length + ")");
    }

    /**
     * 사용자용 고유 ID(EsntlId)를 생성합니다.
     */
    public static String generateUserId() {
        return generateId(Constants.User.USER_PREFIX, Constants.User.UUID_LENGTH);
    }

    /**
     * 일반 회원용 고유 ID(EsntlId)를 생성합니다.
     */
    public static String generateMberId() {
        return generateId(Constants.User.MBER_PREFIX, Constants.User.ESNTL_ID_UUID_LENGTH);
    }


    /**
     * SMS 발송용 고유 ID를 생성합니다.
     */
    public static String generateSmsId() {
        return generateId(Constants.User.SMS_PREFIX, Constants.User.ESNTL_ID_UUID_LENGTH);
    }
}
