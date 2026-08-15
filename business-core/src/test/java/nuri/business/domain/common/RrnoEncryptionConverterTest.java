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
    @DisplayName("엔티티 속성으로 변환 - 명확한 레거시 평문 주민번호만 호환")
    void convertToEntityAttribute_LegacyPlaintext() throws Exception {
        when(mockCryptoService.decrypt(any(byte[].class), any(String.class))).thenThrow(new RuntimeException("Decryption Error"));

        assertThat(converter.convertToEntityAttribute("900101-1234567"))
                .isEqualTo("900101-1234567");
    }
}
