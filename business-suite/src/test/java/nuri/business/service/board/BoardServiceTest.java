package nuri.business.service.board;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.business.domain.board.*;
import nuri.business.service.board.dto.BoardDto;
import nuri.business.service.board.dto.BoardSaveRequest;
import nuri.business.service.file.EgovFileService;
import nuri.foundation.service.user.EgovUserService;
import nuri.foundation.service.user.dto.UserDto;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
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
@MockitoSettings(strictness = Strictness.LENIENT)
class BoardServiceTest {

    @Mock
    private BoardRepository boardRepository;

    @Mock
    private BoardMasterRepository boardMasterRepository;

    @Mock
    private EgovUserService userService;

    @Mock
    private EgovFileService fileService;

    private MeterRegistry meterRegistry = new SimpleMeterRegistry();

    @Mock
    private ApplicationEventPublisher eventPublisher;

    private BoardService boardService;

    @BeforeEach
    void setUp() {
        boardService = new BoardService(boardRepository, boardMasterRepository, userService, fileService,
                eventPublisher, meterRegistry);
    }

    @Test
    @DisplayName("게시글 목록 조회 테스트")
    void getBoardPostsTest() {
        String bbsId = "BBS_001";
        Pageable pageable = mock(Pageable.class);
        BoardMaster master = BoardMaster.builder().bbsId(bbsId).build();

        when(boardMasterRepository.findById(bbsId)).thenReturn(Optional.of(master));
        when(boardRepository.searchArticles(any(), any())).thenReturn(new PageImpl<>(Collections.emptyList()));

        Page<BoardDto> result = boardService.getBoardPosts(bbsId, pageable);

        assertThat(result).isNotNull();
    }

    @Test
    @DisplayName("게시글 목록 키워드 조회 테스트")
    void getBoardPostsWithKeywordTest() {
        String bbsId = "BBS_001";
        Pageable pageable = mock(Pageable.class);
        BoardMaster master = BoardMaster.builder().bbsId(bbsId).build();

        when(boardMasterRepository.findById(bbsId)).thenReturn(Optional.of(master));
        when(boardRepository.searchArticles(any(), any())).thenReturn(new PageImpl<>(Collections.emptyList()));

        Page<BoardDto> result = boardService.getBoardPosts(bbsId, "1", "word", pageable);

        assertThat(result).isNotNull();
    }

    @Test
    @DisplayName("게시글 등록 테스트 - 사용자 정보 조회 성공 포함")
    void createPostWithUserTest() {
        String userId = "user01";
        String bbsId = "BBS_001";
        BoardSaveRequest request = new BoardSaveRequest(bbsId, "Title", "Content", "20240101", "20241231", null, null,
                null, null, null);
        BoardMaster master = BoardMaster.builder().bbsId(bbsId).build();
        UserDto user = UserDto.builder().userId(userId).userNm("John Doe").esntlId("E1").build();

        when(boardMasterRepository.findById(bbsId)).thenReturn(Optional.of(master));
        when(userService.getUserById(userId)).thenReturn(user);
        when(boardRepository.findMaxSortOrdr(bbsId)).thenReturn(0L);
        when(boardRepository.save(any())).thenReturn(Board.builder().nttId(100L).bbsId(bbsId).build());

        Long nttId = boardService.createPost(userId, request);

        assertThat(nttId).isEqualTo(100L);
    }

    @Test
    @DisplayName("파일 포함 게시글 등록 테스트")
    void createPostWithFilesTest() throws IOException {
        String userId = "user01";
        String bbsId = "BBS_001";
        BoardSaveRequest request = new BoardSaveRequest(bbsId, "Title", "Content", null, null, null, null, null, null,
                null);
        List<MultipartFile> files = List.of(mock(MultipartFile.class));

        when(boardMasterRepository.findById(bbsId)).thenReturn(Optional.of(BoardMaster.builder().bbsId(bbsId).build()));
        when(fileService.uploadFiles(files)).thenReturn("FILE_ID_1");
        when(boardRepository.save(any())).thenReturn(Board.builder().nttId(100L).bbsId(bbsId).build());

        Long nttId = boardService.createPostWithFiles(userId, request, files);

        assertThat(nttId).isEqualTo(100L);
    }

