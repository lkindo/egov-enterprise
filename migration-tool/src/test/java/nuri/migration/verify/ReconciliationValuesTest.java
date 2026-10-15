package nuri.migration.verify;

import nuri.migration.state.RowChecksum;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.sql.Date;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * [ADR-0029 L4 D2] 대사의 값 정규형. 표본·코드 비교가 체크섬과 같은 규칙이어야 체크섬이 PASS 인 행을 대사가 FAIL 로 보지 않는다.
 */
@DisplayName("대사 값 정규형")
class ReconciliationValuesTest {

    /**
     * 거짓 FAIL 방지 표 — 재계산 쪽(실행기와 같은 변환 결과)과 대상 재조회 쪽(JDBC 값)이 타입은 달라도 체크섬이 같다고 보는 짝.
     * 대사도 같다고 봐야 한다.
     */
    @Test
    @DisplayName("체크섬이 같다고 보는 JDBC 타입 차이를 대사도 같다고 본다")
    void checksumEquivalentPairsAreEqual() {
        List<Object[]> pairs = List.of(
                new Object[]{5, 5L},
                new Object[]{(short) 5, BigDecimal.valueOf(5)},
                new Object[]{new BigDecimal("1.0"), new BigDecimal("1.00")},
                new Object[]{new BigDecimal("1E+3"), 1000L},
                new Object[]{new BigDecimal("0.00"), 0},
                new Object[]{BigInteger.TEN, new BigDecimal("10.0")},
                new Object[]{LocalDateTime.of(2024, 1, 31, 10, 0), Timestamp.valueOf("2024-01-31 10:00:00")},
                new Object[]{LocalDateTime.of(2024, 1, 31, 10, 0, 0, 123_000_000),
                        Timestamp.valueOf("2024-01-31 10:00:00.123")},
                new Object[]{LocalDate.of(2024, 1, 31), Date.valueOf("2024-01-31")},
                new Object[]{"A01", "A01"},
                new Object[]{null, null},
                new Object[]{new byte[]{1, 2}, new byte[]{1, 2}});
        for (Object[] pair : pairs) {
            assertThat(ReconciliationValues.canonical(pair[0]))
                    .as("짝 %s", pair[0] == null ? "null" : pair[0].getClass().getSimpleName())
                    .isEqualTo(ReconciliationValues.canonical(pair[1]));
            assertThat(RowChecksum.calculate(List.of("c"), single(pair[0])))
                    .as("체크섬도 같다고 본다")
                    .isEqualTo(RowChecksum.calculate(List.of("c"), single(pair[1])));
        }
    }

    @Test
    @DisplayName("값이 다르면 다르다 — 앞자리 0·공백·NULL 과 빈 문자·시각")
    void differentValuesStayDifferent() {
        List<Object[]> pairs = List.of(
                new Object[]{"01", "1"},
                new Object[]{"A ", "A"},
                new Object[]{null, ""},
                new Object[]{LocalDateTime.of(2024, 1, 31, 0, 0), LocalDate.of(2024, 1, 31)},
                new Object[]{new BigDecimal("1.5"), 2L},
                new Object[]{new byte[]{1}, new byte[]{2}});
        for (Object[] pair : pairs) {
            assertThat(ReconciliationValues.canonical(pair[0]))
                    .isNotEqualTo(ReconciliationValues.canonical(pair[1]));
        }
    }

    @Test
    @DisplayName("정확 수치는 정수·BigInteger·BigDecimal 만 받는다 — 부동소수·문자는 판정하지 않는다")
    void decimalAcceptsOnlyExactNumbers() {
        assertThat(ReconciliationValues.decimal(7)).isEqualTo(BigDecimal.valueOf(7));
        assertThat(ReconciliationValues.decimal((byte) 7)).isEqualTo(BigDecimal.valueOf(7));
        assertThat(ReconciliationValues.decimal(BigInteger.TWO)).isEqualTo(BigDecimal.valueOf(2));
        assertThat(ReconciliationValues.decimal(new BigDecimal("1.25"))).isEqualTo(new BigDecimal("1.25"));
        assertThat(ReconciliationValues.decimal(1.5d)).isNull();
        assertThat(ReconciliationValues.decimal(1.5f)).isNull();
        assertThat(ReconciliationValues.decimal("7")).isNull();
        assertThat(ReconciliationValues.decimal(null)).isNull();
    }

    @Test
    @DisplayName("시간 값은 시간대 없는 java.time 으로 맞추고 그 밖은 판정하지 않는다")
    void temporalNormalization() {
        assertThat(ReconciliationValues.temporal(Timestamp.valueOf("2024-01-31 10:00:00")))
                .isEqualTo(LocalDateTime.of(2024, 1, 31, 10, 0));
        assertThat(ReconciliationValues.temporal(Date.valueOf("2024-01-31"))).isEqualTo(LocalDate.of(2024, 1, 31));
        assertThat(ReconciliationValues.temporal(LocalDate.of(2024, 1, 31))).isEqualTo(LocalDate.of(2024, 1, 31));
        assertThat(ReconciliationValues.temporal(java.time.OffsetDateTime.now())).isNull();
        assertThat(ReconciliationValues.temporal(new java.util.Date())).isNull();
        assertThat(ReconciliationValues.sameTemporalKind(LocalDate.MIN, LocalDate.MAX)).isTrue();
        assertThat(ReconciliationValues.sameTemporalKind(LocalDate.MIN, null)).isTrue();
        assertThat(ReconciliationValues.sameTemporalKind(LocalDate.MIN, LocalDateTime.MIN)).isFalse();
    }

    @Test
    @DisplayName("COUNT 결과는 음이 아닌 정수만 행 수로 읽는다")
    void countReadsNonNegativeIntegers() {
        assertThat(ReconciliationValues.count(3)).isEqualTo(3L);
        assertThat(ReconciliationValues.count(new BigDecimal("3"))).isEqualTo(3L);
        assertThatThrownBy(() -> ReconciliationValues.count(-1L)).hasMessage("SOURCE_AGGREGATE_UNREADABLE");
        assertThatThrownBy(() -> ReconciliationValues.count(3.0d)).hasMessage("SOURCE_AGGREGATE_UNREADABLE");
    }

    private static Map<String, Object> single(Object value) {
        java.util.HashMap<String, Object> row = new java.util.HashMap<>();
        row.put("c", value);
        return row;
    }
}
