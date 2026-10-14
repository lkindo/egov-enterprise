package nuri.migration.profile;

import nuri.migration.profile.ColumnProfiler.ColumnDeclaration;
import nuri.migration.profile.SourceProfile.ColumnProfile;
import nuri.migration.profile.SourceProfile.CommentEvidence;
import nuri.migration.profile.SourceProfile.ValueFrequency;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class ColumnProfilerTest {

    private static final ColumnDeclaration DECLARATION =
            new ColumnDeclaration("STAT_CD", 3, "VARCHAR", 12, 2L, 0, true);
    private static final CommentEvidence NO_COMMENT = new CommentEvidence(null, false, null, "ABSENT");

    @Test
    void codeColumnKeepsFrequentUppercaseValuesAndFoldsRareOnesIntoCounts() {
        ColumnProfiler profiler = new ColumnProfiler();
        feed(profiler, "A", 7);
        feed(profiler, "B ", 5);
        feed(profiler, "C", 2);
        profiler.accept(null);
        profiler.accept("  ");

        ColumnProfile profile = profiler.finish(DECLARATION, NO_COMMENT);

        assertThat(profile.rows()).isEqualTo(16);
        assertThat(profile.nulls()).isEqualTo(1);
        assertThat(profile.blanks()).isEqualTo(1);
        assertThat(profile.textValues()).isEqualTo(14);
        assertThat(profile.trailingSpaces()).isEqualTo(5);
        assertThat(profile.distinct()).isEqualTo(3);
        assertThat(profile.valueFrequencies())
                .containsExactly(new ValueFrequency("A", 7), new ValueFrequency("B", 5));
        assertThat(profile.rareValueRows()).isEqualTo(2);
        assertThat(profile.rareDistinctValues()).isEqualTo(1);
        assertThat(profile.frequencyOmittedReason()).isNull();
        assertThat(profile.minLength()).isEqualTo(1);
        assertThat(profile.maxLength()).isEqualTo(2);
    }

    @Test
    void personalPatternsSuppressEveryFrequencyEvenWhenOtherValuesLookLikeCodes() {
        ColumnProfiler profiler = new ColumnProfiler();
        feed(profiler, "Y", 10);
        profiler.accept("010-1234-5678");

        ColumnProfile profile = profiler.finish(DECLARATION, NO_COMMENT);

        assertThat(profile.personalPatternDetected()).isTrue();
        assertThat(profile.patternMatches()).containsEntry("PHONE", 1L).containsEntry("YN", 10L);
        assertThat(profile.valueFrequencies()).isEmpty();
        assertThat(profile.frequencyOmittedReason()).isEqualTo("PERSONAL_PATTERN");
    }

    @Test
    void lowercaseAccountLikeValuesAreNeverListedAsCodes() {
        ColumnProfiler profiler = new ColumnProfiler();
        feed(profiler, "admin", 20);
        feed(profiler, "hong01", 20);

        ColumnProfile profile = profiler.finish(DECLARATION, NO_COMMENT);

        assertThat(profile.valueFrequencies()).isEmpty();
        assertThat(profile.frequencyOmittedReason()).isEqualTo("NON_CODE_SHAPE");
    }

    @Test
    void highCardinalityAndTheDistinctCapAreReportedWithoutValues() {
        ColumnProfiler profiler = new ColumnProfiler();
        for (int index = 0; index < ColumnProfiler.DISTINCT_CAP + 5; index++) {
            profiler.accept("V" + index);
        }

        ColumnProfile profile = profiler.finish(DECLARATION, NO_COMMENT);

        assertThat(profile.distinct()).isEqualTo(ColumnProfiler.DISTINCT_CAP);
        assertThat(profile.distinctCapped()).isTrue();
        assertThat(profile.frequencyOmittedReason()).isEqualTo("HIGH_CARDINALITY");
        assertThat(profile.valueFrequencies()).isEmpty();
    }

    @Test
    void dateShapedTextCountsInvalidCalendarDatesAndPlaceholdersSeparately() {
        ColumnProfiler profiler = new ColumnProfiler();
        profiler.accept("20240131");
        profiler.accept("20240230");
        profiler.accept("99991231");
        profiler.accept("19991231");

        ColumnProfile profile = profiler.finish(DECLARATION, NO_COMMENT);

        assertThat(profile.patternMatches()).containsEntry("YMD8", 4L).containsEntry("PLACEHOLDER_DATE", 1L);
        assertThat(profile.ymd8Invalid()).isEqualTo(1);
        assertThat(profile.minYear()).isEqualTo(1999);
        assertThat(profile.maxYear()).isEqualTo(2024);
    }

    @Test
    void temporalLobAndNumericValuesAreCountedByKindWithoutListingValues() {
        ColumnProfiler profiler = new ColumnProfiler();
        profiler.accept(Timestamp.valueOf("2021-05-01 10:00:00"));
        profiler.accept(LocalDate.of(2023, 1, 1));
        profiler.accept(new byte[] {1, 2, 3});
        profiler.accept(new BigDecimal("20240131"));

        ColumnProfile profile = profiler.finish(DECLARATION, NO_COMMENT);

        assertThat(profile.temporalValues()).isEqualTo(2);
        assertThat(profile.lobValues()).isEqualTo(1);
        assertThat(profile.numberValues()).isEqualTo(1);
        assertThat(profile.patternMatches()).containsEntry("YMD8", 1L);
        assertThat(profile.minYear()).isEqualTo(2021);
        assertThat(profile.maxYear()).isEqualTo(2024);
        assertThat(profile.frequencyOmittedReason()).isEqualTo("NON_CODE_TYPE");
        assertThat(profile.valueFrequencies()).isEmpty();
    }

    @Test
    void residentNumbersStoredAsNumbersAreStillPersonal() {
        ColumnProfiler profiler = new ColumnProfiler();
        feed(profiler, "X", 6);
        profiler.accept(9001011234567L);

        ColumnProfile profile = profiler.finish(DECLARATION, NO_COMMENT);

        assertThat(profile.patternMatches()).containsEntry("RRN", 1L);
        assertThat(profile.frequencyOmittedReason()).isEqualTo("PERSONAL_PATTERN");
    }

    @Test
    void declarationAndCommentPassThrough() {
        CommentEvidence comment = new CommentEvidence("상태 코드", false, null, "MATCH");

        ColumnProfile profile = new ColumnProfiler().finish(DECLARATION, comment);

        assertThat(profile.name()).isEqualTo("STAT_CD");
        assertThat(profile.ordinal()).isEqualTo(3);
        assertThat(profile.declaredSize()).isEqualTo(2L);
        assertThat(profile.comment()).isEqualTo(comment);
        assertThat(profile.frequencyOmittedReason()).isEqualTo("NO_VALUES");
    }

    @Test
    void everyTemporalTypeContributesItsYearAndOtherTypesAreCountedAsOther() {
        ColumnProfiler profiler = new ColumnProfiler();
        profiler.accept(new java.util.Date(0));
        profiler.accept(java.sql.Date.valueOf("2001-02-03"));
        profiler.accept(java.time.LocalDateTime.of(2002, 1, 1, 0, 0));
        profiler.accept(java.time.OffsetDateTime.of(2003, 1, 1, 0, 0, 0, 0, java.time.ZoneOffset.UTC));
        profiler.accept(java.time.ZonedDateTime.of(2004, 1, 1, 0, 0, 0, 0, java.time.ZoneOffset.UTC));
        profiler.accept(java.sql.Time.valueOf("10:00:00"));
        profiler.accept(java.time.Instant.EPOCH);
        profiler.accept(java.util.UUID.randomUUID());

        ColumnProfile profile = profiler.finish(DECLARATION, NO_COMMENT);

        assertThat(profile.temporalValues()).isEqualTo(5);
        assertThat(profile.otherValues()).isEqualTo(3);
        assertThat(profile.minYear()).isEqualTo(1970);
        assertThat(profile.maxYear()).isEqualTo(2004);
        assertThat(profile.distinct()).isEqualTo(5);
    }

    @Test
    void numbersAndBooleansAreCountedDistinctlyAndBooleansAreFlagText() {
        ColumnProfiler profiler = new ColumnProfiler();
        feedObject(profiler, 1, 5);
        feedObject(profiler, 1L, 5);
        feedObject(profiler, Boolean.TRUE, 5);
        profiler.accept('Y');

        ColumnProfile profile = profiler.finish(DECLARATION, NO_COMMENT);

        assertThat(profile.numberValues()).isEqualTo(10);
        assertThat(profile.textValues()).isEqualTo(6);
        assertThat(profile.distinct()).isEqualTo(3);
        assertThat(profile.patternMatches()).containsEntry("ONE_ZERO", 10L).containsEntry("TRUE_FALSE", 5L)
                .containsEntry("YN", 1L);
        assertThat(profile.valueFrequencies())
                .containsExactly(new ValueFrequency("1", 10), new ValueFrequency("TRUE", 5));
        assertThat(profile.rareValueRows()).isEqualTo(1);
    }

    @Test
    void codeListingBoundariesAreInclusiveAndTiesAreOrderedByValue() {
        ColumnProfiler twenty = new ColumnProfiler();
        for (int code = 0; code < ColumnProfiler.CODE_MAX_DISTINCT; code++) {
            feed(twenty, "C" + (char) ('A' + code), ColumnProfiler.CODE_MIN_FREQUENCY);
        }
        ColumnProfiler twentyOne = new ColumnProfiler();
        for (int code = 0; code <= ColumnProfiler.CODE_MAX_DISTINCT; code++) {
            feed(twentyOne, "C" + (char) ('A' + code), ColumnProfiler.CODE_MIN_FREQUENCY);
        }
        ColumnProfiler ties = new ColumnProfiler();
        feed(ties, "B", 5);
        feed(ties, "A", 5);
        feed(ties, "Z", 4);

        assertThat(twenty.finish(DECLARATION, NO_COMMENT).valueFrequencies()).hasSize(20);
        assertThat(twentyOne.finish(DECLARATION, NO_COMMENT).frequencyOmittedReason())
                .isEqualTo("HIGH_CARDINALITY");
        ColumnProfile tie = ties.finish(DECLARATION, NO_COMMENT);
        assertThat(tie.valueFrequencies())
                .containsExactly(new ValueFrequency("A", 5), new ValueFrequency("B", 5));
        assertThat(tie.rareValueRows()).isEqualTo(4);
        assertThat(tie.rareDistinctValues()).isEqualTo(1);
    }

    @Test
    void theDistinctCapIsReachedOnlyAfterItsLastSlotAndLongValuesAreKeyedByDigest() {
        ColumnProfiler exact = new ColumnProfiler();
        for (int index = 0; index < ColumnProfiler.DISTINCT_CAP; index++) {
            exact.accept("V" + index);
        }
        exact.accept("V0");
        ColumnProfiler longValues = new ColumnProfiler();
        String text = "x".repeat(65);
        longValues.accept(text);
        longValues.accept(text);
        longValues.accept(text + " ");

        ColumnProfile capped = exact.finish(DECLARATION, NO_COMMENT);
        ColumnProfile hashed = longValues.finish(DECLARATION, NO_COMMENT);

        assertThat(capped.distinct()).isEqualTo(ColumnProfiler.DISTINCT_CAP);
        assertThat(capped.distinctCapped()).isFalse();
        assertThat(hashed.distinct()).isEqualTo(1);
        assertThat(hashed.totalLength()).isEqualTo(65 * 3 + 1);
        assertThat(hashed.trailingSpaces()).isEqualTo(1);
        assertThat(hashed.frequencyOmittedReason()).isEqualTo("NON_CODE_SHAPE");
    }

    @Test
    void anySingleLobMakesTheColumnNonCode() {
        ColumnProfiler profiler = new ColumnProfiler();
        feed(profiler, "A", 9);
        profiler.accept(new byte[0]);

        assertThat(profiler.finish(DECLARATION, NO_COMMENT).frequencyOmittedReason()).isEqualTo("NON_CODE_TYPE");
    }

    private static void feedObject(ColumnProfiler profiler, Object value, int times) {
        for (int index = 0; index < times; index++) {
            profiler.accept(value);
        }
    }

    private static void feed(ColumnProfiler profiler, String value, int times) {
        for (int index = 0; index < times; index++) {
            profiler.accept(value);
        }
    }
}
