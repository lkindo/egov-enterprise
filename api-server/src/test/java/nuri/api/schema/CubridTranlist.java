package nuri.api.schema;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * CUBRID 잠금 관측(VendorTestSql)이 읽는 {@code cubrid tranlist -f} 출력의 해석. 컨테이너를 부르는 쪽은 VendorTestSql 이 맡고, 여기는 출력만 읽는다 —
 * 단위 시험(nuri.api.support.CubridTranlistParserTest)이 실측 출력으로 고정한다. 이 폴더의 {@code *Test.java} 는 벤더 시나리오 시험으로 원장에 분류되므로
 * 단위 시험은 이 폴더에 두지 않는다.
 */
public final class CubridTranlist {

    private CubridTranlist() {
    }

    /** tranlist 의 한 트랜잭션. {@code holders} 는 이 트랜잭션이 기다리는 트랜잭션 번호이고, {@code statement} 는 소문자 문장이다. */
    public record Transaction(int index, int process, List<Integer> holders, String statement) {
    }

    /**
     * {@code Tran index  User name  Host name  Process id  Program name  Query time  Tran time  Wait for lock holder  SQL_ID  SQL Text} 의 행.
     * 기다리지 않으면 대기 칸이 -1 이다. 문장 전체는 아래 SQL_ID 절에 따로 나온다(2026-11-06 실측).
     */
    private static final Pattern CUBRID_TRANSACTION_ROW = Pattern.compile(
            "^\\s*(\\d+)\\(\\w+\\)\\s+\\S+\\s+\\S+\\s+(\\d+)\\s+\\S+\\s+-?[\\d.]+\\s+-?[\\d.]+\\s+(-1|\\d+(?:\\s*[,|]\\s*\\d+)*)\\s+(\\*\\*\\* empty \\*\\*\\*|\\S+)(.*)$");
    private static final Pattern CUBRID_TRANSACTION_START = Pattern.compile("^\\s*\\d+\\(");
    private static final Pattern CUBRID_SQL_INDEX = Pattern.compile("^Tran index\\s*:\\s*([\\d,\\s]+)$");

    /** 머리글. 이 줄과 표의 위아래 선이 없으면 출력이 잘렸거나 모양이 바뀐 것이다. */
    private static final Pattern CUBRID_TRANSACTION_HEADER = Pattern.compile("^\\s*Tran index\\s+User name\\s.*\\bWait for lock holder\\b.*$");

    public static Map<Integer, Transaction> parse(String output) {
        Map<Integer, int[]> rows = new LinkedHashMap<>();
        Map<Integer, List<Integer>> holders = new LinkedHashMap<>();
        Map<Integer, String> rowText = new LinkedHashMap<>();
        Map<Integer, StringBuilder> fullText = new LinkedHashMap<>();
        List<StringBuilder> current = new ArrayList<>();
        boolean rowsDone = false;
        boolean header = false;
        int dashes = 0;
        for (String line : output.split("\\R")) {
            if (dashes == 0 && CUBRID_TRANSACTION_HEADER.matcher(line).matches()) {
                header = true;
                continue;
            }
            if (line.startsWith("----")) {
                dashes++;
                rowsDone = dashes >= 2;
                current.clear();
                continue;
            }
            if (!rowsDone && dashes == 1) {
                if (!CUBRID_TRANSACTION_START.matcher(line).find()) {
                    continue;
                }
                Matcher row = CUBRID_TRANSACTION_ROW.matcher(line);
                if (!row.matches()) {
                    throw new IllegalStateException("tranlist 행을 읽지 못했다: " + line);
                }
                int index = Integer.parseInt(row.group(1));
                rows.put(index, new int[] {Integer.parseInt(row.group(2))});
                holders.put(index, "-1".equals(row.group(3)) ? List.of()
                        : Arrays.stream(row.group(3).split("[,|]")).map(String::trim).map(Integer::valueOf).toList());
                rowText.put(index, row.group(5).strip());
                continue;
            }
            if (rowsDone) {
                if (line.startsWith("SQL_ID:")) {
                    current.clear();
                    continue;
                }
                Matcher indexes = CUBRID_SQL_INDEX.matcher(line.strip());
                if (current.isEmpty() && indexes.matches()) {
                    for (String item : indexes.group(1).split(",")) {
                        if (!item.isBlank()) {
                            current.add(fullText.computeIfAbsent(Integer.valueOf(item.trim()), key -> new StringBuilder()));
                        }
                    }
                    continue;
                }
                for (StringBuilder text : current) {
                    text.append(text.isEmpty() ? "" : "\n").append(line);
                }
            }
        }
        // 빈 출력·잘린 출력을 "트랜잭션이 없다(아무도 기다리지 않는다)" 로 읽으면 대기를 보지 못한 채 통과한다.
        if (!header || dashes < 2) {
            throw new IllegalStateException("tranlist 표를 찾지 못했다(머리글 " + header + ", 선 " + dashes + "): "
                    + output.strip().lines().limit(3).collect(Collectors.joining(" / ")));
        }
        Map<Integer, Transaction> transactions = new LinkedHashMap<>();
        rows.forEach((index, row) -> {
            String text = fullText.containsKey(index) ? fullText.get(index).toString().strip() : rowText.get(index);
            String statement = text == null || text.isEmpty() || "*** empty ***".equals(text) ? null : text.toLowerCase(Locale.ROOT);
            transactions.put(index, new Transaction(index, row[0], holders.get(index), statement));
        });
        return transactions;
    }
}
