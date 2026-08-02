package nuri.business.service.auth.impl;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.business.domain.user.exception.UserErrorCode;

import nuri.foundation.core.exception.BusinessException;
import nuri.business.domain.auth.UserAuthorityRepository;
import nuri.business.domain.user.repository.UserRepository;
import nuri.foundation.security.jwt.JwtTokenProvider;
import nuri.business.service.auth.AuthService;
import nuri.business.service.auth.dto.LoginRequest;
import nuri.business.service.auth.dto.TokenResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthServiceImpl implements AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;
    private final UserAuthorityRepository userAuthorityRepository;
    private final nuri.business.domain.auth.RefreshTokenRepository refreshTokenRepository;
    private final nuri.business.service.login.LoginPolicyManageService loginPolicyManageService;
    private final nuri.business.domain.login.LoginPolicyRepository loginPolicyRepository;
    private final nuri.business.service.auth.OtpService otpService;
    /** [W1-E2] 로그인 감사 기록. 이 배선 전까지 tb_login_log 는 영구히 비어 있었다. */
    private final nuri.business.service.log.LogService logService;

    @Override
    @Transactional
    public TokenResponse login(LoginRequest request, String clientIp) {
        // 1. 로그인 정책 검증 (인증 전 수행)
        loginPolicyManageService.validateLoginPolicy(request.getUserId(), clientIp);

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUserId(), request.getPassword()));
        
        // [정체성 경계] 인증 principal 의 이름(getName()==CustomUserDetails.getUsername()) 은 esntlId 이고,
        // 사용자가 입력한 로그인 ID 는 request.getUserId() 다. 둘은 서로 다른 식별자이므로 명시적으로 분리한다.
        String esntlId = authentication.getName();   // User @Id · JWT subject · RefreshToken key
        String loginId = request.getUserId();        // TB_LOGIN_POLICY @Id

        // 2. OTP 검증 (정책에 활성화된 경우) — LoginPolicy 는 로그인 ID(TB_LOGIN_POLICY.@Id=userId) 로 키잉된다.
        //    [버그 수정] 과거에는 esntlId 로 findById 하여 정책이 항상 empty → otpUseYn='Y' 여도 OTP 가 전원 무력화됐다.
        loginPolicyRepository.findById(loginId).ifPresent(policy -> {
            if ("Y".equals(policy.getOtpUseYn())) {
                if (request.getOtpCode() == null) {
                    log.warn(">>> [Login] OTP Required for loginId: {}", loginId);
                    throw new BusinessException("OTP 번호가 필요합니다.", CommonErrorCode.AUTH_ERROR);
                }

                nuri.business.domain.user.entity.User user = userRepository.findById(esntlId)
                        .orElseThrow(() -> new BusinessException(UserErrorCode.USER_NOT_FOUND));

                if (!otpService.verifyCode(user.getOtpSecret(), request.getOtpCode())) {
                    log.warn(">>> [Login] Invalid OTP for loginId: {}", loginId);
                    throw new BusinessException("OTP 번호가 일치하지 않습니다.", CommonErrorCode.AUTH_ERROR);
                }
                log.info(">>> [Login] OTP Verification Success for loginId: {}", loginId);
            }
        });

        String role = authentication.getAuthorities().stream()
                .map(auth -> auth.getAuthority())
                .findFirst()
                .orElse("ROLE_USER");
        
        String finalRole = role.startsWith("ROLE_") ? role : "ROLE_" + role;
        String accessToken = jwtTokenProvider.createAccessToken(esntlId, finalRole);
        String refreshToken = jwtTokenProvider.createRefreshToken(esntlId);

        // Refresh Token 저장/갱신 (esntlId 로 키잉 — 기존 거동 유지)
        nuri.business.domain.auth.RefreshToken rt = refreshTokenRepository.findById(esntlId)
                .map(token -> {
                    token.updateToken(refreshToken, java.time.Instant.now().plus(java.time.Duration.ofDays(7)));
                    return token;
                })
                .orElseGet(() -> nuri.business.domain.auth.RefreshToken.builder()
                        .userId(esntlId)
                        .rfshTkn(refreshToken)
                        .exprtnDt(java.time.Instant.now().plus(java.time.Duration.ofDays(7)))
                        .build());
        refreshTokenRepository.save(rt);

        // [W1-E2] 로그인 감사 기록. 종전에는 LogService.logLogin 의 프로덕션 호출부가 **0건**이라
        //   tb_login_log 가 영구히 비어 있었다 — 개인정보 열람 이력과 같은 계열의 **법정 기록 부재**다.
        //   "감사 추적이 약하다"가 아니라 "기록이 존재하지 않는다"가 정확한 서술이었다.
        //   비동기(logExecutor)이고 내부에서 예외를 흡수하므로 로그인 응답을 지연·차단하지 않는다.
        logService.logLogin(loginId, clientIp, "WEB", "N", null);

        return new TokenResponse(accessToken, refreshToken, finalRole);
    }

    @Override
    @Transactional
    public TokenResponse reissue(String refreshToken) {
        if (refreshToken == null || !jwtTokenProvider.validateToken(refreshToken)) {
            throw new BusinessException(CommonErrorCode.INVALID_TOKEN);
        }
        
        // DB에 저장된 토큰과 일치하는지 검증
        nuri.business.domain.auth.RefreshToken storedToken = refreshTokenRepository.findByRfshTkn(refreshToken)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.INVALID_TOKEN));

        if (storedToken.getExprtnDt().isBefore(java.time.Instant.now())) {
            refreshTokenRepository.delete(storedToken);
            throw new BusinessException(CommonErrorCode.INVALID_TOKEN);
        }

        String userId = storedToken.getUserId();
        
        String authorCode = userRepository.findById(userId)
                .map(user -> userAuthorityRepository.findById(user.getEsntlId())
                        .map(ua -> ua.getAuthrtId())
                        .orElseGet(() -> user.getRole().name()))
                .orElse("ROLE_USER");

        String finalRole = authorCode.startsWith("ROLE_") ? authorCode : "ROLE_" + authorCode;
        String newAccessToken = jwtTokenProvider.createAccessToken(userId, finalRole);

        return new TokenResponse(newAccessToken, refreshToken, finalRole);
    }

    @Override
    @Transactional
    public void logout(String userId) {
        try {
            log.info(">>> [Logout] Deleting refresh token for user: {}", userId);
            refreshTokenRepository.findById(userId).ifPresent(token -> {
                refreshTokenRepository.delete(token);
                refreshTokenRepository.flush();
            });
        } catch (Exception e) {
            log.warn(">>> [Logout] RefreshToken already deleted or error occurred for user: {}. Message: {}", userId, e.getMessage());
        }
    }
}
