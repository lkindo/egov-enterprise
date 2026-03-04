package com.company.project.service.board;

import com.company.project.domain.board.Board;
import com.company.project.domain.board.BoardDetailResult;
import com.company.project.domain.board.BoardMasterRepository;
import com.company.project.domain.board.BoardRepository;
import com.company.project.service.board.dto.BoardDto;
import com.company.project.service.board.dto.BoardSaveRequest;
import com.company.project.service.file.EgovFileService;
import com.company.project.service.user.EgovUserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BoardComplexLogicTest {

    @Mock private BoardRepository boardRepository;
    @Mock private BoardMasterRepository boardMasterRepository;
    @Mock private EgovUserService userService;
    @Mock private EgovFileService fileService;
    @Mock private ApplicationEventPublisher eventPublisher;

    private BoardService boardService;

    @BeforeEach
    void setUp() {
        boardService = new BoardService(
            boardRepository,
            boardMasterRepository,
            userService,
            fileService,
            eventPublisher
        );
    }

    @Test
    @DisplayName("복합 검색 조건 테스트 (전체 게시글 조회)")
    void getBoardPostsTest() {
        // Given
        String bbsId = "BBS01";
        PageRequest pageable = PageRequest.of(0, 10);
        Board board = Board.builder().nttId(1L).nttSj("Test Post").build();
        Page<Board> page = new PageImpl<>(List.of(board));

        given(boardRepository.findAll(any(PageRequest.class))).willReturn(page);

        // When
        Page<BoardDto> result = boardService.getBoardPosts(bbsId, pageable);

        // Then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getNttSj()).isEqualTo("Test Post");
    }

    @Test
    @DisplayName("게시글 저장 시 첨부파일 ID 매핑 검증")
    void createPostWithFileTest() {
        // Given
        String bbsId = "BBS01";
        BoardSaveRequest request = new BoardSaveRequest(
                bbsId, "New Title", "New Content", null, null, "FILE_999"
        );

        // When
        boardService.createPost(bbsId, request);

        // Then
        // Repository에 저장되는 엔티티의 atchFileId가 request와 동일한지 확인
        verify(boardRepository).save(argThat(board ->
            "FILE_999".equals(board.getAtchFileId())
        ));
    }

    @Test
    @DisplayName("게시글 상세 조회 시 조회수 증가 로직 검증")
    void viewCountIncrementTest() {
        // Given
        Long nttId = 1L;
        Board board = spy(Board.builder().nttId(nttId).inqireCo(10).build());
        BoardDetailResult mockDetail = mock(BoardDetailResult.class);

        given(boardRepository.findArticleDetail(nttId)).willReturn(Optional.of(mockDetail));
        given(boardRepository.findById(nttId)).willReturn(Optional.of(board));

        // When
        boardService.getPostDetail("BBS01", nttId);

        // Then
        verify(board).increaseInqireCo();
        verify(boardRepository).save(board);
    }
}
