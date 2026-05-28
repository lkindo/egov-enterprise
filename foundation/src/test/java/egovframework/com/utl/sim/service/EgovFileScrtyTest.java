package egovframework.com.utl.sim.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("EgovFileScrty 테스트")
class EgovFileScrtyTest {

    @TempDir
    Path tempDir;

    @Test
    @DisplayName("바이너리 인코딩/디코딩 테스트")
    void testEncodeDecodeBinary() throws Exception {
        byte[] original = "Hello World".getBytes();
        String encoded = EgovFileScrty.encodeBinary(original);
        byte[] decoded = EgovFileScrty.decodeBinary(encoded);

        assertThat(new String(decoded)).isEqualTo("Hello World");
    }

    @Test
    @DisplayName("문자열 인코딩/디코딩 테스트")
    void testEncodeDecodeString() throws Exception {
        String original = "안녕하세요";
        String encoded = EgovFileScrty.encode(original);
        String decoded = EgovFileScrty.decode(encoded);

        assertThat(decoded).isEqualTo(original);
    }

    @Test
    @DisplayName("비밀번호 암호화 테스트 (SHA-256)")
    @SuppressWarnings("deprecation")
    void testEncryptPassword() throws Exception {
        String password = "testPassword";
        String encrypted = EgovFileScrty.encryptPassword(password);
        
        assertThat(encrypted).isNotBlank();
        assertThat(encrypted).isNotEqualTo(password);
    }

    @Test
    @DisplayName("ID를 포함한 비밀번호 암호화 테스트")
    void testEncryptPasswordWithId() throws Exception {
        String password = "password123";
        String id = "user01";
        String encrypted = EgovFileScrty.encryptPassword(password, id);
        
        assertThat(encrypted).isNotBlank();
        assertThat(encrypted).isNotEqualTo(password);
    }

    @Test
    @DisplayName("파일 암호화/복호화 테스트")
    void testEncryptDecryptFile() throws Exception {
        // Given
        Path sourcePath = tempDir.resolve("source.txt");
        Path encryptedPath = tempDir.resolve("encrypted.txt");
        Path decryptedPath = tempDir.resolve("decrypted.txt");
        
        String content = "This is a secret message.\nMultiple lines.\n";
        Files.writeString(sourcePath, content);

        // When
        boolean encryptResult = EgovFileScrty.encryptFile(sourcePath.toString(), encryptedPath.toString());
        boolean decryptResult = EgovFileScrty.decryptFile(encryptedPath.toString(), decryptedPath.toString());

        // Then
        assertThat(encryptResult).isTrue();
        assertThat(decryptResult).isTrue();
        assertThat(Files.readString(decryptedPath)).isEqualTo(content);
    }

    @Test
    @DisplayName("솔트를 포함한 비밀번호 체크 테스트")
    void testCheckPassword() throws Exception {
        String password = "myPassword";
        byte[] salt = "random_salt".getBytes();
        String encoded = EgovFileScrty.encryptPassword(password, salt);

        boolean isCorrect = EgovFileScrty.checkPassword(password, encoded, salt);
        boolean isWrong = EgovFileScrty.checkPassword("wrongPassword", encoded, salt);

        assertThat(isCorrect).isTrue();
        assertThat(isWrong).isFalse();
    }

    @Test
    @DisplayName("파일 암호화/복호화 - 존재하지 않거나 디렉터리인 경우")
    void testEncryptDecryptFileInvalid() throws Exception {
        Path notExist = tempDir.resolve("notExist.txt");
        boolean encRes = EgovFileScrty.encryptFile(notExist.toString(), tempDir.resolve("target.txt").toString());
        assertThat(encRes).isFalse();

        boolean decRes = EgovFileScrty.decryptFile(tempDir.toString(), tempDir.resolve("target.txt").toString());
        assertThat(decRes).isFalse();
    }

    @Test
    @DisplayName("null 입력 처리 테스트")
    void testNullInputs() throws Exception {
        assertThat(EgovFileScrty.encodeBinary(null)).isEqualTo("");
        assertThat(EgovFileScrty.encryptPassword(null)).isEqualTo("");
        assertThat(EgovFileScrty.encryptPassword(null, "id")).isEqualTo("");
        assertThat(EgovFileScrty.encryptPassword(null, "salt".getBytes())).isEqualTo("");
    }
}
