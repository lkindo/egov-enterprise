package nuri.business.core.softdelete;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Hibernate Soft Delete 필터를 일시적으로 비활성화하여
 * 삭제된 데이터(use_yn = 'N')를 포함한 모든 정보를 조회할 수 있게 합니다.
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface DisableSoftDelete {
}
