package nuri.business.domain.help;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("OnlineManual 엔티티 테스트")
class OnlineManualTest {

    @Test
    @DisplayName("OnlineManual 빌더 및 초기화 테스트")
    void builderTest() {
        OnlineManual mnl = OnlineManual.builder()
                .onlnMnlId("MNL_001")
                .onlnMnlNm("Manual 1")
                .onlnMnlSeCd("001")
                .frstRgtrId("admin")
                .build();

        assertThat(mnl.getOnlnMnlId()).isEqualTo("MNL_001");
        assertThat(mnl.getOnlnMnlNm()).isEqualTo("Manual 1");
        assertThat(mnl.getFrstRgtrId()).isEqualTo("admin");
    }

    @Test
    @DisplayName("OnlineManual 수정 테스트")
    void updateTest() {
        OnlineManual mnl = OnlineManual.builder()
                .onlnMnlId("MNL_001")
                .build();

        mnl.update("New Name", "002", "Df", "Dc");

        assertThat(mnl.getOnlnMnlNm()).isEqualTo("New Name");
    }
}
