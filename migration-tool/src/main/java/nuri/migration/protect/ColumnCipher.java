package nuri.migration.protect;

/** 한 보호 방식의 컬럼 값 암호화·복호화. 구현은 키나 값을 메시지·로그·{@code toString} 에 담지 않는다. */
interface ColumnCipher {

    String encrypt(String plaintext);

    String decrypt(String ciphertext);
}
