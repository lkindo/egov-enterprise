package nuri.migration.identity;

import nuri.migration.type.LogicalType;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TargetIdentityTest {

    private static final LogicalType.IntegerType BIGINT =
            new LogicalType.IntegerType(64, LogicalType.Signedness.SIGNED);
    private static final LogicalType.TextType TEXT =
            new LogicalType.TextType(100, "UTF-8", "ko_KR");

    @Test
    void preserveSupportsAnOrderedCompositeIdentity() {
        TargetIdentity identity = new TargetIdentity(
                TargetIdentityPolicy.PRESERVE,
                List.of(new IdentityComponent("legacy_tenant", TEXT),
                        new IdentityComponent("legacy_no", BIGINT)),
                List.of(new IdentityComponent("tenant_id", TEXT),
                        new IdentityComponent("item_no", BIGINT)));

        assertThat(identity.compositeTarget()).isTrue();
        assertThat(identity.targetComponents()).extracting(IdentityComponent::column)
                .containsExactly("tenant_id", "item_no");
    }

    @Test
    void remapMayTranslateACompositeSourceToASingleTargetKey() {
        TargetIdentity identity = new TargetIdentity(
                TargetIdentityPolicy.REMAP,
                List.of(new IdentityComponent("legacy_tenant", TEXT),
                        new IdentityComponent("legacy_no", BIGINT)),
                List.of(new IdentityComponent("id", BIGINT)));

        assertThat(identity.compositeSource()).isTrue();
        assertThat(identity.compositeTarget()).isFalse();
    }

    @Test
    void targetGeneratedStillRequiresASourceIdentityForDurableKeyMapping() {
        assertThatThrownBy(() -> new TargetIdentity(
                TargetIdentityPolicy.TARGET_GENERATED,
                List.of(),
                List.of(new IdentityComponent("id", BIGINT))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("source");
    }

    @Test
    void preserveRequiresSameArityAndDuplicateColumnsAreRejected() {
        assertThatThrownBy(() -> new TargetIdentity(
                TargetIdentityPolicy.PRESERVE,
                List.of(new IdentityComponent("legacy_tenant", TEXT),
                        new IdentityComponent("legacy_no", BIGINT)),
                List.of(new IdentityComponent("id", BIGINT))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("arity");

        assertThatThrownBy(() -> new TargetIdentity(
                TargetIdentityPolicy.REMAP,
                List.of(new IdentityComponent("legacy_id", TEXT)),
                List.of(new IdentityComponent("id", BIGINT), new IdentityComponent("id", BIGINT))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("duplicate");
    }
}
