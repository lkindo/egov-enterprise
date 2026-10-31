package nuri.api.harness;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * 생산 코드의 SQL 문자열에서 PostgreSQL 전용 구문을 막는 게이트(ADR-0047).
 *
 * <p>[왜 필요한가] 다른 DB 로 생성할 때 실패는 벤더 실행으로만 드러난다. 그중 일부는 조용하다 — {@code file_url = '...' || ?} 는
 * MySQL·MariaDB 에서 논리 OR 이라 모든 행과 일치해 공유 첨부 판정이 뚫린다. 구문이 포트 밖으로 새지 않게 여기서 막는다.
 *
 * <p>[규칙] 문자열 리터럴·텍스트 블록만 본다. 주석과 Java 의 {@code ||}·{@code ::} 는 보지 않는다. 벤더 구문은 포트 구현과
 * {@code config/governance/vendor-sql-ledger.json} 의 {@code frozen} 위치에서만 허용한다. {@code frozen} 은 파일·규칙별 개수가 정확히
 * 같아야 해서, 늘어도 줄어도 빨갛다(H2). 줄었으면 원장에서 지운다.
 *
 * <p>[생성물] 기능을 뺀 생성물에서는 남은 소스의 항목만 대조한다({@link ReusableHarnessProfile#retainsSource}).
 *
 * <p>[한계] 이 게이트는 구문만 막는다. 이식 판정은 벤더 DB 실행으로 한다. 같은 구문이라도 문자열을 쪼개 이어 붙이면 보지 못하고,
 * 원장의 대응 시험은 파일이 있는지만 본다. 그 시험이 그 코드를 실행하는지는 사람이 판정한다.
 */
@Tag("governance-harness")
class VendorSqlPortabilityLinterTest {

    private static final Path LEDGER = Path.of("config/governance/vendor-sql-ledger.json");
    private static final Path TEST_LEDGER = Path.of("config/governance/vendor-test-ledger.json");
    private static final List<String> MODULES = List.of("foundation", "business-core", "business-app", "api-server");
    private static final Set<String> TREATMENTS = Set.of("port", "hibernate", "portable-rewrite", "portable-as-is",
            "postgresql-only", "deferred");
    private static final Set<String> TEST_CATEGORIES = Set.of("as-is", "fixture-port", "replacement");

    private record Rule(String id, Pattern pattern) {
        static Rule of(String id, String regex) {
            return new Rule(id, Pattern.compile(regex));
        }
    }

    private static final List<Rule> RULES = List.of(
            Rule.of("cast-operator", "(?i)[\\w)'\"?\\]]\\s*::\\s*(text|int|int2|int4|int8|integer|smallint|bigint|bool|boolean"
                    + "|varchar|char|bpchar|numeric|decimal|real|float4|float8|double|json|jsonb|uuid|inet|bytea|interval"
                    + "|date|time|timestamp|timestamptz|regclass|regtype)\\b"),
            Rule.of("pg-function", "(?i)\\bpg_[a-z_]+|\\b(set_config|current_setting|to_regclass|to_regprocedure"
                    + "|bool_or|bool_and|string_agg|array_agg|unnest|generate_series|date_trunc|jsonb?_[a-z_]+)\\s*\\("),
            Rule.of("on-conflict", "(?i)\\bON\\s+CONFLICT\\b"),
            Rule.of("skip-locked", "(?i)\\bSKIP\\s+LOCKED\\b"),
            Rule.of("no-key-update", "(?i)\\bFOR\\s+NO\\s+KEY\\s+UPDATE\\b"),
            Rule.of("set-local", "(?i)\\bSET\\s+LOCAL\\b"),
            Rule.of("date-format", "(?i)\\bto_(char|date|timestamp)\\s*\\("),
            Rule.of("position", "(?i)\\bPOSITION\\s*\\("),
            Rule.of("ilike", "(?i)\\bILIKE\\b"),
            Rule.of("catalog", "(?i)\\binformation_schema\\."),
            Rule.of("select-exists", "(?i)\\bSELECT\\s+EXISTS\\b"),
            Rule.of("limit", "(?i)\\bLIMIT\\s+[?:\\d]"),
            Rule.of("nulls-order", "(?i)\\bNULLS\\s+(FIRST|LAST)\\b"),
            Rule.of("string-concat", "\\|\\|"),
            Rule.of("vendor-cast", "(?i)\\bCAST\\s*\\([^)]*\\bAS\\s+(varchar|timestamp)\\b"),
            Rule.of("upper-table", "\\b(?i:FROM|INTO|UPDATE|JOIN|TABLE)\\s+TB_[A-Z_]+"),
            Rule.of("empty-string-compare", "(?<![A-Za-z0-9_ ]IS NULL OR )(?<!\\w):\\w+\\s*=\\s*''"));

    private static Pattern rule(String id) {
        return RULES.stream().filter(rule -> rule.id().equals(id)).findFirst().orElseThrow().pattern();
    }

    private static final Pattern UNICODE_ESCAPE = Pattern.compile("(?<!\\\\)((?:\\\\\\\\)*)\\\\u+([0-9a-fA-F]{4})");

    private record Literal(String relativePath, String text) { }

    private record Frozen(String path, String rule, int count) { }

    @Test
    @DisplayName("벤더 구문은 포트 구현과 원장의 동결 위치에만 있다")
    void vendorSyntaxStaysBehindThePort() throws IOException {
        Path root = HarnessSourceIndex.repoRoot();
        JsonNode ledger = readJson(root.resolve(LEDGER));
        Set<String> ports = new TreeSet<>();
        ledger.path("portImplementations").forEach(node -> ports.add(node.asString()));
        Map<String, Integer> frozen = new TreeMap<>();
        for (Frozen entry : frozenEntries(ledger)) {
            if (ReusableHarnessProfile.current().retainsSource(entry.path())) {
                frozen.put(entry.path() + "#" + entry.rule(), entry.count());
            }
        }

        Map<String, Integer> found = new TreeMap<>();
        for (Literal literal : literals(root)) {
            if (ports.contains(literal.relativePath())) {
                continue;
            }
            for (Rule rule : RULES) {
                int hits = countHits(rule.pattern(), literal.text());
                if (hits > 0) {
                    found.merge(literal.relativePath() + "#" + rule.id(), hits, Integer::sum);
                }
            }
        }

        assertThat(found)
                .as("포트 밖의 벤더 구문이다. VendorSqlDialect 로 옮기거나 HQL 로 쓰고, 정말 벤더 전용이면 원장에 사유와 함께 적는다."
                        + " 줄었으면 원장의 개수를 낮추거나 항목을 지운다(H2).")
                .isEqualTo(frozen);
    }

    @Test
    @DisplayName("원장 항목은 실제 파일·규칙·처리 방식·대응 시험을 가리킨다")
    void ledgerEntriesPointAtRealThings() throws IOException {
        Path root = HarnessSourceIndex.repoRoot();
        JsonNode ledger = readJson(root.resolve(LEDGER));
        ReusableHarnessProfile profile = ReusableHarnessProfile.current();
        ledger.path("portImplementations").forEach(node ->
                assertThat(root.resolve(node.asString())).as("포트 구현").isRegularFile());
        for (JsonNode entry : ledger.path("locations")) {
            String path = entry.path("path").asString();
            assertThat(entry.path("treatment").asString()).as(entry.toString()).isIn(TREATMENTS);
            assertThat(entry.path("reason").asString()).as("사유 " + entry).isNotBlank();
            assertThat(entry.path("test").asString()).as("대응 시험 " + entry).isNotBlank();
            if (Set.of("postgresql-only", "deferred").contains(entry.path("treatment").asString())) {
                assertThat(entry.path("stage").asInt(-1)).as("넘길 단계 " + entry).isPositive();
            }
            if (profile.retainsSource(path)) {
                assertThat(root.resolve(path)).as("위치").isRegularFile();
            }
            if (!profile.projected()) {
                assertThat(root.resolve(entry.path("test").asString())).as("대응 시험 " + entry).isRegularFile();
            }
        }
        for (Frozen entry : frozenEntries(ledger)) {
            assertThat(RULES).as("규칙 " + entry).extracting(Rule::id).contains(entry.rule());
            assertThat(entry.count()).as("개수 " + entry).isPositive();
        }
    }

    @Test
    @DisplayName("schema-validation 시험은 벤더 이식 분류가 빠짐없이 있다")
    void everySchemaTestIsClassified() throws IOException {
        Path root = HarnessSourceIndex.repoRoot();
        JsonNode ledger = readJson(root.resolve(TEST_LEDGER));
        Set<String> classified = new TreeSet<>();
        for (JsonNode entry : ledger.path("tests")) {
            classified.add(entry.path("test").asString());
            assertThat(entry.path("category").asString()).as(entry.toString()).isIn(TEST_CATEGORIES);
            assertThat(entry.path("reason").asString()).as("분류 사유 " + entry).isNotBlank();
        }
        Set<String> actual = new TreeSet<>();
        for (Path path : HarnessSourceIndex.filesUnder(root.resolve("api-server/src/test/java/nuri/api/schema"), 1)) {
            String name = path.getFileName().toString();
            if (name.endsWith("Test.java")) {
                actual.add(name);
            }
        }
        if (ReusableHarnessProfile.current().projected()) {
            assertThat(classified).as("생성물은 시험이 줄어도 새 시험은 분류돼야 한다").containsAll(actual);
        } else {
            assertThat(classified).as("원장에 없는 시험이 벤더 검증에서 조용히 빠지지 않게 한다").isEqualTo(actual);
        }
    }

    @ParameterizedTest(name = "{0}")
    @CsvSource(delimiter = ';', quoteCharacter = '"', value = {
        "cast-operator;SELECT menu_sn::text FROM t",
        "cast-operator;SELECT menu_sn::TEXT FROM t",
        "cast-operator;WHERE a = ?::uuid",
        "cast-operator;SELECT a :: timestamptz FROM t",
        "pg-function;SELECT pg_advisory_xact_lock(?)",
        "pg-function;SELECT PG_ADVISORY_XACT_LOCK(?)",
        "pg-function;SELECT set_config('a', 'on', true)",
        "pg-function;HAVING bool_or(a = 'x')",
        "pg-function;SELECT string_agg(a, ',') FROM t",
        "pg-function;SELECT jsonb_build_object('a', 1)",
        "on-conflict;INSERT INTO t VALUES (1) ON CONFLICT DO NOTHING",
        "skip-locked;SELECT * FROM t FOR UPDATE SKIP LOCKED",
        "no-key-update;SELECT * FROM t FOR NO KEY UPDATE",
        "set-local;SET LOCAL lock_timeout = '2s'",
        "date-format;SELECT TO_CHAR(a, 'YYYY') FROM t",
        "position;WHERE POSITION(:k IN a)>0",
        "ilike;WHERE a ILIKE ?",
        "catalog;SELECT count(*) FROM information_schema.tables",
        "select-exists;SELECT EXISTS (SELECT 1 FROM t)",
        "limit;SELECT a FROM t LIMIT ? OFFSET ?",
        "nulls-order;ORDER BY a NULLS LAST",
        "string-concat;file_url = '/api/' || ?",
        "string-concat;SELECT file_url || file_url FROM t",
        "vendor-cast;CAST(:a AS TIMESTAMP)",
        "upper-table;DELETE FROM TB_LOGIN_LOG WHERE a = 1",
        "upper-table;delete from TB_LOGIN_LOG where a = 1",
        "empty-string-compare;WHERE :keyword = '' OR a = 1",
    })
    @DisplayName("규칙은 실제 위반 문장에서 빨갛다")
    void rulesFireOnRealViolations(String rule, String sql) {
        assertThat(countHits(rule(rule), sql)).isPositive();
    }

    @ParameterizedTest(name = "{0}")
    @CsvSource(delimiter = ';', quoteCharacter = '"', value = {
        "empty-string-compare;(:keyword IS NULL OR :keyword = '' OR a LIKE ?)",
        "limit;조회 상한은 limit 값으로 정한다",
        "cast-operator;nuri.Foo::bar",
        "upper-table;DELETE FROM tb_login_log WHERE a = 1",
        "vendor-cast;CAST(a AS bigint)",
    })
    @DisplayName("이식 가능한 문장에서는 울리지 않는다")
    void rulesStayQuietOnPortableText(String rule, String text) {
        assertThat(countHits(rule(rule), text)).isZero();
    }

    @Test
    @DisplayName("문자열 추출은 주석·문자 리터럴을 건너뛰고 이스케이프와 텍스트 블록을 읽는다")
    void literalScannerReadsOnlyStrings() {
        String source = """
                // "SELECT a::text"
                /* "FOR NO KEY UPDATE" */
                char quote = '"';
                String a = "x \\" y";
                String b = \"\"\"
                    SELECT 1
                    \"\"\";
                boolean c = d || e;
                """;
        assertThat(stringLiterals(source)).containsExactly("x \" y", "\n    SELECT 1\n    ");
    }

    @Test
    @DisplayName("문자열은 런타임 값으로 읽는다 — 이스케이프로 쓴 벤더 구문도 잡는다")
    void literalScannerDecodesEscapes() {
        String source = """
                String a = "INSERT INTO t VALUES (1) ON\\nCONFLICT DO NOTHING";
                String b = "SELECT 1 FOR\\u0020NO\\tKEY UPDATE";
                String c = "\\\\u0041";
                String d = \"\"\"
                    a \\\"\"\" b
                    \"\"\";
                """;
        List<String> literals = stringLiterals(source);

        assertThat(literals).hasSize(4);
        assertThat(countHits(rule("on-conflict"), literals.get(0))).isPositive();
        assertThat(countHits(rule("no-key-update"), literals.get(1))).isPositive();
        assertThat(literals.get(2)).isEqualTo("\\u0041");
        assertThat(literals.get(3)).contains("a \"\"\" b");
    }

    private static int countHits(Pattern pattern, String text) {
        Matcher matcher = pattern.matcher(text);
        int hits = 0;
        while (matcher.find()) {
            hits++;
        }
        return hits;
    }

    private static List<Frozen> frozenEntries(JsonNode ledger) {
        List<Frozen> entries = new ArrayList<>();
        for (JsonNode location : ledger.path("locations")) {
            location.path("frozen").properties().forEach(rule ->
                    entries.add(new Frozen(location.path("path").asString(), rule.getKey(), rule.getValue().asInt())));
        }
        return entries;
    }

    private static JsonNode readJson(Path path) throws IOException {
        return JsonMapper.builder().build().readTree(HarnessSourceIndex.read(path));
    }

    private static List<Literal> literals(Path root) throws IOException {
        List<Literal> literals = new ArrayList<>();
        for (Path source : HarnessSourceIndex.productionJavaSources(MODULES.toArray(String[]::new))) {
            String relative = root.relativize(source).toString().replace('\\', '/');
            String text = HarnessSourceIndex.read(source).replace("\r\n", "\n");
            stringLiterals(text).forEach(literal -> literals.add(new Literal(relative, literal)));
        }
        return literals;
    }

    /** 주석·문자 리터럴을 건너뛰고 문자열 리터럴과 텍스트 블록의 내용만 뽑는다. */
    static List<String> stringLiterals(String source) {
        List<String> literals = new ArrayList<>();
        int index = 0;
        while (index < source.length()) {
            if (source.startsWith("//", index)) {
                int end = source.indexOf('\n', index);
                index = end < 0 ? source.length() : end;
            } else if (source.startsWith("/*", index)) {
                int end = source.indexOf("*/", index + 2);
                index = end < 0 ? source.length() : end + 2;
            } else if (source.startsWith("\"\"\"", index)) {
                int end = closingTextBlock(source, index + 3);
                literals.add(runtimeValue(source.substring(index + 3, end)));
                index = end + 3;
            } else if (source.charAt(index) == '"' || source.charAt(index) == '\'') {
                char quote = source.charAt(index);
                int end = closingQuote(source, index + 1, quote);
                if (quote == '"') {
                    literals.add(runtimeValue(source.substring(index + 1, end)));
                }
                index = end + 1;
            } else {
                index++;
            }
        }
        return literals;
    }

    /** 실행될 때의 문자열로 푼다. {@code "ON\nCONFLICT"} 는 소스에서는 공백이 없지만 실행되면 유효한 문장이다. */
    private static String runtimeValue(String literal) {
        return UNICODE_ESCAPE.matcher(literal).replaceAll(escape -> Matcher.quoteReplacement(
                escape.group(1) + (char) Integer.parseInt(escape.group(2), 16))).translateEscapes();
    }

    private static int closingTextBlock(String source, int from) {
        int index = from;
        while (!source.startsWith("\"\"\"", index)) {
            index += source.charAt(index) == '\\' ? 2 : 1;
        }
        return index;
    }

    private static int closingQuote(String source, int from, char quote) {
        int index = from;
        while (source.charAt(index) != quote) {
            index += source.charAt(index) == '\\' ? 2 : 1;
        }
        return index;
    }
}
