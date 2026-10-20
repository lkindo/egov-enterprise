package nuri.foundation.core.code;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("CommonCodeUsageContributor.Usage 경계")
class CommonCodeUsageContributorUsageTest {

    @Test
    @DisplayName("기능 선언과 같은 형식의 그룹 ID 와 화면에 보일 문장을 받는다")
    void acceptsDeclaredGroupFormat() {
        var usage = new CommonCodeUsageContributor.Usage("COM075", "결재 기안의 업무 구분 선택지");

        assertThat(usage.groupId()).isEqualTo("COM075");
        assertThat(usage.description()).isEqualTo("결재 기안의 업무 구분 선택지");
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", "com075", "COM-075", "COM0750000000", "COM 075"})
    @DisplayName("기능 선언 형식이 아닌 그룹 ID 는 거부한다")
    void rejectsMalformedGroupId(String groupId) {
        assertThatThrownBy(() -> new CommonCodeUsageContributor.Usage(groupId, "설명"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("그룹 ID");
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", "   "})
    @DisplayName("빈 사용처 설명은 거부한다 — 화면이 빈 사용처를 말하지 않는다")
    void rejectsBlankDescription(String description) {
        assertThatThrownBy(() -> new CommonCodeUsageContributor.Usage("COM075", description))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("사용처 설명");
    }

    @Test
    @DisplayName("화면에 그대로 보이는 문장이라 길이 상한을 넘으면 거부한다")
    void rejectsOverlongDescription() {
        String overlong = "가".repeat(CommonCodeUsageContributor.Usage.DESCRIPTION_MAX + 1);

        assertThatThrownBy(() -> new CommonCodeUsageContributor.Usage("COM075", overlong))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("사용처 설명");
        assertThat(new CommonCodeUsageContributor.Usage("COM075",
                "가".repeat(CommonCodeUsageContributor.Usage.DESCRIPTION_MAX)).description())
                .hasSize(CommonCodeUsageContributor.Usage.DESCRIPTION_MAX);
    }
}
