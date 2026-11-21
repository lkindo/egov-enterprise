package nuri.api.harness;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.assertj.core.api.InstanceOfAssertFactories;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * 이 앱의 모든 날짜와 시각은 한국 표준시다(DEC-OPS-396).
 *
 * <p>[왜 필요한가] 시간대 실수는 시험을 통과한다. 내구 작업과 MFA 가 UTC 벽시계 값을, 나머지가 한국 벽시계 값을 같은 형식의 컬럼에 쌓았고,
 * 시험 데이터가 UTC 날짜로 만들어진 시험은 한국 0시~9시에만 붉어서 낮에 도는 CI 를 지나 main 을 붉혔다.
 *
 * <p>[규칙] 운영 코드는 UTC 를 시각의 기준으로 쓰지 않는다. 순간 값이 필요하면 {@code Instant} 를 쓰고 저장 값과는 {@code ServiceTime} 으로
 * 오간다. 시간대 없는 컬럼에 저장하는 엔티티 필드는 {@code LocalDateTime} 이다. 시간대 없는 컬럼의 시각 타입은 드라이버마다 해석이 달라
 * Oracle 은 읽기를 거부했다(ORA-18716).
 *
 * <p>[시험을 돌리는 JVM] 시험 JVM 은 둘이다 — Gradle Test 태스크와, 그 밖에서 자기 JVM 을 띄우는 변이 시험(PIT). 루트 빌드 파일이 둘을 같은
 * 값({@code testJvmZone})에 묶는다. PIT 쪽만 빠져 있던 동안 변이 시험은 러너 시간대(CI 는 UTC)로 돌았고, JVM 기본 날짜가 한국 날짜보다 하루 늦은
 * 한국 0시~9시에만 "변이 없이도 실패하는 시험"으로 required {@code mutation-test} 가 붉었다(2026-11-21).
 *
 * <p>[한계] 소스 문자열을 본다. 다른 시간대를 문자열로 조립하면 지나간다. {@code migration-tool} 은 온라인 앱과 분리된 오프라인 도구라 보지 않는다.
 * 빌드 파일 규칙은 루트 {@code build.gradle} 의 표기만 본다 — 모듈 빌드 파일이 같은 속성을 다시 정하면 보지 못한다.
 */
@Tag("governance-harness")
class ServiceTimeZoneLinterTest {

    private static final String[] MODULES = {"foundation", "business-core", "business-app", "api-server"};
    private static final Path APPLICATION = Path.of("api-server/src/main/java/nuri/ApiServerApplication.java");
    private static final Path ROOT_BUILD = Path.of("build.gradle");

    /**
     * 시험 JVM 시간대의 한 값. 다른 시간대 확인은 {@code -Dtest.timezone} 하나로만 한다. 아래 세 표기는 문장 자리(줄 머리)에서만 센다 —
     * 줄 끝 주석에 남은 표기는 설정이 아니다.
     */
    private static final Pattern TEST_JVM_ZONE_DEFAULT = Pattern.compile(
            "(?m)^[ \\t]*def[ \\t]+testJvmZone[ \\t]*=[ \\t]*System\\.getProperty\\('test\\.timezone'\\)[ \\t]*\\?:[ \\t]*'Asia/Seoul'"
                    + "[ \\t]*(//.*)?$");
    private static final Pattern TEST_TASK_ZONE = Pattern.compile(
            "(?m)^[ \\t]*systemProperty[ \\t]*\\(?[ \\t]*'user\\.timezone'[ \\t]*,[ \\t]*testJvmZone[ \\t]*\\)?[ \\t]*(//.*)?$");
    private static final Pattern PIT_JVM_ZONE = Pattern.compile(
            "(?m)^[ \\t]*jvmArgs\\.add\\([ \\t]*\"-Duser\\.timezone=\\$\\{testJvmZone\\}\"(\\.toString\\(\\))?[ \\t]*\\)[ \\t]*(//.*)?$");
    /** 설정이 있어야 할 자리. 같은 표기라도 다른 블록에 있으면 그 JVM 에 닿지 않는다. */
    private static final Pattern TEST_TASK_BLOCK = Pattern.compile("(?m)^[ \\t]*tasks\\.withType\\(Test\\)\\.configureEach[ \\t]*\\{");
    private static final Pattern PIT_BLOCK = Pattern.compile("(?m)^[ \\t]*pitest[ \\t]*\\{");
    private static final Pattern ZONE_PROPERTY = Pattern.compile("user\\.timezone");

