package nuri.migration.verify;

import nuri.migration.etl.EtlExecutor.TableResult;
import nuri.migration.model.MappingSpec;
import nuri.migration.source.SourceIntrospector;
import nuri.migration.verify.MigrationReport.Status;
import nuri.migration.verify.MigrationReport.TableReport;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * 이관 후 실증 검증 — 타깃을 재조회해 조회↔변환↔기록 정합과 실제 타깃 행수를 대조하고 PASS/WARN/FAIL 등급을 매긴다.
 *
 * <p>재설계(2026-07-23): 18줄 카운트-에코 stub 을 실측 검증으로 대체. 등급 규칙 —
 * FAIL: 오류 존재 · (commit) 기록≠변환(쓰기 유실) · (commit) 타깃 실측행 &lt; 기록(유령 기록).
 * WARN: 변환≠조회(행 드롭/증폭; strict CLI에서는 실패 종료). PASS: 조회==변환==기록 & 오류 0.
 *
 * <p>남은 로드맵(설계문서 §7 P4): 고아 FK/NOT-NULL/UNIQUE 스캔, meta_standard_domains 도메인 적합성,
 * 집계 체크섬 parity, 샘플 N행 소스↔타깃 diff, tb_migration_run 감사 레코드.
 */
@Component
public class MigrationVerifier {

    /** 판정 분기 단위 테스트용: 실제 실행 경로는 반드시 선언 spec까지 전달하는 public overload를 사용한다. */
    MigrationReport verify(List<TableResult> results, JdbcTemplate targetJt) {
        List<MappingSpec.TableMapping> expected = results == null ? List.of() : results.stream()
                .map(result -> new MappingSpec.TableMapping(
                        result.sourceTable(), result.targetTable(), null, List.of(), null))
                .toList();
        return verify(new MappingSpec(null, null, expected, Map.of()), results, targetJt);
    }

    public MigrationReport verify(MappingSpec spec, List<TableResult> results, JdbcTemplate targetJt) {
        boolean commit = targetJt != null;
        List<TableResult> actualResults = results == null ? List.of() : results;
        List<TableReport> tables = new ArrayList<>(actualResults.size() + 1);
        Status overall = Status.PASS;

        String resultContractError = resultContractError(spec, actualResults);
        if (resultContractError != null) {
            tables.add(new TableReport("<execution-contract>", "<execution-contract>",
                    0L, 0L, 0L, 1L, -1L, Status.FAIL, resultContractError));
            overall = Status.FAIL;
        }

        for (TableResult r : actualResults) {
            long targetRows = commit ? targetRowCount(targetJt, r.targetTable()) : -1L;
            Status status;
            String note;

            if (!r.errors().isEmpty()) {
                status = Status.FAIL;
                note = "오류 " + r.errors().size() + "건";
            } else if (commit && targetRows < 0) {
                status = Status.FAIL;
                note = "타깃 행수 대조 실패 — 성공을 증명할 수 없음";
            } else if (commit && targetRows >= 0 && targetRows < r.written()) {
                status = Status.FAIL;
                note = "타깃 실측행(" + targetRows + ") < 기록(" + r.written() + ") — 유령 기록";
            } else if (commit && r.written() != r.transformed()) {
                status = Status.FAIL;
                note = "기록(" + r.written() + ") ≠ 변환(" + r.transformed() + ") — 쓰기 유실";
            } else if (r.transformed() != r.read()) {
                status = Status.WARN;
                note = "변환(" + r.transformed() + ") ≠ 조회(" + r.read()
                        + ") — 행 드롭/증폭 cardinality 불일치";
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

    private static String resultContractError(MappingSpec spec, List<TableResult> results) {
        List<MappingSpec.TableMapping> expectedTables = spec == null ? List.of() : spec.tables();
        if (expectedTables.isEmpty()) {
            return "검증 대상 테이블 매핑이 비어 있어 성공을 증명할 수 없음";
        }
        Map<String, Long> expected = new LinkedHashMap<>();
        for (MappingSpec.TableMapping table : expectedTables) {
            expected.merge(identity(table.source(), table.target()), 1L, Long::sum);
        }
        Map<String, Long> actual = new LinkedHashMap<>();
        for (TableResult result : results) {
            actual.merge(identity(result.sourceTable(), result.targetTable()), 1L, Long::sum);
        }
        if (expectedTables.size() != results.size() || !expected.equals(actual)) {
            return "실행 결과 cardinality/identity 불일치: expected=" + expected + ", actual=" + actual;
        }
        return null;
    }

    private static String identity(String source, String target) {
        return normalize(source) + " -> " + normalize(target);
    }

    private static String normalize(String value) {
        return value == null ? "<null>" : value.toLowerCase(Locale.ROOT);
    }

    private long targetRowCount(JdbcTemplate jt, String table) {
        try {
            Long c = jt.queryForObject("SELECT count(*) FROM " + SourceIntrospector.qualifiedIdent(table), Long.class);
            return c == null ? 0L : c;
        } catch (RuntimeException e) {
            return -1L; // 호출자는 대조 불가를 FAIL로 판정한다.
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
