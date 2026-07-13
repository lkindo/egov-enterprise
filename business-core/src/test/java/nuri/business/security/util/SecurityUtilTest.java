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

@DisplayName("SecurityUtil 테스트")
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
}