    @Test
    @DisplayName("답글 등록 테스트")
    void replyPostTest() {
        String userId = "user01";
        Long parentId = 10L;
        String bbsId = "BBS_001";
        BoardSaveRequest request = new BoardSaveRequest(bbsId, "Reply Title", "Reply Content", null, null, null, null,
                null, null, null);
        BoardMaster master = BoardMaster.builder().bbsId(bbsId).build();
        Board parent = Board.builder().nttId(parentId).bbsId(bbsId).sortOrdr(100L).replyLc(0).build();

        when(boardMasterRepository.findById(bbsId)).thenReturn(Optional.of(master));
        when(boardRepository.findById(parentId)).thenReturn(Optional.of(parent));
        when(boardRepository.findMaxNttNo(eq(bbsId), anyLong())).thenReturn(0L);
        when(boardRepository.save(any())).thenReturn(Board.builder().nttId(101L).bbsId(bbsId).build());

        Long nttId = boardService.replyPost(userId, parentId, request);

        assertThat(nttId).isEqualTo(101L);
    }

    @Test
    @DisplayName("파일 포함 답글 등록 테스트")
    void replyPostWithFilesTest() throws IOException {
        String userId = "user01";
        Long parentId = 10L;
        String bbsId = "BBS_001";
        BoardSaveRequest request = new BoardSaveRequest(bbsId, "Reply Title", "Reply Content", null, null, null, null,
                null, null, null);
        List<MultipartFile> files = List.of(mock(MultipartFile.class));

        when(boardMasterRepository.findById(bbsId)).thenReturn(Optional.of(BoardMaster.builder().bbsId(bbsId).build()));
        when(boardRepository.findById(parentId))
                .thenReturn(Optional.of(Board.builder().bbsId(bbsId).sortOrdr(100L).replyLc(0).build()));
        when(fileService.uploadFiles(files)).thenReturn("REPLY_FILE_ID");
        when(boardRepository.save(any())).thenReturn(Board.builder().nttId(101L).bbsId(bbsId).build());

        Long nttId = boardService.replyPostWithFiles(userId, parentId, request, files);

        assertThat(nttId).isEqualTo(101L);
    }

    @Test
    @DisplayName("게시글 상세 조회 테스트")
    void getPostDetailTest() {
        String bbsId = "BBS_001";
        Long nttId = 1L;
        BoardDetailResult detail = mock(BoardDetailResult.class);
        Board board = Board.builder().bbsId(bbsId).nttId(nttId).build();

        when(boardRepository.findArticleDetail(nttId)).thenReturn(Optional.of(detail));
        when(boardRepository.findById(nttId)).thenReturn(Optional.of(board));

        BoardDto result = boardService.getPostDetail(bbsId, nttId);

        assertThat(result).isNotNull();
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
        String bbsId = "BBS_001";
        Long nttId = 1L;
        BoardSaveRequest request = new BoardSaveRequest(bbsId, "Updated Title", "Updated Content", null, null, null,
                null, null, null, null);
        Board board = Board.builder().bbsId(bbsId).nttId(nttId).build();

        when(boardRepository.findById(nttId)).thenReturn(Optional.of(board));

        boardService.updatePost(bbsId, nttId, request);

        assertThat(board.getNttSj()).isEqualTo("Updated Title");
    }

    @Test
    @DisplayName("파일 포함 게시글 수정 테스트 - 기존 파일 없음")
    void updatePostWithFilesNewTest() throws IOException {
        String bbsId = "BBS_001";
        Long nttId = 1L;
        BoardSaveRequest request = new BoardSaveRequest(bbsId, "Updated", "Updated", null, null, null, null, null,
                null, null);
        List<MultipartFile> files = List.of(mock(MultipartFile.class));
        Board board = Board.builder().bbsId(bbsId).nttId(nttId).build();

        when(boardRepository.findById(nttId)).thenReturn(Optional.of(board));
        when(fileService.uploadFiles(files)).thenReturn("NEW_FILE_ID");

        boardService.updatePostWithFiles(bbsId, nttId, request, files);

        assertThat(board.getAtchFileId()).isEqualTo("NEW_FILE_ID");
    }

