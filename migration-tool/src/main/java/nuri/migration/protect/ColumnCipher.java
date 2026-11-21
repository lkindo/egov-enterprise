package nuri.migration.protect;

/** 한 보호 방식의 컬럼 값 암호화·복호화. 구현은 키나 값을 메시지·로그·{@code toString} 에 담지 않는다. */
interface ColumnCipher {

    String encrypt(String plaintext);

    String decrypt(String ciphertext);

    /** 같은 평문을 다시 암호화하면 암호문이 달라지는가(무작위 nonce). */
    default boolean randomized() {
        return false;
    }

    /** 대상에 저장된 암호문의 행 체크섬 값. 결정적 암호는 암호문 그대로다. */
    default String checksumToken(String ciphertext) {
        return ciphertext;
    }

    /** 무작위 nonce 암호의 평문 지문(체크섬 표지). 결정적 암호는 암호문을 그대로 체크섬에 넣으므로 쓰지 않는다. */
    default String plaintextFingerprint(String plaintext) {
        throw new UnsupportedOperationException("결정적 암호는 평문 지문을 쓰지 않습니다");
    }
}
