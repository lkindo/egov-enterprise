package nuri.api.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.AuthorityUtils;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verifyNoInteractions;

@DisplayName("DbRoleHierarchy - DB 소싱 역할 계층 + fail-safe 폴백")
@ExtendWith(MockitoExtension.class)
class DbRoleHierarchyTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    private Set<String> reachable(DbRoleHierarchy h, String role) {
        return h.getReachableGrantedAuthorities(AuthorityUtils.createAuthorityList(role))
                .stream().map(GrantedAuthority::getAuthority).collect(Collectors.toSet());
    }

    @Test
    @DisplayName("DB 엣지 로드 시 상위 권한이 하위 권한을 상속한다 (SYSTEM→ADMIN→USER)")
    void expandsHierarchyFromDb() {
        doReturn(List.of("ROLE_SYSTEM > ROLE_ADMIN", "ROLE_ADMIN > ROLE_USER"))
                .when(jdbcTemplate).query(anyString(), any(RowMapper.class));
        DbRoleHierarchy h = new DbRoleHierarchy(jdbcTemplate);

        h.reload();

        // SYSTEM 사용자는 ADMIN·USER 권한까지 도달 → hasRole('ADMIN') 보호 자원 접근 가능
        assertThat(reachable(h, "ROLE_SYSTEM")).contains("ROLE_SYSTEM", "ROLE_ADMIN", "ROLE_USER");
        // ADMIN 사용자는 USER 까지만
        assertThat(reachable(h, "ROLE_ADMIN")).contains("ROLE_ADMIN", "ROLE_USER").doesNotContain("ROLE_SYSTEM");
    }

    @Test
    @DisplayName("테이블이 비어있으면 no-op — 상속 확장 없이 현행 인가 유지")
    void emptyTableIsNoop() {
        doReturn(List.of()).when(jdbcTemplate).query(anyString(), any(RowMapper.class));
        DbRoleHierarchy h = new DbRoleHierarchy(jdbcTemplate);

        h.reload();

        assertThat(reachable(h, "ROLE_ADMIN")).containsExactly("ROLE_ADMIN");
    }

    @Test
    @DisplayName("DB 로드 실패(테이블 부재 등)여도 예외 없이 no-op 폴백")
    void dbFailureFallsBackToNoop() {
        doThrow(new org.springframework.dao.DataAccessResourceFailureException("table not found"))
                .when(jdbcTemplate).query(anyString(), any(RowMapper.class));
        DbRoleHierarchy h = new DbRoleHierarchy(jdbcTemplate);

        assertThatCode(h::reload).doesNotThrowAnyException();
        assertThat(reachable(h, "ROLE_ADMIN")).containsExactly("ROLE_ADMIN");
    }

    @Test
    @DisplayName("기동 완료(reload) 전에는 DB 접근 없이 no-op (현행 유지)")
    void noopBeforeReload() {
        DbRoleHierarchy h = new DbRoleHierarchy(jdbcTemplate);

        assertThat(reachable(h, "ROLE_SYSTEM")).containsExactly("ROLE_SYSTEM");
        verifyNoInteractions(jdbcTemplate);
    }
}
