package com.company.project.core.util;

import org.egovframe.rte.fdl.crypto.EgovCryptoService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationContext;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Objects;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("CryptoUtil 테스트")
class CryptoUtilTest {

    @Mock
    private ApplicationContext applicationContext;

    @Mock
    private EgovCryptoService cryptoService;

    @BeforeEach
    void setUp() {
        // Mock setup
        when(applicationContext.getBean("ariacryptoService")).thenReturn(cryptoService);
        
        // Initialize CryptoUtil with mocks
        CryptoUtil util = new CryptoUtil();
        util.setApplicationContext(Objects.requireNonNull(applicationContext));
        util.setAlgorithmKey("ARIA");
    }

    @Nested
    @DisplayName("encrypt 메서드 테스트")
    class EncryptTests {

        @Test
        @DisplayName("정상 데이터 암호화 성공")
        void testEncrypt_Success() {
            // Given
            String originalData = "testData";
            byte[] encryptedBytes = "encryptedData".getBytes(StandardCharsets.UTF_8);

            when(cryptoService.encrypt(any(byte[].class), eq("ARIA"))).thenReturn(encryptedBytes);

            // When
            String encryptedString = CryptoUtil.encrypt(originalData);

            // Then
            verify(cryptoService, times(1)).encrypt(any(byte[].class), eq("ARIA"));
            String expectedEncryptedString = Base64.getEncoder().encodeToString(encryptedBytes);
            assertEquals(expectedEncryptedString, encryptedString);
        }

        @Test
        @DisplayName("null 데이터 암호화 시 null 반환")
        void testEncrypt_NullData() {
            // When
            String result = CryptoUtil.encrypt(null);

            // Then
            assertNull(result);
            verify(cryptoService, never()).encrypt(any(byte[].class), anyString());
        }

        @Test
        @DisplayName("빈 문자열 암호화 성공")
        void testEncrypt_EmptyString() {
            // Given
            String emptyData = "";
            byte[] encryptedBytes = "encrypted".getBytes(StandardCharsets.UTF_8);
            when(cryptoService.encrypt(any(byte[].class), eq("ARIA"))).thenReturn(encryptedBytes);

            // When
            String result = CryptoUtil.encrypt(emptyData);

            // Then
            assertNotNull(result);
            verify(cryptoService, times(1)).encrypt(any(byte[].class), eq("ARIA"));
        }
    }

    @Nested
    @DisplayName("decrypt 메서드 테스트")
    class DecryptTests {

        @Test
        @DisplayName("정상 데이터 복호화 성공")
        void testDecrypt_Success() {
            // Given
            String originalData = "testData";
            byte[] originalBytes = originalData.getBytes(StandardCharsets.UTF_8);
            byte[] encryptedBytes = "encryptedData".getBytes(StandardCharsets.UTF_8);
            String encodedEncrypted = Base64.getEncoder().encodeToString(encryptedBytes);

            when(cryptoService.decrypt(any(byte[].class), eq("ARIA"))).thenReturn(originalBytes);

            // When
            String decryptedString = CryptoUtil.decrypt(encodedEncrypted);

            // Then
            verify(cryptoService, times(1)).decrypt(any(byte[].class), eq("ARIA"));
            assertEquals(originalData, decryptedString);
        }

        @Test
        @DisplayName("null 데이터 복호화 시 null 반환")
        void testDecrypt_NullData() {
            // When
            String result = CryptoUtil.decrypt(null);

            // Then
            assertNull(result);
            verify(cryptoService, never()).decrypt(any(byte[].class), anyString());
        }

        @Test
        @DisplayName("잘못된 Base64 문자열 복호화 시 예외 발생")
        void testDecrypt_InvalidBase64() {
            // Given
            String invalidBase64 = "InvalidBase64!@#";

            // When & Then
            assertThrows(RuntimeException.class, () -> {
                CryptoUtil.decrypt(invalidBase64);
            });
        }
    }

    @Nested
    @DisplayName("특수 목적 암호화 메서드 테스트")
    class SpecialEncryptTests {

        @Test
        @DisplayName("encryptSession - 세션 ID 와 함께 암호화")
        void testEncryptSession() {
            // Given
            String data = "userData";
            String sessionId = "SESSION123";
            String expectedTarget = sessionId + "|" + data;
            byte[] encryptedBytes = "encryptedSession".getBytes(StandardCharsets.UTF_8);
            
            when(cryptoService.encrypt(any(byte[].class), eq("ARIA"))).thenReturn(encryptedBytes);

            // When
            String result = CryptoUtil.encryptSession(data, sessionId);

            // Then
            assertNotNull(result);
            verify(cryptoService, times(1)).encrypt(eq(expectedTarget.getBytes(StandardCharsets.UTF_8)), eq("ARIA"));
        }

        @Test
        @DisplayName("encryptSession - null 데이터 시 대시 반환")
        void testEncryptSession_NullData() {
            // When
            String result = CryptoUtil.encryptSession(null, "SESSION123");

            // Then
            assertEquals("-", result);
            verify(cryptoService, never()).encrypt(any(byte[].class), anyString());
        }

        @Test
        @DisplayName("encryptId - ID 암호화")
        void testEncryptId() {
            // Given
            String userId = "user123";
            byte[] encryptedBytes = "encryptedId".getBytes(StandardCharsets.UTF_8);
            when(cryptoService.encrypt(any(byte[].class), eq("ARIA"))).thenReturn(encryptedBytes);

            // When
            String result = CryptoUtil.encryptId(userId);

            // Then
            assertNotNull(result);
            verify(cryptoService, times(1)).encrypt(any(byte[].class), eq("ARIA"));
        }
    }

    @Nested
    @DisplayName("예외 상황 테스트")
    class ExceptionTests {

        @Test
        @DisplayName("암호화 서비스 오류 시 RuntimeException 발생")
        void testEncrypt_ServiceError() {
            // Given
            String data = "testData";
            when(cryptoService.encrypt(any(byte[].class), eq("ARIA")))
                    .thenThrow(new RuntimeException("Crypto service error"));

            // When & Then
            assertThrows(RuntimeException.class, () -> {
                CryptoUtil.encrypt(data);
            });
        }

        @Test
        @DisplayName("복호화 서비스 오류 시 RuntimeException 발생")
        void testDecrypt_ServiceError() {
            // Given
            String encryptedData = Base64.getEncoder().encodeToString("test".getBytes());
            when(cryptoService.decrypt(any(byte[].class), eq("ARIA")))
                    .thenThrow(new RuntimeException("Crypto service error"));

            // When & Then
            assertThrows(RuntimeException.class, () -> {
                CryptoUtil.decrypt(encryptedData);
            });
        }
    }
}
