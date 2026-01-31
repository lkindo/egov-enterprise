package com.company.project.security.jwt;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.TestPropertySource;

import static org.junit.jupiter.api.Assertions.assertEquals;

// Provide a test secret to verify that the component uses the injected value
@SpringBootTest(classes = JwtTokenProvider.class)
@TestPropertySource(properties = "jwt.secret=test_secret_key_must_be_very_long_at_least_256_bits_for_hs256_algorithm")
public class JwtTokenProviderTest {

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Test
    public void testSecretKeyInjection() throws Exception {
        // We removed the default value from the code, so we must ensure that:
        // 1. The application context loads successfully when a secret is provided (via @TestPropertySource).
        // 2. The secret used is indeed the one we provided, not some hardcoded fallback.

        java.lang.reflect.Field field = JwtTokenProvider.class.getDeclaredField("secretKey");
        field.setAccessible(true);
        String secret = (String) field.get(jwtTokenProvider);

        assertEquals("test_secret_key_must_be_very_long_at_least_256_bits_for_hs256_algorithm", secret);
    }
}
