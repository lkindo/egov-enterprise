package com.company.project.foundation.security.service;

import egovframework.com.utl.sim.service.EgovFileScrty;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * ?袁⑹쁽?類??袁⑥쟿?袁⑹뜖????뉕탢??SHA-256 ?酉???筌왖?癒?뱽 ?袁る립 PasswordEncoder
 * matches() ?紐꾪뀱 ??salt(????瑜짣) ?類ｋ궖揶쎛 ?袁⑹뒄??λ퓠 ?醫롮벥.
 */
@Slf4j
public class EgovPasswordEncoder implements PasswordEncoder {

    @Override
    public String encode(CharSequence rawPassword) {
        // ???紐꾪맜?遺얜뮉 salt(id) ??곸뵠 ??ㅻ즴??곗쨮 encode??????곸벉.
        // ??곗뺘?怨몄몵嚥??醫됲뇣 ?酉??遺얜뮉 bcrypt???????롫즲嚥??醫딅즲.
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
        // salt ?類ｋ궖 ??곸뵠??matches ??묐뻬 ?븍뜃?.
        // AuthenticationProvider ??λ퓠??matches(raw, encoded, salt)???紐꾪뀱??곷튊 ??
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
