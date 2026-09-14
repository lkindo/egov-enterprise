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

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) {
        var user = userRepository.findByUserId(Objects.requireNonNull(username))
                .or(() -> userRepository.findByEsntlId(username)).orElse(null);
        if (user == null) return null;
        var snapshot = snapshots.load(user.getEsntlId());
        return CustomUserDetails.builder()
                .userId(user.getUserId()).esntlId(user.getEsntlId()).userNm(user.getUserNm())
                .password(user.getPswd()).lockAt(user.getLckYn()).enabled("P".equals(user.getUserSttsCd()))
                .authorCode(snapshot.groups().stream().findFirst().orElse(null))
                .groups(snapshot.groups()).permissions(snapshot.permissions())
                .authorizationVersion(snapshot.authorizationVersion())
                // 저장 시각은 LocalDateTime.now()(JVM 기본 시간대)이므로 같은 기준으로 되돌린다.
                .credentialsChangedAt(user.getChgPswdLastDt() == null ? null
                        : user.getChgPswdLastDt().atZone(java.time.ZoneId.systemDefault()).toInstant())
                .build();
    }
}
