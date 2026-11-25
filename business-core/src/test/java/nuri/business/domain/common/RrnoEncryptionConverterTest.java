package nuri.business.domain.common;

import nuri.foundation.core.util.CryptoUtil;
import org.egovframe.rte.fdl.crypto.EgovCryptoService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@DisplayName("RrnoEncryptionConverter 단위 테스트")
class RrnoEncryptionConverterTest {

    private RrnoEncryptionConverter converter;
    private EgovCryptoService mockCryptoService;

    @BeforeEach
    void setUp() {
        converter = new RrnoEncryptionConverter();
        mockCryptoService = Mockito.mock(EgovCryptoService.class);
        
        // CryptoUtil에 mock 주입
        ReflectionTestUtils.setField(CryptoUtil.class, "cryptoService", mockCryptoService);
        ReflectionTestUtils.setField(CryptoUtil.class, "algorithmKey", "egovframe");
        ReflectionTestUtils.setField(CryptoUtil.class, "previousCryptoService", null);
        ReflectionTestUtils.setField(CryptoUtil.class, "previousAlgorithmKey", null);
        RrnoKeyring.configure(null, null);
    }

    @org.junit.jupiter.api.AfterEach
    void tearDown() {
        RrnoKeyring.configure(null, null);
    }

    private static final String KEY_A = java.util.Base64.getEncoder().encodeToString(new byte[32]);
    private static final String KEY_B;
    static {
        byte[] b = new byte[32];
        java.util.Arrays.fill(b, (byte) 7);
        KEY_B = java.util.Base64.getEncoder().encodeToString(b);
    }

    @Test
    @DisplayName("데이터베이스 컬럼으로 변환 - null 입력")
    void convertToDatabaseColumn_Null() {
        assertThat(converter.convertToDatabaseColumn(null)).isNull();
    }

    @Test
    @DisplayName("데이터베이스 컬럼으로 변환 - 빈 문자열 입력")
    void convertToDatabaseColumn_Empty() {
        assertThat(converter.convertToDatabaseColumn("")).isNull();
        assertThat(converter.convertToDatabaseColumn("   ")).isNull();
    }

    @Test
    @DisplayName("데이터베이스 컬럼으로 변환 - 정상 암호화")
    void convertToDatabaseColumn_Success() throws Exception {
        byte[] encryptedBytes = "encrypted".getBytes();
        when(mockCryptoService.encrypt(any(byte[].class), any(String.class))).thenReturn(encryptedBytes);

        String result = converter.convertToDatabaseColumn("900101-1234567");
        assertThat(result).isEqualTo(java.util.Base64.getEncoder().encodeToString(encryptedBytes));
    }

