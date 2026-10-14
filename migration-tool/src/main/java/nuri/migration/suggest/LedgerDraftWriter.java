package nuri.migration.suggest;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.dataformat.yaml.YAMLGenerator;
import com.fasterxml.jackson.dataformat.yaml.YAMLMapper;
import nuri.migration.artifact.ArtifactRedactionGuard;
import nuri.migration.suggest.SuggestionReport.Candidate;
import nuri.migration.suggest.SuggestionReport.ColumnSuggestion;
import nuri.migration.validate.ledger.TermLedger;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * 후보 보고서에서 검토용 원장 초안을 만든다(ADR-0029 결정 2·3). 모든 행은 {@code PROPOSED} 이고 대상 표·컬럼은 비워
 * 둔다 — 대상과 확정은 사람이 정한다. 첫 후보의 용어·등급·추정 적합률만 옮기고, 후보가 없는 컬럼도
 * {@code UNKNOWN} 행으로 남겨 검토에서 빠지지 않게 한다.
 */
public final class LedgerDraftWriter {

    private static final Pattern ID = Pattern.compile("[A-Za-z0-9_.-]{1,64}");
    private final YAMLMapper yaml = YAMLMapper.builder()
            .disable(YAMLGenerator.Feature.WRITE_DOC_START_MARKER)
            .enable(YAMLGenerator.Feature.MINIMIZE_QUOTES)
            .build();

    public TermLedger draft(SuggestionReport report) {
        Objects.requireNonNull(report, "report");
        List<TermLedger.Entry> entries = new ArrayList<>();
        Set<String> ids = new HashSet<>();
        int index = 0;
        for (ColumnSuggestion column : report.columns()) {
            index++;
            String id = column.table() + "." + column.column();
            if (!ID.matcher(id).matches() || !ids.add(id)) {
                id = "L%05d".formatted(index);
                ids.add(id);
            }
            Candidate top = column.candidates().isEmpty() ? null : column.candidates().getFirst();
            TermLedger.StandardTerm term = top == null ? null
                    : new TermLedger.StandardTerm(top.termName(), top.engAbbr(), top.domain());
            TermLedger.Conformance conformance = top == null || top.conformance().rate() == null ? null
                    : new TermLedger.Conformance(top.conformance().rate(), top.conformance().transform(), null);
            entries.add(new TermLedger.Entry(id, new TermLedger.ColumnRef(column.table(), column.column()), null,
                    term, column.grade(), "PROPOSED", conformance, null, null, List.of()));
        }
        return new TermLedger(TermLedger.CURRENT_SCHEMA_VERSION, entries);
    }

    /** 원장 초안을 YAML 로 쓴다. 자격·개인정보로 보이는 값이 남아 있으면 쓰지 않는다. */
    public String write(TermLedger ledger) {
        Objects.requireNonNull(ledger, "ledger");
        JsonNode tree = withoutNulls(yaml.valueToTree(ledger));
        ArtifactRedactionGuard.assertSafe(tree);
        ArtifactRedactionGuard.assertNoPersonalValues(tree);
        try {
            return yaml.writeValueAsString(tree);
        } catch (JsonProcessingException impossible) {
            throw new IllegalStateException("원장 초안을 쓰지 못했습니다");
        }
    }

    /** 비어 있는 항목(대상·적합률 등)은 키째 뺀다 — 검토자가 채울 자리는 원장 형식 문서가 말한다. */
    private static JsonNode withoutNulls(JsonNode node) {
        if (node instanceof ObjectNode object) {
            List<String> empty = new ArrayList<>();
            object.properties().forEach(field -> {
                if (field.getValue().isNull()) {
                    empty.add(field.getKey());
                } else {
                    withoutNulls(field.getValue());
                }
            });
            object.remove(empty);
        } else if (node.isArray()) {
            node.forEach(LedgerDraftWriter::withoutNulls);
        }
        return node;
    }
}
