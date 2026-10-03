package nuri.api.schema;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import nuri.business.domain.auth.RefreshToken;
import nuri.business.domain.auth.RefreshTokenRepository;
import nuri.business.security.authorization.AuthorizationSnapshotService;
import nuri.business.security.authorization.PermissionCodes;
import nuri.business.service.auth.AuthorizationAdministrationService;
import nuri.business.service.auth.dto.AuthorizationDto.ChangeDepartmentGroups;
import nuri.business.service.auth.dto.AuthorizationDto.Grant;
import nuri.business.service.auth.dto.AuthorizationDto.ReplaceGrants;
import nuri.business.service.auth.dto.AuthorizationDto.ReplaceGroups;
import nuri.business.service.login.LoginPolicyManageService;
import nuri.business.service.login.dto.LoginPolicyDto;
import nuri.business.service.user.UserService;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** D02: 실제 DB 권한 합집합·트랜잭션·별칭·직렬화로 보호 계정의 우회 경로를 검증한다. */
@Tag("schema-validation")
@SpringBootTest
@org.springframework.context.annotation.Import(AuthorizationSchemaRehearsalTestConfiguration.class)
@ActiveProfiles({"test", "tc"})
class ProtectedAccountAdministrationIntegrationTest {
    @Autowired private UserService users;
    @Autowired private LoginPolicyManageService loginPolicies;
    @Autowired private AuthorizationAdministrationService administration;
    @Autowired private AuthorizationSnapshotService snapshots;
    @Autowired private RefreshTokenRepository refreshTokens;
    @Autowired @Qualifier("passwordEncoder") private PasswordEncoder passwords;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private PlatformTransactionManager transactionManager;
    @org.springframework.test.context.bean.override.mockito.MockitoSpyBean
    private nuri.foundation.core.audit.SensitiveAuditPort sensitiveAudit;

    private String fixture;
    private String actor;
    private String target;
    private String ordinary;
    private String actorGroup;
    private String extraGroup;
    private String targetGroup;
    private String department;
    private String otherDepartment;
    private String originalPassword;

    @BeforeEach
    void seedOnlyDisposableFixtures() {
        fixture = "D02" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        actor = fixture + "A";
        target = fixture + "T";
        ordinary = fixture + "U";
        actorGroup = fixture + "G";
        extraGroup = fixture + "X";
        targetGroup = fixture + "P";
        department = fixture + "D";
        otherDepartment = fixture + "E";
        originalPassword = passwords.encode("Original-test-482!");
        for (String id : List.of(actor, target, ordinary)) {
            jdbc.update("INSERT INTO tb_user_info(esntl_id,user_id,pswd,user_nm,user_stts_cd,lck_yn,sbscrb_ymd) "
                    + "VALUES(?,?,?,'D02 fixture','P','N',to_char(CURRENT_DATE,'YYYYMMDD'))", id, login(id), originalPassword);
        }
        for (String group : List.of(actorGroup, extraGroup, targetGroup)) {
            jdbc.update("INSERT INTO tb_authrt_info(authrt_cd,authrt_nm,authrt_crt_ymd,crt_dt,mdfcn_dt,frst_rgtr_id,last_mdfr_id) "
                    + "VALUES(?,'D02 fixture',to_char(CURRENT_DATE,'YYYYMMDD'),CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'SYSTEM','SYSTEM')", group);
        }
        for (String id : List.of(department, otherDepartment)) {
            jdbc.update("INSERT INTO tb_ognz_info(ognz_id,ognz_nm,crt_dt,mdfcn_dt,frst_rgtr_id,last_mdfr_id) "
                    + "VALUES(?,'D02 department',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'SYSTEM','SYSTEM')", id);
        }
        jdbc.update("UPDATE tb_user_info SET ognz_id=? WHERE esntl_id IN (?,?)", department, target, ordinary);
        membership(actor, actorGroup);
        membership(actor, extraGroup);
        membership(target, targetGroup);
        setGrants(actorGroup, "USER_PASSWORD");
        setGrants(targetGroup, "USER_PASSWORD");
        authenticate(actor);
        refreshTokens.saveAndFlush(RefreshToken.builder().userId(target)
                .rfshTkn(nuri.business.domain.auth.RefreshTokenDigest.of(fixture))
                .exprtnDt(Instant.now().plusSeconds(600)).build());
    }