    @Test
    @DisplayName("데이터베이스 컬럼으로 변환 - 암호화 예외 시 평문 저장 거부(fail-closed)")
    void convertToDatabaseColumn_Exception() throws Exception {
        when(mockCryptoService.encrypt(any(byte[].class), any(String.class))).thenThrow(new RuntimeException("Encryption Error"));

        // [보안 D] 암호화 실패 시 평문 PII를 저장하지 않고 예외를 전파해야 한다.
        org.assertj.core.api.Assertions.assertThatThrownBy(
                        () -> converter.convertToDatabaseColumn("900101-1234567"))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("엔티티 속성으로 변환 - null 입력")
    void convertToEntityAttribute_Null() {
        assertThat(converter.convertToEntityAttribute(null)).isNull();
    }

    @Test
    @DisplayName("엔티티 속성으로 변환 - 빈 문자열 입력")
    void convertToEntityAttribute_Empty() {
        assertThat(converter.convertToEntityAttribute("")).isNull();
        assertThat(converter.convertToEntityAttribute("   ")).isNull();
    }

    @Test
    @DisplayName("엔티티 속성으로 변환 - 정상 복호화")
    void convertToEntityAttribute_Success() throws Exception {
        byte[] decryptedBytes = "900101-1234567".getBytes(java.nio.charset.StandardCharsets.UTF_8);
        when(mockCryptoService.decrypt(any(byte[].class), any(String.class))).thenReturn(decryptedBytes);

        String base64Input = java.util.Base64.getEncoder().encodeToString("encrypted".getBytes());
        String result = converter.convertToEntityAttribute(base64Input);
        assertThat(result).isEqualTo("900101-1234567");
    }

    @Test
    @DisplayName("엔티티 속성으로 변환 - 알 수 없는 암호문은 원본 노출 없이 fail-closed")
    void convertToEntityAttribute_Exception() throws Exception {
        when(mockCryptoService.decrypt(any(byte[].class), any(String.class))).thenThrow(new RuntimeException("Decryption Error"));

        org.assertj.core.api.Assertions.assertThatThrownBy(
                        () -> converter.convertToEntityAttribute("invalidBase64OrDecrypError"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("decryption failed");
    }

    @Test
    @DisplayName("🚨 ARIA 키 교체 중: 현재 키가 이전 키 암호문을 예외 없이 엉뚱하게 풀어도 이전 키의 주민번호 꼴 결과를 읽는다")
    void ariaKeyRotationPrefersTheCandidateInRrnoFormat() throws Exception {
        // 현재 키는 예외 없이 형식 밖의 바이트를, 이전 키는 원문을 낸다(실제 ARIA 의 성질 — IV·MAC 이 없다).
        when(mockCryptoService.decrypt(any(byte[].class), any(String.class)))
                .thenReturn("\u0001garbage\u0002".getBytes(java.nio.charset.StandardCharsets.UTF_8));
        EgovCryptoService previous = Mockito.mock(EgovCryptoService.class);
        when(previous.decrypt(any(byte[].class), any(String.class)))
                .thenReturn("800101-2234567".getBytes(java.nio.charset.StandardCharsets.UTF_8));
        ReflectionTestUtils.setField(CryptoUtil.class, "previousCryptoService", previous);
        ReflectionTestUtils.setField(CryptoUtil.class, "previousAlgorithmKey", "previous");
        try {
            String stored = java.util.Base64.getEncoder().encodeToString("old-key-ciphertext".getBytes());
            assertThat(converter.convertToEntityAttribute(stored)).isEqualTo("800101-2234567");

            // 둘 다 꼴이 맞으면 현재 키 결과(종전 우선순위)
            when(previous.decrypt(any(byte[].class), any(String.class)))
                    .thenReturn("700101-1234567".getBytes(java.nio.charset.StandardCharsets.UTF_8));
            when(mockCryptoService.decrypt(any(byte[].class), any(String.class)))
                    .thenReturn("900101-1234567".getBytes(java.nio.charset.StandardCharsets.UTF_8));
            assertThat(converter.convertToEntityAttribute(stored)).isEqualTo("900101-1234567");
        } finally {
            ReflectionTestUtils.setField(CryptoUtil.class, "previousCryptoService", null);
            ReflectionTestUtils.setField(CryptoUtil.class, "previousAlgorithmKey", null);
        }
    }

    @Test
    @DisplayName("교체 중이 아니면 형식 밖의 복호 결과도 종전처럼 돌려준다 — 기존 값의 읽기를 새로 막지 않는다")
    void outOfFormatValueWithoutRotationIsReturnedAsBefore() throws Exception {
        when(mockCryptoService.decrypt(any(byte[].class), any(String.class)))
                .thenReturn("9001011234567X".getBytes(java.nio.charset.StandardCharsets.UTF_8));
        String stored = java.util.Base64.getEncoder().encodeToString("legacy".getBytes());
        assertThat(converter.convertToEntityAttribute(stored)).isEqualTo("9001011234567X");
    }

    @Test
    @DisplayName("엔티티 속성으로 변환 - 명확한 레거시 평문 주민번호만 호환")
    void convertToEntityAttribute_LegacyPlaintext() throws Exception {
        when(mockCryptoService.decrypt(any(byte[].class), any(String.class))).thenThrow(new RuntimeException("Decryption Error"));

        assertThat(converter.convertToEntityAttribute("900101-1234567"))
                .isEqualTo("900101-1234567");
    }

    @Test
    @DisplayName("[Wave 4] 키링이 없으면 종전 ARIA 로 쓴다 — 이관 도구 암호문(ADR-0029)과 같은 형식이 유지된다")
    void withoutKeyringWritesLegacyAria() throws Exception {
        when(mockCryptoService.encrypt(any(byte[].class), any(String.class))).thenReturn("aria".getBytes());
        String stored = converter.convertToDatabaseColumn("900101-1234567");
        assertThat(stored).isEqualTo(java.util.Base64.getEncoder().encodeToString("aria".getBytes()));
        assertThat(RrnoKeyring.isEnvelope(stored)).isFalse();
    }

    @Test
    @DisplayName("[Wave 4] 키링을 켜면 새 값은 v2:<keyId> AES-GCM 으로 쓰고 같은 값도 매번 다른 암호문이다")
    void keyringWritesVersionedEnvelopeAndReadsItBack() {
        RrnoKeyring.configure("k1", java.util.Map.of("k1", KEY_A));
        String first = converter.convertToDatabaseColumn("900101-1234567");
        String second = converter.convertToDatabaseColumn("900101-1234567");
        assertThat(first).startsWith("v2:k1:").isNotEqualTo(second).hasSizeLessThanOrEqualTo(256);
        assertThat(converter.convertToEntityAttribute(first)).isEqualTo("900101-1234567");
        Mockito.verifyNoInteractions(mockCryptoService);
    }

    @Test
    @DisplayName("[Wave 4] 키링을 켠 뒤에도 기존 ARIA 암호문과 과거 평문을 그대로 읽는다(기존 행·이관 도구 호환)")
    void keyringStillReadsLegacyAriaAndPlaintext() throws Exception {
        RrnoKeyring.configure("k1", java.util.Map.of("k1", KEY_A));
        when(mockCryptoService.decrypt(any(byte[].class), any(String.class)))
                .thenReturn("900101-1234567".getBytes(java.nio.charset.StandardCharsets.UTF_8));
        String legacy = java.util.Base64.getEncoder().encodeToString("aria-ciphertext".getBytes());
        assertThat(converter.convertToEntityAttribute(legacy)).isEqualTo("900101-1234567");

        when(mockCryptoService.decrypt(any(byte[].class), any(String.class))).thenThrow(new RuntimeException("not aria"));
        assertThat(converter.convertToEntityAttribute("900101-1234567")).isEqualTo("900101-1234567");
    }

    @Test
    @DisplayName("[Wave 4] 키를 바꿔도 키링에 남긴 이전 키의 암호문을 읽고, 새 값은 새 활성 키로 쓴다")
    void rotatedKeyringReadsPreviousKey() {
        RrnoKeyring.configure("k1", java.util.Map.of("k1", KEY_A));
        String old = converter.convertToDatabaseColumn("900101-1234567");
        RrnoKeyring.configure("k2", java.util.Map.of("k1", KEY_A, "k2", KEY_B));
        assertThat(converter.convertToEntityAttribute(old)).isEqualTo("900101-1234567");
        assertThat(converter.convertToDatabaseColumn("900101-1234567")).startsWith("v2:k2:");
    }

    @Test
    @DisplayName("[Wave 4] 키를 모르거나 바뀐 v2 암호문은 평문으로 돌려주지 않고 막는다(fail-closed)")
    void unknownKeyOrTamperedEnvelopeFailsClosed() {
        RrnoKeyring.configure("k1", java.util.Map.of("k1", KEY_A));
        String stored = converter.convertToDatabaseColumn("900101-1234567");
        String tampered = stored.substring(0, stored.length() - 2) + (stored.endsWith("A") ? "BA" : "AA");
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> converter.convertToEntityAttribute(tampered))
                .isInstanceOf(IllegalStateException.class);
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> converter.convertToEntityAttribute(stored.replace("v2:k1:", "v2:k1x:")))
                .as("키 ID 를 바꾸면 인증 데이터가 달라 풀리지 않는다").isInstanceOf(IllegalStateException.class);

        RrnoKeyring.configure("k2", java.util.Map.of("k2", KEY_B));
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> converter.convertToEntityAttribute(stored))
                .as("이전 키를 키링에서 빼면 그 암호문은 읽지 못한다").isInstanceOf(IllegalStateException.class);
        RrnoKeyring.configure(null, null);
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> converter.convertToEntityAttribute(stored))
                .as("키링을 끈 채 v2 값을 만나면 ARIA·평문으로 오인하지 않는다").isInstanceOf(IllegalStateException.class);
        Mockito.verifyNoInteractions(mockCryptoService);
    }

    @Test
    @DisplayName("[Wave 4] 키링 구성은 활성 키·256-bit 표준 Base64 만 받는다")
    void keyringConfigurationIsStrict() {
        for (Runnable invalid : java.util.List.<Runnable>of(
                () -> RrnoKeyring.configure("k1", java.util.Map.of()),
                () -> RrnoKeyring.configure(null, java.util.Map.of("k1", KEY_A)),
                () -> RrnoKeyring.configure("k2", java.util.Map.of("k1", KEY_A)),
                () -> RrnoKeyring.configure("k:1", java.util.Map.of("k:1", KEY_A)),
                () -> RrnoKeyring.configure("k1", java.util.Map.of("k1", java.util.Base64.getEncoder().encodeToString(new byte[16]))))) {
            org.assertj.core.api.Assertions.assertThatThrownBy(invalid::run).isInstanceOf(IllegalArgumentException.class);
        }
        assertThat(RrnoKeyring.active()).isFalse();
    }

    // ── [2026-11-25 품질 평가 3순위 14] 키링 경계값 — 변이 시험이 경계 비교와 예외 종류를 놓치던 자리 ─────────────────

    @Test
    @DisplayName("키링은 키 16개까지 받고 17개면 기동을 멈춘다")
    void keyringAcceptsAtMostSixteenKeys() {
        java.util.Map<String, String> sixteen = new java.util.HashMap<>();
        for (int index = 0; index < 16; index++) sixteen.put("k" + index, KEY_A);
        RrnoKeyring.configure("k0", sixteen);
        assertThat(RrnoKeyring.active()).isTrue();

        java.util.Map<String, String> seventeen = new java.util.HashMap<>(sixteen);
        seventeen.put("k16", KEY_A);
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> RrnoKeyring.configure("k0", seventeen))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Invalid rrno encryption keyring");
    }

    @Test
    @DisplayName("빈 평문의 암호문(인증 태그 16바이트뿐)은 풀지 않는다 — 1바이트 평문은 푼다")
    void ciphertextMustCarryMoreThanTheAuthenticationTag() {
        RrnoKeyring.configure("k1", java.util.Map.of("k1", KEY_A));

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> RrnoKeyring.decrypt(RrnoKeyring.encrypt("")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Invalid rrno ciphertext");
        assertThat(RrnoKeyring.decrypt(RrnoKeyring.encrypt("1"))).isEqualTo("1");
    }

    @Test
    @DisplayName("인증 태그가 맞지 않는 암호문은 같은 형식 오류로 거부한다 — 다른 예외로 새지 않는다")
    void tamperedCiphertextFailsWithTheCiphertextError() {
        RrnoKeyring.configure("k1", java.util.Map.of("k1", KEY_A));
        String envelope = RrnoKeyring.encrypt("9001011234567");
        String[] parts = envelope.split(":", -1);
        byte[] body = java.util.Base64.getUrlDecoder().decode(parts[3]);
        body[0] ^= 0x01;
        String tampered = String.join(":", parts[0], parts[1], parts[2], java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(body));

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> RrnoKeyring.decrypt(tampered))
                .isExactlyInstanceOf(IllegalArgumentException.class)
                .hasMessage("Invalid rrno ciphertext");
    }

    @Test
    @DisplayName("봉투 길이 상한은 256자다 — 정확히 256자인 정상 봉투는 풀고, 정상 암호화로 만든 257자 봉투는 거부한다")
    void envelopeLengthLimitIsInclusive() {
        // 봉투 = "v2:" + 키 ID + ":" + 논스 16자 + ":" + 본문(URL 안전 Base64, 덧붙임 없음). 평문 길이로 봉투 길이를 맞춘다.
        RrnoKeyring.configure("abc", java.util.Map.of("abc", KEY_A));
        String atLimit = envelopeOfLength(256);
        assertThat(atLimit).hasSize(256);
        assertThat(RrnoKeyring.decrypt(atLimit)).isNotEmpty();

        // 257자도 형식·인증 태그는 맞는 봉투다 — 길이 검사가 없으면 풀리므로 이 거부는 길이 상한에서만 나온다. 덧붙임 없는 Base64 는
        //   4로 나눠 1이 남는 길이가 없어, 키 ID 를 4자로 바꿔 만든다.
        RrnoKeyring.configure("abcd", java.util.Map.of("abcd", KEY_A));
        String overLimit = envelopeOfLength(257);
        assertThat(overLimit).hasSize(257);
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> RrnoKeyring.decrypt(overLimit))
                .isExactlyInstanceOf(IllegalArgumentException.class)
                .hasMessage("Invalid rrno ciphertext");
    }

    /** 평문 길이를 늘려 가며 정확히 {@code length} 자인 봉투를 만든다(Base64 4자 단위라 평문 3바이트마다 4자씩 는다). */
    private static String envelopeOfLength(int length) {
        for (int size = 1; size < 200; size++) {
            String envelope = RrnoKeyring.encrypt("x".repeat(size));
            if (envelope.length() == length) return envelope;
        }
        throw new IllegalStateException("no envelope of length " + length);
    }
}
