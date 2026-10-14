package nuri.migration.profile;

import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * {@code profile} 산출물의 본문이다(ADR-0029 결정 1). 값은 집계와 모양 개수뿐이고, 값 빈도는 코드처럼 보이는 짧은
 * ASCII 값이 같은 값으로 {@value ColumnProfiler#CODE_MIN_FREQUENCY}번 이상 나올 때만 싣는다. 코멘트 원문은
 * 개인정보·자격처럼 보이는 부분을 가린 뒤 싣는다.
 *
 * <p>컬럼·테이블 이름을 JSON 키로 쓰지 않는다 — 레거시에 흔한 {@code PASSWORD} 같은 이름이 자격 키로 오인되지 않게
 * 목록 안의 {@code name} 값으로만 둔다.</p>
 */
public record SourceProfile(int profileVersion, Long rowLimit, boolean complete, List<TableProfile> tables) {

    /**
     * 2: 숫자형 값을 숫자 모양 문자로 세지 않고, 하이픈 자리표시 날짜·하이픈 일시·14자리 일시의 달력 위반을 따로
     * 센다(DEC-OPS-313). 판이 다른 프로파일은 term-suggest 가 받지 않는다 — 같은 이름의 수가 다른 뜻이기 때문이다.
     */
    public static final int CURRENT_VERSION = 2;

    public SourceProfile {
        tables = List.copyOf(Objects.requireNonNull(tables, "tables"));
    }

    /** 테이블 하나의 프로파일. {@code status} 는 {@code PROFILED}·{@code SKIPPED_IDENTIFIER}·{@code FAILED} 다. */
    public record TableProfile(
            String catalog,
            String schema,
            String name,
            String status,
            String failureSqlState,
            long rowsScanned,
            boolean truncated,
            CommentEvidence comment,
            List<ColumnProfile> columns) {

        public TableProfile {
            Objects.requireNonNull(name, "name");
            Objects.requireNonNull(status, "status");
            columns = List.copyOf(Objects.requireNonNull(columns, "columns"));
        }
    }

    /**
     * 코멘트 근거. {@code inventoryMatch} 는 JDBC 가 돌려준 코멘트가 inventory 에 해시로 남은 코멘트와 같은지다 —
     * {@code MATCH}·{@code MISMATCH}·{@code NOT_IN_INVENTORY}(discover 가 코멘트를 담지 않았다)·
     * {@code INVENTORY_ONLY}(JDBC 가 코멘트를 돌려주지 않았다)·{@code ABSENT}. {@code withheld} 는 자격처럼 보여
     * 원문을 싣지 않은 경우의 사유다.
     */
    public record CommentEvidence(String text, boolean redacted, String withheld, String inventoryMatch) {

        public CommentEvidence {
            Objects.requireNonNull(inventoryMatch, "inventoryMatch");
        }
    }

    /** 컬럼 하나의 프로파일. 선언 정보는 inventory 의 컬럼 속성을 그대로 옮긴다. */
    public record ColumnProfile(
            String name,
            Integer ordinal,
            String nativeType,
            Integer jdbcType,
            Long declaredSize,
            Integer declaredScale,
            Boolean declaredNullable,
            long rows,
            long nulls,
            long blanks,
            long textValues,
            long numberValues,
            long temporalValues,
            long lobValues,
            long otherValues,
            Integer minLength,
            Integer maxLength,
            long totalLength,
            long trailingSpaces,
            long distinct,
            boolean distinctCapped,
            Map<String, Long> patternMatches,
            long ymd8Invalid,
            long ymdhms14Invalid,
            Integer minYear,
            Integer maxYear,
            boolean personalPatternDetected,
            List<ValueFrequency> valueFrequencies,
            long rareValueRows,
            long rareDistinctValues,
            String frequencyOmittedReason,
            CommentEvidence comment) {

        public ColumnProfile {
            Objects.requireNonNull(name, "name");
            patternMatches = Map.copyOf(Objects.requireNonNull(patternMatches, "patternMatches"));
            valueFrequencies = List.copyOf(Objects.requireNonNull(valueFrequencies, "valueFrequencies"));
        }
    }

    /** 코드 후보 값과 그 행 수. */
    public record ValueFrequency(String value, long rows) {

        public ValueFrequency {
            Objects.requireNonNull(value, "value");
        }
    }
}
