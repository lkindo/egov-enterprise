package nuri.migration.transform;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Locale;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * TransformerRegistry 단위 테스트.
 *
 * <p>[2026-08-09 신설] PIT 이 이 클래스에서 8개를 살려 보냈고 대부분 NO_COVERAGE 였다 —
 * 기본 등록 변환기(trim/upper/lower/date/timestamp)의 람다에 테스트가 닿은 적이 없었다.
 * 마이그레이션 변환기는 값을 조용히 바꾸므로, 검증되지 않은 변환은 곧 데이터 손상 경로다.
 */
class TransformerRegistryTest {

    private final TransformerRegistry registry = new TransformerRegistry();

    @Test
    void 기본_등록_변환기가_모두_존재한다() {
        // `replaced boolean return with true/false` 뮤턴트를 양방향으로 잡는다.
        for (String name : new String[] { "trim", "upper", "lower", "date", "timestamp" }) {
            assertThat(registry.has(name)).as(name + " 는 기본 등록돼야 한다").isTrue();
        }
        assertThat(registry.has("nope")).as("미등록 이름은 false").isFalse();
    }

    @Test
    void trim_upper_lower_는_값을_변환하고_null은_통과시킨다() {
        assertThat(registry.apply("trim", "  a b  ")).isEqualTo("a b");
        assertThat(registry.apply("upper", "abc")).isEqualTo("ABC");
        assertThat(registry.apply("lower", "ABC")).isEqualTo("abc");

        // 각 람다의 null 가드 — 조건을 뒤집으면 NPE 가 되어 죽는다.
        assertThat(registry.apply("trim", null)).isNull();
        assertThat(registry.apply("upper", null)).isNull();
        assertThat(registry.apply("lower", null)).isNull();
    }

    @Test
    void upper_lower_contractIsIndependentOfProcessDefaultLocale() {
        Locale previous = Locale.getDefault();
        try {
            Locale.setDefault(Locale.forLanguageTag("tr-TR"));
            assertThat(registry.apply("upper", "i")).isEqualTo("I");
            assertThat(registry.apply("lower", "I")).isEqualTo("i");
        } finally {
            Locale.setDefault(previous);
        }
    }

    @Test
    void date_변환기는_ISO_문자열을_LocalDate로_바꾼다() {
        assertThat(registry.apply("date", " 2026-08-09 ")).isEqualTo(LocalDate.of(2026, 8, 9));
        assertThat(registry.apply("date", null)).isNull();
        assertThatThrownBy(() -> registry.apply("date", "20260809"))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void timestamp_변환기는_공백구분을_T로_바꿔_파싱한다() {
        LocalDateTime expected = LocalDateTime.of(2026, 8, 9, 13, 45, 0);
        assertThat(registry.apply("timestamp", "2026-08-09 13:45:00")).isEqualTo(expected);
        assertThat(registry.apply("timestamp", "2026-08-09T13:45:00")).isEqualTo(expected);
        // null 가드 — `replaced return value with null` 과 조건 뒤집기를 함께 잡는다.
        assertThat(registry.apply("timestamp", null)).isNull();
    }

    @Test
    void 이름이_비었거나_미등록이면_원본을_그대로_돌려준다() {
        assertThat(registry.apply(null, "keep")).isEqualTo("keep");
        assertThat(registry.apply("", "keep")).isEqualTo("keep");
        assertThat(registry.apply("   ", "keep")).isEqualTo("keep");
        assertThat(registry.apply("unregistered", "keep")).isEqualTo("keep");
    }

    @Test
    void 사용자_정의_변환기를_등록해_쓸_수_있다() {
        registry.register("exclaim", v -> v + "!");
        assertThat(registry.has("exclaim")).isTrue();
        assertThat(registry.apply("exclaim", "hi")).isEqualTo("hi!");
    }
}
