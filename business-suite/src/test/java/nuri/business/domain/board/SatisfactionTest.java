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

}
