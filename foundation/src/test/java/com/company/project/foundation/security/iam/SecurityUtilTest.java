package com.company.project.foundation.security.util;

import com.company.project.foundation.security.iam.SecurityUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;

import java.util.Collections;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("SecurityUtil 테스트")
class SecurityUtilTest {

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("현재 사용자 아이디 조회 성공")
    void getCurrentLoginId_success() {
        // Given
        User principal = new User("testuser", "password", Collections.emptyList());
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, "password", Collections.emptyList())
        );

        // When
        Optional<String> loginId = SecurityUtil.getCurrentLoginId();

        // Then
        assertThat(loginId).isPresent().contains("testuser");
    }

    @Test
    @DisplayName("인증 정보가 없을 때 빈 Optional 반환 확인")
    void getCurrentLoginId_empty_whenNotAuthenticated() {
        // When
        Optional<String> loginId = SecurityUtil.getCurrentLoginId();

        // Then
        assertThat(loginId).isEmpty();
    }
}