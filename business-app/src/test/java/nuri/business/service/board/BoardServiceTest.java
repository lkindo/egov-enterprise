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
import nuri.business.service.file.FileService;
import nuri.foundation.core.exception.BusinessException;
import nuri.business.service.user.UserService;
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
    private UserService userService;
    @Mock
    private FileService fileService;
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
        securityUtilMock = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS);
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
    @DisplayName("게시글 목록 조회 - 검색 조건이 하나도 누락되지 않고 리포지토리까지 전달된다")
    void getBoardPosts_passesAllSearchCriteria() {
        String bbsId = "BBS_01";
        Pageable pageable = PageRequest.of(0, 10);
        given(boardMasterRepository.findById(bbsId))
                .willReturn(Optional.of(BoardMaster.builder().bbsId(bbsId).build()));

        org.mockito.ArgumentCaptor<BoardSearchCondition> captor =
                org.mockito.ArgumentCaptor.forClass(BoardSearchCondition.class);
        given(boardRepository.searchArticles(captor.capture(), eq(pageable)))
                .willReturn(new PageImpl<BoardSearchResult>(Collections.emptyList()));

        boardService.getBoardPosts(bbsId, "0", "공지", "views", "2026-01-01", "2026-12-31", "R", "CAT1", pageable);

        // 한 항목이라도 전달이 끊기면 사용자가 건 필터가 조용히 무시된 채 전체 목록이 반환된다.
        BoardSearchCondition cond = captor.getValue();
        assertThat(cond.getBbsId()).isEqualTo(bbsId);
        assertThat(cond.getUseYn()).isEqualTo("Y"); // 삭제글 노출 방지
        assertThat(cond.getSearchCnd()).isEqualTo("0");
        assertThat(cond.getSearchWrd()).isEqualTo("공지");
        assertThat(cond.getOrderBy()).isEqualTo("views");
        assertThat(cond.getQnaSttsCd()).isEqualTo("R");
        assertThat(cond.getQnaCatCd()).isEqualTo("CAT1");
        // 종료일은 그날 자정이 아니라 하루 끝까지 포함해야 당일 글이 누락되지 않는다.
        assertThat(cond.getStartDate()).isEqualTo(java.time.LocalDate.of(2026, 1, 1).atStartOfDay());
        assertThat(cond.getEndDate()).isEqualTo(java.time.LocalDate.of(2026, 12, 31).atTime(java.time.LocalTime.MAX));
    }

    @Test
    @DisplayName("게시글 목록 조회 - 역전된 기간은 조회 전에 거부한다")
    void getBoardPosts_rejectsInvertedDateRange() {
        String bbsId = "BBS_01";
        Pageable pageable = PageRequest.of(0, 10);
        given(boardMasterRepository.findById(bbsId))
                .willReturn(Optional.of(BoardMaster.builder().bbsId(bbsId).build()));

        // 검증이 빠지면 항상 0건이 반환돼 "글이 없다" 는 오해를 유발한다.
        assertThatThrownBy(() -> boardService.getBoardPosts(
                bbsId, null, null, null, "2026-12-31", "2026-01-01", null, null, pageable))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);

        verify(boardRepository, never()).searchArticles(any(BoardSearchCondition.class), any(Pageable.class));
    }

    @Test
    @DisplayName("게시글 목록 조회(검색어 오버로드) - 기간·정렬 없이도 검색어가 전달된다")
    void getBoardPosts_keywordOverloadDelegates() {
        String bbsId = "BBS_01";
        Pageable pageable = PageRequest.of(0, 10);
        given(boardMasterRepository.findById(bbsId))
                .willReturn(Optional.of(BoardMaster.builder().bbsId(bbsId).build()));

        org.mockito.ArgumentCaptor<BoardSearchCondition> captor =
                org.mockito.ArgumentCaptor.forClass(BoardSearchCondition.class);
        given(boardRepository.searchArticles(captor.capture(), eq(pageable)))
                .willReturn(new PageImpl<>(Collections.singletonList(
                        BoardSearchResult.builder().pstId("1").build())));

        Page<BoardDto> result = boardService.getBoardPosts(bbsId, "0", "공지", pageable);

        assertThat(result.getContent()).hasSize(1);
        assertThat(captor.getValue().getSearchWrd()).isEqualTo("공지");
        assertThat(captor.getValue().getOrderBy()).isNull();
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
            "BBS1", "update", "content", null, null, null, null, null, null, null, null, null
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

        BoardSaveRequest req = new BoardSaveRequest("BBS1", "title", "content", null, null, null, null, null, null, null, null, null);
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
        BoardSaveRequest request = new BoardSaveRequest("BBS_01", "Subject", "Content", null, null, null, null, null, null, null, null, null);
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
        BoardSaveRequest request = new BoardSaveRequest("BBS_01", "Reply", "Content", null, null, null, null, null, null, null, null, null);
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

    /** BoardSaveRequest(bbsId, pstTtl, pstCn, pstBgngYmd, pstEndYmd, atchFileId, evntDt, qnaSttsCd, qnaCatCd, scrtYn, useYn, pswd) */
    private BoardSaveRequest saveRequest(String evntDt, String qnaSttsCd, String useYn) {
        return new BoardSaveRequest("BBS_01", "Subject", "Content", null, null, null,
                evntDt, qnaSttsCd, null, null, useYn, null);
    }

    private Board captureSavedBoard() {
        org.mockito.ArgumentCaptor<Board> captor = org.mockito.ArgumentCaptor.forClass(Board.class);
        verify(boardRepository).save(captor.capture());
        return captor.getValue();
    }

    private void givenCreatePostContext(long maxSortOrdr) {
        given(boardMasterRepository.findByIdWithPessimisticLock("BBS_01"))
                .willReturn(Optional.of(BoardMaster.builder().bbsId("BBS_01").build()));
        given(userService.getUserById("user1")).willReturn(UserDto.builder().userId("user1").userNm("Tester").build());
        given(boardRepository.findMaxSortOrdr("BBS_01")).willReturn(maxSortOrdr);
        given(boardRepository.getNextPstId()).willReturn(1L);
        given(boardRepository.save(any(Board.class))).willAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    @DisplayName("게시글 생성 - 정렬순서는 현재 최대값 다음이고, 미전송 플래그는 기본값을 쓴다")
    void createPost_appliesDefaultsAndNextSortOrder() {
        givenCreatePostContext(7L);

        boardService.createPost("user1", saveRequest(null, null, null));

        Board saved = captureSavedBoard();
        // 최대값을 그대로 쓰면(+1 누락) 기존 글과 정렬순서가 충돌해 목록 순서가 뒤섞인다.
        assertThat(saved.getSortOrdr()).isEqualTo(8L);
        assertThat(saved.getUseYn()).isEqualTo("Y");       // 미전송 시 노출이 기본
        assertThat(saved.getQnaSttsCd()).isEqualTo("OPEN"); // 미전송 시 미해결이 기본
    }

    @Test
    @DisplayName("게시글 생성 - 전송된 플래그는 기본값을 덮어쓴다")
    void createPost_honorsExplicitFlags() {
        givenCreatePostContext(0L);

        boardService.createPost("user1", saveRequest(null, "SOLVED", "N"));

        Board saved = captureSavedBoard();
        assertThat(saved.getUseYn()).isEqualTo("N");
        assertThat(saved.getQnaSttsCd()).isEqualTo("SOLVED");
    }

    @Test
    @DisplayName("게시글 생성 - 행사일자(날짜만)는 그날 0시로 해석한다")
    void createPost_parsesDateOnlyEventDate() {
        givenCreatePostContext(0L);

        boardService.createPost("user1", saveRequest("2026-03-01", null, null));

        assertThat(captureSavedBoard().getEvntDt())
                .isEqualTo(java.time.LocalDate.of(2026, 3, 1).atStartOfDay());
    }

    @Test
    @DisplayName("게시글 생성 - 행사일자(시각 포함)는 시각까지 보존한다")
    void createPost_parsesDateTimeEventDate() {
        givenCreatePostContext(0L);

        boardService.createPost("user1", saveRequest("2026-03-01T09:30:00", null, null));

        assertThat(captureSavedBoard().getEvntDt())
                .isEqualTo(java.time.LocalDateTime.of(2026, 3, 1, 9, 30, 0));
    }

    @Test
    @DisplayName("게시글 생성 - 행사일자가 없거나 형식이 깨졌으면 null 로 두고 등록은 계속한다")
    void createPost_tolerplatesMissingOrMalformedEventDate() {
        givenCreatePostContext(0L);

        boardService.createPost("user1", saveRequest(null, null, null));
        assertThat(captureSavedBoard().getEvntDt()).isNull();

        // 형식 오류로 등록 자체가 실패하면 사용자는 원인을 알 수 없는 500 을 만난다.
        reset(boardRepository);
        givenCreatePostContext(0L);
        boardService.createPost("user1", saveRequest("2026/03/01 아무거나", null, null));
        assertThat(captureSavedBoard().getEvntDt()).isNull();
    }

    @Test
    @DisplayName("답글 생성 - 답변순번은 형제 최대값 다음이고, 부모/기본 플래그가 정확히 설정된다")
    void replyPost_appliesDefaultsAndNextAnswerSeq() {
        String parentId = "1";
        Board parent = Board.builder().pstId(parentId).sortOrdr(100L).ansLv(0).build();
        given(boardMasterRepository.findByIdWithPessimisticLock("BBS_01"))
                .willReturn(Optional.of(BoardMaster.builder().bbsId("BBS_01").build()));
        given(boardRepository.findById(parentId)).willReturn(Optional.of(parent));
        given(userService.getUserById("user1")).willReturn(UserDto.builder().userId("user1").userNm("Tester").build());
        given(boardRepository.findMaxAnsSn("BBS_01", 100L)).willReturn(3L);
        given(boardRepository.getNextPstId()).willReturn(9L);
        given(boardRepository.save(any(Board.class))).willAnswer(invocation -> invocation.getArgument(0));

        boardService.replyPost("user1", parentId, saveRequest(null, null, null));

        Board saved = captureSavedBoard();
        // +1 이 빠지면 형제 답글과 순번이 겹쳐 스레드 정렬이 깨진다.
        assertThat(saved.getAnsSn()).isEqualTo(4L);
        assertThat(saved.getUpPstId()).isEqualTo(parentId);
        assertThat(saved.getUseYn()).isEqualTo("Y");
        assertThat(saved.getQnaSttsCd()).isEqualTo("OPEN");
        // 답글도 원글과 동일하게 알림 이벤트를 발행해야 한다(커밋 후 발행).
        verify(eventPublisher, times(1)).publishEvent(any(PostCreatedEvent.class));
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
        BoardSaveRequest request = new BoardSaveRequest(bbsId, "Updated", "Content", null, null, null, null, null, null, null, null, null);
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
    @DisplayName("[W1-17] 추천수 증가는 원자 UPDATE 로 처리하고 version 을 올리지 않는다")
    void incrementLike() {
        // given
        String bbsId = "BBS_01";
        String pstId = "1";
        Board updated = Board.builder().pstId(pstId).likeCnt(1).build();

        // 종전에는 비관적 락으로 엔티티를 잡고 필드를 증가시켰다. 유실은 없었지만 저장이 @Version 을
        // 올려, 인기글 편집자가 아무도 고치지 않았는데 409 를 받았다(조회수와 같은 뿌리).
        given(boardRepository.incrementLikeCntAtomic(pstId)).willReturn(1);
        given(boardRepository.findById(pstId)).willReturn(Optional.of(updated));

        // when
        Integer result = boardService.incrementLike(bbsId, pstId);

        // then
        assertThat(result).isEqualTo(1);
        verify(boardRepository, times(1)).incrementLikeCntAtomic(pstId);
        // 행 락을 잡지 않는다 — 같은 글의 좋아요가 더 이상 직렬화되지 않는다.
        verify(boardRepository, never()).findByPstIdWithPessimisticLock(anyString());
    }

    @Test
    @DisplayName("[W1-17] 존재하지 않는 게시글의 추천은 404 로 거부한다")
    void incrementLike_notFound() {
        given(boardRepository.incrementLikeCntAtomic("nope")).willReturn(0);

        assertThatThrownBy(() -> boardService.incrementLike("BBS_01", "nope"))
                .isInstanceOf(BusinessException.class);
        verify(boardRepository, never()).findById(anyString());
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
        BoardSaveRequest request = new BoardSaveRequest("BBS_01", "Subj", "Cont", null, null, null, null, null, null, null, null, null);
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
        BoardSaveRequest request = new BoardSaveRequest("BBS_01", "Subj", "Cont", null, null, null, null, null, null, null, null, null);
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
    @DisplayName("작성자는 인증 주체(userId)+조회한 저자명으로 저장 — 요청 DTO에 저자 필드 없음(타입수준 위조 차단)")
    void createPost_AuthorFromAuthenticatedPrincipal() {
        // given — 요청 DTO(BoardSaveRequest)에서 userId/userNm 필드를 제거해 클라이언트가 저자를 지정할 방법 자체가 없다.
        String userId = "user1";
        BoardSaveRequest request = new BoardSaveRequest("BBS_01", "Subj", "Cont", null, null, null, null, null, null, null, null, null);
        BoardMaster master = BoardMaster.builder().bbsId("BBS_01").build();
        UserDto author = UserDto.builder().userId(userId).userNm("실제작성자").build();

        given(boardMasterRepository.findByIdWithPessimisticLock("BBS_01")).willReturn(Optional.of(master));
        given(userService.getUserById(userId)).willReturn(author);
        given(boardRepository.findMaxSortOrdr("BBS_01")).willReturn(0L);
        given(boardRepository.getNextPstId()).willReturn(1L);
        given(boardRepository.save(any(Board.class))).willAnswer(invocation -> invocation.getArgument(0));

        // when
        boardService.createPost(userId, request);

        // then — 저자는 인증 userId + 조회한 저자명으로 저장된다
        verify(boardRepository).save(argThat(b -> "user1".equals(b.getUserId()) && "실제작성자".equals(b.getUserNm())));
    }

    @Test
    @DisplayName("파일을 포함하여 게시글 생성")
    void createPostWithFiles() throws IOException {
        // given
        String userId = "user1";
        BoardSaveRequest request = new BoardSaveRequest("BBS_01", "Subj", "Cont", null, null, null, null, null, null, null, null, null);
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
        BoardSaveRequest request = new BoardSaveRequest("BBS_01", "Reply", "Cont", null, null, null, null, null, null, null, null, null);
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
        BoardSaveRequest request = new BoardSaveRequest("BBS_01", "Reply", "Cont", null, null, null, null, null, null, null, null, null);
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
        BoardSaveRequest request = new BoardSaveRequest(bbsId, "Upd", "Cont", null, null, null, eventDateStr, null, null, null, null, null);
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
        BoardSaveRequest request = new BoardSaveRequest(bbsId, "Upd", "Cont", null, null, null, "invalid-date", null, null, null, null, null);
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
                null, null);
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
        BoardSaveRequest request = new BoardSaveRequest(bbsId, "Upd", "Cont", null, null, atchFileId, null, null, null, null, null, null);
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

        BoardSaveRequest request = new BoardSaveRequest("BBS_01", "Upd", "Cont", null, null, null, null, null, null, null, null, null);

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
        BoardSaveRequest request = new BoardSaveRequest("BBS_01", "Subj", "Cont", null, null, "OLD_ATCH", null, null, null, null, null, null);
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
