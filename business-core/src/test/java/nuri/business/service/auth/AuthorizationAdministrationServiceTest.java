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
                () -> service.history(0, 20, null, null, null, null, null));
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
        assertThat(catalog.navigation()).containsExactly(new Navigation("1", "Root menu", null), new Navigation("2", "Child menu", "1"));
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
        var expected = new Change(7L, "request", "policy", "USER_GROUP", "ADD", "G_A", "U_1", null, null, "membership", null, "G_A", "OPERATOR_ID", at);
        Map<String, Object> values = new LinkedHashMap<>();
        String[] columns = {"authrt_chg_hstry_sn", "dmnd_idntfr", "plcy_ver_no", "chg_trgt_type_cd", "chg_type_cd", "authrt_cd", "scrty_dcsn_trgt_id", "authrt_type_cd", "authrt_grnt_cd", "chg_artcl_nm", "chg_bfr_cn", "chg_aftr_cn", "chg_user_idntfr", "crt_dt"};
        Object[] data = {7L, "request", "policy", "USER_GROUP", "ADD", "G_A", "U_1", null, null, "membership", null, "G_A", "OPERATOR_ID", Timestamp.valueOf(at)};
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

    /** Controlled JDBC results, not a SQL engine: unsupported calls fail immediately. */
    private static final class Boundary implements Answer<Object> {
        final Map<String, GroupData> groups = new TreeMap<>(Map.of(
                "G_A", new GroupData("Team A", "Description A", List.of(NAV_ONE, READ)),
                "G_B", new GroupData("Team B", null, List.of()), "G_C", new GroupData("Team C", null, List.of()),
                "ROLE_ADMIN", new GroupData("Administrators", null, List.of())));
        final Map<String, List<String>> memberships = new TreeMap<>(Map.of("U_1", List.of("G_A", "G_B"), "U_2", List.of("G_B")));
        final List<String> calls = new ArrayList<>();
        final List<Write> writes = new ArrayList<>();
        final List<List<Object>> reauthorizationRequests = new ArrayList<>();
        final List<Long> menuLocks = new ArrayList<>();
        final Map<String,String> menuParents = new LinkedHashMap<>();
        final Deque<Long> managerCounts = new ArrayDeque<>(List.of(1L));
        List<Object> lastUserSearch;
        long auditSequence;
        int managerQueries;
        boolean lockPresent = true;
        Boolean databaseAllowed = true;
        RuntimeException reauthorizationFailure;
        RuntimeException auditFailure;

        Boundary() { menuParents.put("1",null); menuParents.put("2","1"); menuParents.put("3",null); }

        List<Write> writesTo(String table) { return writes.stream().filter(w -> w.sql().contains(table)).toList(); }
        List<Write> audits() { return writesTo("tb_authrt_chg_hstry"); }

        @Override public Object answer(InvocationOnMock invocation) throws Throwable {
            Object[] args = invocation.getArguments();
            if (args.length == 0 || !(args[0] instanceof String sql)) return org.mockito.Answers.RETURNS_DEFAULTS.answer(invocation);
            calls.add(sql);
            String method = invocation.getMethod().getName();
            List<Object> parameters = Collections.unmodifiableList(new ArrayList<>(Arrays.asList(args).subList(method.equals("update") ? 1 : 2, args.length)));
            if (method.equals("update")) {
                if (sql.contains("tb_authrt_chg_hstry")) {
                    if (auditFailure != null) throw auditFailure;
                    auditSequence++;
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
                if (sql.contains("max(authrt_chg_hstry_sn)")) return auditSequence;
                if (sql.contains("tb_authrt_info")) return groups.containsKey(parameters.getFirst()) ? 1L : 0L;
                if (sql.contains("tb_authrt_user_map")) return memberships.values().stream().filter(g -> g.contains(parameters.getFirst())).count();
                if (sql.contains("tb_ognz_info")) return "D_1".equals(parameters.getFirst()) ? 1L : 0L;
                if (sql.contains("user_id LIKE")) return 2L;
                if (sql.contains("tb_user_info")) return memberships.containsKey(parameters.getFirst()) ? 1L : 0L;
            }
            if (method.equals("queryForList")) {
                if (sql.contains("tb_authrt_info")) return sql.contains("FOR UPDATE") ? (lockPresent ? List.of("ROLE_ADMIN") : List.of()) : new ArrayList<>(groups.keySet());
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
                if (sql.contains("tb_authrt_info")) {
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
                    } else rows = rows(new Object[]{"1", "Root menu", null}, new Object[]{"2", "Child menu", "1"});
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
