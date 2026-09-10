package nuri.business.security.annotation;

import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class WithMockCustomUserSecurityContextFactoryTest {

    @WithMockCustomUser(role = "ADMIN") private static class AdminFixture {}
    @WithMockCustomUser(role = "SYSTEM") private static class SystemFixture {}
    @WithMockCustomUser(role = "USER") private static class UserFixture {}
    @WithMockCustomUser(role = "UNKNOWN") private static class UnknownFixture {}

    @Test
    void sourceDefaultGroupsProduceCapabilitiesWithoutRoleAuthorities() {
        var admin = principal(AdminFixture.class);
        assertThat(admin.isEnabled()).isTrue();
        assertThat(admin.getAuthorizationVersion()).isNotBlank();
        assertThat(admin.getGroups()).containsExactly("ROLE_ADMIN");
        assertThat(admin.getPermissions()).contains("AUTHRT_GRANT", "PRIVACY_READ");
        assertThat(admin.getAuthorities()).extracting("authority").doesNotContain("ROLE_ADMIN", "ROLE_USER");
        assertThat(principal(UserFixture.class).getPermissions()).contains("BOARD_READ")
                .doesNotContain("AUTHRT_GRANT", "PRIVACY_READ", "BOARD_DELETE_ALL");
    }

    @Test
    void systemExclusionAndUnknownGroupNeverAcquireAdminFallback() {
        var system = principal(SystemFixture.class);
        assertThat(system.getGroups()).containsExactly("ROLE_SYSTEM");
        assertThat(system.getPermissions()).doesNotContain("PRIVACY_READ", "PRIVACY_EXPORT");
        assertThat(principal(UnknownFixture.class).getPermissions()).isEmpty();
    }

    private static CustomUserDetails principal(Class<?> fixture) {
        return (CustomUserDetails) new WithMockCustomUserSecurityContextFactory()
                .createSecurityContext(fixture.getAnnotation(WithMockCustomUser.class))
                .getAuthentication().getPrincipal();
    }
}
