package nuri.migration.model;

import nuri.migration.identity.IdentityValueType;
import nuri.migration.identity.TargetIdentityPolicy;
import nuri.migration.model.MappingSpec.CompositeForeignKey;
import nuri.migration.model.MappingSpec.IdentityStrategy;
import nuri.migration.model.MappingSpec.TableMapping;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class MappingIdentityDslTest {

    @TempDir
    Path temp;

    @Test
    void loadsOrderedTypedIdentityAndExplicitCompositeForeignKey() throws Exception {
        Path mapping = temp.resolve("mapping.yml");
        Files.writeString(mapping, """
                source:
                  url: jdbc:h2:mem:source
                  username: sa
                  password: ${SRC_PASSWORD}
                  driver: org.h2.Driver
                target:
                  url: jdbc:postgresql://localhost/db
                  username: app
                  password: ${TGT_PASSWORD}
                  driver: org.postgresql.Driver
                run: { runId: typed-run, sourceNamespace: legacy-crm }
                tables:
                  - source: LEGACY_ORDER
                    target: tb_order
                    orderByKeys: [TENANT_ID, ORDER_NO]
                    identity:
                      policy: target_generated
                      sourceComponents:
                        - { column: TENANT_ID, type: text }
                        - { column: ORDER_NO, type: signed_integer }
                      targetComponents:
                        - { column: tenant_id, type: text }
                        - { column: order_id, type: signed_integer }
                    foreignKeys:
                      - parentSource: LEGACY_CUSTOMER
                        sourceComponents:
                          - { column: TENANT_ID, type: text }
                          - { column: CUSTOMER_NO, type: signed_integer }
                        targetComponents:
                          - { column: tenant_id, type: text }
                          - { column: customer_id, type: signed_integer }
                    columns:
                      - { source: TENANT_ID, target: tenant_id }
                """);

        MappingSpec spec = new MappingLoader(Map.of(
                "SRC_PASSWORD", "source-secret", "TGT_PASSWORD", "target-secret")::get).load(mapping);

        TableMapping table = spec.tables().getFirst();
        IdentityStrategy identity = table.identity();
        assertThat(identity.policy()).isEqualTo(TargetIdentityPolicy.TARGET_GENERATED);
        assertThat(identity.sourceComponents()).extracting(MappingSpec.IdentityComponentSpec::column)
                .containsExactly("TENANT_ID", "ORDER_NO");
        assertThat(identity.sourceComponents()).extracting(MappingSpec.IdentityComponentSpec::type)
                .containsExactly(IdentityValueType.TEXT, IdentityValueType.SIGNED_INTEGER);
        assertThat(identity.targetComponents()).extracting(MappingSpec.IdentityComponentSpec::column)
                .containsExactly("tenant_id", "order_id");

        CompositeForeignKey foreignKey = table.foreignKeys().getFirst();
        assertThat(foreignKey.parentSource()).isEqualTo("LEGACY_CUSTOMER");
        assertThat(foreignKey.targetComponents()).extracting(MappingSpec.IdentityComponentSpec::column)
                .containsExactly("tenant_id", "customer_id");
    }

    @Test
    void legacyConstructorsKeepIdentityDslAbsent() {
        TableMapping legacy = new TableMapping(
                "LEGACY_USER", "tb_user", null, "USER_ID", "user_id",
                java.util.List.of(), new MappingSpec.IdStrategy("user_id", "USR", "USER_ID"));

        assertThat(legacy.idStrategy()).isNotNull();
        assertThat(legacy.identity()).isNull();
        assertThat(legacy.foreignKeys()).isEmpty();
    }
}
