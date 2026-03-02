package com.company.project.domain.board;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

class BoardEntityTest {

    @Test
    @DisplayName("Board 엔티티 수동 생성 및 필드 접근 테스트")
    void boardBasicTest() {
        Board board = Board.builder()
                .bbsId("BBSMSTR_000000000001")
                .build();

        // Use Reflection to set private fields if setters are missing or causing NPE
        ReflectionTestUtils.setField(board, "nttId", 1L);
        ReflectionTestUtils.setField(board, "nttSj", "Test Subject");

        assertThat(board.getNttId()).isEqualTo(1L);
        assertThat(board.getNttSj()).isEqualTo("Test Subject");
    }
}
