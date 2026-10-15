package nuri.migration.lookup;

import nuri.migration.lookup.LookupResolver.Failure;
import nuri.migration.lookup.LookupResolver.Key;
import nuri.migration.lookup.LookupResolver.Outcome;
import nuri.migration.lookup.LookupResolver.Request;
import nuri.migration.model.MappingSpec.Lookup;
import nuri.migration.model.MappingSpec.LookupCardinality;
import nuri.migration.model.MappingSpec.LookupKey;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.sql.Date;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.entry;

/**
 * [ADR-0029 L3d, DEC-OPS-320] 조회 조인의 짝 판정 — 키 정규화(계열·뒤 0), 짝 둘 이상(fan-out), 짝 없음(exactly_one 은 멈춤,
 * at_most_one 은 NULL), DB 비교 의미가 다른 조회 행, 상한 집계. DB 를 읽지 않는다.
 */
class LookupResolverTest {

    private static final Lookup EXACT = new Lookup("cust", "legacy.customer", null, new LookupKey("CUST_NO", "CUST_NO"),
            LookupCardinality.EXACTLY_ONE, null);
    private static final Lookup OPTIONAL = new Lookup("cust", "legacy.customer", null,
            new LookupKey("CUST_NO", "CUST_NO"), LookupCardinality.AT_MOST_ONE, 2L);

    @Test
    void keysAreComparedByFamilyAndNormalizedText() {
        assertThat(LookupResolver.key(10L)).isEqualTo(new Key(true, "10"));
        assertThat(LookupResolver.key(new BigDecimal("10.00"))).isEqualTo(LookupResolver.key(10));
        assertThat(LookupResolver.key(new BigDecimal("10.50"))).isEqualTo(new Key(true, "10.5"));
        assertThat(LookupResolver.key(new BigDecimal("0.000"))).isEqualTo(new Key(true, "0"));
        assertThat(LookupResolver.key(new BigDecimal("1E+3"))).isEqualTo(new Key(true, "1000"));
        assertThat(LookupResolver.key(BigInteger.valueOf(7))).isEqualTo(LookupResolver.key((short) 7));
        assertThat(LookupResolver.key((byte) 3)).isEqualTo(new Key(true, "3"));
        // 문자는 그대로 비교한다 — 공백·대소문자를 고치지 않는다. 글자가 같아도 계열이 다르면 다른 키다.
        assertThat(LookupResolver.key("C01 ")).isEqualTo(new Key(false, "C01 "));
        assertThat(LookupResolver.key('A')).isEqualTo(new Key(false, "A"));
        assertThat(LookupResolver.key("10")).isNotEqualTo(LookupResolver.key(10));
        // NULL 만 키가 없다. 빈 문자열과 공백 한 칸은 키다 — 짝은 DB 가 정한다(Oracle 은 '' 를 NULL 로 저장한다).
        assertThat(LookupResolver.key(null)).isNull();
        assertThat(LookupResolver.key("")).isEqualTo(new Key(false, ""));
        assertThat(LookupResolver.key(" ")).isEqualTo(new Key(false, " "));
        for (Object unsupported : List.of(1.5d, 2.5f, Date.valueOf("2026-01-01"), new byte[] {1}, true)) {
            assertThatThrownBy(() -> LookupResolver.key(unsupported)).as(String.valueOf(unsupported))
                    .isInstanceOf(IllegalArgumentException.class).hasMessage("lookup key type");
        }
    }

    @Test
    void aRequestBindsEachDistinctKeyOnceWithItsFirstValueAndMarksUnsupportedKeys() {
        Request request = LookupResolver.request(Arrays.asList(10L, new BigDecimal("10.0"), null, 7, 1.5d, ""));

        assertThat(request.rowKeys()).containsExactly(new Key(true, "10"), new Key(true, "10"), null,
                new Key(true, "7"), null, new Key(false, ""));
        assertThat(request.rowTypeFailures()).containsExactly(false, false, false, false, true, false);
        assertThat(request.bindValues()).containsExactly(10L, 7, "");
        assertThat(request.keys()).containsExactly(new Key(true, "10"), new Key(true, "7"), new Key(false, ""));
    }

