package com.company.project.core.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertThrows;

class CryptoUtilInitializationTest {

    @Test
    @DisplayName("CryptoUtil 초기화되지 않은 경우 예외 발생 테스트")
    void encrypt_fail_notInitialized() {
        // Given
        // Clear static fields to simulate uninitialized state
        ReflectionTestUtils.setField(CryptoUtil.class, "cryptoService", null);
        ReflectionTestUtils.setField(CryptoUtil.class, "algorithmKey", null);

        // When & Then
        assertThrows(RuntimeException.class, () -> {
            CryptoUtil.encrypt("someData");
        });
    }

    @Test
    @DisplayName("CryptoUtil 복호화 시 초기화되지 않은 경우 예외 발생 테스트")
    void decrypt_fail_notInitialized() {
        // Given
        ReflectionTestUtils.setField(CryptoUtil.class, "cryptoService", null);
        ReflectionTestUtils.setField(CryptoUtil.class, "algorithmKey", null);

        // When & Then
        // Decrypt expects Base64, but it will fail at initialization check if we add one there, 
        // however CryptoUtil.decrypt only checks null and uses cryptoService directly.
        // Let's check CryptoUtil.java:76
        assertThrows(RuntimeException.class, () -> {
            CryptoUtil.decrypt("YmFzZTY0"); // "base64"
        });
    }
}
