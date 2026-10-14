package nuri.migration.model;

import com.fasterxml.jackson.databind.ObjectMapper;
import nuri.migration.artifact.MappingSpecDigester;
import nuri.migration.domain.DomainViolation;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.Nullify;
import nuri.migration.model.MappingSpec.TableMapping;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** 컬럼 nullify 선언 계약(ADR-0029 L3a-1). 선언은 mapping digest 에 결속되고, 없으면 digest 가 그대로다. */
class MappingNullifyDslTest {

    private static final String VIOLATION_NAME = "nullify 의 violation 은 위반 이름(BLANK·PLACEHOLDER_DATE 등)이어야 합니다";

    @TempDir
    Path temp;

    @Test
    void loadsNullifyRulesFromYaml() throws Exception {
        Path mapping = temp.resolve("mapping.yml");
        Files.writeString(mapping, """
                tables:
                  - source: LEGACY_ITEM
                    target: tb_item
                    orderBy: ITEM_ID
                    columns:
                      - source: END_DT
                        target: end_ymd
                        transform: ymd8
                        nullify:
                          - { violation: PLACEHOLDER_DATE, maxRows: 3 }
                          - { violation: BLANK, maxRows: 1 }
                      - { source: QTY, target: qty, type: integer }
                """);

        List<ColumnMapping> columns = new MappingLoader(Map.<String, String>of()::get)
                .load(mapping).tables().getFirst().columns();

        assertThat(columns.getFirst().nullify()).containsExactly(
                new Nullify(DomainViolation.PLACEHOLDER_DATE, 3L), new Nullify(DomainViolation.BLANK, 1L));
        assertThat(columns.get(1).nullify()).isEmpty();
    }

    @Test
    void unknownViolationCodesDoNotLoad() throws Exception {
        Path mapping = temp.resolve("mapping.yml");
        Files.writeString(mapping, """
                tables:
                  - source: LEGACY_ITEM
                    target: tb_item
                    columns:
                      - { source: QTY, target: qty, type: integer, nullify: [{ violation: EMPTY, maxRows: 1 }] }
                """);

        assertThatThrownBy(() -> new MappingLoader(Map.<String, String>of()::get).load(mapping))
                .isInstanceOf(java.io.UncheckedIOException.class)
                .hasRootCauseInstanceOf(IllegalArgumentException.class)
                .rootCause().hasMessage(VIOLATION_NAME);
    }

    @ParameterizedTest(name = "violation: {0}")
    @ValueSource(strings = {"1", "0", "'1'", "blank", "Blank", "true", "[BLANK]"})
    void violationIsReadOnlyByItsExactName(String violation) throws Exception {
        assertLoadFails("{ violation: " + violation + ", maxRows: 5 }", VIOLATION_NAME);
    }

    @ParameterizedTest(name = "maxRows: {0}")
    @ValueSource(strings = {"2.7", "2.0", "'5'", "true", "1e3", "99999999999999999999"})
    void maxRowsIsReadOnlyAsAnIntegerScalar(String maxRows) throws Exception {
        assertLoadFails("{ violation: BLANK, maxRows: " + maxRows + " }", "nullify 의 maxRows 는 정수여야 합니다");
    }

    @Test
    void largeIntegerCapsAndMissingFieldsStillLoadForTheValidatorsToJudge() throws Exception {
        Path mapping = temp.resolve("mapping.yml");
        Files.writeString(mapping, mappingWith("{ violation: BLANK, maxRows: 3000000000 }")
                + "      - { source: Q2, target: q2, type: integer, nullify: [{ violation: BLANK }] }\n");

        List<ColumnMapping> columns = new MappingLoader(Map.<String, String>of()::get)
                .load(mapping).tables().getFirst().columns();

        assertThat(columns.getFirst().nullify()).containsExactly(new Nullify(DomainViolation.BLANK, 3_000_000_000L));
        assertThat(columns.get(1).nullify()).as("빠진 상한은 실행 시작·검증이 거부한다")
                .containsExactly(new Nullify(DomainViolation.BLANK, null));
    }

    private void assertLoadFails(String rule, String message) throws Exception {
        Path mapping = temp.resolve("mapping.yml");
        Files.writeString(mapping, mappingWith(rule));

        assertThatThrownBy(() -> new MappingLoader(Map.<String, String>of()::get).load(mapping))
                .as(rule)
                .isInstanceOf(java.io.UncheckedIOException.class)
                .rootCause().isInstanceOf(IllegalArgumentException.class).hasMessage(message);
    }

    private static String mappingWith(String rule) {
        return """
                tables:
                  - source: LEGACY_ITEM
                    target: tb_item
                    columns:
                      - { source: QTY, target: qty, type: integer, nullify: [%s] }
                """.formatted(rule);
    }

    @Test
    void nullifyIsBoundToTheMappingDigestAndAbsenceKeepsExistingDigests() throws Exception {
        ColumnMapping legacy = new ColumnMapping("QTY", "qty", null, "integer", null, null, null, null);
        ColumnMapping undeclared = new ColumnMapping("QTY", "qty", null, "integer", null, null, null, null, null);
        ColumnMapping declared = new ColumnMapping("QTY", "qty", null, "integer", null, null, null, null,
                List.of(new Nullify(DomainViolation.BLANK, 2L)));
        ColumnMapping widened = new ColumnMapping("QTY", "qty", null, "integer", null, null, null, null,
                List.of(new Nullify(DomainViolation.BLANK, 3L)));

        assertThat(undeclared.nullify()).isEmpty();
        assertThat(new ObjectMapper().writeValueAsString(undeclared)).doesNotContain("nullify");
        assertThat(new ObjectMapper().writeValueAsString(declared))
                .contains("\"nullify\":[{\"violation\":\"BLANK\",\"maxRows\":2}]");
        assertThat(MappingSpecDigester.sha256(spec(undeclared)))
                .isEqualTo(MappingSpecDigester.sha256(spec(legacy)))
                .isNotEqualTo(MappingSpecDigester.sha256(spec(declared)));
        assertThat(MappingSpecDigester.sha256(spec(declared)))
                .as("상한을 넓히면 다시 승인해야 한다").isNotEqualTo(MappingSpecDigester.sha256(spec(widened)));
    }

    private static MappingSpec spec(ColumnMapping column) {
        return new MappingSpec(null, null, List.of(new TableMapping(
                "LEGACY_ITEM", "tb_item", null, List.of(column), null)), Map.of());
    }
}