    @Test
    void bindValuesAreSplitIntoStatementsOfAtMostFiveHundredKeys() {
        List<Object> keys = new ArrayList<>();
        for (long value = 0; value < 1001; value++) {
            keys.add(value);
        }
        List<List<Object>> batches = LookupResolver.request(keys).batches();

        assertThat(batches).extracting(List::size).containsExactly(500, 500, 1);
        assertThat(batches.get(1).getFirst()).isEqualTo(500L);
        assertThat(LookupResolver.request(List.of()).batches()).isEmpty();
        assertThat(LookupResolver.request(Arrays.asList(null, null)).batches()).isEmpty();
        assertThat(LookupResolver.request(Arrays.asList(null, "")).batches()).containsExactly(List.of(""));
        assertThat(LookupResolver.batches(keys)).isEqualTo(batches);
        assertThat(LookupResolver.MAX_KEYS_PER_QUERY).isEqualTo(500);
    }

    @Test
    void eachRowGetsTheValuesOfItsOnlyMatchUnderAliasQualifiedKeys() {
        Request request = LookupResolver.request(List.of(10L, 20L, 10L));
        List<Map<String, Object>> fetched = List.of(
                row("cust_no", new BigDecimal("10.0"), "cust_nm", "김가", "grade", "A"),
                row("cust_no", 20, "cust_nm", null, "grade", "B"));

        List<Outcome> outcomes = LookupResolver.match(EXACT, request, "cust_no", List.of("cust_nm", "grade"), fetched,
                false);

        assertThat(outcomes).allSatisfy(outcome -> {
            assertThat(outcome.failure()).isNull();
            assertThat(outcome.missed()).isFalse();
        });
        assertThat(outcomes.get(0).values()).containsExactly(entry("cust.cust_nm", "김가"), entry("cust.grade", "A"));
        assertThat(outcomes.get(1).values()).containsExactly(entry("cust.cust_nm", null), entry("cust.grade", "B"));
        assertThat(outcomes.get(2).values()).isEqualTo(outcomes.get(0).values());
    }

    @Test
    void twoLookupRowsForOneKeyStopOnlyTheRowsWithThatKey() {
        Request request = LookupResolver.request(List.of("C1", "C2"));
        List<Map<String, Object>> fetched = List.of(row("cust_no", "C1", "cust_nm", "가"),
                row("cust_no", "C1", "cust_nm", "나"), row("cust_no", "C2", "cust_nm", "다"));

        for (Lookup lookup : List.of(EXACT, OPTIONAL)) {
            List<Outcome> outcomes = LookupResolver.match(lookup, request, "cust_no", List.of("cust_nm"), fetched,
                    false);

            assertThat(outcomes.get(0)).isEqualTo(new Outcome(Failure.FANOUT, false, Map.of()));
            assertThat(outcomes.get(1).failure()).isNull();
            assertThat(outcomes.get(1).values()).containsExactly(entry("cust.cust_nm", "다"));
        }
    }

    /** 짝 없는 키·NULL 키·짝 없는 빈 문자열 키. 빈 문자열은 키라서 DB 가 그 행을 돌려주면 짝이 된다. */
    @Test
    void aMissingMatchOrANullKeyStopsExactlyOneAndBecomesNullForAtMostOne() {
        Request request = LookupResolver.request(Arrays.asList("C1", "C9", null, ""));
        List<Map<String, Object>> fetched = List.of(row("cust_no", "C1", "cust_nm", "가"));

        assertThat(LookupResolver.match(EXACT, request, "cust_no", List.of("cust_nm"),
                List.of(row("cust_no", "C1", "cust_nm", "가"), row("cust_no", "", "cust_nm", "빈키")), false))
                .extracting(Outcome::failure).containsExactly(null, Failure.MISSING, Failure.MISSING, null);

        List<Outcome> exact = LookupResolver.match(EXACT, request, "cust_no", List.of("cust_nm"), fetched, false);
        List<Outcome> optional = LookupResolver.match(OPTIONAL, request, "cust_no", List.of("cust_nm"), fetched,
                false);

        assertThat(exact).extracting(Outcome::failure)
                .containsExactly(null, Failure.MISSING, Failure.MISSING, Failure.MISSING);
        assertThat(exact.get(1).values()).isEmpty();
        assertThat(optional).extracting(Outcome::failure).containsOnlyNulls();
        assertThat(optional).extracting(Outcome::missed).containsExactly(false, true, true, true);
        assertThat(optional.get(1).values()).containsExactly(entry("cust.cust_nm", null));
    }

