package nuri.business.domain.help;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Hpcm 엔티티 테스트")
class HpcmTest {

    @Test
    @DisplayName("Hpcm 빌더 및 초기화 테스트")
    void builderTest() {
        Hpcm hpcm = Hpcm.builder()
                .hpcmId("HPCM_001")
                .hpcmSeCode("001")
                .hpcmDf("Help Definition")
                .hpcmDc("Help Content")
                .createdBy("admin")
                .build();

        assertThat(hpcm.getHpcmId()).isEqualTo("HPCM_001");
        assertThat(hpcm.getHpcmSeCode()).isEqualTo("001");
        assertThat(hpcm.getHpcmDf()).isEqualTo("Help Definition");
        assertThat(hpcm.getFrstRegisterId()).isEqualTo("admin");
    }

    @Test
    @DisplayName("Hpcm 수정 테스트")
    void updateTest() {
        Hpcm hpcm = Hpcm.builder()
                .hpcmId("HPCM_001")
                .hpcmSeCode("001")
                .build();

        hpcm.update("002", "New Df", "New Dc");

        assertThat(hpcm.getHpcmSeCode()).isEqualTo("002");
        assertThat(hpcm.getHpcmDf()).isEqualTo("New Df");
    }
}
