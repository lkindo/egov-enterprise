package nuri.migration.suggest;

import nuri.migration.suggest.SuggestionReport.Candidate;
import nuri.migration.suggest.SuggestionReport.ColumnSuggestion;
import nuri.migration.suggest.SuggestionReport.ConformanceEstimate;
import nuri.migration.suggest.SuggestionReport.Violation;
import nuri.migration.validate.ledger.TermLedger;
import nuri.migration.validate.ledger.TermLedgerLoader;
import nuri.migration.validate.ledger.TermLedgerValidator;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** 후보에서 만든 원장 초안(형식 2)은 PROPOSED 뿐이고, 원장 로더·검증기를 그대로 지난다(ADR-0029 L2b-2·L3a-2). */
class LedgerDraftWriterTest {

    private final LedgerDraftWriter writer = new LedgerDraftWriter();

    @Test
    void everyColumnBecomesAProposedRowWithoutATarget() {
        SuggestionReport report = report(List.of(
                column("PUBLIC.LEGACY_USER", "REGDT", "EXACT", List.of(candidate("100.0"))),
                column("PUBLIC.LEGACY_USER", "X1", "UNKNOWN", List.of()),
                column("PUBLIC.사용자", "이름", "INFERRED", List.of(candidate(null)))));

        TermLedger draft = writer.draft(report);

        assertThat(draft.schemaVersion()).isEqualTo(TermLedger.CURRENT_SCHEMA_VERSION).isEqualTo(2);
        assertThat(draft.entries()).extracting(TermLedger.Entry::id)
                .containsExactly("PUBLIC.LEGACY_USER.REGDT", "PUBLIC.LEGACY_USER.X1", "L00003");
        assertThat(draft.entries()).allSatisfy(entry -> {
            assertThat(entry.status()).isEqualTo("PROPOSED");
            assertThat(entry.target()).isNull();
            assertThat(entry.mapping()).isNull();
            assertThat(entry.via()).isNull();
            assertThat(entry.nonStandardTarget()).isNull();
            assertThat(entry.history()).isEmpty();
        });
        TermLedger.Entry first = draft.entries().getFirst();
        assertThat(first.term()).isEqualTo(new TermLedger.StandardTerm("등록일자", "REG_YMD", "연월일C8"));
        assertThat(first.grade()).isEqualTo("EXACT");
        assertThat(first.conformance()).isEqualTo(new TermLedger.Conformance(new BigDecimal("100.0"), List.of(),
                "transform:ymd8", List.of(), null));
        assertThat(first.load()).as("힌트가 내장 변환기 하나로 정해지면 미리 채운다")
                .isEqualTo(new TermLedger.Load("ymd8", null, null, List.of()));
        assertThat(draft.entries().get(1).term()).isNull();
        assertThat(draft.entries().get(1).grade()).isEqualTo("UNKNOWN");
        assertThat(draft.entries().get(1).conformance()).isNull();
        assertThat(draft.entries().get(1).load()).isNull();
        assertThat(draft.entries().get(2).source()).isEqualTo(new TermLedger.ColumnRef("PUBLIC.사용자", "이름"));
    }

    @Test
    void anUncountedRateKeepsTheHintTheCountedViolationsAndTheUnmeasuredReasons() {
        ConformanceEstimate estimate = new ConformanceEstimate(null, List.of(new Violation("PLACEHOLDER_DATE", 12L),
                new Violation("INVALID_DATE", 3L), new Violation("UNSUPPORTED_VALUE_TYPE", 2L),
                new Violation("ALLOWED_VALUES_UNVERIFIED", null), new Violation("SAMPLED", null)), "transform:ymd8");

        TermLedger.Conformance conformance = LedgerDraftWriter.conformance(estimate);

        assertThat(conformance).as("적합률을 셀 수 없었어도 힌트·위반·이유를 남긴다").isNotNull();
        assertThat(conformance.rate()).isNull();
        assertThat(conformance.transform()).isEqualTo("transform:ymd8");
        assertThat(conformance.unmeasured())
                .containsExactly("UNSUPPORTED_VALUE_TYPE", "ALLOWED_VALUES_UNVERIFIED", "SAMPLED");
        assertThat(conformance.violations()).containsExactly(new TermLedger.ViolationCount("PLACEHOLDER_DATE", 12L),
                new TermLedger.ViolationCount("INVALID_DATE", 3L));
        assertThat(conformance.approvedExceptions()).isNull();

        assertThat(LedgerDraftWriter.conformance(new ConformanceEstimate(null, List.of(), null))).isNull();
        assertThat(LedgerDraftWriter.conformance(new ConformanceEstimate(null, List.of(), "codemap")))
                .isEqualTo(new TermLedger.Conformance(null, List.of(), "codemap", List.of(), null));
    }

    @Test
    void theLoadIsPrefilledOnlyForASingleBuiltinTransformer() {
        assertThat(load("transform:ymd8")).isEqualTo(new TermLedger.Load("ymd8", null, null, List.of()));
        assertThat(load("transform:timestamp-from-date"))
                .isEqualTo(new TermLedger.Load("timestamp-from-date", null, null, List.of()));
        assertThat(load("type:numeric")).isNull();
        assertThat(load("codemap")).isNull();
        assertThat(load("mixed")).isNull();
        assertThat(load(null)).isNull();
        assertThat(load("transform:no-such")).isNull();
    }

