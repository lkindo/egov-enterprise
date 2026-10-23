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

    @Test
    @DisplayName("사용 여부 수정 메서드 테스트")
    void updateUseYnTest() {
        BoardMaster master = BoardMaster.builder().build();

        master.updateUseYn("N");

        assertThat(master.getUseYn()).isEqualTo("N");
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

    @Test
    @DisplayName("registerOption 미선행 상태에서 update 호출 시 Option 자동 생성·동기화 (동기화 균열 회귀 방지)")
    void updateSyncsOptionWhenAbsentTest() {
        BoardMaster master = BoardMaster.builder()
                .bbsId("BBS_004")
                .bbsTtl("Notice C")
                .build();

        // registerOption 미호출 → option 은 아직 null
        assertThat(master.getOption()).isNull();

        master.update("Notice C", null, "N", "N", 0, 0L, null, "Y", "N", null);

        // BoardMaster 컬럼과 Option 이 모두 동기화되어야 한다 (이전에는 option 이 생성되지 않아 값 누락)
        assertThat(master.getAnsYn()).isEqualTo("N");
        assertThat(master.getOption()).isNotNull();
        assertThat(master.getOption().getAnsYn()).isEqualTo("N");
        // 미지정 필드는 기본값으로 정규화한다. [2026-09-27 DIP B5 F9] 기본값은 지금까지의 실제 동작(받음)인 "Y" 다.
        assertThat(master.getStsfdgYn()).isEqualTo("Y");
        assertThat(master.getOption().getStsfdgYn()).isEqualTo("Y");

        master.update("Notice C", null, "N", "N", 0, 0L, null, "Y", "N", "N");
        assertThat(master.getStsfdgYn()).isEqualTo("N");
        assertThat(master.getOption().getStsfdgYn()).isEqualTo("N");
    }

    /** [2026-10-23 ADR-0040 결정 3·6] 예약 게시 설정은 기존 동작대로 N 으로 시작하고, Y 밖의 값은 N 이다. update 는 건드리지 않는다. */
    @Test
    @DisplayName("예약 게시 설정은 기본 N, Y 만 Y 이고 일반 수정(update)은 그 값을 바꾸지 않는다")
    void reservationSettingDefaultsToNoAndOnlyAcceptsY() {
        BoardMaster master = BoardMaster.builder().bbsId("BBS_001").bbsTtl("Notice").build();
        assertThat(master.getRsvtPstgPsbltyYn()).isEqualTo("N");
        assertThat(BoardMaster.builder().bbsId("BBS_002").rsvtPstgPsbltyYn("Y").build().getRsvtPstgPsbltyYn()).isEqualTo("Y");
        assertThat(BoardMaster.builder().bbsId("BBS_003").rsvtPstgPsbltyYn("X").build().getRsvtPstgPsbltyYn()).isEqualTo("N");

        master.changeReservation("Y");
        assertThat(master.getRsvtPstgPsbltyYn()).isEqualTo("Y");
        master.update("Notice", null, "N", "N", 0, 0L, null, "Y", "Y", "Y");
        assertThat(master.getRsvtPstgPsbltyYn()).as("설정 수정의 다른 항목은 예약 게시를 바꾸지 않는다").isEqualTo("Y");
        master.changeReservation(null);
        assertThat(master.getRsvtPstgPsbltyYn()).isEqualTo("N");
    }

    /** [ADR-0040 결정 5·6] 상단 고정 정책은 기존 게시판 기본값 N·5·30 으로 시작하고, update 는 건드리지 않는다. */
    @Test
    @DisplayName("상단 고정 정책은 기본 N·5·30, 허용은 Y 만 Y 이고 상한·기본 일수는 null 이면 그대로다")
    void pinPolicyDefaultsAndChanges() {
        BoardMaster master = BoardMaster.builder().bbsId("BBS_001").bbsTtl("Notice").build();
        assertThat(master.getUpendFixPsbltyYn()).isEqualTo("N");
        assertThat(master.getUpendFixUplmtNocs()).isEqualTo(java.math.BigInteger.valueOf(5));
        assertThat(master.getUpendFixBscDayCnt()).isEqualTo(java.math.BigInteger.valueOf(30));
        assertThat(BoardMaster.builder().bbsId("BBS_002").upendFixPsbltyYn("X").build().getUpendFixPsbltyYn()).isEqualTo("N");

        master.changePinPolicy("Y", java.math.BigInteger.valueOf(3), null);
        assertThat(master.getUpendFixPsbltyYn()).isEqualTo("Y");
        assertThat(master.getUpendFixUplmtNocs()).isEqualTo(java.math.BigInteger.valueOf(3));
        assertThat(master.getUpendFixBscDayCnt()).as("null 이면 그대로").isEqualTo(java.math.BigInteger.valueOf(30));
        master.update("Notice", null, "N", "N", 0, 0L, null, "Y", "Y", "Y");
        assertThat(master.getUpendFixPsbltyYn()).as("설정 수정의 다른 항목은 고정 정책을 바꾸지 않는다").isEqualTo("Y");
        master.changePinPolicy(null, null, java.math.BigInteger.valueOf(7));
        assertThat(master.getUpendFixPsbltyYn()).isEqualTo("N");
        assertThat(master.getUpendFixBscDayCnt()).isEqualTo(java.math.BigInteger.valueOf(7));
    }

    /**
     * [ADR-0040 결정 6·7] 비밀글 정책·추천 받기는 기존 동작(NONE·Y)으로 시작하고, null 이면 지금 값을 둔다. update 는 건드리지
     * 않는다. 판정 도우미는 REQUIRED 일 때만 비밀글 강제, N 일 때만 추천 거부다.
     */
    @Test
    @DisplayName("비밀글 정책·추천 받기는 기본 NONE·Y 이고 null 이면 그대로, 판정 도우미는 REQUIRED·N 만 본다")
    void postPoliciesDefaultAndChange() {
        BoardMaster master = BoardMaster.builder().bbsId("BBS_001").bbsTtl("Notice").build();
        assertThat(master.getPrvtPstPlcyCd()).isEqualTo(BoardMaster.PRIVATE_POST_NONE);
        assertThat(master.getRcmdtnUseYn()).isEqualTo("Y");
        assertThat(master.requiresPrivatePosts()).isFalse();
        assertThat(master.acceptsRecommendations()).isTrue();
        BoardMaster built = BoardMaster.builder().bbsId("BBS_002").prvtPstPlcyCd(BoardMaster.PRIVATE_POST_REQUIRED)
                .rcmdtnUseYn("N").build();
        assertThat(built.requiresPrivatePosts()).isTrue();
        assertThat(built.acceptsRecommendations()).isFalse();
        assertThat(BoardMaster.builder().bbsId("BBS_003").rcmdtnUseYn("X").build().getRcmdtnUseYn())
                .as("N 밖의 값은 받음(Y)이다").isEqualTo("Y");

        master.changePostPolicies(BoardMaster.PRIVATE_POST_OPTIONAL, null);
        assertThat(master.getPrvtPstPlcyCd()).isEqualTo(BoardMaster.PRIVATE_POST_OPTIONAL);
        assertThat(master.requiresPrivatePosts()).as("OPTIONAL 은 서버가 강제하지 않는다").isFalse();
        assertThat(master.getRcmdtnUseYn()).as("null 이면 그대로").isEqualTo("Y");
        master.update("Notice", null, "N", "N", 0, 0L, null, "Y", "Y", "Y");
        assertThat(master.getPrvtPstPlcyCd()).as("설정 수정의 다른 항목은 비밀글 정책을 바꾸지 않는다")
                .isEqualTo(BoardMaster.PRIVATE_POST_OPTIONAL);
        master.changePostPolicies(null, "N");
        assertThat(master.getPrvtPstPlcyCd()).isEqualTo(BoardMaster.PRIVATE_POST_OPTIONAL);
        assertThat(master.getRcmdtnUseYn()).isEqualTo("N");
        assertThat(master.acceptsRecommendations()).isFalse();
        master.changePostPolicies(BoardMaster.PRIVATE_POST_REQUIRED, "Y");
        assertThat(master.requiresPrivatePosts()).isTrue();
        assertThat(master.acceptsRecommendations()).isTrue();
    }
}
