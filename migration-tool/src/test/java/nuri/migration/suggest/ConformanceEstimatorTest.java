package nuri.migration.suggest;

import nuri.migration.suggest.SuggestionReport.ConformanceEstimate;
import nuri.migration.suggest.SuggestionReport.Violation;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static nuri.migration.suggest.ProfileFixture.column;
import static org.assertj.core.api.Assertions.assertThat;

/** 프로파일 집계로 데이터 범주와 도메인 적합성을 추정한다(ADR-0029 L2b-2). */
class ConformanceEstimatorTest {

    private static final StandardDictionary.Domain YMD8 = domain("날짜/시간", "연월일C8", "CHAR", 8);
    private static final StandardDictionary.Domain YN = domain("코드", "여부C1", "CHAR", 1);
    private static final StandardDictionary.Domain CODE3 = domain("코드", "코드C3", "VARCHAR", 3);
    private static final StandardDictionary.Domain NAME100 = domain("명칭", "명V100", "VARCHAR", 100);
    private static final StandardDictionary.Domain DATETIME = domain("날짜/시간", "연월일시분초D", "DATETIME", null);
    private static final StandardDictionary.Domain DATE = domain("날짜/시간", "연월일D", "DATE", null);
    private static final StandardDictionary.Domain AMOUNT = domain("금액", "금액N15", "NUMERIC", 15);

    @Test
    void theDataCategoryNeedsNinetyFivePercentOfTheValuesInOneShape() {
        assertThat(category(column("A"))).isEqualTo("EMPTY");
        assertThat(category(column("A").temporal(10))).isEqualTo("TEMPORAL");
        assertThat(category(column("A").text(100).pattern("YMD8", 95))).isEqualTo("DATE8");
        assertThat(category(column("A").text(100).pattern("YMD8", 94))).isEqualTo("TEXT");
        assertThat(category(column("A").text(20).pattern("YMDHMS14", 20))).isEqualTo("DATETIME14");
        assertThat(category(column("A").text(20).pattern("YMD_DASHED", 10).pattern("YMD_DOTTED", 10)))
                .isEqualTo("DATE_TEXT");
        assertThat(category(column("A").text(20).pattern("DATETIME_TEXT", 20))).isEqualTo("DATETIME_TEXT");
        assertThat(category(column("A").text(20).pattern("HMS6", 20))).isEqualTo("TIME6");
        assertThat(category(column("A").text(20).pattern("YN", 20))).isEqualTo("YN");
        assertThat(category(column("A").text(20).pattern("YN", 10).pattern("ONE_ZERO", 10))).isEqualTo("FLAG");
        assertThat(category(column("A").text(20).pattern("YN_LOWER", 10).pattern("TRUE_FALSE", 10)))
                .isEqualTo("FLAG");
        assertThat(category(column("A").number(5).text(15).pattern("INTEGER_TEXT", 15))).isEqualTo("NUMERIC");
        assertThat(category(column("A").text(20).pattern("DECIMAL_TEXT", 20))).isEqualTo("NUMERIC");
        assertThat(category(column("A").text(20).value("A01", 20))).isEqualTo("CODE");
    }

    @Test
    void eightDigitSerialNumbersAreNotDates() {
        assertThat(category(column("EMP_NO").number(100).pattern("YMD8", 100).invalidDates(60)))
                .isEqualTo("NUMERIC");
        assertThat(category(column("REG_YMD").number(100).pattern("YMD8", 100).invalidDates(5)))
                .isEqualTo("DATE8");
    }

