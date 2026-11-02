package nuri.api.harness;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.fail;

/**
 * Flyway 델타를 정적으로 재생해 저장소가 선언한 유효 스키마를 만든다. 벤더 프로젝트에서 빠지는 엔티티 린터 밖에 두는 이유는
 * 번역 입력을 함께 쓰는 {@link EntityTableOwnershipLinterTest} 가 남기 때문이다.
 */
final class MigrationSchemaReplay {

    private static final String MIGRATION_PATH = "src/main/resources/db/migration";

    // ── SQL 파서 패턴 ────────────────────────────────────────────────────────────
    private static final Pattern CREATE_TABLE = Pattern.compile(
            "(?is)^\\s*CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?(?:public\\.)?\"?(\\w+)\"?\\s*\\((.*)\\)\\s*$");
    private static final Pattern DROP_TABLE = Pattern.compile(
            "(?is)^\\s*DROP\\s+TABLE\\s+(?:IF\\s+EXISTS\\s+)?(?:public\\.)?\"?(\\w+)\"?");
    private static final Pattern ALTER_TABLE = Pattern.compile(
            "(?is)^\\s*ALTER\\s+TABLE\\s+(?:ONLY\\s+)?(?:IF\\s+EXISTS\\s+)?(?:public\\.)?\"?(\\w+)\"?\\s+(.*)$");
    private static final Pattern ADD_COLUMN = Pattern.compile(
            "(?is)^ADD\\s+COLUMN\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?\"?(\\w+)\"?\\s+(.+)$");
    private static final Pattern DROP_COLUMN = Pattern.compile(
            "(?is)^DROP\\s+COLUMN\\s+(?:IF\\s+EXISTS\\s+)?\"?(\\w+)\"?");
    private static final Pattern ALTER_COLUMN_TYPE = Pattern.compile(
            "(?is)^ALTER\\s+COLUMN\\s+\"?(\\w+)\"?\\s+(?:SET\\s+DATA\\s+)?TYPE\\s+(.+?)(?:\\s+USING\\s+.*)?$");
    private static final Pattern RENAME_COLUMN = Pattern.compile(
            "(?is)^RENAME\\s+COLUMN\\s+\"?(\\w+)\"?\\s+TO\\s+\"?(\\w+)\"?");
    private static final Pattern RENAME_TABLE = Pattern.compile(
            "(?is)^RENAME\\s+TO\\s+\"?(\\w+)\"?");
    /** 멱등 래퍼 {@code DO $tag$ … $tag$} — 본문에 실제 컬럼 DDL 이 들어 있다 */
    private static final Pattern DO_BLOCK = Pattern.compile("(?is)^\\s*DO\\s+\\$(\\w*)\\$(.*)\\$\\1\\$\\s*$");
    /** PL/pgSQL 제어문({@code IF … THEN}, {@code EXECUTE '…'}) 뒤에 붙은 DDL 시작 지점 */
    private static final Pattern INNER_DDL_START = Pattern.compile("(?is)\\b(?:ALTER|CREATE|DROP)\\s+TABLE\\b");
    /** 달러 인용 여는 태그 {@code $$} / {@code $tag$} */
    private static final Pattern DOLLAR_TAG = Pattern.compile("\\$\\w*\\$");

    private MigrationSchemaReplay() {
    }

    /** {@code 테이블 -> (컬럼 -> 타입)} — V* 델타를 버전 순으로 적용한 유효 스키마 */
    static Map<String, Map<String, String>> replay() throws IOException {
        Path dir = resolveMigrationDir();
        List<Path> files = HarnessSourceIndex.filesUnder(dir, p ->
                        p.getFileName().toString().matches("V\\d+_\\d+__.*\\.sql"))
                .stream()
                .sorted(Comparator.comparing(MigrationSchemaReplay::versionKey))
                .collect(Collectors.toList());
        if (files.size() < 20) {
            fail("게이트 무결성 파손: 마이그레이션 파일 " + files.size() + "건 — 경로/명명 파손 의심 (" + dir.toAbsolutePath() + ").");
        }

        Map<String, Map<String, String>> schema = new TreeMap<>();
        for (Path file : files) {
            String sql = HarnessSourceIndex.read(file);
            for (String stmt : splitStatements(stripSqlComments(sql))) {
                applyStatement(schema, stmt);
            }
        }
        return schema;
    }

