package nuri.migration.appscan;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Java 소스에서 VO 필드(바로 앞 주석을 라벨로), {@code @Column} 이름, 코드 상수·enum, 요청 매핑, 어노테이션·문자열 SQL
 * 을 찾는다. 파서가 아니라 줄 단위 패턴이다. 문자열을 이어 붙여 만든 SQL 은 정적으로 다 보이지 않아 {@code PARTIAL} 이다.
 */
final class JavaSourceReader {

    private static final Set<String> VALUE_TYPES = Set.of(
            "String", "Integer", "int", "Long", "long", "Short", "short", "BigDecimal", "BigInteger", "Double",
            "double", "Float", "float", "Boolean", "boolean", "Character", "char", "Date", "Timestamp",
            "LocalDate", "LocalDateTime", "LocalTime", "OffsetDateTime", "ZonedDateTime", "Instant");
    private static final Pattern TYPE_DECLARATION = Pattern.compile(
            "\\b(class|enum|interface|record)\\s+([A-Za-z_][A-Za-z0-9_]*)");
    private static final Pattern FIELD = Pattern.compile(
            "^\\s*(?:private|protected|public)\\s+(?!static\\b)(?:final\\s+|transient\\s+|volatile\\s+)*"
                    + "([A-Za-z_][A-Za-z0-9_.]*)\\s+([A-Za-z_][A-Za-z0-9_]*)\\s*(?:=[^;]*)?;");
    private static final Pattern STRING_CONSTANT = Pattern.compile(
            "\\bstatic\\s+final\\s+String\\s+([A-Za-z_][A-Za-z0-9_]*)\\s*=\\s*\"((?:[^\"\\\\]|\\\\.){0,60})\"\\s*;");
    private static final Pattern SCALAR_CONSTANT = Pattern.compile(
            "\\bstatic\\s+final\\s+(?:int|Integer|long|Long|char|Character)\\s+([A-Za-z_][A-Za-z0-9_]*)\\s*=\\s*"
                    + "('(?:[^'\\\\]|\\\\.)'|-?\\d{1,12}L?)\\s*;");
    private static final Pattern ENUM_BODY = Pattern.compile(
            "\\benum\\s+([A-Za-z_][A-Za-z0-9_]*)[^{]*\\{([^;}]*)", Pattern.DOTALL);
    private static final Pattern ENUM_CONSTANT = Pattern.compile(
            "^\\s*([A-Z][A-Z0-9_]*)\\s*(?:\\(\\s*\"((?:[^\"\\\\]|\\\\.){0,60})\")?");
    private static final Pattern MAPPING = Pattern.compile(
            "@(?:Request|Get|Post|Put|Delete|Patch)Mapping\\s*\\(\\s*(?:(?:value|path)\\s*=\\s*)?\\{?\\s*\"([^\"]+)\"");
    private static final Pattern COLUMN_ANNOTATION = Pattern.compile(
            "@Column\\s*\\([^)]*\\bname\\s*=\\s*\"([A-Za-z_][A-Za-z0-9_$#]*)\"");
    private static final Pattern SQL_ANNOTATION = Pattern.compile(
            "@(?:Select|Insert|Update|Delete)\\s*\\(\\s*(?:\\{\\s*)?\"((?:[^\"\\\\]|\\\\.)*)\"\\s*(\\+|,|\\)|\\})");
    private static final Pattern SQL_STRING = Pattern.compile(
            "\"\\s*(?i:(SELECT|INSERT\\s+INTO|UPDATE|DELETE\\s+FROM|MERGE\\s+INTO)\\b)((?:[^\"\\\\]|\\\\.)*)\"");
    private static final Pattern LINE_JAVADOC = Pattern.compile("^\\s*/\\*\\*?\\s*(.*?)\\s*\\*/\\s*$");
    private static final Pattern LINE_COMMENT = Pattern.compile("^\\s*//\\s*(.*)$");
    private static final Pattern SENSITIVE_NAME = Pattern.compile(
            "(?i).*(PASSWORD|PASSWD|PWD|SECRET|TOKEN|CREDENTIAL|PRIVATE_?KEY|API_?KEY|ACCESS_?KEY).*");

    private final UsageCollector collector;
    private final SqlUsageExtractor sql;

    JavaSourceReader(UsageCollector collector) {
        this.collector = collector;
        this.sql = new SqlUsageExtractor(collector);
    }