    @Test
    void theDomainCategoryComesFromTheDomainNameAndType() {
        assertThat(ConformanceEstimator.domainCategory(YMD8)).isEqualTo("DATE8");
        assertThat(ConformanceEstimator.domainCategory(domain("날짜/시간", "연월일시분초C14", "CHAR", 14)))
                .isEqualTo("DATETIME14");
        assertThat(ConformanceEstimator.domainCategory(DATETIME)).isEqualTo("TEMPORAL");
        assertThat(ConformanceEstimator.domainCategory(DATE)).isEqualTo("TEMPORAL");
        assertThat(ConformanceEstimator.domainCategory(domain("날짜/시간", "시분초C6", "CHAR", 6)))
                .isEqualTo("TIME6");
        assertThat(ConformanceEstimator.domainCategory(YN)).isEqualTo("YN");
        assertThat(ConformanceEstimator.domainCategory(domain("코드", "유무C1", "CHAR", 1))).isEqualTo("YN");
        assertThat(ConformanceEstimator.domainCategory(AMOUNT)).isEqualTo("NUMERIC");
        assertThat(ConformanceEstimator.domainCategory(CODE3)).isEqualTo("CODE");
        assertThat(ConformanceEstimator.domainCategory(NAME100)).isEqualTo("TEXT");
        assertThat(ConformanceEstimator.domainCategory(null)).isEqualTo("TEXT");
    }

    @Test
    void onlyAClearDataShapeCanContradictADomain() {
        assertThat(ConformanceEstimator.compatible("DATE8", "TEMPORAL")).isTrue();
        assertThat(ConformanceEstimator.compatible("DATE8", "TEXT")).isFalse();
        assertThat(ConformanceEstimator.compatible("DATE_TEXT", "DATE8")).isTrue();
        assertThat(ConformanceEstimator.compatible("DATETIME_TEXT", "TEMPORAL")).isTrue();
        assertThat(ConformanceEstimator.compatible("DATETIME_TEXT", "DATE8")).isFalse();
        assertThat(ConformanceEstimator.compatible("DATETIME14", "DATE8")).isFalse();
        assertThat(ConformanceEstimator.compatible("TEMPORAL", "YN")).isFalse();
        assertThat(ConformanceEstimator.compatible("TIME6", "TIME6")).isTrue();
        assertThat(ConformanceEstimator.compatible("TIME6", "DATE8")).isFalse();
        assertThat(ConformanceEstimator.compatible("YN", "CODE")).isTrue();
        assertThat(ConformanceEstimator.compatible("FLAG", "NUMERIC")).isFalse();
        assertThat(ConformanceEstimator.compatible("NUMERIC", "TEXT")).isTrue();
        assertThat(ConformanceEstimator.compatible("NUMERIC", "DATE8")).isFalse();
        assertThat(ConformanceEstimator.compatible("TEXT", "DATE8")).isTrue();
        assertThat(ConformanceEstimator.compatible("CODE", "NUMERIC")).isTrue();
        assertThat(ConformanceEstimator.compatible("EMPTY", "TIME6")).isTrue();
    }

    @Test
    void eightDigitDatesCountCalendarMistakesAndPlaceholdersSeparately() {
        ConformanceEstimate estimate = ConformanceEstimator.estimate(column("REG_YMD").text(100)
                .pattern("YMD8", 98).invalidDates(3).pattern("PLACEHOLDER_DATE", 2).build(), YMD8, null);

        assertThat(estimate.rate()).isEqualByComparingTo("93.0");
        assertThat(estimate.violations()).containsExactly(new Violation("INVALID_DATE", 3L),
                new Violation("PLACEHOLDER_DATE", 2L), new Violation("FORMAT", 2L));
        assertThat(estimate.transform()).isNull();
    }

    @Test
    void dashedPlaceholdersAreNotTakenFromEightDigitDates() {
        ConformanceEstimate estimate = ConformanceEstimator.estimate(column("REG_YMD").text(100)
                .pattern("YMD8", 97).pattern("YMD_DASHED", 3).pattern("PLACEHOLDER_DATE_TEXT", 3).build(),
                YMD8, null);

        assertThat(estimate.rate()).isEqualByComparingTo("97.0");
        assertThat(estimate.violations()).containsExactly(new Violation("PLACEHOLDER_DATE", 3L));
    }

