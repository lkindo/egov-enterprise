package nuri.business.domain.board;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Satisfaction 엔티티 단위 테스트")
class SatisfactionTest {

    @Test
    @DisplayName("Satisfaction 빌더 및 기본값 테스트")
    void builderTest() {
        Satisfaction sat = Satisfaction.builder()
                .bbsId("BBS_001")
                .pstSn(1L)
                .dgstfnScr(5)
                .dgstfnCn("Very Good")
                .build();

        assertThat(sat.getBbsId()).isEqualTo("BBS_001");
        assertThat(sat.getPstSn()).isEqualTo(1L);
        assertThat(sat.getDgstfnScr()).isEqualTo(5);
        assertThat(sat.getDgstfnCn()).isEqualTo("Very Good");
        assertThat(sat.getUseYn()).isEqualTo("Y");
    }

    @Test
    @DisplayName("Satisfaction 수정 및 삭제 비즈니스 로직 테스트")
    void businessLogicTest() {
        Satisfaction sat = Satisfaction.builder()
                .bbsId("BBS_001")
                .pstSn(1L)
                .dgstfnScr(3)
                .dgstfnCn("Normal")
                .useYn("Y")
                .build();

        // update 호출
        sat.update(5, "Excellent");
        assertThat(sat.getDgstfnScr()).isEqualTo(5);
        assertThat(sat.getDgstfnCn()).isEqualTo("Excellent");

        // delete 호출
        sat.delete();
        assertThat(sat.getUseYn()).isEqualTo("N");
    }

    @Test
    @DisplayName("만족도 엔티티는 익명 작성 비밀번호를 매핑하지 않는다")
    void doesNotExposeAnonymousPasswordState() {
        assertThat(Arrays.stream(Satisfaction.class.getDeclaredFields())
                .map(java.lang.reflect.Field::getName))
                .doesNotContain("pswd");
        assertThat(Arrays.stream(Satisfaction.SatisfactionBuilder.class.getDeclaredMethods())
                .map(java.lang.reflect.Method::getName))
                .doesNotContain("pswd");
    }

}
