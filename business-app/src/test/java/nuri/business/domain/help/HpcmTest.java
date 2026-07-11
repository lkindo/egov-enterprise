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
                .hlpId("HPCM_001")
                .hlpSeCd("001")
                .hlpDfn("Help Definition")
                .hlpExpln("Help Content")
                .build();
        hpcm.setFrstRgtrId("admin");

        assertThat(hpcm.getHlpId()).isEqualTo("HPCM_001");
        assertThat(hpcm.getHlpSeCd()).isEqualTo("001");
        assertThat(hpcm.getHlpDfn()).isEqualTo("Help Definition");
        assertThat(hpcm.getFrstRgtrId()).isEqualTo("admin");
    }

    @Test
    @DisplayName("Hpcm 수정 테스트")
    void updateTest() {
        Hpcm hpcm = Hpcm.builder()
                .hlpId("HPCM_001")
                .hlpSeCd("001")
                .build();

        hpcm.update("002", "New Df", "New Dc");

        assertThat(hpcm.getHlpSeCd()).isEqualTo("002");
        assertThat(hpcm.getHlpDfn()).isEqualTo("New Df");
    }
}
