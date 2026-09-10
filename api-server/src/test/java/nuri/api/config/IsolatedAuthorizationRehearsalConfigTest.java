package nuri.api.config;

import java.util.Set;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class IsolatedAuthorizationRehearsalConfigTest {
    @Test
    void permitsOnlyAcknowledgedNamedLocalDisposableTargets() {
        assertThat(IsolatedAuthorizationRehearsalConfig.validateTarget(Set.of("e2e"),
                "jdbc:postgresql://127.0.0.1:55432/authz_e2e_readiness?currentSchema=public&connectTimeout=3",
                IsolatedAuthorizationRehearsalConfig.ACK))
                .isEqualTo(new IsolatedAuthorizationRehearsalConfig.Target("127.0.0.1",55432,"authz_e2e_readiness"));
        assertThat(IsolatedAuthorizationRehearsalConfig.validateTarget(Set.of("e2e"),
                "jdbc:postgresql://db/authz_e2e",IsolatedAuthorizationRehearsalConfig.ACK).port()).isEqualTo(5432);
    }

    @Test
    void rejectsProductionProfileEvenTogetherWithE2eAndRejectsMissingAcknowledgement() {
        for (Set<String> profiles:java.util.List.of(Set.of("prod"),Set.of("e2e","prod"),Set.of("local"),Set.<String>of())) {
            assertThatThrownBy(() -> IsolatedAuthorizationRehearsalConfig.validateTarget(profiles,
                    "jdbc:postgresql://db/authz_e2e",IsolatedAuthorizationRehearsalConfig.ACK)).isInstanceOf(IllegalStateException.class);
        }
        assertThatThrownBy(() -> IsolatedAuthorizationRehearsalConfig.validateTarget(Set.of("e2e"),
                "jdbc:postgresql://db/authz_e2e","")).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void rejectsRemoteOrUnscopedDatabaseAndConnectionOptionBypasses() {
        for (String url:java.util.List.of(
                "jdbc:postgresql://oci.example.invalid/authz_e2e","jdbc:postgresql://localhost/egovdb",
                "jdbc:postgresql://user@localhost/authz_e2e","jdbc:postgresql://localhost/authz_e2e/other",
                "jdbc:postgresql://localhost/authz_e2e?currentSchema=private",
                "jdbc:postgresql://localhost/authz_e2e?options=-c%20search_path=private",
                "jdbc:postgresql://localhost/authz_e2e?host=oci.example.invalid",
                "jdbc:postgresql://localhost/authz_e2e?currentSchema=public&currentSchema=private",
                "jdbc:h2:mem:authz_e2e")) {
            assertThatThrownBy(() -> IsolatedAuthorizationRehearsalConfig.validateTarget(Set.of("e2e"),url,
                    IsolatedAuthorizationRehearsalConfig.ACK)).as(url).isInstanceOf(IllegalStateException.class);
        }
    }
}
