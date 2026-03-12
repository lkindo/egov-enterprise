package com.company.project.domain.board;

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
                .bbsNm("Notice")
                .bbsTyCode("BBST01")
                .bbsAttrbCode("BBSA01")
                .build();

        assertThat(master.getBbsId()).isEqualTo("BBS_001");
        assertThat(master.getBbsNm()).isEqualTo("Notice");
        assertThat(master.getBbsTyCode()).isEqualTo("BBST01");
        assertThat(master.getBbsAttrbCode()).isEqualTo("BBSA01");
        assertThat(master.getUseAt()).isEqualTo("Y");
        assertThat(master.getReplyPosblAt()).isEqualTo("N");
        assertThat(master.getFileAtchPosblAt()).isEqualTo("N");
        assertThat(master.getAtchPosblFileNumber()).isEqualTo(0);
    }

    @Test
    @DisplayName("BoardMaster 엔티티 수정 테스트")
    void updateTest() {
        BoardMaster master = BoardMaster.builder()
                .bbsId("BBS_001")
                .bbsNm("Old Name")
                .build();

        master.update("New Name", "New Description", "Y", "Y", 5, 1024L, "TMP_01", "Y", "admin", "Y", "Y");

        assertThat(master.getBbsNm()).isEqualTo("New Name");
        assertThat(master.getBbsIntrcn()).isEqualTo("New Description");
        assertThat(master.getReplyPosblAt()).isEqualTo("Y");
        assertThat(master.getFileAtchPosblAt()).isEqualTo("Y");
        assertThat(master.getAtchPosblFileNumber()).isEqualTo(5);
        assertThat(master.getAtchPosblFileSize()).isEqualTo(1024L);
        assertThat(master.getTmplatId()).isEqualTo("TMP_01");
        assertThat(master.getLastUpdusrId()).isEqualTo("admin");
        assertThat(master.getCommentAt()).isEqualTo("Y");
        assertThat(master.getStsfdgAt()).isEqualTo("Y");
    }

    @Test
    @DisplayName("BoardMaster 엔티티 삭제 테스트")
    void deleteTest() {
        BoardMaster master = BoardMaster.builder()
                .bbsId("BBS_001")
                .useAt("Y")
                .build();

        master.delete("admin");

        assertThat(master.getUseAt()).isEqualTo("N");
        assertThat(master.getLastUpdusrId()).isEqualTo("admin");
    }
}
