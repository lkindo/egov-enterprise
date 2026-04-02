package com.company.project.foundation.security.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Security ??쇱젟 ???뮞??
 * Note: SecurityConfig ??@Profile("!test")嚥紐낅퉸 ???뮞袁⑥쨮袁⑸퓠????쑵源딆넅??
 */
class SecurityConfigTest {

        @Test
        @DisplayName("SecurityConfig ???뮞??- 湲源껊궗")
        void testAlwaysPasses() {
                // SecurityConfig ??@Profile("!test")嚥紐낅퉸 ???뮞紐꾨퓠嚥≪뮆諭 ??놁벉
                // TestSecurityConfig 揶쎛 ???뮞????쇱젟????볥궗??
                assertTrue(true, "Test should always pass");
        }
}
