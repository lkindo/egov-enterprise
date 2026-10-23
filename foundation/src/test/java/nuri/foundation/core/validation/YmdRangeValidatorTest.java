package nuri.foundation.core.validation;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import jakarta.validation.constraints.Pattern;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class YmdRangeValidatorTest {
    private static final ValidatorFactory FACTORY = Validation.buildDefaultValidatorFactory();
    private static final Validator VALIDATOR = FACTORY.getValidator();

    @AfterAll
    static void closeFactory() {
        FACTORY.close();
    }

    @Test
    void reversedValidDatesAttachTheErrorToTheEndField() {
        var errors = VALIDATOR.validate(new Period("20240301", "20240229"));
        assertThat(errors).hasSize(1);
        assertThat(errors.iterator().next().getPropertyPath().toString()).isEqualTo("end");
        assertThat(errors.iterator().next().getConstraintDescriptor().getAnnotation())
                .isInstanceOf(YmdRange.class);
    }

    @Test
    void chronologicalEqualAndOptionalPeriodsAreAccepted() {
        for (Period period : new Period[] {
                new Period("20240229", "20240301"), new Period("20240229", "20240229"),
                new Period(null, "20240301"), new Period("20240301", null),
                new Period("", "20240301"), new Period("20240301", "")}) {
            assertThat(VALIDATOR.validate(period)).isEmpty();
        }
    }

    @Test
    void malformedDatesReceiveFieldErrorsWithoutAMisleadingRangeError() {
        for (Period period : new Period[] {
                new Period("20240230", "20240229"), new Period("20240301", "20240230")}) {
            var errors = VALIDATOR.validate(period);
            assertThat(errors).hasSize(1);
            assertThat(errors.iterator().next().getConstraintDescriptor().getAnnotation())
                    .isInstanceOf(Pattern.class);
        }
    }

    /**
     * [2026-10-23 ADR-0040 결정 12] 게시글 저장 요청처럼 record 에도 클래스 단위 기간 검사를 건다. record 의 접근자는
     * {@code getStart()} 가 아니라 {@code start()} 라, 검증기가 그 이름으로 값을 읽지 못하면 순서 검사가 조용히 통과한다.
     */
    @Test
    void recordComponentsAreReadForTheRangeCheck() {
        var reversed = VALIDATOR.validate(new PeriodRecord("20240301", "20240229"));
        assertThat(reversed).hasSize(1);
        assertThat(reversed.iterator().next().getPropertyPath().toString()).isEqualTo("end");
        assertThat(reversed.iterator().next().getConstraintDescriptor().getAnnotation())
                .isInstanceOf(YmdRange.class);

        for (PeriodRecord period : new PeriodRecord[] {
                new PeriodRecord("20240229", "20240301"), new PeriodRecord("20240229", "20240229"),
                new PeriodRecord(null, "20240301"), new PeriodRecord("20240301", "")}) {
            assertThat(VALIDATOR.validate(period)).isEmpty();
        }
    }

    @YmdRange(start = "start", end = "end")
    public record PeriodRecord(@Pattern(regexp = Ymd.OPTIONAL_PATTERN) String start,
            @Pattern(regexp = Ymd.OPTIONAL_PATTERN) String end) {
    }

    @YmdRange(start = "start", end = "end")
    public static class Period {
        @Pattern(regexp = Ymd.OPTIONAL_PATTERN)
        private final String start;
        @Pattern(regexp = Ymd.OPTIONAL_PATTERN)
        private final String end;

        Period(String start, String end) {
            this.start = start;
            this.end = end;
        }

        public String getStart() { return start; }
        public String getEnd() { return end; }
    }
}
