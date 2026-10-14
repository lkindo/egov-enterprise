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

/**
 * Permission override is explicit; loginId and esntlId ownership axes stay distinct.
 * 예시 권한은 core 코드(부서 업무·파일)다 — 생성물은 권한 목록을 구성 코드로 줄인다(Phase 2 10단계 10b).
 */
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
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("esntl", null, List.of(new SimpleGrantedAuthority("DEPT_JOB_READ"))));
        assertThat(SecurityUtil.getCurrentEsntlId()).contains("esntl");
        assertThat(SecurityUtil.hasPermission("DEPT_JOB_READ")).isFalse();
    }
    @Test void unauthenticatedCanonicalLoginIdIsEmpty() {
        var user = CustomUserDetails.builder().userId("loginA").esntlId("ESNTL_loginA").enabled(true).build();
        SecurityContextHolder.getContext().setAuthentication(UsernamePasswordAuthenticationToken.unauthenticated(user, null));
        assertThat(SecurityUtil.getCurrentLoginId()).isEmpty();
        assertThat(SecurityUtil.getCurrentEsntlId()).isEmpty();
    }
    @Test void anonymousPrincipalIsNeverTreatedAsEsntlId() {
        SecurityContextHolder.getContext().setAuthentication(
                new org.springframework.security.authentication.AnonymousAuthenticationToken(
                        "key", "anonymousUser", List.of(new SimpleGrantedAuthority("ROLE_ANONYMOUS"))));
        assertThat(SecurityUtil.getCurrentEsntlId()).isEmpty();
        assertThat(SecurityUtil.getCurrentUserId()).isEmpty();

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("anonymousUser", null, List.of()));
        assertThat(SecurityUtil.getCurrentEsntlId()).isEmpty();

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("   ", null, List.of()));
        assertThat(SecurityUtil.getCurrentEsntlId()).isEmpty();
    }
    @Test void currentUserNameComesFromPrincipalAndBlankIsEmpty() {
        // [DIP V8] 설문 응답자 이름의 출처. 이름이 비면 호출부가 로그인 ID 로 물러난다.
        var named = CustomUserDetails.builder().userId("loginA").esntlId("ESNTL_loginA").userNm("  김응답 ").enabled(true).build();
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(named, null, named.getAuthorities()));
        assertThat(SecurityUtil.getCurrentUserNm()).contains("김응답");

        var blank = CustomUserDetails.builder().userId("loginB").esntlId("ESNTL_loginB").userNm(" ").enabled(true).build();
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(blank, null, blank.getAuthorities()));
        assertThat(SecurityUtil.getCurrentUserNm()).isEmpty();

        SecurityContextHolder.clearContext();
        assertThat(SecurityUtil.getCurrentUserNm()).isEmpty();
    }
    @Test void exactPermissionIsAllowed() { authenticate("loginA", "DEPT_JOB_READ"); assertThat(SecurityUtil.hasPermission("DEPT_JOB_READ")).isTrue(); }
    @Test void otherPermissionIsDenied() { authenticate("loginA", "DEPT_JOB_READ"); assertThat(SecurityUtil.hasPermission("DEPT_JOB_DELETE")).isFalse(); }
    @Test void noAuthenticationHasNoPermission() { assertThat(SecurityUtil.hasPermission("DEPT_JOB_READ")).isFalse(); }
    @Test void unknownNullOrRoleSymbolIsNeverPermission() {
        authenticate("loginA", "UNKNOWN", "ROLE_ADMIN");
        for (String code : List.of("UNKNOWN", "ROLE_ADMIN", "ADMIN")) assertThat(SecurityUtil.hasPermission(code)).isFalse();
        assertThat(SecurityUtil.hasPermission(null)).isFalse();
    }
    @Test void adminGroupAndDisplayFieldsAloneNeverBypassOwnership() {
        var user = CustomUserDetails.builder().userId("admin").esntlId("ESNTL_admin").enabled(true)
                .groups(List.of("ROLE_ADMIN", "ROLE_SYSTEM")).roleName("ADMIN").authorCode("ROLE_ADMIN").build();
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));
        assertThat(SecurityUtil.hasPermission("DEPT_JOB_READ")).isFalse();
        denied(() -> SecurityUtil.assertOwnerOrPermission("victim", "FILE_READ_ALL"));
    }
    @Test void permissionGuardAllowsExactGrant() { authenticate("operator", "DEPT_JOB_CREATE"); assertThatCode(() -> SecurityUtil.assertPermission("DEPT_JOB_CREATE")).doesNotThrowAnyException(); }
    @Test void permissionGuardDeniesOtherOrMissingGrant() { authenticate("operator", "DEPT_JOB_READ"); denied(() -> SecurityUtil.assertPermission("DEPT_JOB_CREATE")); }
    @Test void loginOwnerCanModifyWithoutOverride() { authenticate("loginA"); assertThatCode(() -> SecurityUtil.assertOwnerOrPermission("loginA", "DEPT_JOB_UPDATE_ALL")).doesNotThrowAnyException(); }
    @Test void loginNonOwnerIsDenied() { authenticate("loginA"); denied(() -> SecurityUtil.assertOwnerOrPermission("loginB", "DEPT_JOB_UPDATE_ALL")); }
    @Test void loginAxisDoesNotAcceptEsntlId() { authenticate("loginA"); denied(() -> SecurityUtil.assertOwnerOrPermission("ESNTL_loginA", "DEPT_JOB_UPDATE_ALL")); }
    @Test void exactLoginOverrideAllowsNonOwner() { authenticate("operator", "DEPT_JOB_UPDATE_ALL"); assertThatCode(() -> SecurityUtil.assertOwnerOrPermission("victim", "DEPT_JOB_UPDATE_ALL")).doesNotThrowAnyException(); }
    @Test void readOverrideCannotAuthorizeDelete() { authenticate("operator", "FILE_READ_ALL"); denied(() -> SecurityUtil.assertOwnerOrPermission("victim", "FILE_DELETE_ALL")); }
    @Test void esntlOwnerCanModifyWithoutOverride() { authenticate("loginA"); assertThatCode(() -> SecurityUtil.assertOwnerOrPermissionByEsntlId("ESNTL_loginA", "DEPT_JOB_UPDATE_ALL")).doesNotThrowAnyException(); }
    @Test void esntlNonOwnerIsDenied() { authenticate("loginA"); denied(() -> SecurityUtil.assertOwnerOrPermissionByEsntlId("ESNTL_other", "DEPT_JOB_UPDATE_ALL")); }
    @Test void esntlAxisDoesNotAcceptLoginId() { authenticate("loginA"); denied(() -> SecurityUtil.assertOwnerOrPermissionByEsntlId("loginA", "DEPT_JOB_UPDATE_ALL")); }
    @Test void exactEsntlOverrideAllowsNonOwner() { authenticate("operator", "DEPT_JOB_UPDATE_ALL"); assertThatCode(() -> SecurityUtil.assertOwnerOrPermissionByEsntlId("ESNTL_other", "DEPT_JOB_UPDATE_ALL")).doesNotThrowAnyException(); }
    @Test void strictOwnerAlwaysRequiresIdentityEvenWithAllOverrideGrants() {
        authenticate("operator", "FILE_READ_ALL", "DEPT_JOB_UPDATE_ALL", "DEPT_JOB_DELETE_ALL");
        denied(() -> SecurityUtil.assertOwnerByEsntlId("ESNTL_victim"));
        assertThatCode(() -> SecurityUtil.assertOwnerByEsntlId("ESNTL_operator")).doesNotThrowAnyException();
    }
    @Test void strictOwnerWithoutAuthenticationIsDenied() { denied(() -> SecurityUtil.assertOwnerByEsntlId("ESNTL_victim")); }
    @Test void missingOwnerNeverMatchesMissingIdentity() {
        denied(() -> SecurityUtil.assertOwnerOrPermission(null, "DEPT_JOB_UPDATE_ALL"));
        denied(() -> SecurityUtil.assertOwnerOrPermissionByEsntlId(null, "DEPT_JOB_UPDATE_ALL"));
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
