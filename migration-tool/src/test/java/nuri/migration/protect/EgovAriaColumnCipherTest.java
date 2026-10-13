package nuri.migration.protect;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 온라인 앱과 같은 주민번호 암호문 규칙(DEC-OPS-308).
 *
 * <p>고정 벡터는 eGovFrame 5.0.0 {@code ARIACipher}(온라인 앱이 쓰는 구현)로 만든 값이다. 같은 대조를 온라인 원본으로
 * 직접 하는 시험은 {@link OnlineRrnoConverterContractTest} 다. 이 시험은 그 계약 없이도(이관 단독 제품 등) 규칙의
 * 회귀를 잡는다.
 */
@DisplayName("eGov ARIA 컬럼 암호 — 온라인 앱과 같은 암호문")
class EgovAriaColumnCipherTest {

    @ParameterizedTest(name = "{0} / {1}")
    @CsvSource(delimiter = '|', value = {
            "migration-contract-key | 800101-1234567 | 3cgPhvPm+Ai7gYZyqaBCag==",
            "migration-contract-key | 8001011234567 | Q2I9M8rnEeKuVGJxyIb0cw==",
            "migration-contract-key | 0123456789abcdef | Favow+gVhMKUFK9haegOrA==",
            "migration-contract-key | 가나다 | 3N/q/83F9mzavJV5pM5hZA==",
            "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk | 800101-1234567 | NvWeV4d33Uft7qd7LPDDnw==",
            "0123456789abcdef0123456789abcdef | 800101-1234567 | NaXBCHz53eK6TO8V7DoYkA==",
            "0123456789abcdef0123456789abcdefTAIL | 800101-1234567 | NaXBCHz53eK6TO8V7DoYkA=="
    })
    @DisplayName("eGov ARIACipher 와 같은 암호문을 만들고 되읽는다")
    void matchesEgovVectors(String key, String plaintext, String expected) {
        EgovAriaColumnCipher cipher = new EgovAriaColumnCipher(key);

        assertThat(cipher.encrypt(plaintext)).isEqualTo(expected);
        assertThat(cipher.decrypt(expected)).isEqualTo(plaintext);
    }

    @Test
    @DisplayName("키는 32자를 넘으면 자르고, 짧으면 ANSI X.923 변형으로 32바이트를 채운다")
    void derivesTheOnlineKeyBytes() {
        byte[] shortKey = EgovAriaColumnCipher.deriveKey("abc");
        assertThat(shortKey).hasSize(32);
        assertThat(new String(shortKey, 0, 3, StandardCharsets.UTF_8)).isEqualTo("abc");
        assertThat(shortKey[3]).isZero();
        assertThat(shortKey[30]).isZero();
        assertThat(shortKey[31]).isEqualTo((byte) 29);

        assertThat(EgovAriaColumnCipher.deriveKey("x".repeat(31))[31]).isEqualTo((byte) 1);
        assertThat(EgovAriaColumnCipher.deriveKey("y".repeat(32))).isEqualTo("y".repeat(32).getBytes(StandardCharsets.UTF_8));
        assertThat(EgovAriaColumnCipher.deriveKey("z".repeat(40))).isEqualTo("z".repeat(32).getBytes(StandardCharsets.UTF_8));
        // 32자 안이지만 UTF-8 로 32바이트를 넘는 키는 앞 32바이트를 쓴다.
        byte[] multibyte = EgovAriaColumnCipher.deriveKey("가".repeat(11));
        assertThat(multibyte).isEqualTo(java.util.Arrays.copyOf("가".repeat(11).getBytes(StandardCharsets.UTF_8), 32));
    }

