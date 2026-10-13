package nuri.migration.protect;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Base64;

/**
 * 온라인 앱의 주민번호 암호문과 같은 값을 만드는 컬럼 암호({@code aria-egov-v1}, DEC-OPS-308).
 *
 * <p>온라인 앱은 {@code RrnoEncryptionConverter} → {@code CryptoUtil} → eGovFrame {@code EgovARIACryptoServiceImpl}
 * → {@code ARIACipher} 로 암호화한다. 이 클래스는 그 결과를 실행 의존 없이 같은 규칙으로 재현한다.
 * <ul>
 *   <li>키: 키 문자열이 32자(UTF-16 코드 단위)를 넘으면 앞 32자만 쓴다. UTF-8 바이트를 32바이트 경계로 채우고
 *       (아래 패딩 규칙) 앞 32바이트를 ARIA-256 키로 쓴다. 온라인 앱의 {@code String.getBytes()} 는 기본 문자셋을
 *       쓰므로 JDK 18 이상(UTF-8 기본, JEP 400)을 전제로 한다.</li>
 *   <li>패딩(eGov ANSI X.923 변형): 길이가 블록의 배수가 아니면 0 을 채우고 마지막 바이트에 채운 개수를 둔다.
 *       배수이면 채우지 않는다. 복호화는 마지막 바이트 v 가 0~15 이고 끝에서 둘째 바이트까지 v-1 개가 모두 0 이면
 *       v 바이트를 걷어 낸다. 온라인 구현의 분기를 같은 결과의 식으로 옮긴 것이다.</li>
 *   <li>모드·인코딩: 블록마다 독립인 ECB, IV 없음(같은 키·값이면 같은 암호문), 값은 UTF-8, 암호문은 표준 Base64.</li>
 * </ul>
 *
 * <p>같은 결과는 {@code OnlineRrnoConverterContractTest} 가 온라인 변환기를 직접 돌려 증명한다.
 */
public final class EgovAriaColumnCipher implements ColumnCipher {

    /** 온라인 {@code ARIACipher} 가 키 문자열을 자르는 길이. */
    static final int KEY_CHARS = 32;

    private final AriaEngine engine;

    public EgovAriaColumnCipher(String key) {
        if (key == null || key.isBlank()) {
            throw new IllegalArgumentException("ARIA 키가 비어 있습니다");
        }
        engine = new AriaEngine(deriveKey(key));
    }

    /** 온라인 {@code ARIACipher.setPassword} + {@code AnsiX923Padding.addPadding(.., 32)} 과 같은 키 바이트. */
    static byte[] deriveKey(String key) {
        String truncated = key.length() > KEY_CHARS ? key.substring(0, KEY_CHARS) : key;
        byte[] padded = pad(truncated.getBytes(StandardCharsets.UTF_8), AriaEngine.KEY_BYTES);
        return Arrays.copyOf(padded, AriaEngine.KEY_BYTES);
    }

    @Override
    public String encrypt(String plaintext) {
        byte[] data = pad(plaintext.getBytes(StandardCharsets.UTF_8), AriaEngine.BLOCK_BYTES);
        byte[] out = new byte[data.length];
        for (int offset = 0; offset < data.length; offset += AriaEngine.BLOCK_BYTES) {
            byte[] block = engine.encryptBlock(Arrays.copyOfRange(data, offset, offset + AriaEngine.BLOCK_BYTES));
            System.arraycopy(block, 0, out, offset, AriaEngine.BLOCK_BYTES);
        }
        return Base64.getEncoder().encodeToString(out);
    }

    @Override
    public String decrypt(String ciphertext) {
        byte[] data;
        try {
            data = Base64.getDecoder().decode(ciphertext);
        } catch (IllegalArgumentException notBase64) {
            throw new IllegalArgumentException("ARIA 암호문 형식이 아닙니다");
        }
        if (data.length == 0 || data.length % AriaEngine.BLOCK_BYTES != 0) {
            throw new IllegalArgumentException("ARIA 암호문 형식이 아닙니다");
        }
        byte[] out = new byte[data.length];
        for (int offset = 0; offset < data.length; offset += AriaEngine.BLOCK_BYTES) {
            byte[] block = engine.decryptBlock(Arrays.copyOfRange(data, offset, offset + AriaEngine.BLOCK_BYTES));
            System.arraycopy(block, 0, out, offset, AriaEngine.BLOCK_BYTES);
        }
        return new String(unpad(out), StandardCharsets.UTF_8);
    }

    /** 길이가 블록의 배수가 아니면 0 을 채우고 마지막 바이트에 채운 개수를 둔다. 배수이면 그대로 둔다. */
    static byte[] pad(byte[] source, int block) {
        int remainder = source.length % block;
        if (remainder == 0) {
            return source;
        }
        int count = block - remainder;
        byte[] padded = Arrays.copyOf(source, source.length + count);
        padded[padded.length - 1] = (byte) count;
        return padded;
    }

    /** 마지막 바이트 v(부호 있음)가 0~15 이고 그 앞 v-1 바이트가 모두 0 이면 v 바이트를 걷는다. */
    static byte[] unpad(byte[] source) {
        int count = source[source.length - 1];
        if (count < 0 || count >= AriaEngine.BLOCK_BYTES) {
            return source;
        }
        for (int index = source.length - count; index < source.length - 1; index++) {
            if (source[index] != 0) {
                return source;
            }
        }
        return Arrays.copyOf(source, source.length - count);
    }
}
