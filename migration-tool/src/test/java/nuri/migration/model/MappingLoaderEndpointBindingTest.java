package nuri.migration.model;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MappingLoaderEndpointBindingTest {

    @Test
    void preservesLiteralAndResolvedEndpointIds() {
        MappingLoader loader = new MappingLoader(Map.of(
                "SOURCE_PASSWORD", "test-source-password",
                "TARGET_PASSWORD", "test-target-password",
                "SOURCE_ENDPOINT_ID", "approved-source-endpoint"
        )::get);

        MappingSpec mapping = loader.loadContent("""
                source:
                  url: jdbc:postgresql://source.example.test/legacy
                  username: migration_reader
                  password: ${SOURCE_PASSWORD}
                  driver: org.postgresql.Driver
                  endpointId: ${SOURCE_ENDPOINT_ID}
                target:
                  url: jdbc:postgresql://target.example.test/standard
                  username: migration_writer
                  password: ${TARGET_PASSWORD}
                  driver: org.postgresql.Driver
                  endpointId: approved-target-endpoint
                tables: []
                """);

        assertThat(mapping.source().endpointId()).isEqualTo("approved-source-endpoint");
        assertThat(mapping.target().endpointId()).isEqualTo("approved-target-endpoint");
    }

    @Test
    void rejectsEmbeddedEndpointIdEnvironmentPlaceholder() {
        MappingLoader loader = new MappingLoader(Map.of(
                "SOURCE_PASSWORD", "test-source-password",
                "SOURCE_ENDPOINT_ID", "approved-source-endpoint"
        )::get);

        assertThatThrownBy(() -> loader.loadContent("""
                source:
                  url: jdbc:postgresql://source.example.test/legacy
                  username: migration_reader
                  password: ${SOURCE_PASSWORD}
                  driver: org.postgresql.Driver
                  endpointId: source-${SOURCE_ENDPOINT_ID}
                tables: []
                """))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("전체 값 형식");
    }
}