    void read(String text, String path) {
        String[] lines = text.split("\\R", -1);
        String owner = null;
        String pendingLabel = null;
        String pendingColumn = null;
        boolean inJavadoc = false;
        StringBuilder javadoc = new StringBuilder();
        for (int index = 0; index < lines.length; index++) {
            String line = lines[index];
            int number = index + 1;
            String stripped = line.strip();
            if (inJavadoc) {
                int end = stripped.indexOf("*/");
                String body = (end >= 0 ? stripped.substring(0, end) : stripped).replaceFirst("^\\*\\s?", "");
                if (javadoc.isEmpty() && !body.isBlank() && !body.startsWith("@")) {
                    javadoc.append(body.strip());
                }
                if (end >= 0) {
                    inJavadoc = false;
                    pendingLabel = javadoc.isEmpty() ? null : javadoc.toString();
                }
                continue;
            }
            Matcher declaration = TYPE_DECLARATION.matcher(line);
            if (declaration.find() && !stripped.startsWith("//") && !stripped.startsWith("*")) {
                owner = declaration.group(2);
            }
            Matcher oneLine = LINE_JAVADOC.matcher(line);
            if (oneLine.matches()) {
                pendingLabel = firstSentence(oneLine.group(1));
                continue;
            }
            if (stripped.startsWith("/**") || stripped.startsWith("/*")) {
                inJavadoc = true;
                javadoc.setLength(0);
                String body = stripped.replaceFirst("^/\\*\\*?", "").strip();
                if (!body.isBlank() && !body.startsWith("@")) {
                    javadoc.append(body);
                }
                continue;
            }
            Matcher comment = LINE_COMMENT.matcher(line);
            if (comment.matches()) {
                pendingLabel = firstSentence(comment.group(1));
                continue;
            }
            Matcher column = COLUMN_ANNOTATION.matcher(line);
            if (column.find()) {
                pendingColumn = column.group(1);
            }
            Matcher mapping = MAPPING.matcher(line);
            if (mapping.find()) {
                collector.requestPath(path, number, mapping.group(1), "JAVA_MAPPING");
            }
            if (stripped.startsWith("@")) {
                continue;
            }
            constants(line, path, number, owner);
            Matcher field = FIELD.matcher(line);
            if (field.find() && VALUE_TYPES.contains(simpleType(field.group(1)))) {
                String target = pendingColumn != null ? pendingColumn : field.group(2);
                collector.column(target, "VO_FIELD", path, number, null, owner, field.group(2), null,
                        pendingLabel);
            }
            if (!stripped.isEmpty()) {
                pendingLabel = null;
                pendingColumn = null;
            }
        }
        enums(text, path);
        sqlStrings(text, path);
    }

    private void constants(String line, String path, int number, String owner) {
        Matcher string = STRING_CONSTANT.matcher(line);
        if (string.find()) {
            String name = string.group(1);
            collector.constant(path, number, owner, name,
                    SENSITIVE_NAME.matcher(name).matches() ? null : unescape(string.group(2)), "STRING_CONSTANT");
            return;
        }
        Matcher scalar = SCALAR_CONSTANT.matcher(line);
        if (scalar.find()) {
            String name = scalar.group(1);
            collector.constant(path, number, owner, name,
                    SENSITIVE_NAME.matcher(name).matches() ? null : scalar.group(2), "SCALAR_CONSTANT");
        }
    }

    private void enums(String text, String path) {
        Matcher body = ENUM_BODY.matcher(text);
        while (body.find()) {
            int line = SourceText.lineOf(text, body.start(2));
            for (String item : SqlUsageExtractor.splitTopLevel(body.group(2))) {
                Matcher constant = ENUM_CONSTANT.matcher(item);
                if (constant.find()) {
                    collector.constant(path, line, body.group(1), constant.group(1),
                            constant.group(2) == null ? null : unescape(constant.group(2)), "ENUM_CONSTANT");
                }
            }
        }
    }

    /**
     * 어노테이션 SQL 은 그 문자열 하나가 문 전체면 정적으로 다 보인다. 그 밖의 SQL 문자열 리터럴(JDBC DAO 의 문자열
     * 조합)은 실행 시점에 무엇이 붙는지 알 수 없어 {@code PARTIAL} 로 남기고 보이는 부분만 읽는다.
     */
    private void sqlStrings(String text, String path) {
        List<int[]> annotated = new ArrayList<>();
        Matcher annotation = SQL_ANNOTATION.matcher(text);
        while (annotation.find()) {
            annotated.add(new int[] {annotation.start(1), annotation.end(1)});
            if (annotation.group(2).equals("+")) {
                collector.partial(path, "JAVA_CONCATENATED_SQL");
            }
            sql.extract(unescape(annotation.group(1)), path, SourceText.lineOf(text, annotation.start()));
        }
        Matcher literal = SQL_STRING.matcher(text);
        while (literal.find()) {
            int start = literal.start() + 1;
            if (annotated.stream().anyMatch(range -> start >= range[0] && start <= range[1])) {
                continue;
            }
            collector.partial(path, "JAVA_STRING_SQL");
            sql.extract(unescape(literal.group(1) + literal.group(2)), path, SourceText.lineOf(text, literal.start()));
        }
    }

    private static String firstSentence(String text) {
        String stripped = text.strip();
        if (stripped.isEmpty() || stripped.startsWith("@")) {
            return null;
        }
        return stripped;
    }

    private static String simpleType(String type) {
        int dot = type.lastIndexOf('.');
        return dot >= 0 ? type.substring(dot + 1) : type;
    }

    private static String unescape(String value) {
        return value.replace("\\\"", "\"").replace("\\n", " ").replace("\\t", " ").replace("\\\\", "\\");
    }

}
