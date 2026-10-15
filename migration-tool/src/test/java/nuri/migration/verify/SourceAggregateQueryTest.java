package nuri.migration.verify;

import nuri.migration.verify.ColumnCheck.Aggregate;
import nuri.migration.verify.ColumnCheck.SourceColumnType;
import nuri.migration.verify.SourceAggregateQuery.AggregateColumn;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.sql.Date;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * [ADR-0029 L4 D2] 원천 집계 문장과 결과 읽기. 묶음 하나에 문장 하나, 합은 넘침 없는 캐스트, 실패하면 COUNT 전용으로 물러난다.
 */
@DisplayName("원천 집계 문장")
class SourceAggregateQueryTest {

    private static final SourceColumnType INT = new SourceColumnType(Types.INTEGER, "int4", 10L, 0);
    private static final SourceColumnType MONEY = new SourceColumnType(Types.NUMERIC, "numeric", 12L, 2);
    private static final SourceColumnType UNBOUNDED = new SourceColumnType(Types.NUMERIC, "NUMBER", 0L, -127);
    private static final SourceColumnType DATE = new SourceColumnType(Types.DATE, "date", 10L, 0);

    private static SourceAggregateQuery query(String where) {
        return SourceAggregateQuery.of("legacy.orders", where, List.of(
                new AggregateColumn("NM", true, Aggregate.NONE, null),
                new AggregateColumn("QTY", true, Aggregate.NUM, INT),
                new AggregateColumn("AMT", false, Aggregate.NUM, MONEY),
                new AggregateColumn("RAW", false, Aggregate.NUM, UNBOUNDED),
                new AggregateColumn("ORDERED", true, Aggregate.TEMPORAL, DATE)));
    }

    @Test
    @DisplayName("한 문장에 COUNT(*)·COUNT(c)·SUM·MIN·MAX 를 담고 합은 정밀도대로 캐스트한다 — 컬럼은 mapping 철자 그대로")
    void fullStatement() {
        assertThat(query(null).sql()).isEqualTo("SELECT COUNT(*), COUNT(NM), COUNT(QTY), COUNT(ORDERED), "
                + "SUM(CAST(QTY AS DECIMAL(38,0))), MIN(QTY), MAX(QTY), "
                + "SUM(CAST(AMT AS DECIMAL(38,2))), MIN(AMT), MAX(AMT), "
                + "SUM(RAW), MIN(RAW), MAX(RAW), "
                + "MIN(ORDERED), MAX(ORDERED) FROM legacy.orders");
        assertThat(query("deleted_yn = 'N'").sql()).endsWith(" FROM legacy.orders WHERE deleted_yn = 'N'");
        assertThat(query("  ").sql()).endsWith(" FROM legacy.orders");
    }

    @Test
    @DisplayName("COUNT 전용 문장은 COUNT 위치가 전체 문장과 같다")
    void countOnlyStatement() {
        assertThat(query("deleted_yn = 'N'").countOnlySql()).isEqualTo(
                "SELECT COUNT(*), COUNT(NM), COUNT(QTY), COUNT(ORDERED) FROM legacy.orders WHERE deleted_yn = 'N'");
    }

    @Test
    @DisplayName("대소문자가 섞인 원천 컬럼은 mapping 철자로 보내고 결과는 소문자 이름으로 찾는다")
    void mixedCaseIdentifiersKeepTheMappingSpelling() {
        // 계획은 원천 컬럼을 소문자로 들고 mapping 철자를 따로 든다(ColumnClassifier). 대소문자를 가리는 원천(SQL Server
        //   *_CS_* 정렬 등)에서 소문자로 바꾸면 다른 컬럼이다.
        ColumnCheck planned = new ColumnCheck("customer_id", "customerid", INT, Aggregate.NUM, true, false, null, false,
                null, null, false, null, List.of(), "CustomerId");
        SourceAggregateQuery query = SourceAggregateQuery.of("dbo.Orders", null,
                List.of(AggregateColumn.of(planned)));

        assertThat(query.sql()).isEqualTo("SELECT COUNT(*), COUNT(CustomerId), "
                + "SUM(CAST(CustomerId AS DECIMAL(38,0))), MIN(CustomerId), MAX(CustomerId) FROM dbo.Orders");
        assertThat(query.countOnlySql()).isEqualTo("SELECT COUNT(*), COUNT(CustomerId) FROM dbo.Orders");
        SourceAggregates aggregates = query.parse(new Object[]{3L, 2L, new BigDecimal("7"), 3, 4}, true);
        assertThat(aggregates.nonNull("customerid")).isEqualTo(2L);
        assertThat(aggregates.sum("customerid")).isEqualByComparingTo("7");
        assertThat(new ColumnCheck("c", "c", INT, Aggregate.NUM, true, false, null, false, null, null, false, null,
                List.of(), "other").sourceIdentifier()).as("철자가 다른 컬럼을 가리키면 소문자 이름을 쓴다")
                .isEqualTo("c");
    }

