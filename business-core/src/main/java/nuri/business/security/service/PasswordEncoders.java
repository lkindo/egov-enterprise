package nuri.business.security.service;

import java.util.Map;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.DelegatingPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/** API 설정과 core fallback이 공유하는 신규 암호 저장 정책. */
public final class PasswordEncoders {
    /**
     * bcrypt 비용(2^n 회). [2026-11-14] 기본값 10 에서 12 로 올렸다 — OWASP 권고의 하한이고 해시 한 번이 수백 ms 안이다.
     * 이미 저장된 비용 10 해시는 그대로 검증되고, 로그인에 성공하면 upgradeEncoding 경로가 12 로 다시 저장한다
     * (EgovAuthenticationProvider#upgradeStandardPasswordIfNeeded).
     */
    public static final int BCRYPT_STRENGTH = 12;

    private PasswordEncoders() { }

    public static PasswordEncoder create() {
        // 옛 SHA-256 검증·로그인 후 재해싱은 EgovAuthenticationProvider가 담당한다.
        return new DelegatingPasswordEncoder("bcrypt", Map.of("bcrypt", new BCryptPasswordEncoder(BCRYPT_STRENGTH)));
    }
}
