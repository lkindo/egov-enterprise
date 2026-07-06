package nuri.business.domain.board;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("BoardUse 엔티티 단위 테스트")
class BoardUseTest {

    @Test
    @DisplayName("BoardUse 전체 인자 생성자 테스트")
    void constructorTest() {
        BoardUse boardUse = new BoardUse("BBS_01", "TRGT_01", "SE_01", "Y");

        assertThat(boardUse.getBbsId()).isEqualTo("BBS_01");
        assertThat(boardUse.getTrgtId()).isEqualTo("TRGT_01");
        assertThat(boardUse.getRgstrSeCd()).isEqualTo("SE_01");
        assertThat(boardUse.getUseYn()).isEqualTo("Y");
    }

    @Test
    @DisplayName("BoardUse 빌더 테스트")
    void builderTest() {
        BoardUse boardUse = BoardUse.builder()
                .bbsId("BBS_02")
                .trgtId("TRGT_02")
                .rgstrSeCd("SE_02")
                .useYn("N")
                .build();

        assertThat(boardUse.getBbsId()).isEqualTo("BBS_02");
        assertThat(boardUse.getTrgtId()).isEqualTo("TRGT_02");
        assertThat(boardUse.getRgstrSeCd()).isEqualTo("SE_02");
        assertThat(boardUse.getUseYn()).isEqualTo("N");
    }

    @Test
    @DisplayName("BoardUse 수정 및 세터 테스트")
    void updateAndSetterTest() {
        BoardUse boardUse = new BoardUse("BBS_01", "TRGT_01", "SE_01", "Y");

        // update 호출
        boardUse.update("N");
        assertThat(boardUse.getUseYn()).isEqualTo("N");

        // setUseYn 호출 대신 update 호출로 검증
        boardUse.update("Y");
        assertThat(boardUse.getUseYn()).isEqualTo("Y");
    }

}