    @Test
    @DisplayName("SQL Server 원천은 COUNT_BIG 으로 센다 — COUNT 는 int 라 21억 행에서 넘친다")
    void bigCountForSqlServer() {
        assertThat(query(null).sql(true)).startsWith("SELECT COUNT_BIG(*), COUNT_BIG(NM), COUNT_BIG(QTY), "
                + "COUNT_BIG(ORDERED), SUM(CAST(QTY AS DECIMAL(38,0)))");
        assertThat(query(null).countOnlySql(true)).isEqualTo(
                "SELECT COUNT_BIG(*), COUNT_BIG(NM), COUNT_BIG(QTY), COUNT_BIG(ORDERED) FROM legacy.orders");
        assertThat(query(null).sql(false)).isEqualTo(query(null).sql());
    }

    @Test
    @DisplayName("같은 컬럼을 여러 매핑이 쓰면 하나로 합친다 — NULL 계정은 하나라도, 집계는 수치 쪽")
    void duplicateColumnsMerge() {
        SourceAggregateQuery merged = SourceAggregateQuery.of("t", null, List.of(
                new AggregateColumn("A", false, Aggregate.NONE, null),
                new AggregateColumn("a", true, Aggregate.NUM, INT)));

        assertThat(merged.sql()).isEqualTo("SELECT COUNT(*), COUNT(A), SUM(CAST(A AS DECIMAL(38,0))), MIN(A), MAX(A) "
                + "FROM t");
        assertThat(merged.columns()).hasSize(1);
    }

    @Test
    @DisplayName("합 캐스트는 정수·정밀도 있는 소수만 하고 정밀도 없는 수는 그대로 더한다")
    void sumCast() {
        assertThat(SourceAggregateQuery.sumExpression("c", INT)).isEqualTo("SUM(CAST(c AS DECIMAL(38,0)))");
        assertThat(SourceAggregateQuery.sumExpression("c", MONEY)).isEqualTo("SUM(CAST(c AS DECIMAL(38,2)))");
        assertThat(SourceAggregateQuery.sumExpression("c", new SourceColumnType(Types.DECIMAL, "decimal", 38L, 0)))
                .isEqualTo("SUM(CAST(c AS DECIMAL(38,0)))");
        assertThat(SourceAggregateQuery.sumExpression("c", new SourceColumnType(Types.DECIMAL, "decimal", 39L, 0)))
                .isEqualTo("SUM(c)");
        assertThat(SourceAggregateQuery.sumExpression("c", new SourceColumnType(Types.NUMERIC, "n", 5L, 6)))
                .isEqualTo("SUM(c)");
        assertThat(SourceAggregateQuery.sumExpression("c", UNBOUNDED)).isEqualTo("SUM(c)");
        assertThat(SourceAggregateQuery.sumExpression("c", null)).isEqualTo("SUM(c)");
    }

    @Test
    @DisplayName("식별자가 아닌 이름은 문장을 만들기 전에 거부한다")
    void identifiersAreValidated() {
        assertThatThrownBy(() -> SourceAggregateQuery.of("t; DROP TABLE x", null, List.of()))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> SourceAggregateQuery.of("t", null,
                List.of(new AggregateColumn("a b", true, Aggregate.NONE, null))))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("전체 결과를 읽는다 — NULL 합은 0, 시간 값은 시간대 없는 java.time 으로")
    void parseFull() {
        SourceAggregates aggregates = query(null).parse(new Object[]{
                5L, 4L, 3, new BigDecimal("2"),
                new BigDecimal("12"), 1, 9,
                null, null, null,
                new BigDecimal("10.50"), new BigDecimal("1.25"), new BigDecimal("9.25"),
                Date.valueOf("2024-01-01"), Date.valueOf("2024-02-29")}, true);

        assertThat(aggregates.rows()).isEqualTo(5L);
        assertThat(aggregates.nonNull("NM")).isEqualTo(4L);
        assertThat(aggregates.nonNull("qty")).isEqualTo(3L);
        assertThat(aggregates.nonNull("ordered")).isEqualTo(2L);
        assertThat(aggregates.nonNull("amt")).as("재지 않은 컬럼").isNull();
        assertThat(aggregates.sum("qty")).isEqualByComparingTo("12");
        assertThat(aggregates.min("qty")).isEqualTo(new BigDecimal("1"));
        assertThat(aggregates.max("qty")).isEqualTo(new BigDecimal("9"));
        assertThat(aggregates.sum("amt")).as("모두 NULL 이면 합은 0").isEqualByComparingTo("0");
        assertThat(aggregates.min("amt")).isNull();
        assertThat(aggregates.sum("raw")).isEqualByComparingTo("10.5");
        assertThat(aggregates.min("ordered")).isEqualTo(LocalDate.of(2024, 1, 1));
        assertThat(aggregates.max("ordered")).isEqualTo(LocalDate.of(2024, 2, 29));
        assertThat(aggregates.aggregateGap("qty")).isNull();
        assertThat(aggregates.toString()).doesNotContain("12", "10.5");
    }

