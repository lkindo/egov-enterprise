package nuri.migration.protect;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.HexFormat;
import java.util.Random;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** 독자 구현 ARIA-256 이 표준 시험 벡터(RFC 5794 부록 A.3)와 같은 값을 내는지 본다(DEC-OPS-308). */
@DisplayName("ARIA-256 블록 암호 — RFC 5794 시험 벡터")
class AriaEngineTest {

    private static final HexFormat HEX = HexFormat.of();

    @Test
    @DisplayName("RFC 5794 A.3 의 256비트 키 벡터를 암호화·복호화한다")
    void matchesRfc5794KnownAnswer() {
        AriaEngine engine = new AriaEngine(HEX.parseHex(
                "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f"));
        byte[] plaintext = HEX.parseHex("00112233445566778899aabbccddeeff");

        byte[] ciphertext = engine.encryptBlock(plaintext);

        assertThat(HEX.formatHex(ciphertext)).isEqualTo("f92bd7c79fb72e2f2b8f80c1972d24fc");
        assertThat(engine.decryptBlock(ciphertext)).isEqualTo(plaintext);
    }

    @Test
    @DisplayName("임의 키·블록에서 복호화가 암호화를 되돌린다")
    void decryptionInvertsEncryption() {
        Random random = new Random(20261013L);
        for (int i = 0; i < 64; i++) {
            byte[] key = new byte[AriaEngine.KEY_BYTES];
            byte[] block = new byte[AriaEngine.BLOCK_BYTES];
            random.nextBytes(key);
            random.nextBytes(block);
            AriaEngine engine = new AriaEngine(key);
            byte[] ciphertext = engine.encryptBlock(block);
            assertThat(ciphertext).isNotEqualTo(block);
            assertThat(engine.decryptBlock(ciphertext)).isEqualTo(block);
        }
    }

    @Test
    @DisplayName("확산 계층은 대합이고, 128비트 회전은 바이트 0 을 최상위로 둔다")
    void diffusionIsAnInvolutionAndRotationIsBigEndian() {
        int[] value = new int[AriaEngine.BLOCK_BYTES];
        for (int i = 0; i < value.length; i++) {
            value[i] = (i * 37 + 11) & 0xFF;
        }
        assertThat(AriaEngine.diffuse(AriaEngine.diffuse(value))).isEqualTo(value);
        assertThat(AriaEngine.diffuse(value)).isNotEqualTo(value);

        int[] lowestBit = new int[AriaEngine.BLOCK_BYTES];
        lowestBit[15] = 1;
        int[] rotated = AriaEngine.rotateRight(lowestBit, 1);
        assertThat(rotated[0]).isEqualTo(0x80);
        assertThat(rotated[15]).isZero();
        assertThat(AriaEngine.rotateRight(value, 128 - 19)).isNotEqualTo(value);
        assertThat(AriaEngine.rotateRight(AriaEngine.rotateRight(value, 19), 109)).isEqualTo(value);
        assertThat(AriaEngine.rotateRight(value, 8)[1]).isEqualTo(value[0]);
    }

    @Test
    @DisplayName("키는 32바이트, 블록은 16바이트만 받는다")
    void rejectsWrongLengths() {
        assertThatThrownBy(() -> new AriaEngine(new byte[16]))
                .isInstanceOf(IllegalArgumentException.class).hasMessage("ARIA-256 키는 32바이트여야 합니다");
        assertThatThrownBy(() -> new AriaEngine(null))
                .isInstanceOf(IllegalArgumentException.class).hasMessage("ARIA-256 키는 32바이트여야 합니다");
        AriaEngine engine = new AriaEngine(new byte[AriaEngine.KEY_BYTES]);
        assertThatThrownBy(() -> engine.encryptBlock(new byte[15]))
                .isInstanceOf(IllegalArgumentException.class).hasMessage("ARIA 블록은 16바이트여야 합니다");
        assertThatThrownBy(() -> engine.decryptBlock(null))
                .isInstanceOf(IllegalArgumentException.class).hasMessage("ARIA 블록은 16바이트여야 합니다");
    }
}
