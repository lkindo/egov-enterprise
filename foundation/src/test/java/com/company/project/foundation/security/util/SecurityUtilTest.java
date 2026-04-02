package com.company.project.foundation.security.util;

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
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import static org.assertj.core.api.Assertions.assertThat;

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
    @DisplayName("?¸ì¦ ?•ë³´ê°€ ?†ì„ ??ë¹?Optional ë°˜í™˜ ?•ì¸")
    void getCurrentUserId_NoAuthentication_ReturnsEmpty() {
        Optional<String> userId = SecurityUtil.getCurrentUserId();
        assertThat(userId).isEmpty();
    }

    @Test
    @DisplayName("Principal??UserDetails?????¬ìš©??ID ë°˜í™˜ ?•ì¸")
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
    @DisplayName("Principal??String?????¬ìš©??ID ë°˜í™˜ ?•ì¸")
    void getCurrentUserId_StringPrincipal_ReturnsString() {
        Authentication authentication = new UsernamePasswordAuthenticationToken("stringUser", null, Collections.emptyList());
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);

        Optional<String> userId = SecurityUtil.getCurrentUserId();
        assertThat(userId).isPresent().contains("stringUser");
    }

    @Test
    @DisplayName("?´ë‹¹ ê¶Œí•œ???ˆì„ ??true ë°˜í™˜ ?•ì¸")
    void hasRole_UserHasRole_ReturnsTrue() {
        Authentication authentication = new UsernamePasswordAuthenticationToken("user", null,
                List.of(new SimpleGrantedAuthority("ROLE_USER")));
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);

        assertThat(SecurityUtil.hasRole("USER")).isTrue();
    }

    @Test
    @DisplayName("?´ë‹¹ ê¶Œí•œ???†ì„ ??false ë°˜í™˜ ?•ì¸")
    void hasRole_UserDoesNotHaveRole_ReturnsFalse() {
        Authentication authentication = new UsernamePasswordAuthenticationToken("user", null,
                List.of(new SimpleGrantedAuthority("ROLE_GUEST")));
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);

        assertThat(SecurityUtil.hasRole("USER")).isFalse();
    }

    @Test
    @DisplayName("?¸ì¦ ?•ë³´ê°€ ?†ì„ ??hasRole false ë°˜í™˜ ?•ì¸")
    void hasRole_NoAuthentication_ReturnsFalse() {
        assertThat(SecurityUtil.hasRole("USER")).isFalse();
    }
}
