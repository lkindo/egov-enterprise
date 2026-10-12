package nuri.business.security.authorization;

import java.util.List;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import static org.assertj.core.api.Assertions.assertThat;

/** 예시 권한은 core 코드(부서 업무)다 — 생성물은 권한 목록·런타임 바인딩을 구성 코드로 줄인다(Phase 2 10단계 10b). */
class PermissionPolicyTest {

    private final PermissionPolicy policy = new PermissionPolicy();

    @Test
    void explicitPermissionIsRequiredAndGroupsNeverActAsAuthorities() {
        assertThat(PermissionPolicy.has(principal(List.of("ROLE_ADMIN"), List.of(), true, "N"), "DEPT_JOB_READ")).isFalse();
        assertThat(PermissionPolicy.has(principal(List.of("CONTENT"), List.of("DEPT_JOB_READ"), true, "N"), "DEPT_JOB_READ")).isTrue();
        assertThat(PermissionPolicy.has(principal(List.of("CONTENT"), List.of("DEPT_JOB_READ"), true, "N"), "DEPT_JOB_DELETE")).isFalse();
        assertThat(PermissionPolicy.has(principal(List.of("ROLE_SYSTEM"), List.of(), true, "N"), "AUTHRT_GRANT")).isFalse();
    }

    @Test
    void displayRoleAndGenericRoleTokenCannotMintCapabilities() {
        var legacy = CustomUserDetails.builder().esntlId("fixture").enabled(true).authorCode("ROLE_ADMIN")
                .roleName("ADMIN").authorityCodes(List.of("ROLE_SYSTEM")).build();
        var auth = new UsernamePasswordAuthenticationToken(legacy, null, legacy.getAuthorities());
        assertThat(PermissionPolicy.has(auth, "DEPT_JOB_READ")).isFalse();
        var generic = new UsernamePasswordAuthenticationToken("fixture", null,
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN"), new SimpleGrantedAuthority("DEPT_JOB_READ")));
        assertThat(PermissionPolicy.has(generic, "DEPT_JOB_READ")).isFalse();
    }

    @Test
    void inactiveLockedAnonymousAndUnauthenticatedPrincipalsAreDenied() {
        for (Authentication rejected : List.of(
                principal(List.of("ROLE_ADMIN"), List.of("DEPT_JOB_READ"), false, "N"),
                principal(List.of("ROLE_ADMIN"), List.of("DEPT_JOB_READ"), true, "Y"),
                new AnonymousAuthenticationToken("test-key", "anonymousUser", List.of(new SimpleGrantedAuthority("DEPT_JOB_READ"))),
                new UsernamePasswordAuthenticationToken("fixture", null))) {
            assertThat(PermissionPolicy.has(rejected, "DEPT_JOB_READ")).isFalse();
            assertThat(policy.allows(rejected, binding("AUTHENTICATED", null, null))).isFalse();
        }
        assertThat(PermissionPolicy.has(null, "DEPT_JOB_READ")).isFalse();
    }

    @Test
    void activeZeroGroupIdentityRetainsOnlyExplicitAuthenticatedOperations() {
        Authentication empty = principal(List.of(), List.of(), true, "N");
        assertThat(policy.allows(empty, binding("AUTHENTICATED", null, null))).isTrue();
        assertThat(policy.allows(empty, binding("PERMISSION", "DEPT_JOB_READ", null))).isFalse();
        assertThat(policy.isSystem(empty)).isFalse();
    }

    @Test
    void systemMembershipBlocksPrivacyEvenWhenOtherGroupGrantsIt() {
        var privacy = binding("PERMISSION", "PRIVACY_READ", List.of("ROLE_SYSTEM"));
        assertThat(policy.allows(principal(List.of("PRIVACY"), List.of("PRIVACY_READ"), true, "N"), privacy)).isTrue();
        Authentication systemOnly = principal(List.of("ROLE_SYSTEM"), List.of(), true, "N");
        assertThat(policy.isSystem(systemOnly)).isTrue();
        assertThat(policy.allows(systemOnly, privacy)).isFalse();
        Authentication multiple = principal(List.of("ROLE_SYSTEM", "PRIVACY"), List.of("PRIVACY_READ"), true, "N");
        assertThat(policy.allows(multiple, privacy)).isFalse();
    }

    @Test
    void unknownPermissionAccessOrHandlerIsDeniedWithoutFallback() {
        Authentication auth = principal(List.of("ROLE_ADMIN"), List.of("DEPT_JOB_READ"), true, "N");
        assertThat(PermissionPolicy.has(auth, null)).isFalse();
        assertThat(PermissionPolicy.has(auth, "UNKNOWN_PERMISSION")).isFalse();
        assertThat(policy.allows(auth, binding("UNKNOWN", null, null))).isFalse();
        assertThat(policy.allows(auth, binding("DENY", null, null))).isFalse();
        assertThat(policy.allowed(auth, "missing.Handler#method")).isFalse();
    }

    @Test
    void publicAccessAndActualHandlerBindingsAreExplicit() {
        assertThat(policy.allows(null, binding("PUBLIC", null, null))).isTrue();
        assertThat(policy.allowed(null, "nuri.api.controller.foundation.auth.AuthApiController#login")).isTrue();
        Authentication reader = principal(List.of("CONTENT"), List.of("DEPT_JOB_READ"), true, "N");
        assertThat(policy.bindings()).isNotEmpty();
        var binding = policy.bindings().stream().filter(row -> "DEPT_JOB_READ".equals(row.permission())).findFirst().orElseThrow();
        assertThat(policy.allowed(reader, binding.handler())).isTrue();
        assertThat(policy.allowed(principal(List.of(), List.of(), true, "N"), binding.handler())).isFalse();
    }

    private static PermissionPolicy.Binding binding(String access, String permission, List<String> excluded) {
        return new PermissionPolicy.Binding("GET", "/fixture", "fixture#method", access, permission, excluded);
    }

    static Authentication principal(List<String> groups, List<String> permissions, boolean enabled, String lockAt) {
        var user = CustomUserDetails.builder().userId("fixture-login").esntlId("fixture-subject").enabled(enabled)
                .lockAt(lockAt).groups(groups).permissions(permissions).authorizationVersion("fixture-version").build();
        return new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
    }
}