    private static final Pattern UTC_REFERENCE = Pattern.compile(
            "ZoneOffset\\.(UTC|ofHours\\(\\s*0\\s*\\)|ofHoursMinutes\\(\\s*0\\s*,\\s*0\\s*\\)|ofTotalSeconds\\(\\s*0\\s*\\))"
                    + "|Clock\\.systemUTC\\("
                    + "|(ZoneOffset\\.of|ZoneId\\.of|TimeZone\\.getTimeZone)\\(\\s*\"(UTC|UT|GMT|Z|Etc/UTC|Etc/GMT|[+-]00(:?00)?)\"");
    private static final Pattern ZONED_ENTITY_FIELD = Pattern.compile(
            "(?m)(^|[\\s;)])(private|protected)\\s+(final\\s+)?(java\\.time\\.)?(Instant|OffsetDateTime|ZonedDateTime)\\s+\\w+\\s*[;=]");
    private static final Pattern ENTITY = Pattern.compile("@(jakarta\\.persistence\\.)?Entity\\b");
    /** 저장하지 않는 필드는 컬럼과 무관하다. */
    private static final Pattern TRANSIENT_FIELD = Pattern.compile("@(jakarta\\.persistence\\.)?Transient\\s+(private|protected)[^;]*;");

    /** 주석은 시각을 만들지 않는다. 문자열 안의 주석 표시는 시간대 표기와 겹치지 않으므로 줄·블록 주석만 걷는다. */
    private static String withoutComments(String source) {
        return source.replaceAll("(?s)/\\*.*?\\*/", "").replaceAll("(?m)^\\s*//.*$", "").replaceAll("\\s//\\s.*$", "");
    }

    private static List<String> violations(Pattern pattern, boolean entitiesOnly) throws IOException {
        Path root = HarnessSourceIndex.repoRoot();
        List<String> found = new ArrayList<>();
        for (Path source : HarnessSourceIndex.productionJavaSources(MODULES)) {
            String text = withoutComments(HarnessSourceIndex.read(source).replace("\r\n", "\n"));
            if (entitiesOnly && !ENTITY.matcher(text).find()) {
                continue;
            }
            if (pattern.matcher(entitiesOnly ? TRANSIENT_FIELD.matcher(text).replaceAll("") : text).find()) {
                found.add(root.relativize(source).toString().replace('\\', '/'));
            }
        }
        return found;
    }

    /**
     * 빌드 파일의 주석. 줄 머리의 {@code //} 와 줄 머리에서 여는 블록 주석만 걷는다 — 빌드 파일은 문자열 속 glob 에 별표·빗금 조합이 흔해,
     * 자바 소스용 {@link #withoutComments} 로 걷으면 그 사이의 설정 줄까지 사라진다.
     */
    private static String withoutBuildComments(String script) {
        return script.replaceAll("(?ms)^[ \\t]*/\\*.*?\\*/", "").replaceAll("(?m)^[ \\t]*//.*$", "");
    }

    /** {@code header} 로 여는 첫 블록의 본문(짝이 맞는 닫는 중괄호 앞까지). 없으면 빈 문자열이다. */
    private static String block(String script, Pattern header) {
        Matcher opening = header.matcher(script);
        if (!opening.find()) {
            return "";
        }
        int depth = 1;
        for (int at = opening.end(); at < script.length(); at++) {
            char current = script.charAt(at);
            if (current == '{') {
                depth++;
            } else if (current == '}' && --depth == 0) {
                return script.substring(opening.end(), at);
            }
        }
        return "";
    }

    /** 블록이 {@code user.timezone} 을 정하는 횟수. 같은 속성을 두 번 정하면 뒤의 것이 이긴다. 줄 끝 주석은 세지 않는다. */
    private static long zoneSettings(String block) {
        return ZONE_PROPERTY.matcher(block.replaceAll("(?m)[ \\t]+//.*$", "")).results().count();
    }

