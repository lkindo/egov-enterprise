package nuri.business.service.board;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.business.domain.user.exception.UserErrorCode;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import nuri.business.domain.board.*;
import nuri.business.service.board.dto.BoardDto;
import nuri.business.service.board.dto.BoardMapperImpl;
import nuri.business.service.board.dto.BoardSaveRequest;
import nuri.business.service.board.dto.BoardStatsResponse;
import nuri.business.service.board.event.PostCreatedEvent;
import nuri.business.service.file.EgovFileService;
import nuri.foundation.core.exception.BusinessException;
import nuri.business.service.user.EgovUserService;
import nuri.business.service.user.dto.UserDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import java.util.Collections;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

import java.io.IOException;

@org.junit.jupiter.api.extension.ExtendWith(org.mockito.junit.jupiter.MockitoExtension.class)
class BoardServiceTest {

    private BoardService boardService;
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
    private MeterRegistry meterRegistry;
    @Mock
    private BoardViewCountService viewCountService;
    @Mock
    private Timer timer;
    @Mock
    private Timer.Sample sample;

    private MockedStatic<nuri.business.security.util.SecurityUtil> securityUtilMock;

    @org.junit.jupiter.api.BeforeEach
    void setUp() {
        securityUtilMock = mockStatic(nuri.business.security.util.SecurityUtil.class);
        securityUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasRole(anyString())).thenReturn(false);
        meterRegistry = new io.micrometer.core.instrument.simple.SimpleMeterRegistry();
        boardService = new BoardService(
                boardRepository,
                boardMasterRepository,
                userService,
                fileService,
                eventPublisher,
                meterRegistry,
                viewCountService,
                new BoardMapperImpl());
    }

    @org.junit.jupiter.api.AfterEach
    void tearDown() {
        securityUtilMock.close();
    }

    @Test
    @DisplayName("게시글 목록 조회")
    void getBoardPosts() {
        // given
        String bbsId = "BBS_01";
        Pageable pageable = PageRequest.of(0, 10);
        BoardMaster master = BoardMaster.builder().bbsId(bbsId).build();
        BoardSearchResult resultItem = BoardSearchResult.builder().pstId("1").build();
        Page<BoardSearchResult> page = new PageImpl<>(Collections.singletonList(resultItem));

        given(boardMasterRepository.findById(bbsId)).willReturn(Optional.of(master));
        given(boardRepository.searchArticles(any(BoardSearchCondition.class), eq(pageable))).willReturn(page);

        // when
        Page<BoardDto> result = boardService.getBoardPosts(bbsId, pageable);

        // then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).pstId()).isEqualTo("1");
    }

    @Test
    @DisplayName("게시글 수정 - 관리자가 아니지만 본인인 경우")
    void updateBoard_Self_Success() {
        securityUtilMock.when(() -> nuri.business.security.util.SecurityUtil.getCurrentEsntlId()).thenReturn(Optional.of("user1"));
        securityUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(false);

        Board board = mock(Board.class);
        given(board.getUserId()).willReturn("user1");
        given(boardRepository.findById("1")).willReturn(Optional.of(board));
        
        BoardSaveRequest updateDto = new BoardSaveRequest(
            "BBS1", "update", "content", null, null, null, null, null, null, null, null, null, null, null
        );

        boardService.updatePost("BBS1", "1", updateDto);
        // board.update(...) gets called with fallbacks
        verify(board).update(any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("게시글 수정 - 타인이며 관리자도 아닌 경우 예외")
    void updateBoard_Fail_NoAuth() {
        securityUtilMock.when(() -> nuri.business.security.util.SecurityUtil.getCurrentEsntlId()).thenReturn(Optional.of("user2"));
        securityUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(false);

        Board board = mock(Board.class);
        given(board.getUserId()).willReturn("user1");
        given(boardRepository.findById("1")).willReturn(Optional.of(board));

        BoardSaveRequest req = new BoardSaveRequest("BBS1", "title", "content", null, null, null, null, null, null, null, null, null, null, null);
        assertThrows(BusinessException.class, () -> boardService.updatePost("BBS1", "1", req));
    }

    @Test
    @DisplayName("게시글 삭제 - 타인이며 관리자도 아닌 경우 예외")
    void deleteBoard_Fail_NoAuth() {
        securityUtilMock.when(() -> nuri.business.security.util.SecurityUtil.getCurrentEsntlId()).thenReturn(Optional.of("user2"));
        securityUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(false);

        Board board = mock(Board.class);
        given(board.getUserId()).willReturn("user1");
        given(boardRepository.findById("1")).willReturn(Optional.of(board));

        assertThrows(BusinessException.class, () -> boardService.deletePost("BBS1", "1", "user2"));
    }



    @Test
    @DisplayName("게시판 통계 조회")
    void getBoardStats() {
        // given
        String bbsId = "BBS_01";
        given(boardRepository.countByBbsIdAndUseYn(bbsId, "Y")).willReturn(10L);
        given(boardRepository.sumInqCntByBbsIdAndUseYn(bbsId, "Y")).willReturn(100L);
        given(boardRepository.findTopContributorByBbsIdAndUseYn(bbsId, "Y")).willReturn("user1");

        // when
        BoardStatsResponse result = boardService.getBoardStats(bbsId);

        // then
        assertThat(result.getTotalArticles()).isEqualTo(10L);
        assertThat(result.getTotalViews()).isEqualTo(100L);
        assertThat(result.getTopContributor()).isEqualTo("user1");
        // (10 * 2) + 70 = 90
        assertThat(result.getIntelligenceScore()).isEqualTo(90);
    }

    @Test
    @DisplayName("게시글 생성")
    void createPost() {
        // given
        String userId = "user1";
        BoardSaveRequest request = new BoardSaveRequest("BBS_01", "Subject", "Content", null, null, null, null, null, null, null, null, null, null, null);
        BoardMaster master = BoardMaster.builder().bbsId("BBS_01").build();
        UserDto user = UserDto.builder().userId(userId).userNm("Tester").build();

        given(boardMasterRepository.findByIdWithPessimisticLock("BBS_01")).willReturn(Optional.of(master));
        given(userService.getUserById(userId)).willReturn(user);
        given(boardRepository.findMaxSortOrdr("BBS_01")).willReturn(0L);
        given(boardRepository.getNextPstId()).willReturn(1L);
        given(boardRepository.save(any(Board.class))).willAnswer(invocation -> invocation.getArgument(0));

        // when
        String pstId = boardService.createPost(userId, request);

        // then
        assertThat(pstId).isEqualTo("1");
        verify(eventPublisher, times(1)).publishEvent(any(PostCreatedEvent.class));
    }

    @Test
    @DisplayName("답글 생성")
    void replyPost() {
        // given
        String userId = "user1";
        String parentId = "1";
        BoardSaveRequest request = new BoardSaveRequest("BBS_01", "Reply", "Content", null, null, null, null, null, null, null, null, null, null, null);
        BoardMaster master = BoardMaster.builder().bbsId("BBS_01").build();
        Board parent = Board.builder().pstId(parentId).sortOrdr(100L).ansLv(0).build();
        UserDto user = UserDto.builder().userId(userId).userNm("Tester").build();

        given(boardMasterRepository.findByIdWithPessimisticLock("BBS_01")).willReturn(Optional.of(master));
        given(boardRepository.findById(parentId)).willReturn(Optional.of(parent));
        given(userService.getUserById(userId)).willReturn(user);
        given(boardRepository.findMaxAnsSn("BBS_01", 100L)).willReturn(0L);
        given(boardRepository.save(any(Board.class))).willAnswer(invocation -> invocation.getArgument(0));

        // when
        String pstId = boardService.replyPost(userId, parentId, request);

        // then
        assertThat(pstId).isNotBlank();
    }

    @Test
    @DisplayName("게시글 상세 조회")
    void getPostDetail() {
        // given
        String bbsId = "BBS_01";
        String pstId = "1";
        BoardDetailResult detail = BoardDetailResult.builder()
                .pstId(pstId)
                .bbsId(bbsId)
                .build();

        given(boardRepository.findArticleDetail(pstId)).willReturn(Optional.of(detail));

        // when
        BoardDto result = boardService.getPostDetail(bbsId, pstId);

        // then
        assertThat(result.pstId()).isEqualTo(pstId);
        verify(viewCountService).increaseViewCount(pstId);
    }

    @Test
    @DisplayName("게시글 수정")
    void updatePost() {
        // given
        String bbsId = "BBS_01";
        String pstId = "1";
        String userId = "user1";
        BoardSaveRequest request = new BoardSaveRequest(bbsId, "Updated", "Content", null, null, null, null, null, null, null, null, null, null, null);
        Board board = Board.builder().pstId(pstId).pstTtl("Old").userId(userId).build();

        given(boardRepository.findById(pstId)).willReturn(Optional.of(board));
        securityUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of(userId));

        // when
        boardService.updatePost(bbsId, pstId, request);

        // then
        assertThat(board.getPstTtl()).isEqualTo("Updated");
    }

    @Test
    @DisplayName("게시글 삭제")
    void deletePost() {
        // given
        String bbsId = "BBS_01";
        String pstId = "1";
        String userId = "user1";
        Board board = Board.builder().pstId(pstId).useYn("Y").userId(userId).build();

        given(boardRepository.findById(pstId)).willReturn(Optional.of(board));
        securityUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of(userId));

        // when
        boardService.deletePost(bbsId, pstId, "user1");

        // then
        assertThat(board.getUseYn()).isEqualTo("N");
    }

    @Test
    @DisplayName("추천수 증가")
    void incrementLike() {
        // given
        String bbsId = "BBS_01";
        String pstId = "1";
        Board board = Board.builder().pstId(pstId).likeCnt(0).build();

        given(boardRepository.findByPstIdWithPessimisticLock(pstId)).willReturn(Optional.of(board));

        // when
        Integer result = boardService.incrementLike(bbsId, pstId);

        // then
        assertThat(result).isEqualTo(1);
        assertThat(board.getLikeCnt()).isEqualTo(1);
    }

    @Test
    @DisplayName("날짜 검색 조건이 포함된 게시글 목록 조회")
    void getBoardPosts_WithDates() {
        // given
        String bbsId = "BBS_01";
        Pageable pageable = PageRequest.of(0, 10);
        BoardMaster master = BoardMaster.builder().bbsId(bbsId).build();
        given(boardMasterRepository.findById(bbsId)).willReturn(Optional.of(master));
        given(boardRepository.searchArticles(any(), any())).willReturn(Page.empty());

        // when
        boardService.getBoardPosts(bbsId, "0", "word", "regDate", "2023-01-01", "2023-12-31", null, null, pageable);

        // then
        verify(boardRepository)
                .searchArticles(argThat(cond -> cond.getStartDate() != null && cond.getEndDate() != null), any());
    }

    @Test
    @DisplayName("잘못된 날짜 형식이 포함된 게시글 목록 조회 (예외 처리 확인)")
    void getBoardPosts_InvalidDates() {
        // given
        String bbsId = "BBS_01";
        Pageable pageable = PageRequest.of(0, 10);
        BoardMaster master = BoardMaster.builder().bbsId(bbsId).build();
        given(boardMasterRepository.findById(bbsId)).willReturn(Optional.of(master));
        given(boardRepository.searchArticles(any(), any())).willReturn(Page.empty());

        // when
        boardService.getBoardPosts(bbsId, "0", "word", "regDate", "invalid-date", "invalid-date", null, null, pageable);

        // then
        verify(boardRepository)
                .searchArticles(argThat(cond -> cond.getStartDate() == null && cond.getEndDate() == null), any());
    }

    @Test
    @DisplayName("작성자를 찾을 수 없는 경우 익명으로 게시글 생성")
    void createPost_UserNotFound() {
        // given
        String userId = "unknown";
        BoardSaveRequest request = new BoardSaveRequest("BBS_01", "Subj", "Cont", null, null, null, null, null, null, null, null, null, null, null);
        BoardMaster master = BoardMaster.builder().bbsId("BBS_01").build();

        given(boardMasterRepository.findByIdWithPessimisticLock("BBS_01")).willReturn(Optional.of(master));
        given(userService.getUserById(userId)).willThrow(new BusinessException(UserErrorCode.USER_NOT_FOUND));
        given(boardRepository.findMaxSortOrdr("BBS_01")).willReturn(0L);
        given(boardRepository.getNextPstId()).willReturn(1L);
        given(boardRepository.save(any(Board.class))).willAnswer(invocation -> invocation.getArgument(0));

        // when
        String pstId = boardService.createPost(userId, request);

        // then
        assertThat(pstId).isEqualTo("1");
        verify(boardRepository).save(argThat(b -> "unknown".equals(b.getUserId()) && "익명".equals(b.getUserNm())));
    }

    @Test
    @DisplayName("사용자 조회 중 예외 발생 시 익명으로 게시글 생성")
    void createPost_UserError() {
        // given
        String userId = "errorUser";
        BoardSaveRequest request = new BoardSaveRequest("BBS_01", "Subj", "Cont", null, null, null, null, null, null, null, null, null, null, null);
        BoardMaster master = BoardMaster.builder().bbsId("BBS_01").build();

        given(boardMasterRepository.findByIdWithPessimisticLock("BBS_01")).willReturn(Optional.of(master));
        given(userService.getUserById(userId)).willThrow(new RuntimeException("DB Error"));
        given(boardRepository.findMaxSortOrdr("BBS_01")).willReturn(0L);
        given(boardRepository.getNextPstId()).willReturn(1L);
        given(boardRepository.save(any(Board.class))).willAnswer(invocation -> invocation.getArgument(0));

        // when
        String pstId = boardService.createPost(userId, request);

        // then
        assertThat(pstId).isEqualTo("1");
        verify(boardRepository).save(argThat(b -> "errorUser".equals(b.getUserId()) && "익명".equals(b.getUserNm())));
    }

    @Test
    @DisplayName("요청 본문의 작성자 정보(userId/userNm)는 무시되고 인증 주체로 저장 — 저자 위조 방지")
    void createPost_IgnoresClientProvidedAuthor() {
        // given — 클라이언트가 저자 위조를 시도(customId/customNm)해도 무시되어야 한다.
        String userId = "user1";
        BoardSaveRequest request = new BoardSaveRequest("BBS_01", "Subj", "Cont", null, null, null, null, null, null, null, null, "customId", "customNm", null);
        BoardMaster master = BoardMaster.builder().bbsId("BBS_01").build();
        UserDto author = UserDto.builder().userId(userId).userNm("실제작성자").build();

        given(boardMasterRepository.findByIdWithPessimisticLock("BBS_01")).willReturn(Optional.of(master));
        given(userService.getUserById(userId)).willReturn(author);
        given(boardRepository.findMaxSortOrdr("BBS_01")).willReturn(0L);
        given(boardRepository.getNextPstId()).willReturn(1L);
        given(boardRepository.save(any(Board.class))).willAnswer(invocation -> invocation.getArgument(0));

        // when
        boardService.createPost(userId, request);

        // then — request 의 customId/customNm 은 무시되고 인증 userId + 조회한 저자명으로 저장
        verify(boardRepository).save(argThat(b -> "user1".equals(b.getUserId()) && "실제작성자".equals(b.getUserNm())));
    }

    @Test
    @DisplayName("파일을 포함하여 게시글 생성")
    void createPostWithFiles() throws IOException {
        // given
        String userId = "user1";
        BoardSaveRequest request = new BoardSaveRequest("BBS_01", "Subj", "Cont", null, null, null, null, null, null, null, null, null, null, null);
        org.springframework.web.multipart.MultipartFile file = mock(
                org.springframework.web.multipart.MultipartFile.class);
        java.util.List<org.springframework.web.multipart.MultipartFile> files = java.util.Collections
                .singletonList(file);

        BoardMaster master = BoardMaster.builder().bbsId("BBS_01").build();
        given(boardMasterRepository.findByIdWithPessimisticLock("BBS_01")).willReturn(Optional.of(master));
        given(fileService.uploadFiles(files)).willReturn("ATCH_001");
        given(boardRepository.getNextPstId()).willReturn(1L);
        given(boardRepository.save(any(Board.class))).willAnswer(invocation -> invocation.getArgument(0));

        // when
        boardService.createPostWithFiles(userId, request, files);

        // then
        verify(fileService).uploadFiles(files);
        verify(boardRepository).save(argThat(b -> "ATCH_001".equals(b.getAtchFileId())));
    }

    @Test
    @DisplayName("작성자를 찾을 수 없는 경우 익명으로 답글 생성")
    void replyPost_UserNotFound() {
        // given
        String userId = "unknown";
        String parentId = "1";
        BoardSaveRequest request = new BoardSaveRequest("BBS_01", "Reply", "Cont", null, null, null, null, null, null, null, null, null, null, null);
        BoardMaster master = BoardMaster.builder().bbsId("BBS_01").build();
        Board parent = Board.builder().pstId(parentId).sortOrdr(100L).ansLv(0).build();

        given(boardMasterRepository.findByIdWithPessimisticLock("BBS_01")).willReturn(Optional.of(master));
        given(boardRepository.findById(parentId)).willReturn(Optional.of(parent));
        given(userService.getUserById(userId)).willThrow(new BusinessException(UserErrorCode.USER_NOT_FOUND));
        given(boardRepository.findMaxAnsSn(any(), any())).willReturn(0L);
        given(boardRepository.save(any(Board.class))).willAnswer(invocation -> invocation.getArgument(0));

        // when
        boardService.replyPost(userId, parentId, request);

        // then
        verify(boardRepository).save(argThat(b -> "unknown".equals(b.getUserId()) && "익명".equals(b.getUserNm())));
    }

    @Test
    @DisplayName("파일을 포함하여 답글 생성")
    void replyPostWithFiles() throws IOException {
        // given
        String userId = "user1";
        String parentId = "1";
        BoardSaveRequest request = new BoardSaveRequest("BBS_01", "Reply", "Cont", null, null, null, null, null, null, null, null, null, null, null);
        org.springframework.web.multipart.MultipartFile file = mock(
                org.springframework.web.multipart.MultipartFile.class);
        java.util.List<org.springframework.web.multipart.MultipartFile> files = java.util.Collections
                .singletonList(file);

        BoardMaster master = BoardMaster.builder().bbsId("BBS_01").build();
        Board parent = Board.builder().pstId(parentId).sortOrdr(100L).ansLv(0).build();
        given(boardMasterRepository.findByIdWithPessimisticLock("BBS_01")).willReturn(Optional.of(master));
        given(boardRepository.findById(parentId)).willReturn(Optional.of(parent));
        given(fileService.uploadFiles(files)).willReturn("ATCH_001");
        given(boardRepository.save(any(Board.class))).willAnswer(invocation -> invocation.getArgument(0));

        // when
        boardService.replyPostWithFiles(userId, parentId, request, files);

        // then
        verify(fileService).uploadFiles(files);
    }

    @Test
    @DisplayName("행사 날짜가 포함된 게시글 수정")
    void updatePost_WithEventDate() {
        // given
        String bbsId = "BBS_01";
        String pstId = "1";
        String eventDateStr = "2023-12-25T10:00:00";
        String userId = "user1";
        BoardSaveRequest request = new BoardSaveRequest(bbsId, "Upd", "Cont", null, null, null, eventDateStr, null, null, null, null, null, null, null);
        Board board = org.mockito.Mockito.spy(Board.builder().pstId(pstId).userId(userId).build());
        given(boardRepository.findById(pstId)).willReturn(Optional.of(board));
        securityUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of(userId));

        // when
        boardService.updatePost(bbsId, pstId, request);

        // then
        verify(board).update(any(), any(), any(), any(), any(), any(), any(), any(),
                eq(java.time.LocalDateTime.parse(eventDateStr)), any(), any(), any());
    }

    @Test
    @DisplayName("잘못된 행사 날짜 형식이 포함된 게시글 수정 (예외 처리 확인)")
    void updatePost_InvalidEventDate() {
        // given
        String bbsId = "BBS_01";
        String pstId = "1";
        String userId = "user1";
        BoardSaveRequest request = new BoardSaveRequest(bbsId, "Upd", "Cont", null, null, null, "invalid-date", null, null, null, null, null, null, null);
        Board board = org.mockito.Mockito.spy(Board.builder().pstId(pstId).userId(userId).build());
        given(boardRepository.findById(pstId)).willReturn(Optional.of(board));
        securityUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of(userId));

        // when
        boardService.updatePost(bbsId, pstId, request);

        // then
        verify(board).update(any(), any(), any(), any(), any(), any(), any(), any(), isNull(), any(), any(), any());
    }

    @Test
    @DisplayName("새 파일을 업로드하며 게시글 수정 (첨부파일 ID 없음)")
    void updatePostWithFiles_NewFiles() throws IOException {
        // given
        String bbsId = "BBS_01";
        String pstId = "1";
        BoardSaveRequest request = new BoardSaveRequest(bbsId, "Upd", "Cont", null, null, null, null, null, null, null,
                null, null, null, null);
        org.springframework.web.multipart.MultipartFile file = mock(
                org.springframework.web.multipart.MultipartFile.class);
        java.util.List<org.springframework.web.multipart.MultipartFile> files = java.util.Collections
                .singletonList(file);

        Board board = Board.builder().pstId(pstId).userId("user1").build();
        given(boardRepository.findById(pstId)).willReturn(Optional.of(board));
        securityUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of("user1"));
        given(fileService.uploadFiles(files)).willReturn("NEW_ATCH_001");

        // when
        boardService.updatePostWithFiles(bbsId, pstId, request, files);

        // then
        verify(fileService).uploadFiles(files);
        assertThat(board.getAtchFileId()).isEqualTo("NEW_ATCH_001");
    }

    @Test
    @DisplayName("기존 파일을 갱신하며 게시글 수정 (첨부파일 ID 존재)")
    void updatePostWithFiles_ExistingFiles() throws IOException {
        // given
        String bbsId = "BBS_01";
        String pstId = "1";
        String atchFileId = "OLD_ATCH_001";
        BoardSaveRequest request = new BoardSaveRequest(bbsId, "Upd", "Cont", null, null, atchFileId, null, null, null, null, null, null, null, null);
        org.springframework.web.multipart.MultipartFile file = mock(
                org.springframework.web.multipart.MultipartFile.class);
        java.util.List<org.springframework.web.multipart.MultipartFile> files = java.util.Collections
                .singletonList(file);

        Board board = Board.builder().pstId(pstId).userId("user1").build();
        given(boardRepository.findById(pstId)).willReturn(Optional.of(board));
        securityUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of("user1"));

        // when
        boardService.updatePostWithFiles(bbsId, pstId, request, files);

        // then
        verify(fileService).updateFiles(eq(atchFileId), eq(files));
    }

    @Test
    @DisplayName("기여자가 없는 경우 시스템으로 게시판 통계 조회")
    void getBoardStats_SystemContributor() {
        // given
        String bbsId = "BBS_01";
        given(boardRepository.countByBbsIdAndUseYn(bbsId, "Y")).willReturn(0L);
        given(boardRepository.sumInqCntByBbsIdAndUseYn(bbsId, "Y")).willReturn(0L);
        given(boardRepository.findTopContributorByBbsIdAndUseYn(bbsId, "Y")).willReturn(null);

        // when
        BoardStatsResponse result = boardService.getBoardStats(bbsId);

        // then
        assertThat(result.getTopContributor()).isEqualTo("System");
    }

    @Test
    @DisplayName("존재하지 않는 게시글 조회 시 예외 발생")
    void getPostDetail_NotFound() {
        // given
        given(boardRepository.findArticleDetail(anyString())).willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> boardService.getPostDetail("BBS_01", "999"))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("게시글 수정 - 작성자 본인이 아니고 관리자도 아니면 접근 거부")
    void updatePost_AccessDenied() {
        String pstId = "1";
        Board board = Board.builder().pstId(pstId).userId("owner").build();
        given(boardRepository.findById(pstId)).willReturn(Optional.of(board));
        securityUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of("other_user"));

        BoardSaveRequest request = new BoardSaveRequest("BBS_01", "Upd", "Cont", null, null, null, null, null, null, null, null, null, null, null);

        assertThatThrownBy(() -> boardService.updatePost("BBS_01", pstId, request))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
    }

    @Test
    @DisplayName("게시글 삭제 - 작성자 본인이 아니고 관리자도 아니면 접근 거부")
    void deletePost_AccessDenied() {
        String pstId = "1";
        Board board = Board.builder().pstId(pstId).userId("owner").build();
        given(boardRepository.findById(pstId)).willReturn(Optional.of(board));
        securityUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of("other_user"));

        assertThatThrownBy(() -> boardService.deletePost("BBS_01", pstId, "other_user"))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
    }

    @Test
    @DisplayName("파일 업로드 메서드에서 files가 null 이거나 비어있을 때")
    void fileUploadMethods_EmptyFiles() throws IOException {
        String userId = "user1";
        BoardSaveRequest request = new BoardSaveRequest("BBS_01", "Subj", "Cont", null, null, "OLD_ATCH", null, null, null, null, null, null, null, null);
        BoardMaster master = BoardMaster.builder().bbsId("BBS_01").build();
        
        // create
        given(boardMasterRepository.findByIdWithPessimisticLock("BBS_01")).willReturn(Optional.of(master));
        given(boardRepository.getNextPstId()).willReturn(1L);
        given(boardRepository.save(any(Board.class))).willAnswer(invocation -> invocation.getArgument(0));
        
        boardService.createPostWithFiles(userId, request, null);
        boardService.createPostWithFiles(userId, request, Collections.emptyList());
        
        // update
        Board board = Board.builder().pstId("1").userId(userId).build();
        given(boardRepository.findById("1")).willReturn(Optional.of(board));
        securityUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of(userId));
        
        boardService.updatePostWithFiles("BBS_01", "1", request, null);
        boardService.updatePostWithFiles("BBS_01", "1", request, Collections.emptyList());

        // reply
        Board parent = Board.builder().pstId("1").sortOrdr(100L).ansLv(0).build();
        given(boardRepository.findById("1")).willReturn(Optional.of(parent));
        
        boardService.replyPostWithFiles(userId, "1", request, null);
        boardService.replyPostWithFiles(userId, "1", request, Collections.emptyList());

        verify(fileService, never()).uploadFiles(any());
        verify(fileService, never()).updateFiles(any(), any());
    }
}