    /** 대소문자를 무시하는 collation 처럼 DB 가 요청과 다른 키의 행을 돌려주면, 키가 있는 행은 모두 멈춘다. */
    @Test
    void aLookupRowWhoseKeyWasNotRequestedStopsEveryRowThatHasAKey() {
        Request request = LookupResolver.request(Arrays.asList("abc", null, "C2"));
        List<Map<String, Object>> collated = List.of(row("cust_no", "ABC", "cust_nm", "가"),
                row("cust_no", "C2", "cust_nm", "나"));

        assertThat(LookupResolver.match(EXACT, request, "cust_no", List.of("cust_nm"), collated, false))
                .extracting(Outcome::failure)
                .containsExactly(Failure.KEY_MISMATCH, Failure.MISSING, Failure.KEY_MISMATCH);
        assertThat(LookupResolver.match(OPTIONAL, request, "cust_no", List.of("cust_nm"), collated, false))
                .extracting(Outcome::failure)
                .containsExactly(Failure.KEY_MISMATCH, null, Failure.KEY_MISMATCH);
        // 키가 비었거나 다른 계열인 조회 행도 요청한 키가 아니다.
        assertThat(LookupResolver.match(EXACT, LookupResolver.request(List.of("C2")), "cust_no", List.of("cust_nm"),
                List.of(row("cust_no", null, "cust_nm", "가"), row("cust_no", "C2", "cust_nm", "나")), false))
                .extracting(Outcome::failure).containsExactly(Failure.KEY_MISMATCH);
        assertThat(LookupResolver.match(EXACT, LookupResolver.request(List.of("10")), "cust_no", List.of("cust_nm"),
                List.of(row("cust_no", 10, "cust_nm", "가")), false)).extracting(Outcome::failure)
                .containsExactly(Failure.KEY_MISMATCH);
        assertThat(LookupResolver.match(EXACT, LookupResolver.request(List.of("C2")), "cust_no", List.of("cust_nm"),
                List.of(row("cust_no", 2.5d, "cust_nm", "가")), false)).extracting(Outcome::failure)
                .containsExactly(Failure.KEY_MISMATCH);
    }

    /**
     * 'abc' 행만 있는 조회 표를 'abc'·'ABC' 가 함께 든 chunk 로 물으면 대소문자를 무시하는 DB 는 'abc' 행 하나만 돌려준다 —
     * 요청한 키라서 첫 경로로는 모른다. 정확히 같은 글자의 짝이 없는 'ABC' 만 다시 묻고, DB 가 행을 돌려주면 두 짝의 수 모두
     * 키가 있는 행을 멈춘다. DB 가 아무것도 돌려주지 않으면 'ABC' 는 정말 짝이 없다.
     */
    @Test
    void aKeyWithoutAnExactMatchIsAskedAgainAndADatabaseMatchStopsEveryRowThatHasAKey() {
        Request request = LookupResolver.request(Arrays.asList("abc", "ABC", null, "abc"));
        List<Map<String, Object>> collated = List.of(row("cust_no", "abc", "cust_nm", "가"));

        assertThat(LookupResolver.unmatchedBindValues(request, "cust_no", collated)).containsExactly("ABC");
        assertThat(LookupResolver.match(EXACT, request, "cust_no", List.of("cust_nm"), collated, true))
                .extracting(Outcome::failure)
                .containsExactly(Failure.KEY_MISMATCH, Failure.KEY_MISMATCH, Failure.MISSING, Failure.KEY_MISMATCH);
        assertThat(LookupResolver.match(OPTIONAL, request, "cust_no", List.of("cust_nm"), collated, true))
                .extracting(Outcome::failure)
                .containsExactly(Failure.KEY_MISMATCH, Failure.KEY_MISMATCH, null, Failure.KEY_MISMATCH);

        List<Outcome> unmatched = LookupResolver.match(OPTIONAL, request, "cust_no", List.of("cust_nm"), collated,
                false);
        assertThat(unmatched).extracting(Outcome::failure).containsOnlyNulls();
        assertThat(unmatched).extracting(Outcome::missed).containsExactly(false, true, true, false);
    }