    /**
     * 빌드 파일이 Test 태스크와 PIT 의 JVM 기본 시간대를 같은 한국 표준시 값에 묶는지 본다. 설정은 그 JVM 을 정하는 블록 안의 문장이어야 하고
     * 블록마다 하나여야 한다 — 주석으로 꺼 둔 줄, 줄 끝 주석에 남은 표기, 다른 블록으로 옮긴 줄은 설정이 아니다.
     */
    static List<String> testJvmZoneViolations(String buildScript) {
        String script = withoutBuildComments(buildScript.replace("\r\n", "\n"));
        String testTask = block(script, TEST_TASK_BLOCK);
        String pit = block(script, PIT_BLOCK);
        List<String> found = new ArrayList<>();
        if (!TEST_JVM_ZONE_DEFAULT.matcher(script).find()) {
            found.add("시험 JVM 시간대의 기본값이 한국 표준시가 아니다");
        }
        if (!TEST_TASK_ZONE.matcher(testTask).find() || zoneSettings(testTask) != 1) {
            found.add("Test 태스크가 JVM 기본 시간대를 testJvmZone 하나로 고정하지 않는다");
        }
        if (!PIT_JVM_ZONE.matcher(pit).find() || zoneSettings(pit) != 1) {
            found.add("변이 시험(PIT) JVM 이 기본 시간대를 testJvmZone 하나로 고정하지 않는다");
        }
        return found;
    }

    @Test
    @DisplayName("운영 코드는 UTC 를 시각의 기준으로 쓰지 않는다")
    void productionCodeDoesNotUseUtc() throws IOException {
        assertThat(violations(UTC_REFERENCE, false))
                .as("시각은 ServiceTime 을 거친다. 순간 값이면 Instant 를 그대로 쓴다")
                .isEmpty();
    }

    @Test
    @DisplayName("엔티티는 시간대 없는 컬럼을 LocalDateTime 으로 읽는다")
    void entitiesStoreKoreanWallClockValues() throws IOException {
        assertThat(violations(ZONED_ENTITY_FIELD, true))
                .as("시간대 없는 컬럼에 Instant·OffsetDateTime 을 매핑하면 벤더마다 해석이 다르다")
                .isEmpty();
    }

    @Test
    @DisplayName("앱은 어떤 실행 경로든 JVM 기본 시간대를 한국으로 고정한다")
    void applicationFixesTheJvmDefault() throws IOException {
        String source = withoutComments(HarnessSourceIndex.read(HarnessSourceIndex.repoRoot().resolve(APPLICATION)));

        assertThat(source).containsPattern("static\\s*\\{\\s*ServiceTime\\.applyToJvm\\(\\);");
    }

    @Test
    @DisplayName("시험 JVM 과 변이 시험 JVM 은 같은 한국 표준시 값으로 고정된다")
    void testAndMutationJvmsShareTheKoreanZone() throws IOException {
        assertThat(testJvmZoneViolations(HarnessSourceIndex.read(HarnessSourceIndex.repoRoot().resolve(ROOT_BUILD))))
                .as("Test 태스크와 PIT 는 서로 다른 JVM 이다. 한쪽만 고정하면 한국 0시~9시에만 붉은 시험이 생긴다")
                .isEmpty();
    }

    /** 규칙을 지키는 가장 작은 빌드 파일. 부정 시험은 여기서 한 줄씩 어긴다. */
    private static final String ZONED_BUILD = """
            subprojects {
                def testJvmZone = System.getProperty('test.timezone') ?: 'Asia/Seoul'
                tasks.withType(Test).configureEach {
                    exclude '**/*IntegrationTest*'
                    systemProperty 'user.timezone', testJvmZone
                }
                pitest {
                    excludedClasses = ["**.*Dto", '**/*Mapper']
                    jvmArgs.add("-Duser.timezone=${testJvmZone}".toString())
                }
            }
            """;

    @Test
    @DisplayName("규칙을 지키는 빌드 파일은 위반이 없다(문자열 속 glob 은 주석이 아니다)")
    void zonedBuildHasNoViolations() {
        assertThat(testJvmZoneViolations(ZONED_BUILD)).isEmpty();
        assertThat(testJvmZoneViolations(ZONED_BUILD.replace("\n", "\r\n"))).isEmpty();
    }

