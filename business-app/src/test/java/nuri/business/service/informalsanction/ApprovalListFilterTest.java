package nuri.business.service.informalsanction;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** [2026-09-26 DIP B5 F4] 결재 목록 조회 조건은 해석할 수 없으면 조용히 버리지 않고 400 이다. */
@DisplayName("ApprovalListFilter — 결재 목록 조회 조건")
class ApprovalListFilterTest {

    @Test
    @DisplayName("빈 값은 조건이 없다")
    void blanksMeanNoCondition() {
        assertThat(ApprovalListFilter.of(" ", "", null, " ")).isEqualTo(ApprovalListFilter.NONE);
    }

    @Test
    @DisplayName("검색어는 소문자 부분일치 패턴이고 LIKE 와일드카드는 글자로 찾는다")
    void keywordIsEscapedContainsPattern() {
        assertThat(ApprovalListFilter.of(" 할인 100%_A! ", null, null, null).keywordPattern())
                .isEqualTo("%할인 100!%!_a!!%");
    }

    @Test
    @DisplayName("기간은 yyyy-MM-dd·yyyyMMdd 둘 다 받아 yyyyMMdd 로 맞춘다")
    void datesAreCompacted() {
        ApprovalListFilter filter = ApprovalListFilter.of(null, "2026-09-01", "20260930", null);
        assertThat(filter.fromYmd()).isEqualTo("20260901");
        assertThat(filter.toYmd()).isEqualTo("20260930");
    }

    @Test
    @DisplayName("역순 기간·형식 오류·어휘 밖 상태·너무 긴 검색어는 400 이다")
    void rejectsInvalidConditions() {
        assertInvalid(() -> ApprovalListFilter.of(null, "2026-09-30", "2026-09-01", null));
        assertInvalid(() -> ApprovalListFilter.of(null, "2026-02-30", null, null));
        assertInvalid(() -> ApprovalListFilter.of(null, null, null, "X"));
        assertInvalid(() -> ApprovalListFilter.of("가".repeat(ApprovalListFilter.KEYWORD_MAX + 1), null, null, null));
    }

    @Test
    @DisplayName("대기함은 상태 조건을 떼어 낸다")
    void pendingDropsStatus() {
        assertThat(ApprovalListFilter.of("검토", null, null, "C").withoutStatus().status()).isNull();
    }

    private static void assertInvalid(org.assertj.core.api.ThrowableAssert.ThrowingCallable call) {
        assertThatThrownBy(call).isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE);
    }
}
