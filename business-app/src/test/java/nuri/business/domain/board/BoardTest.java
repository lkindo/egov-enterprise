package nuri.business.domain.board;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Board 엔티티 테스트")
class BoardTest {

    @Test
    @DisplayName("Board 엔티티 빌더 및 초기화 테스트")
    void builderTest() {
        Board board = Board.builder()
                .bbsId("BBS_001")
                .pstTtl("Title")
                .pstCn("Content")
                .build();

        assertThat(board.getBbsId()).isEqualTo("BBS_001");
        assertThat(board.getPstTtl()).isEqualTo("Title");
        assertThat(board.getPstCn()).isEqualTo("Content");
        assertThat(board.getInqCnt()).isEqualTo(0);
        assertThat(board.getUseYn()).isEqualTo("Y");
    }

    @Test
    @DisplayName("Board 엔티티 수정 테스트")
    void updateTest() {
        Board board = Board.builder()
                .bbsId("BBS_001")
                .pstTtl("Old Title")
                .pstCn("Old Content")
                .build();

        board.update("New Title", "New Content", "user01", "User 01", "pass", "20240101", "20241231", 101L, null, null, null, "N");

        assertThat(board.getPstTtl()).isEqualTo("New Title");
        assertThat(board.getPstCn()).isEqualTo("New Content");
        assertThat(board.getUserId()).isEqualTo("user01");
        assertThat(board.getUserNm()).isEqualTo("User 01");
        assertThat(board.getPswd()).isEqualTo("pass");
        assertThat(board.getPstBgngYmd()).isEqualTo("20240101");
        assertThat(board.getPstEndYmd()).isEqualTo("20241231");
        assertThat(board.getAtchFileSn()).isEqualTo(101L);
    }

    @Test
    @DisplayName("Board 엔티티 논리 삭제 테스트")
    void deleteTest() {
        Board board = Board.builder()
                .bbsId("BBS_001")
                .useYn("Y")
                .build();

        board.delete();

        assertThat(board.getUseYn()).isEqualTo("N");
    }

    @Test
    @DisplayName("빌더 기본값(Builder.Default) 설정 테스트")
    void builderDefaultTest() {
        Board board = Board.builder().build();

        assertThat(board.getAnsLv()).isEqualTo(0);
        assertThat(board.getInqCnt()).isEqualTo(0);
        assertThat(board.getUseYn()).isEqualTo("Y");
        assertThat(board.getQnaSttsCd()).isEqualTo("OPEN");
        assertThat(board.getLikeCnt()).isEqualTo(0);
        assertThat(board.getAnsYn()).isEqualTo("N");
        assertThat(board.getNtcYn()).isEqualTo("N");
        assertThat(board.getCmntCnt()).isEqualTo(0);
        assertThat(board.getFileCnt()).isEqualTo(0);
    }
}
