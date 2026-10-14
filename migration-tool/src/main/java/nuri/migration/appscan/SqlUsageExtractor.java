package nuri.migration.appscan;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * SQL 문 하나에서 정적으로 보이는 컬럼 사용처를 찾는다(레거시 표준화 설계 §4.1 사용처 근거). 파서가 아니라 패턴이다 —
 * 놓치는 사용처가 있고, 그래서 산출물은 "사용처 없음" 을 판정하지 않는다.
 *
 * <p>찾는 것: SELECT 별칭, 조인 조건, 문자열 리터럴 비교·IN 목록, CASE·DECODE 의 코드 값과 라벨, INSERT·UPDATE 에서
 * 넣는 현재 시각 함수, MyBatis·iBATIS 파라미터 바인딩. 별칭으로 테이블을 정할 수 있거나 문에 테이블이 하나뿐이면
 * 그 테이블을 붙인다.</p>
 */
final class SqlUsageExtractor {

    private static final Set<String> KEYWORDS = Set.of(
            "SELECT", "FROM", "WHERE", "AND", "OR", "NOT", "ON", "WHEN", "THEN", "ELSE", "END", "CASE", "AS",
            "SET", "VALUES", "LIKE", "IS", "NULL", "IN", "JOIN", "LEFT", "RIGHT", "INNER", "OUTER", "FULL", "CROSS",
            "GROUP", "ORDER", "BY", "HAVING", "UNION", "ALL", "DISTINCT", "INTO", "UPDATE", "DELETE", "INSERT",
            "EXISTS", "BETWEEN", "ROWNUM", "DUAL", "WITH", "LIMIT", "OFFSET", "TOP");
    private static final String IDENT = "[A-Za-z_][A-Za-z0-9_$#]*";
    private static final String QUALIFIED = "(?:(" + IDENT + ")\\.)?(" + IDENT + ")";
    private static final Pattern BLOCK_COMMENT = Pattern.compile("/\\*(?!\\+).*?\\*/", Pattern.DOTALL);
    private static final Pattern LINE_COMMENT = Pattern.compile("--[^\\n]*");
    private static final Pattern TABLE_SOURCE = Pattern.compile(
            "(?i)\\b(FROM|JOIN|INTO|UPDATE)\\s+(" + IDENT + "(?:\\." + IDENT + ")?)(?:\\s+(?:AS\\s+)?(" + IDENT + "))?");
    private static final Pattern FROM_LIST = Pattern.compile(
            "(?is)\\bFROM\\s+(.+?)(?=\\bWHERE\\b|\\bGROUP\\b|\\bORDER\\b|\\bHAVING\\b|\\bUNION\\b|\\bJOIN\\b"
                    + "|\\bLEFT\\b|\\bRIGHT\\b|\\bINNER\\b|\\bCONNECT\\b|\\bSTART\\b|\\)|;|$)");
    private static final Pattern JOIN = Pattern.compile(
            "(" + IDENT + ")\\.(" + IDENT + ")\\s*=\\s*(" + IDENT + ")\\.(" + IDENT + ")");
    private static final Pattern LITERAL_COMPARE = Pattern.compile(
            QUALIFIED + "\\s*(?:=|<>|!=)\\s*'([^'\\n]{0,40})'");
    private static final Pattern IN_LIST = Pattern.compile(
            "(?i)" + QUALIFIED + "\\s+(?:NOT\\s+)?IN\\s*\\(\\s*('[^'\\n]{0,40}'(?:\\s*,\\s*'[^'\\n]{0,40}')*)\\s*\\)");
    private static final Pattern QUOTED = Pattern.compile("'([^'\\n]{0,60})'");
    private static final Pattern SEARCHED_CASE = Pattern.compile(
            "(?i)\\bWHEN\\s+" + QUALIFIED + "\\s*=\\s*'([^'\\n]{0,40})'\\s+THEN\\s+'([^'\\n]{0,60})'");
    private static final Pattern SIMPLE_CASE = Pattern.compile(
            "(?is)\\bCASE\\s+" + QUALIFIED + "\\s+((?:WHEN\\s+'[^'\\n]{0,40}'\\s+THEN\\s+'[^'\\n]{0,60}'\\s*)+)");
    private static final Pattern SIMPLE_CASE_ARM = Pattern.compile(
            "(?i)WHEN\\s+'([^'\\n]{0,40})'\\s+THEN\\s+'([^'\\n]{0,60})'");
    private static final Pattern DECODE = Pattern.compile("(?i)\\bDECODE\\s*\\(\\s*" + QUALIFIED + "\\s*,");
    private static final Pattern INSERT = Pattern.compile(
            "(?is)\\bINSERT\\s+INTO\\s+(" + IDENT + "(?:\\." + IDENT + ")?)\\s*\\(([^()]*)\\)\\s*VALUES\\s*\\(");
    private static final Pattern UPDATE_SET = Pattern.compile(
            "(?is)\\bUPDATE\\s+(" + IDENT + "(?:\\." + IDENT + ")?)(?:\\s+" + IDENT + ")?\\s+SET\\s+(.+?)"
                    + "(?=\\bWHERE\\b|$)");
    private static final Pattern BINDING_COMPARE = Pattern.compile(
            "(?i)" + QUALIFIED + "\\s*(?:=|<>|!=|<=|>=|<|>|\\bLIKE\\b)\\s*(?:[^#$\\s]*\\|\\|\\s*)?"
                    + "(?:#\\{\\s*(" + IDENT + ")|#(" + IDENT + ")#)");
    private static final Pattern BINDING_VALUE = Pattern.compile(
            "^(?:#\\{\\s*(" + IDENT + ")[^}]*}|#(" + IDENT + ")(?::[A-Z]+)?#)$");
    private static final Pattern CURRENT_TIME = Pattern.compile(
            "(?i)^(SYSDATE|SYSTIMESTAMP|NOW\\s*\\(\\s*\\)|CURRENT_TIMESTAMP(?:\\s*\\(\\s*\\))?|CURRENT_DATE"
                    + "|GETDATE\\s*\\(\\s*\\)|LOCALTIMESTAMP|TO_CHAR\\s*\\(\\s*SYSDATE\\b.*)$");
    private static final Pattern SELECT_LIST = Pattern.compile("(?is)\\bSELECT\\s+(?:DISTINCT\\s+)?(.+?)\\bFROM\\b");
    private static final Pattern ALIAS_ITEM = Pattern.compile(
            "(?i)^" + QUALIFIED + "\\s+(?:AS\\s+)?\"?(" + IDENT + ")\"?$");