    /** 다시 물을 키는 요청 순서의 바인딩 원값이다. 이미 요청하지 않은 키의 행이 있으면 모두 멈추므로 다시 묻지 않는다. */
    @Test
    void theKeysToAskAgainAreTheFirstBoundValuesWithoutAnExactMatch() {
        Request request = LookupResolver.request(Arrays.asList(new BigDecimal("10.0"), 10L, 20L, "C1", 30L));
        List<Map<String, Object>> fetched = List.of(row("cust_no", 10, "cust_nm", "가"));

        assertThat(LookupResolver.unmatchedBindValues(request, "cust_no", fetched)).containsExactly(20L, "C1", 30L);
        assertThat(LookupResolver.unmatchedBindValues(request, "cust_no",
                List.of(row("cust_no", 10, "cust_nm", "가"), row("cust_no", 99, "cust_nm", "나")))).isEmpty();
        assertThat(LookupResolver.unmatchedBindValues(LookupResolver.request(List.of(10L)), "cust_no", fetched))
                .isEmpty();
        assertThat(LookupResolver.unmatchedBindValues(LookupResolver.request(List.of()), "cust_no", List.of()))
                .isEmpty();
    }

    @Test
    void aKeyThatIsNotTextOrAnExactNumberStopsItsRow() {
        Request request = LookupResolver.request(Arrays.asList(1.5d, 10L));

        assertThat(LookupResolver.match(OPTIONAL, request, "cust_no", List.of("cust_nm"),
                List.of(row("cust_no", 10L, "cust_nm", "가")), false)).extracting(Outcome::failure)
                .containsExactly(Failure.KEY_TYPE, null);
    }

    @Test
    void matchingRequiresTheCardinality() {
        Lookup undeclared = new Lookup("cust", "legacy.customer", null, new LookupKey("A", "B"), null, null);

        assertThatThrownBy(() -> LookupResolver.match(undeclared, LookupResolver.request(List.of()), "b", List.of(),
                List.of(), false)).isInstanceOf(NullPointerException.class).hasMessage("lookup cardinality");
    }

    @Test
    void missesAreCountedPerAliasUpToTheCapAndNeverPastIt() {
        LookupMisses misses = new LookupMisses();

        assertThat(misses.add("cust", 2)).isTrue();
        assertThat(misses.add("dept", 0)).isFalse();
        assertThat(misses.add("cust", 2)).isTrue();
        assertThat(misses.add("cust", 2)).isFalse();
        assertThat(misses.counts()).containsExactly(entry("cust", 2L));
        assertThatThrownBy(() -> misses.counts().put("x", 1L)).isInstanceOf(UnsupportedOperationException.class);
    }

    @Test
    void outcomesAndRequestsAreImmutableCopies() {
        Map<String, Object> values = new HashMap<>();
        values.put("cust.cust_nm", "가");
        Outcome outcome = new Outcome(null, false, values);
        values.put("cust.grade", "A");

        assertThat(outcome.values()).containsOnlyKeys("cust.cust_nm");
        assertThat(new Outcome(Failure.MISSING, false, null).values()).isEmpty();
        Request request = LookupResolver.request(List.of("C1"));
        assertThatThrownBy(() -> request.bindValues().add("C2")).isInstanceOf(UnsupportedOperationException.class);
        assertThatThrownBy(() -> request.keys().clear()).isInstanceOf(UnsupportedOperationException.class);
        assertThatThrownBy(() -> request.rowKeys().clear()).isInstanceOf(UnsupportedOperationException.class);
    }

    @Test
    void aLookupColumnReferenceSplitsAtTheFirstDot() {
        assertThat(LookupRef.parse("cust.CUST_NM")).isEqualTo(new LookupRef("cust", "CUST_NM"));
        assertThat(LookupRef.parse("cust.CUST_NM").rowKey()).isEqualTo("cust.cust_nm");
        assertThat(LookupRef.parse("CUST_NM")).isNull();
        assertThat(LookupRef.parse(null)).isNull();
        assertThat(LookupRef.parse("a.b.c")).isEqualTo(new LookupRef("a", "b.c"));
    }

    private static Map<String, Object> row(Object... pairs) {
        Map<String, Object> row = new LinkedHashMap<>();
        for (int index = 0; index < pairs.length; index += 2) {
            row.put((String) pairs[index], pairs[index + 1]);
        }
        return row;
    }
}
