package nuri.business.domain.user.repository;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** [2026-09-26 DIP B5 F4] 사용자 목록 조건은 어휘 밖이면 조용히 버리지 않고 400 이다. */
@DisplayName("UserListFilter — 관리자 사용자 목록 조건")
class UserListFilterTest {

    @Test
    @DisplayName("빈 값은 조건이 없고, 값은 앞뒤 공백을 걷는다")
    void blanksMeanNoCondition() {
        assertThat(UserListFilter.of(" ", "", null)).isEqualTo(UserListFilter.NONE);
        assertThat(UserListFilter.of(" P ", " ORG_A ", " Y ")).isEqualTo(new UserListFilter("P", "ORG_A", "Y"));
    }

    @Test
    @DisplayName("어휘 밖 상태·잠금, 너무 긴 부서 코드는 400 이다")
    void rejectsInvalidValues() {
        assertInvalid(() -> UserListFilter.of("X", null, null));
        assertInvalid(() -> UserListFilter.of(null, null, "maybe"));
        assertInvalid(() -> UserListFilter.of(null, "O".repeat(21), null));
    }

    private static void assertInvalid(org.assertj.core.api.ThrowableAssert.ThrowingCallable call) {
        assertThatThrownBy(call).isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE);
    }
}
