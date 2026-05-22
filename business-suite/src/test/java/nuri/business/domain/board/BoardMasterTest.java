package nuri.business.domain.board;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("BoardMaster 엔티티 테스트")
class BoardMasterTest {

    @Test
    @DisplayName("BoardMaster 엔티티 빌더 및 초기화 테스트")
    void builderTest() {
        BoardMaster master = BoardMaster.builder()
                .bbsId("BBS_001")
                .bbsTtl("Notice")
                .bbsTypeCd("BBST01")
                .bbsAtrbCd("BBSA01")
                .build();

        assertThat(master.getBbsId()).isEqualTo("BBS_001");
        assertThat(master.getBbsTtl()).isEqualTo("Notice");
        assertThat(master.getBbsTypeCd()).isEqualTo("BBST01");
        assertThat(master.getBbsAtrbCd()).isEqualTo("BBSA01");
        assertThat(master.getUseYn()).isEqualTo("Y");
        assertThat(master.getAnsPsbltyYn()).isEqualTo("N");
        assertThat(master.getFileAtchPsbltyYn()).isEqualTo("N");
        assertThat(master.getAtchPsbltyFileQty()).isEqualTo(0);
    }

    @Test
    @DisplayName("BoardMaster 엔티티 수정 테스트")
    void updateTest() {
        BoardMaster master = BoardMaster.builder()
                .bbsId("BBS_001")
                .bbsTtl("Old Name")
                .build();

        master.update("New Name", "New Description", "Y", "Y", 5, 1024L, "TMP_01", "Y", "Y", "Y");

        assertThat(master.getBbsTtl()).isEqualTo("New Name");
        assertThat(master.getBbsExpln()).isEqualTo("New Description");
        assertThat(master.getAnsPsbltyYn()).isEqualTo("Y");
        assertThat(master.getFileAtchPsbltyYn()).isEqualTo("Y");
        assertThat(master.getAtchPsbltyFileQty()).isEqualTo(5);
        assertThat(master.getAtchPsbltyFileSz()).isEqualTo(1024L);
        assertThat(master.getTmpltId()).isEqualTo("TMP_01");
        assertThat(master.getAnsYn()).isEqualTo("Y");
        assertThat(master.getStsfdgYn()).isEqualTo("Y");
    }

    @Test
    @DisplayName("BoardMaster 엔티티 삭제 테스트")
    void deleteTest() {
        BoardMaster master = BoardMaster.builder()
                .bbsId("BBS_001")
                .useYn("Y")
                .build();

        master.delete();

        assertThat(master.getUseYn()).isEqualTo("N");
    }
}
