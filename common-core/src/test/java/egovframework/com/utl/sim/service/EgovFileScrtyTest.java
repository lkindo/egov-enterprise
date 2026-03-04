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
    @DisplayName("비밀번호 암호화(해시) 테스트")
    void passwordEncryptionTest() throws Exception {
        String password = "password123";
        String salt = "salt";

        String encrypted = EgovFileScrty.encryptPassword(password, salt.getBytes());

        assertThat(encrypted).isNotNull();
        assertThat(encrypted).isNotEqualTo(password);

        // Same input should produce same output
        String encrypted2 = EgovFileScrty.encryptPassword(password, salt.getBytes());
        assertThat(encrypted).isEqualTo(encrypted2);
    }
}
