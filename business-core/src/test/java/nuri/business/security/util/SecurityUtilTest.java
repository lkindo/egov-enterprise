package nuri.business.security.util;

import java.util.List;
import nuri.foundation.security.service.CustomUserDetails;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import static org.assertj.core.api.Assertions.*;

/** Permission override is explicit; loginId and esntlId ownership axes stay distinct. */
@SuppressWarnings("deprecation")
class SecurityUtilTest {
    @BeforeEach void before() { SecurityContextHolder.clearContext(); }
    @AfterEach void after() { SecurityContextHolder.clearContext(); }

    @Test void missingIdentityIsEmpty() {
        assertThat(SecurityUtil.getCurrentUserId()).isEmpty();
        assertThat(SecurityUtil.getCurrentEsntlId()).isEmpty();
        assertThat(SecurityUtil.getCurrentLoginId()).isEmpty();
    }
    @Test void canonicalIdentityKeepsBothAxes() {
        authenticate("loginA");
        assertThat(SecurityUtil.getCurrentLoginId()).contains("loginA");
        assertThat(SecurityUtil.getCurrentEsntlId()).contains("ESNTL_loginA");
        assertThat(SecurityUtil.getCurrentUserId()).contains("ESNTL_loginA");
    }
    @Test void legacyUserDetailsIdentityReadRemainsCompatible() {
        var user = org.springframework.security.core.userdetails.User.withUsername("esntl").password("fixture").authorities(List.of()).build();
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));
        assertThat(SecurityUtil.getCurrentEsntlId()).contains("esntl");
        assertThat(SecurityUtil.getCurrentLoginId()).isEmpty();
    }
    @Test void legacyStringIdentityReadDoesNotMintPermissions() {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("esntl", null, List.of(new SimpleGrantedAuthority("BOARD_READ"))));
        assertThat(SecurityUtil.getCurrentEsntlId()).contains("esntl");
        assertThat(SecurityUtil.hasPermission("BOARD_READ")).isFalse();
    }
    @Test void unauthenticatedCanonicalLoginIdIsEmpty() {
        var user = CustomUserDetails.builder().userId("loginA").esntlId("ESNTL_loginA").enabled(true).build();
        SecurityContextHolder.getContext().setAuthentication(UsernamePasswordAuthenticationToken.unauthenticated(user, null));
        assertThat(SecurityUtil.getCurrentLoginId()).isEmpty();
    }
    @Test void exactPermissionIsAllowed() { authenticate("loginA", "BOARD_READ"); assertThat(SecurityUtil.hasPermission("BOARD_READ")).isTrue(); }
    @Test void otherPermissionIsDenied() { authenticate("loginA", "BOARD_READ"); assertThat(SecurityUtil.hasPermission("BOARD_DELETE")).isFalse(); }
    @Test void noAuthenticationHasNoPermission() { assertThat(SecurityUtil.hasPermission("BOARD_READ")).isFalse(); }
    @Test void unknownNullOrRoleSymbolIsNeverPermission() {
        authenticate("loginA", "UNKNOWN", "ROLE_ADMIN");
        for (String code : List.of("UNKNOWN", "ROLE_ADMIN", "ADMIN")) assertThat(SecurityUtil.hasPermission(code)).isFalse();
        assertThat(SecurityUtil.hasPermission(null)).isFalse();
    }
    @Test void adminGroupAndDisplayFieldsAloneNeverBypassOwnership() {
        var user = CustomUserDetails.builder().userId("admin").esntlId("ESNTL_admin").enabled(true)
                .groups(List.of("ROLE_ADMIN", "ROLE_SYSTEM")).roleName("ADMIN").authorCode("ROLE_ADMIN").build();
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));
        assertThat(SecurityUtil.hasPermission("BOARD_READ")).isFalse();
        denied(() -> SecurityUtil.assertOwnerOrPermission("victim", "BOARD_READ_ALL"));
    }
    @Test void permissionGuardAllowsExactGrant() { authenticate("operator", "BOARD_CREATE"); assertThatCode(() -> SecurityUtil.assertPermission("BOARD_CREATE")).doesNotThrowAnyException(); }
    @Test void permissionGuardDeniesOtherOrMissingGrant() { authenticate("operator", "BOARD_READ"); denied(() -> SecurityUtil.assertPermission("BOARD_CREATE")); }
    @Test void loginOwnerCanModifyWithoutOverride() { authenticate("loginA"); assertThatCode(() -> SecurityUtil.assertOwnerOrPermission("loginA", "BOARD_UPDATE_ALL")).doesNotThrowAnyException(); }
    @Test void loginNonOwnerIsDenied() { authenticate("loginA"); denied(() -> SecurityUtil.assertOwnerOrPermission("loginB", "BOARD_UPDATE_ALL")); }
    @Test void loginAxisDoesNotAcceptEsntlId() { authenticate("loginA"); denied(() -> SecurityUtil.assertOwnerOrPermission("ESNTL_loginA", "BOARD_UPDATE_ALL")); }
    @Test void exactLoginOverrideAllowsNonOwner() { authenticate("operator", "BOARD_UPDATE_ALL"); assertThatCode(() -> SecurityUtil.assertOwnerOrPermission("victim", "BOARD_UPDATE_ALL")).doesNotThrowAnyException(); }
    @Test void readOverrideCannotAuthorizeDelete() { authenticate("operator", "BOARD_READ_ALL"); denied(() -> SecurityUtil.assertOwnerOrPermission("victim", "BOARD_DELETE_ALL")); }
    @Test void esntlOwnerCanModifyWithoutOverride() { authenticate("loginA"); assertThatCode(() -> SecurityUtil.assertOwnerOrPermissionByEsntlId("ESNTL_loginA", "BOARD_UPDATE_ALL")).doesNotThrowAnyException(); }
    @Test void esntlNonOwnerIsDenied() { authenticate("loginA"); denied(() -> SecurityUtil.assertOwnerOrPermissionByEsntlId("ESNTL_other", "BOARD_UPDATE_ALL")); }
    @Test void esntlAxisDoesNotAcceptLoginId() { authenticate("loginA"); denied(() -> SecurityUtil.assertOwnerOrPermissionByEsntlId("loginA", "BOARD_UPDATE_ALL")); }
    @Test void exactEsntlOverrideAllowsNonOwner() { authenticate("operator", "BOARD_UPDATE_ALL"); assertThatCode(() -> SecurityUtil.assertOwnerOrPermissionByEsntlId("ESNTL_other", "BOARD_UPDATE_ALL")).doesNotThrowAnyException(); }
    @Test void strictOwnerAlwaysRequiresIdentityEvenWithAllOverrideGrants() {
        authenticate("operator", "BOARD_READ_ALL", "BOARD_UPDATE_ALL", "BOARD_DELETE_ALL");
        denied(() -> SecurityUtil.assertOwnerByEsntlId("ESNTL_victim"));
        assertThatCode(() -> SecurityUtil.assertOwnerByEsntlId("ESNTL_operator")).doesNotThrowAnyException();
    }
    @Test void strictOwnerWithoutAuthenticationIsDenied() { denied(() -> SecurityUtil.assertOwnerByEsntlId("ESNTL_victim")); }
    @Test void missingOwnerNeverMatchesMissingIdentity() {
        denied(() -> SecurityUtil.assertOwnerOrPermission(null, "BOARD_UPDATE_ALL"));
        denied(() -> SecurityUtil.assertOwnerOrPermissionByEsntlId(null, "BOARD_UPDATE_ALL"));
    }
    private static void authenticate(String login, String... permissions) {
        var user = CustomUserDetails.builder().userId(login).esntlId("ESNTL_" + login).enabled(true)
                .permissions(List.of(permissions)).authorizationVersion("fixture").build();
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));
    }
    private static void denied(org.assertj.core.api.ThrowableAssert.ThrowingCallable action) {
        assertThatThrownBy(action).isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
    }
}
