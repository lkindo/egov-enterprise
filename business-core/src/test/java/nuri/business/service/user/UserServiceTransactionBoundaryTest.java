package nuri.business.service.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import nuri.business.domain.auth.RefreshTokenRepository;
import nuri.business.domain.auth.mfa.MfaCredentialRepository;
import nuri.business.domain.deptjob.DeptJobRepository;
import nuri.business.domain.log.UserLogRepository;
import nuri.business.domain.login.LoginPolicyRepository;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.exception.CurrentPasswordMismatchException;
import nuri.business.domain.user.exception.UserErrorCode;
import nuri.business.domain.user.repository.DeptManageRepository;
import nuri.business.domain.user.repository.UserAbsenceRepository;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.security.authorization.AuthorizationSnapshotService;
import nuri.business.service.auth.AuthorizationAdministrationService;
import nuri.foundation.core.audit.SensitiveAuditPort;
import nuri.foundation.core.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

class UserServiceTransactionBoundaryTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final RefreshTokenRepository refreshTokenRepository = mock(RefreshTokenRepository.class);
    private final LoginPolicyRepository loginPolicyRepository = mock(LoginPolicyRepository.class);
    private final UserAbsenceRepository userAbsenceRepository = mock(UserAbsenceRepository.class);
    private final UserLogRepository userLogRepository = mock(UserLogRepository.class);
    private final DeptJobRepository deptJobRepository = mock(DeptJobRepository.class);
    private final DeptManageRepository deptManageRepository = mock(DeptManageRepository.class);
    private final PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
    private final ApplicationEventPublisher eventPublisher = mock(ApplicationEventPublisher.class);
    private final AuthorizationSnapshotService authorizationSnapshots = mock(AuthorizationSnapshotService.class);
    private final AuthorizationAdministrationService authorizationAdministration = mock(AuthorizationAdministrationService.class);
    private final SensitiveAuditPort sensitiveAudit = mock(SensitiveAuditPort.class);
    private final MfaCredentialRepository mfaCredentials = mock(MfaCredentialRepository.class);
    private final LoginIdReuseGuard loginIdReuseGuard = mock(LoginIdReuseGuard.class);
    private final RecordingTransactionManager txManager = new RecordingTransactionManager();

    private UserService userService;
    private User user;

    @BeforeEach
    void setUp() {
        userService = new UserService(
                userRepository, refreshTokenRepository, loginPolicyRepository, userAbsenceRepository,
                userLogRepository, deptJobRepository, deptManageRepository, passwordEncoder, eventPublisher,
                authorizationSnapshots, authorizationAdministration, sensitiveAudit, mfaCredentials,
                loginIdReuseGuard, txManager);
        user = User.builder().esntlId("USR_1").userId("user1").userNm("Test User").pswd("old-hash")
                .lckYn("N").lckCnt(0).userSttsCd("P").build();
        given(userRepository.findByUserId("user1")).willReturn(Optional.of(user));
        given(userRepository.findById("USR_1")).willReturn(Optional.of(user));
    }

    @Test
    void standaloneChangePasswordRunsBcryptOutsideTransactionsAndReleasesConnectionsBetweenPhases() {
        List<Boolean> txStatesDuringCrypto = new ArrayList<>();
        given(passwordEncoder.encode("newPass")).willAnswer(inv -> {
            txStatesDuringCrypto.add(TransactionSynchronizationManager.isActualTransactionActive());
            return "new-hash";
        });
        given(passwordEncoder.matches("oldPass", "old-hash")).willAnswer(inv -> {
            txStatesDuringCrypto.add(TransactionSynchronizationManager.isActualTransactionActive());
            return true;
        });

        userService.changePassword("user1", "oldPass", "newPass");

        assertThat(txStatesDuringCrypto).containsExactly(false, false);
        assertThat(txManager.readOnlyFlags).containsExactly(true, false);
        assertThat(txManager.commits).isEqualTo(2);
        assertThat(txManager.rollbacks).isZero();
        assertThat(user.getPswd()).isEqualTo("new-hash");
        verify(userRepository).refreshForUpdate(user);
    }

    @Test
    void standaloneChangePasswordCommitsFailureCountWithoutHoldingDbLockDuringBcrypt() {
        given(passwordEncoder.encode("newPass")).willAnswer(inv -> {
            assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
            return "new-hash";
        });
        given(passwordEncoder.matches("wrongPass", "old-hash")).willAnswer(inv -> {
            assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
            return false;
        });

        assertThatThrownBy(() -> userService.changePassword("user1", "wrongPass", "newPass"))
                .isInstanceOf(CurrentPasswordMismatchException.class);

        assertThat(txManager.readOnlyFlags).containsExactly(true, false);
        assertThat(txManager.commits).isEqualTo(2);
        assertThat(txManager.rollbacks).isZero();
        assertThat(user).hasFieldOrPropertyWithValue("pswdFailNmtm", java.math.BigInteger.ONE);
        assertThat(user.getPswd()).isEqualTo("old-hash");
    }

    @Test
    void standaloneChangePasswordReverifiesUnderLockWhenHashChangesConcurrently() {
        given(passwordEncoder.encode("newPass")).willReturn("new-hash");
        given(passwordEncoder.matches("oldPass", "old-hash")).willAnswer(inv -> {
            assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
            return true;
        });
        doAnswer(inv -> {
            user.updatePassword("admin-reset-hash");
            return null;
        }).when(userRepository).refreshForUpdate(user);
        given(passwordEncoder.matches("oldPass", "admin-reset-hash")).willAnswer(inv -> {
            assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isTrue();
            return false;
        });

        assertThatThrownBy(() -> userService.changePassword("user1", "oldPass", "newPass"))
                .isInstanceOfSatisfying(BusinessException.class,
                        ex -> assertThat(ex.getErrorCode()).isEqualTo(UserErrorCode.INVALID_PASSWORD));

        assertThat(txManager.commits).isEqualTo(1);
        assertThat(txManager.rollbacks).isEqualTo(1);
        assertThat(user.getPswd()).isEqualTo("admin-reset-hash");
    }

    @Test
    void outerTransactionJoinsSingleTransactionPathWithoutSplitting() {
        given(passwordEncoder.encode("newPass")).willReturn("new-hash");
        given(passwordEncoder.matches("oldPass", "old-hash")).willReturn(true);

        new TransactionTemplate(txManager).executeWithoutResult(
                status -> userService.changePassword("user1", "oldPass", "newPass"));

        assertThat(txManager.readOnlyFlags).containsExactly(false);
        assertThat(txManager.commits).isEqualTo(1);
        assertThat(txManager.rollbacks).isZero();
    }

    @Test
    void standaloneChangePasswordThrowsUserNotFoundWhenMissingInWritePhase() {
        given(passwordEncoder.encode("newPass")).willReturn("new-hash");
        given(passwordEncoder.matches("oldPass", "old-hash")).willReturn(true);
        given(userRepository.findById("USR_1")).willReturn(Optional.empty());

        assertThatThrownBy(() -> userService.changePassword("user1", "oldPass", "newPass"))
                .isInstanceOfSatisfying(BusinessException.class,
                        ex -> assertThat(ex.getErrorCode()).isEqualTo(UserErrorCode.USER_NOT_FOUND));

        assertThat(txManager.readOnlyFlags).containsExactly(true, false);
        assertThat(txManager.commits).isEqualTo(1);
        assertThat(txManager.rollbacks).isEqualTo(1);
    }

    @Test
    void standaloneChangePasswordSucceedsWhenHashChangesConcurrentlyAndNewHashMatches() {
        given(passwordEncoder.encode("newPass")).willReturn("new-hash");
        given(passwordEncoder.matches("oldPass", "old-hash")).willReturn(true);
        doAnswer(inv -> {
            user.updatePassword("rehashed-hash");
            return null;
        }).when(userRepository).refreshForUpdate(user);
        given(passwordEncoder.matches("oldPass", "rehashed-hash")).willAnswer(inv -> {
            assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isTrue();
            return true;
        });

        userService.changePassword("user1", "oldPass", "newPass");

        assertThat(txManager.commits).isEqualTo(2);
        assertThat(txManager.rollbacks).isZero();
        assertThat(user.getPswd()).isEqualTo("new-hash");
        verify(userRepository).advanceSessionCycle(List.of("USR_1"));
    }

    @Test
    void outerTransactionWrongPasswordRecordsFailureWithoutSplitting() {
        given(passwordEncoder.encode("newPass")).willReturn("new-hash");
        given(passwordEncoder.matches("wrongPass", "old-hash")).willReturn(false);

        new TransactionTemplate(txManager).executeWithoutResult(status -> assertThatThrownBy(
                () -> userService.changePassword("user1", "wrongPass", "newPass"))
                .isInstanceOf(CurrentPasswordMismatchException.class));

        assertThat(txManager.readOnlyFlags).containsExactly(false);
        assertThat(txManager.commits).isEqualTo(1);
        assertThat(txManager.rollbacks).isZero();
        assertThat(user).hasFieldOrPropertyWithValue("pswdFailNmtm", java.math.BigInteger.ONE);
    }

    @Test
    void standaloneRegisterSignupAndAdminResetRunBcryptOutsideWriteTransactions() {
        List<Boolean> encodeTxStates = new ArrayList<>();
        given(passwordEncoder.encode("secret-1")).willAnswer(inv -> {
            encodeTxStates.add(TransactionSynchronizationManager.isActualTransactionActive());
            return "hash-1";
        });
        given(passwordEncoder.encode("secret-2")).willAnswer(inv -> {
            encodeTxStates.add(TransactionSynchronizationManager.isActualTransactionActive());
            return "hash-2";
        });
        given(passwordEncoder.encode("secret-3")).willAnswer(inv -> {
            encodeTxStates.add(TransactionSynchronizationManager.isActualTransactionActive());
            return "hash-3";
        });
        given(userRepository.findByUserId("new1")).willReturn(Optional.empty());
        given(userRepository.findByUserId("new2")).willReturn(Optional.empty());
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                nuri.business.support.AuthorizationTestPrincipal.authentication("admin", "USR_ADMIN", "ROLE_ADMIN"));
        try {
            userService.registerUser(nuri.business.service.user.dto.UserDto.builder()
                    .userId("new1").pswd("secret-1").userNm("User One").role("USER").build());
            userService.signup(nuri.business.service.user.dto.UserSignupRequest.builder()
                    .userId("new2").pswd("secret-2").userNm("User Two").build());
            userService.updatePasswordByAdmin("user1", "secret-3");
        } finally {
            org.springframework.security.core.context.SecurityContextHolder.clearContext();
        }

        assertThat(encodeTxStates).containsExactly(false, false, false);
        assertThat(txManager.readOnlyFlags).containsExactly(false, false, false);
        assertThat(txManager.commits).isEqualTo(3);
        assertThat(txManager.rollbacks).isZero();
        assertThat(user.getPswd()).isEqualTo("hash-3");
    }

    private static final class RecordingTransactionManager extends AbstractPlatformTransactionManager {
        private final List<Boolean> readOnlyFlags = new ArrayList<>();
        private int commits;
        private int rollbacks;

        @Override
        protected Object doGetTransaction() {
            return new Object();
        }

        @Override
        protected void doBegin(Object transaction, TransactionDefinition definition) {
            readOnlyFlags.add(definition.isReadOnly());
        }

        @Override
        protected void doCommit(DefaultTransactionStatus status) {
            commits++;
        }

        @Override
        protected void doRollback(DefaultTransactionStatus status) {
            rollbacks++;
        }
    }
}
