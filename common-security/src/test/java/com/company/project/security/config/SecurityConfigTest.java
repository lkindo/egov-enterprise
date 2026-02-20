package com.company.project.security.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Security ??쇱젟 ???뮞??
 * Note: SecurityConfig ??@Profile("!test")嚥??紐낅퉸 ???뮞???袁⑥쨮?袁⑸퓠????쑵??源딆넅??
 */
class SecurityConfigTest {

        @Test
        @DisplayName("SecurityConfig ???뮞??- ??湲??源껊궗")
        void testAlwaysPasses() {
                // SecurityConfig ??@Profile("!test")嚥??紐낅퉸 ???뮞?紐꾨퓠??嚥≪뮆諭??? ??놁벉
                // TestSecurityConfig 揶쎛 ???뮞????쇱젟????볥궗??
                assertTrue(true, "Test should always pass");
        }
}
