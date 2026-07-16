package nuri.api.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.hierarchicalroles.RoleHierarchy;
import org.springframework.security.access.hierarchicalroles.RoleHierarchyImpl;
import org.springframework.security.core.GrantedAuthority;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

/**
 * DB(tb_role_hierarchy)에서 역할 상속을 로드하는 {@link RoleHierarchy}.
 *
 * <p>기동(빈 생성) 시점이 아니라 {@link ApplicationReadyEvent} 시점에 로드하여 DataSource/Flyway 준비
 * 이후를 보장한다. 테이블 부재(신규 클론·V2_3 미적용·Flyway 비활성 H2 테스트) 또는 조회 실패 시
 * <b>no-op 폴백</b>(상속 확장 없이 입력 권한 그대로)으로 현행 인가를 유지한다.
 *
 * <p>따라서 이 컴포넌트는 인가를 <b>추가로 부여</b>할 뿐, 어떤 실패 상황에서도 기존 접근을
 * 차단하거나 기동을 붕괴시키지 않는다(fail-safe).
 */
@Slf4j
public class DbRoleHierarchy implements RoleHierarchy {

    /** 계층 데이터가 없거나 로드 실패 시: 입력 권한을 그대로 반환(상속 확장 없음 = 현행 동작). */
    static final RoleHierarchy NOOP = authorities -> new ArrayList<>(authorities);

    private static final String LOAD_SQL = "SELECT higher_authrt, lower_authrt FROM tb_role_hierarchy";

    private final JdbcTemplate jdbcTemplate;
    private volatile RoleHierarchy delegate = NOOP;

    public DbRoleHierarchy(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void reload() {
        this.delegate = build();
    }

    RoleHierarchy build() {
        try {
            List<String> edges = jdbcTemplate.query(
                    LOAD_SQL,
                    (rs, rowNum) -> rs.getString(1) + " > " + rs.getString(2));
            if (edges == null || edges.isEmpty()) {
                log.info("[RoleHierarchy] tb_role_hierarchy 비어있음 → no-op(현행 인가 유지)");
                return NOOP;
            }
            RoleHierarchy loaded = RoleHierarchyImpl.fromHierarchy(String.join("\n", edges));
            log.info("[RoleHierarchy] DB 로드 완료: {} 개 상속 엣지 적용", edges.size());
            return loaded;
        } catch (Exception e) {
            log.warn("[RoleHierarchy] DB 로드 실패 → no-op 폴백(현행 인가 유지): {}", e.getMessage());
            return NOOP;
        }
    }

    @Override
    public Collection<? extends GrantedAuthority> getReachableGrantedAuthorities(
            Collection<? extends GrantedAuthority> authorities) {
        return delegate.getReachableGrantedAuthorities(authorities);
    }
}
