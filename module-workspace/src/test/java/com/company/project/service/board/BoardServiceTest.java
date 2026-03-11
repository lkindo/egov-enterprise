package com.company.project.service.board;

import com.company.project.domain.board.Board;
import com.company.project.domain.board.BoardMaster;
import com.company.project.domain.board.BoardMasterRepository;
import com.company.project.domain.board.BoardRepository;
import com.company.project.domain.board.BoardSearchCondition;
import com.company.project.service.board.dto.BoardDto;
import com.company.project.service.board.dto.BoardSaveRequest;
import com.company.project.service.file.EgovFileService;
import com.company.project.service.user.EgovUserService;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.Collections;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BoardServiceTest {

    @Mock
    private BoardRepository boardRepository;

    @Mock
    private BoardMasterRepository boardMasterRepository;

    @Mock
    private EgovUserService userService;

    @Mock
    private EgovFileService fileService;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @Mock
    private MeterRegistry meterRegistry;

    @Mock
    private Timer timer;

    @InjectMocks
    private BoardService boardService;

    @Test
    @DisplayName("게시글 목록 조회 테스트")
    void getBoardPostsTest() {
        // Given
        String bbsId = "BBS_001";
        Pageable pageable = mock(Pageable.class);
        BoardMaster master = BoardMaster.builder().bbsId(bbsId).build();
        
        when(boardMasterRepository.findById(bbsId)).thenReturn(Optional.of(master));
        when(boardRepository.searchArticles(any(BoardSearchCondition.class), eq(pageable)))
                .thenReturn(new PageImpl<>(Collections.emptyList()));

        // When
        Page<BoardDto> result = boardService.getBoardPosts(bbsId, pageable);

        // Then
        assertThat(result).isNotNull();
        verify(boardRepository).searchArticles(any(BoardSearchCondition.class), eq(pageable));
    }

    @Test
    @DisplayName("게시글 등록 테스트")
    void createPostTest() {
        // Given
        String userId = "user01";
        String bbsId = "BBS_001";
        BoardSaveRequest request = new BoardSaveRequest(bbsId, "Title", "Content", "20240101", "20241231", null);
        BoardMaster master = BoardMaster.builder().bbsId(bbsId).build();
        
        when(boardMasterRepository.findById(bbsId)).thenReturn(Optional.of(master));
        lenient().when(meterRegistry.timer(eq("egov.board.create"), any(String[].class))).thenReturn(timer);
        when(boardRepository.save(any(Board.class))).thenReturn(Board.builder().nttId(100L).build());

        // When
        Long nttId = boardService.createPost(userId, request);

        // Then
        assertThat(nttId).isEqualTo(100L);
        verify(boardRepository).save(any(Board.class));
        verify(eventPublisher).publishEvent(any());
    }

    @Test
    @DisplayName("게시글 수정 테스트")
    void updatePostTest() {
        // Given
        String bbsId = "BBS_001";
        Long nttId = 1L;
        BoardSaveRequest request = new BoardSaveRequest(bbsId, "Updated Title", "Updated Content", null, null, null);
        Board board = mock(Board.class);
        
        when(boardRepository.findById(nttId)).thenReturn(Optional.of(board));

        // When
        boardService.updatePost(bbsId, nttId, request);

        // Then
        verify(board).update(any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("게시글 삭제 테스트")
    void deletePostTest() {
        // Given
        Long nttId = 1L;
        Board board = mock(Board.class);
        
        when(boardRepository.findById(nttId)).thenReturn(Optional.of(board));

        // When
        boardService.deletePost("BBS_001", nttId, "user01");

        // Then
        verify(board).delete();
    }
}
