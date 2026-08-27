package nuri.foundation.security.annotation;

import org.springframework.security.access.prepost.PreAuthorize;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 개인정보 증적 열람 전용 인가 — 관리자(ADMIN)만 허용하고 <b>최상위 SYSTEM 롤도 배제</b>한다.
 * {@code @PreAuthorize("hasRole('ADMIN') and !hasRole('SYSTEM')")} 의 합성 메타 애노테이션.
 *
 * <p><b>왜 {@link AdminOnly} 로는 부족한가.</b> 이 저장소는 DB({@code tb_role_hierarchy})에서 읽은
 * 역할 계층 {@code ROLE_SYSTEM > ROLE_ADMIN > ROLE_USER} 를 <b>메서드 인가에도</b> 주입한다
 * ({@code RoleHierarchyConfig#methodSecurityExpressionHandler}). 그래서 {@code hasRole('ADMIN')} 은
 * SYSTEM 보유자도 통과시킨다 — {@code @AdminOnly} 와 {@code @AdminOrSystem} 은 SYSTEM 에 대해
 * <b>결과가 같다</b>. 계층은 위에서 아래로만 상속되므로 {@code !hasRole('SYSTEM')} 은
 * ADMIN 보유자를 막지 않으면서 SYSTEM 보유자만 걸러낸다.
 *
 * <p><b>왜 배제하는가.</b> 개인정보 접근 로그는 "누가 개인정보를 열람했는가" 의 증적이다.
 * 증적을 볼 수 있는 범위가 넓어질수록 감사 기능 자체가 약해지므로, 인프라 운영 권한(SYSTEM)과
 * 개인정보 열람 권한(ADMIN)을 분리한다(직무 분리). 개인정보의 안전성 확보조치 기준 제8조가
 * 요구하는 접속기록의 목적이 이것이다.
 *
 * <p>일반 관리 기능에는 쓰지 않는다. 최상위 롤을 배제하는 것은 예외적 조치이며,
 * 개인정보 증적처럼 <b>열람 자체가 통제 대상</b>인 자원에만 붙인다.
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@PreAuthorize("hasRole('ADMIN') and !hasRole('SYSTEM')")
public @interface PrivacyAdminOnly {
}
