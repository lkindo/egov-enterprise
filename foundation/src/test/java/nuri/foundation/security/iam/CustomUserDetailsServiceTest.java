package nuri.foundation.security.iam;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("CustomUserDetailsService 단위 테스트")
class CustomUserDetailsServiceTest {

    private final UserAuthPort userAuthPort = mock(UserAuthPort.class);
    private final CustomUserDetailsService service = new CustomUserDetailsService(userAuthPort);

    @Test
    @DisplayName("포트가 조회한 사용자 정보를 그대로 반환한다")
    void returnsLoadedUser() {
        UserDetails user = User.withUsername("tester")
                .password("encoded")
                .authorities("ROLE_USER")
                .build();
        when(userAuthPort.loadUserByUsername("tester")).thenReturn(user);

        UserDetails result = service.loadUserByUsername("tester");

        assertThat(result).isSameAs(user);
        verify(userAuthPort).loadUserByUsername("tester");
    }

    @Test
    @DisplayName("포트가 null을 반환하면 사용자 없음 예외로 변환한다")
    void rejectsMissingUser() {
        when(userAuthPort.loadUserByUsername("missing")).thenReturn(null);

        assertThatThrownBy(() -> service.loadUserByUsername("missing"))
                .isInstanceOf(UsernameNotFoundException.class)
                .hasMessage("User not found: missing");
    }
}