    static void applyStatement(Map<String, Map<String, String>> schema, String stmt) {
        String s = stmt.trim();
        if (s.isEmpty()) {
            return;
        }
        // 멱등 래퍼 DO $$ … $$ 안에도 실제 컬럼 DDL 이 들어 있다(ADD/DROP/RENAME COLUMN, ALTER COLUMN TYPE).
        // 통째로 건너뛰면 재생 스키마가 조용히 틀려져 대조 자체가 거짓이 되므로 본문을 파고든다.
        Matcher dollar = DO_BLOCK.matcher(s);
        if (dollar.find()) {
            for (String inner : splitStatements(dollar.group(2))) {
                Matcher ddl = INNER_DDL_START.matcher(inner);
                if (ddl.find()) {
                    applyStatement(schema, inner.substring(ddl.start()).replaceAll("'\\s*$", ""));
                }
            }
            return;
        }
        Matcher ct = CREATE_TABLE.matcher(s);
        if (ct.find()) {
            Map<String, String> cols = schema.computeIfAbsent(ct.group(1).toLowerCase(Locale.ROOT),
                    k -> new LinkedHashMap<>());
            for (String part : splitTopLevel(ct.group(2))) {
                String def = part.trim();
                if (def.isEmpty()) {
                    continue;
                }
                String first = def.split("\\s+")[0].replace("\"", "").toUpperCase(Locale.ROOT);
                if (Set.of("CONSTRAINT", "PRIMARY", "UNIQUE", "FOREIGN", "CHECK", "EXCLUDE", "LIKE").contains(first)) {
                    continue;
                }
                int sp = def.indexOf(' ');
                if (sp > 0) {
                    cols.put(def.substring(0, sp).replace("\"", "").toLowerCase(Locale.ROOT),
                            def.substring(sp + 1).trim());
                }
            }
            return;
        }
        Matcher dt = DROP_TABLE.matcher(s);
        if (dt.find()) {
            schema.remove(dt.group(1).toLowerCase(Locale.ROOT));
            return;
        }
        Matcher at = ALTER_TABLE.matcher(s);
        if (at.find()) {
            String table = at.group(1).toLowerCase(Locale.ROOT);
            Map<String, String> cols = schema.get(table);
            if (cols == null) {
                return; // 미지 테이블(메타/프레임워크) — 대조 대상 아님
            }
            for (String action : splitTopLevel(at.group(2))) {
                applyAlterAction(schema, table, cols, action.trim());
            }
        }
    }

    private static void applyAlterAction(Map<String, Map<String, String>> schema, String table,
                                         Map<String, String> cols, String action) {
        Matcher m = ADD_COLUMN.matcher(action);
        if (m.find()) {
            cols.put(m.group(1).toLowerCase(Locale.ROOT), m.group(2).trim());
            return;
        }
        m = DROP_COLUMN.matcher(action);
        if (m.find()) {
            cols.remove(m.group(1).toLowerCase(Locale.ROOT));
            return;
        }
        m = ALTER_COLUMN_TYPE.matcher(action);
        if (m.find()) {
            cols.put(m.group(1).toLowerCase(Locale.ROOT), m.group(2).trim());
            return;
        }
        m = RENAME_COLUMN.matcher(action);
        if (m.find()) {
            String old = m.group(1).toLowerCase(Locale.ROOT);
            if (cols.containsKey(old)) {
                cols.put(m.group(2).toLowerCase(Locale.ROOT), cols.remove(old));
            }
            return;
        }
        m = RENAME_TABLE.matcher(action);
        if (m.find()) {
            schema.put(m.group(1).toLowerCase(Locale.ROOT), schema.remove(table));
        }
    }

