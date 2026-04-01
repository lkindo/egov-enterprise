package com.company.project.foundation.core.service;

import com.company.project.foundation.core.util.ValidationUtils;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.function.Function;
import java.util.function.Supplier;

/**
 * 서비스 계층을 위한 추상 클래스
 * 
 * <p>
 * 모든 서비스 클래스가 공통으로 사용하는 유틸리티 메서드를 제공합니다.
 * </p>
 * 
 * <h2>주요 기능:</h2>
 * <ul>
 * <li>/null 검증 메서드 (ValidationUtils 위임)</li>
 * <li>페이지네이션 유틸리티</li>
 * <li>변환 함수 적용</li>
 * <li>지연 평가 지원</li>
 * </ul>
 * 
 * <h2>사용 예시:</h2>
 * 
 * <pre>{@code
 * @Service
 * public class UserService extends BaseAbstractService {
 * 
 *     public UserDto getUser(String id) {
 *         User user = required(() -> userRepository.findById(id), "사용자를 찾을 수 없습니다");
 *         return toDto(user, UserDto::from);
 *     }
 * 
 *     public Page<UserDto> getUsers(Pageable pageable) {
 *         return toPage(userRepository.findAll(pageable), UserDto::from);
 *     }
 * }
 * }</pre>
 * 
 * @author eGov Enterprise Modernization Team
 * @since 2026-04-01
 */
public abstract class BaseAbstractService extends EgovAbstractServiceImpl {

    /**
     * 객체가 null 이 아닌지 검증합니다.
     * 
     * @param value 검증할 객체
     * @param <T>   객체 타입
     * @return null 이 아닌 입력 객체
     * @throws IllegalArgumentException 객체가 null 인 경우
     */
    protected final <T> T required(T value) {
        return ValidationUtils.required(value);
    }

    /**
     * 객체가 null 이 아닌지 검증합니다 (커스텀 메시지).
     * 
     * @param value   검증할 객체
     * @param message null 인 경우 표시할 메시지
     * @param <T>     객체 타입
     * @return null 이 아닌 입력 객체
     * @throws IllegalArgumentException 객체가 null 인 경우
     */
    protected final <T> T required(T value, String message) {
        return ValidationUtils.required(value, message);
    }

    /**
     * Supplier 를 사용하여 지연 평가로 null 을 검증합니다.
     * 
     * @param supplier 값 공급자
     * @param message  null 인 경우 표시할 메시지
     * @param <T>      객체 타입
     * @return null 이 아닌 공급된 값
     * @throws IllegalArgumentException Supplier 가 null 을 반환하는 경우
     */
    protected final <T> T required(Supplier<T> supplier, String message) {
        return ValidationUtils.required(supplier, message);
    }

    /**
     * Boolean 값이 true 인지 검증합니다.
     * 
     * @param condition 검증할 조건
     * @param message   조건이 false 인 경우 표시할 메시지
     * @throws IllegalArgumentException 조건이 false 인 경우
     */
    protected final void isTrue(boolean condition, String message) {
        ValidationUtils.isTrue(condition, message);
    }

    /**
     * Boolean 값이 false 인지 검증합니다.
     * 
     * @param condition 검증할 조건
     * @param message   조건이 true 인 경우 표시할 메시지
     * @throws IllegalArgumentException 조건이 true 인 경우
     */
    protected final void isFalse(boolean condition, String message) {
        ValidationUtils.isFalse(condition, message);
    }

    /**
     * 문자열이 null 이거나 빈 값인지 검증합니다.
     * 
     * @param value 검증할 문자열
     * @return null 이 아니고 빈 문자열이 아닌 입력 문자열
     * @throws IllegalArgumentException 문자열이 null 이거나 빈 경우
     */
    protected final String notBlank(String value) {
        return ValidationUtils.notBlank(value);
    }

    /**
     * 문자열이 null 이거나 빈 값인지 검증합니다 (커스텀 메시지).
     * 
     * @param value   검증할 문자열
     * @param message null 이거나 빈 경우 표시할 메시지
     * @return null 이 아니고 빈 문자열이 아닌 입력 문자열
     * @throws IllegalArgumentException 문자열이 null 이거나 빈 경우
     */
    protected final String notBlank(String value, String message) {
        return ValidationUtils.notBlank(value, message);
    }

    /**
     * 컬렉션이 null 이 아니고 비어있지 않은지 검증합니다.
     * 
     * @param collection 검증할 컬렉션
     * @param <T>        컬렉션 타입
     * @return null 이 아니고 비어있지 않은 입력 컬렉션
     * @throws IllegalArgumentException 컬렉션이 null 이거나 빈 경우
     */
    protected final <T extends Collection<?>> T notEmpty(T collection) {
        return ValidationUtils.notEmpty(collection);
    }

