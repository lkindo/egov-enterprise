package com.company.project.service.board;

import com.company.project.domain.board.Board;
import com.company.project.domain.board.BoardDetailResult;
import com.company.project.domain.board.BoardRepository;
import com.company.project.service.board.dto.BoardDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.context.ApplicationEventPublisher;
import com.company.project.service.file.EgovFileService;
import com.company.project.domain.board.BoardMasterRepository;
import com.company.project.service.user.EgovUserService;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

@ExtendWith(MockitoExtension.class)
class BoardServiceTest {

    @Mock private BoardRepository boardRepository;
    @Mock private BoardMasterRepository boardMasterRepository;
    @Mock private EgovUserService userService; // Type corrected
    @Mock private EgovFileService fileService;
    @Mock private ApplicationEventPublisher eventPublisher;

    private BoardService boardService;

    @BeforeEach
    void setUp() {
        // Constructor arguments ordered correctly
        boardService = new BoardService(
            boardRepository,
            boardMasterRepository,
            userService,
            fileService,
            eventPublisher
        );
    }

    @Test
    @DisplayName("게시글 목록 조회 테스트")
    void getBoardPostsTest() {
        Board board = Board.builder().nttId(1L).nttSj("Title").build();
        Page<Board> page = new PageImpl<>(List.of(board));
        given(boardRepository.findAll(any(PageRequest.class))).willReturn(page);

        Page<BoardDto> result = boardService.getBoardPosts("BBS01", PageRequest.of(0, 10));

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getNttSj()).isEqualTo("Title");
    }

    @Test
    @DisplayName("게시글 상세 조회 테스트")
    void getPostDetailTest() {
        BoardDetailResult mockDetail = mock(BoardDetailResult.class);
        given(mockDetail.getNttId()).willReturn(1L);
        given(mockDetail.getNttSj()).willReturn("Subject");

        given(boardRepository.findArticleDetail(1L)).willReturn(Optional.of(mockDetail));
        given(boardRepository.findById(1L)).willReturn(Optional.of(Board.builder().nttId(1L).build()));

        BoardDto result = boardService.getPostDetail("BBS01", 1L);

        assertThat(result).isNotNull();
        assertThat(result.getNttSj()).isEqualTo("Subject");
    }
}
