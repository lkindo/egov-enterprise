package egovframework.com.utl.sim.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import java.nio.file.Files;
import java.nio.file.Path;
import static org.assertj.core.api.Assertions.assertThat;

class EgovFileScrtyTest {

    @TempDir
    Path tempDir;

    @Test
    @DisplayName("파일 암호화(Base64) 및 복호화 테스트")
    void fileEncryptionTest() throws Exception {
        // Given
        Path sourcePath = tempDir.resolve("source.txt");
        Path targetPath = tempDir.resolve("encrypted.txt");
        Path decryptedPath = tempDir.resolve("decrypted.txt");

        String originalContent = "Hello eGovFrame! This is a secret message.";
        Files.writeString(sourcePath, originalContent);

        // When (Encryption)
        boolean encryptResult = EgovFileScrty.encryptFile(sourcePath.toString(), targetPath.toString());

        // Then
        assertThat(encryptResult).isTrue();
        assertThat(targetPath).exists();
        assertThat(Files.readString(targetPath)).isNotEqualTo(originalContent);

        // When (Decryption)
        boolean decryptResult = EgovFileScrty.decryptFile(targetPath.toString(), decryptedPath.toString());

        // Then
        assertThat(decryptResult).isTrue();
        assertThat(decryptedPath).exists();
        // Base64 encoding used in encryptFile adds line separators, so we might need to trim or compare carefully
        assertThat(Files.readString(decryptedPath).trim()).isEqualTo(originalContent);
    }

    @Test
    @DisplayName("비밀번호 일치 확인 테스트")
    void checkPasswordTest() throws Exception {
        String password = "password123";
        byte[] salt = "salt".getBytes();
        String encoded = EgovFileScrty.encryptPassword(password, salt);

        assertThat(EgovFileScrty.checkPassword(password, encoded, salt)).isTrue();
        assertThat(EgovFileScrty.checkPassword("wrong", encoded, salt)).isFalse();
    }

    @Test
    @DisplayName("문자열 인코딩 및 디코딩 테스트")
    void encodeDecodeTest() throws Exception {
        String original = "eGovFrame 현대화";
        String encoded = EgovFileScrty.encode(original);
        String decoded = EgovFileScrty.decode(encoded);

        assertThat(encoded).isNotEqualTo(original);
        assertThat(decoded).isEqualTo(original);
    }

    @Test
    @DisplayName("ID 기반 비밀번호 암호화 테스트")
    void encryptPasswordWithIdTest() throws Exception {
        String password = "password123";
        String id = "user01";

        String encrypted = EgovFileScrty.encryptPassword(password, id);
        assertThat(encrypted).isNotNull();
        assertThat(encrypted).isNotEqualTo(password);
    }

    @Test
    @DisplayName("null 입력 시 빈 문자열 반환 확인")
    @SuppressWarnings("deprecation")
    void nullInputTest() throws Exception {
        assertThat(EgovFileScrty.encodeBinary(null)).isEqualTo("");
        assertThat(EgovFileScrty.encryptPassword(null)).isEqualTo("");
        assertThat(EgovFileScrty.encryptPassword(null, "id")).isEqualTo("");
        assertThat(EgovFileScrty.encryptPassword(null, new byte[0])).isEqualTo("");
    }
}
