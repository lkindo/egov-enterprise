package nuri.foundation.core.util;

/**
 * 유효성 검사 유틸리티 클래스
 *
 * <p>서비스 계층에서 반복되는 유효성 검사 코드를 일관된 방식으로 처리합니다.
 * 서비스는 {@code BaseAbstractService} 의 {@code required}·{@code notBlank} 를 통해 쓴다.</p>
 *
 * <h2>사용 예시:</h2>
 * <pre>{@code
 * // null 검사
 * User user = ValidationUtils.required(getUserById(id));
 *
 * // 빈 문자열 검사
 * String name = ValidationUtils.notBlank(request.name(), "이름은 필수입니다");
 * }</pre>
 *
 * <p>[2026-10-07] 호출자가 없던 {@code required(Supplier,String)}·{@code isTrue}·{@code isFalse}·
 * {@code notEmpty} 를 걷었다. 그 유일한 소비자였던 {@code BaseAbstractService} 래퍼가 먼저 사라졌다.</p>
 *
 * @author eGov Enterprise Modernization Team
 * @since 2026-04-01
 */
public final class ValidationUtils {

    private ValidationUtils() {
        // 인스턴스화 방지
    }

    /**
     * 객체가 null 이 아닌지 검증합니다.
     *
     * @param value 검증할 객체
     * @param <T> 객체 타입
     * @return null 이 아닌 입력 객체
     * @throws IllegalArgumentException 객체가 null 인 경우
     */
    public static <T> T required(T value) {
        if (value == null) {
            throw new IllegalArgumentException("값은 null 일 수 없습니다");
        }
        return value;
    }

    /**
     * 객체가 null 이 아닌지 검증합니다 (커스텀 메시지).
     *
     * @param value 검증할 객체
     * @param message null 인 경우 표시할 메시지
     * @param <T> 객체 타입
     * @return null 이 아닌 입력 객체
     * @throws IllegalArgumentException 객체가 null 인 경우
     */
    public static <T> T required(T value, String message) {
        if (value == null) {
            throw new IllegalArgumentException(message);
        }
        return value;
    }

    /**
     * 객체가 null 이거나 빈 문자열인지 검증합니다.
     *
     * @param value 검증할 문자열
     * @return null 이 아니고 빈 문자열이 아닌 입력 문자열
     * @throws IllegalArgumentException 문자열이 null 이거나 빈 경우
     */
    public static String notBlank(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("문자열은 null 이거나 빈 값일 수 없습니다");
        }
        return value;
    }

    /**
     * 객체가 null 이거나 빈 문자열인지 검증합니다 (커스텀 메시지).
     *
     * @param value 검증할 문자열
     * @param message null 이거나 빈 경우 표시할 메시지
     * @return null 이 아니고 빈 문자열이 아닌 입력 문자열
     * @throws IllegalArgumentException 문자열이 null 이거나 빈 경우
     */
    public static String notBlank(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(message);
        }
        return value;
    }
}
