package nuri.business.service.auth;

import com.warrenstrange.googleauth.GoogleAuthenticatorKey;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("OtpService 단위 테스트")
class OtpServiceTest {

    private final OtpService otpService = new OtpService();

    @Test
    @DisplayName("OTP 비밀키 생성 테스트")
    void generateSecretKeyTest() {
        GoogleAuthenticatorKey key = otpService.generateSecretKey();
        assertNotNull(key);
        assertNotNull(key.getKey());
    }

    @Test
    @DisplayName("OTP 코드 검증 테스트")
    void verifyCodeTest() {
        // 실제 검증 로직은 GoogleAuthenticator 라이브러리에 의존하므로 
        // 여기서는 기본 유효성 검사 및 실패 케이스 위주로 테스트
        assertFalse(otpService.verifyCode(null, 123456));
        assertFalse(otpService.verifyCode("", 123456));
    }

    @Test
    @DisplayName("OTP 코드 검증 - 유효한 현재 코드 수락(positive)")
    void verifyCode_validCurrentCode_returnsTrue() {
        // MFA 게이트의 핵심: 유효한 현재 TOTP 코드는 반드시 통과해야 한다.
        // (뮤턴트: verifyCode 가 'return false' 또는 authorize 결과 부정 시 이 테스트가 킬 —
        //  기존 실패-only 테스트로는 정상 로그인 전면차단 버그가 그린 통과했다.)
        // WindowSize 기본(±1 스텝)으로 30초 경계 플레이키 방지.
        GoogleAuthenticatorKey key = otpService.generateSecretKey();
        int validCode = new com.warrenstrange.googleauth.GoogleAuthenticator().getTotpPassword(key.getKey());
        assertTrue(otpService.verifyCode(key.getKey(), validCode));
    }

    @Test
    @DisplayName("OTP 코드 검증 - 유효한 비밀키 + 틀린 코드는 거부(negative)")
    void verifyCode_wrongCode_returnsFalse() {
        // ─────────────────────────────────────────────────────────────────────
        // [2026-08-09 뮤테이션 보강] PIT 이 `verifyCode` 마지막 줄에서
        //   `replaced boolean return with true` 를 **살려 보냈다**.
        //   즉 "OTP 가 어떤 코드든 무조건 통과" 로 바꿔도 테스트가 전부 그린이었다 — MFA 전면 우회다.
        //
        //   기존 실패 케이스는 null/"" 뿐이라 **앞쪽 가드에서 return false** 로 끝났고,
        //   gAuth.authorize() 의 반환을 쓰는 마지막 줄에는 닿은 적이 없었다.
        //   유효한 비밀키 + 틀린 코드라야 그 줄이 false 를 돌려주는지 확인된다.
        // ─────────────────────────────────────────────────────────────────────
        GoogleAuthenticatorKey key = otpService.generateSecretKey();
        com.warrenstrange.googleauth.GoogleAuthenticator gAuth =
                new com.warrenstrange.googleauth.GoogleAuthenticator();

        // 기본 WindowSize(±1 스텝)에서 수락되는 코드 집합을 실제로 계산해 제외한다.
        // 임의의 "틀린 코드"를 찍으면 30초 경계에서 우연히 일치할 수 있어 플레이키가 된다.
        long now = System.currentTimeMillis();
        java.util.Set<Integer> accepted = new java.util.HashSet<>();
        for (int step = -2; step <= 2; step++) {
            accepted.add(gAuth.getTotpPassword(key.getKey(), now + step * 30_000L));
        }

        int wrongCode = 0;
        while (accepted.contains(wrongCode)) {
            wrongCode++;
        }

        assertFalse(otpService.verifyCode(key.getKey(), wrongCode),
                "유효한 비밀키라도 수락 창 밖의 코드는 거부해야 한다");
    }

    @Test
    @DisplayName("QR 코드 URL 생성 테스트")
    void getQrCodeUrlTest() {
        GoogleAuthenticatorKey key = otpService.generateSecretKey();
        String url = otpService.getQrCodeUrl("testuser", "test.com", key);
        assertNotNull(url);
        assertTrue(url.contains("testuser"));
        assertTrue(url.contains("test.com"));
    }
}