    @Test
    @DisplayName("괄호를 쓴 호출과 줄 끝 주석이 붙은 문장도 같은 설정이다")
    void equivalentStatementsAreNotViolations() {
        assertThat(testJvmZoneViolations(ZONED_BUILD.replace(
                "systemProperty 'user.timezone', testJvmZone", "systemProperty('user.timezone', testJvmZone) // 운영과 같은 값"))).isEmpty();
        assertThat(testJvmZoneViolations(ZONED_BUILD.replace(
                "jvmArgs.add(\"-Duser.timezone=${testJvmZone}\".toString())", "jvmArgs.add(\"-Duser.timezone=${testJvmZone}\") // minion"))).isEmpty();
    }

    static Stream<Arguments> misplacedSettings() {
        String pitLine = "jvmArgs.add(\"-Duser.timezone=${testJvmZone}\".toString())";
        String testLine = "systemProperty 'user.timezone', testJvmZone";
        String pit = "변이 시험(PIT) JVM";
        return Stream.of(
                Arguments.of("PIT 줄을 Test 블록으로 옮김",
                        ZONED_BUILD.replace(pitLine, "").replace(testLine, testLine + "\n        " + pitLine), pit),
                Arguments.of("PIT 줄이 줄 끝 주석에만 남음",
                        ZONED_BUILD.replace(pitLine, "threads = 4 // " + pitLine), pit),
                Arguments.of("PIT 줄 뒤에 다른 값을 한 번 더 정함",
                        ZONED_BUILD.replace(pitLine, pitLine + "\n        jvmArgs.add(\"-Duser.timezone=UTC\")"), pit),
                Arguments.of("Test 줄을 pitest 블록으로 옮김",
                        ZONED_BUILD.replace(testLine, "").replace(pitLine, pitLine + "\n        " + testLine), "Test 태스크"),
                Arguments.of("Test 줄이 줄 끝 주석에만 남음",
                        ZONED_BUILD.replace(testLine, "useJUnitPlatform() // " + testLine), "Test 태스크"),
                Arguments.of("Test 줄 뒤에 다른 값을 한 번 더 정함",
                        ZONED_BUILD.replace(testLine, testLine + "\n        systemProperty 'user.timezone', 'UTC'"), "Test 태스크"),
                Arguments.of("기본값이 줄 끝 주석에만 남음",
                        ZONED_BUILD.replace("def testJvmZone = System.getProperty('test.timezone') ?: 'Asia/Seoul'",
                                "def testJvmZone = 'UTC' // System.getProperty('test.timezone') ?: 'Asia/Seoul'"),
                        "기본값이 한국 표준시가 아니다"));
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("misplacedSettings")
    @DisplayName("빌드 파일 규칙은 설정의 자리와 중복을 본다")
    void buildRuleSeesWhereTheSettingLives(String label, String build, String expected) {
        assertThat(testJvmZoneViolations(build)).as(label).anySatisfy(reason -> assertThat(reason).contains(expected));
    }

    static Stream<Arguments> buildRuleViolations() {
        String pitLine = "jvmArgs.add(\"-Duser.timezone=${testJvmZone}\".toString())";
        String testLine = "systemProperty 'user.timezone', testJvmZone";
        String pit = "변이 시험(PIT) JVM";
        return Stream.of(
                Arguments.of("PIT 줄을 지움", pitLine, "", pit),
                Arguments.of("PIT 줄을 주석으로 끔", pitLine, "// " + pitLine, pit),
                Arguments.of("PIT 줄을 블록 주석으로 끔", pitLine, "/* " + pitLine + " */", pit),
                Arguments.of("PIT 가 다른 값을 씀", "${testJvmZone}\"", "UTC\"", pit),
                Arguments.of("Test 태스크가 다른 값을 씀", testLine, "systemProperty 'user.timezone', 'UTC'", "Test 태스크"),
                Arguments.of("Test 태스크 줄을 지움", testLine, "", "Test 태스크"),
                Arguments.of("기본값이 UTC", "?: 'Asia/Seoul'", "?: 'UTC'", "기본값이 한국 표준시가 아니다"),
                Arguments.of("기본값을 손잡이 없이 고정", "System.getProperty('test.timezone') ?: 'Asia/Seoul'", "'UTC'",
                        "기본값이 한국 표준시가 아니다"));
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("buildRuleViolations")
    @DisplayName("빌드 파일 규칙은 한 줄을 어기면 그 사유 하나로 빨갛다")
    void buildRuleFiresOnRealViolations(String label, String from, String to, String expected) {
        assertThat(ZONED_BUILD).containsOnlyOnce(from);

        assertThat(testJvmZoneViolations(ZONED_BUILD.replace(from, to)))
                .as(label)
                .singleElement(InstanceOfAssertFactories.STRING)
                .contains(expected);
    }

    @ParameterizedTest(name = "{0}")
    @ValueSource(strings = {
        "LocalDateTime.now(ZoneOffset.UTC)",
        "Clock.systemUTC()",
        "ZoneId.of(\"UTC\")",
        "TimeZone.getTimeZone(\"GMT\")",
        "ZoneId.of( \"Etc/UTC\" )",
        "ZoneOffset.ofHours(0)",
        "ZoneOffset.ofTotalSeconds(0)",
        "ZoneOffset.of(\"+00:00\")",
        "ZoneOffset.of(\"+0000\")",
        "ZoneOffset.ofHoursMinutes(0, 0)",
        "ZoneId.of(\"+00:00\")",
        "ZoneId.of(\"UT\")",
        "java.time.ZoneOffset.UTC",
    })
    @DisplayName("UTC 규칙은 실제 위반 문장에서 빨갛다")
    void utcRuleFiresOnRealViolations(String code) {
        assertThat(UTC_REFERENCE.matcher(code).find()).isTrue();
    }

    @ParameterizedTest(name = "{0}")
    @ValueSource(strings = {"private Instant exprtnDt;", "private java.time.OffsetDateTime sentAt;", "protected ZonedDateTime at = null;",
        "@Column(nullable = false) private Instant exprtnDt;"})
    @DisplayName("엔티티 규칙은 실제 위반 필드에서 빨갛다")
    void entityRuleFiresOnRealViolations(String field) {
        assertThat(ZONED_ENTITY_FIELD.matcher(field).find()).isTrue();
    }

    @ParameterizedTest(name = "{0}")
    @ValueSource(strings = {"private LocalDateTime exprtnDt;", "private LocalDate ntceBgnde;", "Instant now = clock.instant();"})
    @DisplayName("엔티티 규칙은 저장 필드가 아닌 것을 잡지 않는다")
    void entityRuleIgnoresTheRest(String code) {
        assertThat(ZONED_ENTITY_FIELD.matcher(code).find()).isFalse();
    }

    @ParameterizedTest(name = "{0}")
    @ValueSource(strings = {"ZoneOffset.of(\"+09:00\")", "ZoneId.of(\"Asia/Seoul\")", "ZoneOffset.ofHours(9)", "Clock.fixed(now, zone)"})
    @DisplayName("한국 시간대 표기는 위반이 아니다")
    void utcRuleIgnoresKoreanZones(String code) {
        assertThat(UTC_REFERENCE.matcher(code).find()).isFalse();
    }

    @Test
    @DisplayName("저장하지 않는 필드는 시각 타입을 써도 된다")
    void transientFieldsAreNotStored() {
        String entity = "@Entity class Sample {\n    @Transient\n    private Instant observedAt;\n}";

        assertThat(ZONED_ENTITY_FIELD.matcher(entity).find()).isTrue();
        assertThat(ZONED_ENTITY_FIELD.matcher(TRANSIENT_FIELD.matcher(entity).replaceAll("")).find()).isFalse();
    }

    @Test
    @DisplayName("전체 이름으로 쓴 엔티티도 엔티티다")
    void entityAnnotationWithFullNameCounts() {
        assertThat(ENTITY.matcher("@jakarta.persistence.Entity").find()).isTrue();
        assertThat(ENTITY.matcher("@EntityScan").find()).isFalse();
    }

    @Test
    @DisplayName("주석의 UTC 설명은 위반이 아니다")
    void commentsAreNotViolations() {
        assertThat(UTC_REFERENCE.matcher(withoutComments("""
                /** 예전에는 ZoneOffset.UTC 였다. */
                // Clock.systemUTC() 는 쓰지 않는다
                int value = 1; // ZoneOffset.UTC
                """)).find()).isFalse();
    }
}
