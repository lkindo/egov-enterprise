package nuri.migration;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;

/**
 * 시험 mapping 이 선언할 용어 매핑 원장(ADR-0029 L3a-2, DEC-OPS-317). plan·load 는 원장 없는 mapping 을 받지 않으므로
 * workflow·packaged CLI 시험은 이것으로 원장을 함께 둔다.
 *
 * <p>fixture 대상 표는 표준 용어가 없는 컬럼이라 확정 행은 비표준 대상(U1)이다. live 대조가 그 컬럼에 용어가 없음을
 * 증명해야 하므로 대상 schema 에 {@link StandardMetaFixture} 로 빈 표준 메타를 둔다.</p>
 */
final class LedgerFixtures {

    static final String FILE = "term-ledger.yml";
    private static final String HISTORY = "[{to: REVIEWED, by: 검토자, at: \"2026-10-01\"},"
            + " {to: CONFIRMED, by: 업무담당, at: \"2026-10-02\"}]";

    private LedgerFixtures() {
    }

    /** 확정 행 하나 — 소스 컬럼 하나를 대상 컬럼 하나로 옮기고 mapping 과 같은 load 를 둔다. */
    record Row(String sourceTable, String sourceColumn, String targetTable, String targetColumn, String transform,
               String type) {
    }

    static Row row(String sourceTable, String sourceColumn, String targetTable, String targetColumn) {
        return new Row(sourceTable, sourceColumn, targetTable, targetColumn, null, null);
    }

    static Row row(String sourceTable, String sourceColumn, String targetTable, String targetColumn, String transform,
                   String type) {
        return new Row(sourceTable, sourceColumn, targetTable, targetColumn, transform, type);
    }

    /** 비표준 대상(U1)으로 확정한 원장 본문. */
    static String nonStandard(List<Row> rows) {
        StringBuilder text = new StringBuilder("schemaVersion: 2\nentries:\n");
        int index = 1;
        for (Row row : rows) {
            text.append("  - id: L").append(index++).append('\n')
                    .append("    source: {table: ").append(quote(row.sourceTable())).append(", column: ")
                    .append(quote(row.sourceColumn())).append("}\n")
                    .append("    target: {table: ").append(quote(row.targetTable())).append(", column: ")
                    .append(quote(row.targetColumn())).append("}\n")
                    .append("    nonStandardTarget: {reason: \"시험 fixture 대상 표 — 표준 용어가 없는 컬럼\"}\n")
                    .append("    grade: UNKNOWN\n")
                    .append("    status: CONFIRMED\n")
                    .append("    load: {").append(load(row)).append("}\n")
                    .append("    history: ").append(HISTORY).append('\n');
        }
        return text.toString();
    }

    /** 원장을 mapping 디렉터리에 쓰고 mapping 끝에 붙일 {@code ledger:} 블록을 돌려준다. */
    static String write(Path directory, List<Row> rows) throws Exception {
        String ledger = nonStandard(rows);
        Files.writeString(directory.resolve(FILE), ledger, StandardCharsets.UTF_8);
        return binding(ledger);
    }

    /** mapping 의 {@code ledger:} 블록(최상위). */
    static String binding(String ledger) {
        return "ledger:\n  path: " + FILE + "\n  sha256: " + sha256(ledger) + "\n";
    }

    static String sha256(String ledger) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(ledger.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException(impossible);
        }
    }

    private static String load(Row row) {
        StringBuilder load = new StringBuilder();
        if (row.transform() != null) {
            load.append("transform: ").append(row.transform());
        }
        if (row.type() != null) {
            load.append(load.isEmpty() ? "" : ", ").append("type: ").append(row.type());
        }
        return load.toString();
    }

    private static String quote(String value) {
        return "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }
}
