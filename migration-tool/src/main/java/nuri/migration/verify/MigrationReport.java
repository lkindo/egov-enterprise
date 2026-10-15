package nuri.migration.verify;

import java.util.List;

/**
 * 이관 결과 리포트 — 테이블별 read/transformed/written/errors + <b>타깃 실측 대조</b> 등급(PASS/WARN/FAIL).
 *
 * <p>기존 stub(카운트 에코, {@code ok=errors==0})은 쓰기 유실·유령 기록을 성공으로 숨겼다(false-green).
 * 이제 {@link MigrationVerifier}가 타깃을 재조회해 실증 등급을 부여한다(오케스트레이션 §4 증거 기반 완료).
 */
public record MigrationReport(List<TableReport> tables, Status overall) {

    public enum Status { PASS, WARN, FAIL }

    /**
     * {@code mappingId} 는 한 소스를 나눈 매핑의 id 다(ADR-0029 L3c). 기본 매핑은 null 이다. {@code isolated} 는 원장이
     * 승인한 위반으로 적재하지 않은 행 수다(ADR-0029 L3b).
     */
    public record TableReport(String source, String target, long read, long transformed, long written,
                              long errors, long targetRows, Status status, String note, String mappingId,
                              long isolated) {

        /** 승인 행 격리 도입 전 생성자 호환 — 격리한 행이 없다. */
        public TableReport(String source, String target, long read, long transformed, long written,
                           long errors, long targetRows, Status status, String note, String mappingId) {
            this(source, target, read, transformed, written, errors, targetRows, status, note, mappingId, 0L);
        }

        /** 매핑 id 도입 전 생성자 호환 — 기본 매핑이다. */
        public TableReport(String source, String target, long read, long transformed, long written,
                           long errors, long targetRows, Status status, String note, long isolated) {
            this(source, target, read, transformed, written, errors, targetRows, status, note, null, isolated);
        }

        /** 매핑 id·승인 행 격리 도입 전 생성자 호환 — 기본 매핑이고 격리한 행이 없다. */
        public TableReport(String source, String target, long read, long transformed, long written,
                           long errors, long targetRows, Status status, String note) {
            this(source, target, read, transformed, written, errors, targetRows, status, note, null, 0L);
        }

        /** 문구 라벨 — 기본 매핑은 소스 그대로, 나눈 매핑은 {@code source#id} 다. */
        public String label() {
            return mappingId == null ? source : source + "#" + mappingId;
        }
    }

    public boolean ok() {
        return overall == Status.PASS;
    }

    public String toSummary() {
        StringBuilder sb = new StringBuilder("=== Migration Report ===\n");
        for (TableReport t : tables) {
            sb.append(String.format("  [%-4s] %-20s -> %-20s read=%d transformed=%d written=%d errors=%d targetRows=%s%s%s%n",
                    t.status(), t.label(), t.target(), t.read(), t.transformed(), t.written(), t.errors(),
                    t.targetRows() < 0 ? "-" : String.valueOf(t.targetRows()),
                    t.isolated() > 0 ? " isolated=" + t.isolated() : "",
                    t.note() == null || t.note().isBlank() ? "" : "  (" + t.note() + ")"));
        }
        sb.append("RESULT: ").append(overall).append('\n');
        return sb.toString();
    }
}
