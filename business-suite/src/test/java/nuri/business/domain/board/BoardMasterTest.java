package nuri.business.domain.board;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import java.time.LocalDateTime;

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

    @Test
    @DisplayName("개별 필드 수정 메서드 테스트")
    void individualUpdatesTest() {
        BoardMaster master = BoardMaster.builder().build();

        master.updateBbsTtl("Notice TTL");
        master.updateBbsExpln("Notice Expln");
        master.updateAnsPsbltyYn("Y");
        master.updateFileAtchPsbltyYn("Y");
        master.updateAtchPsbltyFileQty(10);
        master.updateAtchPsbltyFileSz(2048L);
        master.updateTmpltId("TMP_99");
        master.updateUseYn("N");
        master.updateAnsYn("Y");
        master.updateStsfdgYn("Y");

        assertThat(master.getBbsTtl()).isEqualTo("Notice TTL");
        assertThat(master.getBbsExpln()).isEqualTo("Notice Expln");
        assertThat(master.getAnsPsbltyYn()).isEqualTo("Y");
        assertThat(master.getFileAtchPsbltyYn()).isEqualTo("Y");
        assertThat(master.getAtchPsbltyFileQty()).isEqualTo(10);
        assertThat(master.getAtchPsbltyFileSz()).isEqualTo(2048L);
        assertThat(master.getTmpltId()).isEqualTo("TMP_99");
        assertThat(master.getUseYn()).isEqualTo("N");
        assertThat(master.getAnsYn()).isEqualTo("Y");
        assertThat(master.getStsfdgYn()).isEqualTo("Y");
    }

    @Test
    @DisplayName("명시적 registerOption 연관관계 설정 테스트")
    void registerOptionTest() {
        BoardMaster master = BoardMaster.builder()
                .bbsId("BBS_002")
                .bbsTtl("Notice A")
                .bbsTypeCd("BBST02")
                .bbsAtrbCd("BBSA02")
                .build();

        master.registerOption("Y", "Y");

        // 표준 필드 검증
        assertThat(master.getAnsYn()).isEqualTo("Y");
        assertThat(master.getStsfdgYn()).isEqualTo("Y");

        // 연관 엔티티 검증
        assertThat(master.getOption()).isNotNull();
        assertThat(master.getOption().getBoardMaster()).isEqualTo(master);
        assertThat(master.getOption().getBbsId()).isEqualTo("BBS_002");
        assertThat(master.getOption().getAnsYn()).isEqualTo("Y");
        assertThat(master.getOption().getStsfdgYn()).isEqualTo("Y");
    }

    @Test
    @DisplayName("BoardMaster update 시 Option 명시 동기화 테스트")
    void updateOptionSyncTest() {
        BoardMaster master = BoardMaster.builder()
                .bbsId("BBS_003")
                .bbsTtl("Notice B")
                .build();

        master.registerOption("N", "N");

        // 수정 수행
        master.update("New TTL", "New Description", "Y", "Y", 5, 1024L, "TMP_02", "Y", "Y", "Y");

        assertThat(master.getAnsYn()).isEqualTo("Y");
        assertThat(master.getStsfdgYn()).isEqualTo("Y");
        assertThat(master.getOption().getAnsYn()).isEqualTo("Y");
        assertThat(master.getOption().getStsfdgYn()).isEqualTo("Y");
    }
}