    @Test
    void textDatesAndDateValuesNeedAProjectTransformerForTheEightDigitDomain() {
        ConformanceEstimate dashed = ConformanceEstimator.estimate(column("REG_DT").text(40)
                .pattern("YMD_DASHED", 20).pattern("YMD_SLASHED", 10).pattern("YMD_DOTTED", 10).build(), YMD8, null);
        assertThat(dashed.rate()).isEqualByComparingTo("100.0");
        assertThat(dashed.transform()).isEqualTo("custom:ymd8");

        ConformanceEstimate typed = ConformanceEstimator.estimate(column("REG_DT").temporal(5).build(), YMD8, null);
        assertThat(typed.transform()).isEqualTo("custom:ymd8");
        assertThat(typed.rate()).isEqualByComparingTo("100.0");

        ConformanceEstimate toFourteen = ConformanceEstimator.estimate(column("REG_DT").temporal(4).build(),
                domain("날짜/시간", "연월일시분초C14", "CHAR", 14), null);
        assertThat(toFourteen.transform()).isEqualTo("custom:ymdhms14");
    }

    @Test
    void textDatesIntoADateColumnUseTheMappingTypeVocabulary() {
        ConformanceEstimate eight = ConformanceEstimator.estimate(column("REG_YMD").text(10)
                .pattern("YMD8", 10).invalidDates(1).build(), DATE, null);
        assertThat(eight.transform()).isEqualTo("type:date");
        assertThat(eight.rate()).isEqualByComparingTo("90.0");
        assertThat(eight.violations()).containsExactly(new Violation("INVALID_DATE", 1L));

        ConformanceEstimate dashed = ConformanceEstimator.estimate(column("REG_DT").text(10)
                .pattern("YMD_DASHED", 10).build(), DATE, null);
        assertThat(dashed.transform()).isEqualTo("type:date");
        assertThat(dashed.rate()).isEqualByComparingTo("100.0");

        ConformanceEstimate stamp = ConformanceEstimator.estimate(column("REG_DT").text(10)
                .pattern("DATETIME_TEXT", 10).build(), DATETIME, null);
        assertThat(stamp.transform()).isEqualTo("type:timestamp");
        assertThat(stamp.rate()).isEqualByComparingTo("100.0");

        ConformanceEstimate basic = ConformanceEstimator.estimate(column("REG_DT").text(10)
                .pattern("YMDHMS14", 10).build(), DATETIME, null);
        assertThat(basic.transform()).isEqualTo("custom:date-text");
        assertThat(basic.rate()).isEqualByComparingTo("100.0");

        ConformanceEstimate mixed = ConformanceEstimator.estimate(column("REG_DT").text(10)
                .pattern("YMD8", 5).pattern("DATETIME_TEXT", 5).build(), DATETIME, null);
        assertThat(mixed.transform()).isEqualTo(ConformanceEstimator.MIXED);

        ConformanceEstimate shapes = ConformanceEstimator.estimate(column("REG_YMD").text(10)
                .pattern("YMD8", 6).pattern("PLACEHOLDER_DATE", 1)
                .pattern("YMD_DASHED", 4).pattern("PLACEHOLDER_DATE_TEXT", 1).build(), DATE, null);
        assertThat(shapes.rate()).isEqualByComparingTo("80.0");
        assertThat(shapes.violations()).containsExactly(new Violation("PLACEHOLDER_DATE", 2L));
        assertThat(shapes.transform()).isEqualTo("type:date");

        ConformanceEstimate fourteen = ConformanceEstimator.estimate(column("REG_DT").temporal(2).text(3)
                .pattern("DATETIME_TEXT", 3).build(), domain("날짜/시간", "연월일시분초C14", "CHAR", 14), null);
        assertThat(fourteen.rate()).isEqualByComparingTo("100.0");
        assertThat(category(column("REG_DT").text(20).pattern("YMD_SLASHED", 20))).isEqualTo("DATE_TEXT");
    }

