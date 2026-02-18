package com.company.project.core.util;

import org.egovframe.rte.fdl.crypto.EgovCryptoService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationContext;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Objects;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.times;

@ExtendWith(MockitoExtension.class)
class CryptoUtilTest {

    @Mock
    private ApplicationContext applicationContext;

    @Mock
    private EgovCryptoService cryptoService;

    @BeforeEach
    void setUp() {
        when(applicationContext.getBean("ariacryptoService")).thenReturn(cryptoService);
        CryptoUtil util = new CryptoUtil();
        util.setApplicationContext(Objects.requireNonNull(applicationContext));
        util.setAlgorithmKey("ARIA");
    }

    @Test
    void testEncryptAndDecrypt() {
        String originalData = "testData";
        byte[] originalBytes = originalData.getBytes(StandardCharsets.UTF_8);
        byte[] encryptedBytes = "encryptedData".getBytes(StandardCharsets.UTF_8);

        // Mock encrypt behavior
        when(cryptoService.encrypt(any(byte[].class), eq("ARIA"))).thenReturn(encryptedBytes);

        // Call encrypt
        String encryptedString = CryptoUtil.encrypt(originalData);

        // Verify encrypt called cryptoService
        verify(cryptoService, times(1)).encrypt(any(byte[].class), eq("ARIA"));

        // Verify the result is Base64 encoded version of encryptedBytes
        String expectedEncryptedString = Base64.getEncoder().encodeToString(encryptedBytes);
        assertEquals(expectedEncryptedString, encryptedString);

        // Mock decrypt behavior
        when(cryptoService.decrypt(any(byte[].class), eq("ARIA"))).thenReturn(originalBytes);

        // Call decrypt
        String decryptedString = CryptoUtil.decrypt(encryptedString);

        // Verify decrypt called cryptoService
        verify(cryptoService, times(1)).decrypt(any(byte[].class), eq("ARIA"));

        // Verify decrypted string matches original
        assertEquals(originalData, decryptedString);
    }
}
