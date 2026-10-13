package nuri.migration.protect;

/**
 * ARIA-256 블록 암호(KS X 1213-1, RFC 5794)의 이관 도구 독자 구현(DEC-OPS-308).
 *
 * <p>16바이트 블록 하나를 암호화·복호화한다. 운영 모드·패딩·키 유도·인코딩은 {@link EgovAriaColumnCipher} 가 정한다.
 * 온라인 앱(eGovFrame {@code ARIAEngine})의 코드를 쓰지 않는다 — 실행 시 foundation·business-core·eGovFrame 에
 * 의존하지 않기 위해서다(DEC-OPS-005). 같은 결과는 RFC 5794 시험 벡터와 온라인 변환기 호환 계약 시험이 증명한다.
 *
 * <p>S-box 는 표를 옮겨 적지 않고 정의식으로 만든다. SB1 은 GF(2^8)(기약 다항식 0x11B)의 역원에 AES 아핀 변환을,
 * SB2 는 x^247 에 ARIA 의 아핀 행렬 B 와 상수 0xE2 를 적용한다. SB3·SB4 는 각각의 역치환이다.
 */
final class AriaEngine {

    static final int BLOCK_BYTES = 16;
    static final int KEY_BYTES = 32;

    /** ARIA-256 의 라운드 수. 라운드 키는 이보다 하나 많다. */
    private static final int ROUNDS = 16;

    private static final int[] SB1 = new int[256];
    private static final int[] SB2 = new int[256];
    private static final int[] SB3 = new int[256];
    private static final int[] SB4 = new int[256];

    /** SB2 아핀 행렬 B 의 행(출력 비트 i). 비트 j 가 입력 비트 j 의 계수다. */
    private static final int[] SB2_ROWS = {0x7A, 0xBC, 0xEB, 0xB9, 0x34, 0x81, 0xBA, 0xCB};

    /** 키 확장 상수 C1·C2·C3(1/π 의 소수부). 256비트 키는 CK1=C3, CK2=C1, CK3=C2 를 쓴다. */
    private static final int[] C1 = hex("517cc1b727220a94fe13abe8fa9a6ee0");
    private static final int[] C2 = hex("6db14acc9e21c820ff28b1d5ef5de2b0");
    private static final int[] C3 = hex("db92371d2126e9700324977504e8c90e");

    /** 라운드 키 ek(4g+k) = W(k) ^ (W(k+1) 를 오른쪽으로 ROTATIONS[g] 비트 회전). 왼쪽 회전은 128-n 으로 바꿨다. */
    private static final int[] ROTATIONS = {19, 31, 67, 97, 109};

    /** 확산 계층 A: 출력 바이트 i 는 이 입력 바이트들의 XOR 다(대합 — A(A(x)) = x). */
    private static final int[][] DIFFUSION = {
            {3, 4, 6, 8, 9, 13, 14},
            {2, 5, 7, 8, 9, 12, 15},
            {1, 4, 6, 10, 11, 12, 15},
            {0, 5, 7, 10, 11, 13, 14},
            {0, 2, 5, 8, 11, 14, 15},
            {1, 3, 4, 9, 10, 14, 15},
            {0, 2, 7, 9, 10, 12, 13},
            {1, 3, 6, 8, 11, 12, 13},
            {0, 1, 4, 7, 10, 13, 15},
            {0, 1, 5, 6, 11, 12, 14},
            {2, 3, 5, 6, 8, 13, 15},
            {2, 3, 4, 7, 9, 12, 14},
            {1, 2, 6, 7, 9, 11, 12},
            {0, 3, 6, 7, 8, 10, 13},
            {0, 3, 4, 5, 9, 11, 14},
            {1, 2, 4, 5, 8, 10, 15}
    };

    static {
        for (int x = 0; x < 256; x++) {
            SB1[x] = aesAffine(power(x, 254));
            SB2[x] = ariaAffine(power(x, 247));
        }
        for (int x = 0; x < 256; x++) {
            SB3[SB1[x]] = x;
            SB4[SB2[x]] = x;
        }
    }

    private final int[][] encryptionKeys;
    private final int[][] decryptionKeys;

    AriaEngine(byte[] key) {
        if (key == null || key.length != KEY_BYTES) {
            throw new IllegalArgumentException("ARIA-256 키는 32바이트여야 합니다");
        }
        int[] left = new int[BLOCK_BYTES];
        int[] right = new int[BLOCK_BYTES];
        for (int i = 0; i < BLOCK_BYTES; i++) {
            left[i] = key[i] & 0xFF;
            right[i] = key[BLOCK_BYTES + i] & 0xFF;
        }
        int[][] w = new int[4][];
        w[0] = left;
        w[1] = xor(roundFunction(w[0], C3, true), right);
        w[2] = xor(roundFunction(w[1], C1, false), w[0]);
        w[3] = xor(roundFunction(w[2], C2, true), w[1]);
        encryptionKeys = new int[ROUNDS + 1][];
        for (int n = 0; n <= ROUNDS; n++) {
            int k = n % 4;
            encryptionKeys[n] = xor(w[k], rotateRight(w[(k + 1) % 4], ROTATIONS[n / 4]));
        }
        decryptionKeys = new int[ROUNDS + 1][];
        decryptionKeys[0] = encryptionKeys[ROUNDS];
        for (int n = 1; n < ROUNDS; n++) {
            decryptionKeys[n] = diffuse(encryptionKeys[ROUNDS - n]);
        }
        decryptionKeys[ROUNDS] = encryptionKeys[0];
    }

