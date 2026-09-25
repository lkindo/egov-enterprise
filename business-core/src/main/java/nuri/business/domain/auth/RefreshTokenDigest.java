package nuri.business.domain.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/**
 * 리프레시 토큰은 원문이 아니라 SHA-256 해시로 저장·조회한다(2026-09-25 DIP D7, GAP-SEC-005 ④).
 *
 * <p>원문을 저장하면 DB(백업·복제본 포함)를 읽을 수 있는 사람이 저장된 토큰으로 최대 7일 동안 재발급해
 * 그 사용자로 행세할 수 있다. 토큰은 서버가 서명한 고엔트로피 문자열이라 솔트 없는 단방향 해시로 충분하다 —
 * 비밀번호처럼 사람이 고른 값이 아니어서 사전 공격의 대상이 아니다.
 */
public final class RefreshTokenDigest {

    private RefreshTokenDigest() {
    }

    /** 64자 소문자 16진수. {@code null} 은 {@code null} 이다(조회 자체가 없는 경로를 만들지 않는다). */
    public static String of(String rawToken) {
        if (rawToken == null) {
            return null;
        }
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 unavailable", impossible);
        }
    }
}
