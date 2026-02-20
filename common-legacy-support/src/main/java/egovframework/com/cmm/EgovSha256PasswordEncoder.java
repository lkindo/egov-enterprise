package egovframework.com.cmm;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;

import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * eGovFrame ? SHA-256 Password Encoder
 * 
 * ??eGovFrame??EgovPasswordEncoder?? ??????? SHA-256 ??????????
 * Spring Security 6??PasswordEncoder ?????? ?????
 * 
 * @since 2025.12.18
 **/
public class EgovSha256PasswordEncoder implements PasswordEncoder {

    /**
     * ??????????SHA-256?? ??????.
     * eGovFrame ???: SHA-256 ?? ??Base64 ???
     **/
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
     * ?????????????? ??? ??????????????
     **/
    @Override
    public boolean matches(CharSequence rawPassword, String encodedPassword) {
        if (rawPassword == null || encodedPassword == null) {
            return false;
        }
        String encoded = encode(rawPassword);
        return encoded.equals(encodedPassword);
    }
}
