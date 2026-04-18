package nuri.foundation.security.service;

import egovframework.com.utl.sim.service.EgovFileScrty;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * 전자정부 표준프레임워크의 SHA-256 방식을 지원하는 PasswordEncoder
 * matches() 시 salt(id) 정보가 필요함에 주의.
 */
@Slf4j
public class EgovPasswordEncoder implements PasswordEncoder {

    @Override
    public String encode(CharSequence rawPassword) {
        // 비밀번호 암호화 시 salt(id) 정보가 필요하므로 일반 encode는 지원하지 않음.
        // 신규 비밀번호는 가급적 BCrypt를 사용하는 것을 권장.
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
        // salt 정보가 필요하므로 matches 는 지원하지 않음.
        // AuthenticationProvider 에서 matches(raw, encoded, salt)를 직접 호출해야 함.
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
