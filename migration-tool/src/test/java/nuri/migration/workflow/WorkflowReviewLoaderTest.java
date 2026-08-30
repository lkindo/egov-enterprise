package nuri.migration.workflow;

import nuri.migration.plan.ObjectDisposition;
import nuri.migration.plan.DispositionDecision;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class WorkflowReviewLoaderTest {

    private final WorkflowReviewLoader loader = new WorkflowReviewLoader();

    @Test
    void loadsPartialDecisionsAndBindsAllFourDigests() {
        String inventory = "a".repeat(64);
        String target = "b".repeat(64);
        String mapping = "c".repeat(64);
        String execution = "e".repeat(64);
        WorkflowReview review = loader.load(yaml(inventory, target, mapping, execution, ""));

        review.requireBindings(inventory, target, mapping, execution);
        assertThat(review.decisions()).hasSize(1).containsKey(objectId());
        assertThat(review.decisions().get(objectId()).disposition())
                .isEqualTo(ObjectDisposition.APPROVED_IGNORE);
    }

    @Test
    void strictYamlRejectsDuplicateUnknownAndDigestMismatch() {
        String inventory = "a".repeat(64);
        String target = "b".repeat(64);
        String mapping = "c".repeat(64);
        String execution = "e".repeat(64);

        assertThatThrownBy(() -> loader.load(yaml(inventory, target, mapping, execution,
                "unknownField: true\n")))
                .isInstanceOf(RuntimeException.class);
        assertThatThrownBy(() -> loader.load(("""
                schemaVersion: 2
                schemaVersion: 2
                sourceInventoryDigest: %s
                targetSchemaDigest: %s
                mappingDigest: %s
                executionContractDigest: %s
                decisions: {}
                """).formatted(inventory, target, mapping, execution).getBytes(StandardCharsets.UTF_8)))
                .isInstanceOf(RuntimeException.class);

        WorkflowReview review = loader.load(yaml(inventory, target, mapping, execution, ""));
        assertThatThrownBy(() -> review.requireBindings(
                "d".repeat(64), target, mapping, execution))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("sourceInventoryDigest");
        assertThatThrownBy(() -> review.requireBindings(
                inventory, target, mapping, "f".repeat(64)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("executionContractDigest");

        byte[] oldSchema = new String(yaml(
                inventory, target, mapping, execution, ""), StandardCharsets.UTF_8)
                .replace("schemaVersion: 2", "schemaVersion: 1")
                .getBytes(StandardCharsets.UTF_8);
        assertThatThrownBy(() -> loader.load(oldSchema))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void reviewRecordRejectsMalformedDigestsStableIdsAndNullDecisionsAndSortsImmutableOutput() {
        String a = "a".repeat(64);
        String b = "b".repeat(64);
        String c = "c".repeat(64);
        String e = "e".repeat(64);
        DispositionDecision decision = new DispositionDecision(
                ObjectDisposition.APPROVED_IGNORE, null, true, "reviewed");
        String first = "urn:migration-object:sha256:" + "1".repeat(64);
        String second = "urn:migration-object:sha256:" + "2".repeat(64);
        LinkedHashMap<String, DispositionDecision> reverse = new LinkedHashMap<>();
        reverse.put(second, decision);
        reverse.put(first, decision);

        WorkflowReview valid = new WorkflowReview(2, a, b, c, e, reverse);

        assertThat(valid.decisions().keySet()).containsExactly(first, second);
        assertThatThrownBy(() -> valid.decisions().put(objectId(), decision))
                .isInstanceOf(UnsupportedOperationException.class);
        assertThatThrownBy(() -> new WorkflowReview(1, a, b, c, e, Map.of()))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("version");
        for (String malformed : new String[] {null, "", "A".repeat(64), "a".repeat(63)}) {
            assertThatThrownBy(() -> new WorkflowReview(2, malformed, b, c, e, Map.of()))
                    .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("sourceInventoryDigest");
        }
        assertThatThrownBy(() -> new WorkflowReview(2, a, b, c, e, null))
                .isInstanceOf(NullPointerException.class);
        Map<String, DispositionDecision> badId = new LinkedHashMap<>();
        badId.put("TABLE|legacy|app|orders", decision);
        assertThatThrownBy(() -> new WorkflowReview(2, a, b, c, e, badId))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("stableId");
        Map<String, DispositionDecision> nullId = new LinkedHashMap<>();
        nullId.put(null, decision);
        assertThatThrownBy(() -> new WorkflowReview(2, a, b, c, e, nullId))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("stableId");
        Map<String, DispositionDecision> nullDecision = new LinkedHashMap<>();
        nullDecision.put(objectId(), null);
        assertThatThrownBy(() -> new WorkflowReview(2, a, b, c, e, nullDecision))
                .isInstanceOf(NullPointerException.class);

        assertThatThrownBy(() -> valid.requireBindings(a, "f".repeat(64), c, e))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("targetSchemaDigest");
        assertThatThrownBy(() -> valid.requireBindings(a, b, "f".repeat(64), e))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("mappingDigest");
    }

    private static byte[] yaml(
            String inventory,
            String target,
            String mapping,
            String execution,
            String extra
    ) {
        return ("""
                schemaVersion: 2
                sourceInventoryDigest: %s
                targetSchemaDigest: %s
                mappingDigest: %s
                executionContractDigest: %s
                decisions:
                  "%s":
                    disposition: APPROVED_IGNORE
                    reviewed: true
                    rationale: approved legacy log exclusion
                %s""").formatted(inventory, target, mapping, execution, objectId(), extra)
                .getBytes(StandardCharsets.UTF_8);
    }

    private static String objectId() {
        return "urn:migration-object:sha256:" + "d".repeat(64);
    }
}