    private final UsageCollector collector;

    SqlUsageExtractor(UsageCollector collector) {
        this.collector = collector;
    }

    /** {@code baseLine} 은 SQL 이 파일에서 시작하는 줄이다. 찾은 위치까지의 줄바꿈 수를 더해 줄 번호를 정한다. */
    void extract(String rawSql, String path, int baseLine) {
        String sql = SourceText.blank(rawSql, BLOCK_COMMENT, LINE_COMMENT);
        Map<String, String> aliases = new HashMap<>();
        Set<String> tables = new LinkedHashSet<>();
        collectTables(sql, aliases, tables);
        tables.forEach(table -> collector.table(table, path));
        String single = tables.size() == 1 ? tables.iterator().next() : null;
        Context context = new Context(collector, sql, path, baseLine, aliases, single);

        selectAliases(context);
        Matcher join = JOIN.matcher(sql);
        while (join.find()) {
            String left = table(context, join.group(1));
            String right = table(context, join.group(3));
            context.column(join.group(2), "SQL_JOIN", join.start(), left, null,
                    qualifiedName(right, join.group(3), join.group(4)), null, null);
            context.column(join.group(4), "SQL_JOIN", join.start(), right, null,
                    qualifiedName(left, join.group(1), join.group(2)), null, null);
        }
        Matcher compare = LITERAL_COMPARE.matcher(sql);
        while (compare.find()) {
            if (!keyword(compare.group(2)) && !insideCase(sql, compare.start())) {
                context.column(compare.group(2), "SQL_LITERAL", compare.start(),
                        table(context, compare.group(1)), null, null, compare.group(3), null);
            }
        }
        Matcher in = IN_LIST.matcher(sql);
        while (in.find()) {
            if (keyword(in.group(2))) {
                continue;
            }
            Matcher literal = QUOTED.matcher(in.group(3));
            while (literal.find()) {
                context.column(in.group(2), "SQL_LITERAL", in.start(), table(context, in.group(1)), null, null,
                        literal.group(1), null);
            }
        }
        caseLabels(context);
        bindings(context);
        inserts(context);
        updates(context);
    }