    /**
     * 컬렉션이 null 이 아니고 비어있지 않은지 검증합니다 (커스텀 메시지).
     * 
     * @param collection 검증할 컬렉션
     * @param message    null 이거나 빈 경우 표시할 메시지
     * @param <T>        컬렉션 타입
     * @return null 이 아니고 비어있지 않은 입력 컬렉션
     * @throws IllegalArgumentException 컬렉션이 null 이거나 빈 경우
     */
    protected final <T extends Collection<?>> T notEmpty(T collection, String message) {
        return ValidationUtils.notEmpty(collection, message);
    }

    /**
     * Entity 를 DTO 로 변환합니다.
     * 
     * @param entity 변환할 엔티티
     * @param mapper 엔티티를 DTO 로 변환하는 함수
     * @param <E>    엔티티 타입
     * @param <D>    DTO 타입
     * @return 변환된 DTO
     */
    protected final <E, D> D toDto(E entity, Function<E, D> mapper) {
        return mapper.apply(required(entity, "엔티티는 null 일 수 없습니다"));
    }

    /**
     * Entity 리스트를 DTO 리스트로 변환합니다.
     * 
     * @param entities 변환할 엔티티 리스트
     * @param mapper   엔티티를 DTO 로 변환하는 함수
     * @param <E>      엔티티 타입
     * @param <D>      DTO 타입
     * @return 변환된 DTO 리스트 (엔티티가 null 이면 빈 리스트)
     */
    protected final <E, D> List<D> toDtoList(List<E> entities, Function<E, D> mapper) {
        if (entities == null || entities.isEmpty()) {
            return Collections.emptyList();
        }
        return entities.stream()
                .map(entity -> toDto(entity, mapper))
                .toList();
    }

    /**
     * Entity Page 를 DTO Page 로 변환합니다.
     *
     * @param entities 변환할 엔티티 페이지
     * @param mapper   엔티티를 DTO 로 변환하는 함수
     * @param <E>      엔티티 타입
     * @param <D>      DTO 타입
     * @return 변환된 DTO 페이지
     */
    protected final <E, D> Page<D> toPage(Page<E> entities, Function<E, D> mapper) {
        if (entities == null) {
            throw new IllegalArgumentException("엔티티 페이지는 null 일 수 없습니다");
        }
        List<D> content = entities.getContent().stream()
                .map(mapper)
                .toList();
        return new PageImpl<>(content, entities.getPageable(), entities.getTotalElements());
    }

    /**
     * Entity 리스트를 DTO Page 로 변환합니다.
     * 
     * @param entities 변환할 엔티티 리스트
     * @param pageable 페이지네이션 정보
     * @param total    전체 요소 수
     * @param mapper   엔티티를 DTO 로 변환하는 함수
     * @param <E>      엔티티 타입
     * @param <D>      DTO 타입
     * @return 변환된 DTO 페이지
     */
    protected final <E, D> Page<D> toPage(List<E> entities, Pageable pageable, long total, Function<E, D> mapper) {
        List<D> content = toDtoList(required(entities, "엔티티 리스트는 null 일 수 없습니다"), mapper);
        return new PageImpl<>(content, pageable, total);
    }

    /**
     * 값이 있으면 적용하고, 없으면 기본값을 반환합니다.
     * 
     * @param value        검증할 값
     * @param defaultValue 기본값
     * @param <T>          값 타입
     * @return null 이 아니면 입력 값, null 이면 기본값
     */
    protected final <T> T defaultIfNull(T value, T defaultValue) {
        return value != null ? value : defaultValue;
    }

    /**
     * 문자열이 null 이거나 비어있으면 기본값을 반환합니다.
     * 
     * @param value        검증할 문자열
     * @param defaultValue 기본값
     * @return null 이 아니고 빈 문자열이 아니면 입력 값, 아니면 기본값
     */
    protected final String defaultIfBlank(String value, String defaultValue) {
        return (value != null && !value.isBlank()) ? value : defaultValue;
    }

    /**
     * 예외를 안전하게 래핑하여 재던집니다.
     * 
     * @param runnable          실행할 작업
     * @param exceptionSupplier 예외 생성 공급자
     * @param <E>               예외 타입
     * @throws E 작업 실행 중 발생한 예외
     */
    protected final <E extends Exception> void wrapException(Runnable runnable, Supplier<E> exceptionSupplier)
            throws E {
        try {
            runnable.run();
        } catch (Exception e) {
            throw exceptionSupplier.get();
        }
    }

    /**
     * 예외를 안전하게 래핑하여 재던집니다 (함수 버전).
     * 
     * @param supplier          실행할 작업
     * @param exceptionSupplier 예외 생성 공급자
     * @param <T>               반환 타입
     * @param <E>               예외 타입
     * @return 작업 결과
     * @throws E 작업 실행 중 발생한 예외
     */
    protected final <T, E extends Exception> T wrapException(Supplier<T> supplier, Supplier<E> exceptionSupplier)
            throws E {
        try {
            return supplier.get();
        } catch (Exception e) {
            throw exceptionSupplier.get();
        }
    }
}
