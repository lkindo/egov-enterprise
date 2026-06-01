package nuri.business.domain.board;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Board 엔티티 테스트")
class BoardEntityTest {

    @Test
    @DisplayName("게시글 수정 테스트")
    void updateTest() {
        Board board = Board.builder()
                .pstTtl("Old Title")
                .pstCn("Old Content")
                .build();
        
        board.update("New Title", "New Content", "user01", "홍길동", "pwd", "20240101", "20241231", "FILE_001", null, null, null, "N");
        
        assertThat(board.getPstTtl()).isEqualTo("New Title");
        assertThat(board.getPstCn()).isEqualTo("New Content");
        assertThat(board.getUserId()).isEqualTo("user01");
        assertThat(board.getAtchFileId()).isEqualTo("FILE_001");
    }

    @Test
    @DisplayName("게시글 삭제(상태변경) 테스트")
    void deleteTest() {
        Board board = Board.builder().useYn("Y").build();
        board.delete();
        assertThat(board.getUseYn()).isEqualTo("N");
    }

    @Test
    @DisplayName("조회수 증가 테스트")
    void increaseInqCntTest() {
        Board board = Board.builder().inqCnt(10).build();
        board.increaseInqCnt();
        assertThat(board.getInqCnt()).isEqualTo(11);
        
        Board boardNull = Board.builder().inqCnt(null).build();
        boardNull.increaseInqCnt();
        assertThat(boardNull.getInqCnt()).isEqualTo(1);
    }

    @Test
    @DisplayName("카운트 업데이트 테스트")
    void countUpdateTest() {
        Board board = Board.builder().cmntCnt(0).fileCnt(0).build();
        
        board.setCommentCnt(5);
        assertThat(board.getCommentCnt()).isEqualTo(5);
        
        board.setFileCnt(3);
        assertThat(board.getFileCnt()).isEqualTo(3);
    }
}
