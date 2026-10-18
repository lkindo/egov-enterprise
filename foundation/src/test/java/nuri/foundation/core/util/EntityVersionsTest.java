package nuri.foundation.core.util;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("EntityVersions 낙관적 잠금 버전 대조")
class EntityVersionsTest {

    @Test
    @DisplayName("요청 버전이 지금 버전과 같으면 통과한다")
    void sameVersionPasses() {
        assertThatCode(() -> EntityVersions.assertCurrent(3, 3)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("버전을 보내지 않으면 400(INVALID_INPUT_VALUE)이다")
    void missingVersionIsBadRequest() {
        assertThatThrownBy(() -> EntityVersions.assertCurrent(null, 0))
                .isInstanceOfSatisfying(BusinessException.class, e -> {
                    org.assertj.core.api.Assertions.assertThat(e.getErrorCode()).isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE);
                    org.assertj.core.api.Assertions.assertThat(e.getMessage()).isEqualTo(EntityVersions.MISSING_VERSION_MESSAGE);
                });
    }

    @Test
    @DisplayName("읽은 뒤 다른 사람이 고쳐 버전이 다르면 409(CONCURRENT_MODIFICATION)이다")
    void staleVersionIsConflict() {
        assertThatThrownBy(() -> EntityVersions.assertCurrent(2, 3))
                .isInstanceOfSatisfying(BusinessException.class, e -> {
                    org.assertj.core.api.Assertions.assertThat(e.getErrorCode()).isEqualTo(CommonErrorCode.CONCURRENT_MODIFICATION);
                    org.assertj.core.api.Assertions.assertThat(e.getMessage()).isEqualTo(EntityVersions.STALE_VERSION_MESSAGE);
                });
    }

    @Test
    @DisplayName("지금 행의 버전이 비어 있으면 같다고 보지 않는다")
    void nullCurrentIsConflict() {
        assertThatThrownBy(() -> EntityVersions.assertCurrent(0, null))
                .isInstanceOfSatisfying(BusinessException.class, e ->
                        org.assertj.core.api.Assertions.assertThat(e.getErrorCode()).isEqualTo(CommonErrorCode.CONCURRENT_MODIFICATION));
    }
}