    @Test
    void theWrittenDraftLoadsAndValidatesAsALedger() {
        SuggestionReport report = report(List.of(
                column("PUBLIC.LEGACY_USER", "REGDT", "EXACT", List.of(candidate("100.0"))),
                column("PUBLIC.LEGACY_USER", "X1", "UNKNOWN", List.of()),
                column("PUBLIC.LEGACY_USER", "END_YMD", "EXACT", List.of(new Candidate("종료일자", "END_YMD",
                        "연월일C8", "EXACT", List.of("NAME_ENG_ABBR"), new ConformanceEstimate(null,
                        List.of(new Violation("PLACEHOLDER_DATE", 2L), new Violation("LENGTH_EXCEEDED", null)),
                        "transform:ymd8"))))));

        String yaml = writer.write(writer.draft(report));

        assertThat(yaml).doesNotContain("target").doesNotContain("null").doesNotContain("unmeasured: []")
                .doesNotContain("violations: []").startsWith("schemaVersion: 2");
        TermLedger loaded = new TermLedgerLoader().load(yaml);
        assertThat(loaded).isEqualTo(writer.draft(report));
        assertThat(loaded.entries().get(2).conformance()).as("적합률을 셀 수 없었던 이유도 초안에 남는다").isNotNull()
                .extracting(TermLedger.Conformance::unmeasured).isEqualTo(List.of("LENGTH_EXCEEDED"));
        assertThat(new TermLedgerValidator().validate(loaded)).isEmpty();
    }

    @Test
    void quotedIdentifierTablesStayOutOfTheDraftAndCaseOnlyCollisionsStopIt() {
        SuggestionReport skipped = report(List.of(
                new ColumnSuggestion("PUBLIC.Emp", "Name", "SKIPPED_IDENTIFIER", "EMPTY", "UNKNOWN", List.of(),
                        List.of()),
                column("PUBLIC.EMP", "NAME", "UNKNOWN", List.of())));
        assertThat(writer.draft(skipped).entries()).extracting(TermLedger.Entry::id)
                .containsExactly("PUBLIC.EMP.NAME");

        SuggestionReport collision = report(List.of(
                column("ERP.DBO.EMP", "NAME", "UNKNOWN", List.of()),
                column("erp.dbo.emp", "name", "UNKNOWN", List.of())));
        assertThatThrownBy(() -> writer.draft(collision))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("대소문자만 다른(또는 catalog 만 다른) 소스 컬럼");
    }

    @Test
    void jsonDraftUsesTheSameLedgerContractAndNeverCreatesConfirmation() {
        TermLedger draft = writer.draft(report(List.of(
                column("PUBLIC.LEGACY_USER", "REGDT", "EXACT", List.of(candidate("100.0"))),
                column("PUBLIC.LEGACY_USER", "UNKNOWN", "UNKNOWN", List.of()))));

        String json = writer.writeJson(draft);

        assertThat(json).startsWith("{").contains("\"schemaVersion\":2").doesNotContain("\"target\"");
        TermLedger loaded = new TermLedgerLoader().load(json);
        assertThat(loaded).isEqualTo(new TermLedgerLoader().load(writer.write(draft)));
        assertThat(loaded.entries()).allSatisfy(entry -> {
            assertThat(entry.status()).isEqualTo("PROPOSED");
            assertThat(entry.history()).isEmpty();
        });
        assertThat(new TermLedgerValidator().validate(loaded)).isEmpty();
    }

    @Test
    void theValuesForTheCredentialCheckLeaveOutTheFixedKeys() {
        TermLedger draft = writer.draft(report(List.of(
                column("legacy.tb_user", "reg_ymd", "EXACT", List.of(candidate("100.0"))))));

        String values = writer.values(draft);

        assertThat(values.lines()).contains("legacy.tb_user", "reg_ymd", "legacy.tb_user.reg_ymd", "REG_YMD",
                "PROPOSED", "transform:ymd8", "ymd8");
        assertThat(values).doesNotContain("source").doesNotContain("table").doesNotContain("conformance");
        assertThat(writer.write(draft)).contains("source:");
    }

    @Test
    void aDraftCarryingAPersonalLookingValueIsNotWritten() {
        SuggestionReport report = report(List.of(column("PUBLIC.LEGACY_USER", "hong@example.com", "UNKNOWN",
                List.of())));

        assertThatThrownBy(() -> writer.write(writer.draft(report))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> writer.writeJson(writer.draft(report))).isInstanceOf(IllegalArgumentException.class);

        SuggestionReport credential = report(List.of(column("PUBLIC.LEGACY_USER", "password=legacy1", "UNKNOWN",
                List.of())));
        assertThatThrownBy(() -> writer.write(writer.draft(credential))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> writer.writeJson(writer.draft(credential))).isInstanceOf(IllegalArgumentException.class);
    }

    private TermLedger.Load load(String hint) {
        return writer.draft(report(List.of(column("legacy.tb", "c", "EXACT", List.of(new Candidate("등록일자",
                "REG_YMD", "연월일C8", "EXACT", List.of("NAME_ENG_ABBR"),
                new ConformanceEstimate(new BigDecimal("100.0"), List.of(), hint))))))).entries().getFirst().load();
    }

    private static ColumnSuggestion column(String table, String name, String grade, List<Candidate> candidates) {
        return new ColumnSuggestion(table, name, "PROFILED", "TEXT", grade, candidates, List.of());
    }

    private static Candidate candidate(String rate) {
        return new Candidate("등록일자", "REG_YMD", "연월일C8", "EXACT", List.of("COMMENT_TERM_NAME"),
                new ConformanceEstimate(rate == null ? null : new BigDecimal(rate), List.of(), "transform:ymd8"));
    }

    private static SuggestionReport report(List<ColumnSuggestion> columns) {
        return new SuggestionReport(SuggestionReport.CURRENT_VERSION, "a".repeat(64), "b".repeat(64), null,
                Map.of(), columns, List.of());
    }
}
