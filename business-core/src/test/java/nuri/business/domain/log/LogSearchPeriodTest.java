package nuri.business.domain.log;

import nuri.foundation.core.exception.BusinessException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 로그 조회 기간 해석 규칙.
 *
 * <p>[무엇을 지키는 테스트인가 — 2026-08-26]
 * 저장소 5종이 같은 파라미터를 서로 다른 형식으로 해석했고, <b>틀렸을 때 조용했다</b>.
 * 파싱 실패는 {@code catch} 가 조건을 {@code null} 로 만들어 필터를 통째로 무시했고
 * (login·privacy), 문자열 비교가 어긋나면 빈 결과가 나왔다(system·web·user).
 * 두 경우 모두 화면은 "기간을 좁혔다"고 보여 주는데 실제 결과는 전체이거나 0건이다.
 *
 * <p>그래서 이 테스트가 고정하는 계약은 두 가지다 —
 * <b>두 형식을 모두 받아들인다</b>, 그리고 <b>해석할 수 없는 값은 조용히 버리지 않는다</b>.
 */
@DisplayName("로그 조회 기간 해석 규칙")
class LogSearchPeriodTest {

    @Nested
    @DisplayName("두 형식을 모두 받아들인다")
    class AcceptsBothFormats {

        @Test
        @DisplayName("8자리와 하이픈 형식이 같은 날짜로 해석된다")
        void bothFormatsResolveToSameDate() {
            assertThat(LogSearchPeriod.toLocalDate("20260826", "searchKeywordFrom"))
                    .isEqualTo(LocalDate.of(2026, 8, 26));
            assertThat(LogSearchPeriod.toLocalDate("2026-08-26", "searchKeywordFrom"))
                    .isEqualTo(LocalDate.of(2026, 8, 26));
        }

        @Test
        @DisplayName("8자리 컬럼 비교용으로 정규화하면 하이픈이 사라진다")
        void normalizesToCompact() {
            assertThat(LogSearchPeriod.toCompact("2026-08-26", "searchKeywordFrom")).isEqualTo("20260826");
            assertThat(LogSearchPeriod.toCompact("20260826", "searchKeywordFrom")).isEqualTo("20260826");
        }

        @Test
        @DisplayName("앞뒤 공백은 입력 실수로 보고 흡수한다")
        void trimsSurroundingWhitespace() {
            assertThat(LogSearchPeriod.toCompact("  2026-08-26  ", "searchKeywordFrom")).isEqualTo("20260826");
        }
    }

    @Nested
    @DisplayName("해석할 수 없는 값은 조용히 버리지 않는다")
    class FailsLoudly {

        @Test
        @DisplayName("형식이 틀리면 예외로 알린다 — 조건을 무시한 전체 결과를 돌려주지 않는다")
        void rejectsMalformedValue() {
            assertThatThrownBy(() -> LogSearchPeriod.toCompact("2026/08/26", "searchKeywordFrom"))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("searchKeywordFrom");
        }

        @Test
        @DisplayName("달력에 없는 날짜도 거부한다")
        void rejectsNonExistentDate() {
            assertThatThrownBy(() -> LogSearchPeriod.toLocalDate("20260231", "searchKeywordTo"))
                    .isInstanceOf(BusinessException.class);
        }

        @Test
        @DisplayName("길이가 맞지 않는 값도 거부한다")
        void rejectsWrongLength() {
            assertThatThrownBy(() -> LogSearchPeriod.toCompact("202608", "searchKeywordFrom"))
                    .isInstanceOf(BusinessException.class);
            assertThatThrownBy(() -> LogSearchPeriod.toCompact("", "searchKeywordFrom"))
                    .isInstanceOf(BusinessException.class);
            assertThatThrownBy(() -> LogSearchPeriod.toCompact(null, "searchKeywordFrom"))
                    .isInstanceOf(BusinessException.class);
        }

        @Test
        @DisplayName("어느 파라미터가 틀렸는지 메시지가 지목한다")
        void messageNamesTheParameter() {
            assertThatThrownBy(() -> LogSearchPeriod.toCompact("bad", "searchKeywordTo"))
                    .hasMessageContaining("searchKeywordTo")
                    .hasMessageContaining("yyyyMMdd");
        }
    }

    @Nested
    @DisplayName("한쪽만 주어진 기간은 조건으로 삼지 않는다")
    class IncompletePeriod {

        @Test
        @DisplayName("둘 다 있어야 완전한 기간이다")
        void requiresBothEnds() {
            assertThat(LogSearchPeriod.isComplete("20260801", "20260826")).isTrue();
            assertThat(LogSearchPeriod.isComplete("20260801", null)).isFalse();
            assertThat(LogSearchPeriod.isComplete(null, "20260826")).isFalse();
            assertThat(LogSearchPeriod.isComplete("  ", "20260826")).isFalse();
        }

        @Test
        @DisplayName("불완전한 기간은 검증 대상이 아니다 — 조건 없음이지 오류가 아니다")
        void incompleteIsNotAnError() {
            // 저장소는 isComplete 로 먼저 걸러내므로 이 조합이 toCompact 까지 오지 않는다.
            // 사용자가 한쪽만 입력한 상태를 오류로 보고 화면을 막으면 조회 자체가 불가능해진다.
            assertThatCode(() -> LogSearchPeriod.isComplete("20260801", "")).doesNotThrowAnyException();
        }
    }
}
