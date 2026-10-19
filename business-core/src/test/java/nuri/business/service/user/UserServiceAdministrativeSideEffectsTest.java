package nuri.business.service.user;

import nuri.business.domain.user.entity.Role;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import nuri.foundation.core.event.UserCredentialsChangedEvent;
import nuri.foundation.core.exception.BusinessException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

/**
 * 관리자의 사용자 변경이 남기는 보안 부작용(2026-10-19, PIT 범위 확대 — 살아남은 변이가 드러낸 단언 공백).
 *
 * <p>권한 잠금 재확인({@code lockAndAuthorize})·보호 계정 가드·재발급 토큰 폐기·자격 변경 이벤트·민감 작업 감사·마지막 관리자 보호는
 * 호출을 지워도 반환값이 바뀌지 않아, 결과만 보는 시험으로는 빠져도 모른다. 여기서 호출 자체를 단언한다.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("UserService 관리자 변경의 보안 부작용")
class UserServiceAdministrativeSideEffectsTest {

    @Mock private UserRepository userRepository;
    @Mock private nuri.business.domain.auth.RefreshTokenRepository refreshTokenRepository;
    @Mock private nuri.business.domain.login.LoginPolicyRepository loginPolicyRepository;
    @Mock private nuri.business.domain.user.repository.UserAbsenceRepository userAbsenceRepository;
    @Mock private nuri.business.domain.log.UserLogRepository userLogRepository;
    @Mock private nuri.business.domain.deptjob.DeptJobRepository deptJobRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private org.springframework.context.ApplicationEventPublisher eventPublisher;
    @Mock private nuri.business.domain.user.repository.DeptManageRepository deptManageRepository;
    @Mock private nuri.business.security.authorization.AuthorizationSnapshotService authorizationSnapshots;
    @Mock private nuri.business.service.auth.AuthorizationAdministrationService authorizationAdministration;
    @Mock private nuri.foundation.core.audit.SensitiveAuditPort sensitiveAudit;
    @Mock private nuri.business.domain.auth.mfa.MfaCredentialRepository mfaCredentials;
    @Mock private LoginIdReuseGuard loginIdReuseGuard;

    @InjectMocks private UserService userService;

    @BeforeEach
    void signInAsAdministrator() {
        SecurityContextHolder.getContext().setAuthentication(
                nuri.business.support.AuthorizationTestPrincipal.authentication("admin", "ADMIN_ESNTL", "ROLE_ADMIN"));
    }

    @AfterEach
    void clearAuthorization() {
        SecurityContextHolder.clearContext();
    }

    private static User lockedUser(String loginId, String esntlId) {
        return User.builder().userId(loginId).esntlId(esntlId).userNm("대상").pswd("old-hash")
                .lckYn("Y").lckCnt(5).userSttsCd("P").build();
    }

    @Test
    @DisplayName("관리자 비밀번호 초기화는 권한을 잠근 채 재확인하고, 보호 계정을 거르며, 임시 비밀번호·잠금 해제·토큰 폐기·감사를 남긴다")
    void adminPasswordResetLeavesEverySecuritySideEffect() {
        User target = lockedUser("target", "USR_TARGET");
        given(userRepository.findByUserId("target")).willReturn(Optional.of(target));
        given(passwordEncoder.encode("Temp1234!")).willReturn("new-hash");

        userService.updatePasswordByAdmin("target", "Temp1234!");

        verify(authorizationAdministration).lockAndAuthorize("USER_PASSWORD");
        verify(authorizationAdministration).authorizeProtectedAccountChange("USR_TARGET");
        assertThat(target.getPswd()).isEqualTo("new-hash");
        assertThat(target.isTemporaryPassword()).as("관리자가 정한 비밀번호는 임시다").isTrue();
        assertThat(target.getLckYn()).as("초기화는 잠금도 푼다").isEqualTo("N");
        assertThat(target.getLckCnt()).isZero();
        InOrder revoke = inOrder(userRepository, eventPublisher, refreshTokenRepository);
        revoke.verify(userRepository).flush();
        revoke.verify(eventPublisher).publishEvent(any(UserCredentialsChangedEvent.class));
        revoke.verify(refreshTokenRepository).deleteAllByEsntlIdIn(List.of("USR_TARGET"));
        verify(sensitiveAudit).recordMutation("ADMIN_PASSWORD_RESET", "USR_TARGET");
    }

    @Test
    @DisplayName("관리자 비밀번호 초기화가 보호 계정 가드에 막히면 비밀번호·토큰·감사를 건드리지 않는다")
    void adminPasswordResetStopsAtProtectedAccountGuard() {
        User target = lockedUser("target", "USR_TARGET");
        given(userRepository.findByUserId("target")).willReturn(Optional.of(target));
        org.mockito.Mockito.doThrow(new BusinessException(nuri.foundation.core.exception.CommonErrorCode.ACCESS_DENIED))
                .when(authorizationAdministration).authorizeProtectedAccountChange("USR_TARGET");

        assertThatThrownBy(() -> userService.updatePasswordByAdmin("target", "Temp1234!"))
                .isInstanceOf(BusinessException.class);

        assertThat(target.getPswd()).isEqualTo("old-hash");
        verifyNoInteractions(refreshTokenRepository, sensitiveAudit, passwordEncoder);
    }

    @Test
    @DisplayName("잠금 해제는 상태 권한을 잠근 채 재확인하고 보호 계정을 거른 뒤 잠금만 푼다")
    void unlockRechecksAuthorityAndProtectedAccount() {
        User target = lockedUser("target", "USR_TARGET");
        given(userRepository.findByUserId("target")).willReturn(Optional.of(target));

        userService.unlockUser("target");

        verify(authorizationAdministration).lockAndAuthorize("USER_STATUS");
        verify(authorizationAdministration).authorizeProtectedAccountChange("USR_TARGET");
        assertThat(target.getLckYn()).isEqualTo("N");
        assertThat(target.getPswd()).as("잠금 해제는 비밀번호를 건드리지 않는다").isEqualTo("old-hash");
        verifyNoInteractions(refreshTokenRepository);
    }

    @Test
    @DisplayName("일괄 상태 변경은 대상마다 보호 계정을 거르고 저장한 뒤 마지막 관리자를 지킨다")
    void bulkStatusChangeGuardsEveryTargetAndTheLastManager() {
        User first = lockedUser("first", "USR_1");
        User second = lockedUser("second", "USR_2");
        given(authorizationAdministration.managerCount()).willReturn(3L);
        given(userRepository.findByUserIdIn(List.of("first", "second"))).willReturn(List.of(first, second));

        userService.updateUsersStatus(List.of("first", "second"), "D");

        verify(authorizationAdministration).lockAndAuthorize("USER_STATUS");
        verify(authorizationAdministration).authorizeProtectedAccountChange("USR_1");
        verify(authorizationAdministration).authorizeProtectedAccountChange("USR_2");
        assertThat(List.of(first.getUserSttsCd(), second.getUserSttsCd())).containsExactly("D", "D");
        InOrder save = inOrder(userRepository, authorizationAdministration);
        save.verify(userRepository).saveAllAndFlush(List.of(first, second));
        save.verify(authorizationAdministration).protectLastManager(3L);
    }

    @Test
    @DisplayName("일괄 부서 이동은 부서 권한을 잠근 채 재확인하고 바뀐 소속을 저장한다")
    void bulkDepartmentMoveRechecksAuthorityAndSaves() {
        User first = lockedUser("first", "USR_1");
        given(deptManageRepository.existsById("ORG_1")).willReturn(true);
        given(userRepository.findByUserIdIn(List.of("first"))).willReturn(List.of(first));

        userService.moveUsersToDept(List.of("first"), "ORG_1");

        verify(authorizationAdministration).lockAndAuthorize("USER_DEPT");
        assertThat(first.getOgnzId()).isEqualTo("ORG_1");
        verify(userRepository).saveAll(List.of(first));
    }

    @Test
    @DisplayName("단일 역할 일괄 변경은 종료됐다 — 권한이 있어도 400 으로 거부하고 아무것도 저장하지 않는다")
    void retiredSingleRoleChangeIsRejected() {
        assertThatThrownBy(() -> userService.updateUsersRole(List.of("first"), Role.USER))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("단일 role 변경은 종료되었습니다");
        verifyNoInteractions(userRepository);
    }
}
