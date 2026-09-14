package nuri.business.security.iam;

import nuri.business.domain.user.repository.UserRepository;
import nuri.business.domain.user.entity.User;
import nuri.business.security.authorization.AuthorizationSnapshotService;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * [2026-09-14 DEC-OPS-094] 비밀번호 변경 전 발급된 access token 거부는 이 어댑터가 변경 시각을 인증 주체에 실어야
 * 동작한다. 매핑이 빠지면 JwtTokenProvider 의 비교가 늘 "시각 모름" 으로 통과해 기능이 오류 없이 꺼진다.
 */
class JpaUserAuthAdapterTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final AuthorizationSnapshotService snapshots = mock(AuthorizationSnapshotService.class);
    private final JpaUserAuthAdapter adapter = new JpaUserAuthAdapter(userRepository, snapshots);

    private User user(LocalDateTime changedAt) {
        User user = User.builder().esntlId("USR_ESNTL_1").userId("staff").userNm("직원").pswd("{bcrypt}x")
                .lckYn("N").userSttsCd("P").chgPswdLastDt(changedAt).build();
        when(userRepository.findByUserId("staff")).thenReturn(Optional.of(user));
        when(snapshots.load("USR_ESNTL_1")).thenReturn(new AuthorizationSnapshotService.Snapshot(List.of("USER"), List.of(), "v1"));
        return user;
    }

    @Test
    @DisplayName("마지막 비밀번호 변경 시각을 JVM 기본 시간대 기준 Instant 로 싣는다")
    void carriesCredentialChangeTime() {
        LocalDateTime changedAt = LocalDateTime.of(2026, 9, 14, 10, 0, 0);
        user(changedAt);

        CustomUserDetails details = (CustomUserDetails) adapter.loadUserByUsername("staff");

        assertThat(details.getCredentialsChangedAt()).isEqualTo(changedAt.atZone(ZoneId.systemDefault()).toInstant());
    }

    @Test
    @DisplayName("변경 이력이 없으면 시각을 비워 둔다 — 없는 시각을 지어내 기존 세션을 끊지 않는다")
    void leavesChangeTimeEmptyWhenUnknown() {
        user(null);

        CustomUserDetails details = (CustomUserDetails) adapter.loadUserByUsername("staff");

        assertThat(details.getCredentialsChangedAt()).isNull();
    }
}
