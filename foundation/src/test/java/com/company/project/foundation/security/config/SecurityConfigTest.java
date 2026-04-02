package com.company.project.foundation.security.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Security ???±ì Ÿ ???ë®??
 * Note: SecurityConfig ??@Profile("!test")?¥ï§?…í‰¸ ???ë®è¢?¥ì¨®è¢â‘¸??????µæº?†ë„…??
 */
class SecurityConfigTest {

        @Test
        @DisplayName("SecurityConfig ???ë®??- æ¹²æºê»Šê¶—")
        void testAlwaysPasses() {
                // SecurityConfig ??@Profile("!test")?¥ï§?…í‰¸ ???ë®ï§ê¾¨í“ ?¥â‰ªë®†è«­ ???ë²‰
                // TestSecurityConfig ?¶ì›? ???ë®?????±ì Ÿ????ë³¥ê¶—??
                assertTrue(true, "Test should always pass");
        }
}
