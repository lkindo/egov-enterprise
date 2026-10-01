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
                .password(user.getPswd()).lockAt(user.getLckYn()).enabled("P".equals(user.getUserSttsCd()))
                .authorCode(snapshot.groups().stream().findFirst().orElse(null))
                .groups(snapshot.groups()).permissions(snapshot.permissions())
                .authorizationVersion(snapshot.authorizationVersion())
                .mfaCredentialVersion(mfa == null ? null : mfa.getCredentialVersion())
                .mfaRequired((mfa != null && (mfa.isActive() || mfa.requiresEnrollment()))
                        || (mfaSettings.requireProtected() && protectedAccount))
                .passwordChangeRequired(user.isTemporaryPassword())
                // 저장 시각은 LocalDateTime.now()(JVM 기본 시간대)이므로 같은 기준으로 되돌린다.
                .credentialsChangedAt(user.getChgPswdLastDt() == null ? null
                        : user.getChgPswdLastDt().atZone(java.time.ZoneId.systemDefault()).toInstant())
                .build();
    }
}
