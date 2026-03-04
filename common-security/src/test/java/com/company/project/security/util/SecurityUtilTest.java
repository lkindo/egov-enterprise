package com.company.project.security.util;

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
    @DisplayName("인증 정보가 없을 때 빈 Optional 반환 확인")
    void getCurrentUserId_NoAuthentication_ReturnsEmpty() {
        Optional<String> userId = SecurityUtil.getCurrentUserId();
        assertThat(userId).isEmpty();
    }

    @Test
    @DisplayName("Principal이 UserDetails일 때 사용자 ID 반환 확인")
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
    @DisplayName("Principal이 String일 때 사용자 ID 반환 확인")
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
}
