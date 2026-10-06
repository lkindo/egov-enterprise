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
        
        board.update("New Title", "New Content", "user01", "홍길동", "pwd", "20240101", "20241231", 101L, null, null, null, "N");
        
        assertThat(board.getPstTtl()).isEqualTo("New Title");
        assertThat(board.getPstCn()).isEqualTo("New Content");
        assertThat(board.getUserId()).isEqualTo("user01");
        assertThat(board.getAtchFileSn()).isEqualTo(101L);
    }

    @Test
    @DisplayName("게시글 삭제(상태변경) 테스트")
    void deleteTest() {
        Board board = Board.builder().useYn("Y").build();
        board.delete();
        assertThat(board.getUseYn()).isEqualTo("N");
    }
}
