package nuri.foundation.security.annotation;

import org.springframework.security.access.prepost.PreAuthorize;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 관리자 또는 시스템(ADMIN/SYSTEM) 인가. {@code @PreAuthorize("hasAnyRole('ADMIN','SYSTEM')")} 의 합성 메타 애노테이션.
 *
 * <p>공유 관리 자원(소유 모델이 없는 관리 콘텐츠)의 쓰기 경로에 사용한다. 역할 리터럴을 이 애노테이션 1곳으로
 * 수렴시킨다. 값 일치 강제는 RBAC 인가 테스트가 담당한다. ({@link AdminOnly} 참조)
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@PreAuthorize("hasAnyRole('ADMIN','SYSTEM')")
public @interface AdminOrSystem {
}