    @AfterEach
    void removeOnlyOwnFixtures() {
        SecurityContextHolder.clearContext();
        if (fixture == null) return;
        jdbc.update("DELETE FROM tb_auth_rfsh_tk WHERE user_id IN (?,?,?)", actor, target, ordinary);
        // tb_login_policy.user_id 는 로그인 ID 로 tb_user_info 를 참조한다(V2_14 FK) — 사용자보다 먼저 지운다.
        jdbc.update("DELETE FROM tb_login_policy WHERE user_id IN (?,?,?)", login(actor), login(target), login(ordinary));
        jdbc.update("DELETE FROM tb_authrt_chg_hstry WHERE chg_user_idntfr IN (?,?,?) OR authrt_cd IN (?,?,?)", actor, target, ordinary, actorGroup, extraGroup, targetGroup);
        jdbc.update("DELETE FROM tb_authrt_user_map WHERE scrty_dcsn_trgt_id IN (?,?,?)", actor, target, ordinary);
        jdbc.update("DELETE FROM tb_authrt_grnt_map WHERE authrt_cd IN (?,?,?)", actorGroup, extraGroup, targetGroup);
        jdbc.update("DELETE FROM tb_authrt_info WHERE authrt_cd IN (?,?,?)", actorGroup, extraGroup, targetGroup);
        jdbc.update("DELETE FROM tb_user_info WHERE esntl_id IN (?,?,?)", actor, target, ordinary);
        jdbc.update("DELETE FROM tb_ognz_info WHERE ognz_id IN (?,?)", department, otherDepartment);
    }

    @ParameterizedTest
    @CsvSource({"USER_PASSWORD,false", "USER_PASSWORD,true", "AUTHRT_GRANT,false", "AUTHRT_GRANT,true", "AUTHRT_ASSIGN,false", "AUTHRT_ASSIGN,true"})
    void resetUsesCurrentPermissionsAcrossAliasesAndGroups(String protectedPermission, boolean internalId) {
        setGrants(targetGroup, protectedPermission);
        jdbc.update("UPDATE tb_user_info SET lck_yn='Y',lck_cnt=5 WHERE esntl_id=?", target);
        String requestedId = internalId ? target : login(target);
        denied(() -> users.updatePasswordByAdmin(requestedId, "Replacement-test-482!"));
        assertThat(storedPassword(target)).isEqualTo(originalPassword);
        assertThat(refreshTokens.existsById(target)).isTrue();
        assertThat(jdbc.queryForObject("SELECT lck_yn FROM tb_user_info WHERE esntl_id=?", String.class, target)).isEqualTo("Y");

        // A stale principal advertises all permissions throughout; the authoritative union is in two DB groups.
        setGrants(actorGroup, "USER_PASSWORD", "AUTHRT_GRANT");
        setGrants(extraGroup, "AUTHRT_ASSIGN");
        users.updatePasswordByAdmin(requestedId, "Replacement-test-482!");
        assertThat(passwords.matches("Replacement-test-482!", storedPassword(target))).isTrue();
        assertThat(refreshTokens.existsById(target)).isFalse();
        assertThat(jdbc.queryForObject("SELECT lck_yn FROM tb_user_info WHERE esntl_id=?", String.class, target)).isEqualTo("N");
    }

    @Test
    void auditFailureRollsBackPasswordUnlockAndRefreshRevocation() {
        setGrants(actorGroup, "USER_PASSWORD", "AUTHRT_GRANT", "AUTHRT_ASSIGN");
        jdbc.update("UPDATE tb_user_info SET lck_yn='Y',lck_cnt=5 WHERE esntl_id=?", target);
        org.mockito.Mockito.doThrow(new IllegalStateException("isolated audit failure"))
                .when((nuri.foundation.core.audit.SensitiveAuditPort) org.springframework.test.util.AopTestUtils.getUltimateTargetObject(sensitiveAudit))
                .recordMutation("ADMIN_PASSWORD_RESET", target);

        assertThatThrownBy(() -> users.updatePasswordByAdmin(login(target), "Replacement-test-482!"))
                .isInstanceOf(IllegalStateException.class).hasMessage("isolated audit failure");

        assertThat(storedPassword(target)).isEqualTo(originalPassword);
        assertThat(refreshTokens.existsById(target)).isTrue();
        assertThat(jdbc.queryForObject("SELECT lck_yn FROM tb_user_info WHERE esntl_id=?", String.class, target)).isEqualTo("Y");
        assertThat(jdbc.queryForObject("SELECT lck_cnt FROM tb_user_info WHERE esntl_id=?", Integer.class, target)).isEqualTo(5);
    }

