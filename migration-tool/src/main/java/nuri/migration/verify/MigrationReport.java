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

    public record TableReport(String source, String target, long read, long transformed, long written,
                              long errors, long targetRows, Status status, String note) {}

    public boolean ok() {
        return overall == Status.PASS;
    }

    public String toSummary() {
        StringBuilder sb = new StringBuilder("=== Migration Report ===\n");
        for (TableReport t : tables) {
            sb.append(String.format("  [%-4s] %-20s -> %-20s read=%d transformed=%d written=%d errors=%d targetRows=%s%s%n",
                    t.status(), t.source(), t.target(), t.read(), t.transformed(), t.written(), t.errors(),
                    t.targetRows() < 0 ? "-" : String.valueOf(t.targetRows()),
                    t.note() == null || t.note().isBlank() ? "" : "  (" + t.note() + ")"));
        }
        sb.append("RESULT: ").append(overall).append('\n');
        return sb.toString();
    }
}
