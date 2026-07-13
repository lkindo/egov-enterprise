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
    @DisplayName("QR 코드 URL 생성 테스트")
    void getQrCodeUrlTest() {
        GoogleAuthenticatorKey key = otpService.generateSecretKey();
        String url = otpService.getQrCodeUrl("testuser", "test.com", key);
        assertNotNull(url);
        assertTrue(url.contains("testuser"));
        assertTrue(url.contains("test.com"));
    }
}
