package nuri.foundation.service.auth;

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
    @DisplayName("QR 코드 URL 생성 테스트")
    void getQrCodeUrlTest() {
        GoogleAuthenticatorKey key = otpService.generateSecretKey();
        String url = otpService.getQrCodeUrl("testuser", "test.com", key);
        assertNotNull(url);
        assertTrue(url.contains("testuser"));
        assertTrue(url.contains("test.com"));
    }
}
