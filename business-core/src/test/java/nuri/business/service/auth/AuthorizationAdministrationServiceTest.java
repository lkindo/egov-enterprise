package nuri.business.service.auth;

import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Deque;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.stream.Stream;
import nuri.business.security.authorization.PermissionCodes;
import nuri.business.service.auth.dto.AuthorizationDto.*;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.mockito.invocation.InvocationOnMock;
import org.mockito.stubbing.Answer;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.core.namedparam.SqlParameterSource;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockConstruction;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Core/PIT-visible behavior tests. JDBC supplies controlled results and records writes; actual
 * PostgreSQL syntax, transaction rollback and lock races remain in the API schema integration test.
 * Real row mappers and canonical-principal permission checks run here without mocking the service.
 */
class AuthorizationAdministrationServiceTest {
    private static final Grant READ = new Grant("OPERATION", "BOARD_READ");
    private static final Grant UPDATE = new Grant("OPERATION", "BOARD_UPDATE");
    private static final Grant NAV_ONE = new Grant("NAVIGATION", "1");
    private Boundary db;
    private AuthorizationAdministrationService service;

    @BeforeEach
    void setUp() {
        db = new Boundary();
        service = new AuthorizationAdministrationService(mock(JdbcTemplate.class, db));
        authenticate("operator_login", "OPERATOR_ID", PermissionCodes.ALL);
    }

    @AfterEach
    void clearAuthentication() { SecurityContextHolder.clearContext(); }

    @Test
    void allProtectedOperationsRejectRoleNamesWithoutPermissionsBeforeDatabaseAccess() {
        authenticate("operator_login", "OPERATOR_ID", Set.of());
        List<Runnable> operations = List.of(service::groups, () -> service.group("G_A"),
                () -> service.memberships("U_1"), service::departments, () -> service.departmentMemberships("D_1"),
                () -> service.changeDepartmentGroups("D_1", new ChangeDepartmentGroups(List.of("U_1"), "G_C", "ADD", "v", true)),
                service::catalog, () -> service.users(null, 0, 20),
                () -> service.createGroup(new CreateGroup("NEW_GROUP", "New group", null)),
                () -> service.updateGroup("G_A", new UpdateGroup("Name", null, "v")),
                () -> service.deleteGroup("G_A", "v"),
                () -> service.replaceGrants("G_A", new ReplaceGrants(List.of(), "v", true)),
                () -> service.replaceMemberships("U_1", new ReplaceGroups(List.of(), "v", true)),
                () -> service.removeDeletedUsers(List.of("U_1")),
                () -> service.replaceNavigationGrants("G_A", List.of(), "v"),
                () -> service.grantNewMenuToCompatibilityAdmin(1L),
                () -> service.removeNavigationGrantsForMenus(List.of(1L)),
                () -> service.history(0, 20, null, null, null, null, null),
                () -> service.changeGroupMembers("G_C", new ChangeGroupMembers(List.of("U_1"), List.of(), true)),
                () -> service.copyGroup("G_A", new CopyGroup("COPY_A", "Copy", null, "v")),
                service::grantMatrix,
                () -> service.assertGroupVersions(List.of(new GroupVersion("G_A", "v"))),
                () -> service.navigationVisibilityConflicts(Map.of(1L, 3L), Map.of(), Map.of(), Map.of()),
                () -> service.applyMenuStructureGrants(List.of(new ResolvedGrantChange("G_A", Set.of(1L), Set.of(), Set.of())), List.of()));
        for (Runnable operation : operations) error(CommonErrorCode.ACCESS_DENIED, operation);
        assertThat(db.calls).isEmpty();
    }

    @Test
    void completeSnapshotsExposeMappedFieldsAndChangeVersionWhenAuditSequenceChanges() {
        var group = service.group("G_A");
        assertThat(group.code()).isEqualTo("G_A");
        assertThat(group.name()).isEqualTo("Team A");
        assertThat(group.description()).isEqualTo("Description A");
        assertThat(group.grants()).containsExactly(NAV_ONE, READ);
        assertThat(group.complete()).isTrue();
        assertThat(group.version()).hasSize(64);
        assertThat(service.groups()).extracting(GroupSummary::code).containsExactly("G_A", "G_B", "G_C", "ROLE_ADMIN");
        assertThat(service.groups()).filteredOn(g -> g.code().equals("G_A")).singleElement()
                .isEqualTo(new GroupSummary("G_A", "Team A", "Description A", group.version()));
        var membership = service.memberships("U_1");
        assertThat(membership.userId()).isEqualTo("U_1");
        assertThat(membership.groups()).containsExactly("G_A", "G_B");
        assertThat(membership.complete()).isTrue();
        assertThat(service.departments()).containsExactly(new DepartmentChoice("D_1", "Department one"));
        var department = service.departmentMemberships("D_1");
        assertThat(department.departmentId()).isEqualTo("D_1");
        assertThat(department.complete()).isTrue();
        assertThat(department.users()).containsExactly(
                new DepartmentMember("U_1", "login_one", "User one", membership.groups(), membership.version(), true),
                new DepartmentMember("U_2", "login_two", "User two", List.of("G_B"), service.memberships("U_2").version(), true));
        db.auditSequence++;
        assertThat(service.group("G_A").version()).isNotEqualTo(group.version());
        assertThat(service.memberships("U_1").version()).isNotEqualTo(membership.version());
        assertThat(service.departmentMemberships("D_1").version()).isNotEqualTo(department.version());
        error(CommonErrorCode.RESOURCE_NOT_FOUND, () -> service.group("MISSING"));
        error(CommonErrorCode.RESOURCE_NOT_FOUND, () -> service.memberships("MISSING"));
        error(CommonErrorCode.RESOURCE_NOT_FOUND, () -> service.departmentMemberships("MISSING"));
    }

    @Test
    void catalogContainsEveryRegisteredOperationAndMapsNavigationWithoutApiAuthority() {
        var catalog = service.catalog();
        assertThat(catalog.catalogVersion()).isEqualTo(PermissionCodes.CATALOG_VERSION);
        assertThat(catalog.operations()).extracting(Operation::code).containsExactlyInAnyOrderElementsOf(PermissionCodes.ALL);
        assertThat(catalog.operations()).allSatisfy(operation -> {
            assertThat(operation.domain()).isNotBlank();
            assertThat(operation.action()).isNotBlank();
            assertThat(operation.name()).isNotBlank();
        });
        // 분류만 있는 메뉴(자리표시자 'dir')는 경로가 없고, 화면 메뉴는 modern_route 를 그대로 싣는다.
        // 사용 여부는 'Y' 만 사용으로 본다 — NULL·그 밖의 값은 사이드바가 그리지 않으므로 'N' 이다.
        assertThat(catalog.navigation()).containsExactly(
                new Navigation("1", "Root menu", null, null, "Y"), new Navigation("2", "Child menu", "1", "/admin/user/manage", "N"),
                new Navigation("3", "Legacy menu", "1", "/admin/system/menus", "N"));
        assertThat(PermissionCodes.ALL).doesNotContain("1", "2");
        assertThat(db.calls).anySatisfy(sql -> assertThat(sql)
                .contains("CASE WHEN up_menu_sn IS NULL OR up_menu_sn=0 THEN NULL", "ORDER BY menu_ordr NULLS LAST,menu_sn"));
    }

    @Test
    void userSearchEscapesWildcardsAndClampsPagingWithoutDroppingIdentityFields() {
        var result = service.users("a!%_", -1, 500);
        assertThat(result.getNumber()).isZero();
        assertThat(result.getSize()).isEqualTo(100);
        assertThat(result.getTotalElements()).isEqualTo(2);
        assertThat(result.getContent()).containsExactly(new UserChoice("U_1", "login_one", "User one", "D_1"),
                new UserChoice("U_2", "login_two", "User two", "D_1"));
        assertThat(db.lastUserSearch).containsExactly("%a!!!%!_%", "%a!!!%!_%", 100, 0L);
        service.users(null, 2, 0);
        assertThat(db.lastUserSearch).containsExactly("%%", "%%", 1, 2L);
        service.users("plain", 1, 25);
        assertThat(db.lastUserSearch).containsExactly("%plain%", "%plain%", 25, 25L);
    }

