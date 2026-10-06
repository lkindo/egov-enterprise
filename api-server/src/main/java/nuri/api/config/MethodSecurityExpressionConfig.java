package nuri.api.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.access.expression.method.DefaultMethodSecurityExpressionHandler;
import org.springframework.security.access.expression.method.MethodSecurityExpressionHandler;

/**
 * 메서드 보안 표현식 핸들러 — 역할 계층 없는 기본 핸들러를 등록한다.
 *
 * <p>기능 권한은 그룹 간 상속이 없다(ADR-0016). 그래서 {@code RoleHierarchy} 를 주입하지 않으며, 이 핸들러는
 * {@code @PreAuthorize("@permissionPolicy.allowed(authentication, ...)")} 의 {@code @permissionPolicy} 빈 참조를
 * 해석하는 일만 한다 — 컨테이너가 빈으로 관리하므로 {@code ApplicationContextAware} 로 bean resolver 를 받는다.
 * 인가 판정 자체는 {@code PermissionPolicy} 가 operation binding 으로 한다.
 */
@Configuration
public class MethodSecurityExpressionConfig {
    @Bean
    static MethodSecurityExpressionHandler methodSecurityExpressionHandler() {
        return new DefaultMethodSecurityExpressionHandler();
    }
}