    @Test
    @DisplayName("부동소수·벤더 객체 결과는 그 컬럼만 UNSUPPORTED_VALUE_TYPE 이다")
    void unsupportedValueTypes() {
        SourceAggregateQuery query = SourceAggregateQuery.of("t", null, List.of(
                new AggregateColumn("a", true, Aggregate.NUM, INT),
                new AggregateColumn("b", false, Aggregate.NUM, INT),
                new AggregateColumn("d", false, Aggregate.TEMPORAL, DATE)));
        SourceAggregates aggregates = query.parse(new Object[]{
                2L, 2L,
                2.5d, 1, 2,
                new BigDecimal("3"), new BigDecimal("1"), new BigDecimal("2"),
                new Object(), Timestamp.valueOf(LocalDateTime.of(2024, 1, 1, 0, 0))}, true);

        assertThat(aggregates.aggregateGap("a")).isEqualTo(CoverageReason.UNSUPPORTED_VALUE_TYPE);
        assertThat(aggregates.sum("a")).isNull();
        assertThat(aggregates.aggregateGap("b")).isNull();
        assertThat(aggregates.sum("b")).isEqualByComparingTo("3");
        assertThat(aggregates.aggregateGap("d")).isEqualTo(CoverageReason.UNSUPPORTED_VALUE_TYPE);
    }

    @Test
    @DisplayName("최소·최대의 시간 종류가 다르면 판정하지 않는다")
    void mixedTemporalKinds() {
        SourceAggregateQuery query = SourceAggregateQuery.of("t", null, List.of(
                new AggregateColumn("d", false, Aggregate.TEMPORAL, DATE)));

        assertThat(query.parse(new Object[]{1L, Date.valueOf("2024-01-01"),
                Timestamp.valueOf(LocalDateTime.of(2024, 1, 2, 0, 0))}, true).aggregateGap("d"))
                .isEqualTo(CoverageReason.UNSUPPORTED_VALUE_TYPE);
    }

    @Test
    @DisplayName("COUNT 전용 결과는 합·최소·최대를 SOURCE_AGGREGATE_FAILED 로 둔다")
    void parseCountOnly() {
        SourceAggregates aggregates = query(null).parse(new Object[]{5, 4, 3, 2}, false);

        assertThat(aggregates.rows()).isEqualTo(5L);
        assertThat(aggregates.nonNull("qty")).isEqualTo(3L);
        assertThat(aggregates.aggregateGap("qty")).isEqualTo(CoverageReason.SOURCE_AGGREGATE_FAILED);
        assertThat(aggregates.aggregateGap("raw")).isEqualTo(CoverageReason.SOURCE_AGGREGATE_FAILED);
        assertThat(aggregates.aggregateGap("ordered")).isEqualTo(CoverageReason.SOURCE_AGGREGATE_FAILED);
        assertThat(aggregates.aggregateGap("nm")).isNull();
        assertThat(aggregates.sum("qty")).isNull();
    }

    @Test
    @DisplayName("결과 모양이 다르거나 행 수를 정수로 읽지 못하면 값 없이 실패한다")
    void unreadableResults() {
        assertThatThrownBy(() -> query(null).parse(new Object[]{5L}, true))
                .isInstanceOf(IllegalStateException.class).hasMessage("SOURCE_AGGREGATE_UNREADABLE");
        assertThatThrownBy(() -> query(null).parse(new Object[]{"5", 4, 3, 2}, false))
                .isInstanceOf(IllegalStateException.class).hasMessage("SOURCE_AGGREGATE_UNREADABLE");
        assertThatThrownBy(() -> query(null).parse(new Object[]{null, 4, 3, 2}, false))
                .isInstanceOf(IllegalStateException.class).hasMessage("SOURCE_AGGREGATE_UNREADABLE");
        assertThatThrownBy(() -> query(null).parse(new Object[]{new BigDecimal("5.5"), 4, 3, 2}, false))
                .isInstanceOf(IllegalStateException.class).hasMessage("SOURCE_AGGREGATE_UNREADABLE");
    }
}