    @Test
    void ordinaryResetKeepsHelpdeskScopeAndOwnPasswordChangeKeepsItsProof() {
        users.updatePasswordByAdmin(login(ordinary), "Ordinary-test-482!");
        assertThat(passwords.matches("Ordinary-test-482!", storedPassword(ordinary))).isTrue();
        authenticate(target);
        users.changePassword(login(target), "Original-test-482!", "Self-change-482!");
        assertThat(passwords.matches("Self-change-482!", storedPassword(target))).isTrue();
        assertThat(refreshTokens.existsById(target)).isFalse();
    }

    @Test
    void protectedUnlockAndBatchStatusUseTheSameTrustBoundaryWithoutChangingOrdinaryUsers() {
        setGrants(actorGroup, "USER_STATUS");
        jdbc.update("UPDATE tb_user_info SET lck_yn='Y',lck_cnt=5 WHERE esntl_id=?", target);
        denied(() -> users.unlockUser(login(target)));
        denied(() -> users.updateUsersStatus(List.of(login(ordinary), login(target)), "C"));
        assertThat(jdbc.queryForList("SELECT user_stts_cd FROM tb_user_info WHERE esntl_id IN (?,?)", String.class, ordinary, target))
                .containsOnly("P");
        assertThat(jdbc.queryForObject("SELECT lck_yn FROM tb_user_info WHERE esntl_id=?", String.class, target)).isEqualTo("Y");
        setGrants(extraGroup, "AUTHRT_GRANT", "AUTHRT_ASSIGN");
        users.unlockUser(target);
        users.updateUsersStatus(List.of(login(target)), "C");
        assertThat(jdbc.queryForObject("SELECT user_stts_cd FROM tb_user_info WHERE esntl_id=?", String.class, target)).isEqualTo("C");
        assertThat(refreshTokens.existsById(target)).as("unlock/status keep their existing session semantics").isTrue();
    }

    /**
     * GAP-SEC-006: 로그인 정책 쓰기는 접속 제한·IP·시간대로 계정의 로그인을 막거나 푼다. 계정 상태 변경·잠금 해제와
     * 같은 신뢰 경계를 실제 DB 권한 합집합으로 쓴다 — 정책 권한만으로는 보호 계정에 제한을 걸지도, 걸린 제한을
     * 바꾸거나 지우지도 못하고, 일반 계정은 종전대로 다룬다.
     */
    @Test
    void loginPolicyWritesUseTheSameProtectedAccountBoundaryWithoutChangingOrdinaryUsers() {
        setGrants(actorGroup, "LOGIN_POL_CREATE", "LOGIN_POL_UPDATE", "LOGIN_POL_DELETE");
        denied(() -> loginPolicies.insertLoginPolicy(policy(target, "Y")));
        assertThat(policyRows(target)).isZero();

        loginPolicies.insertLoginPolicy(policy(ordinary, "Y"));
        assertThat(restriction(ordinary)).isEqualTo("Y");
        loginPolicies.updateLoginPolicy(policy(ordinary, "N"));
        assertThat(restriction(ordinary)).isEqualTo("N");
        loginPolicies.deleteLoginPolicy(policy(ordinary, null));
        assertThat(policyRows(ordinary)).isZero();

        // 권한 설정·배정을 함께 가진 동안에만 보호 계정에 제한을 건다(두 권한은 서로 다른 그룹에서 와도 된다).
        setGrants(extraGroup, "AUTHRT_GRANT", "AUTHRT_ASSIGN");
        loginPolicies.insertLoginPolicy(policy(target, "Y"));
        assertThat(restriction(target)).isEqualTo("Y");

        // 그 권한을 회수하면 걸린 제한을 바꾸지도 지우지도 못한다 — 정책 권한은 여전히 principal 에 있다.
        setGrants(extraGroup, "AUTHRT_GRANT");
        denied(() -> loginPolicies.updateLoginPolicy(policy(target, "N")));
        denied(() -> loginPolicies.deleteLoginPolicy(policy(target, null)));
        assertThat(restriction(target)).isEqualTo("Y");
        assertThat(policyRows(target)).isEqualTo(1);
    }

