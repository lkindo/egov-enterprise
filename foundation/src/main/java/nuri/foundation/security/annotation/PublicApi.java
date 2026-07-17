package nuri.foundation.security.annotation;

import org.springframework.security.access.prepost.PreAuthorize;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 전체 허용(인증 불요) 인가. {@code @PreAuthorize("permitAll()")} 의 합성 메타 애노테이션.
 *
 * <p>의도적 공개 API 에 명시적으로 선언한다. 린터 예외 마커
 * {@link nuri.foundation.core.annotation.PermitAllRoute} 와 달리 이 애노테이션은 실제
 * {@code permitAll()} 인가 시맨틱을 부여한다(둘 다 SecurityAuthAnnotationLinterTest 를 통과시킨다).
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@PreAuthorize("permitAll()")
public @interface PublicApi {
}
