package nuri.business.domain.board;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * {@link BoardSearchCondition#validateDates()} 경계 검증.
 *
 * <p>[검증 의도] 역전된 기간(시작 &gt; 종료)이 그대로 통과하면 조회는 항상 0건을 반환해
 * "데이터가 없다" 는 오해를 유발한다. 입력 단계에서 400 으로 끊어야 한다.
 * 한쪽 날짜만 주는 열린 구간(open-ended)은 정상 사용이므로 통과해야 한다.
 */
@DisplayName("BoardSearchCondition 기간 검증")
class BoardSearchConditionTest {

    private static final LocalDateTime EARLY = LocalDateTime.of(2026, 1, 1, 0, 0);
    private static final LocalDateTime LATE = LocalDateTime.of(2026, 12, 31, 23, 59);

    private BoardSearchCondition condition(LocalDateTime start, LocalDateTime end) {
        BoardSearchCondition cond = new BoardSearchCondition("BBSMSTR_000000000001");
        cond.setStartDate(start);
        cond.setEndDate(end);
        return cond;
    }

    @Test
    @DisplayName("시작일이 종료일보다 늦으면 INVALID_INPUT_VALUE 로 거부한다")
    void validateDates_rejectsInvertedRange() {
        assertThatThrownBy(() -> condition(LATE, EARLY).validateDates())
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);
    }

    @Test
    @DisplayName("시작일이 종료일보다 이르면 통과한다")
    void validateDates_acceptsOrderedRange() {
        assertThatCode(() -> condition(EARLY, LATE).validateDates()).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("시작일과 종료일이 같은 하루 조회도 통과한다 (경계 포함)")
    void validateDates_acceptsSameInstant() {
        assertThatCode(() -> condition(EARLY, EARLY).validateDates()).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("한쪽만 지정한 열린 구간은 검증 대상이 아니다")
    void validateDates_acceptsOpenEndedRange() {
        assertThatCode(() -> condition(LATE, null).validateDates()).doesNotThrowAnyException();
        assertThatCode(() -> condition(null, EARLY).validateDates()).doesNotThrowAnyException();
        assertThatCode(() -> condition(null, null).validateDates()).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("기본 생성자는 bbsId 를 빈 문자열로 둔다 (NPE 대신 빈 조회)")
    void defaultConstructor_usesEmptyBbsId() {
        assertThat(new BoardSearchCondition().getBbsId()).isEmpty();
    }
}
