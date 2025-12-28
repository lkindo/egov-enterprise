package com.company.project.security.service;

import egovframework.com.utl.sim.service.EgovFileScrty;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * 전자정부프레임워크 레거시 SHA-256 암호화 지원을 위한 PasswordEncoder
 * matches() 호출 시 salt(사용자ID) 정보가 필요함에 유의.
 */
@Slf4j
public class EgovPasswordEncoder implements PasswordEncoder {

    @Override
    public String encode(CharSequence rawPassword) {
        // 이 인코더는 salt(id) 없이 단독으로 encode할 수 없음.
        // 일반적으로 신규 암호화는 bcrypt를 사용하도록 유도.
        throw new UnsupportedOperationException(
                "EgovPasswordEncoder requires user ID as salt for encoding. Use BCrypt for new passwords.");
    }

    public String encode(CharSequence rawPassword, String salt) {
        try {
            return EgovFileScrty.encryptPassword(rawPassword.toString(), salt);
        } catch (Exception e) {
            log.error("Password encryption failed", e);
            return null;
        }
    }

    @Override
    public boolean matches(CharSequence rawPassword, String encodedPassword) {
        // salt 정보 없이는 matches 수행 불가.
        // AuthenticationProvider 단에서 matches(raw, encoded, salt)를 호출해야 함.
        log.warn("Direct call to EgovPasswordEncoder.matches() without salt is not supported.");
        return false;
    }

    public boolean matches(CharSequence rawPassword, String encodedPassword, String salt) {
        if (encodedPassword == null || salt == null)
            return false;
        String encrypted = encode(rawPassword, salt);
        return encodedPassword.equals(encrypted);
    }
}
