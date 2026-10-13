package nuri.migration.model;

import com.fasterxml.jackson.databind.ObjectMapper;
import nuri.migration.artifact.MappingSpecDigester;
import nuri.migration.identity.IdentityValueType;
import nuri.migration.identity.TargetIdentityPolicy;
import nuri.migration.model.MappingSpec.IdentityComponentSpec;
import nuri.migration.model.MappingSpec.IdentityStrategy;
import nuri.migration.model.MappingSpec.TableMapping;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** identity.targetSequences 선언 계약(DEC-OPS-306). */
class MappingTargetSequenceDslTest {

    @TempDir
    Path temp;

    @Test
    void loadsDeclaredSequencesFromYaml() throws Exception {
        Path mapping = temp.resolve("mapping.yml");
        Files.writeString(mapping, """
                tables:
                  - source: LEGACY_COMMENT
                    target: tb_cmt
                    orderByKeys: [ANSWER_NO]
                    identity:
                      policy: preserve
                      sourceComponents:
                        - { column: ANSWER_NO, type: signed_integer }
                        - { column: BOARD_ID, type: text }
                      targetComponents:
                        - { column: answer_no, type: signed_integer }
                        - { column: bbs_id, type: text }
                      targetSequences:
                        answer_no: public.sq_answer_no
                        bbs_id: none
                """);

        IdentityStrategy identity = new MappingLoader(Map.<String, String>of()::get)
                .load(mapping).tables().getFirst().identity();

        assertThat(identity.targetSequences())
                .containsEntry("answer_no", "public.sq_answer_no")
                .containsEntry("bbs_id", IdentityStrategy.NO_SEQUENCE);
        assertThat(identity.declaredSequence("ANSWER_NO")).isEqualTo("public.sq_answer_no");
        assertThat(identity.declaredSequence("payload")).isNull();
    }

    @Test
    void absentDeclarationsAreNotSerializedSoExistingDigestsStayStable() throws Exception {
        IdentityStrategy undeclared = preserve(Map.of());
        IdentityStrategy declared = preserve(Map.of("id", "sq_item"));

        assertThat(new ObjectMapper().writeValueAsString(undeclared)).doesNotContain("targetSequences");
        assertThat(new ObjectMapper().writeValueAsString(declared)).contains("\"targetSequences\":{\"id\":\"sq_item\"}");
        assertThat(MappingSpecDigester.sha256(spec(undeclared)))
                .isEqualTo(MappingSpecDigester.sha256(spec(new IdentityStrategy(
                        TargetIdentityPolicy.PRESERVE, List.of(integer("ID")), List.of(integer("id"))))))
                .isNotEqualTo(MappingSpecDigester.sha256(spec(declared)));
    }

    @Test
    void declarationsAreOnlyForPreserveIntegerKeys() {
        assertThatThrownBy(() -> new IdentityStrategy(TargetIdentityPolicy.REMAP,
                List.of(integer("ID")), List.of(integer("id")), Map.of("id", "none")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("identity targetSequences는 preserve 정책에서만 선언할 수 있습니다");
        assertThatThrownBy(() -> preserve(Map.of("other", "none")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("identity targetSequences 키는 targetComponents 컬럼이어야 합니다: other");
        assertThatThrownBy(() -> preserve(Map.of("id", "sq_item; DROP TABLE x")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("identity targetSequences 값은 시퀀스 이름 또는 none 이어야 합니다: id");
        assertThatThrownBy(() -> new IdentityStrategy(TargetIdentityPolicy.PRESERVE,
                List.of(new IdentityComponentSpec("CODE", IdentityValueType.TEXT)),
                List.of(new IdentityComponentSpec("code", IdentityValueType.TEXT)), Map.of("code", "sq_code")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("identity targetSequences 시퀀스는 정수 키 컬럼에만 선언할 수 있습니다: code");
        Map<String, String> nullValue = new HashMap<>();
        nullValue.put("id", null);
        assertThatThrownBy(() -> preserve(nullValue))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("identity targetSequences 키와 값은 비어 있을 수 없습니다");

        assertThat(new IdentityStrategy(TargetIdentityPolicy.PRESERVE,
                List.of(new IdentityComponentSpec("CODE", IdentityValueType.TEXT)),
                List.of(new IdentityComponentSpec("code", IdentityValueType.TEXT)), Map.of("CODE", "none"))
                .declaredSequence("code")).isEqualTo("none");
        for (IdentityValueType type : List.of(IdentityValueType.SIGNED_INTEGER,
                IdentityValueType.UNSIGNED_INTEGER, IdentityValueType.DECIMAL)) {
            assertThat(new IdentityStrategy(TargetIdentityPolicy.PRESERVE,
                    List.of(new IdentityComponentSpec("ID", type)), List.of(new IdentityComponentSpec("id", type)),
                    Map.of("id", "public.sq_item")).targetSequences()).containsEntry("id", "public.sq_item");
        }
        assertThat(new IdentityStrategy(TargetIdentityPolicy.REMAP,
                List.of(integer("ID")), List.of(integer("id")), null).targetSequences()).isEmpty();
    }

    private static IdentityStrategy preserve(Map<String, String> sequences) {
        return new IdentityStrategy(TargetIdentityPolicy.PRESERVE,
                List.of(integer("ID")), List.of(integer("id")), sequences);
    }

    private static MappingSpec spec(IdentityStrategy identity) {
        return new MappingSpec(null, null, List.of(new TableMapping(
                "LEGACY_ITEM", "tb_item", null, null, List.of("ID"), null, List.of(), null,
                identity, List.of())), Map.of());
    }

    private static IdentityComponentSpec integer(String column) {
        return new IdentityComponentSpec(column, IdentityValueType.SIGNED_INTEGER);
    }
}
