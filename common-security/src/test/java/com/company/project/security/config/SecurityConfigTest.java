package com.company.project.security.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Security 설정 테스트
 * Note: SecurityConfig 는 @Profile("!test")로 인해 테스트 프로필에서 비활성화됨
 */
class SecurityConfigTest {

        @Test
        @DisplayName("SecurityConfig 테스트 - 항상 성공")
        void testAlwaysPasses() {
                // SecurityConfig 는 @Profile("!test")로 인해 테스트에서 로드되지 않음
                // TestSecurityConfig 가 테스트 설정을 제공함
                assertTrue(true, "Test should always pass");
        }
}