    @Test
    void flagsOtherThanUpperYnNeedACodemap() {
        ConformanceEstimate flags = ConformanceEstimator.estimate(column("USE_AT").text(10)
                .pattern("YN", 4).pattern("YN_LOWER", 2).pattern("ONE_ZERO", 2).pattern("TRUE_FALSE", 2).build(),
                YN, null);
        assertThat(flags.transform()).isEqualTo("codemap");
        assertThat(flags.rate()).isEqualByComparingTo("100.0");

        ConformanceEstimate plain = ConformanceEstimator.estimate(column("USE_YN").text(10)
                .pattern("YN", 9).build(), YN, null);
        assertThat(plain.transform()).isNull();
        assertThat(plain.violations()).containsExactly(new Violation("FORMAT", 1L));
    }

    @Test
    void numbersAreCountedOnceAndTheRateNeverExceedsAHundred() {
        ConformanceEstimate numbers = ConformanceEstimator.estimate(column("AMT").number(10).build(), AMOUNT, null);
        assertThat(numbers.rate()).isEqualByComparingTo("100.0");
        assertThat(numbers.transform()).isNull();

        ConformanceEstimate text = ConformanceEstimator.estimate(column("AMT").number(6).text(4)
                .pattern("INTEGER_TEXT", 1).pattern("DECIMAL_TEXT", 2).build(), AMOUNT, null);
        assertThat(text.rate()).isEqualByComparingTo("90.0");
        assertThat(text.violations()).containsExactly(new Violation("FORMAT", 1L));
        assertThat(text.transform()).isEqualTo("type:numeric");

        ConformanceEstimate overlapping = ConformanceEstimator.estimate(column("AMT").number(10)
                .pattern("INTEGER_TEXT", 10).build(), AMOUNT, null);
        assertThat(overlapping.rate()).isEqualByComparingTo("100.0");

        assertThat(ConformanceEstimator.estimate(column("SN").text(2).pattern("INTEGER_TEXT", 2).build(),
                domain("번호", "일련번호N10", "INTEGER", 10), null).transform()).isEqualTo("type:integer");
        assertThat(ConformanceEstimator.estimate(column("SN").text(2).pattern("INTEGER_TEXT", 2).build(),
                domain("번호", "일련번호N19", "BIGINT", 19), null).transform()).isEqualTo("type:bigint");
    }

    @Test
    void allowedValuesAreCheckedOnlyWhenEveryValueIsKnown() {
        ConformanceEstimate counted = ConformanceEstimator.estimate(column("STTS_CD").text(10)
                .value("A01", 6).value("ZZZ", 4).build(), CODE3, "A01 : 신청, B01 : 승인");
        assertThat(counted.rate()).isEqualByComparingTo("60.0");
        assertThat(counted.violations()).containsExactly(new Violation("NOT_ALLOWED", 4L));

        ConformanceEstimate rare = ConformanceEstimator.estimate(column("STTS_CD").text(10)
                .value("A01", 8).rare(2).build(), CODE3, "A01 : 신청, B01 : 승인");
        assertThat(rare.rate()).isNull();
        assertThat(rare.violations()).containsExactly(new Violation("ALLOWED_VALUES_UNVERIFIED", 2L));

        ConformanceEstimate withheld = ConformanceEstimator.estimate(column("STTS_CD").text(10)
                .omitted("PERSONAL_PATTERN").build(), CODE3, "A01 : 신청");
        assertThat(withheld.rate()).isNull();
        assertThat(withheld.violations()).containsExactly(new Violation("ALLOWED_VALUES_UNVERIFIED", null));

        ConformanceEstimate truncatedList = ConformanceEstimator.estimate(column("STTS_CD").text(10)
                .value("ZZZ", 10).build(), CODE3, "A01 : 신청, B01 : 승인 …");
        assertThat(truncatedList.rate()).isEqualByComparingTo("100.0");
        assertThat(truncatedList.violations()).isEmpty();
    }

