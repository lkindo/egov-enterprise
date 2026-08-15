package nuri.foundation.core.util;

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
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.anyString;

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
        util.setPreviousAlgorithmKey("");
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
        @DisplayName("null 데이터 암호화시 null 반환")
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
        @DisplayName("null 데이터 복호화시 null 반환")
        void testDecrypt_NullData() {
            // When
            String result = CryptoUtil.decrypt(null);

            // Then
            assertNull(result);
            verify(cryptoService, never()).decrypt(any(byte[].class), anyString());
        }

        @Test
        @DisplayName("잘못된 Base64 문자열 복호화시 예외 발생")
        void testDecrypt_InvalidBase64() {
            // Given
            String invalidBase64 = "InvalidBase64!@#";

            // When & Then
            assertThrows(RuntimeException.class, () -> {
                CryptoUtil.decrypt(invalidBase64);
            });
        }

        @Test
        @DisplayName("활성 키 복호화 실패 시 설정된 이전 키로 한 번 폴백")
        void testDecrypt_FallsBackToPreviousKey() {
            EgovCryptoService previousCryptoService = mock(EgovCryptoService.class);
            org.springframework.test.util.ReflectionTestUtils.setField(
                    CryptoUtil.class, "previousAlgorithmKey", "OLD-ARIA");
            org.springframework.test.util.ReflectionTestUtils.setField(
                    CryptoUtil.class, "previousCryptoService", previousCryptoService);
            String encrypted = Base64.getEncoder().encodeToString("cipher".getBytes(StandardCharsets.UTF_8));
            when(cryptoService.decrypt(any(byte[].class), eq("ARIA")))
                    .thenThrow(new IllegalArgumentException("active key mismatch"));
            when(previousCryptoService.decrypt(any(byte[].class), eq("OLD-ARIA")))
                    .thenReturn("900101-1234567".getBytes(StandardCharsets.UTF_8));

            assertThat(CryptoUtil.decrypt(encrypted)).isEqualTo("900101-1234567");
            verify(cryptoService).decrypt(any(byte[].class), eq("ARIA"));
            verify(previousCryptoService).decrypt(any(byte[].class), eq("OLD-ARIA"));
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
        @DisplayName("encryptSession - null 데이터에 대해 대시(-) 반환")
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

    // ─────────────────────────────────────────────────────────────────────────
    // [2026-08-09 뮤테이션 보강] 이 클래스에 6개가 살아 있었다. 셋 다 성격이 다르다.
    //
    //   · setAlgorithmKey 의 **약한 기본키 경고**(L27) — 조건이 뒤집히면 소스에 커밋된
    //     공개 샘플키가 운영에서 **조용히** 쓰인다. 그 상태로 암호화된 PII 는
    //     키를 아는 누구나 복호화할 수 있고, 사고 후에도 "경고가 없었다" 는 기록만 남는다.
    //   · encrypt 의 **초기화 가드**(L49) — 뒤집히면 미초기화 상태에서 NPE 가 나거나,
    //     반대로 정상 상태를 미초기화로 오판해 전 암호화가 막힌다.
    //   · encryptSession/encryptId 의 **반환값**(L67·L74) — 조용히 빈 문자열이 되면
    //     암호문 자리에 ""가 저장된다(복호화 시점에야 드러난다).
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("약한 기본키 경고")
    class WeakKeyWarning {

        /** setAlgorithmKey 가 남긴 WARN 로그를 수집한다. */
        private ch.qos.logback.core.read.ListAppender<ch.qos.logback.classic.spi.ILoggingEvent> attach() {
            ch.qos.logback.classic.Logger logger =
                    (ch.qos.logback.classic.Logger) org.slf4j.LoggerFactory.getLogger(CryptoUtil.class);
            ch.qos.logback.core.read.ListAppender<ch.qos.logback.classic.spi.ILoggingEvent> appender =
                    new ch.qos.logback.core.read.ListAppender<>();
            appender.start();
            logger.addAppender(appender);
            return appender;
        }

        private void detach(ch.qos.logback.core.read.ListAppender<ch.qos.logback.classic.spi.ILoggingEvent> a) {
            ((ch.qos.logback.classic.Logger) org.slf4j.LoggerFactory.getLogger(CryptoUtil.class))
                    .detachAppender(a);
        }

        private long warnCount(ch.qos.logback.core.read.ListAppender<ch.qos.logback.classic.spi.ILoggingEvent> a) {
            return a.list.stream()
                    .filter(e -> e.getLevel() == ch.qos.logback.classic.Level.WARN)
                    .filter(e -> e.getFormattedMessage().contains("약한 기본 암호화 키"))
                    .count();
        }

        @Test
        @DisplayName("커밋된 공개 샘플키를 쓰면 경고한다")
        void warnsOnCommittedSampleKey() {
            var appender = attach();
            try {
                // 이 경고가 사라지면 약한 키가 운영에서 조용히 쓰인다 —
                //   그 상태로 암호화된 PII 는 키를 아는 누구나 복호화할 수 있다.
                new CryptoUtil().setAlgorithmKey("egovframe");
                assertThat(warnCount(appender)).isEqualTo(1);

                new CryptoUtil().setAlgorithmKey("egoventerprise0123");
                assertThat(warnCount(appender)).isEqualTo(2);
            } finally {
                detach(appender);
            }
        }

        @Test
        @DisplayName("고엔트로피 키에는 경고하지 않는다")
        void silentOnStrongKey() {
            var appender = attach();
            try {
                new CryptoUtil().setAlgorithmKey("9f3c!Aq2#Zx7_Lm4Pv8Nr1Ts6");

                // 항상 경고하면 진짜 약한 키를 썼을 때 그 신호가 소음에 묻힌다.
                assertThat(warnCount(appender)).isZero();
            } finally {
                detach(appender);
            }
        }

        @Test
        @DisplayName("키가 null 이어도 NPE 없이 지나간다")
        void nullKeyDoesNotThrow() {
            var appender = attach();
            try {
                // `key != null` 가드를 지운 뮤턴트는 Set.contains(null) 에서 NPE 로 죽는다.
                assertThatCode(() -> new CryptoUtil().setAlgorithmKey(null)).doesNotThrowAnyException();
                assertThat(warnCount(appender)).isZero();
            } finally {
                detach(appender);
                // 뒤 테스트가 영향받지 않도록 정상 키로 되돌린다(static 상태).
                new CryptoUtil().setAlgorithmKey("ARIA");
            }
        }
    }

    @Nested
    @DisplayName("레거시 래퍼")
    class LegacyWrappers {

        @Test
        @DisplayName("encryptSession 은 세션ID 를 앞에 붙여 암호화한다")
        void encryptSessionPrefixesSessionId() {
            when(cryptoService.encrypt(any(byte[].class), anyString()))
                    .thenAnswer(inv -> inv.getArgument(0));

            String result = CryptoUtil.encryptSession("payload", "SESSION-1");

            // 빈 문자열을 돌려주는 뮤턴트가 여기서 죽는다 — 암호문 자리에 "" 가 저장되면
            //   복호화 시점에야 드러나고 그때는 원본이 없다.
            assertThat(result).isNotEmpty();
            byte[] decoded = java.util.Base64.getDecoder().decode(result);
            assertThat(new String(decoded, java.nio.charset.StandardCharsets.UTF_8))
                    .isEqualTo("SESSION-1|payload");
        }

        @Test
        @DisplayName("encryptSession 은 데이터가 없으면 '-' 를 돌려준다")
        void encryptSessionReturnsDashForNull() {
            assertThat(CryptoUtil.encryptSession(null, "SESSION-1")).isEqualTo("-");
        }

        @Test
        @DisplayName("encryptId 는 encrypt 와 같은 결과를 돌려준다")
        void encryptIdDelegatesToEncrypt() {
            when(cryptoService.encrypt(any(byte[].class), anyString()))
                    .thenAnswer(inv -> inv.getArgument(0));

            String viaId = CryptoUtil.encryptId("USR_001");

            assertThat(viaId).isNotEmpty().isEqualTo(CryptoUtil.encrypt("USR_001"));
        }
    }
}
