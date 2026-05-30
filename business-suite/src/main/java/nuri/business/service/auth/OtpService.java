package nuri.business.service.auth;

import com.warrenstrange.googleauth.GoogleAuthenticator;
import com.warrenstrange.googleauth.GoogleAuthenticatorKey;
import com.warrenstrange.googleauth.GoogleAuthenticatorQRGenerator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class OtpService {

    private final GoogleAuthenticator gAuth = new GoogleAuthenticator();

    /**
     * 새로운 OTP 비밀키 생성
     * @return OTP 키 객체 (비밀키, 스크래치 코드 등 포함)
     */
    public GoogleAuthenticatorKey generateSecretKey() {
        return gAuth.createCredentials();
    }

    /**
     * 사용자의 OTP 번호 검증
     * @param secretKey 사용자의 비밀키
     * @param verificationCode 사용자가 입력한 6자리 코드
     * @return 검증 성공 여부
     */
    public boolean verifyCode(String secretKey, int verificationCode) {
        if (secretKey == null || secretKey.isEmpty()) {
            return false;
        }
        return gAuth.authorize(secretKey, verificationCode);
    }

    /**
     * QR 코드 생성을 위한 URL 반환 (Google Authenticator 앱 등록용)
     * @param userId 사용자 ID
     * @param host 호스트명
     * @param secretKey 비밀키
     * @return OTP 등록 URL
     */
    public String getQrCodeUrl(String userId, String host, GoogleAuthenticatorKey secretKey) {
        return GoogleAuthenticatorQRGenerator.getOtpAuthURL(host, userId, secretKey);
    }
}