    private void selectAliases(Context context) {
        Matcher select = SELECT_LIST.matcher(context.sql());
        while (select.find()) {
            for (String item : splitTopLevel(select.group(1))) {
                Matcher alias = ALIAS_ITEM.matcher(item.strip());
                if (alias.matches() && !keyword(alias.group(2)) && !keyword(alias.group(3))
                        && !alias.group(2).equalsIgnoreCase(alias.group(3))) {
                    context.column(alias.group(2), "SQL_SELECT_ALIAS", select.start(1),
                            table(context, alias.group(1)), null, alias.group(3), null, null);
                }
            }
        }
    }

    private void caseLabels(Context context) {
        String sql = context.sql();
        Matcher searched = SEARCHED_CASE.matcher(sql);
        while (searched.find()) {
            context.column(searched.group(2), "SQL_CASE", searched.start(), table(context, searched.group(1)),
                    null, null, searched.group(3), searched.group(4));
        }
        Matcher simple = SIMPLE_CASE.matcher(sql);
        while (simple.find()) {
            Matcher arm = SIMPLE_CASE_ARM.matcher(simple.group(3));
            while (arm.find()) {
                context.column(simple.group(2), "SQL_CASE", simple.start(), table(context, simple.group(1)),
                        null, null, arm.group(1), arm.group(2));
            }
        }
        Matcher decode = DECODE.matcher(sql);
        while (decode.find()) {
            String arguments = closingArguments(sql, decode.end());
            if (arguments == null) {
                continue;
            }
            List<String> parts = splitTopLevel(arguments);
            for (int index = 0; index + 1 < parts.size(); index += 2) {
                String value = quoted(parts.get(index));
                String label = quoted(parts.get(index + 1));
                if (value != null && label != null) {
                    context.column(decode.group(2), "SQL_CASE", decode.start(), table(context, decode.group(1)),
                            null, null, value, label);
                }
            }
        }
    }

    private void bindings(Context context) {
        Matcher binding = BINDING_COMPARE.matcher(context.sql());
        while (binding.find()) {
            if (!keyword(binding.group(2))) {
                String property = binding.group(3) != null ? binding.group(3) : binding.group(4);
                context.column(binding.group(2), "SQL_BINDING", binding.start(), table(context, binding.group(1)),
                        null, property, null, null);
            }
        }
    }

    private void inserts(Context context) {
        Matcher insert = INSERT.matcher(context.sql());
        while (insert.find()) {
            String values = closingArguments(context.sql(), insert.end());
            if (values == null) {
                continue;
            }
            List<String> columns = splitTopLevel(insert.group(2));
            List<String> expressions = splitTopLevel(values);
            if (columns.size() != expressions.size()) {
                continue;
            }
            String table = insert.group(1);
            for (int index = 0; index < columns.size(); index++) {
                assignment(context, columns.get(index).strip(), expressions.get(index).strip(), table,
                        insert.start());
            }
        }
    }

    private void updates(Context context) {
        Matcher update = UPDATE_SET.matcher(context.sql());
        while (update.find()) {
            for (String item : splitTopLevel(update.group(2))) {
                int equals = item.indexOf('=');
                if (equals > 0) {
                    String column = item.substring(0, equals).strip();
                    int dot = column.lastIndexOf('.');
                    assignment(context, dot >= 0 ? column.substring(dot + 1) : column,
                            item.substring(equals + 1).strip(), update.group(1), update.start());
                }
            }
        }
    }

    private void assignment(Context context, String column, String expression, String table, int offset) {
        if (!column.matches(IDENT) || keyword(column)) {
            return;
        }
        if (CURRENT_TIME.matcher(expression).matches()) {
            context.column(column, "SQL_CURRENT_TIME", offset, table, null,
                    expression.replaceAll("\\s+", " ").split("[ (]")[0].toUpperCase(Locale.ROOT), null, null);
            return;
        }
        Matcher binding = BINDING_VALUE.matcher(expression);
        if (binding.matches()) {
            context.column(column, "SQL_BINDING", offset, table, null,
                    binding.group(1) != null ? binding.group(1) : binding.group(2), null, null);
            return;
        }
        String literal = quoted(expression);
        if (literal != null) {
            context.column(column, "SQL_LITERAL", offset, table, null, null, literal, null);
        }
    }

