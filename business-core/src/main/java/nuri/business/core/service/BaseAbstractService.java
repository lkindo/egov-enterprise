package nuri.business.core.service;

import nuri.foundation.core.util.ValidationUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.List;

import java.util.function.Function;

/**
 * 서비스 계층을 위한 추상 클래스
 * 
 * <p>
 * 모든 서비스 클래스가 공통으로 사용하는 유틸리티 메서드를 제공합니다.
 * </p>
 * 
 * <h2>주요 기능:</h2>
 * <ul>
 * <li>null·빈 문자열 검증 가드 ({@code required}·{@code notBlank}, ValidationUtils 위임)</li>
 * <li>엔티티 페이지를 DTO 페이지로 바꾸는 {@code toPage}</li>
 * </ul>
 * 
 * <p>[2026-10-07] 호출자가 없던 편의 메서드(Supplier 판 required·isTrue/isFalse·notEmpty·toDto·toDtoList·
 * defaultIf*·원인 예외를 버리던 wrapException)는 걷었다. getting-started §5 가 안내하는 세 가드만 남긴다.</p>
 * 
 * <h2>사용 예시:</h2>
 * 
 * <pre>{@code
 * @Service
 * public class UserService extends BaseAbstractService {
 * 
 *     public UserDto getUser(String id) {
 *         User user = userRepository.findById(required(id, "id 는 null 일 수 없습니다"))
 *                 .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
 *         return UserDto.from(user);
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
public abstract class BaseAbstractService {

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
        List<D> content = required(entities, "엔티티 리스트는 null 일 수 없습니다").stream()
                .map(entity -> mapper.apply(required(entity, "엔티티는 null 일 수 없습니다")))
                .toList();
        return new PageImpl<>(content, pageable, total);
    }
}