    @Test
    @DisplayName("데이터는 16바이트 배수가 아닐 때만 채우고, 같은 키·값이면 같은 암호문이다")
    void padsOnlyPartialBlocksAndIsDeterministic() {
        byte[] partial = EgovAriaColumnCipher.pad(new byte[] {1, 2, 3}, 16);
        assertThat(partial).hasSize(16);
        assertThat(partial[3]).isZero();
        assertThat(partial[15]).isEqualTo((byte) 13);
        byte[] full = new byte[16];
        assertThat(EgovAriaColumnCipher.pad(full, 16)).isSameAs(full);
        assertThat(EgovAriaColumnCipher.pad(new byte[17], 16)).hasSize(32);

        EgovAriaColumnCipher cipher = new EgovAriaColumnCipher("migration-contract-key");
        assertThat(cipher.encrypt("800101-1234567")).isEqualTo(cipher.encrypt("800101-1234567"));
        assertThat(Base64.getDecoder().decode(cipher.encrypt("0123456789abcdefg"))).hasSize(32);
        assertThat(cipher.encrypt("")).isEmpty();
    }

    @Test
    @DisplayName("복호화는 온라인 구현과 같은 규칙으로 채움을 걷는다")
    void unpadsLikeTheOnlineImplementation() {
        assertThat(EgovAriaColumnCipher.unpad(block(0, 0, 2))).hasSize(14);
        // 마지막 바이트가 1 이면 앞 바이트를 보지 않고 1바이트를 걷는다(온라인 구현의 규칙).
        assertThat(EgovAriaColumnCipher.unpad(block(7, 7, 1))).hasSize(15);
        assertThat(EgovAriaColumnCipher.unpad(block(7, 7, 15))).hasSize(16);
        assertThat(EgovAriaColumnCipher.unpad(block(0, 0, 15))).hasSize(16);
        byte[] fifteen = new byte[16];
        fifteen[0] = 9;
        fifteen[15] = 15;
        assertThat(EgovAriaColumnCipher.unpad(fifteen)).hasSize(1);
        assertThat(EgovAriaColumnCipher.unpad(block(0, 0, 3))).hasSize(13);
        assertThat(EgovAriaColumnCipher.unpad(block(0, 7, 3))).hasSize(16);
        assertThat(EgovAriaColumnCipher.unpad(block(7, 0, 3))).hasSize(16);
        assertThat(EgovAriaColumnCipher.unpad(block(0, 0, 16))).hasSize(16);
        byte[] sixteen = new byte[16];
        sixteen[15] = 16;
        assertThat(EgovAriaColumnCipher.unpad(sixteen)).as("16 이상은 채움이 아니다").hasSize(16);
        assertThat(EgovAriaColumnCipher.unpad(block(0, 0, -3))).hasSize(16);
        assertThat(EgovAriaColumnCipher.unpad(block(5, 5, 0))).hasSize(16);
    }

    @Test
    @DisplayName("암호문 형식이 아니면 복호화하지 않고, 키가 비면 만들지 않는다")
    void rejectsMalformedInputWithoutEchoingIt() {
        EgovAriaColumnCipher cipher = new EgovAriaColumnCipher("migration-contract-key");
        assertThatThrownBy(() -> cipher.decrypt("800101-1234567"))
                .isInstanceOf(IllegalArgumentException.class).hasMessage("ARIA 암호문 형식이 아닙니다");
        assertThatThrownBy(() -> cipher.decrypt(""))
                .isInstanceOf(IllegalArgumentException.class).hasMessage("ARIA 암호문 형식이 아닙니다");
        assertThatThrownBy(() -> cipher.decrypt("AAAA"))
                .isInstanceOf(IllegalArgumentException.class).hasMessage("ARIA 암호문 형식이 아닙니다");
        assertThatThrownBy(() -> new EgovAriaColumnCipher(" "))
                .isInstanceOf(IllegalArgumentException.class).hasMessage("ARIA 키가 비어 있습니다");
        assertThatThrownBy(() -> new EgovAriaColumnCipher(null))
                .isInstanceOf(IllegalArgumentException.class).hasMessage("ARIA 키가 비어 있습니다");
    }

    /** 16바이트 블록. 끝 세 바이트를 (앞, 가운데, 마지막) 값으로 둔다. */
    private static byte[] block(int beforeMiddle, int middle, int last) {
        byte[] block = new byte[16];
        java.util.Arrays.fill(block, (byte) 'A');
        block[13] = (byte) beforeMiddle;
        block[14] = (byte) middle;
        block[15] = (byte) last;
        return block;
    }
}
