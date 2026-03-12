package com.company.project.service.board;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.board.*;
import com.company.project.service.board.dto.BoardDto;
import com.company.project.service.board.dto.BoardSaveRequest;
import com.company.project.service.file.EgovFileService;
import com.company.project.service.user.EgovUserService;
import com.company.project.service.user.dto.UserDto;
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
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
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
    @DisplayName("게시글 목록 키워드 조회 테스트")
    void getBoardPostsWithKeywordTest() {
        // Given
        String bbsId = "BBS_001";
        Pageable pageable = mock(Pageable.class);
        BoardMaster master = BoardMaster.builder().bbsId(bbsId).build();
        
        when(boardMasterRepository.findById(bbsId)).thenReturn(Optional.of(master));
        when(boardRepository.searchArticles(any(BoardSearchCondition.class), eq(pageable)))
                .thenReturn(new PageImpl<>(Collections.emptyList()));

        // When
        Page<BoardDto> result = boardService.getBoardPosts(bbsId, "1", "word", pageable);

        // Then
        assertThat(result).isNotNull();
        verify(boardRepository).searchArticles(argThat(cond -> 
            cond.getSearchCnd().equals("1") && cond.getSearchWrd().equals("word")
        ), eq(pageable));
    }

    @Test
    @DisplayName("게시글 등록 테스트 - 사용자 정보 조회 성공 포함")
    void createPostWithUserTest() {
        // Given
        String userId = "user01";
        String bbsId = "BBS_001";
        BoardSaveRequest request = new BoardSaveRequest(bbsId, "Title", "Content", "20240101", "20241231", null);
        BoardMaster master = BoardMaster.builder().bbsId(bbsId).build();
        UserDto user = UserDto.builder().userId(userId).userNm("John Doe").build();
        
        when(boardMasterRepository.findById(bbsId)).thenReturn(Optional.of(master));
        when(userService.getUserById(userId)).thenReturn(user);
        when(boardRepository.findMaxSortOrdr(bbsId)).thenReturn(0L);
        lenient().when(meterRegistry.timer(anyString(), any(String[].class))).thenReturn(timer);
        when(boardRepository.save(any(Board.class))).thenReturn(Board.builder().nttId(100L).bbsId(bbsId).build());

        // When
        Long nttId = boardService.createPost(userId, request);

        // Then
        assertThat(nttId).isEqualTo(100L);
        verify(boardRepository).save(argThat(entity -> entity.getNtcrNm().equals("John Doe")));
    }

    @Test
    @DisplayName("파일 포함 게시글 등록 테스트")
    void createPostWithFilesTest() throws IOException {
        // Given
        String userId = "user01";
        String bbsId = "BBS_001";
        BoardSaveRequest request = new BoardSaveRequest(bbsId, "Title", "Content", null, null, null);
        List<MultipartFile> files = List.of(mock(MultipartFile.class));
        
        when(boardMasterRepository.findById(bbsId)).thenReturn(Optional.of(BoardMaster.builder().bbsId(bbsId).build()));
        when(fileService.uploadFiles(files)).thenReturn("FILE_ID_1");
        when(boardRepository.save(any(Board.class))).thenReturn(Board.builder().nttId(100L).bbsId(bbsId).build());
        lenient().when(meterRegistry.timer(anyString(), any(String[].class))).thenReturn(timer);

        // When
        Long nttId = boardService.createPostWithFiles(userId, request, files);

        // Then
        assertThat(nttId).isEqualTo(100L);
        verify(fileService).uploadFiles(files);
        verify(boardRepository).save(argThat(entity -> entity.getAtchFileId().equals("FILE_ID_1")));
    }

    @Test
    @DisplayName("답글 등록 테스트")
    void replyPostTest() {
        // Given
        String userId = "user01";
        Long parentId = 10L;
        String bbsId = "BBS_001";
        BoardSaveRequest request = new BoardSaveRequest(bbsId, "Reply Title", "Reply Content", null, null, null);
        BoardMaster master = BoardMaster.builder().bbsId(bbsId).build();
        Board parent = Board.builder().nttId(parentId).bbsId(bbsId).sortOrdr(100L).replyLc(0).build();
        
        when(boardMasterRepository.findById(bbsId)).thenReturn(Optional.of(master));
        when(boardRepository.findById(parentId)).thenReturn(Optional.of(parent));
        when(boardRepository.findMaxNttNo(eq(bbsId), anyLong())).thenReturn(0L);
        when(boardRepository.save(any(Board.class))).thenReturn(Board.builder().nttId(101L).bbsId(bbsId).build());

        // When
        Long nttId = boardService.replyPost(userId, parentId, request);

        // Then
        assertThat(nttId).isEqualTo(101L);
        verify(boardRepository).save(argThat(entity -> 
            entity.getParnts().equals(parentId) && entity.getReplyAt().equals("Y") && entity.getReplyLc() == 1
        ));
    }

    @Test
    @DisplayName("파일 포함 답글 등록 테스트")
    void replyPostWithFilesTest() throws IOException {
        // Given
        String userId = "user01";
        Long parentId = 10L;
        String bbsId = "BBS_001";
        BoardSaveRequest request = new BoardSaveRequest(bbsId, "Reply Title", "Reply Content", null, null, null);
        List<MultipartFile> files = List.of(mock(MultipartFile.class));
        
        when(boardMasterRepository.findById(bbsId)).thenReturn(Optional.of(BoardMaster.builder().bbsId(bbsId).build()));
        when(boardRepository.findById(parentId)).thenReturn(Optional.of(Board.builder().bbsId(bbsId).sortOrdr(100L).replyLc(0).build()));
        when(fileService.uploadFiles(files)).thenReturn("REPLY_FILE_ID");
        when(boardRepository.save(any(Board.class))).thenReturn(Board.builder().nttId(101L).bbsId(bbsId).build());

        // When
        Long nttId = boardService.replyPostWithFiles(userId, parentId, request, files);

        // Then
        assertThat(nttId).isEqualTo(101L);
        verify(fileService).uploadFiles(files);
        verify(boardRepository).save(argThat(entity -> entity.getAtchFileId().equals("REPLY_FILE_ID")));
    }

    @Test
    @DisplayName("게시글 상세 조회 테스트")
    void getPostDetailTest() {
        // Given
        String bbsId = "BBS_001";
        Long nttId = 1L;
        BoardDetailResult detail = mock(BoardDetailResult.class);
        Board board = mock(Board.class);
        
        when(boardRepository.findArticleDetail(nttId)).thenReturn(Optional.of(detail));
        when(boardRepository.findById(nttId)).thenReturn(Optional.of(board));

        // When
        BoardDto result = boardService.getPostDetail(bbsId, nttId);

        // Then
        assertThat(result).isNotNull();
        verify(board).increaseInqireCo();
    }

    @Test
    @DisplayName("게시판 미존재 시 예외 발생 테스트")
    void getBoardPosts_NotFound() {
        when(boardMasterRepository.findById(anyString())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> boardService.getBoardPosts("UNKNOWN", mock(Pageable.class)))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.BOARD_NOT_FOUND);
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
    @DisplayName("파일 포함 게시글 수정 테스트 - 기존 파일 없음")
    void updatePostWithFilesNewTest() throws IOException {
        // Given
        String bbsId = "BBS_001";
        Long nttId = 1L;
        BoardSaveRequest request = new BoardSaveRequest(bbsId, "Updated", "Updated", null, null, null);
        List<MultipartFile> files = List.of(mock(MultipartFile.class));
        Board board = mock(Board.class);
        
        when(boardRepository.findById(nttId)).thenReturn(Optional.of(board));
        when(fileService.uploadFiles(files)).thenReturn("NEW_FILE_ID");

        // When
        boardService.updatePostWithFiles(bbsId, nttId, request, files);

        // Then
        verify(fileService).uploadFiles(files);
        verify(board).update(any(), any(), any(), any(), any(), any(), any(), eq("NEW_FILE_ID"));
    }

    @Test
    @DisplayName("파일 포함 게시글 수정 테스트 - 기존 파일 업데이트")
    void updatePostWithFilesUpdateTest() throws IOException {
        // Given
        String bbsId = "BBS_001";
        Long nttId = 1L;
        BoardSaveRequest request = new BoardSaveRequest(bbsId, "Updated", "Updated", null, null, "OLD_FILE_ID");
        List<MultipartFile> files = List.of(mock(MultipartFile.class));
        Board board = mock(Board.class);
        
        when(boardRepository.findById(nttId)).thenReturn(Optional.of(board));

        // When
        boardService.updatePostWithFiles(bbsId, nttId, request, files);

        // Then
        verify(fileService).updateFiles("OLD_FILE_ID", files);
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

    @Test
    @DisplayName("게시글 등록 테스트 - 사용자 정보 조회 실패 시 익명 처리")
    void createPost_UserNotFound_Anonymous() {
        // Given
        String userId = "unknown";
        String bbsId = "BBS_001";
        BoardSaveRequest request = new BoardSaveRequest(bbsId, "Title", "Content", null, null, null);
        BoardMaster master = BoardMaster.builder().bbsId(bbsId).build();
        
        when(boardMasterRepository.findById(bbsId)).thenReturn(Optional.of(master));
        when(userService.getUserById(userId)).thenThrow(new RuntimeException("Not Found"));
        when(boardRepository.findMaxSortOrdr(bbsId)).thenReturn(0L);
        lenient().when(meterRegistry.timer(anyString(), any(String[].class))).thenReturn(timer);
        when(boardRepository.save(any(Board.class))).thenReturn(Board.builder().nttId(100L).bbsId(bbsId).build());

        // When
        boardService.createPost(userId, request);

        // Then
        verify(boardRepository).save(argThat(entity -> entity.getNtcrNm().equals("익명")));
    }

    @Test
    @DisplayName("답글 등록 테스트 - 사용자 정보 조회 실패 시 익명 처리")
    void replyPost_UserNotFound_Anonymous() {
        // Given
        String userId = "unknown";
        Long parentId = 10L;
        String bbsId = "BBS_001";
        BoardSaveRequest request = new BoardSaveRequest(bbsId, "Reply", "Content", null, null, null);
        BoardMaster master = BoardMaster.builder().bbsId(bbsId).build();
        Board parent = Board.builder().nttId(parentId).bbsId(bbsId).sortOrdr(100L).replyLc(0).build();
        
        when(boardMasterRepository.findById(bbsId)).thenReturn(Optional.of(master));
        when(boardRepository.findById(parentId)).thenReturn(Optional.of(parent));
        when(userService.getUserById(userId)).thenThrow(new RuntimeException("Not Found"));
        when(boardRepository.findMaxNttNo(eq(bbsId), anyLong())).thenReturn(0L);
        when(boardRepository.save(any(Board.class))).thenReturn(Board.builder().nttId(101L).bbsId(bbsId).build());

        // When
        boardService.replyPost(userId, parentId, request);

        // Then
        verify(boardRepository).save(argThat(entity -> entity.getNtcrNm().equals("익명")));
    }

    @Test
    @DisplayName("파일 업로드 시 빈 파일 목록 처리 테스트")
    void createPostWithFiles_EmptyFiles() throws IOException {
        // Given
        String userId = "user01";
        String bbsId = "BBS_001";
        BoardSaveRequest request = new BoardSaveRequest(bbsId, "Title", "Content", null, null, "EXISTING_ID");
        
        when(boardMasterRepository.findById(bbsId)).thenReturn(Optional.of(BoardMaster.builder().bbsId(bbsId).build()));
        lenient().when(meterRegistry.timer(anyString(), any(String[].class))).thenReturn(timer);
        when(boardRepository.save(any(Board.class))).thenReturn(Board.builder().nttId(100L).bbsId(bbsId).build());

        // When
        boardService.createPostWithFiles(userId, request, Collections.emptyList());

        // Then
        verify(fileService, never()).uploadFiles(any());
        verify(boardRepository).save(argThat(entity -> entity.getAtchFileId().equals("EXISTING_ID")));
    }

    @Test
    @DisplayName("게시글 수정 실패 - 존재하지 않는 게시글")
    void updatePost_NotFound_ThrowsException() {
        // Given
        when(boardRepository.findById(anyLong())).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> boardService.updatePost("BBS_1", 1L, mock(BoardSaveRequest.class)))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.ARTICLE_NOT_FOUND);
    }

    @Test
    @DisplayName("답글 등록 실패 - 부모 게시글 미존재")
    void replyPost_ParentNotFound_ThrowsException() {
        // Given
        String bbsId = "BBS_1";
        when(boardMasterRepository.findById(bbsId)).thenReturn(Optional.of(BoardMaster.builder().bbsId(bbsId).build()));
        when(boardRepository.findById(anyLong())).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> boardService.replyPost("user", 1L, new BoardSaveRequest(bbsId, "T", "C", null, null, null)))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.ARTICLE_NOT_FOUND);
    }
}

