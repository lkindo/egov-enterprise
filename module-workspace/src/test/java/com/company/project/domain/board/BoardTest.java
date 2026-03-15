package com.company.project.domain.board;

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
                .nttSj("Title")
                .nttCn("Content")
                .build();

        assertThat(board.getBbsId()).isEqualTo("BBS_001");
        assertThat(board.getNttSj()).isEqualTo("Title");
        assertThat(board.getNttCn()).isEqualTo("Content");
        assertThat(board.getInqireCo()).isEqualTo(0);
        assertThat(board.getUseAt()).isEqualTo("Y");
    }

    @Test
    @DisplayName("Board 엔티티 수정 테스트")
    void updateTest() {
        Board board = Board.builder()
                .bbsId("BBS_001")
                .nttSj("Old Title")
                .nttCn("Old Content")
                .build();

        board.update("New Title", "New Content", "user01", "User 01", "pass", "20240101", "20241231", "FILE_001");

        assertThat(board.getNttSj()).isEqualTo("New Title");
        assertThat(board.getNttCn()).isEqualTo("New Content");
        assertThat(board.getNtcrId()).isEqualTo("user01");
        assertThat(board.getNtcrNm()).isEqualTo("User 01");
        assertThat(board.getPassword()).isEqualTo("pass");
        assertThat(board.getNtceBgnde()).isEqualTo("20240101");
        assertThat(board.getNtceEndde()).isEqualTo("20241231");
        assertThat(board.getAtchFileId()).isEqualTo("FILE_001");
    }

    @Test
    @DisplayName("Board 엔티티 논리 삭제 테스트")
    void deleteTest() {
        Board board = Board.builder()
                .bbsId("BBS_001")
                .useAt("Y")
                .build();

        board.delete();

        assertThat(board.getUseAt()).isEqualTo("N");
    }

    @Test
    @DisplayName("Board 조회수 증가 테스트")
    void increaseInqireCoTest() {
        Board board = Board.builder()
                .bbsId("BBS_001")
                .inqireCo(10)
                .build();

        board.increaseInqireCo();

        assertThat(board.getInqireCo()).isEqualTo(11);
    }

    @Test
    @DisplayName("조회수가 null일 때 증가 테스트")
    void increaseInqireCoNullTest() {
        Board board = Board.builder()
                .bbsId("BBS_001")
                .inqireCo(null)
                .build();
        
        board.increaseInqireCo();

        assertThat(board.getInqireCo()).isEqualTo(1);
    }

    @Test
    @DisplayName("게시글 번호 업데이트 테스트")
    void updateReplyOrderTest() {
        Board board = Board.builder()
                .bbsId("BBS_001")
                .nttNo(1L)
                .build();

        board.updateReplyOrder(2L);

        assertThat(board.getNttNo()).isEqualTo(2L);
    }

    @Test
    @DisplayName("댓글 및 파일 개수 업데이트 테스트")
    void updateCountsTest() {
        Board board = Board.builder()
                .bbsId("BBS_001")
                .build();

        board.updateCommentCount(5);
        board.updateFileCount(3);

        assertThat(board.getCommentCo()).isEqualTo(5);
        assertThat(board.getFileCo()).isEqualTo(3);
    }
}
