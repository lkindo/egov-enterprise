package nuri.foundation.core.util;

import java.util.Collection;
import java.util.Objects;
import java.util.function.Function;
import java.util.function.Supplier;

/**
 * 유효성 검사 유틸리티 클래스
 * 
 * <p>서비스 계층에서 반복되는 유효성 검사 코드를 일관된 방식으로 처리합니다.</p>
 * 
 * <h2>사용 예시:</h2>
 * <pre>{@code
 * // null 검사
 * User user = ValidationUtils.required(getUserById(id));
 * 
 * // 조건부 검사
 * ValidationUtils.isTrue(user.isActive(), "비활성 사용자입니다");
 * 
 * // 컬렉션 빈 값 검사
 * List<User> users = ValidationUtils.notEmpty(getUsers());
 * 
 * // Supplier 를 사용한 지연 평가
 * User user = ValidationUtils.required(() -> loadUser(id), "사용자를 찾을 수 없습니다");
 * }</pre>
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
        return Objects.requireNonNull(value, "값은 null 일 수 없습니다");
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
        return Objects.requireNonNull(value, message);
    }

    /**
     * Supplier 를 사용하여 지연 평가로 null 을 검증합니다.
     * 
     * @param supplier 값 공급자
     * @param message null 인 경우 표시할 메시지
     * @param <T> 객체 타입
     * @return null 이 아닌 공급된 값
     * @throws IllegalArgumentException Supplier 가 null 을 반환하는 경우
     */
    public static <T> T required(Supplier<T> supplier, String message) {
        T value = supplier.get();
        return Objects.requireNonNull(value, message);
    }

    /**
     * 객체가 null 이 아니면 반환하고, null 이면 예외를 던집니다 (함수 변환).
     * 
     * @param value 검증할 객체
     * @param mapper null 이 아닌 경우 적용할 변환 함수
     * @param <T> 입력 객체 타입
     * @param <R> 결과 객체 타입
     * @return 변환된 객체
     * @throws IllegalArgumentException 객체가 null 인 경우
     */
    public static <T, R> R required(T value, Function<T, R> mapper) {
        return mapper.apply(Objects.requireNonNull(value));
    }

    /**
     * Boolean 값이 true 인지 검증합니다.
     * 
     * @param condition 검증할 조건
     * @param message 조건이 false 인 경우 표시할 메시지
     * @throws IllegalArgumentException 조건이 false 인 경우
     */
    public static void isTrue(boolean condition, String message) {
        if (!condition) {
            throw new IllegalArgumentException(message);
        }
    }

    /**
     * Boolean 값이 false 인지 검증합니다.
     * 
     * @param condition 검증할 조건
     * @param message 조건이 true 인 경우 표시할 메시지
     * @throws IllegalArgumentException 조건이 true 인 경우
     */
    public static void isFalse(boolean condition, String message) {
        if (condition) {
            throw new IllegalArgumentException(message);
        }
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

    /**
     * 컬렉션이 null 이 아니고 비어있지 않은지 검증합니다.
     * 
     * @param collection 검증할 컬렉션
     * @param <T> 컬렉션 타입
     * @return null 이 아니고 비어있지 않은 입력 컬렉션
     * @throws IllegalArgumentException 컬렉션이 null 이거나 빈 경우
     */
    public static <T extends Collection<?>> T notEmpty(T collection) {
        if (collection == null || collection.isEmpty()) {
            throw new IllegalArgumentException("컬렉션은 null 이거나 빈 값일 수 없습니다");
        }
        return collection;
    }

    /**
     * 컬렉션이 null 이 아니고 비어있지 않은지 검증합니다 (커스텀 메시지).
     * 
     * @param collection 검증할 컬렉션
     * @param message null 이거나 빈 경우 표시할 메시지
     * @param <T> 컬렉션 타입
     * @return null 이 아니고 비어있지 않은 입력 컬렉션
     * @throws IllegalArgumentException 컬렉션이 null 이거나 빈 경우
     */
    public static <T extends Collection<?>> T notEmpty(T collection, String message) {
        if (collection == null || collection.isEmpty()) {
            throw new IllegalArgumentException(message);
        }
        return collection;
    }

    /**
     * 배열이 null 이 아니고 비어있지 않은지 검증합니다.
     * 
     * @param array 검증할 배열
     * @param <T> 배열 타입
     * @return null 이 아니고 비어있지 않은 입력 배열
     * @throws IllegalArgumentException 배열이 null 이거나 빈 경우
     */
    public static <T> T[] notEmpty(T[] array) {
        if (array == null || array.length == 0) {
            throw new IllegalArgumentException("배열은 null 이거나 빈 값일 수 없습니다");
        }
        return array;
    }

    /**
     * 숫자가 0 보다 큰지 검증합니다.
     * 
     * @param value 검증할 숫자
     * @param message 0 이하인 경우 표시할 메시지
     * @throws IllegalArgumentException 숫자가 0 이하인 경우
     */
    public static void isPositive(Number value, String message) {
        if (value == null || value.longValue() <= 0) {
            throw new IllegalArgumentException(message);
        }
    }

    /**
     * 인덱스가 범위 내인지 검증합니다.
     * 
     * @param index 검증할 인덱스
     * @param size 컬렉션/배열의 크기
     * @return 검증된 인덱스
     * @throws IllegalArgumentException 인덱스가 범위 밖인 경우
     */
    public static int validIndex(int index, int size) {
        if (index < 0 || index >= size) {
            throw new IllegalArgumentException(
                String.format("인덱스가 범위를 벗어났습니다: %d (크기: %d)", index, size));
        }
        return index;
    }
}
