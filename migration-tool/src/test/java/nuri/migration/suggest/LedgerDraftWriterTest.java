package nuri.migration.suggest;

import nuri.migration.suggest.SuggestionReport.Candidate;
import nuri.migration.suggest.SuggestionReport.ColumnSuggestion;
import nuri.migration.suggest.SuggestionReport.ConformanceEstimate;
import nuri.migration.validate.ledger.TermLedger;
import nuri.migration.validate.ledger.TermLedgerLoader;
import nuri.migration.validate.ledger.TermLedgerValidator;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** 후보에서 만든 원장 초안은 PROPOSED 뿐이고, 원장 로더·검증기를 그대로 지난다(ADR-0029 L2b-2). */
class LedgerDraftWriterTest {

    private final LedgerDraftWriter writer = new LedgerDraftWriter();

    @Test
    void everyColumnBecomesAProposedRowWithoutATarget() {
        SuggestionReport report = report(List.of(
                new ColumnSuggestion("LEGACY_USER", "REGDT", "DATE8", "EXACT", List.of(candidate("100.0")),
                        List.of()),
                new ColumnSuggestion("LEGACY_USER", "X1", "TEXT", "UNKNOWN", List.of(), List.of()),
                new ColumnSuggestion("사용자", "이름", "TEXT", "INFERRED", List.of(candidate(null)),
                        List.of("SOURCES_DISAGREE"))));

        TermLedger draft = writer.draft(report);

        assertThat(draft.schemaVersion()).isEqualTo(TermLedger.CURRENT_SCHEMA_VERSION);
        assertThat(draft.entries()).extracting(TermLedger.Entry::id)
                .containsExactly("LEGACY_USER.REGDT", "LEGACY_USER.X1", "L00003");
        assertThat(draft.entries()).allSatisfy(entry -> {
            assertThat(entry.status()).isEqualTo("PROPOSED");
            assertThat(entry.target()).isNull();
            assertThat(entry.history()).isEmpty();
        });
        TermLedger.Entry first = draft.entries().getFirst();
        assertThat(first.term()).isEqualTo(new TermLedger.StandardTerm("등록일자", "REG_YMD", "연월일C8"));
        assertThat(first.grade()).isEqualTo("EXACT");
        assertThat(first.conformance()).isEqualTo(new TermLedger.Conformance(new BigDecimal("100.0"), "ymd8", null));
        assertThat(draft.entries().get(1).term()).isNull();
        assertThat(draft.entries().get(1).grade()).isEqualTo("UNKNOWN");
        assertThat(draft.entries().get(2).conformance()).isNull();
        assertThat(draft.entries().get(2).source()).isEqualTo(new TermLedger.ColumnRef("사용자", "이름"));
    }

    @Test
    void theWrittenDraftLoadsAndValidatesAsALedger() {
        SuggestionReport report = report(List.of(
                new ColumnSuggestion("LEGACY_USER", "REGDT", "DATE8", "EXACT", List.of(candidate("100.0")),
                        List.of()),
                new ColumnSuggestion("LEGACY_USER", "X1", "TEXT", "UNKNOWN", List.of(), List.of())));

        String yaml = writer.write(writer.draft(report));

        assertThat(yaml).doesNotContain("target").doesNotContain("null").startsWith("schemaVersion: 1");
        TermLedger loaded = new TermLedgerLoader().load(yaml);
        assertThat(loaded).isEqualTo(writer.draft(report));
        assertThat(new TermLedgerValidator().validate(loaded)).isEmpty();
    }

    @Test
    void aDraftCarryingAPersonalLookingValueIsNotWritten() {
        SuggestionReport report = report(List.of(new ColumnSuggestion("LEGACY_USER", "hong@example.com", "TEXT",
                "UNKNOWN", List.of(), List.of())));

        assertThatThrownBy(() -> writer.write(writer.draft(report))).isInstanceOf(IllegalArgumentException.class);

        SuggestionReport credential = report(List.of(new ColumnSuggestion("LEGACY_USER", "password=legacy1",
                "TEXT", "UNKNOWN", List.of(), List.of())));
        assertThatThrownBy(() -> writer.write(writer.draft(credential))).isInstanceOf(IllegalArgumentException.class);
    }

    private static Candidate candidate(String rate) {
        return new Candidate("등록일자", "REG_YMD", "연월일C8", "EXACT", List.of("COMMENT_TERM_NAME"),
                new ConformanceEstimate(rate == null ? null : new BigDecimal(rate), List.of(), "ymd8"));
    }

    private static SuggestionReport report(List<ColumnSuggestion> columns) {
        return new SuggestionReport(SuggestionReport.CURRENT_VERSION, "a".repeat(64), "b".repeat(64), null,
                Map.of(), columns, List.of());
    }
}
