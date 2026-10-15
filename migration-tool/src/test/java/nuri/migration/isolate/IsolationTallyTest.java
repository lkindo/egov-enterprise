package nuri.migration.isolate;

import nuri.migration.isolate.IsolationTally.CapExceeded;
import nuri.migration.isolate.IsolationTally.Isolation;
import nuri.migration.isolate.RowIsolationPolicy.Match;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 격리 집계(ADR-0029 L3b). 원장 행마다의 상한, 행 단위의 한꺼번 판정, 순번, 격리 행의 보존 키 최댓값을 본다. 문구는
 * 원장 행 ID·상한·표·순번뿐이다.
 */
class IsolationTallyTest {

    private static final Match PLACEHOLDER = new Match("U4", "end_ymd", "PLACEHOLDER_DATE");
    private static final Match INVALID = new Match("U4", "end_ymd", "INVALID_DATE");
    private static final Match UNMAPPED = new Match("U7", "sttus_cd", "CODEMAP_UNMAPPED");

    @Test
    void rowsAreCountedPerLedgerEntryAndGroupedWithTheirOrdinals() {
        IsolationTally tally = new IsolationTally("legacy.user_mst", Map.of("U4", 3L, "U7", 5L));

        tally.add(12, List.of(PLACEHOLDER), Map.of("ID", BigInteger.valueOf(12)));
        tally.add(40, List.of(PLACEHOLDER, UNMAPPED), Map.of());
        tally.add(812, List.of(INVALID), Map.of("id", BigInteger.valueOf(7)));

        assertThat(tally.isolated()).isEqualTo(3);
        assertThat(tally.count("U4")).isEqualTo(3);
        assertThat(tally.count("U7")).isEqualTo(1);
        assertThat(tally.count("U9")).isZero();
        assertThat(tally.isolations()).containsExactly(
                new Isolation("U4", "end_ymd", "PLACEHOLDER_DATE", 2, List.of(12L, 40L)),
                new Isolation("U7", "sttus_cd", "CODEMAP_UNMAPPED", 1, List.of(40L)),
                new Isolation("U4", "end_ymd", "INVALID_DATE", 1, List.of(812L)));
        assertThat(tally.maxPreservedKeys()).as("대상 컬럼 이름은 대소문자를 버리고 모은다")
                .containsExactly(Map.entry("id", BigInteger.valueOf(12)));
        assertThat(tally.maxPreservedKey("Id")).contains(BigInteger.valueOf(12));
        assertThat(tally.maxPreservedKey("seq_no")).isEmpty();
    }

    @Test
    void theRowThatWouldExceedTheCapStopsAndIsNotCounted() {
        IsolationTally tally = new IsolationTally("legacy.user_mst", Map.of("U4", 2L, "U7", 5L));
        tally.add(1, List.of(PLACEHOLDER), Map.of());
        tally.add(2, List.of(PLACEHOLDER), Map.of());

        assertThatThrownBy(() -> tally.add(812, List.of(UNMAPPED, INVALID), Map.of("id", BigInteger.TEN)))
                .isInstanceOfSatisfying(CapExceeded.class, exceeded -> {
                    assertThat(exceeded.ledgerEntry()).isEqualTo("U4");
                    assertThat(exceeded.maxRows()).isEqualTo(2);
                    assertThat(exceeded.ordinal()).isEqualTo(812);
                })
                .hasMessage("격리 상한 초과(원장 행 U4, 상한 2): legacy.user_mst row=812");
        assertThat(tally.isolated()).as("상한을 넘긴 행은 다른 원장 행에도 세지 않는다").isEqualTo(2);
        assertThat(tally.count("U7")).isZero();
        assertThat(tally.isolations()).containsExactly(
                new Isolation("U4", "end_ymd", "PLACEHOLDER_DATE", 2, List.of(1L, 2L)));
        assertThat(tally.maxPreservedKeys()).as("멈춘 행의 키는 시퀀스 목표에 넣지 않는다").isEmpty();
    }

    @Test
    void aRowCountsOnceEvenWhenItFailsTwiceUnderOneLedgerEntry() {
        IsolationTally tally = new IsolationTally("legacy.user_mst", Map.of("U4", 1L));

        tally.add(5, List.of(PLACEHOLDER, new Match("U4", "end_ymd_copy", "PLACEHOLDER_DATE")), Map.of());

        assertThat(tally.count("U4")).isEqualTo(1);
        assertThat(tally.isolated()).isEqualTo(1);
    }

    @Test
    void ordinalsOnlyGrowSoARowIsNeverCountedTwice() {
        IsolationTally tally = new IsolationTally("legacy.user_mst", Map.of("U4", 3L));
        tally.add(5, List.of(PLACEHOLDER), Map.of());

        assertThatThrownBy(() -> tally.add(5, List.of(PLACEHOLDER), Map.of()))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> tally.add(4, List.of(PLACEHOLDER), Map.of()))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new IsolationTally("t", Map.of("U4", 1L)).add(0, List.of(PLACEHOLDER), Map.of()))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(tally.count("U4")).isEqualTo(1);
    }

    @Test
    void undeclaredLedgerEntriesAndEmptyRowsAreRefused() {
        IsolationTally tally = new IsolationTally("legacy.user_mst", Map.of("U4", 3L));

        assertThatThrownBy(() -> tally.add(1, List.of(UNMAPPED), Map.of())).isInstanceOf(IllegalArgumentException.class)
                .hasMessage("선언하지 않은 원장 행의 격리입니다");
        assertThatThrownBy(() -> tally.add(1, List.of(), Map.of())).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new IsolationTally("t", Map.of("U4", 0L)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(tally.isolated()).isZero();
    }

    @Test
    void theLargestKeyOfIsolatedRowsIsKeptPerTargetColumn() {
        IsolationTally tally = new IsolationTally("legacy.user_mst", Map.of("U4", 5L));
        tally.add(1, List.of(PLACEHOLDER), Map.of("id", new BigInteger("9000000000000000000000"),
                "seq_no", BigInteger.ONE));
        tally.add(2, List.of(PLACEHOLDER), Map.of("id", BigInteger.valueOf(3), "seq_no", BigInteger.valueOf(40)));
        tally.add(3, List.of(PLACEHOLDER), Map.of());

        assertThat(tally.maxPreservedKey("id")).contains(new BigInteger("9000000000000000000000"));
        assertThat(tally.maxPreservedKey("seq_no")).as("컬럼마다 따로 센다").contains(BigInteger.valueOf(40));
    }

    @Test
    void preservedKeysAreReadAsIntegersOnly() {
        assertThat(IsolationTally.integerKey(42)).isEqualTo(BigInteger.valueOf(42));
        assertThat(IsolationTally.integerKey(42L)).isEqualTo(BigInteger.valueOf(42));
        assertThat(IsolationTally.integerKey((short) 7)).isEqualTo(BigInteger.valueOf(7));
        assertThat(IsolationTally.integerKey(new BigDecimal("12.000"))).isEqualTo(BigInteger.valueOf(12));
        assertThat(IsolationTally.integerKey(new BigInteger("99999999999999999999")))
                .isEqualTo(new BigInteger("99999999999999999999"));
        assertThat(IsolationTally.integerKey("00123")).as("문자 키는 시퀀스와 무관하다").isNull();
        assertThat(IsolationTally.integerKey(null)).isNull();
        assertThatThrownBy(() -> IsolationTally.integerKey(new BigDecimal("12.5")))
                .isInstanceOf(IllegalArgumentException.class).hasMessage("격리 행의 보존 키가 정수가 아닙니다");
    }
}