    @Test
    @DisplayName("파일 포함 게시글 수정 테스트 - 기존 파일 업데이트")
    void updatePostWithFilesUpdateTest() throws IOException {
        String bbsId = "BBS_001";
        Long nttId = 1L;
        BoardSaveRequest request = new BoardSaveRequest(bbsId, "Updated", "Updated", null, null, "OLD_FILE_ID", null,
                null, null, null);
        List<MultipartFile> files = List.of(mock(MultipartFile.class));
        Board board = Board.builder().bbsId(bbsId).nttId(nttId).build();

        when(boardRepository.findById(nttId)).thenReturn(Optional.of(board));

        boardService.updatePostWithFiles(bbsId, nttId, request, files);

        verify(fileService).updateFiles("OLD_FILE_ID", files);
    }

    @Test
    @DisplayName("게시글 삭제 테스트")
    void deletePostTest() {
        Long nttId = 1L;
        Board board = Board.builder().bbsId("B1").nttId(nttId).build();

        when(boardRepository.findById(nttId)).thenReturn(Optional.of(board));

        boardService.deletePost("BBS_001", nttId, "user01");

        assertThat(board.getUseAt()).isEqualTo("N");
    }

    @Test
    @DisplayName("게시글 등록 테스트 - 사용자 정보 조회 실패 시 익명 처리")
    void createPost_UserNotFound_Anonymous() {
        String userId = "unknown";
        String bbsId = "BBS_001";
        BoardSaveRequest request = new BoardSaveRequest(bbsId, "Title", "Content", null, null, null, null, null, null,
                null);
        BoardMaster master = BoardMaster.builder().bbsId(bbsId).build();

        when(boardMasterRepository.findById(bbsId)).thenReturn(Optional.of(master));
        when(userService.getUserById(userId)).thenThrow(new RuntimeException("Not Found"));
        when(boardRepository.findMaxSortOrdr(bbsId)).thenReturn(0L);
        when(boardRepository.save(any())).thenReturn(Board.builder().nttId(100L).bbsId(bbsId).build());

        Long nttId = boardService.createPost(userId, request);

        assertThat(nttId).isNotNull();
    }

    @Test
    @DisplayName("답글 등록 테스트 - 사용자 정보 조회 실패 시 익명 처리")
    void replyPost_UserNotFound_Anonymous() {
        String userId = "unknown";
        Long parentId = 10L;
        String bbsId = "BBS_001";
        BoardSaveRequest request = new BoardSaveRequest(bbsId, "Reply", "Content", null, null, null, null, null, null,
                null);
        BoardMaster master = BoardMaster.builder().bbsId(bbsId).build();
        Board parent = Board.builder().nttId(parentId).bbsId(bbsId).sortOrdr(100L).replyLc(0).build();

        when(boardMasterRepository.findById(bbsId)).thenReturn(Optional.of(master));
        when(boardRepository.findById(parentId)).thenReturn(Optional.of(parent));
        when(userService.getUserById(userId)).thenThrow(new RuntimeException("Not Found"));
        when(boardRepository.findMaxNttNo(eq(bbsId), anyLong())).thenReturn(0L);
        when(boardRepository.save(any())).thenReturn(Board.builder().nttId(101L).bbsId(bbsId).build());

        Long nttId = boardService.replyPost(userId, parentId, request);

        assertThat(nttId).isNotNull();
    }

