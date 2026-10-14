package nuri.migration.validate.ledger;

import com.fasterxml.jackson.annotation.JsonInclude;
import nuri.migration.model.MappingSpec;

import java.math.BigDecimal;
import java.util.List;

/**
 * 용어 매핑 원장(ADR-0029 결정 3). 레거시 컬럼 하나가 어느 표준 용어·대상 컬럼으로 가는지와 그 근거·확정 이력을
 * 담는 기관 이관 저장소의 검토 파일이다. 원시 행 값·접속정보는 담지 않는다.
 *
 * <p>상태는 {@code PROPOSED → REVIEWED → CONFIRMED} 가 기본 흐름이고, 검토에서 {@code APPROVED_IGNORE}(이관 제외)·
 * {@code ARCHIVE}(외부 보관)·{@code REGISTRATION_REQUESTED}(표준 등록 요청)·{@code REJECTED} 로 갈 수 있다. 확정된
 * 행만 mapping 이 쓸 수 있다.</p>
 *
 * <p>형식 2(ADR-0029 L3a-2): 확정 행은 그 컬럼을 옮길 {@code load}(변환·type·codemap·nullify)를 함께 정한다 — mapping 은
 * 원장에서 만든다. 적합률은 참고값이고, 확정할 수 있는지는 기록된 위반마다 실행 시점 처리가 있는지와 셀 수 없었던
 * 위반({@code unmeasured})마다 행 단위 판정이 있는지로 정한다. 형식 1 은 읽지 않는다.</p>
 */
public record TermLedger(Integer schemaVersion, List<Entry> entries) {

    public static final int CURRENT_SCHEMA_VERSION = 2;

    public TermLedger {
        entries = entries == null ? List.of() : List.copyOf(entries);
    }

    /**
     * 원장 행 하나. {@code history} 는 처음 {@code PROPOSED} 에서 지금 상태까지의 전이다.
     *
     * <p>{@code mapping}·{@code via} 는 확정 행에만 둔다. {@code mapping} 을 생략하면 그 소스의 기본 매핑이고, {@code via}
     * 는 조회 표의 컬럼을 다른 매핑이 조회 조인으로 읽을 때다. {@code nonStandardTarget} 은 표준 용어가 없는 대상 컬럼을
     * {@code term} 대신 확정할 때다 — live 대상 계약이 그 컬럼에 용어가 없음을 증명해야 한다(DEC-OPS-317 U1).</p>
     */
    public record Entry(
            String id,
            ColumnRef source,
            String mapping,
            Via via,
            ColumnRef target,
            StandardTerm term,
            NonStandardTarget nonStandardTarget,
            String grade,
            String status,
            Load load,
            Conformance conformance,
            Archive archive,
            String note,
            List<Transition> history) {

        public Entry {
            history = history == null ? List.of() : List.copyOf(history);
        }
    }

    /** 컬럼 위치. 표 이름은 mapping 의 {@code source}·{@code target} 과 같은 표기다. */
    public record ColumnRef(String table, String column) {}

    /** 조회 조인 경로(ADR-0029 L3d). 이 컬럼을 {@code mapping} 이 별칭 {@code lookup} 의 조회로 읽는다. */
    public record Via(String mapping, String lookup) {}

    /** 표준 용어. {@code engAbbr} 는 live 메타 {@code meta_standard_terms.eng_abbr} 와 대조한다. */
    public record StandardTerm(String name, String engAbbr, String domain) {}

    /** 표준 용어가 없는 대상 컬럼으로 확정하는 사유(DEC-OPS-317 U1). */
    public record NonStandardTarget(String reason) {}

    /**
     * 확정 행이 mapping 컬럼으로 옮길 처리. {@code transform} 은 내장 변환기 이름, {@code type} 은 mapping 의 type,
     * {@code codemap} 은 mapping 의 codemap 이름, {@code nullify} 는 mapping 과 같은 규칙 정제다. {@code {}} 는 변환 없음이다.
     */
    public record Load(
            String transform,
            String type,
            String codemap,
            @JsonInclude(JsonInclude.Include.NON_EMPTY) List<MappingSpec.Nullify> nullify) {

        public Load {
            nullify = nullify == null ? List.of() : List.copyOf(nullify);
        }
    }

    /**
     * 후보 도메인 대비 적합성(추정기 산출). {@code rate} 는 참고값이고 셀 수 없었으면 비운다 — 그때 {@code unmeasured} 가
     * 그 이유(추정기 코드)다. {@code transform} 은 추정기의 변환 힌트(mapping 어휘), {@code violations} 는 행 수를 센
     * 위반이다. {@code approvedExceptions} 는 사람이 승인한 행 단위 예외다 — 행을 실제로 격리하는 경로는 L3b 다.
     */
    public record Conformance(
            BigDecimal rate,
            @JsonInclude(JsonInclude.Include.NON_EMPTY) List<String> unmeasured,
            String transform,
            @JsonInclude(JsonInclude.Include.NON_EMPTY) List<ViolationCount> violations,
            ApprovedExceptions approvedExceptions) {

        public Conformance {
            unmeasured = unmeasured == null ? List.of() : List.copyOf(unmeasured);
            violations = violations == null ? List.of() : List.copyOf(violations);
        }
    }

    /** 추정기가 센 위반 한 종류와 행 수. */
    public record ViolationCount(String type, Long rows) {}

    /** 승인된 행 단위 예외. {@code maxRows} 는 1~1000, {@code violations} 는 격리할 위반 코드다. */
    public record ApprovedExceptions(
            Long maxRows,
            String reason,
            @JsonInclude(JsonInclude.Include.NON_EMPTY) List<String> violations) {

        public ApprovedExceptions {
            violations = violations == null ? List.of() : List.copyOf(violations);
        }
    }

    /** 외부 보관(ARCHIVE)의 보존 기한(yyyy-MM-dd). */
    public record Archive(String retainUntil) {}

    /** 상태 전이 한 번. {@code by} 는 사람, {@code at} 은 yyyy-MM-dd 다. */
    public record Transition(String to, String by, String at) {}
}
