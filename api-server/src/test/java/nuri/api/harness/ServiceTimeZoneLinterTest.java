package nuri.api.harness;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
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
 * <p>[한계] 소스 문자열을 본다. 다른 시간대를 문자열로 조립하면 지나간다. {@code migration-tool} 은 온라인 앱과 분리된 오프라인 도구라 보지 않는다.
 */
@Tag("governance-harness")
class ServiceTimeZoneLinterTest {

    private static final String[] MODULES = {"foundation", "business-core", "business-app", "api-server"};
    private static final Path APPLICATION = Path.of("api-server/src/main/java/nuri/ApiServerApplication.java");

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
