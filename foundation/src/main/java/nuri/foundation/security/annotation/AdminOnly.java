package nuri.foundation.security.annotation;

import org.springframework.security.access.prepost.PreAuthorize;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 관리자(ADMIN) 전용 인가. {@code @PreAuthorize("hasRole('ADMIN')")} 의 합성 메타 애노테이션.
 *
 * <p>흩어져 있던 역할 리터럴({@code 'ADMIN'})을 단일 지점(이 애노테이션)으로 수렴시켜
 * 하드코딩 드리프트를 방지한다. 향후 관리자 역할 규약이 바뀌면 이 애노테이션의 SpEL 1곳만 고치면 된다.
 *
 * <p>주의: SpEL 은 문자열 리터럴이라 {@link nuri.foundation.security.constants.SecurityConstants}
 * 등 Java 상수를 직접 참조할 수 없다. 값 자체는 여전히 리터럴이므로, URL 시큐리티 상수와의 값 일치는
 * RBAC 인가 테스트가 계속 담당한다. (역할↔권한 값 매핑: {@code AuthorityConstants})
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@PreAuthorize("hasRole('ADMIN')")
public @interface AdminOnly {
}
