package egovframework.com.cmm;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;

import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * eGovFrame 호환 SHA-256 Password Encoder
 * 
 * 기존 eGovFrame의 EgovPasswordEncoder와 동일한 방식으로 SHA-256 해시를 생성합니다.
 * Spring Security 6의 PasswordEncoder 인터페이스를 구현합니다.
 * 
 * @since 2025.12.18
 */
public class EgovSha256PasswordEncoder implements PasswordEncoder {

    /**
     * 평문 패스워드를 SHA-256으로 인코딩합니다.
     * eGovFrame 표준: SHA-256 해시 후 Base64 인코딩
     */
    @Override
    public String encode(CharSequence rawPassword) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawPassword.toString().getBytes());
            return Base64.getEncoder().encodeToString(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }
    }

    /**
     * 입력된 평문 패스워드와 인코딩된 패스워드를 비교합니다.
     */
    @Override
    public boolean matches(CharSequence rawPassword, String encodedPassword) {
        if (rawPassword == null || encodedPassword == null) {
            return false;
        }
        String encoded = encode(rawPassword);
        return encoded.equals(encodedPassword);
    }
}
