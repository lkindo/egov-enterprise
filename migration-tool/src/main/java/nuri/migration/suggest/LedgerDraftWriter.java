package nuri.migration.suggest;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.dataformat.yaml.YAMLGenerator;
import com.fasterxml.jackson.dataformat.yaml.YAMLMapper;
import nuri.migration.artifact.ArtifactRedactionGuard;
import nuri.migration.suggest.SuggestionReport.Candidate;
import nuri.migration.suggest.SuggestionReport.ColumnSuggestion;
import nuri.migration.suggest.SuggestionReport.ConformanceEstimate;
import nuri.migration.suggest.SuggestionReport.Violation;
import nuri.migration.validate.ledger.LoadCapabilities;
import nuri.migration.validate.ledger.TermLedger;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * 후보 보고서에서 검토용 원장 초안(형식 2)을 만든다(ADR-0029 결정 2·3, L3a-2). 모든 행은 {@code PROPOSED} 이고 대상
 * 표·컬럼은 비워 둔다 — 대상과 확정은 사람이 정한다. 첫 후보의 용어·등급·적합성 추정을 옮기고, 후보가 없는 컬럼도
 * {@code UNKNOWN} 행으로 남겨 검토에서 빠지지 않게 한다.
 *
 * <p>적합성은 적합률을 셀 수 없었어도 변환 힌트·센 위반·셀 수 없었던 이유({@code unmeasured})를 남긴다 — 확정할 때 그
 * 위반마다 처리를 정해야 하기 때문이다. 힌트가 내장 변환기 하나로 정해질 때만 {@code load} 를 미리 채우고, 그 밖의
 * 처리(type·codemap·nullify·승인 예외)는 사람이 정한다.</p>
 *
 * <p>따옴표가 필요한 식별자의 테이블({@code SKIPPED_IDENTIFIER})은 적재기가 읽지 못해 mapping 에 들어갈 수 없으므로
 * 초안에 싣지 않는다(후보 보고서에는 남는다). 원장은 소스 컬럼을 대소문자 없이 가리고 표 이름에 catalog 를 넣지
 * 않으므로, 그렇게 보아 같은 컬럼이 둘 이상이면 초안을 만들지 않는다 — 한쪽을 조용히 버리지 않는다.</p>
 */
public final class LedgerDraftWriter {

    private static final Pattern ID = Pattern.compile("[A-Za-z0-9_.-]{1,64}");
    private static final String SKIPPED_IDENTIFIER = "SKIPPED_IDENTIFIER";
    private final LoadCapabilities capabilities = new LoadCapabilities();
    private final YAMLMapper yaml = YAMLMapper.builder()
            .disable(YAMLGenerator.Feature.WRITE_DOC_START_MARKER)
            .enable(YAMLGenerator.Feature.MINIMIZE_QUOTES)
            .build();

    public TermLedger draft(SuggestionReport report) {
        Objects.requireNonNull(report, "report");
        List<TermLedger.Entry> entries = new ArrayList<>();
        Set<String> ids = new HashSet<>();
        Set<String> sources = new HashSet<>();
        int index = 0;
        for (ColumnSuggestion column : report.columns()) {
            index++;
            if (SKIPPED_IDENTIFIER.equals(column.tableStatus())) {
                continue;
            }
            if (!sources.add(column.table().toLowerCase(Locale.ROOT) + '\u0000'
                    + column.column().toLowerCase(Locale.ROOT))) {
                throw new IllegalArgumentException("대소문자만 다른(또는 catalog 만 다른) 소스 컬럼이 있어 원장 초안을"
                        + " 만들 수 없습니다(원장은 대소문자를 가리지 않고 표 이름에 catalog 를 넣지 않습니다)");
            }
            String id = column.table() + "." + column.column();
            if (!ID.matcher(id).matches() || !ids.add(id)) {
                id = "L%05d".formatted(index);
                ids.add(id);
            }
            Candidate top = column.candidates().isEmpty() ? null : column.candidates().getFirst();
            TermLedger.StandardTerm term = top == null ? null
                    : new TermLedger.StandardTerm(top.termName(), top.engAbbr(), top.domain());
            TermLedger.Conformance conformance = top == null ? null : conformance(top.conformance());
            String builtin = conformance == null ? null : capabilities.builtinOf(conformance.transform());
            TermLedger.Load load = builtin == null ? null : new TermLedger.Load(builtin, null, null, List.of());
            entries.add(new TermLedger.Entry(id, new TermLedger.ColumnRef(column.table(), column.column()), null,
                    null, null, term, null, column.grade(), "PROPOSED", load, conformance, null, null, List.of()));
        }
        return new TermLedger(TermLedger.CURRENT_SCHEMA_VERSION, entries);
    }

    /**
     * 추정을 원장 적합성으로 옮긴다. 적합률을 비우게 한 이유는 {@code unmeasured} 로, 행 수를 센 위반은
     * {@code violations} 로 가른다. 옮길 것이 없으면(도메인 없음·값 없음) 비운다.
     */
    static TermLedger.Conformance conformance(ConformanceEstimate estimate) {
        List<String> unmeasured = new ArrayList<>();
        List<TermLedger.ViolationCount> violations = new ArrayList<>();
        for (Violation violation : estimate.violations()) {
            if (violation.type() != null && LoadCapabilities.UNMEASURED.contains(violation.type())) {
                if (!unmeasured.contains(violation.type())) {
                    unmeasured.add(violation.type());
                }
            } else {
                violations.add(new TermLedger.ViolationCount(violation.type(), violation.rows()));
            }
        }
        if (estimate.rate() == null && estimate.transform() == null && unmeasured.isEmpty() && violations.isEmpty()) {
            return null;
        }
        return new TermLedger.Conformance(estimate.rate(), unmeasured, estimate.transform(), violations, null);
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

    /**
     * 초안에 담긴 값만 줄마다 이어 붙인다. 접속정보 대조는 이것으로 한다 — YAML 키({@code source}·{@code table} 등)는
     * 고정 어휘라 짧은 endpoint ID 와 같은 단어여도 접속정보가 아니다.
     */
    public String values(TermLedger ledger) {
        Objects.requireNonNull(ledger, "ledger");
        StringBuilder text = new StringBuilder();
        collect(withoutNulls(yaml.valueToTree(ledger)), text);
        return text.toString();
    }

    private static void collect(JsonNode node, StringBuilder text) {
        if (node.isContainerNode()) {
            node.forEach(child -> collect(child, text));
        } else {
            text.append(node.asText()).append('\n');
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