    /** {@code V2_10__x.sql} → 정렬 키(major*10000+minor) */
    private static Integer versionKey(Path p) {
        Matcher m = Pattern.compile("V(\\d+)_(\\d+)__").matcher(p.getFileName().toString());
        return m.find() ? Integer.parseInt(m.group(1)) * 10000 + Integer.parseInt(m.group(2)) : 0;
    }

    /** {@code --} 라인 주석과 블록 주석 제거(문자열 리터럴 내부는 보존) */
    private static String stripSqlComments(String sql) {
        StringBuilder out = new StringBuilder(sql.length());
        int i = 0;
        while (i < sql.length()) {
            char c = sql.charAt(i);
            if (c == '\'') {
                int j = i + 1;
                while (j < sql.length() && sql.charAt(j) != '\'') {
                    j++;
                }
                out.append(sql, i, Math.min(j + 1, sql.length()));
                i = j + 1;
                continue;
            }
            if (c == '-' && i + 1 < sql.length() && sql.charAt(i + 1) == '-') {
                while (i < sql.length() && sql.charAt(i) != '\n') {
                    i++;
                }
                continue;
            }
            if (c == '/' && i + 1 < sql.length() && sql.charAt(i + 1) == '*') {
                int close = sql.indexOf("*/", i + 2);
                i = (close < 0) ? sql.length() : close + 2;
                out.append(' ');
                continue;
            }
            out.append(c);
            i++;
        }
        return out.toString();
    }

    /** 세미콜론 기준 문장 분해(괄호·문자열 리터럴 내부 무시) */
    private static List<String> splitStatements(String sql) {
        List<String> out = new ArrayList<>();
        int depth = 0;
        StringBuilder cur = new StringBuilder();
        for (int i = 0; i < sql.length(); i++) {
            char c = sql.charAt(i);
            if (c == '\'') {
                int j = i + 1;
                while (j < sql.length() && sql.charAt(j) != '\'') {
                    j++;
                }
                cur.append(sql, i, Math.min(j + 1, sql.length()));
                i = j;
                continue;
            }
            // 달러 인용($tag$ … $tag$) 은 통째로 보존 — 내부 세미콜론에서 잘리면 DO 블록이 파편화된다
            if (c == '$') {
                Matcher tag = DOLLAR_TAG.matcher(sql).region(i, sql.length());
                if (tag.lookingAt()) {
                    String close = tag.group();
                    int end = sql.indexOf(close, tag.end());
                    int stop = (end < 0) ? sql.length() : end + close.length();
                    cur.append(sql, i, stop);
                    i = stop - 1;
                    continue;
                }
            }
            if (c == '(') {
                depth++;
            } else if (c == ')') {
                depth--;
            } else if (c == ';' && depth <= 0) {
                out.add(cur.toString());
                cur.setLength(0);
                continue;
            }
            cur.append(c);
        }
        out.add(cur.toString());
        return out;
    }

    /** 최상위 콤마 분리(괄호 내부 무시) */
    private static List<String> splitTopLevel(String body) {
        List<String> out = new ArrayList<>();
        int depth = 0;
        StringBuilder cur = new StringBuilder();
        for (int i = 0; i < body.length(); i++) {
            char c = body.charAt(i);
            if (c == '(') {
                depth++;
            } else if (c == ')') {
                depth--;
            } else if (c == ',' && depth == 0) {
                out.add(cur.toString());
                cur.setLength(0);
                continue;
            }
            cur.append(c);
        }
        out.add(cur.toString());
        return out;
    }

    private static Path resolveMigrationDir() {
        Path fromModule = Paths.get(MIGRATION_PATH);
        if (Files.exists(fromModule)) {
            return fromModule;
        }
        Path fromRoot = Paths.get("api-server", MIGRATION_PATH);
        if (Files.exists(fromRoot)) {
            return fromRoot;
        }
        fail("게이트 무결성 파손: 마이그레이션 디렉토리를 찾을 수 없습니다 (workingDir="
                + Paths.get("").toAbsolutePath() + "). 조용한 skip 은 false-green 을 만듭니다.");
        return fromModule; // unreachable
    }
}
