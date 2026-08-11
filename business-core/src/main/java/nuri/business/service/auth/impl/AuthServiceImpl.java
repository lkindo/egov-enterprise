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

    /**
     * <b>[트랜잭션 경계] {@code noRollbackFor} 는 여기에도 있어야 한다 — 없으면 계정 잠금이 발동하지 않는다.</b>
     *
     * <p>{@code EgovAuthenticationProvider.authenticate()} 는 실패 카운터·잠금 플래그를 지키려고
     * {@code noRollbackFor = BadCredentialsException.class} 를 달고 있다. 그러나 전파가 기본값(REQUIRED)이라
     * 이 메서드와 <b>하나의 물리 트랜잭션을 공유</b>한다. 내부의 {@code noRollbackFor} 는 <i>내부 인터셉터가</i>
     * rollback-only 를 걸지 않게 할 뿐이고, 예외가 <b>바깥(이 메서드) 인터셉터</b>까지 올라오면
     * 바깥 규칙이 적용되어 <b>트랜잭션 전체가 롤백</b>된다. 그러면 provider 가 증가시킨 {@code lckCnt} 와
     * {@code lock()} 이 매 실패마다 통째로 사라져 <b>잠금이 영원히 발동하지 않는다</b> —
     * provider 주석이 경고한 바로 그 무음 결함이, 나중에 생긴 이 호출 계층에서 실현돼 있었다.
     *
     * <p>비밀번호 불일치는 시스템 장애가 아니라 <b>업무적 결과</b>이므로 그 경로의 쓰기는 커밋되어야 한다.
     * 실패 경로에서 이 메서드가 남기는 쓰기는 provider 의 인증 상태 필드뿐이다
     * (정책 검증은 읽기 전용이고, 토큰 발급·감사 로그는 인증 성공 이후에 온다).
     *
     * <p>회귀 방어: {@code LoginLockoutPersistenceIntegrationTest} — 이 애노테이션을 되돌리면 red 가 된다.
     * 목(mock) 기반 단위 테스트와 {@code @Transactional} 통합 테스트는 이 결함을 원리적으로 볼 수 없다.
     */
    @Override
    @Transactional(noRollbackFor = org.springframework.security.authentication.BadCredentialsException.class)
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
        // [W1-06] 리프레시 자리에는 리프레시 토큰만. 액세스 토큰을 제시하면 거부한다.
        if (refreshToken == null || !jwtTokenProvider.validateRefreshToken(refreshToken)) {
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

        // [W1-06] 리프레시 토큰 회전.
        //   종전에는 같은 리프레시 토큰을 계속 돌려줬다. 탈취된 토큰은 만료(최대 7일)까지 유효했고,
        //   정상 사용자와 공격자가 동일한 토큰을 무한히 함께 쓸 수 있었다.
        //   회전하면 재발급 시점에 이전 토큰이 무효가 되어 창이 재발급 주기로 좁혀진다.
        //
        //   ⚠ **절대 만료를 유지한다** — 최초 로그인 시점에 정해진 exprtnDt 를 그대로 물려준다.
        //   회전할 때마다 7일을 새로 주면(슬라이딩 세션) 탈취된 토큰이 무기한 연장되어 회전의 목적이 사라진다.
        java.time.Instant absoluteExpiry = storedToken.getExprtnDt();
        String rotatedRefreshToken = jwtTokenProvider.createRefreshToken(
                userId, java.util.Date.from(absoluteExpiry));
        storedToken.updateToken(rotatedRefreshToken, absoluteExpiry);
        refreshTokenRepository.save(storedToken);

        return new TokenResponse(newAccessToken, rotatedRefreshToken, finalRole);
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
