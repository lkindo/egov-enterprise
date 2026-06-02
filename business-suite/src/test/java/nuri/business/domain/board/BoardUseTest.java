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

        // setUseYn 호출
        boardUse.setUseYn("Y");
        assertThat(boardUse.getUseYn()).isEqualTo("Y");

        // 호환성을 위한 빈 세터 호출 (에러가 나지 않음을 확인)
        boardUse.setLastMdfrId("admin");
        boardUse.setFrstRgtrId("admin");
    }

    @Test
    @DisplayName("BoardUse 레거시 별칭(Aliases) Getter/Setter 테스트")
    void legacyAliasesAndSettersTest() {
        BoardUse boardUse = BoardUse.builder().build();

        // Setter aliases 호출
        boardUse.setRegistSeCode("SE_LEGACY");

        // Getter aliases 및 매핑 검증
        assertThat(boardUse.getRegistSeCode()).isEqualTo("SE_LEGACY");
        assertThat(boardUse.getRgstrSeCd()).isEqualTo("SE_LEGACY");
    }

    @Test
    @DisplayName("BoardUse 커스텀 빌더 확장 메서드 검증")
    void customBuilderTest() {
        BoardUse boardUse = BoardUse.builder()
                .registSeCode("SE_BUILD")
                .build();

        assertThat(boardUse.getRgstrSeCd()).isEqualTo("SE_BUILD");
    }
}
