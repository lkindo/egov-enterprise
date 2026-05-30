package nuri.business.security.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.GrantedAuthority;

import java.util.Collection;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("사용자 상세 정보(CustomUserDetails) 테스트")
class CustomUserDetailsTest {

    @Test
    @DisplayName("권한 정보 생성 테스트 - 권한 코드 명시")
    void getAuthoritiesWithAuthorCode() {
        // given
        CustomUserDetails user = CustomUserDetails.builder()
                .authorCode("ROLE_ADMIN")
                .build();

        // when
        Collection<? extends GrantedAuthority> authorities = user.getAuthorities();

        // then
        assertThat(authorities).hasSize(1);
        assertThat(authorities.iterator().next().getAuthority()).isEqualTo("ROLE_ADMIN");
    }

    @Test
    @DisplayName("권한 정보 생성 테스트 - 역할 이름 기준")
    void getAuthoritiesWithRoleName() {
        // given
        CustomUserDetails user = CustomUserDetails.builder()
                .roleName("USER")
                .build();

        // when
        Collection<? extends GrantedAuthority> authorities = user.getAuthorities();

        // then
        assertThat(authorities.iterator().next().getAuthority()).isEqualTo("ROLE_USER");
    }

    @Test
    @DisplayName("권한 정보 생성 테스트 - 기본값")
    void getAuthoritiesDefault() {
        // given
        CustomUserDetails user = CustomUserDetails.builder().build();

        // when
        Collection<? extends GrantedAuthority> authorities = user.getAuthorities();

        // then
        assertThat(authorities.iterator().next().getAuthority()).isEqualTo("ROLE_USER");
    }

    @Test
    @DisplayName("계정 잠금 상태 확인")
    void isAccountNonLocked() {
        // given
        CustomUserDetails lockedUser = CustomUserDetails.builder().lockAt("Y").build();
        CustomUserDetails unlockedUser = CustomUserDetails.builder().lockAt("N").build();

        // then
        assertThat(lockedUser.isAccountNonLocked()).isFalse();
        assertThat(unlockedUser.isAccountNonLocked()).isTrue();
    }

    @Test
    @DisplayName("기본 상태값 확인")
    void statusCheck() {
        CustomUserDetails user = CustomUserDetails.builder().build();
        assertThat(user.isAccountNonExpired()).isTrue();
        assertThat(user.isCredentialsNonExpired()).isTrue();
        assertThat(user.isEnabled()).isTrue();
    }
}
