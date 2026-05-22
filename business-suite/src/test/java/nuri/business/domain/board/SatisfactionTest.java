package nuri.business.domain.board;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Satisfaction 엔티티 단위 테스트")
class SatisfactionTest {

    @Test
    @DisplayName("Satisfaction 빌더 및 기본값 테스트")
    void builderTest() {
        Satisfaction sat = Satisfaction.builder()
                .bbsId("BBS_001")
                .nttId("PST_001")
                .dgstfnScr(5)
                .dgstfnCn("Very Good")
                .build();

        assertThat(sat.getBbsId()).isEqualTo("BBS_001");
        assertThat(sat.getNttId()).isEqualTo("PST_001");
        assertThat(sat.getDgstfnScr()).isEqualTo(5);
        assertThat(sat.getDgstfnCn()).isEqualTo("Very Good");
        assertThat(sat.getUseYn()).isEqualTo("Y");
    }

    @Test
    @DisplayName("Satisfaction 수정 및 삭제 비즈니스 로직 테스트")
    void businessLogicTest() {
        Satisfaction sat = Satisfaction.builder()
                .bbsId("BBS_001")
                .nttId("PST_001")
                .dgstfnScr(3)
                .dgstfnCn("Normal")
                .pswd("1234")
                .useYn("Y")
                .build();

        // update 호출
        sat.update(5, "Excellent", "5678");
        assertThat(sat.getDgstfnScr()).isEqualTo(5);
        assertThat(sat.getDgstfnCn()).isEqualTo("Excellent");
        assertThat(sat.getPswd()).isEqualTo("5678");

        // password가 null/empty일 때 update 호출 시 무시 확인
        sat.update(4, "Good", null);
        assertThat(sat.getPswd()).isEqualTo("5678");
        sat.update(4, "Good", "");
        assertThat(sat.getPswd()).isEqualTo("5678");

        // delete 호출
        sat.delete();
        assertThat(sat.getUseYn()).isEqualTo("N");
    }

    @Test
    @DisplayName("Satisfaction 레거시 별칭(Aliases) Getter/Setter 테스트")
    void legacyAliasesAndSettersTest() {
        Satisfaction sat = Satisfaction.builder().build();

        // Setter aliases 호출
        sat.setStsfdgId(10L);
        sat.setPstId("PST_777");
        sat.setStsfdgLevel(4);
        sat.setStsfdgCn("Nice");
        sat.setPassword("pass");
        sat.setBoardId("BBS_002");
        sat.setArticleId("PST_888");
        sat.setSatisfactionLevel(2);
        sat.setWrterId("user01");
        sat.setWrterNm("User01 Name");

        // Getter aliases 및 매핑 검증
        assertThat(sat.getStsfdgId()).isEqualTo(10L);
        assertThat(sat.getDgstfnSn()).isEqualTo(10L);

        assertThat(sat.getPstId()).isEqualTo("PST_888"); // setArticleId가 덮어씀
        assertThat(sat.getNttId()).isEqualTo("PST_888");

        assertThat(sat.getStsfdgLevel()).isEqualTo(2); // setSatisfactionLevel이 덮어씀
        assertThat(sat.getDgstfnScr()).isEqualTo(2);

        assertThat(sat.getStsfdgCn()).isEqualTo("Nice");
        assertThat(sat.getDgstfnCn()).isEqualTo("Nice");

        assertThat(sat.getPassword()).isEqualTo("pass");
        assertThat(sat.getPswd()).isEqualTo("pass");

        assertThat(sat.getBoardId()).isEqualTo("BBS_002");
        assertThat(sat.getBbsId()).isEqualTo("BBS_002");

        assertThat(sat.getArticleId()).isEqualTo("PST_888");
        assertThat(sat.getSatisfactionLevel()).isEqualTo(2);

        assertThat(sat.getWrterId()).isEqualTo("user01");
        assertThat(sat.getUserId()).isEqualTo("user01");

        assertThat(sat.getWrterNm()).isEqualTo("User01 Name");
        assertThat(sat.getUserNm()).isEqualTo("User01 Name");
    }

    @Test
    @DisplayName("Satisfaction 커스텀 빌더 확장 메서드 검증")
    void customBuilderTest() {
        Satisfaction sat = Satisfaction.builder()
                .stsfdgId(99L)
                .pstId("PST_99")
                .stsfdgLevel(5)
                .stsfdgCn("Perfect")
                .password("pwd")
                .wrterId("writer")
                .wrterNm("WriterName")
                .build();

        assertThat(sat.getDgstfnSn()).isEqualTo(99L);
        assertThat(sat.getNttId()).isEqualTo("PST_99");
        assertThat(sat.getDgstfnScr()).isEqualTo(5);
        assertThat(sat.getDgstfnCn()).isEqualTo("Perfect");
        assertThat(sat.getPswd()).isEqualTo("pwd");
        assertThat(sat.getUserId()).isEqualTo("writer");
        assertThat(sat.getUserNm()).isEqualTo("WriterName");
    }
}
