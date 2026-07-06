package nuri.foundation.core.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 🔐 Spring Security API 권한 제어 유실 방지 하네스(SecurityAuthAnnotationLinterTest)의 예외를 허용하는 커스텀 어노테이션
 * - 이 어노테이션이 선언된 엔드포인트는 권한 어노테이션(@PreAuthorize 등) 누락 감지 대상에서 합법적으로 제외됩니다.
 * - 의도적으로 전체 허용(public)하는 API 라우트 및 컨트롤러 클래스에 선언하십시오.
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface PermitAllRoute {
}
