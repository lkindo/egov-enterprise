package nuri.migration.transform;

import nuri.migration.artifact.CanonicalArtifactDigest;
import nuri.migration.domain.DomainValueRejected;
import nuri.migration.domain.DomainViolation;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

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
    void builtinsRejectBinaryButExplicitBinaryTransformersRemainAvailable() {
        byte[] bytes = {0, 1, -1};
        assertThat(registry.apply(null, bytes)).isSameAs(bytes);
        for (String name : new String[] {"trim", "upper", "lower", "date", "timestamp", "date-truncate"}) {
            assertThatThrownBy(() -> registry.apply(name, bytes))
                    .isInstanceOf(IllegalArgumentException.class);
        }
        registry.register("binary-length", value -> ((byte[]) value).length);
        assertThat(registry.apply("binary-length", bytes)).isEqualTo(3);
    }

    @Test
    void 기본_등록_변환기가_모두_존재한다() {
        // `replaced boolean return with true/false` 뮤턴트를 양방향으로 잡는다.
        for (String name : new String[] { "trim", "upper", "lower", "date", "timestamp", "date-truncate" }) {
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

    /**
     * [2026-10-13 DEC-OPS-309] type: date 가 시각을 거부하므로, 시각을 버리는 것은 이 변환기로만 밝힌다.
     * 8자리 yyyyMMdd 는 type: date 가 받는 무손실 표기라 같은 컬럼에 일시와 섞여 있어도 이 변환기 하나로 받는다.
     */
    @Test
    void date_truncate_변환기는_명시적으로_시각을_버리고_오프셋은_거부한다() {
        LocalDate day = LocalDate.of(2026, 8, 9);
        assertThat(registry.apply("date-truncate", "20260809")).isEqualTo(day);
        assertThat(registry.apply("date-truncate", " 20260809 ")).isEqualTo(day);
        assertThat(registry.apply("date-truncate", 20260809)).isEqualTo(day);
        assertThat(registry.apply("date-truncate", "2026-08-09 13:45:00")).isEqualTo(day);
        assertThat(registry.apply("date-truncate", "2026-08-09T13:45:00.123456")).isEqualTo(day);
        assertThat(registry.apply("date-truncate", " 2026-08-09 ")).isEqualTo(day);
        assertThat(registry.apply("date-truncate", LocalDateTime.of(2026, 8, 9, 23, 59, 59))).isEqualTo(day);
        assertThat(registry.apply("date-truncate", java.sql.Timestamp.valueOf("2026-08-09 07:00:00"))).isEqualTo(day);
        assertThat(registry.apply("date-truncate", day)).isEqualTo(day);
        assertThat(registry.apply("date-truncate", null)).isNull();
        // 오프셋이 붙은 값은 어느 날짜인지 정할 수 없다.
        for (Object ambiguous : new Object[] {"2026-08-09T13:45:00+09:00",
                java.time.OffsetDateTime.of(2026, 8, 9, 1, 0, 0, 0, java.time.ZoneOffset.ofHours(9))}) {
            assertThatThrownBy(() -> registry.apply("date-truncate", ambiguous))
                    .as(String.valueOf(ambiguous))
                    .isInstanceOf(RuntimeException.class);
        }
        // 없는 날짜·자리수가 틀린 숫자·ASCII 가 아닌 숫자는 날짜가 아니다.
        for (Object malformed : new Object[] {"20260230", "2026080", "202608091", "２０２６０８０９"}) {
            assertThatThrownBy(() -> registry.apply("date-truncate", malformed))
                    .as(String.valueOf(malformed))
                    .isInstanceOf(RuntimeException.class);
        }
        // [ADR-0029 L3a-1] v2 는 자리표시 날짜를 거부한다 — v1 은 9999-12-31 을 그대로 적재했다.
        for (Object placeholder : new Object[] {"99991231", " 9999-12-31 ", 99991231}) {
            assertThatThrownBy(() -> registry.apply("date-truncate", placeholder))
                    .as(String.valueOf(placeholder))
                    .isInstanceOfSatisfying(DomainValueRejected.class, rejected -> assertThat(rejected.violation())
                            .isEqualTo(DomainViolation.PLACEHOLDER_DATE));
        }
    }

    /**
     * [ADR-0029 L3a-1] 표준 도메인 변환기는 내장이고, 이진 값도 위반 코드로 거부한다 — 실행기가 그 코드를 기록한다.
     * 같은 이름을 사용자 변환기로 덮어쓰면 도메인 변환기가 아니다.
     */
    @Test
    void domainTransformersAreBuiltinsThatRejectBinaryWithAViolationCode() {
        for (String name : DOMAIN_TRANSFORMERS) {
            assertThat(registry.has(name)).as(name).isTrue();
            assertThat(registry.isBuiltin(name)).as(name).isTrue();
            assertThat(registry.isDomain(name)).as(name).isTrue();
            assertThatThrownBy(() -> registry.apply(name, new byte[] {1}))
                    .as(name)
                    .isInstanceOfSatisfying(DomainValueRejected.class, rejected -> assertThat(rejected.violation())
                            .isEqualTo(DomainViolation.UNSUPPORTED_VALUE_TYPE));
        }
        for (String name : new String[] {"trim", "upper", "lower", "date", "timestamp", "nope"}) {
            assertThat(registry.isDomain(name)).as(name).isFalse();
        }
        assertThat(registry.isDomain(null)).isFalse();
        registry.register("yn", "test:yn:v1", "0".repeat(64), value -> value);
        assertThat(registry.isDomain("yn")).isFalse();
        assertThat(registry.isBuiltin("yn")).isFalse();
    }

    /**
     * 내장 변환기의 계약 id 는 실행 계약 digest 에 결속된다. date-truncate 는 v2 로 올렸으므로 v1 로 승인한 plan 은 다시
     * 승인해야 한다 — id 가 조용히 바뀌거나 되돌아가면 이 시험이 알린다.
     */
    @Test
    void domainTransformerContractIdsAreBoundToTheExecutionContract() {
        Map<String, String> contractIds = new LinkedHashMap<>();
        contractIds.put("date-text", "builtin:date-text:v1");
        contractIds.put("date-truncate", "builtin:date-truncate:v2");
        contractIds.put("hms6", "builtin:hms6:v1");
        contractIds.put("timestamp-from-date", "builtin:timestamp-from-date:v1");
        contractIds.put("timestamp-text", "builtin:timestamp-text:v1");
        contractIds.put("yn", "builtin:yn:v1");
        contractIds.put("ymd8", "builtin:ymd8:v1");
        contractIds.put("ymd8-truncate", "builtin:ymd8-truncate:v1");
        contractIds.put("ymdhms14", "builtin:ymdhms14:v1");
        for (Map.Entry<String, String> entry : contractIds.entrySet()) {
            String expected = CanonicalArtifactDigest.sha256(new ExpectedContract(1, "registry", List.of(
                    new ExpectedEntry(entry.getKey(), entry.getValue(),
                            CanonicalArtifactDigest.sha256(entry.getValue()), true))));
            assertThat(registry.executionContractDigest(List.of(entry.getKey()), "registry"))
                    .as(entry.getKey()).isEqualTo(expected);
        }
        assertThat(contractIds.keySet()).containsExactlyInAnyOrderElementsOf(DOMAIN_TRANSFORMERS);
    }

    /**
     * 검증기는 nullify 가 그 load 가 낼 수 있는 코드인지 레지스트리의 선언으로 판정한다. 선언이 실제 거부와 어긋나면
     * 낼 수 없는 위반의 nullify 가 통과하거나, 낼 수 있는 위반의 nullify 가 막힌다 — 실제로 던지는 코드를 모아 대조한다.
     */
    @Test
    void declaredDomainViolationsAreExactlyTheCodesTheTransformerRejectsWith() {
        Object[] probes = {"  ", "99991231", "20240231", "20240231120000", "2024-01-31 12:00:00", "abc",
                LocalDateTime.of(2024, 1, 31, 12, 0), LocalTime.of(9, 30), new byte[] {1}};
        Map<String, Set<DomainViolation>> expected = new LinkedHashMap<>();
        Set<DomainViolation> shape = EnumSet.of(DomainViolation.BLANK, DomainViolation.FORMAT,
                DomainViolation.UNSUPPORTED_VALUE_TYPE);
        Set<DomainViolation> dateTime = with(shape, DomainViolation.INVALID_DATE);
        Set<DomainViolation> truncated = with(dateTime, DomainViolation.PLACEHOLDER_DATE);
        Set<DomainViolation> date = with(truncated, DomainViolation.TIME_PRESENT);
        expected.put("ymd8", date);
        expected.put("date-text", date);
        expected.put("timestamp-from-date", date);
        expected.put("ymd8-truncate", truncated);
        expected.put("date-truncate", truncated);
        expected.put("timestamp-text", truncated);
        expected.put("ymdhms14", dateTime);
        expected.put("hms6", shape);
        expected.put("yn", shape);

        for (Map.Entry<String, Set<DomainViolation>> entry : expected.entrySet()) {
            Set<DomainViolation> observed = EnumSet.noneOf(DomainViolation.class);
            for (Object probe : probes) {
                try {
                    registry.apply(entry.getKey(), probe);
                } catch (DomainValueRejected rejected) {
                    observed.add(rejected.violation());
                }
            }
            assertThat(observed).as(entry.getKey() + " 가 실제로 던진 코드").isEqualTo(entry.getValue());
            assertThat(registry.domainViolations(entry.getKey())).as(entry.getKey() + " 의 선언")
                    .isEqualTo(entry.getValue());
        }
        assertThat(expected.keySet()).containsExactlyInAnyOrderElementsOf(DOMAIN_TRANSFORMERS);
        for (String name : new String[] {"trim", "date", "timestamp", "nope"}) {
            assertThat(registry.domainViolations(name)).as(name).isEmpty();
        }
        assertThat(registry.domainViolations(null)).isEmpty();
        registry.register("ymd8", "test:ymd8:v1", "0".repeat(64), value -> value);
        assertThat(registry.domainViolations("ymd8")).as("덮어쓴 이름은 도메인 변환기가 아니다").isEmpty();
    }

    private static Set<DomainViolation> with(Set<DomainViolation> base, DomainViolation added) {
        Set<DomainViolation> union = EnumSet.copyOf(base);
        union.add(added);
        return union;
    }

    private static final List<String> DOMAIN_TRANSFORMERS = List.of("ymd8", "ymd8-truncate", "ymdhms14", "hms6",
            "yn", "date-text", "date-truncate", "timestamp-text", "timestamp-from-date");

    private record ExpectedEntry(String name, String contractVersion, String implementationDigest, boolean builtin) {}

    private record ExpectedContract(int schemaVersion, String registryClassDigest,
                                    List<ExpectedEntry> selectedTransformers) {}

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

    @Test
    void 내장_여부는_등록_정의를_따르고_같은_이름의_사용자_변환기는_내장이_아니다() {
        assertThat(registry.isBuiltin("trim")).isTrue();
        assertThat(registry.isBuiltin("date")).isTrue();
        assertThat(registry.isBuiltin("unregistered")).isFalse();
        assertThat(registry.isBuiltin(null)).isFalse();
        registry.register("exclaim", v -> v + "!");
        assertThat(registry.isBuiltin("exclaim")).isFalse();
        // 표준 검증은 내장 변환기의 출력 계약을 안다고 보고 대조한다 — 덮어쓴 이름은 그 가정에서 빠져야 한다.
        registry.register("trim", v -> v);
        assertThat(registry.isBuiltin("trim")).isFalse();
    }
}
