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
    @DisplayName("레거시 별칭(Aliases) 및 Getter/Setter 테스트")
    void legacyAliasesAndSettersTest() {
        LocalDateTime now = LocalDateTime.now();
        BoardMaster master = BoardMaster.builder()
                .bbsId("BBS_002")
                .bbsTtl("Notice A")
                .bbsTypeCd("BBST02")
                .bbsAtrbCd("BBSA02")
                .ansPsbltyYn("Y")
                .fileAtchPsbltyYn("Y")
                .atchPsbltyFileQty(3)
                .atchPsbltyFileSz(500L)
                .tmpltId("TMP_02")
                .ansYn("Y")
                .stsfdgYn("Y")
                .build();

        // 표준 필드 검증
        assertThat(master.getBbsTtl()).isEqualTo("Notice A");
        assertThat(master.getBbsTypeCd()).isEqualTo("BBST02");
        assertThat(master.getBbsAtrbCd()).isEqualTo("BBSA02");
        assertThat(master.getAnsPsbltyYn()).isEqualTo("Y");
        assertThat(master.getFileAtchPsbltyYn()).isEqualTo("Y");
        assertThat(master.getAtchPsbltyFileQty()).isEqualTo(3);
        assertThat(master.getAtchPsbltyFileSz()).isEqualTo(500L);
        assertThat(master.getTmpltId()).isEqualTo("TMP_02");
        assertThat(master.getAnsYn()).isEqualTo("Y");
        assertThat(master.getStsfdgYn()).isEqualTo("Y");

        // Optn 관련 Getter/Setter 검증
        master.setOptnFrstRgtrId("admin");
        master.setOptnCrtDt(now);
        master.setOptnLastMdfrId("moderator");
        master.setOptnMdfcnDt(now);

        assertThat(master.getOptnFrstRgtrId()).isEqualTo("admin");
        assertThat(master.getOptnCrtDt()).isEqualTo(now);
        assertThat(master.getOptnLastMdfrId()).isEqualTo("moderator");
        assertThat(master.getOptnMdfcnDt()).isEqualTo(now);
    }

    @Test
    @DisplayName("JPA 콜백 생명주기 메서드 직접 호출 테스트")
    void jpaCallbacksTest() {
        BoardMaster master1 = BoardMaster.builder().build();
        master1.onPrePersist();
        assertThat(master1.getOptnFrstRgtrId()).isEqualTo("webmaster");
        assertThat(master1.getOptnCrtDt()).isNotNull();
        assertThat(master1.getOptnMdfcnDt()).isNotNull();

        BoardMaster master2 = BoardMaster.builder()
                .optnFrstRgtrId("custom")
                .optnCrtDt(LocalDateTime.of(2026, 1, 1, 0, 0))
                .optnMdfcnDt(LocalDateTime.of(2026, 1, 1, 0, 0))
                .build();
        master2.onPrePersist();
        assertThat(master2.getOptnFrstRgtrId()).isEqualTo("custom");
        assertThat(master2.getOptnCrtDt()).isEqualTo(LocalDateTime.of(2026, 1, 1, 0, 0));

        master2.onPreUpdate();
        assertThat(master2.getOptnMdfcnDt()).isNotEqualTo(LocalDateTime.of(2026, 1, 1, 0, 0));
    }

    @Test
    @DisplayName("커스텀 빌더 확장 메서드 검증")
    void builderCustomExtensionsTest() {
        LocalDateTime testTime = LocalDateTime.of(2026, 5, 22, 12, 0);
        BoardMaster master = BoardMaster.builder()
                .optnFrstRgtrId("creator")
                .optnCrtDt(testTime)
                .optnLastMdfrId("modifier")
                .optnMdfcnDt(testTime)
                .build();

        assertThat(master.getOptnFrstRgtrId()).isEqualTo("creator");
        assertThat(master.getOptnCrtDt()).isEqualTo(testTime);
        assertThat(master.getOptnLastMdfrId()).isEqualTo("modifier");
        assertThat(master.getOptnMdfcnDt()).isEqualTo(testTime);
    }
}

