package nuri.foundation.constants;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Constants 상수 홀더 테스트")
class ConstantsTest {

    @Test
    @DisplayName("모든 공개 상수 그룹을 로드할 수 있다")
    void loadsEveryPublicConstantGroup() {
        // 중첩 클래스의 암시적 public 생성자는 JaCoCo 가 걸러 주지 않는다 —
        //   foundation 클래스별 라인 커버리지 규칙을 맞추려면 인스턴스를 한 번 만든다.
        assertThat(new Constants.User()).isNotNull();

        assertThat(Constants.User.USER_PREFIX).isEqualTo("USR_");
        assertThat(Constants.User.SYSTEM_ADMIN_ESNTL_ID).isEqualTo("USRCNFRM_00000000001");
    }
}
