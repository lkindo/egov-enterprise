package nuri.business.security.audit;

import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import java.util.Collections;
import java.util.Optional;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("LoginUserAuditorAware (감사자 추적) 테스트")
class LoginUserAuditorAwareTest {

    private LoginUserAuditorAware auditorAware;

    @BeforeEach
    void setUp() {
        auditorAware = new LoginUserAuditorAware();
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("인증 정보가 없을 때 SYSTEM 반환")
    void getCurrentAuditor_NoAuthentication_ReturnsSystem() {
        Optional<String> auditor = auditorAware.getCurrentAuditor();
        assertThat(auditor).isPresent().contains("SYSTEM");
    }

    @Test
    @DisplayName("인증되지 않았을 때 SYSTEM 반환")
    void getCurrentAuditor_NotAuthenticated_ReturnsSystem() {
        Authentication authentication = mock(Authentication.class);
        when(authentication.isAuthenticated()).thenReturn(false);
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);

        Optional<String> auditor = auditorAware.getCurrentAuditor();
        assertThat(auditor).isPresent().contains("SYSTEM");
    }

    @Test
    @DisplayName("익명 사용자일 때 SYSTEM 반환")
    void getCurrentAuditor_AnonymousUser_ReturnsSystem() {
        Authentication authentication = new UsernamePasswordAuthenticationToken("anonymousUser", null, Collections.emptyList());
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);

        Optional<String> auditor = auditorAware.getCurrentAuditor();
        assertThat(auditor).isPresent().contains("SYSTEM");
    }

    @Test
    @DisplayName("CustomUserDetails 사용 시 ID 반환")
    void getCurrentAuditor_CustomUserDetails_ReturnsUserId() {
        CustomUserDetails userDetails = CustomUserDetails.builder()
                .userId("testUser")
                .build();
        Authentication authentication = new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);

        Optional<String> auditor = auditorAware.getCurrentAuditor();
        assertThat(auditor).isPresent().contains("testUser");
    }

    @Test
    @DisplayName("그 외의 경우 authentication.getName() 반환")
    void getCurrentAuditor_OtherPrincipal_ReturnsName() {
        Authentication authentication = new UsernamePasswordAuthenticationToken("directName", null, Collections.emptyList());
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);

        Optional<String> auditor = auditorAware.getCurrentAuditor();
        assertThat(auditor).isPresent().contains("directName");
    }
}
