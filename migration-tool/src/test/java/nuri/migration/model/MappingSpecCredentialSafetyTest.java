package nuri.migration.model;

import nuri.migration.model.MappingSpec.DbConfig;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class MappingSpecCredentialSafetyTest {

    @Test
    void dbConfigAndContainingSpecToStringAreAlwaysRedacted() {
        DbConfig config = new DbConfig(
                "jdbc:postgresql://sentinel-host/sentinel-db",
                "sentinel-user",
                "sentinel-password",
                "org.postgresql.Driver",
                "sentinel-endpoint-id");
        MappingSpec spec = new MappingSpec(config, config, List.of(), Map.of());

        assertThat(config.toString())
                .doesNotContain(
                        "sentinel-host", "sentinel-db", "sentinel-user", "sentinel-password",
                        "sentinel-endpoint-id")
                .contains("redacted");
        assertThat(spec.toString())
                .doesNotContain(
                        "sentinel-host", "sentinel-db", "sentinel-user", "sentinel-password",
                        "sentinel-endpoint-id");
    }
}
