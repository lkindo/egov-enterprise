package nuri.foundation.security.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 로그인한 사용자 정보를 주입받기 위한 어노테이션
 * - HandlerMethodArgumentResolver에 의해 CustomUserDetails 객체가 주입됩니다.
 */
@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
public @interface LoginUser {
}
