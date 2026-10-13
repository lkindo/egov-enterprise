package nuri.foundation.security.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.GrantedAuthority;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("사용자 상세 정보의 명시적 권한 계약")
class CustomUserDetailsTest {
    @Test
    void legacyRoleAndGroupNamesNeverGrantOperationPermissions() {
        CustomUserDetails user = CustomUserDetails.builder()
                .authorCode("ROLE_ADMIN").roleName("ADMIN")
                .authorityCodes(List.of("ROLE_SYSTEM"))
                .groups(List.of("ROLE_ADMIN", "ROLE_SYSTEM")).build();
        assertThat(user.getAuthorities()).isEmpty();
        assertThat(user.getGroups()).containsExactly("ROLE_ADMIN", "ROLE_SYSTEM");
    }

    @Test
    void emptyAssignmentNeverFallsBackToUser() {
        assertThat(CustomUserDetails.builder().build().getAuthorities()).isEmpty();
        assertThat(CustomUserDetails.builder().permissions(List.of()).build().getAuthorities()).isEmpty();
        assertThat(new CustomUserDetails("login", "subject", "name", "", "ADMIN", "N", "ROLE_ADMIN")
                .getAuthorities()).isEmpty();
    }

    @Test
    void permissionsAreExactImmutableValuesWithoutRolePrefixExpansion() {
        // 예시 권한은 core 코드다 — 생성물은 권한 목록을 구성 코드로 줄인다(Phase 2 10단계 10b).
        var input = new ArrayList<>(List.of("USER_READ", "USER_CREATE", "USER_READ"));
        CustomUserDetails user = CustomUserDetails.builder().permissions(input).build();
        input.add("AUTH_ASSIGN");
        assertThat(user.getAuthorities()).extracting(GrantedAuthority::getAuthority)
                .containsExactly("USER_CREATE", "USER_READ");
        assertThatThrownBy(() -> user.getPermissions().add("AUTH_ASSIGN"))
                .isInstanceOf(UnsupportedOperationException.class);
    }

    @Test
    void blankAuthorizationCodesAreRejected() {
        assertThatThrownBy(() -> CustomUserDetails.builder().permissions(List.of(" ")).build())
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> CustomUserDetails.builder().groups(java.util.Arrays.asList("USER", null)).build())
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void enabledRequiresExplicitCurrentAccountState() {
        assertThat(CustomUserDetails.builder().build().isEnabled()).isFalse();
        assertThat(CustomUserDetails.builder().enabled(true).build().isEnabled()).isTrue();
        assertThat(CustomUserDetails.builder().enabled(false).build().isEnabled()).isFalse();
    }

    @Test
    void accountLockRemainsIndependentOfMemberships() {
        assertThat(CustomUserDetails.builder().enabled(true).lockAt("Y").build().isAccountNonLocked()).isFalse();
        CustomUserDetails active = CustomUserDetails.builder().enabled(true).lockAt("N")
                .groups(List.of()).authorizationVersion("current").build();
        assertThat(active.isAccountNonLocked()).isTrue();
        assertThat(active.isEnabled()).isTrue();
        assertThat(active.getGroups()).isEmpty();
        assertThat(active.getAuthorizationVersion()).isEqualTo("current");
        assertThat(active.isAccountNonExpired()).isTrue();
        assertThat(active.isCredentialsNonExpired()).isTrue();
    }
}