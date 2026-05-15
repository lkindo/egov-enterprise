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
                .nttSj("Old Title")
                .nttCn("Old Content")
                .build();
        
        board.update("New Title", "New Content", "user01", "홍길동", "pwd", "20240101", "20241231", "FILE_001", null, null, null, "N");
        
        assertThat(board.getNttSj()).isEqualTo("New Title");
        assertThat(board.getNttCn()).isEqualTo("New Content");
        assertThat(board.getNtcrId()).isEqualTo("user01");
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
    void increaseInqireCoTest() {
        Board board = Board.builder().inqireCo(10).build();
        board.increaseInqireCo();
        assertThat(board.getInqireCo()).isEqualTo(11);
        
        Board boardNull = Board.builder().inqireCo(null).build();
        boardNull.increaseInqireCo();
        assertThat(boardNull.getInqireCo()).isEqualTo(1);
    }

    @Test
    @DisplayName("카운트 업데이트 테스트")
    void countUpdateTest() {
        Board board = Board.builder().commentCo(0).fileCo(0).build();
        
        board.updateCommentCount(5);
        assertThat(board.getCommentCo()).isEqualTo(5);
        
        board.updateFileCount(3);
        assertThat(board.getFileCo()).isEqualTo(3);
    }
}
