package nuri.api.schema;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import javax.sql.DataSource;
import nuri.business.security.authorization.AuthorizationSnapshotService;
import nuri.business.security.authorization.PermissionCodes;
import nuri.business.service.auth.AuthorizationAdministrationService;
import nuri.business.service.auth.dto.AuthorizationDto.CreateGroup;
import nuri.business.service.auth.dto.AuthorizationDto.ChangeDepartmentGroups;
import nuri.business.service.auth.dto.AuthorizationDto.ChangeGroupMembers;
import nuri.business.service.auth.dto.AuthorizationDto.CopyGroup;
import nuri.business.service.auth.dto.AuthorizationDto.UserChoice;
import nuri.business.service.auth.dto.AuthorizationDto.Grant;
import nuri.business.service.auth.dto.AuthorizationDto.ReplaceGrants;
import nuri.business.service.auth.dto.AuthorizationDto.ReplaceGroups;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.AbstractDataSource;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.IllegalTransactionStateException;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import org.springframework.transaction.interceptor.TransactionInterceptor;
import org.springframework.transaction.support.TransactionTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** 실제 PostgreSQL과 Spring @Transactional proxy로 관리 서비스의 인가·감사·경합을 검증한다. */
@Tag("schema-validation")
@DisplayName("권한 관리 서비스 PostgreSQL 트랜잭션·복수 그룹·회수·최종 관리자 보호")
class AuthorizationAdministrationIntegrationTest extends SharedPostgresMigrationTestSupport {
    private JdbcTemplate jdbc;
    private AuthorizationAdministrationService service;
    private AuthorizationSnapshotService snapshots;
    private TransactionTemplate transaction;

    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void preservesAuthorizationAndAuditAcrossReplacementRollbackAndConcurrentRevocation() throws Exception {
        migrateThroughAuthorizationCutover();
        try (Connection connection=openConnection()) {
        }
        DataSource source=new AbstractDataSource() {
            @Override public Connection getConnection() throws SQLException { return openConnection(); }
            @Override public Connection getConnection(String username,String password) throws SQLException {
                throw new java.sql.SQLFeatureNotSupportedException("Test datasource uses its isolated database credentials");
            }
        };
        jdbc=new JdbcTemplate(source);
        var manager=new DataSourceTransactionManager(source);
        transaction=new TransactionTemplate(manager);
        var proxy=new ProxyFactory(new AuthorizationAdministrationService(jdbc));
        proxy.setProxyTargetClass(true);
        var interceptor=new TransactionInterceptor();
        interceptor.setTransactionManager(manager);
        interceptor.setTransactionAttributeSource(new AnnotationTransactionAttributeSource());
        proxy.addAdvice(interceptor);
        service=(AuthorizationAdministrationService) proxy.getProxy();
        snapshots=new AuthorizationSnapshotService(jdbc);
        insertUser("TEST_OPERATOR");
        jdbc.update("UPDATE tb_user_info SET user_id='test_operator' WHERE esntl_id='TEST_OPERATOR'");
        jdbc.update("INSERT INTO tb_authrt_user_map(scrty_dcsn_trgt_id,authrt_cd,mbr_type_cd,crt_dt,mdfcn_dt,frst_rgtr_id,last_mdfr_id) "
                + "VALUES('TEST_OPERATOR','ROLE_ADMIN','USR03',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'SYSTEM','SYSTEM')");
        authenticateOperator();

        assertThat(service.managerCount()).as("bootstrap must preserve an active permission manager").isPositive();
        var originalAdmin=service.group("ROLE_ADMIN");
        assertThatThrownBy(() -> service.replaceGrants("ROLE_ADMIN",new ReplaceGrants(List.of(),originalAdmin.version(),true)))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode",CommonErrorCode.INVALID_INPUT_VALUE);
        assertThat(service.group("ROLE_ADMIN")).isEqualTo(originalAdmin);
        long auditBeforeReadRevocation=jdbc.queryForObject("SELECT count(*) FROM tb_authrt_chg_hstry",Long.class);
        var withoutRead=originalAdmin.grants().stream()
                .filter(grant -> !("OPERATION".equals(grant.type()) && "AUTHRT_READ".equals(grant.code()))).toList();
        assertThat(withoutRead).contains(new Grant("OPERATION","AUTHRT_ASSIGN"),new Grant("OPERATION","AUTHRT_GRANT"));
        assertThatThrownBy(() -> service.replaceGrants("ROLE_ADMIN",new ReplaceGrants(withoutRead,originalAdmin.version(),true)))
                .as("the final managers must still be able to read a complete version before writing")
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode",CommonErrorCode.INVALID_INPUT_VALUE);
        assertThat(service.group("ROLE_ADMIN")).isEqualTo(originalAdmin);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_authrt_chg_hstry",Long.class)).isEqualTo(auditBeforeReadRevocation);

        verifyMultipleGroupsCompleteSnapshotsAndRevocation();
        verifyNavigationHierarchy();
        verifyDepartmentDeltasPreserveOtherGroupsAndRejectStaleRosters();
        verifyBatchSnapshotsAndUnknownOperationFailClosed();
        verifyGroupMemberDeltaKeepsGroupDraftsCurrent();
        verifyGroupCopyCarriesGrantsWithProvenanceButNoMembers();
        verifyStalePrincipalCannotWriteAfterDatabaseRevocation();
        verifyAuditFailureRollsBackTheActualServiceMutation();
        verifyExplicitMenuGrantCreationRevocationAndDeletion();
        verifyMandatorySignupDefaultAndDeleteAudit();
        verifyConcurrentLastManagerProtection();
    }

