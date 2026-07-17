package nuri.foundation.security.annotation;

import org.springframework.security.access.prepost.PreAuthorize;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 인증된 사용자만 허용. {@code @PreAuthorize("isAuthenticated()")} 의 합성 메타 애노테이션.
 * 역할과 무관하나 인가 애노테이션 명명 일관성을 위해 함께 제공한다. ({@link AdminOnly} 참조)
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@PreAuthorize("isAuthenticated()")
public @interface Authenticated {
}
