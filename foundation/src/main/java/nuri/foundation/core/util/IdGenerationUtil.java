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

    /** 감사 요청 ID 총 길이 — {@code tb_sys_log.dmnd_id}·{@code tb_privacy_log.dmnd_id} 컬럼 폭과 같다. */
    public static final int AUDIT_REQUEST_ID_LENGTH = 20;

    /** 시각부(epoch millis 10진) 자릿수. 서기 2286년까지 13자리를 넘지 않는다. */
    private static final int AUDIT_TIME_DIGITS = 13;

    /** 무작위부 자릿수 — base36 7자리 = 약 7.8e10 조합/ms. */
    private static final int AUDIT_RANDOM_DIGITS = AUDIT_REQUEST_ID_LENGTH - AUDIT_TIME_DIGITS;

    private static final long AUDIT_RANDOM_BOUND = 78_364_164_096L; // 36^7

    private static final java.security.SecureRandom AUDIT_RANDOM = new java.security.SecureRandom();

    /**
     * 감사 로그의 요청 ID를 생성한다 — 정확히 {@value #AUDIT_REQUEST_ID_LENGTH}자.
     *
     * <p>{@code tb_sys_log.dmnd_id}와 {@code tb_privacy_log.dmnd_id}는 <b>UNIQUE</b>이고 폭이
     * varchar(20)이다. 따라서 이 값은 폭을 넘지 않으면서 충돌하지 않아야 한다.
     *
     * <p>앞 13자리는 epoch millis라 <b>시간 순으로 정렬</b>된다 — 인덱스 없는 로그 테이블에서
     * 요청 ID만으로 대략의 시각을 읽을 수 있고, B-tree 삽입도 끝에 몰려 단편화가 적다.
     * 뒤 7자리는 {@link java.security.SecureRandom} base36이라 같은 밀리초 안에서만 경쟁한다.
     *
     * <p>충돌은 최종적으로 DB UNIQUE 제약이 막는다. 감사 적재는 best-effort 경로이므로
     * 재시도 대신 리스너가 실패를 세고 넘어간다 — 요청 처리를 막지 않는 것이 우선이다.
     */
    public static String generateAuditRequestId() {
        long millis = System.currentTimeMillis();
        String time = Long.toString(millis);
        if (time.length() > AUDIT_TIME_DIGITS) {
            // 서기 2286년 이후 — 폭 초과로 INSERT 가 죽지 않도록 하위 13자리만 쓴다(순서성만 잃는다).
            time = time.substring(time.length() - AUDIT_TIME_DIGITS);
        } else if (time.length() < AUDIT_TIME_DIGITS) {
            time = "0".repeat(AUDIT_TIME_DIGITS - time.length()) + time;
        }
        String random = Long.toString(Math.floorMod(AUDIT_RANDOM.nextLong(), AUDIT_RANDOM_BOUND), 36);
        if (random.length() < AUDIT_RANDOM_DIGITS) {
            random = "0".repeat(AUDIT_RANDOM_DIGITS - random.length()) + random;
        }
        return time + random.toUpperCase();
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
}
