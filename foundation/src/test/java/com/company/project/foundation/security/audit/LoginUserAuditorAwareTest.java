package com.company.project.foundation.security.audit;

import com.company.project.foundation.security.service.CustomUserDetails;
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
    @DisplayName("?∏Ï¶ù ?ïÎ≥¥Í∞Ä ?ÜÏùÑ ??SYSTEM Î∞òÌôò")
    void getCurrentAuditor_NoAuthentication_ReturnsSystem() {
        Optional<String> auditor = auditorAware.getCurrentAuditor();
        assertThat(auditor).isPresent().contains("SYSTEM");
    }

    @Test
    @DisplayName("?∏Ï¶ù?òÏ? ?äÏïò????SYSTEM Î∞òÌôò")
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
    @DisplayName("?µÎ™Ö ?¨Ïö©?êÏùº ??SYSTEM Î∞òÌôò")
    void getCurrentAuditor_AnonymousUser_ReturnsSystem() {
        Authentication authentication = new UsernamePasswordAuthenticationToken("anonymousUser", null, Collections.emptyList());
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);

        Optional<String> auditor = auditorAware.getCurrentAuditor();
        assertThat(auditor).isPresent().contains("SYSTEM");
    }

    @Test
    @DisplayName("CustomUserDetails?????¨Ïö©??ID Î∞òÌôò")
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
    @DisplayName("Í∑??∏Ïùò Í≤ΩÏö∞ authentication.getName() Î∞òÌôò")
    void getCurrentAuditor_OtherPrincipal_ReturnsName() {
        Authentication authentication = new UsernamePasswordAuthenticationToken("directName", null, Collections.emptyList());
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);

        Optional<String> auditor = auditorAware.getCurrentAuditor();
        assertThat(auditor).isPresent().contains("directName");
    }
}
