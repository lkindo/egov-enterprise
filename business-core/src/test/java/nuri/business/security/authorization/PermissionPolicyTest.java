package nuri.business.security.authorization;

import java.util.List;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import static org.assertj.core.api.Assertions.assertThat;

class PermissionPolicyTest {

    private final PermissionPolicy policy = new PermissionPolicy();

    @Test
    void explicitPermissionIsRequiredAndGroupsNeverActAsAuthorities() {
        assertThat(PermissionPolicy.has(principal(List.of("ROLE_ADMIN"), List.of(), true, "N"), "BOARD_READ")).isFalse();
        assertThat(PermissionPolicy.has(principal(List.of("CONTENT"), List.of("BOARD_READ"), true, "N"), "BOARD_READ")).isTrue();
        assertThat(PermissionPolicy.has(principal(List.of("CONTENT"), List.of("BOARD_READ"), true, "N"), "BOARD_DELETE")).isFalse();
        assertThat(PermissionPolicy.has(principal(List.of("ROLE_SYSTEM"), List.of(), true, "N"), "AUTHRT_GRANT")).isFalse();
    }

    @Test
    void displayRoleAndGenericRoleTokenCannotMintCapabilities() {
        var legacy = CustomUserDetails.builder().esntlId("fixture").enabled(true).authorCode("ROLE_ADMIN")
                .roleName("ADMIN").authorityCodes(List.of("ROLE_SYSTEM")).build();
        var auth = new UsernamePasswordAuthenticationToken(legacy, null, legacy.getAuthorities());
        assertThat(PermissionPolicy.has(auth, "BOARD_READ")).isFalse();
        var generic = new UsernamePasswordAuthenticationToken("fixture", null,
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN"), new SimpleGrantedAuthority("BOARD_READ")));
        assertThat(PermissionPolicy.has(generic, "BOARD_READ")).isFalse();
    }

    @Test
    void inactiveLockedAnonymousAndUnauthenticatedPrincipalsAreDenied() {
        for (Authentication rejected : List.of(
                principal(List.of("ROLE_ADMIN"), List.of("BOARD_READ"), false, "N"),
                principal(List.of("ROLE_ADMIN"), List.of("BOARD_READ"), true, "Y"),
                new AnonymousAuthenticationToken("test-key", "anonymousUser", List.of(new SimpleGrantedAuthority("BOARD_READ"))),
                new UsernamePasswordAuthenticationToken("fixture", null))) {
            assertThat(PermissionPolicy.has(rejected, "BOARD_READ")).isFalse();
            assertThat(policy.allows(rejected, binding("AUTHENTICATED", null, null))).isFalse();
        }
        assertThat(PermissionPolicy.has(null, "BOARD_READ")).isFalse();
    }

    @Test
    void activeZeroGroupIdentityRetainsOnlyExplicitAuthenticatedOperations() {
        Authentication empty = principal(List.of(), List.of(), true, "N");
        assertThat(policy.allows(empty, binding("AUTHENTICATED", null, null))).isTrue();
        assertThat(policy.allows(empty, binding("PERMISSION", "BOARD_READ", null))).isFalse();
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
        Authentication auth = principal(List.of("ROLE_ADMIN"), List.of("BOARD_READ"), true, "N");
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
        Authentication reader = principal(List.of("CONTENT"), List.of("BOARD_READ"), true, "N");
        assertThat(policy.bindings()).isNotEmpty();
        var binding = policy.bindings().stream().filter(row -> "BOARD_READ".equals(row.permission())).findFirst().orElseThrow();
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
