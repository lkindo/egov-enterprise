package nuri.migration.suggest;

import nuri.migration.suggest.SuggestionReport.ConformanceEstimate;
import nuri.migration.suggest.SuggestionReport.Violation;
import nuri.migration.validate.ledger.LoadCapabilities;
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
        assertThat(ConformanceEstimator.compatible("FLAG", "NUMERIC")).isTrue();
        assertThat(ConformanceEstimator.compatible("FLAG", "TEXT")).isFalse();
        assertThat(ConformanceEstimator.compatible("TIME6", "NUMERIC")).isTrue();
        assertThat(ConformanceEstimator.compatible("TIME6", "TEXT")).isTrue();
        assertThat(ConformanceEstimator.compatible("TIME6", "YN")).isFalse();
        assertThat(ConformanceEstimator.compatible("NUMERIC", "TIME6")).isTrue();
        assertThat(ConformanceEstimator.compatible("NUMERIC", "YN")).isFalse();
        assertThat(ConformanceEstimator.compatible("UNSUPPORTED", "DATE8")).isTrue();
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
        assertThat(estimate.transform()).isEqualTo("transform:ymd8");
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
    void fixedFormatDomainsAlwaysNameTheirStandardTransformer() {
        ConformanceEstimate dashed = ConformanceEstimator.estimate(column("REG_DT").text(40)
                .pattern("YMD_DASHED", 20).pattern("YMD_SLASHED", 10).pattern("YMD_DOTTED", 10).build(), YMD8, null);
        assertThat(dashed.rate()).isEqualByComparingTo("100.0");
        assertThat(dashed.transform()).isEqualTo("transform:ymd8");

        ConformanceEstimate typed = ConformanceEstimator.estimate(column("REG_DT").temporal(5).build(), YMD8, null);
        assertThat(typed.transform()).isEqualTo("transform:ymd8");
        assertThat(typed.rate()).isEqualByComparingTo("100.0");

        ConformanceEstimate eight = ConformanceEstimator.estimate(column("REG_YMD").text(5).pattern("YMD8", 5)
                .build(), YMD8, null);
        assertThat(eight.transform()).as("이미 8자리여도 도메인 가드가 요구하는 변환기다").isEqualTo("transform:ymd8");
        ConformanceEstimate nothingFits = ConformanceEstimator.estimate(column("REG_YMD").text(5).build(), YMD8,
                null);
        assertThat(nothingFits.violations()).containsExactly(new Violation("FORMAT", 5L));
        assertThat(nothingFits.transform()).as("모양과 상관없이").isEqualTo("transform:ymd8");

        ConformanceEstimate toFourteen = ConformanceEstimator.estimate(column("REG_DT").temporal(4).build(),
                domain("날짜/시간", "연월일시분초C14", "CHAR", 14), null);
        assertThat(toFourteen.transform()).isEqualTo("transform:ymdhms14");
        assertThat(ConformanceEstimator.estimate(column("REG_DT").text(4).pattern("YMDHMS14", 4).build(),
                domain("날짜/시간", "연월일시분초C14", "CHAR", 14), null).transform()).isEqualTo("transform:ymdhms14");
    }

    @Test
    void textDatesIntoADateColumnUseTheMappingTypeVocabulary() {
        ConformanceEstimate eight = ConformanceEstimator.estimate(column("REG_YMD").text(10)
                .pattern("YMD8", 10).invalidDates(1).build(), DATE, null);
        assertThat(eight.transform()).isEqualTo("transform:date-text");
        assertThat(eight.rate()).isEqualByComparingTo("90.0");
        assertThat(eight.violations()).containsExactly(new Violation("INVALID_DATE", 1L));

        ConformanceEstimate dashed = ConformanceEstimator.estimate(column("REG_DT").text(10)
                .pattern("YMD_DASHED", 10).build(), DATE, null);
        assertThat(dashed.transform()).isEqualTo("transform:date-text");
        assertThat(dashed.rate()).isEqualByComparingTo("100.0");

        ConformanceEstimate stamp = ConformanceEstimator.estimate(column("REG_DT").text(10)
                .pattern("DATETIME_TEXT", 10).pattern("DATETIME_DASHED", 10).build(), DATETIME, null);
        assertThat(stamp.transform()).isEqualTo("transform:timestamp-text");
        assertThat(stamp.rate()).isEqualByComparingTo("100.0");

        ConformanceEstimate slashed = ConformanceEstimator.estimate(column("REG_DT").text(10)
                .pattern("DATETIME_TEXT", 10).build(), DATETIME, null);
        assertThat(slashed.transform()).isEqualTo("transform:timestamp-text");
        ConformanceEstimate bothSeparators = ConformanceEstimator.estimate(column("REG_DT").text(10)
                .pattern("DATETIME_TEXT", 10).pattern("DATETIME_DASHED", 6).build(), DATETIME, null);
        assertThat(bothSeparators.transform()).as("timestamp-text 는 두 구분자를 다 읽는다")
                .isEqualTo("transform:timestamp-text");
        assertThat(bothSeparators.rate()).isEqualByComparingTo("100.0");

        ConformanceEstimate basic = ConformanceEstimator.estimate(column("REG_DT").text(10)
                .pattern("YMDHMS14", 10).build(), DATETIME, null);
        assertThat(basic.transform()).isEqualTo("transform:timestamp-text");
        assertThat(basic.rate()).isEqualByComparingTo("100.0");

        ConformanceEstimate mixed = ConformanceEstimator.estimate(column("REG_DT").text(10)
                .pattern("YMD8", 5).pattern("DATETIME_TEXT", 5).pattern("DATETIME_DASHED", 5).build(), DATETIME,
                null);
        assertThat(mixed.transform()).isEqualTo("mixed").isEqualTo(ConformanceEstimator.MIXED);

        ConformanceEstimate shapes = ConformanceEstimator.estimate(column("REG_YMD").text(10)
                .pattern("YMD8", 6).pattern("PLACEHOLDER_DATE", 1)
                .pattern("YMD_DASHED", 4).pattern("PLACEHOLDER_DATE_TEXT", 1).build(), DATE, null);
        assertThat(shapes.rate()).isEqualByComparingTo("80.0");
        assertThat(shapes.violations()).containsExactly(new Violation("PLACEHOLDER_DATE", 2L));
        assertThat(shapes.transform()).isEqualTo("transform:date-text");

        ConformanceEstimate fourteen = ConformanceEstimator.estimate(column("REG_DT").temporal(2).text(3)
                .pattern("DATETIME_TEXT", 3).build(), domain("날짜/시간", "연월일시분초C14", "CHAR", 14), null);
        assertThat(fourteen.rate()).isEqualByComparingTo("100.0");
        assertThat(fourteen.transform()).isEqualTo("transform:ymdhms14");
        assertThat(category(column("REG_DT").text(20).pattern("YMD_SLASHED", 20))).isEqualTo("DATE_TEXT");
    }

    @Test
    void timestampColumnsNameTheTransformerForDateOnlyAndDateTimeValues() {
        ConformanceEstimate dateOnly = ConformanceEstimator.estimate(column("REG_DT").text(10)
                .pattern("YMD8", 4).pattern("YMD_DASHED", 3).pattern("YMD_SLASHED", 2).pattern("YMD_DOTTED", 1)
                .build(), DATETIME, null);
        assertThat(dateOnly.transform()).isEqualTo("transform:timestamp-from-date");
        assertThat(dateOnly.rate()).isEqualByComparingTo("100.0");

        ConformanceEstimate dateTyped = ConformanceEstimator.estimate(column("REG_DT").declaredType("DATE", 91)
                .temporal(5).build(), DATETIME, null);
        assertThat(dateTyped.transform()).as("날짜 타입 값은 자정을 붙여야 일시 컬럼에 쓴다")
                .isEqualTo("transform:timestamp-from-date");
        ConformanceEstimate timestampTyped = ConformanceEstimator.estimate(column("REG_DT")
                .declaredType("TIMESTAMP", 93).temporal(5).build(), DATETIME, null);
        assertThat(timestampTyped.transform()).isNull();
        ConformanceEstimate intoDate = ConformanceEstimator.estimate(column("REG_DT").declaredType("DATE", 91)
                .temporal(5).build(), DATE, null);
        assertThat(intoDate.transform()).as("날짜 컬럼에는 그대로 쓴다").isNull();

        ConformanceEstimate mixedTyped = ConformanceEstimator.estimate(column("REG_DT").declaredType("DATE", 91)
                .temporal(5).text(5).pattern("DATETIME_TEXT", 5).build(), DATETIME, null);
        assertThat(mixedTyped.transform()).isEqualTo(ConformanceEstimator.MIXED);
        ConformanceEstimate dateText = ConformanceEstimator.estimate(column("REG_DT").text(4)
                .pattern("DATETIME_TEXT", 2).pattern("YMDHMS14", 2).build(), DATE, null);
        assertThat(dateText.transform()).isEqualTo("transform:date-text");
    }

    @Test
    void flagsNeedACodemapAndPlainYnNeedsTheYnTransformer() {
        ConformanceEstimate flags = ConformanceEstimator.estimate(column("USE_AT").text(10)
                .pattern("YN", 4).pattern("YN_LOWER", 2).pattern("ONE_ZERO", 2).pattern("TRUE_FALSE", 2).build(),
                YN, null);
        assertThat(flags.transform()).isEqualTo("codemap");
        assertThat(flags.rate()).isEqualByComparingTo("100.0");
        assertThat(ConformanceEstimator.estimate(column("USE_AT").text(10).pattern("YN", 9).pattern("TRUE_FALSE", 1)
                .build(), YN, null).transform()).as("플래그가 하나라도 섞이면").isEqualTo("codemap");
        assertThat(ConformanceEstimator.estimate(column("USE_AT").text(10).pattern("ONE_ZERO", 10).build(), YN,
                null).transform()).isEqualTo("codemap");

        ConformanceEstimate plain = ConformanceEstimator.estimate(column("USE_YN").text(10)
                .pattern("YN", 9).build(), YN, null);
        assertThat(plain.transform()).isEqualTo("transform:yn");
        assertThat(plain.violations()).containsExactly(new Violation("FORMAT", 1L));
        ConformanceEstimate lower = ConformanceEstimator.estimate(column("USE_YN").text(10)
                .pattern("YN", 6).pattern("YN_LOWER", 4).build(), YN, null);
        assertThat(lower.transform()).as("yn 은 대소문자를 가리지 않는다").isEqualTo("transform:yn");
        assertThat(ConformanceEstimator.estimate(column("USE_YN").text(10).build(), YN, null).transform())
                .as("Y·N 이 하나도 없으면 제안하지 않는다").isNull();
    }

    @Test
    void numbersAreCountedOnceAndTheRateNeverExceedsAHundred() {
        ConformanceEstimate numbers = ConformanceEstimator.estimate(column("AMT").number(10).declared(15L, 0)
                .build(), AMOUNT, null);
        assertThat(numbers.rate()).isEqualByComparingTo("100.0");
        assertThat(numbers.transform()).isNull();

        ConformanceEstimate text = ConformanceEstimator.estimate(column("AMT").number(6).text(4).declared(12L, 2)
                .pattern("INTEGER_TEXT", 1).pattern("DECIMAL_TEXT", 2).build(), AMOUNT, null);
        assertThat(text.rate()).isEqualByComparingTo("90.0");
        assertThat(text.violations()).containsExactly(new Violation("FORMAT", 1L));
        assertThat(text.transform()).isEqualTo("type:numeric");

        ConformanceEstimate overlapping = ConformanceEstimator.estimate(column("AMT").number(10).declared(10L, 0)
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
        assertThat(truncatedList.rate()).isNull();
        assertThat(truncatedList.violations()).containsExactly(new Violation("ALLOWED_VALUES_UNVERIFIED", null));

        ConformanceEstimate unreadable = ConformanceEstimator.estimate(column("STTS_CD").text(10)
                .value("ZZZ", 10).build(), CODE3, "자유 서술");
        assertThat(unreadable.rate()).isNull();

        ConformanceEstimate noList = ConformanceEstimator.estimate(column("STTS_CD").text(10)
                .value("ZZZ", 10).build(), CODE3, null);
        assertThat(noList.rate()).isEqualByComparingTo("100.0");
        assertThat(noList.violations()).isEmpty();
    }

    @Test
    void rareYnValuesAreUnverifiedOnlyWhenTheyHaveTheYnShape() {
        ConformanceEstimate format = ConformanceEstimator.estimate(column("USE_YN").text(102).pattern("YN", 100)
                .value("Y", 50).value("N", 50).rare(2).build(), YN, "Y : 예, N : 아니오");
        assertThat(format.violations()).containsExactly(new Violation("FORMAT", 2L));
        assertThat(format.rate()).isEqualByComparingTo("98.0");

        ConformanceEstimate shaped = ConformanceEstimator.estimate(column("USE_YN").text(53).pattern("YN", 53)
                .value("Y", 50).rare(3).build(), YN, "Y : 예, N : 아니오");
        assertThat(shaped.violations()).containsExactly(new Violation("ALLOWED_VALUES_UNVERIFIED", 3L));
        assertThat(shaped.rate()).isNull();
    }

    @Test
    void blankStringsCountInTheDenominatorAndAreViolationsOutsideFreeText() {
        ConformanceEstimate date = ConformanceEstimator.estimate(column("REG_YMD").text(1).pattern("YMD8", 1)
                .blanks(9).build(), YMD8, null);
        assertThat(date.rate()).isEqualByComparingTo("10.0");
        assertThat(date.violations()).containsExactly(new Violation("BLANK", 9L));

        ConformanceEstimate name = ConformanceEstimator.estimate(column("USER_NM").text(1).blanks(9).build(),
                NAME100, null);
        assertThat(name.rate()).isEqualByComparingTo("100.0");
        assertThat(name.violations()).isEmpty();

        ConformanceEstimate onlyBlanks = ConformanceEstimator.estimate(column("REG_YMD").blanks(4).build(), YMD8,
                null);
        assertThat(onlyBlanks.rate()).isEqualByComparingTo("0.0");
        assertThat(category(column("REG_YMD").blanks(4))).isEqualTo("EMPTY");
    }

    @Test
    void lobAndTimeOnlyValuesCannotBeEstimated() {
        assertThat(category(column("CN").lob(2))).isEqualTo("UNSUPPORTED");
        assertThat(category(column("REG_TM").other(2))).isEqualTo("UNSUPPORTED");
        ConformanceEstimate content = ConformanceEstimator.estimate(column("CN").lob(2).build(), NAME100, null);
        assertThat(content.rate()).isNull();
        assertThat(content.violations()).containsExactly(new Violation("UNSUPPORTED_VALUE_TYPE", 2L));
    }

    @Test
    void numericWidthComesFromTheLongestTextOrTheDeclaredPrecision() {
        ConformanceEstimate wideText = ConformanceEstimator.estimate(column("AMT").text(3).maxLength(20)
                .pattern("INTEGER_TEXT", 3).build(), AMOUNT, null);
        assertThat(wideText.rate()).isNull();
        assertThat(wideText.violations()).containsExactly(new Violation("LENGTH_UNVERIFIED", null));

        ConformanceEstimate wideNumber = ConformanceEstimator.estimate(column("AMT").number(3).declared(20L, 0)
                .build(), AMOUNT, null);
        assertThat(wideNumber.violations()).containsExactly(new Violation("LENGTH_UNVERIFIED", null));
        assertThat(ConformanceEstimator.estimate(column("AMT").number(3).declared(null, null).build(), AMOUNT,
                null).rate()).isNull();
        assertThat(ConformanceEstimator.estimate(column("AMT").number(3).declared(15L, 0).build(), AMOUNT, null)
                .rate()).isEqualByComparingTo("100.0");

        StandardDictionary.Domain number10 = domain("번호", "번호V10", "VARCHAR", 10);
        assertThat(ConformanceEstimator.estimate(column("NO").number(3).declared(8L, 0).build(), number10, null)
                .rate()).isEqualByComparingTo("100.0");
        assertThat(ConformanceEstimator.estimate(column("NO").number(3).declared(8L, 2).build(), number10, null)
                .rate()).isEqualByComparingTo("100.0");
        assertThat(ConformanceEstimator.estimate(column("NO").number(3).declared(9L, 2).build(), number10, null)
                .violations()).containsExactly(new Violation("LENGTH_UNVERIFIED", null));
    }

    @Test
    void aSampledTableHasNoRate() {
        ConformanceEstimate sampled = ConformanceEstimator.estimate(column("REG_YMD").text(10).pattern("YMD8", 10)
                .build(), YMD8, null, true);
        assertThat(sampled.rate()).isNull();
        assertThat(sampled.violations()).containsExactly(new Violation("SAMPLED", null));
        assertThat(sampled.transform()).isEqualTo("transform:ymd8");
    }

    @Test
    void fourteenDigitSerialNumbersAreNotDateTimes() {
        assertThat(category(column("SN").number(40).pattern("YMDHMS14", 40).invalidDateTimes(40)))
                .isEqualTo("NUMERIC");
        assertThat(category(column("REG_DT").text(40).pattern("YMDHMS14", 40).invalidDateTimes(1)))
                .isEqualTo("DATETIME14");
        ConformanceEstimate fourteen = ConformanceEstimator.estimate(column("REG_DT").text(10)
                .pattern("YMDHMS14", 10).invalidDateTimes(2).build(), domain("날짜/시간", "연월일시분초C14", "CHAR",
                14), null);
        assertThat(fourteen.rate()).isEqualByComparingTo("80.0");
        assertThat(fourteen.violations()).containsExactly(new Violation("INVALID_DATE", 2L));
        ConformanceEstimate stamp = ConformanceEstimator.estimate(column("REG_DT").text(10)
                .pattern("YMDHMS14", 10).invalidDateTimes(2).build(), DATETIME, null);
        assertThat(stamp.violations()).containsExactly(new Violation("INVALID_DATE", 2L));
        assertThat(stamp.rate()).isEqualByComparingTo("80.0");
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
        assertThat(time.transform()).isEqualTo("transform:hms6");
    }

    @Test
    void withoutADomainOrValuesNothingIsEstimated() {
        assertThat(ConformanceEstimator.estimate(column("A").text(3).build(), null, null))
                .isEqualTo(new ConformanceEstimate(null, List.of(), null));
        assertThat(ConformanceEstimator.estimate(column("A").build(), YMD8, null))
                .isEqualTo(new ConformanceEstimate(null, List.of(), null));
    }

    @Test
    void everyHintIsInTheMappingVocabulary() {
        LoadCapabilities capabilities = new LoadCapabilities();
        List<ConformanceEstimate> estimates = List.of(
                ConformanceEstimator.estimate(column("A").text(3).pattern("YMD8", 3).build(), YMD8, null),
                ConformanceEstimator.estimate(column("A").text(3).pattern("YMD8", 3).build(), DATE, null),
                ConformanceEstimator.estimate(column("A").text(3).pattern("YMD8", 3).build(), DATETIME, null),
                ConformanceEstimator.estimate(column("A").text(3).pattern("DATETIME_TEXT", 3).build(), DATETIME,
                        null),
                ConformanceEstimator.estimate(column("A").text(3).pattern("HMS6", 3).build(),
                        domain("날짜/시간", "시분초C6", "CHAR", 6), null),
                ConformanceEstimator.estimate(column("A").text(3).pattern("YN", 3).build(), YN, null),
                ConformanceEstimator.estimate(column("A").text(3).pattern("ONE_ZERO", 3).build(), YN, null),
                ConformanceEstimator.estimate(column("A").text(3).pattern("INTEGER_TEXT", 3).build(), AMOUNT, null));
        assertThat(estimates).extracting(ConformanceEstimate::transform).doesNotContainNull()
                .allSatisfy(hint -> assertThat(capabilities.hint(hint)).as(hint).isTrue())
                .noneMatch(hint -> hint.startsWith("custom:"));
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
