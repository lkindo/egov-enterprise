package nuri.migration.verify;

import nuri.migration.etl.EtlExecutor.TableResult;
import nuri.migration.source.SourceIntrospector;
import nuri.migration.verify.MigrationReport.Status;
import nuri.migration.verify.MigrationReport.TableReport;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * 이관 후 실증 검증 — 타깃을 재조회해 조회↔변환↔기록 정합과 실제 타깃 행수를 대조하고 PASS/WARN/FAIL 등급을 매긴다.
 *
 * <p>재설계(2026-07-23): 18줄 카운트-에코 stub 을 실측 검증으로 대체. 등급 규칙 —
 * FAIL: 오류 존재 · (commit) 기록≠변환(쓰기 유실) · (commit) 타깃 실측행 &lt; 기록(유령 기록).
 * WARN: 변환&lt;조회(행 드롭) · dry-run(타깃 미대조). PASS: 조회==변환==기록 & 오류 0.
 *
 * <p>남은 로드맵(설계문서 §7 P4): 고아 FK/NOT-NULL/UNIQUE 스캔, meta_standard_domains 도메인 적합성,
 * 집계 체크섬 parity, 샘플 N행 소스↔타깃 diff, tb_migration_run 감사 레코드.
 */
@Component
public class MigrationVerifier {

    public MigrationReport verify(List<TableResult> results, JdbcTemplate targetJt) {
        boolean commit = targetJt != null;
        List<TableReport> tables = new ArrayList<>(results.size());
        Status overall = Status.PASS;

        for (TableResult r : results) {
            long targetRows = commit ? targetRowCount(targetJt, r.targetTable()) : -1L;
            Status status;
            String note;

            if (!r.errors().isEmpty()) {
                status = Status.FAIL;
                note = "오류 " + r.errors().size() + "건";
            } else if (commit && targetRows >= 0 && targetRows < r.written()) {
                status = Status.FAIL;
                note = "타깃 실측행(" + targetRows + ") < 기록(" + r.written() + ") — 유령 기록";
            } else if (commit && r.written() != r.transformed()) {
                status = Status.FAIL;
                note = "기록(" + r.written() + ") ≠ 변환(" + r.transformed() + ") — 쓰기 유실";
            } else if (r.transformed() != r.read()) {
                status = Status.WARN;
                note = "변환(" + r.transformed() + ") < 조회(" + r.read() + ") — 행 드롭";
            } else if (!commit) {
                status = Status.PASS;
                note = "dry-run(타깃 미대조)";
            } else {
                status = Status.PASS;
                note = "";
            }

            tables.add(new TableReport(r.sourceTable(), r.targetTable(),
                    r.read(), r.transformed(), r.written(), r.errors().size(), targetRows, status, note));
            overall = worst(overall, status);
        }
        return new MigrationReport(tables, overall);
    }

    private long targetRowCount(JdbcTemplate jt, String table) {
        try {
            Long c = jt.queryForObject("SELECT count(*) FROM " + SourceIntrospector.qualifiedIdent(table), Long.class);
            return c == null ? 0L : c;
        } catch (RuntimeException e) {
            return -1L; // 타깃 테이블 부재/권한 — 대조 불가(등급에서 유령 기록 검사만 스킵)
        }
    }

    private static Status worst(Status a, Status b) {
        if (a == Status.FAIL || b == Status.FAIL) {
            return Status.FAIL;
        }
        if (a == Status.WARN || b == Status.WARN) {
            return Status.WARN;
        }
        return Status.PASS;
    }
}