    @Test
    void creationRecordsFieldsAndSharesOneAuditRequestWithCorrectIdentityAxes() {
        service.createGroup(new CreateGroup("NEW_GROUP", "New group", "Description"));
        assertThat(db.writesTo("tb_authrt_info")).singleElement().satisfies(write -> assertThat(write.values()).containsExactly(
                "NEW_GROUP", "New group", "Description", LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE), "operator_login", "operator_login"));
        assertThat(db.audits()).hasSize(2);
        assertAudit(db.audits().get(0), "GROUP", "ADD", "NEW_GROUP", null, null, "authrt_nm", null, "New group");
        assertAudit(db.audits().get(1), "GROUP", "ADD", "NEW_GROUP", null, null, "authrt_expln", null, "Description");
        assertThat(db.audits()).extracting(w -> w.values().get(0)).containsOnly(db.audits().getFirst().values().getFirst());
        assertThat(db.reauthorizationRequests).containsExactly(List.of("OPERATOR_ID", "AUTHRT_CREATE"));
    }

    @Test
    void absentDescriptionDoesNotInventAnAuditChangeAndReservedOrExistingGroupsAreRejected() {
        service.createGroup(new CreateGroup("NEW_GROUP", "New group", null));
        assertThat(db.audits()).hasSize(1);
        db.writes.clear();
        for (String reserved : List.of("ROLE_ADMIN", "ROLE_SYSTEM", "ROLE_USER", "ROLE_ANONYMOUS")) {
            error(CommonErrorCode.INVALID_INPUT_VALUE, () -> service.createGroup(new CreateGroup(reserved, "Name", null)));
            error(CommonErrorCode.INVALID_INPUT_VALUE, () -> service.deleteGroup(reserved, "irrelevant"));
        }
        error(CommonErrorCode.INVALID_INPUT_VALUE, () -> service.createGroup(new CreateGroup("G_A", "Name", null)));
        assertThat(db.writes).isEmpty();
    }

    @Test
    void updatingMetadataAuditsOnlyActualDeltasAndRejectsMissingOrStaleVersions() {
        String version = service.group("G_A").version();
        error(CommonErrorCode.CONCURRENT_MODIFICATION, () -> service.updateGroup("G_A", new UpdateGroup("Changed", null, null)));
        error(CommonErrorCode.CONCURRENT_MODIFICATION, () -> service.updateGroup("G_A", new UpdateGroup("Changed", null, "stale")));
        assertThat(db.writes).isEmpty();
        service.updateGroup("G_A", new UpdateGroup("Team A", "Description A", version));
        assertThat(db.audits()).isEmpty();
        service.updateGroup("G_A", new UpdateGroup("Changed", null, version));
        assertThat(db.writesTo("tb_authrt_info").getLast().values()).containsExactly("Changed", null, "operator_login", "G_A");
        assertAudit(db.audits().get(0), "GROUP", "UPDATE", "G_A", null, null, "authrt_nm", "Team A", "Changed");
        assertAudit(db.audits().get(1), "GROUP", "UPDATE", "G_A", null, null, "authrt_expln", "Description A", null);
    }

    @Test
    void deletingAnUnusedGroupRemovesItsGrantsAndAuditsBeforeValues() {
        String version = service.group("G_A").version();
        error(CommonErrorCode.RESOURCE_IN_USE, () -> service.deleteGroup("G_A", version));
        assertThat(db.writes).isEmpty();
        db.memberships.replaceAll((user, groups) -> List.of());
        service.deleteGroup("G_A", version);
        assertThat(db.writesTo("tb_authrt_grnt_map")).extracting(Write::values)
                .containsExactly(List.of("G_A", "NAVIGATION", "1"), List.of("G_A", "OPERATION", "BOARD_READ"));
        assertThat(db.writesTo("tb_authrt_info")).singleElement().satisfies(w -> {
            assertThat(w.sql()).startsWith("DELETE"); assertThat(w.values()).containsExactly("G_A");
        });
        assertThat(db.audits()).hasSize(4);
        assertAudit(db.audits().get(2), "GROUP", "REMOVE", "G_A", null, null, "authrt_nm", "Team A", null);
        assertAudit(db.audits().get(3), "GROUP", "REMOVE", "G_A", null, null, "authrt_expln", "Description A", null);
        service.deleteGroup("G_C", service.group("G_C").version());
        assertThat(db.audits()).hasSize(5);
    }

    @ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings = {"AUTHRT_GRANT", "AUTHRT_ASSIGN", "USER_PASSWORD", "MFA_RECOVER"})
    void protectedGrantAdditionAndRemovalRequireBothAdministrationPermissions(String permission) {
        Grant protectedGrant = new Grant("OPERATION", permission);
        authenticate("operator_login", "OPERATOR_ID", Set.of("AUTHRT_READ", "AUTHRT_GRANT"));
        error(CommonErrorCode.ACCESS_DENIED, () -> service.replaceGrants("G_C",
                new ReplaceGrants(List.of(protectedGrant), service.group("G_C").version(), true)));
        assertThat(db.writes).isEmpty();

        db.groups.put("G_C", new GroupData("Protected", null, List.of(protectedGrant)));
        error(CommonErrorCode.ACCESS_DENIED, () -> service.replaceGrants("G_C",
                new ReplaceGrants(List.of(), service.group("G_C").version(), true)));
        assertThat(db.writes).isEmpty();
    }

    @Test
    void ordinaryGrantChangesKeepTheExistingSinglePermissionContract() {
        db.groups.put("G_C", new GroupData("Protected", null, List.of(new Grant("OPERATION", "USER_PASSWORD"))));
        authenticate("operator_login", "OPERATOR_ID", Set.of("AUTHRT_READ", "AUTHRT_GRANT"));
        service.replaceGrants("G_C", new ReplaceGrants(
                List.of(new Grant("OPERATION", "USER_PASSWORD"), READ), service.group("G_C").version(), true));
        assertThat(db.writesTo("tb_authrt_grnt_map")).singleElement()
                .satisfies(write -> assertThat(write.values()).contains("BOARD_READ"));
    }

    @ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings = {"USER_PASSWORD", "MFA_RECOVER"})
    void protectedMembershipAdditionRemovalAndDepartmentBatchRequireBothAdministrationPermissions(String permission) {
        db.groups.put("G_C", new GroupData("Protected", null, List.of(new Grant("OPERATION", permission))));
        authenticate("operator_login", "OPERATOR_ID", Set.of("AUTHRT_READ", "AUTHRT_ASSIGN"));
        error(CommonErrorCode.ACCESS_DENIED, () -> service.replaceMemberships("U_2",
                new ReplaceGroups(List.of("G_B", "G_C"), service.memberships("U_2").version(), true)));
        error(CommonErrorCode.ACCESS_DENIED, () -> service.changeDepartmentGroups("D_1",
                new ChangeDepartmentGroups(List.of("U_2"), "G_C", "ADD", service.departmentMemberships("D_1").version(), true)));
        db.memberships.put("U_2", List.of("G_B", "G_C"));
        error(CommonErrorCode.ACCESS_DENIED, () -> service.replaceMemberships("U_2",
                new ReplaceGroups(List.of("G_B"), service.memberships("U_2").version(), true)));
        error(CommonErrorCode.ACCESS_DENIED, () -> service.changeDepartmentGroups("D_1",
                new ChangeDepartmentGroups(List.of("U_2"), "G_C", "REMOVE", service.departmentMemberships("D_1").version(), true)));
        assertThat(db.writes).isEmpty();
    }

    @ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings = {"USER_PASSWORD", "MFA_RECOVER"})
    void deletionCannotRemoveProtectedGrantsOrMembershipsWithOnlyDeleteAuthority(String permission) {
        db.groups.put("G_C", new GroupData("Protected", null, List.of(new Grant("OPERATION", permission))));
        authenticate("operator_login", "OPERATOR_ID", Set.of("AUTHRT_READ", "AUTHRT_DELETE", "USER_DELETE"));
        error(CommonErrorCode.ACCESS_DENIED, () -> service.deleteGroup("G_C", service.group("G_C").version()));
        db.memberships.put("U_2", List.of("G_C"));
        error(CommonErrorCode.ACCESS_DENIED, () -> service.removeDeletedUsers(List.of("U_2")));
        assertThat(db.writes).isEmpty();
    }

    @ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings = {"USER_PASSWORD", "MFA_RECOVER"})
    void signupDefaultCannotSilentlyGrantProtectedPermissions(String permission) {
        db.groups.put("ROLE_USER", new GroupData("Default", null, List.of(new Grant("OPERATION", permission))));
        db.memberships.put("U_2", List.of());
        authenticate("operator_login", "OPERATOR_ID", Set.of());
        error(CommonErrorCode.ACCESS_DENIED, () -> service.assignNewUser("U_2"));
        assertThat(db.writes).isEmpty();
    }

    @Test
    void recoveryAuthorityAloneDoesNotExpandProtectedAccountClassification() {
        db.groups.put("G_C", new GroupData("Recovery", null, List.of(new Grant("OPERATION", "MFA_RECOVER"))));
        db.memberships.put("U_2", List.of("G_C"));
        authenticate("operator_login", "OPERATOR_ID", Set.of("USER_PASSWORD"));
        service.authorizeProtectedAccountChange("U_2");
        assertThat(db.writes).isEmpty();
    }

    static Stream<List<Grant>> invalidGrants() {
        return Stream.of(Arrays.asList((Grant) null), List.of(new Grant("OPERATION", null)),
                List.of(new Grant("OPERATION", "NOT_REGISTERED")), List.of(new Grant("NAVIGATION", "0")),
                List.of(new Grant("NAVIGATION", "01")), List.of(new Grant("NAVIGATION", "-1")),
                List.of(new Grant("NAVIGATION", "9999999999999999999")), List.of(new Grant("UNKNOWN", "BOARD_READ")),
                List.of(READ, READ));
    }

    @ParameterizedTest
    @MethodSource("invalidGrants")
    void rejectsUnknownMalformedAndDuplicateGrantsBeforeDatabaseAccess(List<Grant> grants) {
        error(CommonErrorCode.INVALID_INPUT_VALUE, () -> service.replaceGrants("G_A", new ReplaceGrants(grants, "v", true)));
        assertThat(db.calls).isEmpty();
    }

    @Test
    void incompleteGrantAndMembershipSnapshotsCannotDeleteExistingAssignments() {
        for (boolean complete : List.of(false, true)) {
            error(CommonErrorCode.INVALID_INPUT_VALUE, () -> service.replaceGrants("G_A", new ReplaceGrants(null, "v", complete)));
            error(CommonErrorCode.INVALID_INPUT_VALUE, () -> service.replaceMemberships("U_1", new ReplaceGroups(null, "v", complete)));
        }
        error(CommonErrorCode.INVALID_INPUT_VALUE, () -> service.replaceGrants("G_A", new ReplaceGrants(List.of(), "v", false)));
        error(CommonErrorCode.INVALID_INPUT_VALUE, () -> service.replaceMemberships("U_1", new ReplaceGroups(List.of(), "v", false)));
        assertThat(db.calls).isEmpty();
    }

    @Test
    void replacingGrantsPreservesUnchangedPermissionsAndAuditsOnlyTypedDifferences() {
        String version = service.group("G_A").version();
        service.replaceGrants("G_A", new ReplaceGrants(List.of(READ, UPDATE), version, true));
        var writes = db.writesTo("tb_authrt_grnt_map");
        assertThat(writes).hasSize(2);
        assertThat(writes.get(0).values()).containsExactly("G_A", "NAVIGATION", "1");
        assertThat(writes.get(1).values()).containsExactly("G_A", "OPERATION", "BOARD_UPDATE", "operator_login", "operator_login");
        assertAudit(db.audits().get(0), "GROUP_GRANT", "REMOVE", "G_A", null, NAV_ONE, "grant", "1", null);
        assertAudit(db.audits().get(1), "GROUP_GRANT", "ADD", "G_A", null, UPDATE, "grant", null, "BOARD_UPDATE");
        assertThat(db.managerQueries).isEqualTo(2);
        db.writes.clear();
        error(CommonErrorCode.CONCURRENT_MODIFICATION, () -> service.replaceGrants("G_A", new ReplaceGrants(List.of(), version, true)));
        assertThat(db.writes).isEmpty();
    }

    @Test
    void emptyCompleteGrantSnapshotRevokesEveryGrantAndMissingNavigationIsRejected() {
        error(CommonErrorCode.INVALID_INPUT_VALUE, () -> service.replaceGrants("G_A", new ReplaceGrants(List.of(new Grant("NAVIGATION", "9")), service.group("G_A").version(), true)));
        assertThat(db.writes).isEmpty();
        service.replaceGrants("G_A", new ReplaceGrants(List.of(), service.group("G_A").version(), true));
        assertThat(db.writesTo("tb_authrt_grnt_map")).hasSize(2).allSatisfy(w -> assertThat(w.sql()).startsWith("DELETE"));
        assertThat(db.audits()).hasSize(2);
    }

    @Test
    void membershipReplacementPreservesOtherGroupsAndRejectsAnonymousDuplicateOrStaleInput() {
        String version = service.memberships("U_1").version();
        error(CommonErrorCode.CONCURRENT_MODIFICATION, () -> service.replaceMemberships("U_1", new ReplaceGroups(List.of(), "stale", true)));
        error(CommonErrorCode.INVALID_INPUT_VALUE, () -> service.replaceMemberships("U_1", new ReplaceGroups(List.of("ROLE_ANONYMOUS"), version, true)));
        error(CommonErrorCode.INVALID_INPUT_VALUE, () -> service.replaceMemberships("U_1", new ReplaceGroups(List.of("G_B", "G_B"), version, true)));
        error(CommonErrorCode.RESOURCE_NOT_FOUND, () -> service.replaceMemberships("U_1", new ReplaceGroups(List.of("MISSING"), version, true)));
        assertThat(db.writes).isEmpty();
        service.replaceMemberships("U_1", new ReplaceGroups(List.of("G_B", "G_C"), version, true));
        assertThat(db.writesTo("tb_authrt_user_map")).extracting(Write::values).containsExactly(
                List.of("U_1", "G_A"), List.of("U_1", "G_C", "operator_login", "operator_login"));
        assertAudit(db.audits().get(0), "USER_GROUP", "REMOVE", "G_A", "U_1", null, "membership", "G_A", null);
        assertAudit(db.audits().get(1), "USER_GROUP", "ADD", "G_C", "U_1", null, "membership", null, "G_C");
    }

    @Test
    void departmentDeltasTouchOnlySelectedUsersAndPreserveUnrelatedGroups() {
        String version = service.departmentMemberships("D_1").version();
        var result = service.changeDepartmentGroups("D_1", new ChangeDepartmentGroups(List.of("U_1"), "G_C", "ADD", version, true));
        assertThat(result.complete()).isTrue();
        assertThat(result.departmentId()).isEqualTo("D_1");
        assertThat(db.writesTo("tb_authrt_user_map")).singleElement().satisfies(w ->
                assertThat(w.values()).containsExactly("U_1", "G_C", "operator_login", "operator_login"));
        db.writes.clear();
        service.changeDepartmentGroups("D_1", new ChangeDepartmentGroups(List.of("U_1"), "G_A", "REMOVE", service.departmentMemberships("D_1").version(), true));
        assertThat(db.writesTo("tb_authrt_user_map")).singleElement().satisfies(w ->
                assertThat(w.values()).containsExactly("U_1", "G_A"));
    }

    @Test
    void departmentChangeRejectsPartialDuplicateOutsideAndStaleRostersWithoutWrites() {
        String version = service.departmentMemberships("D_1").version();
        List<ChangeDepartmentGroups> invalid = List.of(
                new ChangeDepartmentGroups(null, "G_C", "ADD", version, true),
                new ChangeDepartmentGroups(List.of(), "G_C", "ADD", version, true),
                new ChangeDepartmentGroups(List.of("U_1"), "G_C", "ADD", version, false),
                new ChangeDepartmentGroups(List.of("U_1"), "G_C", null, version, true),
                new ChangeDepartmentGroups(List.of("U_1"), "G_C", "REPLACE", version, true),
                new ChangeDepartmentGroups(List.of("U_1", "U_1"), "G_C", "ADD", version, true),
                new ChangeDepartmentGroups(List.of("OUTSIDE"), "G_C", "ADD", version, true));
        for (var request : invalid) error(CommonErrorCode.INVALID_INPUT_VALUE, () -> service.changeDepartmentGroups("D_1", request));
        // 그룹 존재 확인은 공개 메뉴용 그룹 검사보다 먼저다 — 없는 그룹은 그 이름이어도 404 다.
        error(CommonErrorCode.RESOURCE_NOT_FOUND, () -> service.changeDepartmentGroups("D_1", new ChangeDepartmentGroups(List.of("U_1"), "MISSING", "ADD", version, true)));
        error(CommonErrorCode.RESOURCE_NOT_FOUND, () -> service.changeDepartmentGroups("D_1", new ChangeDepartmentGroups(List.of("U_1"), "ROLE_ANONYMOUS", "ADD", version, true)));
        db.groups.put("ROLE_ANONYMOUS", new GroupData("Anonymous", null, List.of()));
        error(CommonErrorCode.INVALID_INPUT_VALUE, () -> service.changeDepartmentGroups("D_1", new ChangeDepartmentGroups(List.of("U_1"), "ROLE_ANONYMOUS", "ADD", version, true)));
        error(CommonErrorCode.CONCURRENT_MODIFICATION, () -> service.changeDepartmentGroups("D_1", new ChangeDepartmentGroups(List.of("U_1"), "G_C", "ADD", "stale", true)));
        assertThat(db.writes).isEmpty();
    }

    @Test
    void lastManagerCannotDisappearButAnExistingZeroManagerStateDoesNotInventOne() {
        db.managerCounts.clear(); db.managerCounts.add(0L);
        service.protectLastManager(0);
        assertThat(db.managerQueries).isZero();
        error(CommonErrorCode.INVALID_INPUT_VALUE, () -> service.protectLastManager(1));
        db.managerCounts.clear(); db.managerCounts.add(1L);
        service.protectLastManager(1);
        assertThat(db.managerQueries).isEqualTo(2);
        db.managerCounts.clear(); db.managerCounts.add(1L); db.managerCounts.add(0L);
        error(CommonErrorCode.INVALID_INPUT_VALUE, () -> service.replaceMemberships("U_1",
                new ReplaceGroups(List.of(), service.memberships("U_1").version(), true)));
    }

    @Test
    void currentDatabaseDenialNullAndFailureCannotBeOverriddenByTheCapturedPrincipal() {
        for (Boolean allowed : Arrays.asList(false, null)) {
            db.databaseAllowed = allowed;
            error(CommonErrorCode.ACCESS_DENIED, () -> service.createGroup(new CreateGroup("NEW_GROUP", "Name", null)));
        }
        assertThat(db.writes).isEmpty();
        var unavailable = new DataAccessResourceFailureException("Synthetic unavailable store");
        db.reauthorizationFailure = unavailable;
        assertThatThrownBy(() -> service.lockAndAuthorize("AUTHRT_CREATE")).isSameAs(unavailable);
        assertThat(db.reauthorizationRequests).containsOnly(List.of("OPERATOR_ID", "AUTHRT_CREATE"));
        db.reauthorizationFailure = null; db.databaseAllowed = true;
        authenticate("operator_login", null, Set.of("AUTHRT_CREATE"));
        int before = db.reauthorizationRequests.size();
        error(CommonErrorCode.ACCESS_DENIED, () -> service.lockAndAuthorize("AUTHRT_CREATE"));
        assertThat(db.reauthorizationRequests).hasSize(before);
    }

    @Test
    void unknownPermissionAndMissingAdministrationLockFailClosed() {
        error(CommonErrorCode.ACCESS_DENIED, () -> service.lockAndAuthorize("NOT_REGISTERED"));
        assertThat(db.calls).isEmpty();
        db.lockPresent = false;
        assertThatThrownBy(service::lockAdministration).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> service.createGroup(new CreateGroup("NEW_GROUP", "Name", null))).isInstanceOf(IllegalStateException.class);
        assertThat(db.reauthorizationRequests).isEmpty();
        assertThat(db.writes).isEmpty();
    }

    @Test
    void signupAssignsOnlyTheDefaultGroupAndNeverOverwritesExistingMemberships() {
        error(CommonErrorCode.INVALID_INPUT_VALUE, () -> service.assignNewUser("U_1"));
        assertThat(db.writes).isEmpty();
        db.memberships.put("NEW_USER", List.of());
        SecurityContextHolder.clearContext();
        service.assignNewUser("NEW_USER");
        assertThat(db.writesTo("tb_authrt_user_map")).singleElement().satisfies(w ->
                assertThat(w.values()).containsExactly("NEW_USER", "ROLE_USER", "SYSTEM", "SYSTEM"));
        var audit = db.audits().getFirst();
        assertThat(audit.values().get(11)).isNull();
        assertThat(audit.values().get(12)).isEqualTo("SYSTEM");
        assertThat(db.audits()).hasSize(1);
    }

    @Test
    void deletingUsersDeduplicatesTargetsAndAuditsEachRemovedMembership() {
        service.removeDeletedUsers(List.of("U_1", "U_1", "U_2"));
        assertThat(db.writesTo("tb_authrt_user_map")).extracting(Write::values)
                .containsExactly(List.of("U_1", "G_A"), List.of("U_1", "G_B"), List.of("U_2", "G_B"));
        assertThat(db.audits()).hasSize(3).allSatisfy(w -> assertThat(w.values().get(3)).isEqualTo("REMOVE"));
    }

    @Test
    void menuReplacementPreservesOperationsAndPrunesChildrenOfRevokedParents() {
        service.replaceNavigationGrants("G_A", List.of(3L, 2L, 2L), service.group("G_A").version());
        assertThat(db.menuLocks).containsExactly(1L, 2L, 3L);
        assertThat(db.writesTo("tb_authrt_grnt_map")).hasSize(2).allSatisfy(w -> assertThat(w.values().get(1)).isEqualTo("NAVIGATION"));
        assertThat(db.writesTo("tb_authrt_grnt_map")).extracting(w -> w.values().get(2)).containsExactly("1", "3");
    }

    @Test
    void navigationReplacementRejectsNewChildOnlyAndPreviouslyOrphanedAssignments() {
        var child=new Grant("NAVIGATION", "2");
        error(CommonErrorCode.INVALID_INPUT_VALUE, () -> service.replaceGrants("G_B",
                new ReplaceGrants(List.of(child,READ),service.group("G_B").version(),true)));
        db.groups.put("G_B",new GroupData("Team B",null,List.of(child)));
        error(CommonErrorCode.INVALID_INPUT_VALUE, () -> service.replaceNavigationGrants("G_B",List.of(2L),service.group("G_B").version()));
        assertThat(db.writes).isEmpty();
    }

    @Test
    void removingAncestorPrunesEveryDescendantWithOneAuditedRequestAndNoOperationChange() {
        db.menuParents.put("3","2");
        var child=new Grant("NAVIGATION","2"); var leaf=new Grant("NAVIGATION","3");
        db.groups.put("G_A",new GroupData("Team A",null,List.of(NAV_ONE,child,leaf,READ)));
        service.replaceGrants("G_A",new ReplaceGrants(List.of(child,leaf,READ),service.group("G_A").version(),true));
        assertThat(db.writesTo("tb_authrt_grnt_map")).extracting(Write::values).containsExactly(
                List.of("G_A","NAVIGATION","1"),List.of("G_A","NAVIGATION","2"),List.of("G_A","NAVIGATION","3"));
        assertThat(db.audits()).hasSize(3).allSatisfy(w -> assertThat(w.values().get(3)).isEqualTo("REMOVE"));
        assertThat(db.audits().stream().map(w -> w.values().getFirst()).distinct()).hasSize(1);
        int menus=db.calls.indexOf("SELECT menu_sn::text,up_menu_sn::text FROM tb_menu_info ORDER BY menu_sn FOR NO KEY UPDATE");
        int group=db.calls.indexOf("SELECT authrt_cd FROM tb_authrt_info WHERE authrt_cd='ROLE_ADMIN' FOR UPDATE");
        assertThat(menus).isLessThan(group);
    }

    @Test
    void navigationStructureAcceptsCompleteTreesAndRejectsMissingParentsAndCycles() {
        var complete=List.of(NAV_ONE,new Grant("NAVIGATION","2"));
        service.replaceGrants("G_B",new ReplaceGrants(complete,service.group("G_B").version(),true));
        assertThat(db.writesTo("tb_authrt_grnt_map")).hasSize(2);
        db.writes.clear(); db.menuParents.put("1","9");
        error(CommonErrorCode.INVALID_INPUT_VALUE, () -> service.replaceGrants("G_B",new ReplaceGrants(complete,service.group("G_B").version(),true)));
        db.menuParents.put("1","2");
        error(CommonErrorCode.INVALID_INPUT_VALUE, () -> service.replaceGrants("G_B",new ReplaceGrants(complete,service.group("G_B").version(),true)));
        assertThat(db.writes).isEmpty();
        db.menuParents.put("1","0");
        service.replaceGrants("G_B",new ReplaceGrants(complete,service.group("G_B").version(),true));
        assertThat(db.writesTo("tb_authrt_grnt_map")).hasSize(2);
    }

    @Test
    void newMenuDoesNotRestoreARevokedAncestorGrant() {
        service.grantNewMenuToCompatibilityAdmin(2L);
        assertThat(db.writes).isEmpty();
        service.grantNewMenuToCompatibilityAdmin(3L);
        assertThat(db.writesTo("tb_authrt_grnt_map")).singleElement().satisfies(w ->
                assertThat(w.values().get(2)).isEqualTo("3"));
    }

    @Test
    void newMenuCompatibilityGrantIsExplicitAndIdempotentAndDeletionRemovesEveryGroupGrant() {
        db.groups.put("ROLE_ADMIN",new GroupData("Administrators",null,List.of(NAV_ONE)));
        service.grantNewMenuToCompatibilityAdmin(2L);
        assertThat(db.writesTo("tb_authrt_grnt_map")).singleElement().satisfies(w ->
                assertThat(w.values()).containsExactly("ROLE_ADMIN", "NAVIGATION", "2", "operator_login", "operator_login"));
        db.writes.clear();
        db.groups.put("ROLE_ADMIN", new GroupData("Administrators", null, List.of(new Grant("NAVIGATION", "2"))));
        service.grantNewMenuToCompatibilityAdmin(2L);
        assertThat(db.writes).isEmpty();
        db.groups.put("G_B", new GroupData("Team B", null, List.of(NAV_ONE)));
        service.removeNavigationGrantsForMenus(List.of(1L));
        assertThat(db.writesTo("tb_authrt_grnt_map")).extracting(Write::values)
                .containsExactly(List.of("G_A", "NAVIGATION", "1"), List.of("G_B", "NAVIGATION", "1"));
        assertThat(db.audits()).hasSize(2);
    }

    @Test
    void auditFailurePropagatesInsteadOfReportingAnUnauditedSuccess() {
        var unavailable = new DataAccessResourceFailureException("Synthetic audit failure");
        db.auditFailure = unavailable;
        assertThatThrownBy(() -> service.createGroup(new CreateGroup("NEW_GROUP", "Name", null))).isSameAs(unavailable);
        assertThat(db.writesTo("tb_authrt_info")).hasSize(1);
        // JDBC mock cannot prove rollback; API PostgreSQL regression owns that separate evidence.
    }

    @Test
    void historyRejectsReversedDatesAndBindsInclusiveDateFiltersWithPagination() throws Exception {
        error(CommonErrorCode.INVALID_INPUT_VALUE, () -> service.history(0, 20, null, null, null, LocalDate.of(2026, 9, 11), LocalDate.of(2026, 9, 10)));
        var at = LocalDateTime.of(2026, 9, 10, 12, 30);
        var expected = new Change(7L, "request", "policy", "USER_GROUP", "ADD", "G_A", "U_1", "대상자", null, null, "membership", null, "G_A", "OPERATOR_ID", "처리자", at, "복제 원본: G_B");
        Map<String, Object> values = new LinkedHashMap<>();
        String[] columns = {"authrt_chg_hstry_sn", "dmnd_idntfr", "plcy_ver_no", "chg_trgt_type_cd", "chg_type_cd", "authrt_cd", "scrty_dcsn_trgt_id", "target_user_nm", "authrt_type_cd", "authrt_grnt_cd", "chg_artcl_nm", "chg_bfr_cn", "chg_aftr_cn", "chg_user_idntfr", "actor_nm", "crt_dt", "chg_rsn"};
        Object[] data = {7L, "request", "policy", "USER_GROUP", "ADD", "G_A", "U_1", "대상자", null, null, "membership", null, "G_A", "OPERATOR_ID", "처리자", Timestamp.valueOf(at), "복제 원본: G_B"};
        for (int i = 0; i < columns.length; i++) values.put(columns[i], data[i]);
        try (var construction = mockConstruction(NamedParameterJdbcTemplate.class, (named, context) -> {
            when(named.query(anyString(), any(SqlParameterSource.class), ArgumentMatchers.<RowMapper<Change>>any()))
                    .thenAnswer(invocation -> {
                        RowMapper<?> mapper = invocation.getArgument(2);
                        return List.of(mapper.mapRow(resultSet(values), 0));
                    });
            when(named.queryForObject(anyString(), any(SqlParameterSource.class), eq(Long.class))).thenReturn(1L);
        })) {
            var result = service.history(2, 10, "G_A", "U_1", "OPERATOR_ID", at.toLocalDate(), at.toLocalDate());
            assertThat(result.getContent()).containsExactly(expected);
            assertThat(result.getNumber()).isEqualTo(2);
            assertThat(result.getSize()).isEqualTo(10);
            var parameters = ArgumentCaptor.forClass(SqlParameterSource.class);
            verify(construction.constructed().getFirst()).query(anyString(), parameters.capture(), ArgumentMatchers.<RowMapper<Change>>any());
            assertThat(parameters.getValue().getValue("groupCode")).isEqualTo("G_A");
            assertThat(parameters.getValue().getValue("userId")).isEqualTo("U_1");
            assertThat(parameters.getValue().getValue("actorId")).isEqualTo("OPERATOR_ID");
            assertThat(parameters.getValue().getValue("fromDate")).isEqualTo(Timestamp.valueOf(at.toLocalDate().atStartOfDay()));
            assertThat(parameters.getValue().getValue("untilDate")).isEqualTo(Timestamp.valueOf(at.toLocalDate().plusDays(1).atStartOfDay()));
            assertThat(parameters.getValue().getValue("offset")).isEqualTo(20L);
            service.history(0, 10, " ", null, "", null, null);
            var blankParameters = ArgumentCaptor.forClass(SqlParameterSource.class);
            verify(construction.constructed().getLast()).query(anyString(), blankParameters.capture(), ArgumentMatchers.<RowMapper<Change>>any());
            assertThat(((MapSqlParameterSource) blankParameters.getValue()).getValues()).containsOnlyKeys("size", "offset");
        }
    }

    // ── [2026-10-02] 관리 콘솔 UX 2단계 ─────────────────────────────────────────────────────────

    @Test
    void membershipChangesNoLongerInvalidateGroupDraftsButGrantChangesStillDo() {
        String groupVersion = service.group("G_C").version();
        String userVersion = service.memberships("U_1").version();
        service.changeGroupMembers("G_C", new ChangeGroupMembers(List.of("U_1"), List.of(), true));
        service.replaceMemberships("U_2", new ReplaceGroups(List.of("G_B", "G_C"), service.memberships("U_2").version(), true));
        // 구성원 이력(USER_GROUP)은 사용자 축에만 있다 — 그룹의 기능권한 초안은 그대로 저장된다.
        assertThat(service.group("G_C").version()).isEqualTo(groupVersion);
        assertThat(service.memberships("U_1").version()).isNotEqualTo(userVersion);
        service.replaceGrants("G_C", new ReplaceGrants(List.of(READ), groupVersion, true));
        // 권한 변경은 여전히 그 그룹의 옛 버전을 낡게 만든다.
        error(CommonErrorCode.CONCURRENT_MODIFICATION, () -> service.replaceGrants("G_C", new ReplaceGrants(List.of(), groupVersion, true)));
        assertThat(db.calls).anySatisfy(sql -> assertThat(sql).contains("WHERE authrt_cd=? AND chg_trgt_type_cd<>'USER_GROUP'"));
    }

    @Test
    void writesReturnTheSavedSnapshotSoAnotherTabCanRebase() {
        db.simulateGrants = true;
        var created = service.createGroup(new CreateGroup("NEW_GROUP", "New group", null));
        assertThat(created.code()).isEqualTo("NEW_GROUP");
        assertThat(created.name()).isEqualTo("New group");
        assertThat(created.grants()).isEmpty();
        assertThat(created).isEqualTo(service.group("NEW_GROUP"));
        String before = service.group("G_A").version();
        var updated = service.updateGroup("G_A", new UpdateGroup("Renamed", "Description A", before));
        assertThat(updated.name()).isEqualTo("Renamed");
        assertThat(updated.version()).isNotEqualTo(before).isEqualTo(service.group("G_A").version());
        var replaced = service.replaceGrants("G_B", new ReplaceGrants(List.of(READ), service.group("G_B").version(), true));
        assertThat(replaced.grants()).containsExactly(READ);
        assertThat(replaced).isEqualTo(service.group("G_B"));
    }

    @Test
    void groupMemberDeltaAddsAndRemovesInSortedOrderWithOneAuditRequest() {
        db.simulateMemberships = true;
        var result = service.changeGroupMembers("G_B", new ChangeGroupMembers(List.of(), List.of("U_2", "U_1"), true));
        assertThat(result.code()).isEqualTo("G_B");
        assertThat(result.removed()).containsExactly(new UserChoice("U_1", "login_one", "User one", "D_1"),
                new UserChoice("U_2", "login_two", "User two", "D_1"));
        assertThat(result.added()).isEmpty();
        assertThat(result.memberCount()).isZero();
        assertThat(db.writesTo("tb_authrt_user_map")).extracting(Write::values)
                .containsExactly(List.of("U_1", "G_B"), List.of("U_2", "G_B"));
        assertAudit(db.audits().get(0), "USER_GROUP", "REMOVE", "G_B", "U_1", null, "membership", "G_B", null);
        assertThat(db.audits().stream().map(w -> w.values().getFirst()).distinct()).hasSize(1);
        db.writes.clear();
        // 한 요청에서 추가와 회수를 함께 — 사용자 정렬 순서대로 처리한다.
        var mixed = service.changeGroupMembers("G_A", new ChangeGroupMembers(List.of("U_2"), List.of("U_1"), true));
        assertThat(mixed.added()).extracting(UserChoice::id).containsExactly("U_2");
        assertThat(mixed.removed()).extracting(UserChoice::id).containsExactly("U_1");
        assertThat(mixed.memberCount()).isEqualTo(1);
        assertThat(db.writesTo("tb_authrt_user_map")).extracting(Write::values).containsExactly(
                List.of("U_1", "G_A"), List.of("U_2", "G_A", "operator_login", "operator_login"));
        assertThat(db.memberships.get("U_1")).isEmpty();
        assertThat(db.memberships.get("U_2")).containsExactly("G_A");
    }

    @Test
    void groupMemberDeltaAddsMembersAndKeepsTheirOtherGroups() {
        db.simulateMemberships = true;
        db.memberships.put("U_2", List.of("G_B"));
        var result = service.changeGroupMembers("G_C", new ChangeGroupMembers(List.of("U_2", "U_1"), List.of(), true));
        assertThat(result.added()).extracting(UserChoice::id).containsExactly("U_1", "U_2");
        assertThat(result.memberCount()).isEqualTo(2);
        assertThat(db.writesTo("tb_authrt_user_map")).extracting(Write::values).containsExactly(
                List.of("U_1", "G_C", "operator_login", "operator_login"), List.of("U_2", "G_C", "operator_login", "operator_login"));
        assertThat(db.memberships.get("U_1")).containsExactly("G_A", "G_B", "G_C");
        assertThat(db.memberships.get("U_2")).containsExactly("G_B", "G_C");
        assertThat(db.reauthorizationRequests).containsExactly(List.of("OPERATOR_ID", "AUTHRT_ASSIGN"));
    }

    @Test
    void groupMemberDeltaRejectsMalformedRequestsBeforeDatabaseAccess() {
        List<ChangeGroupMembers> invalid = List.of(
                new ChangeGroupMembers(List.of(), List.of(), true),
                new ChangeGroupMembers(List.of("U_1"), List.of(), false),
                new ChangeGroupMembers(null, List.of(), true),
                new ChangeGroupMembers(List.of("U_1", "U_1"), List.of(), true),
                new ChangeGroupMembers(List.of(), List.of("U_2", "U_2"), true),
                new ChangeGroupMembers(List.of("U_1"), List.of("U_1"), true),
                new ChangeGroupMembers(Arrays.asList("U_1", null), List.of(), true),
                new ChangeGroupMembers(List.of(" "), List.of(), true));
        for (var request : invalid) error(CommonErrorCode.INVALID_INPUT_VALUE, () -> service.changeGroupMembers("G_C", request));
        assertThat(db.calls).isEmpty();
    }

    @Test
    void groupMemberDeltaAlsoRequiresReadBecauseItRevealsNamesAndMembership() {
        // 거부 사유·응답에 대상의 이름·로그인 ID·구성원 여부가 실린다 — 그룹 구성원 조회(AUTHRT_READ)와 같은 정보다.
        authenticate("operator_login", "OPERATOR_ID", Set.of("AUTHRT_ASSIGN"));
        error(CommonErrorCode.ACCESS_DENIED, () -> service.changeGroupMembers("G_A",
                new ChangeGroupMembers(List.of("U_1"), List.of(), true)));
        assertThat(db.calls).isEmpty();
        authenticate("operator_login", "OPERATOR_ID", Set.of("AUTHRT_ASSIGN", "AUTHRT_READ"));
        error(CommonErrorCode.CONCURRENT_MODIFICATION, () -> service.changeGroupMembers("G_A",
                new ChangeGroupMembers(List.of("U_1"), List.of(), true)));
        assertThat(db.writes).isEmpty();
    }

    @Test
    void groupMemberDeltaNamesConflictsAndMissingUsersWithoutWrites() {
        error(CommonErrorCode.RESOURCE_NOT_FOUND, () -> service.changeGroupMembers("MISSING", new ChangeGroupMembers(List.of("U_1"), List.of(), true)));
        var missing = assertThrows(BusinessException.class, () -> service.changeGroupMembers("G_C",
                new ChangeGroupMembers(List.of("U_1", "U_9"), List.of(), true)));
        assertThat(missing.getErrorCode()).isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE);
        assertThat(missing.getMessage()).contains("존재하지 않는 사용자가 있습니다: U_9").doesNotContain("U_1");
        var already = assertThrows(BusinessException.class, () -> service.changeGroupMembers("G_A",
                new ChangeGroupMembers(List.of("U_1", "U_2"), List.of(), true)));
        assertThat(already.getErrorCode()).isEqualTo(CommonErrorCode.CONCURRENT_MODIFICATION);
        assertThat(already.getMessage()).contains("이미 구성원인 사용자 User one(login_one)").doesNotContain("login_two");
        var absent = assertThrows(BusinessException.class, () -> service.changeGroupMembers("G_A",
                new ChangeGroupMembers(List.of(), List.of("U_1", "U_2"), true)));
        assertThat(absent.getErrorCode()).isEqualTo(CommonErrorCode.CONCURRENT_MODIFICATION);
        assertThat(absent.getMessage()).contains("구성원이 아닌 사용자 User two(login_two)").doesNotContain("login_one");
        db.groups.put("ROLE_ANONYMOUS", new GroupData("Anonymous", null, List.of()));
        error(CommonErrorCode.INVALID_INPUT_VALUE, () -> service.changeGroupMembers("ROLE_ANONYMOUS",
                new ChangeGroupMembers(List.of("U_1"), List.of(), true)));
        assertThat(db.writes).isEmpty();
    }

    @ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings = {"AUTHRT_GRANT", "AUTHRT_ASSIGN", "USER_PASSWORD", "MFA_RECOVER"})
    void groupMemberDeltaOnProtectedGroupsRequiresBothAdministrationPermissions(String permission) {
        db.groups.put("G_C", new GroupData("Protected", null, List.of(new Grant("OPERATION", permission))));
        authenticate("operator_login", "OPERATOR_ID", Set.of("AUTHRT_READ", "AUTHRT_ASSIGN"));
        error(CommonErrorCode.ACCESS_DENIED, () -> service.changeGroupMembers("G_C", new ChangeGroupMembers(List.of("U_2"), List.of(), true)));
        assertThat(db.writes).isEmpty();
        authenticate("operator_login", "OPERATOR_ID", Set.of("AUTHRT_READ", "AUTHRT_ASSIGN", "AUTHRT_GRANT"));
        db.reauthorizationRequests.clear();
        service.changeGroupMembers("G_C", new ChangeGroupMembers(List.of("U_2"), List.of(), true));
        assertThat(db.reauthorizationRequests).containsExactly(List.of("OPERATOR_ID", "AUTHRT_ASSIGN"),
                List.of("OPERATOR_ID", "AUTHRT_GRANT"), List.of("OPERATOR_ID", "AUTHRT_ASSIGN"));
    }

    @Test
    void groupMemberDeltaCannotRemoveTheLastManager() {
        db.managerCounts.clear(); db.managerCounts.add(1L); db.managerCounts.add(0L);
        error(CommonErrorCode.INVALID_INPUT_VALUE, () -> service.changeGroupMembers("G_A",
                new ChangeGroupMembers(List.of(), List.of("U_1"), true)));
        assertThat(db.managerQueries).isEqualTo(2);
    }

    @Test
    void copyingAGroupCopiesGrantsWithProvenanceButNotMembers() {
        db.simulateGrants = true;
        var copy = service.copyGroup("G_A", new CopyGroup("COPY_A", "Copy of A", "Copied", service.group("G_A").version()));
        assertThat(copy.code()).isEqualTo("COPY_A");
        assertThat(copy.name()).isEqualTo("Copy of A");
        assertThat(copy.grants()).containsExactly(NAV_ONE, READ);
        assertThat(db.writesTo("tb_authrt_info")).singleElement().satisfies(write ->
                assertThat(write.values()).startsWith("COPY_A", "Copy of A", "Copied"));
        assertThat(db.writesTo("tb_authrt_grnt_map")).extracting(Write::values).containsExactly(
                List.of("COPY_A", "NAVIGATION", "1", "operator_login", "operator_login"),
                List.of("COPY_A", "OPERATION", "BOARD_READ", "operator_login", "operator_login"));
        assertThat(db.writesTo("tb_authrt_user_map")).isEmpty();
        assertThat(db.audits()).hasSize(4).allSatisfy(write -> {
            assertThat(write.values().get(4)).isEqualTo("COPY_A");
            assertThat(write.values().get(13)).isEqualTo("복제 원본: G_A");
        });
        assertAudit(db.audits().get(0), "GROUP", "ADD", "COPY_A", null, null, "authrt_nm", null, "Copy of A");
        assertAudit(db.audits().get(2), "GROUP_GRANT", "ADD", "COPY_A", null, NAV_ONE, "grant", null, "1");
        assertThat(db.audits().stream().map(w -> w.values().getFirst()).distinct()).hasSize(1);
        assertThat(db.reauthorizationRequests).containsExactly(List.of("OPERATOR_ID", "AUTHRT_CREATE"), List.of("OPERATOR_ID", "AUTHRT_GRANT"));
        int menus = db.calls.indexOf("SELECT menu_sn::text,up_menu_sn::text FROM tb_menu_info ORDER BY menu_sn FOR NO KEY UPDATE");
        int admin = db.calls.indexOf("SELECT authrt_cd FROM tb_authrt_info WHERE authrt_cd='ROLE_ADMIN' FOR UPDATE");
        assertThat(menus).isNotNegative().isLessThan(admin);
        assertThat(db.groups.get("G_A").grants()).containsExactly(NAV_ONE, READ);
    }

    @Test
    void copyingRequiresCreateAndGrantAndRejectsStaleReservedDuplicateAnonymousAndOrphanSources() {
        authenticate("operator_login", "OPERATOR_ID", Set.of("AUTHRT_READ", "AUTHRT_CREATE"));
        error(CommonErrorCode.ACCESS_DENIED, () -> service.copyGroup("G_A", new CopyGroup("COPY_A", "Copy", null, "v")));
        authenticate("operator_login", "OPERATOR_ID", Set.of("AUTHRT_READ", "AUTHRT_GRANT"));
        error(CommonErrorCode.ACCESS_DENIED, () -> service.copyGroup("G_A", new CopyGroup("COPY_A", "Copy", null, "v")));
        assertThat(db.calls).isEmpty();
        authenticate("operator_login", "OPERATOR_ID", PermissionCodes.ALL);
        String version = service.group("G_A").version();
        error(CommonErrorCode.CONCURRENT_MODIFICATION, () -> service.copyGroup("G_A", new CopyGroup("COPY_A", "Copy", null, "stale")));
        error(CommonErrorCode.INVALID_INPUT_VALUE, () -> service.copyGroup("G_A", new CopyGroup("ROLE_USER", "Copy", null, version)));
        error(CommonErrorCode.INVALID_INPUT_VALUE, () -> service.copyGroup("G_A", new CopyGroup("G_B", "Copy", null, version)));
        error(CommonErrorCode.RESOURCE_NOT_FOUND, () -> service.copyGroup("MISSING", new CopyGroup("COPY_A", "Copy", null, version)));
        db.groups.put("ROLE_ANONYMOUS", new GroupData("Anonymous", null, List.of(NAV_ONE)));
        error(CommonErrorCode.INVALID_INPUT_VALUE, () -> service.copyGroup("ROLE_ANONYMOUS",
                new CopyGroup("COPY_A", "Copy", null, service.group("ROLE_ANONYMOUS").version())));
        db.groups.put("G_C", new GroupData("Orphan", null, List.of(new Grant("NAVIGATION", "2"), READ)));
        var orphan = assertThrows(BusinessException.class, () -> service.copyGroup("G_C",
                new CopyGroup("COPY_A", "Copy", null, service.group("G_C").version())));
        assertThat(orphan.getErrorCode()).isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE);
        assertThat(orphan.getMessage()).contains("'Child menu'");
        // 카탈로그에 없는(퇴역한) 기능 권한은 복제본으로 옮기지 않는다 — 원본을 먼저 정리하게 한다.
        db.groups.put("G_D", new GroupData("Retired", null, List.of(new Grant("OPERATION", "NETWORK_READ"), READ)));
        var retired = assertThrows(BusinessException.class, () -> service.copyGroup("G_D",
                new CopyGroup("COPY_D", "Copy", null, service.group("G_D").version())));
        assertThat(retired.getErrorCode()).isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE);
        assertThat(retired.getMessage()).contains("알 수 없는 기능 권한이 있습니다: NETWORK_READ").doesNotContain("BOARD_READ");
        assertThat(db.writes).isEmpty();
    }

    @ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings = {"AUTHRT_GRANT", "AUTHRT_ASSIGN", "USER_PASSWORD", "MFA_RECOVER"})
    void copyingProtectedGrantsRequiresBothAdministrationPermissions(String permission) {
        db.groups.put("G_C", new GroupData("Protected", null, List.of(new Grant("OPERATION", permission))));
        authenticate("operator_login", "OPERATOR_ID", Set.of("AUTHRT_READ", "AUTHRT_CREATE", "AUTHRT_GRANT"));
        error(CommonErrorCode.ACCESS_DENIED, () -> service.copyGroup("G_C",
                new CopyGroup("COPY_C", "Copy", null, service.group("G_C").version())));
        assertThat(db.writesTo("tb_authrt_grnt_map")).isEmpty();
    }

    @Test
    void grantMatrixReturnsEveryGroupSnapshotInCodeOrder() {
        var matrix = service.grantMatrix();
        assertThat(matrix.catalogVersion()).isEqualTo(PermissionCodes.CATALOG_VERSION);
        assertThat(matrix.groups()).extracting(GroupSnapshot::code).containsExactly("G_A", "G_B", "G_C", "ROLE_ADMIN");
        assertThat(matrix.groups().getFirst()).isEqualTo(service.group("G_A"));
    }

    @Test
    void groupSnapshotsUseThreeReadsAtBothSmallAndLargeSizes() {
        for (int added : List.of(0, 20)) {
            for (int i = 0; i < added; i++) {
                db.groups.put("EXTRA_" + i, new GroupData("Extra " + i, null, List.of(NAV_ONE, READ)));
            }
            db.calls.clear();
            var matrix = service.grantMatrix();
            assertThat(db.calls).hasSize(3);
            assertThat(matrix.groups()).hasSize(4 + added)
                    .allSatisfy(group -> assertThat(group).isEqualTo(service.group(group.code())));

            db.calls.clear();
            var summaries = service.groups();
            assertThat(db.calls).hasSize(3);
            assertThat(summaries).containsExactlyElementsOf(matrix.groups().stream()
                    .map(group -> new GroupSummary(group.code(), group.name(), group.description(), group.version())).toList());
        }
    }

    @Test
    void departmentSnapshotsUseFourReadsAndKeepIndividualVersions() {
        db.auditLog.add(new AuditRow("USER_GROUP", "G_B", "U_1"));
        for (int added : List.of(0, 20)) {
            for (int i = 0; i < added; i++) {
                String id = "EXTRA_" + i;
                db.users.put(id, List.of("login_" + i, "User " + i, "D_1"));
                db.memberships.put(id, i % 2 == 0 ? List.of("G_A", "G_B") : List.of());
            }
            db.calls.clear();
            var department = service.departmentMemberships("D_1");
            assertThat(db.calls).hasSize(4);
            assertThat(department.complete()).isTrue();
            assertThat(department.users()).hasSize(2 + added).allSatisfy(member -> {
                var individual = service.memberships(member.userId());
                assertThat(member.groups()).isEqualTo(individual.groups());
                assertThat(member.version()).isEqualTo(individual.version());
                assertThat(member.complete()).isTrue();
            });
            assertThat(department.users()).extracting(DepartmentMember::userId).isSorted();
        }
    }

    @Test
    void emptySnapshotsSkipUnneededBatchReadsAndMissingDepartmentsStillFail() {
        db.groups.clear();
        var matrix = service.grantMatrix();
        assertThat(matrix.groups()).isEmpty();
        assertThat(matrix.catalogVersion()).isEqualTo(PermissionCodes.CATALOG_VERSION);
        assertThat(db.calls).hasSize(1);

        db.calls.clear();
        db.users.clear();
        var department = service.departmentMemberships("D_1");
        assertThat(department.users()).isEmpty();
        assertThat(department.complete()).isTrue();
        assertThat(department.version()).isEqualTo(nuri.business.security.authorization.AuthorizationSnapshotService.digest(
                PermissionCodes.CATALOG_VERSION + "\nD_1\n[]"));
        assertThat(db.calls).hasSize(2);

        db.calls.clear();
        error(CommonErrorCode.RESOURCE_NOT_FOUND, () -> service.departmentMemberships("MISSING"));
        assertThat(db.calls).hasSize(1);
    }

    @Test
    void batchedGroupVersionsIgnoreMembershipHistoryAndKeepGrantAbaHistory() {
        var before = service.grantMatrix();
        db.auditLog.add(new AuditRow("USER_GROUP", "G_A", "U_1"));
        assertThat(service.grantMatrix()).isEqualTo(before);
        db.auditLog.add(new AuditRow("GROUP_GRANT", "G_A", null));
        var after = service.grantMatrix();
        assertThat(after.groups().getFirst().grants()).isEqualTo(before.groups().getFirst().grants());
        assertThat(after.groups().getFirst().version()).isNotEqualTo(before.groups().getFirst().version());
        assertThat(after.groups().getFirst()).isEqualTo(service.group("G_A"));
    }

    @Test
    void menuStructureGroupVersionsAreCheckedUnderTheMenuThenAdminLocks() {
        service.assertGroupVersions(List.of(new GroupVersion("G_B", service.group("G_B").version()),
                new GroupVersion("G_A", service.group("G_A").version())));
        int menus = db.calls.indexOf("SELECT menu_sn::text,up_menu_sn::text FROM tb_menu_info ORDER BY menu_sn FOR NO KEY UPDATE");
        int admin = db.calls.indexOf("SELECT authrt_cd FROM tb_authrt_info WHERE authrt_cd='ROLE_ADMIN' FOR UPDATE");
        assertThat(menus).isNotNegative().isLessThan(admin);
        var stale = assertThrows(BusinessException.class, () -> service.assertGroupVersions(List.of(new GroupVersion("G_A", "stale"))));
        assertThat(stale.getErrorCode()).isEqualTo(CommonErrorCode.CONCURRENT_MODIFICATION);
        assertThat(stale.getMessage()).contains("'Team A' 그룹의 권한이 다른 곳에서 바뀌었습니다");
        // 그룹 권한을 읽은 뒤 그 그룹이 지워졌으면 초안이 낡은 것이다 — 404 가 아니라 다시 불러오라는 409 다.
        var deleted = assertThrows(BusinessException.class, () -> service.assertGroupVersions(List.of(new GroupVersion("MISSING", "v"))));
        assertThat(deleted.getErrorCode()).isEqualTo(CommonErrorCode.CONCURRENT_MODIFICATION);
        assertThat(deleted.getMessage()).contains("'MISSING' 그룹이 다른 곳에서 삭제되었습니다");
        assertThat(db.writes).isEmpty();
    }

    @Test
    void movedMenusReportGroupsThatWouldLoseThemUnlessTheParentIsAlsoShown() {
        // G_A 는 메뉴 1 을 보고 3 은 보지 않는다 — 1 을 3 아래로 옮기면 G_A 사이드바에서 1 이 사라진다.
        assertThat(service.navigationVisibilityConflicts(Map.of(1L, 3L), Map.of(), Map.of(), Map.of()))
                .containsExactly(new NavigationConflict(1L, 3L, "G_A", "Team A"));
        assertThat(service.navigationVisibilityConflicts(Map.of(1L, 3L), Map.of("G_A", Set.of(3L)), Map.of(), Map.of())).isEmpty();
        assertThat(service.navigationVisibilityConflicts(Map.of(1L, 3L), Map.of(), Map.of("G_A", Set.of(1L)), Map.of())).isEmpty();
        assertThat(service.navigationVisibilityConflicts(Map.of(1L, -1L), Map.of("G_A", Set.of(-1L)), Map.of(), Map.of())).isEmpty();
        assertThat(service.navigationVisibilityConflicts(Map.of(1L, -1L), Map.of("G_B", Set.of(-1L, 1L)), Map.of(), Map.of()))
                .containsExactly(new NavigationConflict(1L, -1L, "G_A", "Team A"));
        var toRoot = new java.util.HashMap<Long, Long>(); toRoot.put(1L, null);
        assertThat(service.navigationVisibilityConflicts(toRoot, Map.of(), Map.of(), Map.of())).isEmpty();
        assertThat(service.navigationVisibilityConflicts(Map.of(), Map.of(), Map.of(), Map.of())).isEmpty();
        assertThat(db.writes).isEmpty();
    }

    @Test
    void visibilityCheckCountsTheCompatibilityAdminGrantANewMenuWillReceive() {
        // 관리자 그룹은 메뉴 1 을 본다. 1 을 새 폴더(-1) 아래로 옮기면, 저장 뒤 호환 배정이 그 폴더 표시를 관리자 그룹에 준다.
        db.groups.put("ROLE_ADMIN", new GroupData("Administrators", null, List.of(NAV_ONE)));
        Map<String, Set<Long>> showFolder = Map.of("G_A", Set.of(-1L, -2L));
        assertThat(service.navigationVisibilityConflicts(Map.of(1L, -1L), showFolder, Map.of(), Map.of()))
                .as("호환 배정을 모르면 관리자 그룹에서 숨겨진다고 잘못 판정한다")
                .containsExactly(new NavigationConflict(1L, -1L, "ROLE_ADMIN", "Administrators"));
        assertThat(service.navigationVisibilityConflicts(Map.of(1L, -1L), showFolder, Map.of(), Map.of(-1L, List.of()))).isEmpty();
        // 부모 먼저 순서로 누적한다 — 새 폴더(-1) 안의 새 하위(-2)도 상위를 모두 보므로 받는다.
        var nested = new java.util.LinkedHashMap<Long, List<Long>>();
        nested.put(-1L, List.of()); nested.put(-2L, List.of(-1L));
        assertThat(service.navigationVisibilityConflicts(Map.of(1L, -2L), showFolder, Map.of(), nested)).isEmpty();
        // 상위(메뉴 3)를 관리자 그룹이 보지 않으면 그 아래 새 메뉴는 배정을 받지 않으므로 여전히 숨겨진다.
        assertThat(service.navigationVisibilityConflicts(Map.of(1L, -1L), showFolder, Map.of(), Map.of(-1L, List.of(3L))))
                .containsExactly(new NavigationConflict(1L, -1L, "ROLE_ADMIN", "Administrators"));
        // 배정은 관리자 그룹에만 생긴다.
        assertThat(service.navigationVisibilityConflicts(Map.of(1L, -1L), Map.of(), Map.of(), Map.of(-1L, List.of())))
                .containsExactly(new NavigationConflict(1L, -1L, "G_A", "Team A"));
        assertThat(db.writes).isEmpty();
    }

    @Test
    void menuStructureGrantsApplyNavigationAndOperationsWithoutImplicitAncestors() {
        service.applyMenuStructureGrants(List.of(new ResolvedGrantChange("G_B", Set.of(2L, 1L), Set.of(), Set.of("BOARD_READ")),
                new ResolvedGrantChange("G_A", Set.of(), Set.of(1L), Set.of())), List.of());
        assertThat(db.writesTo("tb_authrt_grnt_map")).extracting(Write::values).containsExactly(
                List.of("G_A", "NAVIGATION", "1"),
                List.of("G_B", "NAVIGATION", "1", "operator_login", "operator_login"),
                List.of("G_B", "NAVIGATION", "2", "operator_login", "operator_login"),
                List.of("G_B", "OPERATION", "BOARD_READ", "operator_login", "operator_login"));
        assertThat(db.audits().stream().map(w -> w.values().getFirst()).distinct()).hasSize(1);
        assertThat(db.managerQueries).isEqualTo(2);
        db.writes.clear();
        error(CommonErrorCode.INVALID_INPUT_VALUE, () -> service.applyMenuStructureGrants(List.of(
                new ResolvedGrantChange("G_C", Set.of(2L), Set.of(), Set.of())), List.of()));
        error(CommonErrorCode.INVALID_INPUT_VALUE, () -> service.applyMenuStructureGrants(List.of(
                new ResolvedGrantChange("G_C", Set.of(), Set.of(), Set.of("NOT_REGISTERED"))), List.of()));
        db.groups.put("ROLE_ANONYMOUS", new GroupData("Anonymous", null, List.of()));
        error(CommonErrorCode.INVALID_INPUT_VALUE, () -> service.applyMenuStructureGrants(List.of(
                new ResolvedGrantChange("ROLE_ANONYMOUS", Set.of(), Set.of(), Set.of("BOARD_READ"))), List.of()));
        service.applyMenuStructureGrants(List.of(new ResolvedGrantChange("ROLE_ANONYMOUS", Set.of(1L), Set.of(), Set.of())), List.of());
        assertThat(db.writesTo("tb_authrt_grnt_map")).singleElement().satisfies(write ->
                assertThat(write.values()).startsWith("ROLE_ANONYMOUS", "NAVIGATION", "1"));
    }

    @Test
    void adminGroupChangesIncludeTheCompatibilityGrantOfNewParentsBeforeNormalizing() {
        // 메뉴 1 이 이번 요청의 새 폴더(호환 배정 후보), 2 는 그 아래 새 하위다. 관리자 그룹에 하위만 명시해도 폴더 표시가
        // 저장 뒤 호환 배정으로 생기므로 '상위 메뉴를 함께 선택' 으로 거부하지 않는다.
        service.applyMenuStructureGrants(List.of(new ResolvedGrantChange("ROLE_ADMIN", Set.of(2L), Set.of(), Set.of())), List.of(1L));
        assertThat(db.writesTo("tb_authrt_grnt_map")).extracting(write -> write.values().subList(0, 3)).containsExactly(
                List.of("ROLE_ADMIN", "NAVIGATION", "1"), List.of("ROLE_ADMIN", "NAVIGATION", "2"));
        db.writes.clear();
        // 상위를 보지 않는 후보(메뉴 2 의 상위 1 이 선택되지 않음)는 받지 않고, 관리자 그룹이 아닌 그룹에는 후보를 더하지 않는다.
        db.groups.put("ROLE_ADMIN", new GroupData("Administrators", null, List.of()));
        service.applyMenuStructureGrants(List.of(new ResolvedGrantChange("ROLE_ADMIN", Set.of(), Set.of(), Set.of("BOARD_READ")),
                new ResolvedGrantChange("G_B", Set.of(3L), Set.of(), Set.of())), List.of(2L, 1L));
        assertThat(db.writesTo("tb_authrt_grnt_map")).extracting(write -> write.values().subList(0, 3)).containsExactly(
                List.of("G_B", "NAVIGATION", "3"), List.of("ROLE_ADMIN", "NAVIGATION", "1"), List.of("ROLE_ADMIN", "OPERATION", "BOARD_READ"));
        error(CommonErrorCode.INVALID_INPUT_VALUE, () -> service.applyMenuStructureGrants(List.of(
                new ResolvedGrantChange("ROLE_ADMIN", Set.of(2L), Set.of(), Set.of())), List.of()));
    }

    @ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings = {"AUTHRT_GRANT", "AUTHRT_ASSIGN", "USER_PASSWORD", "MFA_RECOVER"})
    void menuStructureProtectedOperationGrantsRequireBothAdministrationPermissions(String permission) {
        authenticate("operator_login", "OPERATOR_ID", Set.of("AUTHRT_READ", "AUTHRT_GRANT"));
        error(CommonErrorCode.ACCESS_DENIED, () -> service.applyMenuStructureGrants(List.of(
                new ResolvedGrantChange("G_C", Set.of(), Set.of(), Set.of(permission))), List.of()));
        assertThat(db.writes).isEmpty();
    }

    private static void authenticate(String login, String id, Set<String> permissions) {
        var principal = CustomUserDetails.builder().userId(login).esntlId(id).password("unused-test-password")
                .groups(List.of("ROLE_ADMIN", "ROLE_SYSTEM")).permissions(new ArrayList<>(permissions))
                .authorizationVersion("test-current-version").enabled(true).lockAt("N").build();
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    private static void error(CommonErrorCode expected, Runnable action) {
        assertThat(assertThrows(BusinessException.class, action::run).getErrorCode()).isEqualTo(expected);
    }

    private static void assertAudit(Write write, String target, String change, String group, String user,
                                    Grant grant, String field, String before, String after) {
        assertThat(write.values().getFirst()).isInstanceOf(String.class).asString().isNotBlank();
        assertThat(write.values().subList(1, 13)).containsExactly(PermissionCodes.CATALOG_VERSION, target, change, group, user,
                grant == null ? null : grant.type(), grant == null ? null : grant.code(), field, before, after, "OPERATOR_ID", "operator_login");
    }

    private record GroupData(String name, String description, List<Grant> grants) {}
    private record Write(String sql, List<Object> values) {}
    /** 이력 한 행의 판정 축 — 버전 쿼리의 실제 WHERE 조건을 흉내 내기 위해 남긴다(쓰기 기록을 비워도 지워지지 않는다). */
    private record AuditRow(String target, String group, String user) {}

    /** Controlled JDBC results, not a SQL engine: unsupported calls fail immediately. */
    private static final class Boundary implements Answer<Object> {
        final Map<String, GroupData> groups = new TreeMap<>(Map.of(
                "G_A", new GroupData("Team A", "Description A", List.of(NAV_ONE, READ)),
                "G_B", new GroupData("Team B", null, List.of()), "G_C", new GroupData("Team C", null, List.of()),
                "ROLE_ADMIN", new GroupData("Administrators", null, List.of())));
        final Map<String, List<String>> memberships = new TreeMap<>(Map.of("U_1", List.of("G_A", "G_B"), "U_2", List.of("G_B")));
        /** esntlId → 로그인 ID·이름·부서. 구성원 일괄 변경의 대상 존재 확인이 읽는다. */
        final Map<String, List<String>> users = new TreeMap<>(Map.of(
                "U_1", List.of("login_one", "User one", "D_1"), "U_2", List.of("login_two", "User two", "D_1")));
        final List<String> calls = new ArrayList<>();
        final List<Write> writes = new ArrayList<>();
        final List<AuditRow> auditLog = new ArrayList<>();
        final List<List<Object>> reauthorizationRequests = new ArrayList<>();
        final List<Long> menuLocks = new ArrayList<>();
        final Map<String,String> menuParents = new LinkedHashMap<>();
        final Deque<Long> managerCounts = new ArrayDeque<>(List.of(1L));
        List<Object> lastUserSearch;
        long auditSequence;
        int managerQueries;
        boolean lockPresent = true;
        /** 켜면 권한·구성원 쓰기를 내부 상태에 반영한다(기존 테스트는 쓰기 기록만 본다). */
        boolean simulateGrants;
        boolean simulateMemberships;
        Boolean databaseAllowed = true;
        RuntimeException reauthorizationFailure;
        RuntimeException auditFailure;

        Boundary() { menuParents.put("1",null); menuParents.put("2","1"); menuParents.put("3",null); }

        List<Write> writesTo(String table) { return writes.stream().filter(w -> w.sql().contains(table)).toList(); }
        List<Write> audits() { return writesTo("tb_authrt_chg_hstry"); }

        /** 조건에 맞는 마지막 이력 위치(1부터, 없으면 0). 수동 auditSequence 는 모든 축을 함께 바꾼다. */
        private long lastAudit(java.util.function.Predicate<AuditRow> matches) {
            long last = 0;
            for (int i = 0; i < auditLog.size(); i++) if (matches.test(auditLog.get(i))) last = i + 1;
            return auditSequence * 1_000_000L + last;
        }

        private void simulate(String sql, List<Object> values) {
            if (sql.startsWith("INSERT INTO tb_authrt_info")) {
                groups.put((String) values.get(0), new GroupData((String) values.get(1), (String) values.get(2), List.of()));
            } else if (sql.startsWith("UPDATE tb_authrt_info")) {
                var old = groups.get((String) values.get(3));
                groups.put((String) values.get(3), new GroupData((String) values.get(0), (String) values.get(1), old == null ? List.of() : old.grants()));
            } else if (sql.startsWith("DELETE FROM tb_authrt_info")) {
                groups.remove((String) values.get(0));
            } else if (simulateGrants && sql.contains("tb_authrt_grnt_map")) {
                var old = groups.get((String) values.get(0));
                var grants = new ArrayList<>(old.grants());
                var grant = new Grant((String) values.get(1), (String) values.get(2));
                if (sql.startsWith("INSERT")) grants.add(grant); else grants.remove(grant);
                groups.put((String) values.get(0), new GroupData(old.name(), old.description(), grants.stream().sorted().toList()));
            } else if (simulateMemberships && sql.contains("tb_authrt_user_map")) {
                var current = new ArrayList<>(memberships.getOrDefault((String) values.get(0), List.of()));
                if (sql.startsWith("INSERT")) current.add((String) values.get(1)); else current.remove((String) values.get(1));
                memberships.put((String) values.get(0), current.stream().sorted().toList());
            }
        }

        @Override public Object answer(InvocationOnMock invocation) throws Throwable {
            Object[] args = invocation.getArguments();
            if (args.length == 0 || !(args[0] instanceof String sql)) return org.mockito.Answers.RETURNS_DEFAULTS.answer(invocation);
            calls.add(sql);
            String method = invocation.getMethod().getName();
            List<Object> parameters = Collections.unmodifiableList(new ArrayList<>(Arrays.asList(args).subList(method.equals("update") ? 1 : 2, args.length)));
            if (method.equals("update")) {
                if (sql.contains("tb_authrt_chg_hstry")) {
                    if (auditFailure != null) throw auditFailure;
                    auditLog.add(new AuditRow((String) parameters.get(2), (String) parameters.get(4), (String) parameters.get(5)));
                } else {
                    simulate(sql, parameters);
                }
                writes.add(new Write(sql, parameters));
                return 1;
            }
            if (method.equals("queryForObject")) {
                if (args[1] == Boolean.class) {
                    reauthorizationRequests.add(parameters);
                    if (reauthorizationFailure != null) throw reauthorizationFailure;
                    return databaseAllowed;
                }
                if (sql.contains("GROUP BY u.esntl_id")) { managerQueries++; return managerCounts.size() > 1 ? managerCounts.removeFirst() : managerCounts.getFirst(); }
                if (sql.contains("max(authrt_chg_hstry_sn)")) {
                    Object first = parameters.getFirst();
                    if (sql.contains("WHERE authrt_cd=? AND chg_trgt_type_cd<>'USER_GROUP'")) {
                        return lastAudit(row -> first.equals(row.group()) && !"USER_GROUP".equals(row.target()));
                    }
                    if (sql.contains("WHERE authrt_cd=? OR scrty_dcsn_trgt_id=?")) {
                        Object second = parameters.get(1);
                        return lastAudit(row -> first.equals(row.group()) || second.equals(row.user()));
                    }
                    if (sql.contains("WHERE scrty_dcsn_trgt_id=?")) return lastAudit(row -> first.equals(row.user()));
                    throw new AssertionError("Unexpected version query: " + sql);
                }
                if (sql.contains("tb_authrt_info")) return groups.containsKey(parameters.getFirst()) ? 1L : 0L;
                if (sql.contains("tb_authrt_user_map")) return memberships.values().stream().filter(g -> g.contains(parameters.getFirst())).count();
                if (sql.contains("tb_ognz_info")) return "D_1".equals(parameters.getFirst()) ? 1L : 0L;
                if (sql.contains("user_id LIKE")) return 2L;
                if (sql.contains("tb_user_info")) return memberships.containsKey(parameters.getFirst()) ? 1L : 0L;
            }
            if (method.equals("queryForList")) {
                if (sql.contains("tb_authrt_info")) return sql.contains("FOR UPDATE") ? (lockPresent ? List.of("ROLE_ADMIN") : List.of()) : new ArrayList<>(groups.keySet());
                if (sql.contains("authrt_cd=? AND scrty_dcsn_trgt_id IN (")) {
                    Object group = parameters.getFirst();
                    return parameters.subList(1, parameters.size()).stream()
                            .filter(user -> memberships.getOrDefault(user, List.of()).contains(group)).map(String.class::cast).toList();
                }
                if (sql.contains("tb_authrt_user_map")) return memberships.getOrDefault(parameters.getFirst(), List.of());
                if (sql.contains("tb_menu_info")) {
                    Long id = (Long) parameters.getFirst(); menuLocks.add(id);
                    return Set.of(1L, 2L, 3L).contains(id) ? List.of(id) : List.of();
                }
                if (sql.contains("tb_authrt_grnt_map")) return groups.entrySet().stream()
                        .filter(entry -> entry.getValue().grants().contains(new Grant("NAVIGATION", parameters.getFirst().toString())))
                        .map(Map.Entry::getKey).toList();
            }
            if (method.equals("query") && args[1] instanceof RowMapper<?> mapper) {
                List<Object[]> rows;
                if (sql.equals("SELECT authrt_cd,authrt_nm,authrt_expln FROM tb_authrt_info ORDER BY authrt_cd")) {
                    rows = groups.entrySet().stream().map(entry -> new Object[]{
                            entry.getKey(), entry.getValue().name(), entry.getValue().description()}).toList();
                } else if (sql.startsWith("SELECT authrt_cd,authrt_type_cd,authrt_grnt_cd FROM tb_authrt_grnt_map ORDER BY")) {
                    rows = groups.entrySet().stream().flatMap(entry -> entry.getValue().grants().stream().sorted()
                            .map(grant -> new Object[]{entry.getKey(), grant.type(), grant.code()})).toList();
                } else if (sql.equals("SELECT authrt_cd,max(authrt_chg_hstry_sn) FROM tb_authrt_chg_hstry WHERE chg_trgt_type_cd<>'USER_GROUP' GROUP BY authrt_cd")) {
                    rows = groups.keySet().stream().map(code -> new Object[]{code,
                            lastAudit(row -> code.equals(row.group()) && !"USER_GROUP".equals(row.target()))}).toList();
                } else if (sql.startsWith("SELECT m.scrty_dcsn_trgt_id,m.authrt_cd FROM tb_authrt_user_map m")) {
                    rows = users.entrySet().stream().filter(entry -> entry.getValue().get(2).equals(parameters.getFirst()))
                            .flatMap(entry -> memberships.getOrDefault(entry.getKey(), List.of()).stream().sorted()
                                    .map(group -> new Object[]{entry.getKey(), group})).toList();
                } else if (sql.startsWith("SELECT h.scrty_dcsn_trgt_id,max(h.authrt_chg_hstry_sn) FROM tb_authrt_chg_hstry h")) {
                    rows = users.entrySet().stream().filter(entry -> entry.getValue().get(2).equals(parameters.getFirst()))
                            .map(entry -> new Object[]{entry.getKey(), lastAudit(row -> entry.getKey().equals(row.user()))}).toList();
                } else if (sql.equals("SELECT esntl_id,user_id,user_nm FROM tb_user_info WHERE ognz_id=? ORDER BY esntl_id")) {
                    rows = users.entrySet().stream().filter(entry -> entry.getValue().get(2).equals(parameters.getFirst()))
                            .map(entry -> new Object[]{entry.getKey(), entry.getValue().get(0), entry.getValue().get(1)}).toList();
                } else if (sql.contains("FROM tb_user_info WHERE esntl_id IN (")) {
                    rows = parameters.stream().filter(users::containsKey).map(id -> {
                        var user = users.get(id);
                        return new Object[]{id, user.get(0), user.get(1), user.get(2)};
                    }).toList();
                } else if (sql.contains("SELECT authrt_cd,authrt_nm FROM tb_authrt_info ORDER BY authrt_cd")) {
                    rows = groups.entrySet().stream().map(entry -> new Object[]{entry.getKey(), entry.getValue().name()}).toList();
                } else if (sql.contains("WHERE authrt_type_cd='NAVIGATION' ORDER BY authrt_cd,authrt_grnt_cd")) {
                    rows = groups.entrySet().stream().flatMap(entry -> entry.getValue().grants().stream()
                            .filter(grant -> "NAVIGATION".equals(grant.type()))
                            .map(grant -> new Object[]{entry.getKey(), grant.code()})).toList();
                } else if (sql.contains("tb_authrt_info")) {
                    String code = (String) parameters.getFirst(); var group = groups.get(code);
                    rows = group == null ? List.of() : rows(new Object[]{code, group.name(), group.description()});
                } else if (sql.contains("tb_authrt_grnt_map")) {
                    var group = groups.get(parameters.getFirst());
                    rows = group == null ? List.of() : group.grants().stream().map(g -> new Object[]{g.type(), g.code()}).toList();
                } else if (sql.contains("tb_ognz_info")) rows = rows(new Object[]{"D_1", "Department one"});
                else if (sql.contains("tb_menu_info")) {
                    if (sql.contains("FOR NO KEY UPDATE")) {
                        rows=menuParents.entrySet().stream().map(entry -> {
                            menuLocks.add(Long.valueOf(entry.getKey()));
                            return new Object[]{entry.getKey(),entry.getValue()};
                        }).toList();
                    } else rows = rows(new Object[]{"1", "Root menu", null, "dir", "Y"}, new Object[]{"2", "Child menu", "1", "/admin/user/manage", "N"},
                            new Object[]{"3", "Legacy menu", "1", "/admin/system/menus", null});
                }
                else if (sql.contains("tb_user_info")) {
                    if (sql.contains("user_id LIKE")) lastUserSearch = parameters;
                    rows = rows(new Object[]{"U_1", "login_one", "User one", "D_1"}, new Object[]{"U_2", "login_two", "User two", "D_1"});
                } else throw new AssertionError("Unexpected JDBC query category");
                List<Object> results = new ArrayList<>();
                for (int i = 0; i < rows.size(); i++) {
                    Map<Object, Object> columns = new LinkedHashMap<>();
                    for (int column = 0; column < rows.get(i).length; column++) columns.put(column + 1, rows.get(i)[column]);
                    results.add(mapper.mapRow(resultSet(columns), i));
                }
                return results;
            }
            throw new AssertionError("Unsupported JDBC boundary method: " + method);
        }
    }

    private static List<Object[]> rows(Object[]... rows) { return Arrays.asList(rows); }

    private static ResultSet resultSet(Map<?, ?> values) {
        return mock(ResultSet.class, invocation -> {
            Object[] arguments = invocation.getArguments();
            if (arguments.length == 1 && values.containsKey(arguments[0])) {
                Object value = values.get(arguments[0]);
                return switch (invocation.getMethod().getName()) {
                    case "getString" -> value == null ? null : value.toString();
                    case "getLong" -> value == null ? 0L : ((Number) value).longValue();
                    case "getTimestamp" -> value;
                    default -> org.mockito.Answers.RETURNS_DEFAULTS.answer(invocation);
                };
            }
            return org.mockito.Answers.RETURNS_DEFAULTS.answer(invocation);
        });
    }
}