    private void verifyMultipleGroupsCompleteSnapshotsAndRevocation() {
        service.createGroup(new CreateGroup("T_MULTI_A","테스트 A","\"".repeat(4000)));
        service.createGroup(new CreateGroup("T_MULTI_B","테스트 B",null));
        assertThat(jdbc.queryForObject("SELECT char_length(chg_aftr_cn) FROM tb_authrt_chg_hstry "
                + "WHERE authrt_cd='T_MULTI_A' AND chg_artcl_nm='authrt_expln'",Integer.class)).isEqualTo(4000);
        long menu=jdbc.queryForObject("SELECT min(menu_sn) FROM tb_menu_info WHERE up_menu_sn IS NULL OR up_menu_sn=0",Long.class);
        List<Grant> a=List.of(new Grant("OPERATION","MENU_READ"),new Grant("NAVIGATION",Long.toString(menu)));
        // [2026-10-04 프로그램 목록 퇴역] 두 번째 그룹의 다른 기능 권한 예시를 PROGRAM_READ 에서 ADMCODE_READ 로 옮겼다(권한 스냅샷은 코드 이름순이다).
        List<Grant> b=List.of(new Grant("OPERATION","MENU_READ"),new Grant("OPERATION","ADMCODE_READ"));
        replaceGrants("T_MULTI_A",a);
        replaceGrants("T_MULTI_B",b);
        insertUser("T_MULTI_USER");
        replaceGroups("T_MULTI_USER",List.of("T_MULTI_A","T_MULTI_B"));
        var assigned=snapshots.load("T_MULTI_USER");
        assertThat(assigned.groups()).containsExactly("T_MULTI_A","T_MULTI_B");
        assertThat(assigned.permissions()).containsExactly("ADMCODE_READ","MENU_READ");
        assertThat(assigned.permissions()).doesNotContain(Long.toString(menu),"ROLE_USER");

        var complete=service.memberships("T_MULTI_USER");
        assertThat(complete.complete()).isTrue();
        assertThat(complete.groups()).hasSize(2);
        assertThat(service.users("T_",0,1).getContent()).hasSize(1);
        assertThatThrownBy(() -> service.replaceMemberships("T_MULTI_USER",new ReplaceGroups(List.of("T_MULTI_A"),complete.version(),false)))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode",CommonErrorCode.INVALID_INPUT_VALUE);
        assertThat(service.memberships("T_MULTI_USER")).isEqualTo(complete);
        assertThatThrownBy(() -> service.replaceMemberships("T_MULTI_USER",
                new ReplaceGroups(List.of("ROLE_ANONYMOUS"),complete.version(),true)))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode",CommonErrorCode.INVALID_INPUT_VALUE);
        assertThat(service.memberships("T_MULTI_USER")).isEqualTo(complete);
        var group=service.group("T_MULTI_A");
        List<List<Grant>> invalid=List.of(
                List.of(new Grant("OPERATION","UNKNOWN_PERMISSION")),
                List.of(new Grant("NAVIGATION","9223372036854775807")),
                List.of(new Grant("NAVIGATION","9999999999999999999")),
                List.of(new Grant("URL","MENU_READ")),
                List.of(new Grant("OPERATION","MENU_READ"),new Grant("OPERATION","MENU_READ")));
        for (var grants:invalid) {
            assertThatThrownBy(() -> service.replaceGrants("T_MULTI_A",new ReplaceGrants(grants,group.version(),true)))
                    .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode",CommonErrorCode.INVALID_INPUT_VALUE);
            assertThat(service.group("T_MULTI_A")).isEqualTo(group);
        }
        assertThatThrownBy(() -> service.replaceGrants("T_MULTI_A",new ReplaceGrants(a,group.version(),false)))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode",CommonErrorCode.INVALID_INPUT_VALUE);

        replaceGroups("T_MULTI_USER",List.of("T_MULTI_B"));
        assertThat(snapshots.load("T_MULTI_USER").permissions()).containsExactly("ADMCODE_READ","MENU_READ");
        assertThat(snapshots.load("T_MULTI_USER").authorizationVersion()).isNotEqualTo(assigned.authorizationVersion());
        assertThatThrownBy(() -> service.replaceMemberships("T_MULTI_USER",new ReplaceGroups(List.of(),complete.version(),true)))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode",CommonErrorCode.CONCURRENT_MODIFICATION);
        replaceGroups("T_MULTI_USER",List.of());
        assertThat(snapshots.load("T_MULTI_USER").groups()).isEmpty();
        assertThat(snapshots.load("T_MULTI_USER").permissions()).isEmpty();

        // Same visible state after add/remove must still invalidate the earlier version (ABA).
        String beforeAba=service.group("T_MULTI_A").version();
        replaceGrants("T_MULTI_A",List.of());
        replaceGrants("T_MULTI_A",a);
        assertThatThrownBy(() -> service.replaceGrants("T_MULTI_A",new ReplaceGrants(List.of(),beforeAba,true)))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode",CommonErrorCode.CONCURRENT_MODIFICATION);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_authrt_chg_hstry WHERE scrty_dcsn_trgt_id='T_MULTI_USER' "
                + "AND chg_user_idntfr='TEST_OPERATOR' AND frst_rgtr_id='test_operator'",Long.class)).isEqualTo(4);
    }

    private void verifyDepartmentDeltasPreserveOtherGroupsAndRejectStaleRosters() {
        // This rejection needs an existing, unassignable group. Reduced bootstrap profiles do not
        // need an anonymous group, so the isolated fixture supplies its own prerequisite.
        jdbc.update("INSERT INTO tb_authrt_info(authrt_cd,authrt_nm,frst_rgtr_id,last_mdfr_id,crt_dt,mdfcn_dt) "
                + "VALUES('ROLE_ANONYMOUS','fixture anonymous','TEST','TEST',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) "
                + "ON CONFLICT (authrt_cd) DO NOTHING");
        jdbc.update("INSERT INTO tb_ognz_info(ognz_id,ognz_nm) VALUES('T_DEPT_A','권한 시험 A'),('T_DEPT_B','권한 시험 B')");
        for (String id:List.of("T_DEPT_USER_A","T_DEPT_USER_B","T_DEPT_OUTSIDE")) {
            insertUser(id);
            jdbc.update("UPDATE tb_user_info SET ognz_id=? WHERE esntl_id=?",id.equals("T_DEPT_OUTSIDE")?"T_DEPT_B":"T_DEPT_A",id);
            replaceGroups(id,List.of("T_MULTI_A"));
        }
        var before=service.departmentMemberships("T_DEPT_A");
        assertThat(before.complete()).isTrue();
        assertThat(before.users()).extracting(member -> member.userId()).containsExactly("T_DEPT_USER_A","T_DEPT_USER_B");
        assertThat(before.users()).allSatisfy(member -> {
            assertThat(member.loginId()).isEqualTo(member.userId());
            assertThat(member.userName()).isEqualTo(member.userId());
            assertThat(member.complete()).isTrue();
        });
        for (var rejected:List.of(
                new ChangeDepartmentGroups(List.of("T_DEPT_OUTSIDE"),"T_MULTI_B","ADD",before.version(),true),
                new ChangeDepartmentGroups(List.of("T_DEPT_USER_A"),"T_MULTI_B","ADD",before.version(),false),
                new ChangeDepartmentGroups(List.of("T_DEPT_USER_A"),"ROLE_ANONYMOUS","ADD",before.version(),true))) {
            assertThatThrownBy(() -> service.changeDepartmentGroups("T_DEPT_A",rejected))
                    .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode",CommonErrorCode.INVALID_INPUT_VALUE);
            assertThat(service.departmentMemberships("T_DEPT_A")).isEqualTo(before);
        }
        var added=service.changeDepartmentGroups("T_DEPT_A",new ChangeDepartmentGroups(
                List.of("T_DEPT_USER_A","T_DEPT_USER_B"),"T_MULTI_B","ADD",before.version(),true));
        assertThat(added.version()).isNotEqualTo(before.version());
        assertThat(added.users()).allSatisfy(member -> assertThat(member.groups()).containsExactly("T_MULTI_A","T_MULTI_B"));
        assertThat(service.memberships("T_DEPT_OUTSIDE").groups()).containsExactly("T_MULTI_A");
        assertThat(jdbc.queryForObject("SELECT count(DISTINCT dmnd_idntfr) FROM tb_authrt_chg_hstry "
                + "WHERE authrt_cd='T_MULTI_B' AND chg_type_cd='ADD' AND scrty_dcsn_trgt_id IN ('T_DEPT_USER_A','T_DEPT_USER_B')",Long.class)).isEqualTo(1);
        assertThatThrownBy(() -> service.changeDepartmentGroups("T_DEPT_A",new ChangeDepartmentGroups(
                List.of("T_DEPT_USER_A"),"T_MULTI_B","REMOVE",before.version(),true)))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode",CommonErrorCode.CONCURRENT_MODIFICATION);
        service.changeDepartmentGroups("T_DEPT_A",new ChangeDepartmentGroups(
                List.of("T_DEPT_USER_A"),"T_MULTI_B","REMOVE",added.version(),true));
        assertThat(service.memberships("T_DEPT_USER_A").groups()).containsExactly("T_MULTI_A");
        assertThat(service.memberships("T_DEPT_USER_B").groups()).containsExactly("T_MULTI_A","T_MULTI_B");
        var today=jdbc.queryForObject("SELECT CURRENT_DATE",java.sql.Date.class).toLocalDate();
        var history=service.history(0,1,"T_MULTI_B","T_DEPT_USER_A","TEST_OPERATOR",today,today);
        assertThat(history.getTotalElements()).isEqualTo(2);
        assertThat(history.getContent()).hasSize(1);
        assertThat(service.history(0,20,"T_MULTI_B","T_DEPT_USER_A","OTHER_ACTOR",today,today).getTotalElements()).isZero();
        // [2026-09-26 DIP V9] 화면의 처리자 칸에는 사람이 로그인 ID 를 입력한다. 사용자 식별자로만 찾으면 늘 0건이었다.
        var byLogin=service.history(0,20,"T_MULTI_B","T_DEPT_USER_A","test_operator",today,today);
        assertThat(byLogin.getTotalElements()).isEqualTo(2);
        assertThat(byLogin.getContent()).allSatisfy(change -> {
            assertThat(change.actorNm()).isEqualTo("TEST_OPERATOR");
            assertThat(change.userNm()).isEqualTo("T_DEPT_USER_A");
        });
        assertThatThrownBy(() -> service.history(0,20,null,null,null,today.plusDays(1),today))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode",CommonErrorCode.INVALID_INPUT_VALUE);

        // [2026-10-01] 대상도 로그인 ID 로 찾는다 — 이력의 대상 칸은 esntlId 라 종전에는 화면에서 아는 값으로 0건이었다.
        jdbc.update("UPDATE tb_user_info SET user_id='dept_user_a' WHERE esntl_id='T_DEPT_USER_A'");
        try {
            assertThat(service.history(0,20,"T_MULTI_B","dept_user_a",null,today,today).getTotalElements()).isEqualTo(2);
            assertThat(service.history(0,20,"T_MULTI_B","T_DEPT_USER_A",null,today,today).getTotalElements()).isEqualTo(2);
        } finally {
            jdbc.update("UPDATE tb_user_info SET user_id='T_DEPT_USER_A' WHERE esntl_id='T_DEPT_USER_A'");
        }

        // [2026-10-01] 그룹 쪽에서 배정된 사용자를 본다. 삭제 거부는 몇 명을 해제해야 하는지 말한다.
        var members=service.groupMembers("T_MULTI_B",0,100);
        assertThat(members.getContent()).extracting(member -> member.id()).contains("T_DEPT_USER_B").doesNotContain("T_DEPT_USER_A");
        assertThat(members.getTotalElements()).isEqualTo(members.getContent().size());
        assertThatThrownBy(() -> service.groupMembers("T_NO_SUCH_GROUP",0,20))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode",CommonErrorCode.RESOURCE_NOT_FOUND);
        assertThatThrownBy(() -> service.deleteGroup("T_MULTI_B",service.group("T_MULTI_B").version()))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode",CommonErrorCode.RESOURCE_IN_USE)
                .hasMessageContaining(members.getTotalElements() + "명이 있어 삭제할 수 없습니다");
    }

    private void verifyBatchSnapshotsAndUnknownOperationFailClosed() {
        insertUser("T_BATCH_EMPTY");
        var loaded=snapshots.loadAll(List.of("T_DEPT_USER_A","T_DEPT_USER_B","T_BATCH_EMPTY"));
        assertThat(loaded).hasSize(3);
        assertThat(loaded.get("T_DEPT_USER_A").groups()).containsExactly("T_MULTI_A");
        assertThat(loaded.get("T_DEPT_USER_A").permissions()).containsExactly("MENU_READ");
        assertThat(loaded.get("T_DEPT_USER_B").groups()).containsExactly("T_MULTI_A","T_MULTI_B");
        assertThat(loaded.get("T_DEPT_USER_B").permissions()).containsExactly("ADMCODE_READ","MENU_READ");
        assertThat(loaded.get("T_BATCH_EMPTY").groups()).isEmpty();
        assertThat(loaded.get("T_BATCH_EMPTY").permissions()).isEmpty();
        assertThat(snapshots.loadAll(List.of())).isEmpty();
        // Deliberately corrupt only this disposable fixture to prove the code-owned catalog boundary.
        jdbc.update("INSERT INTO tb_authrt_grnt_map(authrt_cd,authrt_type_cd,authrt_grnt_cd,crt_dt,mdfcn_dt,frst_rgtr_id,last_mdfr_id) "
                + "VALUES('T_MULTI_A','OPERATION','UNKNOWN_PERMISSION',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'SYSTEM','SYSTEM')");
        try {
            assertThatThrownBy(() -> snapshots.loadAll(List.of("T_DEPT_USER_A","T_DEPT_USER_B","T_BATCH_EMPTY")))
                    .isInstanceOf(IllegalStateException.class).hasMessageContaining("Unknown stored operation");
        } finally {
            jdbc.update("DELETE FROM tb_authrt_grnt_map WHERE authrt_cd='T_MULTI_A' AND authrt_type_cd='OPERATION' AND authrt_grnt_cd='UNKNOWN_PERMISSION'");
        }
        assertThat(snapshots.loadAll(loaded.keySet())).isEqualTo(loaded);
    }

    /**
     * [2026-10-02] 그룹 쪽 구성원 일괄 변경. 구성원 이력은 사용자 축에만 있어 같은 그룹의 기능권한 초안이 409 가 되지 않는다.
     * 다른 관리자가 먼저 바꾼 사람은 이름을 밝혀 409 로 전부 거부한다. 끝에서 구성원을 원래대로 되돌린다.
     */
    private void verifyGroupMemberDeltaKeepsGroupDraftsCurrent() {
        var groupBefore=service.group("T_MULTI_B");
        String membershipBefore=service.memberships("T_BATCH_EMPTY").version();
        long lastAudit=jdbc.queryForObject("SELECT max(authrt_chg_hstry_sn) FROM tb_authrt_chg_hstry",Long.class);
        var changed=service.changeGroupMembers("T_MULTI_B",new ChangeGroupMembers(
                List.of("T_DEPT_USER_A","T_BATCH_EMPTY"),List.of("T_DEPT_USER_B"),true));
        assertThat(changed.added()).extracting(UserChoice::id).containsExactly("T_BATCH_EMPTY","T_DEPT_USER_A");
        assertThat(changed.removed()).extracting(UserChoice::id).containsExactly("T_DEPT_USER_B");
        assertThat(changed.memberCount()).isEqualTo(service.groupMembers("T_MULTI_B",0,100).getTotalElements()).isEqualTo(2);
        assertThat(service.memberships("T_DEPT_USER_A").groups()).containsExactly("T_MULTI_A","T_MULTI_B");
        assertThat(service.memberships("T_DEPT_USER_B").groups()).containsExactly("T_MULTI_A");
        assertThat(service.memberships("T_BATCH_EMPTY").version()).isNotEqualTo(membershipBefore);
        assertThat(jdbc.queryForObject("SELECT count(DISTINCT dmnd_idntfr) FROM tb_authrt_chg_hstry WHERE authrt_chg_hstry_sn>? "
                + "AND authrt_cd='T_MULTI_B' AND chg_trgt_type_cd='USER_GROUP'",Long.class,lastAudit)).isEqualTo(1);

        // 구성원 변경 뒤에도 옛 그룹 버전으로 권한 저장이 성공하고, 저장 응답이 새 버전을 준다.
        assertThat(service.group("T_MULTI_B").version()).isEqualTo(groupBefore.version());
        var narrowed=service.replaceGrants("T_MULTI_B",new ReplaceGrants(List.of(new Grant("OPERATION","MENU_READ")),groupBefore.version(),true));
        assertThat(narrowed.grants()).containsExactly(new Grant("OPERATION","MENU_READ"));
        assertThat(narrowed).isEqualTo(service.group("T_MULTI_B"));
        // 권한 변경은 여전히 옛 버전을 낡게 만든다.
        assertThatThrownBy(() -> service.replaceGrants("T_MULTI_B",new ReplaceGrants(groupBefore.grants(),groupBefore.version(),true)))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode",CommonErrorCode.CONCURRENT_MODIFICATION);
        var restored=service.replaceGrants("T_MULTI_B",new ReplaceGrants(groupBefore.grants(),narrowed.version(),true));
        assertThat(restored.grants()).containsExactlyElementsOf(groupBefore.grants());

        // 이미 구성원인 사람을 더하거나 구성원이 아닌 사람을 빼면, 그 사람을 밝혀 전부 거부한다.
        var before=service.groupMembers("T_MULTI_B",0,100).getContent();
        assertThatThrownBy(() -> service.changeGroupMembers("T_MULTI_B",new ChangeGroupMembers(
                List.of("T_DEPT_USER_A","T_DEPT_OUTSIDE"),List.of(),true)))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode",CommonErrorCode.CONCURRENT_MODIFICATION)
                .hasMessageContaining("이미 구성원인 사용자 T_DEPT_USER_A(T_DEPT_USER_A)");
        assertThatThrownBy(() -> service.changeGroupMembers("T_MULTI_B",new ChangeGroupMembers(
                List.of(),List.of("T_DEPT_USER_B"),true)))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode",CommonErrorCode.CONCURRENT_MODIFICATION)
                .hasMessageContaining("구성원이 아닌 사용자 T_DEPT_USER_B(T_DEPT_USER_B)");
        assertThatThrownBy(() -> service.changeGroupMembers("T_MULTI_B",new ChangeGroupMembers(
                List.of("T_DEPT_OUTSIDE","T_NOBODY"),List.of(),true)))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode",CommonErrorCode.INVALID_INPUT_VALUE)
                .hasMessageContaining("존재하지 않는 사용자가 있습니다: T_NOBODY");
        assertThat(service.groupMembers("T_MULTI_B",0,100).getContent()).isEqualTo(before);
        assertThat(service.memberships("T_DEPT_OUTSIDE").groups()).containsExactly("T_MULTI_A");

        service.changeGroupMembers("T_MULTI_B",new ChangeGroupMembers(List.of("T_DEPT_USER_B"),List.of("T_DEPT_USER_A","T_BATCH_EMPTY"),true));
        assertThat(service.memberships("T_DEPT_USER_A").groups()).containsExactly("T_MULTI_A");
        assertThat(service.memberships("T_DEPT_USER_B").groups()).containsExactly("T_MULTI_A","T_MULTI_B");
        assertThat(service.memberships("T_BATCH_EMPTY").groups()).isEmpty();
    }

    /** [2026-10-02] 그룹 복제 — 권한은 옮기고 구성원은 옮기지 않으며, 이력 사유에 원본을 남긴다. 전체 그룹 권한 읽기도 함께 본다. */
    private void verifyGroupCopyCarriesGrantsWithProvenanceButNoMembers() {
        var source=service.group("T_MULTI_A");
        var copy=service.copyGroup("T_MULTI_A",new CopyGroup("T_COPY_A","복제 시험",null,source.version()));
        assertThat(copy.code()).isEqualTo("T_COPY_A");
        assertThat(copy.grants()).containsExactlyElementsOf(source.grants());
        assertThat(service.group("T_MULTI_A")).isEqualTo(source);
        assertThat(service.groupMembers("T_COPY_A",0,20).getTotalElements()).isZero();
        assertThat(jdbc.queryForList("SELECT DISTINCT chg_rsn FROM tb_authrt_chg_hstry WHERE authrt_cd='T_COPY_A'",String.class))
                .containsExactly("복제 원본: T_MULTI_A");
        assertThat(jdbc.queryForObject("SELECT count(DISTINCT dmnd_idntfr) FROM tb_authrt_chg_hstry WHERE authrt_cd='T_COPY_A'",Long.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_authrt_chg_hstry WHERE authrt_cd='T_COPY_A' "
                + "AND chg_trgt_type_cd='GROUP_GRANT' AND chg_type_cd='ADD'",Long.class)).isEqualTo(source.grants().size());
        var today=jdbc.queryForObject("SELECT CURRENT_DATE",java.sql.Date.class).toLocalDate();
        assertThat(service.history(0,50,"T_COPY_A",null,null,today,today).getContent())
                .isNotEmpty().allSatisfy(change -> assertThat(change.reason()).isEqualTo("복제 원본: T_MULTI_A"));

        var matrix=service.grantMatrix();
        assertThat(matrix.catalogVersion()).isEqualTo(PermissionCodes.CATALOG_VERSION);
        assertThat(matrix.groups()).filteredOn(group -> group.code().equals("T_COPY_A")).singleElement().isEqualTo(service.group("T_COPY_A"));
        assertThat(matrix.groups()).extracting(group -> group.code())
                .containsExactlyElementsOf(jdbc.queryForList("SELECT authrt_cd FROM tb_authrt_info ORDER BY authrt_cd",String.class));

        assertThatThrownBy(() -> service.copyGroup("T_MULTI_A",new CopyGroup("T_COPY_B","x",null,"stale")))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode",CommonErrorCode.CONCURRENT_MODIFICATION);
        assertThatThrownBy(() -> service.copyGroup("T_MULTI_A",new CopyGroup("T_MULTI_B","x",null,source.version())))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode",CommonErrorCode.INVALID_INPUT_VALUE);
        // 원본에 상위 메뉴 없이 하위 메뉴만 보이는 정리되지 않은 표시가 있으면 이름을 밝혀 거부하고 아무것도 만들지 않는다.
        Long root=jdbc.queryForObject("INSERT INTO tb_menu_info(menu_nm,menu_ordr,use_yn) VALUES('복제 검증 상위',1,'Y') RETURNING menu_sn",Long.class);
        Long child=jdbc.queryForObject("INSERT INTO tb_menu_info(menu_nm,up_menu_sn,menu_ordr,use_yn) VALUES('복제 검증 하위',?,1,'Y') RETURNING menu_sn",Long.class,root);
        service.createGroup(new CreateGroup("T_COPY_ORPHAN","정리 안 된 원본",null));
        jdbc.update("INSERT INTO tb_authrt_grnt_map(authrt_cd,authrt_type_cd,authrt_grnt_cd,crt_dt,mdfcn_dt,frst_rgtr_id,last_mdfr_id) "
                + "VALUES('T_COPY_ORPHAN','NAVIGATION',?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'SYSTEM','SYSTEM')",child.toString());
        try {
            assertThatThrownBy(() -> service.copyGroup("T_COPY_ORPHAN",new CopyGroup("T_COPY_C","x",null,service.group("T_COPY_ORPHAN").version())))
                    .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode",CommonErrorCode.INVALID_INPUT_VALUE)
                    .hasMessageContaining("'복제 검증 하위'");
            assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_authrt_info WHERE authrt_cd='T_COPY_C'",Long.class)).isZero();
        } finally {
            service.deleteGroup("T_COPY_ORPHAN",service.group("T_COPY_ORPHAN").version());
            service.deleteGroup("T_COPY_A",service.group("T_COPY_A").version());
            jdbc.update("DELETE FROM tb_menu_info WHERE menu_sn IN (?,?)",root,child);
        }
    }

    private void verifyStalePrincipalCannotWriteAfterDatabaseRevocation() throws Exception {
        insertUser("T_STALE_ACTOR");
        var stale=CustomUserDetails.builder().userId("T_STALE_ACTOR").esntlId("T_STALE_ACTOR")
                .groups(List.of("ROLE_ADMIN")).permissions(PermissionCodes.ALL.stream().sorted().toList()).enabled(true).build();
        authenticate(stale);
        assertThatThrownBy(() -> service.createGroup(new CreateGroup("T_STALE_GROUP","stale",null)))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode",CommonErrorCode.ACCESS_DENIED);
        authenticateOperator();
        replaceGroups("T_STALE_ACTOR",List.of("ROLE_ADMIN"));
        jdbc.update("UPDATE tb_user_info SET user_stts_cd='C' WHERE esntl_id='T_STALE_ACTOR'");
        authenticate(stale);
        assertThatThrownBy(() -> service.createGroup(new CreateGroup("T_STALE_GROUP","stale",null)))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode",CommonErrorCode.ACCESS_DENIED);
        jdbc.update("UPDATE tb_user_info SET user_stts_cd='P' WHERE esntl_id='T_STALE_ACTOR'");
        authenticateOperator();

        try (var executor=Executors.newSingleThreadExecutor()) {
            java.util.concurrent.atomic.AtomicReference<java.util.concurrent.Future<Object>> waiting=new java.util.concurrent.atomic.AtomicReference<>();
            transaction.executeWithoutResult(status -> {
                service.lockAdministration();
                Long blocker=jdbc.queryForObject("SELECT pg_backend_pid()",Long.class);
                waiting.set(executor.submit(() -> {
                    authenticate(stale);
                    try {
                        service.createGroup(new CreateGroup("T_STALE_GROUP","waiting",null));
                        return Boolean.TRUE;
                    } catch (BusinessException denied) {
                        return denied.getErrorCode();
                    } finally {
                        SecurityContextHolder.clearContext();
                    }
                }));
                long deadline=System.nanoTime()+TimeUnit.SECONDS.toNanos(5);
                boolean blocked=false;
                while (System.nanoTime()<deadline) {
                    Boolean observed=jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM pg_locks "
                            + "WHERE NOT granted AND ?=ANY(pg_blocking_pids(pid)))",Boolean.class,blocker);
                    if (Boolean.TRUE.equals(observed)) { blocked=true; break; }
                    java.util.concurrent.locks.LockSupport.parkNanos(TimeUnit.MILLISECONDS.toNanos(20));
                }
                assertThat(blocked).as("stale request must actually wait on the administrative row lock").isTrue();
                replaceGroups("T_STALE_ACTOR",List.of());
            });
            assertThat(waiting.get().get(10,TimeUnit.SECONDS)).isEqualTo(CommonErrorCode.ACCESS_DENIED);
        }
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_authrt_info WHERE authrt_cd='T_STALE_GROUP'",Long.class)).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_authrt_chg_hstry WHERE authrt_cd='T_STALE_GROUP'",Long.class)).isZero();
    }

    private void verifyAuditFailureRollsBackTheActualServiceMutation() {
        service.createGroup(new CreateGroup("T_AUDIT","감사 실패 검증",null));
        var before=service.group("T_AUDIT");
        jdbc.execute("CREATE FUNCTION reject_authorization_test_audit() RETURNS trigger LANGUAGE plpgsql AS $$ "
                + "BEGIN IF NEW.authrt_cd='T_AUDIT' THEN RAISE EXCEPTION 'intentional audit failure'; END IF; RETURN NEW; END $$");
        jdbc.execute("CREATE TRIGGER reject_authorization_test_audit BEFORE INSERT ON tb_authrt_chg_hstry "
                + "FOR EACH ROW EXECUTE FUNCTION reject_authorization_test_audit()");
        try {
            assertThatThrownBy(() -> service.replaceGrants("T_AUDIT",new ReplaceGrants(
                    List.of(new Grant("OPERATION","MENU_READ")),before.version(),true)))
                    .isInstanceOf(DataAccessException.class).hasMessageContaining("intentional audit failure");
            assertThat(service.group("T_AUDIT")).isEqualTo(before);
            assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_authrt_grnt_map WHERE authrt_cd='T_AUDIT'",Long.class)).isZero();
        } finally {
            jdbc.execute("DROP TRIGGER reject_authorization_test_audit ON tb_authrt_chg_hstry");
            jdbc.execute("DROP FUNCTION reject_authorization_test_audit()");
        }
        var denied=CustomUserDetails.builder().userId("viewer").esntlId("VIEWER").enabled(true)
                .groups(List.of("ROLE_ADMIN")).permissions(List.of("AUTHRT_READ")).build();
        authenticate(denied);
        assertThatThrownBy(() -> service.replaceGrants("T_AUDIT",new ReplaceGrants(List.of(),before.version(),true)))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode",CommonErrorCode.ACCESS_DENIED);
        authenticateOperator();
    }

    private void verifyNavigationHierarchy() throws Exception {
        String group="T_NAV_HIERARCHY";
        service.createGroup(new CreateGroup(group,"메뉴 계층 검증",null));
        Long root=jdbc.queryForObject("INSERT INTO tb_menu_info(menu_nm,menu_ordr,use_yn) VALUES('계층 검증 상위',1,'Y') RETURNING menu_sn",Long.class);
        Long child=jdbc.queryForObject("INSERT INTO tb_menu_info(menu_nm,up_menu_sn,menu_ordr,use_yn) VALUES('계층 검증 하위',?,1,'Y') RETURNING menu_sn",Long.class,root);
        Long leaf=jdbc.queryForObject("INSERT INTO tb_menu_info(menu_nm,up_menu_sn,menu_ordr,use_yn) VALUES('계층 검증 말단',?,1,'Y') RETURNING menu_sn",Long.class,child);
        Grant operation=new Grant("OPERATION","MENU_READ");
        Grant parentGrant=new Grant("NAVIGATION",root.toString());
        Grant childGrant=new Grant("NAVIGATION",child.toString());
        Grant leafGrant=new Grant("NAVIGATION",leaf.toString());
        List<Grant> complete=List.of(operation,parentGrant,childGrant,leafGrant);
        replaceGrants(group,complete);
        assertThat(service.group(group).grants()).containsExactlyInAnyOrderElementsOf(complete);

        long beforeRemoval=jdbc.queryForObject("SELECT max(authrt_chg_hstry_sn) FROM tb_authrt_chg_hstry",Long.class);
        replaceGrants(group,List.of(operation,childGrant,leafGrant));
        assertThat(service.group(group).grants()).containsExactly(operation);
        assertThat(jdbc.queryForList("SELECT authrt_grnt_cd FROM tb_authrt_chg_hstry WHERE authrt_cd=? "
                + "AND authrt_chg_hstry_sn>? AND chg_type_cd='REMOVE' AND authrt_type_cd='NAVIGATION'",String.class,group,beforeRemoval))
                .containsExactlyInAnyOrder(root.toString(),child.toString(),leaf.toString());
        assertThat(jdbc.queryForObject("SELECT count(DISTINCT dmnd_idntfr) FROM tb_authrt_chg_hstry WHERE authrt_cd=? "
                + "AND authrt_chg_hstry_sn>?",Long.class,group,beforeRemoval)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_authrt_chg_hstry WHERE authrt_cd=? "
                + "AND authrt_chg_hstry_sn>? AND authrt_type_cd='OPERATION'",Long.class,group,beforeRemoval)).isZero();

        var beforeInvalid=service.group(group);
        long auditsBeforeInvalid=jdbc.queryForObject("SELECT count(*) FROM tb_authrt_chg_hstry",Long.class);
        assertThatThrownBy(() -> service.replaceGrants(group,new ReplaceGrants(List.of(operation,childGrant,leafGrant),beforeInvalid.version(),true)))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode",CommonErrorCode.INVALID_INPUT_VALUE);
        assertThatThrownBy(() -> service.replaceNavigationGrants(group,List.of(child,leaf),beforeInvalid.version()))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode",CommonErrorCode.INVALID_INPUT_VALUE);
        assertThat(service.group(group)).isEqualTo(beforeInvalid);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_authrt_chg_hstry",Long.class)).isEqualTo(auditsBeforeInvalid);

        replaceGrants(group,complete);
        long beforeCompatibility=jdbc.queryForObject("SELECT count(*) FROM tb_authrt_chg_hstry WHERE authrt_cd=? AND chg_type_cd='REMOVE'",Long.class,group);
        service.replaceNavigationGrants(group,List.of(child,leaf),service.group(group).version());
        assertThat(service.group(group).grants()).containsExactly(operation);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_authrt_chg_hstry WHERE authrt_cd=? AND chg_type_cd='REMOVE'",Long.class,group))
                .isEqualTo(beforeCompatibility+3);

        replaceGrants(group,complete);
        jdbc.update("UPDATE tb_menu_info SET use_yn='N' WHERE menu_sn=?",root);
        List<Grant> withAnotherOperation=List.of(operation,new Grant("OPERATION","ADMCODE_READ"),parentGrant,childGrant,leafGrant);
        replaceGrants(group,withAnotherOperation);
        assertThat(service.group(group).grants()).containsExactlyInAnyOrderElementsOf(withAnotherOperation);
        assertThat(jdbc.queryForObject("SELECT use_yn FROM tb_menu_info WHERE menu_sn=?",String.class,root)).isEqualTo("N");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_authrt_grnt_map WHERE authrt_cd=? AND authrt_type_cd='NAVIGATION'",Long.class,group)).isEqualTo(3);
        service.replaceNavigationGrants(group,List.of(root,child,leaf),service.group(group).version());
        assertThat(service.group(group).grants()).containsExactlyInAnyOrderElementsOf(withAnotherOperation);

        var beforeMove=service.group(group);
        List<Grant> afterMove=withAnotherOperation.stream().filter(grant -> !grant.equals(childGrant)).toList();
        try (var executor=Executors.newSingleThreadExecutor()) {
            java.util.concurrent.atomic.AtomicReference<java.util.concurrent.Future<Boolean>> saving=new java.util.concurrent.atomic.AtomicReference<>();
            transaction.executeWithoutResult(status -> {
                // Match a menu edit: UPDATE locks the leaf; the deferred parent FK runs at commit.
                jdbc.update("UPDATE tb_menu_info SET up_menu_sn=? WHERE menu_sn=?",root,leaf);
                Long blocker=jdbc.queryForObject("SELECT pg_backend_pid()",Long.class);
                saving.set(executor.submit(() -> {
                    authenticateOperator();
                    try {
                        service.replaceGrants(group,new ReplaceGrants(afterMove,beforeMove.version(),true));
                        return Boolean.TRUE;
                    } finally { SecurityContextHolder.clearContext(); }
                }));
                long deadline=System.nanoTime()+TimeUnit.SECONDS.toNanos(5);
                boolean blocked=false;
                while (System.nanoTime()<deadline) {
                    Boolean observed=jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM pg_locks "
                            + "WHERE NOT granted AND ?=ANY(pg_blocking_pids(pid)))",Boolean.class,blocker);
                    if (Boolean.TRUE.equals(observed)) { blocked=true; break; }
                    java.util.concurrent.locks.LockSupport.parkNanos(TimeUnit.MILLISECONDS.toNanos(20));
                }
                assertThat(blocked).as("grant save must wait for the concurrent menu move").isTrue();
            });
            assertThat(saving.get().get(10,TimeUnit.SECONDS)).isTrue();
        }
        // The waiting save must use the committed parent, retaining the leaf below its new root.
        assertThat(service.group(group).grants()).containsExactlyInAnyOrderElementsOf(afterMove);
        assertThat(jdbc.queryForObject("SELECT up_menu_sn FROM tb_menu_info WHERE menu_sn=?",Long.class,leaf)).isEqualTo(root);

        service.deleteGroup(group,service.group(group).version());
        jdbc.update("DELETE FROM tb_menu_info WHERE menu_sn IN (?,?,?)",root,child,leaf);
    }

    private void verifyExplicitMenuGrantCreationRevocationAndDeletion() {
        var before=service.group("ROLE_ADMIN");
        List<Grant> operations=before.grants().stream().filter(grant -> "OPERATION".equals(grant.type())).toList();
        service.replaceNavigationGrants("ROLE_ADMIN",List.of(),before.version());
        assertThat(service.group("ROLE_ADMIN").grants()).containsExactlyElementsOf(operations);
        Long menu=transaction.execute(status -> {
            Long id=jdbc.queryForObject("INSERT INTO tb_menu_info(menu_nm,menu_ordr,use_yn) VALUES('권한 전환 시험 메뉴',1,'Y') RETURNING menu_sn",Long.class);
            service.grantNewMenuToCompatibilityAdmin(id);
            return id;
        });
        assertThat(service.group("ROLE_ADMIN").grants()).contains(new Grant("NAVIGATION",menu.toString()));
        assertThatThrownBy(() -> service.removeNavigationGrantsForMenus(List.of(menu)))
                .isInstanceOf(IllegalTransactionStateException.class);
        transaction.executeWithoutResult(status -> {
            service.removeNavigationGrantsForMenus(List.of(menu));
            jdbc.update("DELETE FROM tb_menu_info WHERE menu_sn=?",menu);
        });
        assertThat(service.group("ROLE_ADMIN").grants()).containsExactlyElementsOf(operations);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_authrt_chg_hstry WHERE authrt_cd='ROLE_ADMIN' "
                + "AND authrt_type_cd='NAVIGATION' AND authrt_grnt_cd=? AND chg_type_cd IN ('ADD','REMOVE')",Long.class,menu.toString())).isEqualTo(2);
    }

    private void verifyMandatorySignupDefaultAndDeleteAudit() {
        assertThatThrownBy(() -> service.assignNewUser("T_SIGNUP"))
                .isInstanceOf(IllegalTransactionStateException.class);
        SecurityContextHolder.clearContext();
        transaction.executeWithoutResult(status -> {
            insertUser("T_SIGNUP");
            service.assignNewUser("T_SIGNUP");
        });
        assertThat(snapshots.load("T_SIGNUP").groups()).containsExactly("ROLE_USER");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_authrt_chg_hstry WHERE scrty_dcsn_trgt_id='T_SIGNUP' "
                + "AND chg_type_cd='ADD' AND authrt_cd='ROLE_USER' AND chg_user_idntfr IS NULL AND frst_rgtr_id='SYSTEM'",Long.class)).isEqualTo(1);
        authenticateOperator();
        transaction.executeWithoutResult(status -> {
            service.removeDeletedUsers(List.of("T_SIGNUP"));
            jdbc.update("DELETE FROM tb_user_info WHERE esntl_id='T_SIGNUP'");
        });
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_user_info WHERE esntl_id='T_SIGNUP'",Long.class)).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_authrt_chg_hstry WHERE scrty_dcsn_trgt_id='T_SIGNUP'",Long.class)).isEqualTo(2);
    }

    private void verifyConcurrentLastManagerProtection() throws Exception {
        List<String> originalManagers=jdbc.queryForList("SELECT DISTINCT scrty_dcsn_trgt_id FROM tb_authrt_user_map",String.class);
        for (String suffix:List.of("A","B")) {
            String group="T_MANAGER_"+suffix;
            String user="T_MANAGER_USER_"+suffix;
            service.createGroup(new CreateGroup(group,group,null));
            replaceGrants(group,List.of(new Grant("OPERATION","AUTHRT_ASSIGN"),new Grant("OPERATION","AUTHRT_GRANT"),
                    new Grant("OPERATION","AUTHRT_READ")));
            insertUser(user);
            replaceGroups(user,List.of(group));
        }
        for (String old:originalManagers) if (!"TEST_OPERATOR".equals(old)) replaceGroups(old,List.of());
        replaceGroups("TEST_OPERATOR",List.of());
        assertThat(service.managerCount()).isEqualTo(2);
        authenticateManager("A");
        var one=service.memberships("T_MANAGER_USER_A");
        authenticateManager("B");
        var two=service.memberships("T_MANAGER_USER_B");
        CountDownLatch ready=new CountDownLatch(2);
        CountDownLatch start=new CountDownLatch(1);
        try (var executor=Executors.newFixedThreadPool(2)) {
            var futures=new ArrayList<java.util.concurrent.Future<Object>>();
            for (var snapshot:List.of(one,two)) {
                futures.add(executor.submit(() -> {
                    var actor=CustomUserDetails.builder().userId(snapshot.userId()).esntlId(snapshot.userId())
                            .groups(snapshot.groups()).permissions(List.of("AUTHRT_ASSIGN","AUTHRT_GRANT","AUTHRT_READ"))
                            .enabled(true).build();
                    authenticate(actor);
                    try {
                        ready.countDown();
                        if (!start.await(5,TimeUnit.SECONDS)) throw new IllegalStateException("Concurrent test start timed out");
                        service.replaceMemberships(snapshot.userId(),new ReplaceGroups(List.of(),snapshot.version(),true));
                        return Boolean.TRUE;
                    } catch (BusinessException blocked) {
                        return blocked.getErrorCode();
                    } finally {
                        SecurityContextHolder.clearContext();
                    }
                }));
            }
            assertThat(ready.await(5,TimeUnit.SECONDS)).isTrue();
            start.countDown();
            List<Object> results=new ArrayList<>();
            for (var future:futures) results.add(future.get(10,TimeUnit.SECONDS));
            assertThat(results).containsExactlyInAnyOrder(Boolean.TRUE,CommonErrorCode.INVALID_INPUT_VALUE);
        }
        assertThat(service.managerCount()).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_authrt_chg_hstry WHERE chg_type_cd='REMOVE' "
                + "AND scrty_dcsn_trgt_id IN ('T_MANAGER_USER_A','T_MANAGER_USER_B')",Long.class)).isEqualTo(1);
    }

    private void insertUser(String id) {
        // The legacy varchar(8) subscription date default is CURRENT_TIMESTAMP; explicit YYYYMMDD
        // follows the physical date format and avoids depending on that incompatible default.
        jdbc.update("INSERT INTO tb_user_info(esntl_id,user_id,pswd,user_nm,user_stts_cd,lck_yn,sbscrb_ymd) "
                + "VALUES(?,?,'test-only-unusable',?,'P','N',to_char(CURRENT_DATE,'YYYYMMDD'))",id,id,id);
    }

    private void replaceGrants(String group,List<Grant> grants) {
        service.replaceGrants(group,new ReplaceGrants(grants,service.group(group).version(),true));
    }

    private void replaceGroups(String user,List<String> groups) {
        service.replaceMemberships(user,new ReplaceGroups(groups,service.memberships(user).version(),true));
    }

    private static void authenticateOperator() {
        authenticate(CustomUserDetails.builder().userId("test_operator").esntlId("TEST_OPERATOR")
                .groups(List.of("ROLE_ADMIN")).permissions(PermissionCodes.ALL.stream().sorted().toList()).enabled(true).build());
    }

    private static void authenticateManager(String suffix) {
        String id="T_MANAGER_USER_"+suffix;
        authenticate(CustomUserDetails.builder().userId(id).esntlId(id).groups(List.of("T_MANAGER_"+suffix))
                .permissions(List.of("AUTHRT_ASSIGN","AUTHRT_GRANT","AUTHRT_READ")).enabled(true).build());
    }

    private static void authenticate(CustomUserDetails user) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(user,"",user.getAuthorities()));
    }
}
