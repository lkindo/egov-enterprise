package nuri.business.security.authorization;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.spy;
import static nuri.business.security.authorization.PermissionPolicyTest.principal;

class OperationAuthorizationManagerTest {

    @Test
    void sameUrlUsesExactHttpMethodPermissions() {
        var manager = manager(List.of(
                binding("GET", "/api/v1/probe", "BOARD_READ"),
                binding("POST", "/api/v1/probe", "BOARD_CREATE"),
                binding("PUT", "/api/v1/probe", "BOARD_UPDATE"),
                binding("DELETE", "/api/v1/probe", "BOARD_DELETE")));
        Authentication reader = principal(List.of("CONTENT"), List.of("BOARD_READ"), true, "N");
        assertThat(granted(manager, reader, "GET", "/api/v1/probe")).isTrue();
        for (String method : List.of("POST", "PUT", "DELETE", "PATCH", "OPTIONS")) {
            assertThat(granted(manager, reader, method, "/api/v1/probe")).as(method).isFalse();
        }
        assertThat(granted(manager, principal(List.of("CONTENT"), List.of("BOARD_DELETE"), true, "N"),
                "DELETE", "/api/v1/probe")).isTrue();
    }

    @Test
    void unknownPathAndEmptyManifestReturnExplicitDenial() {
        Authentication admin = principal(List.of("ROLE_ADMIN"), PermissionCodes.ALL.stream().toList(), true, "N");
        var manager = manager(List.of(binding("GET", "/api/v1/known", "BOARD_READ")));
        assertThat(granted(manager, admin, "GET", "/api/v1/unknown")).isFalse();
        assertThat(granted(manager(List.of()), admin, "GET", "/api/v1/known")).isFalse();
    }

    @Test
    void literalPathTakesPrecedenceOverVariableAndNeverUnionsPermissions() {
        var manager = manager(List.of(
                binding("GET", "/api/v1/probe/{id}", "BOARD_READ"),
                binding("GET", "/api/v1/probe/export", "FILE_READ_ALL")));
        Authentication reader = principal(List.of("CONTENT"), List.of("BOARD_READ"), true, "N");
        assertThat(granted(manager, reader, "GET", "/api/v1/probe/42")).isTrue();
        assertThat(granted(manager, reader, "GET", "/api/v1/probe/export")).isFalse();
        Authentication exporter = principal(List.of("CONTENT"), List.of("FILE_READ_ALL"), true, "N");
        assertThat(granted(manager, exporter, "GET", "/api/v1/probe/export")).isTrue();
        assertThat(granted(manager, exporter, "GET", "/api/v1/probe/42")).isFalse();
    }

    @Test
    void headUsesGetPermissionAndApplicationContextPathIsRemoved() {
        var manager = manager(List.of(binding("GET", "/api/v1/probe", "BOARD_READ")));
        Authentication reader = principal(List.of(), List.of("BOARD_READ"), true, "N");
        MockHttpServletRequest request = new MockHttpServletRequest("HEAD", "/tenant/api/v1/probe");
        request.setContextPath("/tenant");
        var decision = manager.check(() -> reader, new RequestAuthorizationContext(request));
        assertThat(decision).isNotNull();
        assertThat(decision.isGranted()).isTrue();
        assertThat(granted(manager, principal(List.of(), List.of(), true, "N"), "HEAD", "/api/v1/probe")).isFalse();
    }

    @Test
    void anonymousAndGroupNameAloneCannotAccessOperation() {
        var manager = manager(List.of(binding("GET", "/api/v1/probe", "BOARD_READ")));
        assertThat(granted(manager, null, "GET", "/api/v1/probe")).isFalse();
        assertThat(granted(manager, principal(List.of("ROLE_ADMIN"), List.of(), true, "N"), "GET", "/api/v1/probe")).isFalse();
        assertThat(granted(manager, principal(List.of("ROLE_ADMIN"), List.of("BOARD_READ"), false, "N"), "GET", "/api/v1/probe")).isFalse();
    }

    @Test
    void privacyExclusionAndZeroGroupAuthOnlyAreEnforcedAtHttpBoundary() {
        var manager = manager(List.of(
                new PermissionPolicy.Binding("GET", "/privacy", "fixture#privacy", "PERMISSION", "PRIVACY_READ", List.of("ROLE_SYSTEM")),
                new PermissionPolicy.Binding("GET", "/self", "fixture#self", "AUTHENTICATED", null, null),
                new PermissionPolicy.Binding("POST", "/login", "fixture#login", "PUBLIC", null, null)));
        assertThat(granted(manager, principal(List.of("ROLE_SYSTEM", "PRIVACY"), List.of("PRIVACY_READ"), true, "N"), "GET", "/privacy")).isFalse();
        assertThat(granted(manager, principal(List.of(), List.of(), true, "N"), "GET", "/self")).isTrue();
        assertThat(granted(manager, null, "GET", "/self")).isFalse();
        assertThat(granted(manager, null, "POST", "/login")).isTrue();
        assertThat(granted(manager, null, "GET", "/login")).isFalse();
    }

    private static OperationAuthorizationManager manager(List<PermissionPolicy.Binding> bindings) {
        PermissionPolicy policy = spy(new PermissionPolicy());
        doReturn(bindings).when(policy).bindings();
        return new OperationAuthorizationManager(policy);
    }

    private static PermissionPolicy.Binding binding(String method, String path, String permission) {
        return new PermissionPolicy.Binding(method, path, "fixture#method", "PERMISSION", permission, null);
    }

    private static boolean granted(OperationAuthorizationManager manager, Authentication auth, String method, String path) {
        var decision = manager.check(() -> auth, new RequestAuthorizationContext(new MockHttpServletRequest(method, path)));
        assertThat(decision).isNotNull();
        return decision.isGranted();
    }
}