    @Test
    @DisplayName("파일 업로드 시 빈 파일 목록 처리 테스트")
    void createPostWithFiles_EmptyFiles() throws IOException {
        String userId = "user01";
        String bbsId = "BBS_001";
        BoardSaveRequest request = new BoardSaveRequest(bbsId, "Title", "Content", null, null, "EXISTING_ID", null,
                null, null, null);

        when(boardMasterRepository.findById(bbsId)).thenReturn(Optional.of(BoardMaster.builder().bbsId(bbsId).build()));
        when(boardRepository.save(any())).thenReturn(Board.builder().nttId(100L).bbsId(bbsId).build());

        Long nttId = boardService.createPostWithFiles(userId, request, Collections.emptyList());

        assertThat(nttId).isNotNull();
    }

    @Test
    @DisplayName("게시글 상세 조회 시 조회수 증가 테스트")
    void getPostDetail_IncreaseInqireCo() {
        String bbsId = "BBS_001";
        Long nttId = 1L;
        BoardDetailResult detail = mock(BoardDetailResult.class);
        Board board = Board.builder()
                .bbsId(bbsId)
                .nttId(nttId)
                .inqireCo(10)
                .build();

        when(boardRepository.findArticleDetail(nttId)).thenReturn(Optional.of(detail));
        when(boardRepository.findById(nttId)).thenReturn(Optional.of(board));

        boardService.getPostDetail(bbsId, nttId);

        assertThat(board.getInqireCo()).isEqualTo(11);
    }

    @Test
    @DisplayName("게시글 수정 테스트 - 파일 포함 (기존 파일 없음)")
    void updatePostWithFiles_NoExistingFile() throws IOException {
        String bbsId = "BBS_001";
        Long nttId = 1L;
        BoardSaveRequest request = new BoardSaveRequest(bbsId, "Updated", "Updated", null, null, null, null, null,
                null, null);
        List<MultipartFile> files = List.of(mock(MultipartFile.class));
        Board board = Board.builder().bbsId(bbsId).nttId(nttId).build();

        when(boardRepository.findById(nttId)).thenReturn(Optional.of(board));
        when(fileService.uploadFiles(files)).thenReturn("NEW_FILE_ID");

        boardService.updatePostWithFiles(bbsId, nttId, request, files);

        assertThat(board.getAtchFileId()).isEqualTo("NEW_FILE_ID");
        verify(fileService).uploadFiles(files);
    }

    @Test
    @DisplayName("게시글 수정 테스트 - 파일 포함 (기존 파일 있음)")
    void updatePostWithFiles_ExistingFile() throws IOException {
        String bbsId = "BBS_001";
        Long nttId = 1L;
        BoardSaveRequest request = new BoardSaveRequest(bbsId, "Updated", "Updated", null, null, "OLD_FILE_ID", null,
                null, null, null);
        List<MultipartFile> files = List.of(mock(MultipartFile.class));
        Board board = Board.builder().bbsId(bbsId).nttId(nttId).atchFileId("OLD_FILE_ID").build();

        when(boardRepository.findById(nttId)).thenReturn(Optional.of(board));

        boardService.updatePostWithFiles(bbsId, nttId, request, files);

        verify(fileService).updateFiles("OLD_FILE_ID", files);
    }

    @Test
    @DisplayName("답글 등록 시 상위 게시글 미존재 시 예외 발생")
    void replyPost_ParentNotFound() {
        String userId = "user01";
        Long parentId = 999L;
        BoardSaveRequest request = new BoardSaveRequest("BBS_001", "Reply", "Content", null, null, null, null, null,
                null, null);

        when(boardMasterRepository.findById(anyString())).thenReturn(Optional.of(mock(BoardMaster.class)));
        when(boardRepository.findById(parentId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> boardService.replyPost(userId, parentId, request))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.ARTICLE_NOT_FOUND);
    }

    @Test
    @DisplayName("게시글 등록 시 게시판 미존재 시 예외 발생")
    void createPost_BoardNotFound() {
        String userId = "user01";
        BoardSaveRequest request = new BoardSaveRequest("NON_EXIST", "Title", "Content", null, null, null, null, null,
                null, null);

        when(boardMasterRepository.findById("NON_EXIST")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> boardService.createPost(userId, request))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.BOARD_NOT_FOUND);
    }
}
