package nuri.migration.validate.ledger;

import java.math.BigDecimal;
import java.util.List;

/**
 * 용어 매핑 원장(ADR-0029 결정 3). 레거시 컬럼 하나가 어느 표준 용어·대상 컬럼으로 가는지와 그 근거·확정 이력을
 * 담는 기관 이관 저장소의 검토 파일이다. 원시 행 값·접속정보는 담지 않는다.
 *
 * <p>상태는 {@code PROPOSED → REVIEWED → CONFIRMED} 가 기본 흐름이고, 검토에서 {@code APPROVED_IGNORE}(이관 제외)·
 * {@code ARCHIVE}(외부 보관)·{@code REGISTRATION_REQUESTED}(표준 등록 요청)·{@code REJECTED} 로 갈 수 있다. 확정된
 * 행만 mapping 이 쓸 수 있다.</p>
 */
public record TermLedger(Integer schemaVersion, List<Entry> entries) {

    public static final int CURRENT_SCHEMA_VERSION = 1;

    public TermLedger {
        entries = entries == null ? List.of() : List.copyOf(entries);
    }

    /** 원장 행 하나. {@code history} 는 처음 {@code PROPOSED} 에서 지금 상태까지의 전이다. */
    public record Entry(
            String id,
            ColumnRef source,
            ColumnRef target,
            StandardTerm term,
            String grade,
            String status,
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

    /** 표준 용어. {@code engAbbr} 는 live 메타 {@code meta_standard_terms.eng_abbr} 와 대조한다. */
    public record StandardTerm(String name, String engAbbr, String domain) {}

    /**
     * 후보 도메인 대비 적합성. 변환 후 적합률이 100 이 아니면 승인된 예외(행 수 상한과 사유)가 있어야 확정할 수 있다.
     * 예외 행을 실제로 격리하는 경로는 L3 다.
     */
    public record Conformance(BigDecimal rate, String transform, ApprovedExceptions approvedExceptions) {}

    public record ApprovedExceptions(Long maxRows, String reason) {}

    /** 외부 보관(ARCHIVE)의 보존 기한(yyyy-MM-dd). */
    public record Archive(String retainUntil) {}

    /** 상태 전이 한 번. {@code by} 는 사람, {@code at} 은 yyyy-MM-dd 다. */
    public record Transition(String to, String by, String at) {}
}
