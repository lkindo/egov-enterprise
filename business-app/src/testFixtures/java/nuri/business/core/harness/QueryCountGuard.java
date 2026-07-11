package nuri.business.core.harness;

import org.junit.jupiter.api.extension.ExtendWith;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * JPA N+1 방벽 및 SQL 성능 세이프가드 애노테이션 (테스트용 피스처)
 * 이 애노테이션이 붙은 테스트 메소드/클래스는 허용된 쿼리 개수 초과 시 테스트가 자동 실패합니다.
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@ExtendWith(QueryCountGuardExtension.class)
public @interface QueryCountGuard {
    /**
     * 허용 가능한 최대 SQL 실행 쿼리 횟수 (기본값: 10회)
     */
    int max() default 10;
}