    /**
     * GAP-SEC-006: 보호 계정 가드를 지나는 사람(권한 설정·배정 보유)이라도 마지막 활성 권한관리자에게 접속 제한을 걸어
     * 아무도 권한을 관리할 수 없게 만들 수는 없다 — 계정 상태 변경과 같은 앞뒤 관리자 수 비교다. 접속 제한(lmt_yn='Y')은
     * 비활성화처럼 로그인을 막으므로 관리자 수에서 빠지고, IP 제한은 그 IP 에서는 로그인할 수 있으므로 빠지지 않는다.
     * 공유 DB 의 시드 관리자를 건드리지 않도록 각 단계는 되돌리는 트랜잭션 안에서 픽스처 밖 사용자를 잠가 둔다.
     */
    @Test
    void loginRestrictionCannotRemoveTheLastActiveManager() {
        setGrants(actorGroup, "LOGIN_POL_CREATE", "LOGIN_POL_UPDATE", "USER_STATUS", "AUTHRT_READ", "AUTHRT_GRANT", "AUTHRT_ASSIGN");

        // 마지막 활성 권한관리자(자기 자신)에게 접속 제한을 걸 수 없다.
        withOnlyFixtureUsersActive(() -> {
            assertThat(administration.managerCount()).as("the actor is the only active manager").isEqualTo(1);
            assertThatThrownBy(() -> loginPolicies.insertLoginPolicy(policy(actor, "Y")))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE)
                    .hasMessageContaining("마지막 활성 권한관리자의 접속은 제한할 수 없습니다");
        });

