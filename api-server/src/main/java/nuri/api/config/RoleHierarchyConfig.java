package nuri.api.config;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.expression.method.DefaultMethodSecurityExpressionHandler;
import org.springframework.security.access.expression.method.MethodSecurityExpressionHandler;
import org.springframework.security.access.hierarchicalroles.RoleHierarchy;

/**
 * DB 소싱 역할 계층({@link RoleHierarchy})을 웹/메서드 인가에 배선한다.
 *
 * <ul>
 *   <li><b>웹 인가</b>: {@code RoleHierarchy} 빈이 존재하면 {@code authorizeHttpRequests} 가 자동 사용
 *       (Spring Security 6.3+).</li>
 *   <li><b>메서드 인가</b>: {@code MethodSecurityExpressionHandler} 에 계층을 주입해
 *       {@code @PreAuthorize("hasRole('ADMIN')")} 등이 계층을 반영하게 한다.
 *       예) 시드된 {@code ROLE_SYSTEM > ROLE_ADMIN} 에 의해, hasRole('ADMIN') 로 보호된 16개 엔드포인트가
 *       SYSTEM 사용자도 통과 → web(hasAnyRole ADMIN,SYSTEM)/method(hasRole ADMIN) 인가 불일치 해소.</li>
 * </ul>
 *
 * <p>계층 원천은 {@code tb_role_hierarchy} 이며, 테이블 부재/로드 실패 시 {@link DbRoleHierarchy} 가
 * no-op 으로 폴백하므로 인가가 추가로만 부여되고 어떤 경우에도 기존 접근을 차단하지 않는다.
 */
@Configuration
public class RoleHierarchyConfig {

    @Bean
    public RoleHierarchy roleHierarchy(ObjectProvider<JdbcTemplate> jdbcTemplateProvider) {
        // DataSource/JdbcTemplate 이 없는 컨텍스트(웹 슬라이스·모의 보안 테스트 등)에서도 안전하게 로드되도록
        // JdbcTemplate 부재 시 no-op 계층으로 폴백(현행 인가 유지).
        JdbcTemplate jdbcTemplate = jdbcTemplateProvider.getIfAvailable();
        return jdbcTemplate != null ? new DbRoleHierarchy(jdbcTemplate) : DbRoleHierarchy.NOOP;
    }

    /**
     * 메서드 보안 표현식 핸들러에 역할 계층을 주입한다.
     * static 으로 선언해 메서드 보안 인프라의 이른(early) 초기화 시점에도 안전하게 노출한다
     * (Spring Security 레퍼런스 권장 패턴).
     */
    @Bean
    static MethodSecurityExpressionHandler methodSecurityExpressionHandler(RoleHierarchy roleHierarchy) {
        DefaultMethodSecurityExpressionHandler handler = new DefaultMethodSecurityExpressionHandler();
        handler.setRoleHierarchy(roleHierarchy);
        return handler;
    }
}
