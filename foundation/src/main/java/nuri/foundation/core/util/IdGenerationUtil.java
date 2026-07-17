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
    /**
     * 메일 발송용 고유 ID를 생성합니다.
     */
    public static String generateMailId() {
        return generateId(Constants.User.MAIL_PREFIX, Constants.User.ESNTL_ID_UUID_LENGTH);
    }
}