    private void collectTables(String sql, Map<String, String> aliases, Set<String> tables) {
        Matcher source = TABLE_SOURCE.matcher(sql);
        while (source.find()) {
            String table = source.group(2);
            if (keyword(table) || table.equalsIgnoreCase("DUAL")) {
                continue;
            }
            tables.add(table.toUpperCase(Locale.ROOT));
            String alias = source.group(3);
            if (alias != null && !keyword(alias)) {
                aliases.put(alias.toUpperCase(Locale.ROOT), table.toUpperCase(Locale.ROOT));
            }
        }
        Matcher from = FROM_LIST.matcher(sql);
        while (from.find()) {
            for (String item : splitTopLevel(from.group(1))) {
                String[] words = item.strip().split("\\s+");
                if (words.length == 0 || !words[0].matches(IDENT + "(?:\\." + IDENT + ")?") || keyword(words[0])) {
                    continue;
                }
                String table = words[0].toUpperCase(Locale.ROOT);
                if (table.equals("DUAL")) {
                    continue;
                }
                tables.add(table);
                String alias = words.length >= 3 && words[1].equalsIgnoreCase("AS") ? words[2]
                        : words.length >= 2 ? words[1] : null;
                if (alias != null && alias.matches(IDENT) && !keyword(alias)) {
                    aliases.put(alias.toUpperCase(Locale.ROOT), table);
                }
            }
        }
    }

    private static String table(Context context, String qualifier) {
        if (qualifier == null) {
            return context.single();
        }
        String upper = qualifier.toUpperCase(Locale.ROOT);
        return context.aliases().getOrDefault(upper, upper);
    }

    private static String qualifiedName(String table, String qualifier, String column) {
        return (table != null ? table : qualifier.toUpperCase(Locale.ROOT)) + "." + column.toUpperCase(Locale.ROOT);
    }

    private static boolean keyword(String word) {
        return word != null && KEYWORDS.contains(word.toUpperCase(Locale.ROOT));
    }

    /** CASE 의 {@code WHEN col = 'A'} 는 {@code SQL_CASE} 가 라벨과 함께 남기므로 리터럴 비교로 다시 세지 않는다. */
    private static boolean insideCase(String sql, int start) {
        String before = sql.substring(Math.max(0, start - 6), start).toUpperCase(Locale.ROOT);
        return before.matches("(?s).*\\b(?:WHEN|THEN)\\s*");
    }

    private static String quoted(String expression) {
        String trimmed = expression.strip();
        Matcher literal = Pattern.compile("^'([^'\\n]{0,60})'$").matcher(trimmed);
        return literal.matches() ? literal.group(1) : null;
    }

    /** 여는 괄호 바로 뒤 위치에서 짝이 맞는 닫는 괄호까지의 안쪽을 돌려준다. 문자열 리터럴 안의 괄호는 세지 않는다. */
    private static String closingArguments(String sql, int afterOpen) {
        int depth = 1;
        boolean quoted = false;
        for (int index = afterOpen; index < sql.length(); index++) {
            char current = sql.charAt(index);
            if (current == '\'') {
                quoted = !quoted;
            } else if (!quoted && current == '(') {
                depth++;
            } else if (!quoted && current == ')') {
                depth--;
                if (depth == 0) {
                    return sql.substring(afterOpen, index);
                }
            }
        }
        return null;
    }

    /** 괄호·문자열 밖의 쉼표로 나눈다. */
    static List<String> splitTopLevel(String text) {
        List<String> parts = new ArrayList<>();
        int depth = 0;
        boolean quoted = false;
        int start = 0;
        for (int index = 0; index < text.length(); index++) {
            char current = text.charAt(index);
            if (current == '\'') {
                quoted = !quoted;
            } else if (!quoted && (current == '(' || current == '{')) {
                depth++;
            } else if (!quoted && (current == ')' || current == '}')) {
                depth = Math.max(0, depth - 1);
            } else if (!quoted && depth == 0 && current == ',') {
                parts.add(text.substring(start, index));
                start = index + 1;
            }
        }
        parts.add(text.substring(start));
        return parts;
    }
    private record Context(UsageCollector collector, String sql, String path, int baseLine,
                           Map<String, String> aliases, String single) {

        void column(String column, String kind, int offset, String table, String owner, String detail,
                    String value, String label) {
            collector.column(column, kind, path, baseLine + SourceText.lineOf(sql, offset) - 1, table, owner,
                    detail, value, label);
        }
    }
}
