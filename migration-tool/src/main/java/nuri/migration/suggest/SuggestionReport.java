package nuri.migration.suggest;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * {@code term-suggest} 산출물(ADR-0029 결정 1·2). 컬럼마다 표준 용어 후보와 근거·등급·충돌을 보고하고, 같은 용어로 모인
 * 컬럼을 개념 군집으로 묶는다. 제안일 뿐이다 — 원장 확정은 사람이 한다. 원시 행 값은 싣지 않는다.
 *
 * <p>입력 결속: 프로파일이 근거로 삼은 inventory semantic digest, 프로파일·사용처 산출물의 본문 digest 를 싣는다.</p>
 */
public record SuggestionReport(
        int version,
        String inventorySemanticDigest,
        String profileDigest,
        String appUsageDigest,
        Map<String, Long> grades,
        List<ColumnSuggestion> columns,
        List<ConceptCluster> clusters) {

    public static final int CURRENT_VERSION = 1;

    public SuggestionReport {
        grades = Map.copyOf(Objects.requireNonNull(grades, "grades"));
        columns = List.copyOf(Objects.requireNonNull(columns, "columns"));
        clusters = List.copyOf(Objects.requireNonNull(clusters, "clusters"));
    }

    /** 소스 컬럼 하나의 후보. {@code grade} 는 첫 후보의 등급이고 후보가 없으면 {@code UNKNOWN} 이다. */
    public record ColumnSuggestion(String table, String column, String dataCategory, String grade,
                                   List<Candidate> candidates, List<String> conflicts) {

        public ColumnSuggestion {
            candidates = List.copyOf(candidates);
            conflicts = List.copyOf(conflicts);
        }
    }

    /**
     * 표준 용어 후보. {@code evidence} 는 근거 종류다(예: {@code COMMENT_TERM_NAME}·{@code NAME_ENG_ABBR}·
     * {@code USAGE_LABEL}). {@code conformance} 는 프로파일 집계로 추정한 도메인 적합성이다.
     */
    public record Candidate(String termName, String engAbbr, String domain, String grade, List<String> evidence,
                            ConformanceEstimate conformance) {

        public Candidate {
            evidence = List.copyOf(evidence);
        }
    }

    /**
     * 프로파일 집계로 추정한 적합성. {@code rate} 는 판정할 수 있을 때만 있다(0~100, 소수 첫째 자리). 위반 행 수를
     * 셀 수 없는 위반(최대 길이 초과 등)은 {@code rows} 가 비어 있다. 행 단위 예외는 L3 가 다룬다.
     */
    public record ConformanceEstimate(BigDecimal rate, List<Violation> violations, String transform) {

        public ConformanceEstimate {
            violations = List.copyOf(violations);
        }
    }

    public record Violation(String type, Long rows) {}

    /** 같은 첫 후보로 모인 컬럼들(개념 군집). */
    public record ConceptCluster(String engAbbr, String termName, List<String> members) {

        public ConceptCluster {
            members = List.copyOf(members);
        }
    }
}