    @Test
    void aValueOutsideTheYnShapeIsAFormatViolationNotAlsoAnAllowedValueViolation() {
        ConformanceEstimate estimate = ConformanceEstimator.estimate(column("USE_YN").text(100).pattern("YN", 90)
                .value("Y", 60).value("N", 30).value("X", 10).build(), YN, "Y : 예, N : 아니오");

        assertThat(estimate.rate()).isEqualByComparingTo("90.0");
        assertThat(estimate.violations()).containsExactly(new Violation("FORMAT", 10L));

        ConformanceEstimate narrow = ConformanceEstimator.estimate(column("USE_YN").text(10).pattern("YN", 6)
                .pattern("ONE_ZERO", 4).value("Y", 6).value("0", 4).build(), YN, "Y : 사용");
        assertThat(narrow.violations()).containsExactly(new Violation("NOT_ALLOWED", 4L));
        assertThat(narrow.rate()).isEqualByComparingTo("60.0");
    }

    @Test
    void aValueLongerThanTheDomainCannotBeCountedFromAggregates() {
        ConformanceEstimate estimate = ConformanceEstimator.estimate(column("USER_NM").text(10).maxLength(120)
                .build(), NAME100, null);
        assertThat(estimate.rate()).isNull();
        assertThat(estimate.violations()).containsExactly(new Violation("LENGTH_EXCEEDED", null));

        assertThat(ConformanceEstimator.estimate(column("USER_NM").text(10).maxLength(100).build(), NAME100, null)
                .rate()).isEqualByComparingTo(BigDecimal.valueOf(100));
    }

    @Test
    void timesAreCountedByTheirOwnShape() {
        ConformanceEstimate time = ConformanceEstimator.estimate(column("REG_TM").text(4).pattern("HMS6", 3)
                .build(), domain("날짜/시간", "시분초C6", "CHAR", 6), null);
        assertThat(time.rate()).isEqualByComparingTo("75.0");
    }

    @Test
    void withoutADomainOrValuesNothingIsEstimated() {
        assertThat(ConformanceEstimator.estimate(column("A").text(3).build(), null, null))
                .isEqualTo(new ConformanceEstimate(null, List.of(), null));
        assertThat(ConformanceEstimator.estimate(column("A").build(), YMD8, null).rate()).isNull();
    }

    @Test
    void onlyCodesBeforeAColonAreAllowedValues() {
        assertThat(ConformanceEstimator.allowedCodes("Y : 여(예), N : 부(아니오)")).containsExactly("Y", "N");
        assertThat(ConformanceEstimator.allowedCodes("01 : 무학력, 02 : 취학면제 …")).isEmpty();
        assertThat(ConformanceEstimator.allowedCodes("A : 가 ...")).isEmpty();
        assertThat(ConformanceEstimator.allowedCodes(null)).isEmpty();
        assertThat(ConformanceEstimator.allowedCodes("자유 서술")).isEmpty();
    }

    @Test
    void ynValuesAreReadAfterTheCodemapTheyWouldNeed() {
        assertThat(List.of("Y", "y", "1", "T", "true").stream().map(ConformanceEstimator::yn))
                .containsOnly("Y");
        assertThat(List.of("N", "n", "0", "F", "false").stream().map(ConformanceEstimator::yn))
                .containsOnly("N");
        assertThat(ConformanceEstimator.yn("X")).isNull();
    }

    private static String category(ProfileFixture column) {
        return ConformanceEstimator.dataCategory(column.build());
    }

    private static StandardDictionary.Domain domain(String group, String name, String type, Integer length) {
        return new StandardDictionary.Domain(group, name, type, length);
    }
}
