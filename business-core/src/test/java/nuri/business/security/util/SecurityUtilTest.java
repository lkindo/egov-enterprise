package nuri.business.security.util;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import nuri.foundation.security.service.CustomUserDetails;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThatCode;
import org.mockito.MockedStatic;
import org.springframework.security.access.hierarchicalroles.RoleHierarchy;
import nuri.foundation.core.config.ApplicationContextProvider;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.anyCollection;

@DisplayName("SecurityUtil 테스트")
@SuppressWarnings("deprecation")
class SecurityUtilTest {

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("인증 정보가 없을 때 빈 Optional 반환 확인")
    void getCurrentUserId_NoAuthentication_ReturnsEmpty() {
        Optional<String> userId = SecurityUtil.getCurrentUserId();
        assertThat(userId).isEmpty();
    }

    @Test
    @DisplayName("Principal이 UserDetails일 때 사용된 ID 반환 확인")
    void getCurrentUserId_UserDetailsPrincipal_ReturnsUsername() {
        UserDetails userDetails = new User("testUser", "password", Collections.emptyList());
        Authentication authentication = new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);

        Optional<String> userId = SecurityUtil.getCurrentUserId();
        assertThat(userId).isPresent().contains("testUser");
    }

    @Test
    @DisplayName("Principal이 String일 때 사용된 ID 반환 확인")
    void getCurrentUserId_StringPrincipal_ReturnsString() {
        Authentication authentication = new UsernamePasswordAuthenticationToken("stringUser", null, Collections.emptyList());
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);

        Optional<String> userId = SecurityUtil.getCurrentUserId();
        assertThat(userId).isPresent().contains("stringUser");
    }

    @Test
    @DisplayName("해당 권한이 있을 때 true 반환 확인")
    void hasRole_UserHasRole_ReturnsTrue() {
        Authentication authentication = new UsernamePasswordAuthenticationToken("user", null,
                List.of(new SimpleGrantedAuthority("ROLE_USER")));
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);

        assertThat(SecurityUtil.hasRole("USER")).isTrue();
    }

    @Test
    @DisplayName("해당 권한이 없을 때 false 반환 확인")
    void hasRole_UserDoesNotHaveRole_ReturnsFalse() {
        Authentication authentication = new UsernamePasswordAuthenticationToken("user", null,
                List.of(new SimpleGrantedAuthority("ROLE_GUEST")));
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);

        assertThat(SecurityUtil.hasRole("USER")).isFalse();
    }

    @Test
    @DisplayName("인증 정보가 없을 때 hasRole false 반환 확인")
    void hasRole_NoAuthentication_ReturnsFalse() {
        assertThat(SecurityUtil.hasRole("USER")).isFalse();
    }

    // --- 소유권 가드(assertOwnerOrAdmin) / loginId ---

    private void authenticateAs(String loginId, String... roles) {
        CustomUserDetails principal = CustomUserDetails.builder()
                .userId(loginId).esntlId("ESNTL_" + loginId).userNm(loginId)
                .password("pw").roleName(roles.length > 0 ? roles[0] : "USER").build();
        List<SimpleGrantedAuthority> auths = java.util.Arrays.stream(roles.length > 0 ? roles : new String[]{"USER"})
                .map(r -> new SimpleGrantedAuthority("ROLE_" + r)).toList();
        Authentication auth = new UsernamePasswordAuthenticationToken(principal, null, auths);
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(auth);
        SecurityContextHolder.setContext(context);
    }

    @Test
    @DisplayName("getCurrentLoginId - CustomUserDetails 의 loginId(esntlId 아님) 반환")
    void getCurrentLoginId_returnsLoginId() {
        authenticateAs("loginA");
        assertThat(SecurityUtil.getCurrentLoginId()).contains("loginA");
    }

    @Test
    @DisplayName("getCurrentLoginId - 미인증 CustomUserDetails principal은 반환하지 않는다")
    void getCurrentLoginId_unauthenticatedPrincipal_returnsEmpty() {
        CustomUserDetails principal = CustomUserDetails.builder()
                .userId("loginA").esntlId("ESNTL_loginA").userNm("loginA")
                .password("pw").roleName("USER").build();
        Authentication authentication = UsernamePasswordAuthenticationToken.unauthenticated(principal, null);
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);

        assertThat(SecurityUtil.getCurrentLoginId()).isEmpty();
    }

    @Test
    @DisplayName("assertOwnerOrAdmin - 소유자(loginId 일치)는 통과")
    void assertOwnerOrAdmin_owner_passes() {
        authenticateAs("loginA");
        assertThatCode(() -> SecurityUtil.assertOwnerOrAdmin("loginA")).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("assertOwnerOrAdmin - 비(非)소유자는 ACCESS_DENIED (IDOR 차단)")
    void assertOwnerOrAdmin_nonOwner_throwsAccessDenied() {
        authenticateAs("loginA");
        assertThatThrownBy(() -> SecurityUtil.assertOwnerOrAdmin("loginB"))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
    }

    @Test
    @DisplayName("assertOwnerOrAdmin - 관리자(ADMIN)는 소유자가 아니어도 우회")
    void assertOwnerOrAdmin_admin_bypasses() {
        authenticateAs("adminUser", "ADMIN");
        assertThatCode(() -> SecurityUtil.assertOwnerOrAdmin("someoneElse")).doesNotThrowAnyException();
    }

    // --- 소유권 가드(assertOwnerOrAdminByEsntlId) / esntlId ---

    @Test
    @DisplayName("assertOwnerOrAdminByEsntlId - 소유자(esntlId 일치)는 통과")
    void assertOwnerOrAdminByEsntlId_owner_passes() {
        authenticateAs("loginA");
        assertThatCode(() -> SecurityUtil.assertOwnerOrAdminByEsntlId("ESNTL_loginA")).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("assertOwnerOrAdminByEsntlId - 비(非)소유자는 ACCESS_DENIED (IDOR 차단)")
    void assertOwnerOrAdminByEsntlId_nonOwner_throwsAccessDenied() {
        authenticateAs("loginA");
        assertThatThrownBy(() -> SecurityUtil.assertOwnerOrAdminByEsntlId("ESNTL_loginB"))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
    }

    @Test
    @DisplayName("assertOwnerOrAdminByEsntlId - 관리자(ADMIN)는 소유자가 아니어도 우회")
    void assertOwnerOrAdminByEsntlId_admin_bypasses() {
        authenticateAs("adminUser", "ADMIN");
        assertThatCode(() -> SecurityUtil.assertOwnerOrAdminByEsntlId("ESNTL_someoneElse")).doesNotThrowAnyException();
    }

    // --- 엄격 소유권 가드(assertOwnerByEsntlId) / 관리자 우회 불가 ---

    @Test
    @DisplayName("assertOwnerByEsntlId - 본인(esntlId 일치)은 통과")
    void assertOwnerByEsntlId_owner_passes() {
        authenticateAs("loginA");
        assertThatCode(() -> SecurityUtil.assertOwnerByEsntlId("ESNTL_loginA")).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("assertOwnerByEsntlId - 타인은 ACCESS_DENIED (IDOR 차단)")
    void assertOwnerByEsntlId_nonOwner_throwsAccessDenied() {
        authenticateAs("loginA");
        assertThatThrownBy(() -> SecurityUtil.assertOwnerByEsntlId("ESNTL_loginB"))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
    }

    @Test
    @DisplayName("assertOwnerByEsntlId - 관리자(ADMIN)도 우회하지 못한다 (결재·신청 대리 차단)")
    void assertOwnerByEsntlId_admin_isNotBypassed() {
        authenticateAs("adminUser", "ADMIN");
        assertThatThrownBy(() -> SecurityUtil.assertOwnerByEsntlId("ESNTL_someoneElse"))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
    }

    @Test
    @DisplayName("assertOwnerByEsntlId - 미인증은 ACCESS_DENIED (fail-closed)")
    void assertOwnerByEsntlId_noAuthentication_throwsAccessDenied() {
        assertThatThrownBy(() -> SecurityUtil.assertOwnerByEsntlId("ESNTL_loginA"))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // [2026-08-09 뮤테이션 보강] hasRole 의 뮤턴트 4개가 전부 NO_COVERAGE 였다.
    //
    //   ⚠ 왜 기존 hasRole 테스트가 못 닿았나: roleHierarchy 는
    //   `ApplicationContextProvider.getBean(RoleHierarchy.class)` 로 가져오는데,
    //   단위 테스트에는 ApplicationContext 가 없어 **항상 null** 이다.
    //   그래서 계층(hierarchy) 경로는 한 번도 실행된 적이 없었다 —
    //   즉 **ROLE_ADMIN 이 ROLE_USER 를 포함하는지** 를 아무도 검증하지 않았다.
    //   static 메서드이므로 mockStatic 으로 그 경로를 연다.
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("역할 계층이 구성되면 상위 역할이 하위 역할을 포함한다")
    void hasRole_withRoleHierarchy_resolvesInheritedRole() {
        Authentication authentication = new UsernamePasswordAuthenticationToken("admin", null,
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);

        RoleHierarchy hierarchy = mock(RoleHierarchy.class);
        // ROLE_ADMIN 은 ROLE_USER 로 도달 가능하다고 선언한다.
        doReturn(List.of(new SimpleGrantedAuthority("ROLE_ADMIN"), new SimpleGrantedAuthority("ROLE_USER")))
                .when(hierarchy).getReachableGrantedAuthorities(anyCollection());

        try (MockedStatic<ApplicationContextProvider> ctx = mockStatic(ApplicationContextProvider.class)) {
            ctx.when(() -> ApplicationContextProvider.getBean(RoleHierarchy.class)).thenReturn(hierarchy);

            // 계층 경로의 `replaced boolean return with false` 뮤턴트가 여기서 죽는다.
            assertThat(SecurityUtil.hasRole("USER")).as("ADMIN 은 계층상 USER 를 포함한다").isTrue();
            // `... with true` 뮤턴트는 여기서 죽는다.
            assertThat(SecurityUtil.hasRole("SYSTEM")).as("도달 불가 역할은 false").isFalse();
        }
    }

    @Test
    @DisplayName("역할 계층 조회가 실패해도 평면 권한으로 판정한다 (fail-safe 폴백)")
    void hasRole_whenHierarchyLookupThrows_fallsBackToFlatAuthorities() {
        Authentication authentication = new UsernamePasswordAuthenticationToken("user", null,
                List.of(new SimpleGrantedAuthority("ROLE_USER")));
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);

        try (MockedStatic<ApplicationContextProvider> ctx = mockStatic(ApplicationContextProvider.class)) {
            ctx.when(() -> ApplicationContextProvider.getBean(RoleHierarchy.class))
                    .thenThrow(new IllegalStateException("no context"));

            // 예외를 삼키고 평면 경로로 내려가는지 — 조건을 뒤집으면 NPE 가 된다.
            assertThat(SecurityUtil.hasRole("USER")).isTrue();
            assertThat(SecurityUtil.hasRole("ADMIN")).isFalse();
        }
    }

    @Test
    @DisplayName("ROLE_ 접두사는 있어도 없어도 같게 판정한다")
    void hasRole_normalizesRolePrefix() {
        Authentication authentication = new UsernamePasswordAuthenticationToken("user", null,
                List.of(new SimpleGrantedAuthority("ROLE_USER")));
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);

        assertThat(SecurityUtil.hasRole("USER")).isTrue();
        assertThat(SecurityUtil.hasRole("ROLE_USER")).isTrue();
    }
}