        // IP 제한은 관리자를 줄이지 않는다 — 관리자 접속을 사무실 IP 로 묶는 것은 정상적인 강화 수단이다.
        withOnlyFixtureUsersActive(() -> {
            loginPolicies.insertLoginPolicy(LoginPolicyDto.builder().userId(login(actor)).ipAddr("192.0.2.10")
                    .lmtYn("N").otpUseYn("N").build());
            assertThat(administration.managerCount()).isEqualTo(1);
            assertThatThrownBy(() -> loginPolicies.updateLoginPolicy(policy(actor, "Y")))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);
        });

        // 다른 활성 권한관리자가 남으면 제한을 걸 수 있고, 제한된 관리자는 더 이상 관리자로 세지 않는다 — 그래서 남은 한
        //   명을 비활성화하는 계정 상태 변경도 막힌다(제한된 관리자를 세면 이 비활성화가 통과해 아무도 로그인할 수 없다).
        withOnlyFixtureUsersActive(() -> {
            setGrants(targetGroup, "AUTHRT_READ", "AUTHRT_GRANT", "AUTHRT_ASSIGN");
            assertThat(administration.managerCount()).isEqualTo(2);
            loginPolicies.insertLoginPolicy(policy(target, "Y"));
            assertThat(administration.managerCount()).as("a login-restricted manager cannot sign in").isEqualTo(1);
            assertThatThrownBy(() -> users.updateUsersStatus(List.of(login(actor)), "D"))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);
        });
        assertThat(policyRows(actor)).isZero();
        assertThat(policyRows(target)).isZero();
    }

    @Test
    void droppingGroupsOrTheirGrantsCannotDowngradeTheTargetForAReset() {
        setGrants(actorGroup, "USER_PASSWORD", "AUTHRT_READ", "AUTHRT_ASSIGN");
        var membership = administration.memberships(target);
        var roster = administration.departmentMemberships(department);
        long auditBefore = auditCount();
        denied(() -> administration.replaceMemberships(target, new ReplaceGroups(List.of(), membership.version(), true)));
        denied(() -> administration.changeDepartmentGroups(department,
                new ChangeDepartmentGroups(List.of(target), targetGroup, "REMOVE", roster.version(), true)));
        denied(() -> administration.changeDepartmentGroups(department,
                new ChangeDepartmentGroups(List.of(ordinary), targetGroup, "ADD", roster.version(), true)));
        denied(() -> users.updatePasswordByAdmin(login(target), "Forbidden-test-482!"));
        setGrants(actorGroup, "USER_PASSWORD", "AUTHRT_READ", "AUTHRT_GRANT");
        var group = administration.group(targetGroup);
        denied(() -> administration.replaceGrants(targetGroup, new ReplaceGrants(List.of(), group.version(), true)));
        assertThat(administration.memberships(target).groups()).containsExactly(targetGroup);
        assertThat(administration.memberships(ordinary).groups()).isEmpty();
        assertThat(administration.group(targetGroup).grants()).containsExactly(new Grant("OPERATION", "USER_PASSWORD"));
        assertThat(auditCount()).isEqualTo(auditBefore);
        assertThat(storedPassword(target)).isEqualTo(originalPassword);
    }

    @Test
    void deletionAndRecreationCannotRemoveProtectedIdentityWithoutBothAdministrationPermissions() {
        setGrants(actorGroup, "USER_DELETE", "AUTHRT_READ", "AUTHRT_DELETE");
        denied(() -> users.deleteUser(login(target)));
        denied(() -> users.deleteUserList(List.of(login(ordinary), login(target))));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_user_info WHERE esntl_id IN (?,?)", Long.class, target, ordinary)).isEqualTo(2);
        setGrants(extraGroup, "USER_PASSWORD");
        jdbc.update("DELETE FROM tb_authrt_user_map WHERE scrty_dcsn_trgt_id=? AND authrt_cd=?", actor, extraGroup);
        denied(() -> administration.deleteGroup(extraGroup, administration.group(extraGroup).version()));
        assertThat(administration.group(extraGroup).grants()).containsExactly(new Grant("OPERATION", "USER_PASSWORD"));
    }

    @Test
    void recoveryGrantCannotBeSelfAcquiredOrRemovedWithGrantAuthorityAlone() {
        setGrants(actorGroup, "AUTHRT_READ", "AUTHRT_GRANT");
        setGrants(targetGroup, "MFA_RECOVER");
        var actorBefore = administration.group(actorGroup);
        var desired = new java.util.ArrayList<>(actorBefore.grants());
        desired.add(new Grant("OPERATION", "MFA_RECOVER"));
        long auditBefore = auditCount();

        denied(() -> administration.replaceGrants(actorGroup, new ReplaceGrants(desired, actorBefore.version(), true)));
        denied(() -> administration.replaceGrants(targetGroup,
                new ReplaceGrants(List.of(), administration.group(targetGroup).version(), true)));
        assertThat(administration.group(actorGroup).grants()).isEqualTo(actorBefore.grants());
        assertThat(administration.group(targetGroup).grants()).containsExactly(new Grant("OPERATION", "MFA_RECOVER"));
        assertThat(auditCount()).isEqualTo(auditBefore);

        setGrants(extraGroup, "AUTHRT_ASSIGN");
        administration.replaceGrants(actorGroup, new ReplaceGrants(desired, actorBefore.version(), true));
        assertThat(administration.group(actorGroup).grants()).contains(new Grant("OPERATION", "MFA_RECOVER"));
        administration.replaceGrants(targetGroup,
                new ReplaceGrants(List.of(), administration.group(targetGroup).version(), true));
        assertThat(administration.group(targetGroup).grants()).isEmpty();
    }

    @Test
    void recoveryMembershipCannotBeSelfAssignedOrChangedThroughDepartmentWithAssignAuthorityAlone() {
        setGrants(actorGroup, "AUTHRT_READ", "AUTHRT_ASSIGN");
        setGrants(targetGroup, "MFA_RECOVER");
        var before = administration.memberships(actor);
        var desired = new java.util.ArrayList<>(before.groups());
        desired.add(targetGroup);
        var roster = administration.departmentMemberships(department);
        long auditBefore = auditCount();

        denied(() -> administration.replaceMemberships(actor, new ReplaceGroups(desired, before.version(), true)));
        denied(() -> administration.replaceMemberships(target,
                new ReplaceGroups(List.of(), administration.memberships(target).version(), true)));
        denied(() -> administration.changeDepartmentGroups(department,
                new ChangeDepartmentGroups(List.of(ordinary), targetGroup, "ADD", roster.version(), true)));
        denied(() -> administration.changeDepartmentGroups(department,
                new ChangeDepartmentGroups(List.of(target), targetGroup, "REMOVE", roster.version(), true)));
        assertThat(administration.memberships(actor).groups()).isEqualTo(before.groups());
        assertThat(administration.memberships(target).groups()).containsExactly(targetGroup);
        assertThat(administration.memberships(ordinary).groups()).isEmpty();
        assertThat(auditCount()).isEqualTo(auditBefore);

        setGrants(extraGroup, "AUTHRT_GRANT");
        administration.replaceMemberships(actor, new ReplaceGroups(desired, before.version(), true));
        assertThat(administration.memberships(actor).groups()).contains(targetGroup);
        administration.changeDepartmentGroups(department,
                new ChangeDepartmentGroups(List.of(target), targetGroup, "REMOVE", roster.version(), true));
        assertThat(administration.memberships(target).groups()).isEmpty();
    }

    @Test
    void deletionCannotBypassRecoveryAuthorityAdministration() {
        setGrants(actorGroup, "AUTHRT_READ", "AUTHRT_ASSIGN", "AUTHRT_DELETE", "USER_DELETE");
        setGrants(targetGroup, "MFA_RECOVER");
        setGrants(extraGroup, "MFA_RECOVER");
        jdbc.update("DELETE FROM tb_authrt_user_map WHERE scrty_dcsn_trgt_id=? AND authrt_cd=?", actor, extraGroup);
        long auditBefore = auditCount();
        denied(() -> users.deleteUser(login(target)));
        denied(() -> users.deleteUserList(List.of(login(ordinary), login(target))));
        denied(() -> administration.deleteGroup(extraGroup, administration.group(extraGroup).version()));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_user_info WHERE esntl_id IN (?,?)", Long.class, target, ordinary)).isEqualTo(2);
        assertThat(administration.group(extraGroup).grants()).containsExactly(new Grant("OPERATION", "MFA_RECOVER"));
        assertThat(auditCount()).isEqualTo(auditBefore);
    }

    @Test
    void recoveryAuthorityAloneDoesNotExpandTheApprovedProtectedAccountClassification() {
        setGrants(targetGroup, "MFA_RECOVER");
        users.updatePasswordByAdmin(login(target), "Replacement-test-482!");
        assertThat(passwords.matches("Replacement-test-482!", storedPassword(target))).isTrue();
        assertThat(refreshTokens.existsById(target)).isFalse();
    }

    @Test
    void departmentMovementDoesNotAlterExplicitGrantsOrMakeTheTargetUnprotected() {
        setGrants(actorGroup, "USER_DEPT", "USER_PASSWORD");
        var before = snapshots.load(target);
        users.moveUsersToDept(List.of(login(target)), otherDepartment);
        assertThat(snapshots.load(target)).isEqualTo(before);
        denied(() -> users.updatePasswordByAdmin(login(target), "Forbidden-test-482!"));
        assertThat(storedPassword(target)).isEqualTo(originalPassword);
    }

    @Test
    void concurrentRevocationWinsBeforeTheWaitingResetCanUseAStalePrincipal() throws Exception {
        setGrants(actorGroup, "USER_PASSWORD", "AUTHRT_GRANT", "AUTHRT_ASSIGN");
        var transactions = new TransactionTemplate(transactionManager);
        try (var executor = Executors.newSingleThreadExecutor()) {
            var waiting = new AtomicReference<java.util.concurrent.Future<Object>>();
            transactions.executeWithoutResult(status -> {
                administration.lockAdministration();
                Long blocker = jdbc.queryForObject("SELECT pg_backend_pid()", Long.class);
                waiting.set(executor.submit(() -> {
                    authenticate(actor);
                    try {
                        users.updatePasswordByAdmin(login(target), "Forbidden-test-482!");
                        return Boolean.TRUE;
                    } catch (BusinessException denied) {
                        return denied.getErrorCode();
                    } finally {
                        SecurityContextHolder.clearContext();
                    }
                }));
                long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
                boolean blocked = false;
                while (System.nanoTime() < deadline) {
                    Boolean observed = jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM pg_locks "
                            + "WHERE NOT granted AND ?=ANY(pg_blocking_pids(pid)))", Boolean.class, blocker);
                    if (Boolean.TRUE.equals(observed)) { blocked = true; break; }
                    java.util.concurrent.locks.LockSupport.parkNanos(TimeUnit.MILLISECONDS.toNanos(20));
                }
                assertThat(blocked).as("reset must actually wait on the shared administrative lock").isTrue();
                jdbc.update("DELETE FROM tb_authrt_grnt_map WHERE authrt_cd=? AND authrt_grnt_cd='AUTHRT_ASSIGN'", actorGroup);
            });
            assertThat(waiting.get().get(10, TimeUnit.SECONDS)).isEqualTo(CommonErrorCode.ACCESS_DENIED);
        }
        assertThat(storedPassword(target)).isEqualTo(originalPassword);
        assertThat(refreshTokens.existsById(target)).isTrue();
    }

    private void setGrants(String group, String... permissions) {
        jdbc.update("DELETE FROM tb_authrt_grnt_map WHERE authrt_cd=?", group);
        for (String permission : permissions) {
            jdbc.update("INSERT INTO tb_authrt_grnt_map(authrt_cd,authrt_type_cd,authrt_grnt_cd,crt_dt,mdfcn_dt,frst_rgtr_id,last_mdfr_id) "
                    + "VALUES(?,'OPERATION',?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'SYSTEM','SYSTEM')", group, permission);
        }
    }

    private void membership(String id, String group) {
        jdbc.update("INSERT INTO tb_authrt_user_map(scrty_dcsn_trgt_id,authrt_cd,mbr_type_cd,crt_dt,mdfcn_dt,frst_rgtr_id,last_mdfr_id) "
                + "VALUES(?,?,'USR03',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'SYSTEM','SYSTEM')", id, group);
    }

    /**
     * 픽스처 밖 사용자(공유 DB 의 시드 관리자 포함)를 잠가 이 픽스처만 활성 권한관리자 후보로 두고 단계를 실행한 뒤 모두
     * 되돌린다. 단계 안의 서비스 호출은 이 트랜잭션에 참여하므로 그 쓰기도 함께 되돌아간다.
     */
    private void withOnlyFixtureUsersActive(Runnable step) {
        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
            status.setRollbackOnly();
            jdbc.update("UPDATE tb_user_info SET lck_yn='Y' WHERE esntl_id NOT IN (?,?,?) AND coalesce(lck_yn,'N')<>'Y'",
                    actor, target, ordinary);
            step.run();
        });
    }

    private static String login(String id) { return id + "L"; }

    private static LoginPolicyDto policy(String id, String lmtYn) {
        return LoginPolicyDto.builder().userId(login(id)).lmtYn(lmtYn).otpUseYn("N").build();
    }

    private long policyRows(String id) {
        return jdbc.queryForObject("SELECT count(*) FROM tb_login_policy WHERE user_id=?", Long.class, login(id));
    }

    private String restriction(String id) {
        return jdbc.queryForObject("SELECT lmt_yn FROM tb_login_policy WHERE user_id=?", String.class, login(id));
    }

    private String storedPassword(String id) {
        return jdbc.queryForObject("SELECT pswd FROM tb_user_info WHERE esntl_id=?", String.class, id);
    }

    private long auditCount() {
        return jdbc.queryForObject("SELECT count(*) FROM tb_authrt_chg_hstry WHERE chg_user_idntfr=?", Long.class, actor);
    }

    private static void denied(Runnable action) {
        assertThatThrownBy(action::run).isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
    }

    private static void authenticate(String id) {
        var principal = CustomUserDetails.builder().esntlId(id).userId(login(id)).enabled(true).lockAt("N")
                .groups(List.of("ROLE_ADMIN")).permissions(PermissionCodes.ALL.stream().sorted().toList()).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }
}