    byte[] encryptBlock(byte[] block) {
        return crypt(block, encryptionKeys);
    }

    byte[] decryptBlock(byte[] block) {
        return crypt(block, decryptionKeys);
    }

    private static byte[] crypt(byte[] block, int[][] roundKeys) {
        if (block == null || block.length != BLOCK_BYTES) {
            throw new IllegalArgumentException("ARIA 블록은 16바이트여야 합니다");
        }
        int[] state = new int[BLOCK_BYTES];
        for (int i = 0; i < BLOCK_BYTES; i++) {
            state[i] = block[i] & 0xFF;
        }
        for (int round = 0; round < ROUNDS - 1; round++) {
            state = roundFunction(state, roundKeys[round], round % 2 == 0);
        }
        state = substitute(xor(state, roundKeys[ROUNDS - 1]), false);
        state = xor(state, roundKeys[ROUNDS]);
        byte[] out = new byte[BLOCK_BYTES];
        for (int i = 0; i < BLOCK_BYTES; i++) {
            out[i] = (byte) state[i];
        }
        return out;
    }

    /** 홀수 라운드 FO(SL1) 또는 짝수 라운드 FE(SL2): A(SL(D ^ RK)). */
    private static int[] roundFunction(int[] data, int[] roundKey, boolean odd) {
        return diffuse(substitute(xor(data, roundKey), odd));
    }

    /** SL1 은 SB1·SB2·SB3·SB4, SL2 는 SB3·SB4·SB1·SB2 를 네 바이트마다 되풀이한다. */
    private static int[] substitute(int[] data, boolean odd) {
        int[][] boxes = odd
                ? new int[][] {SB1, SB2, SB3, SB4}
                : new int[][] {SB3, SB4, SB1, SB2};
        int[] out = new int[BLOCK_BYTES];
        for (int i = 0; i < BLOCK_BYTES; i++) {
            out[i] = boxes[i % 4][data[i]];
        }
        return out;
    }

    static int[] diffuse(int[] data) {
        int[] out = new int[BLOCK_BYTES];
        for (int i = 0; i < BLOCK_BYTES; i++) {
            int value = 0;
            for (int input : DIFFUSION[i]) {
                value ^= data[input];
            }
            out[i] = value;
        }
        return out;
    }

    private static int[] xor(int[] a, int[] b) {
        int[] out = new int[BLOCK_BYTES];
        for (int i = 0; i < BLOCK_BYTES; i++) {
            out[i] = a[i] ^ b[i];
        }
        return out;
    }

    /** 128비트 값을 오른쪽으로 bits 만큼 회전한다. 바이트 0 이 최상위다. */
    static int[] rotateRight(int[] data, int bits) {
        int byteShift = bits / 8;
        int bitShift = bits % 8;
        int[] out = new int[BLOCK_BYTES];
        for (int i = 0; i < BLOCK_BYTES; i++) {
            int current = data[(i - byteShift + 2 * BLOCK_BYTES) % BLOCK_BYTES];
            int previous = data[(i - byteShift - 1 + 2 * BLOCK_BYTES) % BLOCK_BYTES];
            out[i] = ((current >>> bitShift) | (previous << (8 - bitShift))) & 0xFF;
        }
        return out;
    }

    private static int aesAffine(int b) {
        return b ^ rotateLeft8(b, 1) ^ rotateLeft8(b, 2) ^ rotateLeft8(b, 3) ^ rotateLeft8(b, 4) ^ 0x63;
    }

    private static int ariaAffine(int b) {
        int out = 0;
        for (int bit = 0; bit < 8; bit++) {
            out |= (Integer.bitCount(SB2_ROWS[bit] & b) & 1) << bit;
        }
        return out ^ 0xE2;
    }

    private static int rotateLeft8(int b, int bits) {
        return ((b << bits) | (b >>> (8 - bits))) & 0xFF;
    }

    /** GF(2^8) 거듭제곱. 0 의 거듭제곱은 0 이라 0 의 "역원"도 0 이 된다(AES·ARIA 정의와 같다). */
    private static int power(int base, int exponent) {
        int result = 1;
        for (int i = 0; i < exponent; i++) {
            result = multiply(result, base);
        }
        return result;
    }

    private static int multiply(int a, int b) {
        int product = 0;
        int multiplicand = a;
        for (int multiplier = b; multiplier != 0; multiplier >>>= 1) {
            if ((multiplier & 1) != 0) {
                product ^= multiplicand;
            }
            multiplicand <<= 1;
            if ((multiplicand & 0x100) != 0) {
                multiplicand ^= 0x11B;
            }
        }
        return product;
    }

    private static int[] hex(String value) {
        int[] out = new int[value.length() / 2];
        for (int i = 0; i < out.length; i++) {
            out[i] = Integer.parseInt(value.substring(2 * i, 2 * i + 2), 16);
        }
        return out;
    }
}
