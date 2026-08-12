package nuri.foundation.constants;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Constants 상수 홀더 테스트")
class ConstantsTest {

    @Test
    @DisplayName("모든 공개 상수 그룹을 로드할 수 있다")
    void loadsEveryPublicConstantGroup() {
        assertThat(new Constants.Cache()).isNotNull();
        assertThat(new Constants.System()).isNotNull();
        assertThat(new Constants.User()).isNotNull();
        assertThat(new Constants.Board()).isNotNull();
        assertThat(new Constants.File()).isNotNull();
        assertThat(new Constants.Security()).isNotNull();

        assertThat(Constants.Cache.USERS_CACHE).isEqualTo("users");
        assertThat(Constants.System.DEFAULT_PAGE_SIZE).isEqualTo("10");
        assertThat(Constants.User.DEFAULT_ROLE).isEqualTo("USER");
        assertThat(Constants.Board.NOTICE_BOARD_TYPE).isEqualTo("NOTICE");
        assertThat(Constants.File.MAX_FILE_SIZE).isEqualTo(10L * 1024 * 1024);
        assertThat(Constants.Security.JWT_PREFIX).isEqualTo("Bearer ");
    }
}
