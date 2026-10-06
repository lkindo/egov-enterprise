package nuri.business.security.service;

import java.util.Map;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.DelegatingPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/** API 설정과 core fallback이 공유하는 신규 암호 저장 정책. */
public final class PasswordEncoders {
    private PasswordEncoders() { }

    public static PasswordEncoder create() {
        // 옛 SHA-256 검증·로그인 후 재해싱은 EgovAuthenticationProvider가 담당한다.
        return new DelegatingPasswordEncoder("bcrypt", Map.of("bcrypt", new BCryptPasswordEncoder()));
    }
}
