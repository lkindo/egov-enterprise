package nuri.business.security.iam;

import lombok.RequiredArgsConstructor;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.security.authorization.AuthorizationSnapshotService;
import nuri.foundation.security.iam.UserAuthPort;
import nuri.foundation.security.service.CustomUserDetails;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.util.Objects;

@Component
@RequiredArgsConstructor
public class JpaUserAuthAdapter implements UserAuthPort {
    private final UserRepository userRepository;
    private final AuthorizationSnapshotService snapshots;
    private final nuri.business.domain.auth.mfa.MfaCredentialRepository mfaCredentials;
    private final nuri.business.service.auth.mfa.MfaSettings mfaSettings;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) {
        // 모든 호출자는 검증한 내부 subject를 전달한다. 로그인 ID와의 별칭 조회는 다른 계정을 선택할 수 있다.
        var user = userRepository.findByEsntlId(Objects.requireNonNull(username)).orElse(null);
        if (user == null) return null;
        var snapshot = snapshots.load(user.getEsntlId());
        var mfa = mfaCredentials.findBySubject(user.getEsntlId()).orElse(null);
        boolean protectedAccount = snapshot.permissions().stream()
                .anyMatch(java.util.Set.of("USER_PASSWORD", "AUTHRT_GRANT", "AUTHRT_ASSIGN")::contains);
        return CustomUserDetails.builder()
                .userId(user.getUserId()).esntlId(user.getEsntlId()).userNm(user.getUserNm())
                .password(user.getPswd())
                // [2026-11-17 DEC-OPS-419] 세션 주체에는 연속 실패 잠금(lck_yn)을 싣지 않는다. 그 잠금은 비밀번호·MFA 대조만
                //   막으며 EgovAuthenticationProvider·UserService·MfaService 가 저장 행으로 직접 판정한다. 여기 실으면 요청마다 토큰 검증·
                //   재발급·웹소켓·권한 판정이 잠긴 계정을 거부해, 남이 낸 로그인 실패만으로 이미 로그인한 사람이 잠금 시간
                //   내내 쫓겨난다. 세션을 끊어야 하는 잠금은 세션차수로 끊는다(비밀번호 변경 실패, DEC-OPS-418).
                .lockAt("N")
                .enabled("P".equals(user.getUserSttsCd()))
                .authorCode(snapshot.groups().stream().findFirst().orElse(null))
                .groups(snapshot.groups()).permissions(snapshot.permissions())
                .authorizationVersion(snapshot.authorizationVersion())
                .mfaCredentialVersion(mfa == null ? null : mfa.sessionVersion())
                .mfaRequired((mfa != null && (mfa.isActive() || mfa.requiresEnrollment()))
                        || (mfaSettings.requireProtected() && protectedAccount))
                .passwordChangeRequired(user.isTemporaryPassword())
                // 저장 시각은 LocalDateTime.now()(JVM 기본 시간대)이므로 같은 기준으로 되돌린다.
                .credentialsChangedAt(user.getChgPswdLastDt() == null ? null
                        : user.getChgPswdLastDt().atZone(java.time.ZoneId.systemDefault()).toInstant())
                // [2026-10-18] 로그아웃 시각도 같은 기준(JVM 기본 시간대의 LocalDateTime.now())으로 되돌린다.
                .lastLogoutAt(user.getLastLgtDt() == null ? null
                        : user.getLastLgtDt().atZone(java.time.ZoneId.systemDefault()).toInstant())
                // [V2_153] 세션차수 — 토큰이 담은 차수와 다르면 인증 필터가 거부한다.
                .sessionCycle(user.getSessionCycle())
                .build();
    }
}
