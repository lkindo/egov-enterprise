package nuri.business.service.board;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.business.domain.user.exception.UserErrorCode;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import nuri.business.domain.board.*;
import nuri.business.domain.board.exception.BoardErrorCode;
import nuri.business.service.board.dto.BoardDto;
import nuri.business.service.board.dto.BoardMapperImpl;
import nuri.business.service.board.dto.BoardSaveRequest;
import nuri.business.service.board.dto.BoardPostListFilter;
import nuri.business.service.board.dto.BoardStatsResponse;
import nuri.foundation.core.event.PostCreatedEvent;
import nuri.business.service.file.AttachmentAssignmentPolicy;
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
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
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
    private AttachmentAssignmentPolicy attachmentAssignmentPolicy;
    @Mock
    private ApplicationEventPublisher eventPublisher;
    private MeterRegistry meterRegistry;
    @Mock
    private BoardViewCountService viewCountService;
    @Mock
    private nuri.foundation.core.community.CommunityBoardAccessPort communityBoardAccess;
    @Mock
    private nuri.business.domain.board.BoardRecommendationRepository recommendationRepository;
    @Mock
    private BoardChangeRecorder changeRecorder;
    @Mock
    private Timer timer;
    @Mock
    private Timer.Sample sample;

    private MockedStatic<nuri.business.security.util.SecurityUtil> securityUtilMock;

    /**
     * [2026-10-23 ADR-0040 결정 3] 게시 기간 판정의 고정 시계 — 2026-10-22T15:30Z 는 서울 2026-10-23 00:30 이다. 시계의 시간대(UTC)와
     * 무관하게 서비스가 서울 날짜로 판정하는지도 함께 본다.
     */
    private static final java.time.Clock FIXED_CLOCK =
            java.time.Clock.fixed(java.time.Instant.parse("2026-10-22T15:30:00Z"), java.time.ZoneOffset.UTC);
    private static final String TODAY = "20261023";
    private static final String YESTERDAY = "20261022";
    private static final String TOMORROW = "20261024";

    @org.junit.jupiter.api.BeforeEach
    void setUp() {
        securityUtilMock = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS);
        securityUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission(anyString())).thenReturn(false);
        meterRegistry = new io.micrometer.core.instrument.simple.SimpleMeterRegistry();
        boardService = new BoardService(
                boardRepository,
                boardMasterRepository,
                userService,
                fileService,
                attachmentAssignmentPolicy,
                eventPublisher,
                meterRegistry,
                viewCountService,
                new BoardMapperImpl(),
                // 설정 미주입 기본값 = 종전 PUBLIC_FAQ_BOARD_ID 리터럴(BBSMSTR_AAAAAAAAAAAA).
                // 아래 FAQ 테스트들의 기존 리터럴 기대값을 그대로 두어 기본값 동작 불변을 검증한다.
                new nuri.business.core.config.BoardIdProperties(),
                recommendationRepository,
                // [2026-10-23 ADR-0040 결정 9] 운영 화면 게시 기간 변경 이력.
                changeRecorder,
                // [2026-09-08 PD-CMTY-001] 커뮤니티 접근 포트. 대부분의 시나리오는 귀속 없는 게시판이라
                //   호출되지 않으며, 귀속 게시판 테스트만 이 목의 응답을 지정한다.
                communityBoardAccess);
        boardService.useClock(FIXED_CLOCK);
        // [2026-10-23 ADR-0040 결정 1] 쓰기·상세·댓글 경로가 게시판 진입 판정(사용 여부 → 커뮤니티)을 먼저 지난다.
        //   시험이 마스터를 정하지 않으면 그 bbsId 의 사용 중인 일반 게시판으로 본다. 없는·사용 안 함·커뮤니티 게시판은
        //   시험이 직접 정한다(그 스텁이 이 기본값보다 앞선다).
        lenient().when(boardMasterRepository.findById(anyString())).thenAnswer(invocation ->
                Optional.of(BoardMaster.builder().bbsId(invocation.getArgument(0)).build()));
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
        BoardSearchResult resultItem = BoardSearchResult.builder().pstSn(1L).build();
        Page<BoardSearchResult> page = new PageImpl<>(Collections.singletonList(resultItem));

        given(boardMasterRepository.findById(bbsId)).willReturn(Optional.of(master));
        given(boardRepository.searchArticles(any(BoardSearchCondition.class), eq(pageable))).willReturn(page);

        // when
        Page<BoardDto> result = boardService.getBoardPosts(bbsId, pageable);

        // then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).pstSn()).isEqualTo(1L);
        // 사용자를 모르면 추천 여부를 판정하지 않는다(null) — false 로 '추천하지 않았다' 고 말하지 않는다.
        assertThat(result.getContent().get(0).recommended()).isNull();
    }

    @Test
    @DisplayName("🚨 목록은 현재 사용자의 추천 여부를 한 번의 조회로 싣는다 (2026-10-01)")
    void getBoardPosts_marksRecommendedPostsInOneQuery() {
        String bbsId = "BBS_01";
        Pageable pageable = PageRequest.of(0, 10);
        given(boardMasterRepository.findById(bbsId)).willReturn(Optional.of(BoardMaster.builder().bbsId(bbsId).build()));
        given(boardRepository.searchArticles(any(BoardSearchCondition.class), eq(pageable))).willReturn(new PageImpl<>(java.util.List.of(
                BoardSearchResult.builder().pstSn(1L).build(), BoardSearchResult.builder().pstSn(2L).build())));
        securityUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of("USR_A"));
        given(recommendationRepository.findRecommendedPstSns("USR_A", java.util.List.of(1L, 2L))).willReturn(java.util.List.of(2L));

        Page<BoardDto> result = boardService.getBoardPosts(bbsId, pageable);

        assertThat(result.getContent()).extracting(BoardDto::recommended).containsExactly(false, true);
        verify(recommendationRepository).findRecommendedPstSns(anyString(), any());
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

        boardService.getBoardPosts(bbsId, "0", "공지", "views", "2026-01-01", "2026-12-31", "R", "CAT1", null, pageable, BoardPostListFilter.NONE);

        // 한 항목이라도 전달이 끊기면 사용자가 건 필터가 조용히 무시된 채 전체 목록이 반환된다.
        BoardSearchCondition cond = captor.getValue();
        assertThat(cond.getBbsId()).isEqualTo(bbsId);
        assertThat(cond.getUseYn()).isEqualTo("Y"); // 삭제글 노출 방지
        assertThat(cond.getSearchCnd()).isEqualTo("0");
        assertThat(cond.getSearchWrd()).isEqualTo("공지");
        assertThat(cond.getOrderBy()).isEqualTo("views");
        assertThat(cond.getQnaSttsCd()).isEqualTo("R");
        assertThat(cond.getQnaCatCd()).isEqualTo("CAT1");
        assertThat(cond.isSecretPostAdminOverride()).isFalse();
        assertThat(cond.getViewerEsntlId()).isNull();
        // 종료일은 그날 자정이 아니라 하루 끝까지 포함해야 당일 글이 누락되지 않는다.
        assertThat(cond.getStartDate()).isEqualTo(java.time.LocalDate.of(2026, 1, 1).atStartOfDay());
        assertThat(cond.getEndDate()).isEqualTo(java.time.LocalDate.of(2026, 12, 31).atTime(java.time.LocalTime.MAX));
        assertThat(cond.isEventDateBasis()).isFalse(); // 기간 기준 기본값은 작성일이다.
    }

    @Test
    @DisplayName("기간 기준 EVENT 는 행사일로 거르게 하고, 어휘 밖의 값은 400 이다 (DIP V6)")
    void getBoardPosts_dateBasis() {
        String bbsId = "BBS_01";
        Pageable pageable = PageRequest.of(0, 10);
        given(boardMasterRepository.findById(bbsId))
                .willReturn(Optional.of(BoardMaster.builder().bbsId(bbsId).build()));
        org.mockito.ArgumentCaptor<BoardSearchCondition> captor =
                org.mockito.ArgumentCaptor.forClass(BoardSearchCondition.class);
        given(boardRepository.searchArticles(captor.capture(), eq(pageable)))
                .willReturn(new PageImpl<BoardSearchResult>(Collections.emptyList()));

        boardService.getBoardPosts(bbsId, "0", "", null, "2026-09-01", "2026-09-30", null, null, "EVENT", pageable, BoardPostListFilter.NONE);
        assertThat(captor.getValue().isEventDateBasis()).isTrue();

        assertThatThrownBy(() -> boardService.getBoardPosts(bbsId, "0", "", null, null, null, null, null,
                "evnt_dt", pageable, BoardPostListFilter.NONE))
                .isInstanceOf(nuri.foundation.core.exception.BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", nuri.foundation.core.exception.CommonErrorCode.INVALID_INPUT_VALUE);
    }

    @Test
    @DisplayName("범용 목록은 비관리자의 현재 esntlId를 SQL 비밀글 visibility에 전달한다")
    void getBoardPostsBindsNonAdminViewerToSecretVisibility() {
        String bbsId = "BBS_01";
        Pageable pageable = PageRequest.of(0, 10);
        given(boardMasterRepository.findById(bbsId))
                .willReturn(Optional.of(BoardMaster.builder().bbsId(bbsId).build()));
        securityUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId)
                .thenReturn(Optional.of("ESNTL_VIEWER"));
        org.mockito.ArgumentCaptor<BoardSearchCondition> captor =
                org.mockito.ArgumentCaptor.forClass(BoardSearchCondition.class);
        given(boardRepository.searchArticles(captor.capture(), eq(pageable)))
                .willReturn(Page.empty(pageable));

        boardService.getBoardPosts(bbsId, pageable);

        assertThat(captor.getValue().getViewerEsntlId()).isEqualTo("ESNTL_VIEWER");
        assertThat(captor.getValue().isSecretPostAdminOverride()).isFalse();
        securityUtilMock.verify(() -> nuri.business.security.util.SecurityUtil.hasPermission("BOARD_READ_ALL"));
    }

    @Test
    @DisplayName("🚨 비관리자 목록은 게시 종료일 기준일(오늘, 서울)을 싣고, 전체 열람 권한자는 싣지 않는다 (2026-10-01 결정 23)")
    void getBoardPosts_bindsPostingOpenOnForNonAdminOnly() {
        String bbsId = "BBS_01";
        Pageable pageable = PageRequest.of(0, 10);
        given(boardMasterRepository.findById(bbsId)).willReturn(Optional.of(BoardMaster.builder().bbsId(bbsId).build()));
        org.mockito.ArgumentCaptor<BoardSearchCondition> captor = org.mockito.ArgumentCaptor.forClass(BoardSearchCondition.class);
        given(boardRepository.searchArticles(captor.capture(), eq(pageable))).willReturn(Page.empty(pageable));

        boardService.getBoardPosts(bbsId, pageable);
        assertThat(captor.getValue().getPostingOpenOn()).isEqualTo(TODAY);
        assertThat(captor.getValue().getBaseYmd()).isEqualTo(TODAY);

        securityUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("BOARD_READ_ALL")).thenReturn(true);
        boardService.getBoardPosts(bbsId, pageable);
        assertThat(captor.getValue().getPostingOpenOn()).isNull();
        // 기준일은 뷰어와 무관하게 싣는다 — 게시 상태 조건과 고정 판정이 쓴다.
        assertThat(captor.getValue().getBaseYmd()).isEqualTo(TODAY);
    }

    @Test
    @DisplayName("🚨 게시 종료일이 지난 글은 남에게 404, 작성자·전체 열람 권한자에게는 열린다 (2026-10-01 결정 23)")
    void getPostDetail_hidesEndedPostingFromOthers() {
        String yesterday = YESTERDAY;
        BoardDetailResult ended = BoardDetailResult.builder().pstSn(5L).bbsId("BBS_01").userId("ESNTL_owner")
                .scrtYn("N").pstEndYmd(yesterday).build();
        given(boardRepository.findActiveArticleDetail("BBS_01", 5L)).willReturn(Optional.of(ended));

        securityUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of("ESNTL_other"));
        assertThatThrownBy(() -> boardService.getPostDetail("BBS_01", 5L, false))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", BoardErrorCode.ARTICLE_NOT_FOUND);
        assertThatThrownBy(() -> boardService.assertCommentAccess("BBS_01", 5L))
                .hasFieldOrPropertyWithValue("errorCode", BoardErrorCode.ARTICLE_NOT_FOUND);

        securityUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of("ESNTL_owner"));
        assertThat(boardService.getPostDetail("BBS_01", 5L, false).pstSn()).isEqualTo(5L);

        securityUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of("ESNTL_other"));
        securityUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("BOARD_READ_ALL")).thenReturn(true);
        assertThat(boardService.getPostDetail("BBS_01", 5L, false).pstSn()).isEqualTo(5L);
    }

    @Test
    @DisplayName("오늘이 종료일인 글과 종료일이 없는 글은 아직 게시 중이다")
    void getPostDetail_keepsPostingOpenOnEndDateAndWithoutEnd() {
        String today = TODAY;
        given(boardRepository.findActiveArticleDetail("BBS_01", 6L)).willReturn(Optional.of(
                BoardDetailResult.builder().pstSn(6L).bbsId("BBS_01").userId("ESNTL_owner").scrtYn("N").pstEndYmd(today).build()));
        given(boardRepository.findActiveArticleDetail("BBS_01", 7L)).willReturn(Optional.of(
                BoardDetailResult.builder().pstSn(7L).bbsId("BBS_01").userId("ESNTL_owner").scrtYn("N").pstEndYmd("").build()));
        securityUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of("ESNTL_other"));

        assertThat(boardService.getPostDetail("BBS_01", 6L, false).pstSn()).isEqualTo(6L);
        assertThat(boardService.getPostDetail("BBS_01", 7L, false).pstSn()).isEqualTo(7L);
    }

    /** 판정은 그룹 이름이 아니라 조회 대행 권한(BOARD_READ_ALL) 하나로 한다 — 기본 그룹 ROLE_ADMIN·ROLE_SYSTEM. */
    @Test
    @DisplayName("범용 목록은 BOARD_READ_ALL 보유자에게 비밀글 전체 visibility를 허용한다")
    void getBoardPostsAllowsSecretVisibilityForBoardReadAll() {
        String bbsId = "BBS_READ_ALL";
        Pageable pageable = PageRequest.of(0, 10);
        given(boardMasterRepository.findById(bbsId))
                .willReturn(Optional.of(BoardMaster.builder().bbsId(bbsId).build()));
        securityUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("BOARD_READ_ALL"))
                .thenReturn(true);
        org.mockito.ArgumentCaptor<BoardSearchCondition> captor =
                org.mockito.ArgumentCaptor.forClass(BoardSearchCondition.class);
        given(boardRepository.searchArticles(captor.capture(), eq(pageable)))
                .willReturn(Page.empty(pageable));

        boardService.getBoardPosts(bbsId, pageable);

        assertThat(captor.getValue().isSecretPostAdminOverride()).isTrue();
    }

    @Test
    @DisplayName("범용 목록은 비활성 게시판 master를 repository 조회 전에 거부한다")
    void getBoardPostsRejectsInactiveBoardMaster() {
        String bbsId = "BBS_INACTIVE";
        given(boardMasterRepository.findById(bbsId)).willReturn(Optional.of(
                BoardMaster.builder().bbsId(bbsId).useYn("N").build()));

        assertThatThrownBy(() -> boardService.getBoardPosts(bbsId, PageRequest.of(0, 10)))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", BoardErrorCode.BOARD_NOT_FOUND);
        verify(boardRepository, never()).searchArticles(any(), any());
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
                bbsId, null, null, null, "2026-12-31", "2026-01-01", null, null, null, pageable, BoardPostListFilter.NONE))
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
                        BoardSearchResult.builder().pstSn(1L).build())));

        Page<BoardDto> result = boardService.getBoardPosts(bbsId, "0", "공지", null, null, null, null, null, null, pageable, BoardPostListFilter.NONE);

        assertThat(result.getContent()).hasSize(1);
        assertThat(captor.getValue().getSearchWrd()).isEqualTo("공지");
        assertThat(captor.getValue().getOrderBy()).isNull();
    }

    @Test
    @DisplayName("게시글 수정 - 관리자가 아니지만 본인인 경우")
    void updateBoard_Self_Success() {
        securityUtilMock.when(() -> nuri.business.security.util.SecurityUtil.getCurrentEsntlId()).thenReturn(Optional.of("user1"));
        securityUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("BOARD_READ_ALL")).thenReturn(false);

        Board board = mock(Board.class);
        given(board.getBbsId()).willReturn("BBS1");
        given(board.getUserId()).willReturn("user1");
        given(boardRepository.findById(1L)).willReturn(Optional.of(board));
        given(board.getVersion()).willReturn(0); // [ADR-0040 결정 10] 상세에서 읽은 버전과 같다
        
        BoardSaveRequest updateDto = new BoardSaveRequest(
            "BBS1", "update", "content", null, null, null, null, null, null, null, null, null
        , 0);

        boardService.updatePost("BBS1", 1L, updateDto);
        // board.update(...) gets called with fallbacks
        verify(board).update(any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("게시글 수정 - 타인이며 관리자도 아닌 경우 예외")
    void updateBoard_Fail_NoAuth() {
        securityUtilMock.when(() -> nuri.business.security.util.SecurityUtil.getCurrentEsntlId()).thenReturn(Optional.of("user2"));
        securityUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("BOARD_READ_ALL")).thenReturn(false);

        Board board = mock(Board.class);
        given(board.getBbsId()).willReturn("BBS1");
        given(board.getUserId()).willReturn("user1");
        given(boardRepository.findById(1L)).willReturn(Optional.of(board));

        BoardSaveRequest req = new BoardSaveRequest("BBS1", "title", "content", null, null, null, null, null, null, null, null, null, null);
        // 게시판 진입 판정을 지난 뒤 소유 판정에서 거부돼야 한다 — 마스터를 못 찾은 404 로 통과하면 이 시험은 아무것도 증명하지 않는다.
        assertThatThrownBy(() -> boardService.updatePost("BBS1", 1L, req))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", nuri.foundation.core.exception.CommonErrorCode.ACCESS_DENIED);
    }

    @Test
    @DisplayName("게시글 삭제 - 타인이며 관리자도 아닌 경우 예외")
    void deleteBoard_Fail_NoAuth() {
        securityUtilMock.when(() -> nuri.business.security.util.SecurityUtil.getCurrentEsntlId()).thenReturn(Optional.of("user2"));
        securityUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("BOARD_READ_ALL")).thenReturn(false);

        Board board = mock(Board.class);
        given(board.getBbsId()).willReturn("BBS1");
        given(board.getUserId()).willReturn("user1");
        given(boardRepository.findById(1L)).willReturn(Optional.of(board));

        assertThatThrownBy(() -> boardService.deletePost("BBS1", 1L, "user2"))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", nuri.foundation.core.exception.CommonErrorCode.ACCESS_DENIED);
    }



    @Test
    @DisplayName("게시판 통계 조회")
    void getBoardStats() {
        // given
        String bbsId = "BBS_01";
        given(boardMasterRepository.findById(bbsId)).willReturn(Optional.of(
                BoardMaster.builder().bbsId(bbsId).useYn("Y").build()));
        given(boardRepository.aggregateVisibleStats(any(BoardSearchCondition.class)))
                .willReturn(new BoardStatsResult(10L, 100L, "user1"));

        // when
        BoardStatsResponse result = boardService.getBoardStats(bbsId);

        // then
        assertThat(result.getTotalArticles()).isEqualTo(10L);
        assertThat(result.getTotalViews()).isEqualTo(100L);
        assertThat(result.getTopContributor()).isEqualTo("user1");
    }

    @Test
    @DisplayName("게시글 생성")
    void createPost() {
        // given
        String userId = "user1";
        BoardSaveRequest request = new BoardSaveRequest("BBS_01", "Subject", "Content", null, null, null, null, null, null, null, null, null, null);
        BoardMaster master = BoardMaster.builder().bbsId("BBS_01").build();
        UserDto user = UserDto.builder().userId(userId).userNm("Tester").build();

        given(boardMasterRepository.findByIdWithPessimisticLock("BBS_01")).willReturn(Optional.of(master));
        given(userService.getUserById(userId)).willReturn(user);
        given(boardRepository.findMaxSortOrdr("BBS_01")).willReturn(0L);
        given(boardRepository.save(any(Board.class))).willAnswer(invocation -> persistWithGeneratedPstSn(invocation.getArgument(0)));

        // when
        Long pstSn = boardService.createPost(userId, request);

        // then
        assertThat(pstSn).isEqualTo(1L);
        verify(eventPublisher, times(1)).publishEvent(any(PostCreatedEvent.class));
    }

    @Test
    @DisplayName("답글 생성")
    void replyPost() {
        // given
        String userId = "user1";
        Long parentId = 1L;
        BoardSaveRequest request = new BoardSaveRequest("BBS_01", "Reply", "Content", null, null, null, null, null, null, null, null, null, null);
        BoardMaster master = BoardMaster.builder().bbsId("BBS_01").build();
        Board parent = Board.builder().bbsId("BBS_01").pstSn(parentId).sortOrdr(100L).ansLv(0).build();
        UserDto user = UserDto.builder().userId(userId).userNm("Tester").build();

        given(boardMasterRepository.findByIdWithPessimisticLock("BBS_01")).willReturn(Optional.of(master));
        given(boardRepository.findById(parentId)).willReturn(Optional.of(parent));
        given(userService.getUserById(userId)).willReturn(user);
        given(boardRepository.findMaxAnsSn("BBS_01", 100L)).willReturn(0L);
        given(boardRepository.save(any(Board.class))).willAnswer(invocation -> persistWithGeneratedPstSn(invocation.getArgument(0)));

        // when
        Long pstSn = boardService.replyPost(userId, parentId, request);

        // then
        assertThat(pstSn).isPositive();
    }

    /** BoardSaveRequest(bbsId, pstTtl, pstCn, pstBgngYmd, pstEndYmd, atchFileSn, evntDt, qnaSttsCd, qnaCatCd, scrtYn, useYn, pswd) */
    private BoardSaveRequest saveRequest(String evntDt, String qnaSttsCd, String useYn) {
        return new BoardSaveRequest("BBS_01", "Subject", "Content", null, null, null,
                evntDt, qnaSttsCd, null, null, useYn, null, null);
    }

    private Board captureSavedBoard() {
        org.mockito.ArgumentCaptor<Board> captor = org.mockito.ArgumentCaptor.forClass(Board.class);
        verify(boardRepository).save(captor.capture());
        return captor.getValue();
    }

    private Board persistWithGeneratedPstSn(Board board) {
        if (board.getPstSn() == null) {
            // IDENTITY PK 는 JPA 가 채우므로 엔티티에 변경자가 없다 — 저장소 목이 그 역할을 흉내 낸다.
            org.springframework.test.util.ReflectionTestUtils.setField(board, "pstSn", 1L);
        }
        return board;
    }

    private void givenCreatePostContext(long maxSortOrdr) {
        given(boardMasterRepository.findByIdWithPessimisticLock("BBS_01"))
                .willReturn(Optional.of(BoardMaster.builder().bbsId("BBS_01").build()));
        given(userService.getUserById("user1")).willReturn(UserDto.builder().userId("user1").userNm("Tester").build());
        given(boardRepository.findMaxSortOrdr("BBS_01")).willReturn(maxSortOrdr);
        given(boardRepository.save(any(Board.class))).willAnswer(invocation -> persistWithGeneratedPstSn(invocation.getArgument(0)));
    }

    @Test
    @DisplayName("[DIP B5 F9] 폐기된 게시글 비밀번호는 요청에 실려도 저장하지 않고, 수정은 기존 값을 바꾸지 않는다")
    void retiredPasswordIsNeitherStoredNorOverwritten() {
        givenCreatePostContext(0L);
        boardService.createPost("user1", new BoardSaveRequest("BBS_01", "Subject", "Content", null, null, null,
                null, null, null, null, null, "1", 0));
        assertThat(captureSavedBoard().getPswd()).isNull();

        securityUtilMock.when(() -> nuri.business.security.util.SecurityUtil.getCurrentEsntlId()).thenReturn(Optional.of("user1"));
        Board existing = Board.builder().bbsId("BBS_01").pstSn(5L).userId("user1").pswd("legacy").build();
        given(boardRepository.findById(5L)).willReturn(Optional.of(existing));
        org.springframework.test.util.ReflectionTestUtils.setField(existing, "version", 0); // [ADR-0040 결정 10] 상세에서 읽은 버전과 같다
        boardService.updatePost("BBS_01", 5L, new BoardSaveRequest("BBS_01", "Upd", "Cont", null, null, null,
                null, null, null, null, null, "new-secret", 0));
        assertThat(existing.getPswd()).isEqualTo("legacy");
        assertThat(existing.getPstTtl()).isEqualTo("Upd");
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
        // [2026-10-26 ADR-0043] Q&A 상태는 Q&A 게시판의 글에만 둘 수 있다 — 상태를 보내는 이 시험은 Q&A 게시판에 쓴다.
        given(boardMasterRepository.findByIdWithPessimisticLock("BBS_01"))
                .willReturn(Optional.of(BoardMaster.builder().bbsId("BBS_01").tmpltId("TMPLT_QNA").build()));

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
        Long parentId = 1L;
        Board parent = Board.builder().bbsId("BBS_01").pstSn(parentId).sortOrdr(100L).ansLv(0).build();
        given(boardMasterRepository.findByIdWithPessimisticLock("BBS_01"))
                .willReturn(Optional.of(BoardMaster.builder().bbsId("BBS_01").build()));
        given(boardRepository.findById(parentId)).willReturn(Optional.of(parent));
        given(userService.getUserById("user1")).willReturn(UserDto.builder().userId("user1").userNm("Tester").build());
        given(boardRepository.findMaxAnsSn("BBS_01", 100L)).willReturn(3L);
        given(boardRepository.save(any(Board.class))).willAnswer(invocation -> persistWithGeneratedPstSn(invocation.getArgument(0)));

        boardService.replyPost("user1", parentId, saveRequest(null, null, null));

        Board saved = captureSavedBoard();
        // +1 이 빠지면 형제 답글과 순번이 겹쳐 스레드 정렬이 깨진다.
        assertThat(saved.getAnsSn()).isEqualTo(4L);
        assertThat(saved.getUpPstSn()).isEqualTo(parentId);
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
        Long pstSn = 1L;
        BoardDetailResult detail = BoardDetailResult.builder()
                .pstSn(pstSn)
                .bbsId(bbsId)
                .userId("ESNTL_owner")
                .scrtYn("N")
                .build();

        given(boardRepository.findActiveArticleDetail(bbsId, pstSn)).willReturn(Optional.of(detail));

        // when
        BoardDto result = boardService.getPostDetail(bbsId, pstSn, true);

        // then
        assertThat(result.pstSn()).isEqualTo(pstSn);
        assertThat(result.recommended()).isNull();
        verify(viewCountService).increaseViewCount(pstSn);

        // 사용자를 알면 이미 추천했는지 싣는다(2026-10-01) — 화면이 409 를 받기 전에 '추천함' 으로 보인다.
        securityUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of("USR_A"));
        given(recommendationRepository.existsById(new nuri.business.domain.board.BoardRecommendationId(pstSn, "USR_A")))
                .willReturn(true);
        assertThat(boardService.getPostDetail(bbsId, pstSn, false).recommended()).isTrue();
    }

    @Test
    @DisplayName("댓글 접근 검사는 게시판-게시글 관계를 확인하고 조회수를 올리지 않는다")
    void assertCommentAccess_usesBoundedDetailWithoutViewIncrement() {
        BoardDetailResult detail = BoardDetailResult.builder()
                .bbsId("BBS_01").pstSn(21L).scrtYn("N").build();
        given(boardRepository.findActiveArticleDetail("BBS_01", 21L)).willReturn(Optional.of(detail));

        boardService.assertCommentAccess("BBS_01", 21L);

        verify(boardRepository).findActiveArticleDetail("BBS_01", 21L);
        verify(viewCountService, never()).increaseViewCount(anyLong());
    }

    @Test
    @DisplayName("댓글 접근 검사는 다른 게시판 ID와 결합한 게시글 번호를 거부한다")
    void assertCommentAccess_rejectsMismatchedBoardAndPost() {
        given(boardRepository.findActiveArticleDetail("WRONG_BBS", 22L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> boardService.assertCommentAccess("WRONG_BBS", 22L))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", BoardErrorCode.ARTICLE_NOT_FOUND);
    }

    @Test
    @DisplayName("댓글 접근 검사는 비밀글 비소유자를 거부한다")
    void assertCommentAccess_rejectsSecretPostForNonOwner() {
        BoardDetailResult detail = BoardDetailResult.builder()
                .bbsId("BBS_01").pstSn(23L).scrtYn("Y").userId("ESNTL_owner").build();
        given(boardRepository.findActiveArticleDetail("BBS_01", 23L)).willReturn(Optional.of(detail));
        securityUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId)
                .thenReturn(Optional.of("ESNTL_other"));

        assertThatThrownBy(() -> boardService.assertCommentAccess("BBS_01", 23L))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
    }

    @Test
    @DisplayName("게시판 통계는 현재 viewer와 exact role visibility를 repository 집계에 결속한다")
    void getBoardStatsBindsViewerVisibility() {
        String bbsId = "BBS_STATS";
        given(boardMasterRepository.findById(bbsId)).willReturn(Optional.of(
                BoardMaster.builder().bbsId(bbsId).useYn("Y").build()));
        securityUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId)
                .thenReturn(Optional.of("ESNTL_VIEWER"));
        org.mockito.ArgumentCaptor<BoardSearchCondition> captor =
                org.mockito.ArgumentCaptor.forClass(BoardSearchCondition.class);
        given(boardRepository.aggregateVisibleStats(captor.capture()))
                .willReturn(new BoardStatsResult(1L, 5L, "Public contributor"));

        BoardStatsResponse result = boardService.getBoardStats(bbsId);

        assertThat(result.getTotalArticles()).isEqualTo(1L);
        assertThat(result.getTotalViews()).isEqualTo(5L);
        assertThat(captor.getValue().getBbsId()).isEqualTo(bbsId);
        assertThat(captor.getValue().getUseYn()).isEqualTo("Y");
        assertThat(captor.getValue().getViewerEsntlId()).isEqualTo("ESNTL_VIEWER");
        assertThat(captor.getValue().isSecretPostAdminOverride()).isFalse();
    }

    @Test
    @DisplayName("게시판 통계는 비활성 master를 집계 전에 거부한다")
    void getBoardStatsRejectsInactiveBoardMaster() {
        String bbsId = "BBS_STATS_INACTIVE";
        given(boardMasterRepository.findById(bbsId)).willReturn(Optional.of(
                BoardMaster.builder().bbsId(bbsId).useYn("N").build()));

        assertThatThrownBy(() -> boardService.getBoardStats(bbsId))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", BoardErrorCode.BOARD_NOT_FOUND);
        verify(boardRepository, never()).aggregateVisibleStats(any());
    }

    @Test
    @DisplayName("비밀글 상세 조회 - 작성자 esntlId가 일치하면 본문과 조회수를 제공한다")
    void getPostDetail_secretOwnerAllowed() {
        Long pstSn = 11L;
        BoardDetailResult detail = BoardDetailResult.builder()
                .pstSn(pstSn)
                .bbsId("BBS_01")
                .userId("ESNTL_owner")
                .scrtYn("Y")
                .pstCn("private content")
                .build();
        given(boardRepository.findActiveArticleDetail("BBS_01", pstSn)).willReturn(Optional.of(detail));
        securityUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId)
                .thenReturn(Optional.of("ESNTL_owner"));

        BoardDto result = boardService.getPostDetail("BBS_01", pstSn, true);

        assertThat(result.pstCn()).isEqualTo("private content");
        verify(viewCountService).increaseViewCount(pstSn);
    }

    @Test
    @DisplayName("비밀글 상세 조회 - 비소유 인증 사용자는 ACCESS_DENIED이고 조회수도 올리지 않는다")
    void getPostDetail_secretNonOwnerDenied() {
        Long pstSn = 12L;
        BoardDetailResult detail = BoardDetailResult.builder()
                .pstSn(pstSn)
                .bbsId("BBS_01")
                .userId("ESNTL_owner")
                .scrtYn("Y")
                .pstCn("must not be returned")
                .build();
        given(boardRepository.findActiveArticleDetail("BBS_01", pstSn)).willReturn(Optional.of(detail));
        securityUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId)
                .thenReturn(Optional.of("ESNTL_other"));

        assertThatThrownBy(() -> boardService.getPostDetail("BBS_01", pstSn, true))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
        verify(viewCountService, never()).increaseViewCount(pstSn);
    }

    @Test
    @DisplayName("비밀글 상세 조회 - ADMIN은 기존 owner-or-admin 의미대로 열람할 수 있다")
    void getPostDetail_secretAdminAllowed() {
        Long pstSn = 13L;
        BoardDetailResult detail = BoardDetailResult.builder()
                .pstSn(pstSn)
                .bbsId("BBS_01")
                .userId("ESNTL_owner")
                .scrtYn("Y")
                .build();
        given(boardRepository.findActiveArticleDetail("BBS_01", pstSn)).willReturn(Optional.of(detail));
        securityUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("BOARD_READ_ALL"))
                .thenReturn(true);

        assertThat(boardService.getPostDetail("BBS_01", pstSn, true).pstSn()).isEqualTo(pstSn);
        verify(viewCountService).increaseViewCount(pstSn);
    }

    @Test
    @DisplayName("게시글 상세는 요청 게시판과 활성 상태가 결속된 조회만 사용한다")
    void getPostDetailUsesAuthoritativeBoardAndActiveBoundary() {
        Long pstSn = 14L;
        given(boardRepository.findActiveArticleDetail("BBS_REQUESTED", pstSn))
                .willReturn(Optional.empty());

        assertThatThrownBy(() -> boardService.getPostDetail("BBS_REQUESTED", pstSn, true))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", BoardErrorCode.ARTICLE_NOT_FOUND);

        verify(boardRepository).findActiveArticleDetail("BBS_REQUESTED", pstSn);
        verify(viewCountService, never()).increaseViewCount(anyLong());
    }

    @Test
    @DisplayName("논리 삭제 게시글 상세 - ADMIN은 복구·감사를 위해 열람할 수 있다")
    void getPostDetail_softDeletedVisibleToAdmin() {
        Long pstSn = 15L;
        BoardDetailResult deleted = BoardDetailResult.builder()
                .pstSn(pstSn)
                .bbsId("BBS_01")
                .userId("ESNTL_owner")
                .scrtYn("N")
                .useYn("N")
                .pstCn("deleted content")
                .build();
        given(boardRepository.findActiveArticleDetail("BBS_01", pstSn)).willReturn(Optional.empty());
        given(boardRepository.findArticleDetailIncludingDeleted("BBS_01", pstSn))
                .willReturn(Optional.of(deleted));
        securityUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("BOARD_READ_ALL"))
                .thenReturn(true);

        assertThat(boardService.getPostDetail("BBS_01", pstSn, true).pstCn()).isEqualTo("deleted content");
    }

    @Test
    @DisplayName("논리 삭제 게시글 상세 - 비관리자는 여전히 404이고 삭제 포함 조회 자체를 하지 않는다")
    void getPostDetail_softDeletedHiddenFromNonAdmin() {
        Long pstSn = 16L;
        given(boardRepository.findActiveArticleDetail("BBS_01", pstSn)).willReturn(Optional.empty());
        securityUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("BOARD_READ_ALL"))
                .thenReturn(false);

        assertThatThrownBy(() -> boardService.getPostDetail("BBS_01", pstSn, true))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", BoardErrorCode.ARTICLE_NOT_FOUND);

        // 권한이 없으면 삭제 포함 조회를 **시도조차** 하지 않아야 한다. 결과만 404 로 같아도
        // 질의가 나갔다면 관리자 전용 경로가 일반 사용자에게 열려 있다는 뜻이다.
        verify(boardRepository, never()).findArticleDetailIncludingDeleted(anyString(), anyLong());
        verify(viewCountService, never()).increaseViewCount(anyLong());
    }

    @Test
    @DisplayName("공개 FAQ 목록은 고정 보드·활성·비밀 아님·제목 검색만 저장소에 전달한다")
    void getPublicFaqPostsUsesFixedPublicProjection() {
        Pageable pageable = PageRequest.of(0, 10);
        given(boardMasterRepository.findById("BBSMSTR_AAAAAAAAAAAA"))
                .willReturn(Optional.of(BoardMaster.builder()
                        .bbsId("BBSMSTR_AAAAAAAAAAAA")
                        .useYn("Y")
                        .build()));
        given(boardRepository.searchPublicFaqArticles(
                "BBSMSTR_AAAAAAAAAAAA", "secret-search-marker", TODAY, pageable))
                .willReturn(Page.empty(pageable));

        boardService.getPublicFaqPosts("secret-search-marker", pageable);

        verify(boardMasterRepository).findById("BBSMSTR_AAAAAAAAAAAA");
        // 게시 종료 판정 기준일(Asia/Seoul 오늘)을 함께 넘긴다(ADR-0040 A0).
        verify(boardRepository).searchPublicFaqArticles(
                "BBSMSTR_AAAAAAAAAAAA", "secret-search-marker", TODAY, pageable);
        verify(boardRepository, never()).searchArticles(any(), any());
    }

    @Test
    @DisplayName("공개 FAQ 목록은 게시판 master가 없으면 projection 조회 전에 거부한다")
    void getPublicFaqPostsRejectsMissingBoardMaster() {
        given(boardMasterRepository.findById("BBSMSTR_AAAAAAAAAAAA"))
                .willReturn(Optional.empty());

        assertThatThrownBy(() -> boardService.getPublicFaqPosts(
                "keyword", PageRequest.of(0, 10)))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", BoardErrorCode.BOARD_NOT_FOUND);

        verify(boardRepository, never()).searchPublicFaqArticles(anyString(), any(), anyString(), any());
    }

    @Test
    @DisplayName("공개 FAQ 목록은 비활성 게시판 master를 projection 조회 전에 거부한다")
    void getPublicFaqPostsRejectsInactiveBoardMaster() {
        given(boardMasterRepository.findById("BBSMSTR_AAAAAAAAAAAA"))
                .willReturn(Optional.of(BoardMaster.builder()
                        .bbsId("BBSMSTR_AAAAAAAAAAAA")
                        .useYn("N")
                        .build()));

        assertThatThrownBy(() -> boardService.getPublicFaqPosts(
                "keyword", PageRequest.of(0, 10)))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", BoardErrorCode.BOARD_NOT_FOUND);

        verify(boardRepository, never()).searchPublicFaqArticles(anyString(), any(), anyString(), any());
    }

    @Test
    @DisplayName("공개 FAQ 상세는 비밀글을 SQL에서 제외하는 전용 조회만 사용한다")
    void getPublicFaqDetailUsesNonSecretRepositoryBoundary() {
        Long pstSn = 15L;
        BoardDetailResult detail = BoardDetailResult.builder()
                .bbsId("BBSMSTR_AAAAAAAAAAAA")
                .pstSn(pstSn)
                .pstCn("public-body-marker")
                .useYn("Y")
                .scrtYn("N")
                .userId("must-not-leave-service")
                .userNm("must-not-leave-service")
                .pswd("must-not-leave-service")
                .atchFileSn(99L)
                .qnaSttsCd("must-not-leave-service")
                .build();
        given(boardRepository.findPublicArticleDetail("BBSMSTR_AAAAAAAAAAAA", pstSn, TODAY))
                .willReturn(Optional.of(detail));

        BoardDto result = boardService.getPublicFaqDetail(pstSn);

        assertThat(result.pstCn()).isEqualTo("public-body-marker");
        assertThat(result.bbsId()).isEqualTo("BBSMSTR_AAAAAAAAAAAA");
        assertThat(result.useYn()).isEqualTo("Y");
        assertThat(result.scrtYn()).isEqualTo("N");
        assertThat(result.userId()).isNull();
        assertThat(result.userNm()).isNull();
        assertThat(result.pswd()).isNull();
        assertThat(result.atchFileSn()).isNull();
        assertThat(result.qnaSttsCd()).isNull();
        verify(boardRepository).findPublicArticleDetail("BBSMSTR_AAAAAAAAAAAA", pstSn, TODAY);
        verify(boardRepository, never()).findActiveArticleDetail(anyString(), anyLong());
        verify(viewCountService).increaseViewCount(pstSn);
    }

    @Test
    @DisplayName("공개 FAQ 상세가 없으면 본문과 조회수 없이 동일한 not-found로 종료한다")
    void getPublicFaqDetailDeniesSecretInactiveOrWrongBoardBeforeViewCount() {
        Long pstSn = 16L;
        given(boardRepository.findPublicArticleDetail("BBSMSTR_AAAAAAAAAAAA", pstSn, TODAY))
                .willReturn(Optional.empty());

        assertThatThrownBy(() -> boardService.getPublicFaqDetail(pstSn))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", BoardErrorCode.ARTICLE_NOT_FOUND);

        verify(viewCountService, never()).increaseViewCount(anyLong());
    }

    @Test
    @DisplayName("게시글 수정")
    void updatePost() {
        // given
        String bbsId = "BBS_01";
        Long pstSn = 1L;
        String userId = "user1";
        BoardSaveRequest request = new BoardSaveRequest(bbsId, "Updated", "Content", null, null, null, null, null, null, null, null, null, 0);
        Board board = Board.builder().bbsId("BBS_01").pstSn(pstSn).pstTtl("Old").userId(userId).build();

        given(boardRepository.findById(pstSn)).willReturn(Optional.of(board));
        org.springframework.test.util.ReflectionTestUtils.setField(board, "version", 0); // [ADR-0040 결정 10] 상세에서 읽은 버전과 같다
        securityUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of(userId));

        // when
        boardService.updatePost(bbsId, pstSn, request);

        // then
        assertThat(board.getPstTtl()).isEqualTo("Updated");
    }

    @Test
    @DisplayName("게시글 수정 - 타인의 첨부로 교체하면 엔티티 변경 전에 거부한다")
    void updatePost_rejectsForeignAttachmentBeforeEntityMutation() {
        Long pstSn = 1L;
        Board board = Board.builder().bbsId("BBS_01")
                .pstSn(pstSn)
                .pstTtl("Old")
                .userId("user1")
                .atchFileSn(100L)
                .build();
        given(boardRepository.findById(pstSn)).willReturn(Optional.of(board));
        org.springframework.test.util.ReflectionTestUtils.setField(board, "version", 0); // [ADR-0040 결정 10] 상세에서 읽은 버전과 같다
        securityUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId)
                .thenReturn(Optional.of("user1"));
        doThrow(new BusinessException(CommonErrorCode.ACCESS_DENIED))
                .when(attachmentAssignmentPolicy).assertAssignable(101L);
        BoardSaveRequest request = new BoardSaveRequest(
                "BBS_01", "Changed", "Content", null, null, 101L,
                null, null, null, null, null, null, 0);

        assertThatThrownBy(() -> boardService.updatePost("BBS_01", pstSn, request))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);

        assertThat(board.getPstTtl()).isEqualTo("Old");
        assertThat(board.getAtchFileSn()).isEqualTo(100L);
    }

    @Test
    @DisplayName("게시글 수정 - 기존 첨부를 그대로 유지하면 재할당 검증을 생략한다")
    void updatePost_sameAttachmentSkipsAssignmentCheck() {
        Long pstSn = 1L;
        Board board = Board.builder().bbsId("BBS_01")
                .pstSn(pstSn)
                .pstTtl("Old")
                .userId("user1")
                .atchFileSn(101L)
                .build();
        given(boardRepository.findById(pstSn)).willReturn(Optional.of(board));
        org.springframework.test.util.ReflectionTestUtils.setField(board, "version", 0); // [ADR-0040 결정 10] 상세에서 읽은 버전과 같다
        securityUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId)
                .thenReturn(Optional.of("user1"));
        BoardSaveRequest request = new BoardSaveRequest(
                "BBS_01", "Changed", "Content", null, null, 101L,
                null, null, null, null, null, null, 0);

        boardService.updatePost("BBS_01", pstSn, request);

        verify(attachmentAssignmentPolicy, never()).assertAssignable(anyLong());
        assertThat(board.getPstTtl()).isEqualTo("Changed");
        assertThat(board.getAtchFileSn()).isEqualTo(101L);
    }

    @Test
    @DisplayName("게시글 삭제")
    void deletePost() {
        // given
        String bbsId = "BBS_01";
        Long pstSn = 1L;
        String userId = "user1";
        Board board = Board.builder().bbsId("BBS_01").pstSn(pstSn).useYn("Y").userId(userId).build();

        given(boardRepository.findById(pstSn)).willReturn(Optional.of(board));
        securityUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of(userId));

        // when
        boardService.deletePost(bbsId, pstSn, "user1");

        // then
        assertThat(board.getUseYn()).isEqualTo("N");
    }

    @Test
    @DisplayName("[W1-17] 추천수 증가는 원자 UPDATE 로 처리하고 version 을 올리지 않는다")
    void incrementLike() {
        // given
        String bbsId = "BBS_01";
        Long pstSn = 1L;
        Board updated = Board.builder().pstSn(pstSn).likeCnt(1).build();
        givenReadablePost(bbsId, pstSn, "writer");
        securityUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of("liker"));

        // 종전에는 비관적 락으로 엔티티를 잡고 필드를 증가시켰다. 유실은 없었지만 저장이 @Version 을
        // 올려, 인기글 편집자가 아무도 고치지 않았는데 409 를 받았다(조회수와 같은 뿌리).
        given(boardRepository.incrementLikeCntAtomic(pstSn)).willReturn(1);
        given(boardRepository.findById(pstSn)).willReturn(Optional.of(updated));

        // when
        Integer result = boardService.incrementLike(bbsId, pstSn);

        // then
        assertThat(result).isEqualTo(1);
        verify(boardRepository, times(1)).incrementLikeCntAtomic(pstSn);
    }

    @Test
    @DisplayName("[W1-17] 존재하지 않는 게시글의 추천은 404 로 거부한다")
    void incrementLike_notFound() {
        given(boardRepository.findActiveArticleDetail("BBS_01", 999L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> boardService.incrementLike("BBS_01", 999L))
                .isInstanceOf(BusinessException.class);
        verify(boardRepository, never()).incrementLikeCntAtomic(any(Long.class));
        verify(recommendationRepository, never()).saveAndFlush(any());
    }

    private void givenReadablePost(String bbsId, Long pstSn, String writerEsntlId) {
        given(boardRepository.findActiveArticleDetail(bbsId, pstSn)).willReturn(Optional.of(
                BoardDetailResult.builder().pstSn(pstSn).bbsId(bbsId).userId(writerEsntlId).scrtYn("N").build()));
    }

    @Test
    @DisplayName("🚨 같은 사람은 같은 글을 두 번 추천할 수 없다 — 409 이고 추천수가 오르지 않는다 (DIP I6 ④)")
    void incrementLike_rejectsSecondRecommendation() {
        givenReadablePost("BBS_01", 1L, "writer");
        securityUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of("liker"));
        given(recommendationRepository.existsById(new nuri.business.domain.board.BoardRecommendationId(1L, "liker")))
                .willReturn(true);

        assertThatThrownBy(() -> boardService.incrementLike("BBS_01", 1L))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.DUPLICATE_RESOURCE);
        verify(boardRepository, never()).incrementLikeCntAtomic(any(Long.class));
    }

    @Test
    @DisplayName("동시에 두 번 눌러 이력 PK 가 충돌해도 두 번째는 409 이고 추천수를 올리지 않는다 (DIP I6 ④)")
    void incrementLike_concurrentDuplicateIsConflict() {
        givenReadablePost("BBS_01", 1L, "writer");
        securityUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of("liker"));
        given(recommendationRepository.saveAndFlush(any()))
                .willThrow(new org.springframework.dao.DataIntegrityViolationException("pk_tb_bbs_rcmdtn_hstry"));

        assertThatThrownBy(() -> boardService.incrementLike("BBS_01", 1L))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.DUPLICATE_RESOURCE);
        verify(boardRepository, never()).incrementLikeCntAtomic(any(Long.class));
    }

    @Test
    @DisplayName("🔐 남의 비밀글은 추천할 수 없다 — 읽을 수 없는 글을 번호만 알아 추천하지 못한다 (DIP I6 ④)")
    void incrementLike_rejectsUnreadableSecretPost() {
        given(boardRepository.findActiveArticleDetail("BBS_01", 1L)).willReturn(Optional.of(
                BoardDetailResult.builder().pstSn(1L).bbsId("BBS_01").userId("writer").scrtYn("Y").build()));
        securityUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of("stranger"));

        assertThatThrownBy(() -> boardService.incrementLike("BBS_01", 1L)).isInstanceOf(BusinessException.class);
        verify(recommendationRepository, never()).saveAndFlush(any());
        verify(boardRepository, never()).incrementLikeCntAtomic(any(Long.class));
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
        boardService.getBoardPosts(bbsId, "0", "word", "regDate", "2023-01-01", "2023-12-31", null, null, null, pageable, BoardPostListFilter.NONE);

        // then
        verify(boardRepository)
                .searchArticles(argThat(cond -> cond.getStartDate() != null && cond.getEndDate() != null), any());
    }

    @Test
    @DisplayName("잘못된 날짜 형식은 조용히 무시하지 않고 거절한다")
    void getBoardPosts_InvalidDates() {
        /*
         * [2026-08-28] 이 테스트는 종전에 **틀린 동작을 동결하고 있었다** — 파싱 실패 시
         * 조건을 null 로 두고 그냥 조회하는 것을 정상으로 검증했다.
         *
         * 그 결과가 실제 결함이었다. 화면이 ISO 문자열(toISOString())을 보내고 있었으므로
         * 기간 조건은 **항상** 파싱에 실패해 사라졌고, 사용자는 기간을 골라도 목록이 그대로인
         * 것을 보며 "해당 기간에 글이 이만큼 있구나" 로 잘못 읽었다. 조건을 못 읽으면 조용히
         * 넓은 결과를 주는 것보다 거절하는 편이 안전하다.
         */
        String bbsId = "BBS_01";
        Pageable pageable = PageRequest.of(0, 10);
        BoardMaster master = BoardMaster.builder().bbsId(bbsId).build();
        given(boardMasterRepository.findById(bbsId)).willReturn(Optional.of(master));

        BusinessException thrown = assertThrows(BusinessException.class, () -> boardService.getBoardPosts(
                bbsId, "0", "word", "regDate", "invalid-date", "invalid-date", null, null, null, pageable, BoardPostListFilter.NONE));

        assertEquals(CommonErrorCode.INVALID_INPUT_VALUE, thrown.getErrorCode());
        assertTrue(thrown.getMessage().contains("yyyy-MM-dd"), "형식을 알려 주지 않으면 고칠 수 없다");
        // 거절했으므로 조회 자체가 나가지 않는다.
        verify(boardRepository, never()).searchArticles(any(), any());
    }

    @Test
    @DisplayName("yyyy-MM-dd 기간 조건은 그대로 조회 조건이 된다")
    void getBoardPosts_appliesIsoDateFilter() {
        String bbsId = "BBS_01";
        Pageable pageable = PageRequest.of(0, 10);
        BoardMaster master = BoardMaster.builder().bbsId(bbsId).build();
        given(boardMasterRepository.findById(bbsId)).willReturn(Optional.of(master));
        given(boardRepository.searchArticles(any(), any())).willReturn(Page.empty());

        boardService.getBoardPosts(bbsId, "0", "", "regDate", "2026-08-01", "2026-08-31", null, null, null, pageable, BoardPostListFilter.NONE);

        verify(boardRepository).searchArticles(argThat(cond ->
                cond.getStartDate() != null
                        && cond.getStartDate().toLocalDate().equals(java.time.LocalDate.of(2026, 8, 1))
                        && cond.getEndDate() != null
                        && cond.getEndDate().toLocalDate().equals(java.time.LocalDate.of(2026, 8, 31))), any());
    }

    @Test
    @DisplayName("작성자를 찾을 수 없는 경우 익명으로 게시글 생성")
    void createPost_UserNotFound() {
        // given
        String userId = "unknown";
        BoardSaveRequest request = new BoardSaveRequest("BBS_01", "Subj", "Cont", null, null, null, null, null, null, null, null, null, null);
        BoardMaster master = BoardMaster.builder().bbsId("BBS_01").build();

        given(boardMasterRepository.findByIdWithPessimisticLock("BBS_01")).willReturn(Optional.of(master));
        given(userService.getUserById(userId)).willThrow(new BusinessException(UserErrorCode.USER_NOT_FOUND));
        given(boardRepository.findMaxSortOrdr("BBS_01")).willReturn(0L);
        given(boardRepository.save(any(Board.class))).willAnswer(invocation -> persistWithGeneratedPstSn(invocation.getArgument(0)));

        // when
        Long pstSn = boardService.createPost(userId, request);

        // then
        assertThat(pstSn).isEqualTo(1L);
        verify(boardRepository).save(argThat(b -> "unknown".equals(b.getUserId()) && "익명".equals(b.getUserNm())));
    }

    @Test
    @DisplayName("사용자 조회 중 예외 발생 시 익명으로 게시글 생성")
    void createPost_UserError() {
        // given
        String userId = "errorUser";
        BoardSaveRequest request = new BoardSaveRequest("BBS_01", "Subj", "Cont", null, null, null, null, null, null, null, null, null, null);
        BoardMaster master = BoardMaster.builder().bbsId("BBS_01").build();

        given(boardMasterRepository.findByIdWithPessimisticLock("BBS_01")).willReturn(Optional.of(master));
        given(userService.getUserById(userId)).willThrow(new RuntimeException("DB Error"));
        given(boardRepository.findMaxSortOrdr("BBS_01")).willReturn(0L);
        given(boardRepository.save(any(Board.class))).willAnswer(invocation -> persistWithGeneratedPstSn(invocation.getArgument(0)));

        // when
        Long pstSn = boardService.createPost(userId, request);

        // then
        assertThat(pstSn).isEqualTo(1L);
        verify(boardRepository).save(argThat(b -> "errorUser".equals(b.getUserId()) && "익명".equals(b.getUserNm())));
    }

    @Test
    @DisplayName("작성자는 인증 주체(userId)+조회한 저자명으로 저장 — 요청 DTO에 저자 필드 없음(타입수준 위조 차단)")
    void createPost_AuthorFromAuthenticatedPrincipal() {
        // given — 요청 DTO(BoardSaveRequest)에서 userId/userNm 필드를 제거해 클라이언트가 저자를 지정할 방법 자체가 없다.
        String userId = "user1";
        BoardSaveRequest request = new BoardSaveRequest("BBS_01", "Subj", "Cont", null, null, null, null, null, null, null, null, null, null);
        BoardMaster master = BoardMaster.builder().bbsId("BBS_01").build();
        UserDto author = UserDto.builder().userId(userId).userNm("실제작성자").build();

        given(boardMasterRepository.findByIdWithPessimisticLock("BBS_01")).willReturn(Optional.of(master));
        given(userService.getUserById(userId)).willReturn(author);
        given(boardRepository.findMaxSortOrdr("BBS_01")).willReturn(0L);
        given(boardRepository.save(any(Board.class))).willAnswer(invocation -> persistWithGeneratedPstSn(invocation.getArgument(0)));

        // when
        boardService.createPost(userId, request);

        // then — 저자는 인증 userId + 조회한 저자명으로 저장된다
        verify(boardRepository).save(argThat(b -> "user1".equals(b.getUserId()) && "실제작성자".equals(b.getUserNm())));
    }

    // ── [2026-09-27 DIP B5 F9] 게시판 설정 집행 ───────────────────────────────────────────

    private static org.springframework.mock.web.MockMultipartFile upload(String name, int bytes) {
        return new org.springframework.mock.web.MockMultipartFile("files", name, "text/plain", new byte[bytes]);
    }

    @Test
    @DisplayName("[DIP B5 F9] 댓글·만족도를 쓰지 않는 게시판은 새 댓글·평가를 거부하고, 쓰는 게시판은 통과시킨다")
    void commentAndRatingGuardsFollowBoardSettings() {
        given(boardMasterRepository.findById("OFF")).willReturn(Optional.of(
                BoardMaster.builder().bbsId("OFF").ansYn("N").stsfdgYn("N").build()));
        given(boardMasterRepository.findById("ON")).willReturn(Optional.of(
                BoardMaster.builder().bbsId("ON").ansYn("Y").stsfdgYn("Y").build()));

        assertThatThrownBy(() -> boardService.assertCommentsEnabled("OFF"))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_STATE)
                .hasMessageContaining("댓글");
        assertThatThrownBy(() -> boardService.assertSatisfactionEnabled("OFF"))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_STATE)
                .hasMessageContaining("만족도");
        boardService.assertCommentsEnabled("ON");
        boardService.assertSatisfactionEnabled("ON");
        // 값을 보내지 않고 만든 게시판은 지금까지의 동작(받음)을 유지한다.
        BoardMaster unspecified = BoardMaster.builder().bbsId("DEFAULT").build();
        assertThat(unspecified.getAnsYn()).isEqualTo("Y");
        assertThat(unspecified.getStsfdgYn()).isEqualTo("Y");
    }

    @Test
    @DisplayName("[DIP B5 F9] 첨부를 받지 않거나, 파일 수·파일당 크기를 넘는 첨부는 저장하기 전에 거부한다")
    void createPostWithFilesEnforcesBoardAttachmentSettingsBeforeUpload() throws IOException {
        BoardSaveRequest request = new BoardSaveRequest("BBS_01", "Subj", "Cont", null, null, null, null, null, null, null, null, null, null);
        given(boardMasterRepository.findById("BBS_01")).willReturn(Optional.of(BoardMaster.builder().bbsId("BBS_01")
                .fileAtchPsbltyYn("N").atchPsbltyFileQty(3).build()));
        assertThatThrownBy(() -> boardService.createPostWithFiles("user1", request, java.util.List.of(upload("a.txt", 1))))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_STATE)
                .hasMessageContaining("파일 첨부를 받지 않습니다");

        given(boardMasterRepository.findById("BBS_01")).willReturn(Optional.of(BoardMaster.builder().bbsId("BBS_01")
                .fileAtchPsbltyYn("Y").atchPsbltyFileQty(2).atchPsbltyFileSz(1024L * 1024L).build()));
        assertThatThrownBy(() -> boardService.createPostWithFiles("user1", request,
                java.util.List.of(upload("a.txt", 1), upload("b.txt", 1), upload("c.txt", 1))))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE)
                .hasMessageContaining("최대 2개");
        assertThatThrownBy(() -> boardService.createPostWithFiles("user1", request,
                java.util.List.of(upload("big.txt", 1024 * 1024 + 1))))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE)
                .hasMessageContaining("최대 1MB");

        verify(fileService, never()).uploadBoardFiles(any());
        verify(boardRepository, never()).save(any(Board.class));
    }

    @Test
    @DisplayName("[DIP B5 F9] 수정은 이미 붙은 파일과 새 파일을 합쳐 센다 — 파일 수 상한이 0 이하면 게시판 상한이 없다")
    void updatePostWithFilesCountsExistingAttachments() throws IOException {
        Long pstSn = 1L;
        BoardSaveRequest request = new BoardSaveRequest("BBS_01", "Upd", "Cont", null, null, null, null, null, null, null, null, null, 0);
        Board board = Board.builder().bbsId("BBS_01").pstSn(pstSn).userId("user1").atchFileSn(77L).build();
        given(boardRepository.findById(pstSn)).willReturn(Optional.of(board));
        org.springframework.test.util.ReflectionTestUtils.setField(board, "version", 0); // [ADR-0040 결정 10] 상세에서 읽은 버전과 같다
        securityUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of("user1"));
        given(fileService.getFileList(77L)).willReturn(java.util.Collections.nCopies(2, (nuri.business.service.file.dto.FileDto) null));
        given(boardMasterRepository.findById("BBS_01")).willReturn(Optional.of(BoardMaster.builder().bbsId("BBS_01")
                .fileAtchPsbltyYn("Y").atchPsbltyFileQty(3).build()));

        assertThatThrownBy(() -> boardService.updatePostWithFiles("BBS_01", pstSn, request,
                java.util.List.of(upload("a.txt", 1), upload("b.txt", 1))))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);
        verify(fileService, never()).updateBoardFiles(any(), any());

        boardService.updatePostWithFiles("BBS_01", pstSn, request, java.util.List.of(upload("a.txt", 1)));
        verify(fileService).updateBoardFiles(eq(77L), any());

        given(boardMasterRepository.findById("BBS_01")).willReturn(Optional.of(BoardMaster.builder().bbsId("BBS_01")
                .fileAtchPsbltyYn("Y").atchPsbltyFileQty(0).build()));
        boardService.updatePostWithFiles("BBS_01", pstSn, request,
                java.util.List.of(upload("a.txt", 1), upload("b.txt", 1), upload("c.txt", 1)));
        verify(fileService, times(2)).updateBoardFiles(eq(77L), any());
    }

    @Test
    @DisplayName("[DIP B5 F9] 미리 올린 첨부 묶음을 붙이는 등록도 게시판 파일 수를 지킨다")
    void createPostWithAssignedGroupEnforcesFileCount() {
        given(boardMasterRepository.findByIdWithPessimisticLock("BBS_01")).willReturn(Optional.of(BoardMaster.builder()
                .bbsId("BBS_01").fileAtchPsbltyYn("Y").atchPsbltyFileQty(3).build()));
        given(fileService.getFileList(101L)).willReturn(java.util.Collections.nCopies(4, (nuri.business.service.file.dto.FileDto) null));
        BoardSaveRequest request = new BoardSaveRequest("BBS_01", "Subj", "Cont", null, null, 101L, null, null, null, null, null, null, null);

        assertThatThrownBy(() -> boardService.createPost("user1", request))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE)
                .hasMessageContaining("최대 3개");
        verify(boardRepository, never()).save(any(Board.class));
    }

    /** [2026-09-27 DIP B5 F9] 첨부 설정이 집행되므로 첨부 경로의 게시판은 첨부를 허용해야 한다. */
    private static BoardMaster attachableMaster(String bbsId) {
        return BoardMaster.builder().bbsId(bbsId).fileAtchPsbltyYn("Y").build();
    }

    @Test
    @DisplayName("파일을 포함하여 게시글 생성")
    void createPostWithFiles() throws IOException {
        // given
        String userId = "user1";
        BoardSaveRequest request = new BoardSaveRequest("BBS_01", "Subj", "Cont", null, null, null, null, null, null, null, null, null, null);
        org.springframework.web.multipart.MultipartFile file = mock(
                org.springframework.web.multipart.MultipartFile.class);
        java.util.List<org.springframework.web.multipart.MultipartFile> files = java.util.Collections
                .singletonList(file);

        BoardMaster master = attachableMaster("BBS_01");
        given(boardMasterRepository.findById("BBS_01")).willReturn(Optional.of(master));
        given(boardMasterRepository.findByIdWithPessimisticLock("BBS_01")).willReturn(Optional.of(master));
        given(fileService.uploadBoardFiles(files)).willReturn(101L);
        given(boardRepository.save(any(Board.class))).willAnswer(invocation -> persistWithGeneratedPstSn(invocation.getArgument(0)));

        // when
        boardService.createPostWithFiles(userId, request, files);

        // then
        verify(fileService).uploadBoardFiles(files);
        verify(boardRepository).save(argThat(b -> Long.valueOf(101L).equals(b.getAtchFileSn())));
    }

    @Test
    @DisplayName("게시글 생성 - 타인이 업로드한 첨부는 저장 전에 거부한다")
    void createPost_rejectsForeignAttachmentBeforeSave() {
        given(boardMasterRepository.findByIdWithPessimisticLock("BBS_01"))
                .willReturn(Optional.of(BoardMaster.builder().bbsId("BBS_01").build()));
        BoardSaveRequest request = new BoardSaveRequest(
                "BBS_01", "Subj", "Cont", null, null, 101L,
                null, null, null, null, null, null, null);
        doThrow(new BusinessException(CommonErrorCode.ACCESS_DENIED))
                .when(attachmentAssignmentPolicy).assertAssignable(101L);

        assertThatThrownBy(() -> boardService.createPost("user1", request))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);

        verify(boardRepository, never()).save(any(Board.class));
    }

    @Test
    @DisplayName("게시글 생성 - 없는 게시판은 첨부 식별자를 조회하기 전에 거부한다")
    void createPost_missingBoardPrecedesAttachmentProbe() {
        given(boardMasterRepository.findByIdWithPessimisticLock("MISSING"))
                .willReturn(Optional.empty());
        BoardSaveRequest request = new BoardSaveRequest(
                "MISSING", "Subj", "Cont", null, null, 101L,
                null, null, null, null, null, null, null);

        assertThatThrownBy(() -> boardService.createPost("user1", request))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", BoardErrorCode.BOARD_NOT_FOUND);

        verifyNoInteractions(attachmentAssignmentPolicy);
        verify(boardRepository, never()).save(any(Board.class));
    }

    @Test
    @DisplayName("작성자를 찾을 수 없는 경우 익명으로 답글 생성")
    void replyPost_UserNotFound() {
        // given
        String userId = "unknown";
        Long parentId = 1L;
        BoardSaveRequest request = new BoardSaveRequest("BBS_01", "Reply", "Cont", null, null, null, null, null, null, null, null, null, null);
        BoardMaster master = BoardMaster.builder().bbsId("BBS_01").build();
        Board parent = Board.builder().bbsId("BBS_01").pstSn(parentId).sortOrdr(100L).ansLv(0).build();

        given(boardMasterRepository.findByIdWithPessimisticLock("BBS_01")).willReturn(Optional.of(master));
        given(boardRepository.findById(parentId)).willReturn(Optional.of(parent));
        given(userService.getUserById(userId)).willThrow(new BusinessException(UserErrorCode.USER_NOT_FOUND));
        given(boardRepository.findMaxAnsSn(any(), any())).willReturn(0L);
        given(boardRepository.save(any(Board.class))).willAnswer(invocation -> persistWithGeneratedPstSn(invocation.getArgument(0)));

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
        Long parentId = 1L;
        BoardSaveRequest request = new BoardSaveRequest("BBS_01", "Reply", "Cont", null, null, null, null, null, null, null, null, null, null);
        org.springframework.web.multipart.MultipartFile file = mock(
                org.springframework.web.multipart.MultipartFile.class);
        java.util.List<org.springframework.web.multipart.MultipartFile> files = java.util.Collections
                .singletonList(file);

        BoardMaster master = attachableMaster("BBS_01");
        Board parent = Board.builder().bbsId("BBS_01").pstSn(parentId).sortOrdr(100L).ansLv(0).build();
        given(boardMasterRepository.findById("BBS_01")).willReturn(Optional.of(master));
        given(boardMasterRepository.findByIdWithPessimisticLock("BBS_01")).willReturn(Optional.of(master));
        given(boardRepository.findById(parentId)).willReturn(Optional.of(parent));
        given(fileService.uploadBoardFiles(files)).willReturn(101L);
        given(boardRepository.save(any(Board.class))).willAnswer(invocation -> persistWithGeneratedPstSn(invocation.getArgument(0)));

        // when
        boardService.replyPostWithFiles(userId, parentId, request, files);

        // then
        verify(fileService).uploadBoardFiles(files);
    }

    @Test
    @DisplayName("답글 생성 - 타인이 업로드한 첨부는 저장 전에 거부한다")
    void replyPost_rejectsForeignAttachmentBeforeSave() {
        Long parentSn = 7L;
        given(boardMasterRepository.findByIdWithPessimisticLock("BBS_01"))
                .willReturn(Optional.of(BoardMaster.builder().bbsId("BBS_01").build()));
        given(boardRepository.findById(parentSn))
                .willReturn(Optional.of(Board.builder().bbsId("BBS_01").pstSn(parentSn).sortOrdr(10L).build()));
        BoardSaveRequest request = new BoardSaveRequest(
                "BBS_01", "Reply", "Cont", null, null, 101L,
                null, null, null, null, null, null, null);
        doThrow(new BusinessException(CommonErrorCode.ACCESS_DENIED))
                .when(attachmentAssignmentPolicy).assertAssignable(101L);

        assertThatThrownBy(() -> boardService.replyPost("user1", parentSn, request))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);

        verify(boardRepository, never()).save(any(Board.class));
    }

    @Test
    @DisplayName("답글 생성 - 없는 부모글은 첨부 식별자를 조회하기 전에 거부한다")
    void replyPost_missingParentPrecedesAttachmentProbe() {
        given(boardMasterRepository.findByIdWithPessimisticLock("BBS_01"))
                .willReturn(Optional.of(BoardMaster.builder().bbsId("BBS_01").build()));
        given(boardRepository.findById(7L)).willReturn(Optional.empty());
        BoardSaveRequest request = new BoardSaveRequest(
                "BBS_01", "Reply", "Cont", null, null, 101L,
                null, null, null, null, null, null, null);

        assertThatThrownBy(() -> boardService.replyPost("user1", 7L, request))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", BoardErrorCode.ARTICLE_NOT_FOUND);

        verifyNoInteractions(attachmentAssignmentPolicy);
        verify(boardRepository, never()).save(any(Board.class));
    }

    @Test
    @DisplayName("행사 날짜가 포함된 게시글 수정")
    void updatePost_WithEventDate() {
        // given
        String bbsId = "BBS_01";
        Long pstSn = 1L;
        String eventDateStr = "2023-12-25T10:00:00";
        String userId = "user1";
        BoardSaveRequest request = new BoardSaveRequest(bbsId, "Upd", "Cont", null, null, null, eventDateStr, null, null, null, null, null, 0);
        Board board = org.mockito.Mockito.spy(Board.builder().bbsId("BBS_01").pstSn(pstSn).userId(userId).build());
        given(boardRepository.findById(pstSn)).willReturn(Optional.of(board));
        org.springframework.test.util.ReflectionTestUtils.setField(board, "version", 0); // [ADR-0040 결정 10] 상세에서 읽은 버전과 같다
        securityUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of(userId));

        // when
        boardService.updatePost(bbsId, pstSn, request);

        // then
        verify(board).update(any(), any(), any(), any(), any(), any(), any(), any(),
                eq(java.time.LocalDateTime.parse(eventDateStr)), any(), any(), any());
    }

    /**
     * 요청에 없던 값을 조용히 지우지 않는다.
     *
     * <p>종전 {@code updatePost} 는 같은 호출 안에서 두 규칙이 섞여 있었다 — pswd·qnaSttsCd 만
     * "안 보내면 기존 값 유지"였고 게시 기간·행사 일자·Q&A 분류·첨부·비밀글 여부는 "안 보내면
     * null 로 덮어쓰기"였다. {@code Board.update} 는 널 가드가 없어 전달값을 그대로 대입한다.
     *
     * <p>수정 화면은 제목·본문 위주의 폼이라 그 값들을 싣지 않는다. 그래서 일정 게시판 글의
     * 제목 오타 하나를 고치면 evntDt 가 사라져 <b>그 글이 캘린더에서 없어졌다</b>. 저장은
     * 성공하고 화면도 정상으로 보이므로 아무도 눈치채지 못하는 데이터 손실이다.
     */
    @Test
    @DisplayName("게시글 수정 - 요청에 없는 값은 기존 값을 유지한다 (조용한 손실 방지)")
    void updatePost_keepsFieldsAbsentFromRequest() {
        String bbsId = "BBS_01";
        Long pstSn = 1L;
        String userId = "user1";
        java.time.LocalDateTime existingEvent = java.time.LocalDateTime.of(2026, 5, 1, 0, 0);

        Board board = org.mockito.Mockito.spy(Board.builder().bbsId("BBS_01")
                .pstSn(pstSn)
                .userId(userId)
                .pstBgngYmd("20260101")
                .pstEndYmd("20261231")
                .atchFileSn(77L)
                .evntDt(existingEvent)
                .qnaCatCd("CAT01")
                .scrtYn("Y")
                .build());
        given(boardRepository.findById(pstSn)).willReturn(Optional.of(board));
        org.springframework.test.util.ReflectionTestUtils.setField(board, "version", 0); // [ADR-0040 결정 10] 상세에서 읽은 버전과 같다
        securityUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of(userId));

        // 제목·본문만 담긴 요청 — 수정 화면이 실제로 보내는 형태다.
        BoardSaveRequest request = new BoardSaveRequest(
                bbsId, "제목만 고침", "본문만 고침",
                null, null, null, null, null, null, null, null, null, 0);

        boardService.updatePost(bbsId, pstSn, request);

        verify(board).update(
                eq("제목만 고침"), eq("본문만 고침"), any(), any(), any(),
                eq("20260101"), eq("20261231"),
                eq(77L), eq(existingEvent),
                any(), eq("CAT01"), eq("Y"));
    }

    @Test
    @DisplayName("게시글 수정 - 날짜만(YYYY-MM-DD) 온 행사일자를 자정으로 보존한다")
    void updatePost_parsesDateOnlyEventDate() {
        // 화면의 날짜 입력은 type="date" 라 정확히 10자로 들어온다. 종전 updatePost 는 전용 파서에서
        // LocalDateTime.parse 만 시도해 이 형식을 파싱하지 못했고, 경고 로그 한 줄만 남기고
        // **행사일자를 조용히 null 로** 덮어썼다. createPost 는 같은 입력을 이미 보존하고 있었다.
        String bbsId = "BBS_01";
        Long pstSn = 1L;
        String userId = "user1";
        BoardSaveRequest request = new BoardSaveRequest(bbsId, "Upd", "Cont", null, null, null, "2026-03-01", null, null, null, null, null, 0);
        Board board = org.mockito.Mockito.spy(Board.builder().bbsId("BBS_01").pstSn(pstSn).userId(userId).build());
        given(boardRepository.findById(pstSn)).willReturn(Optional.of(board));
        org.springframework.test.util.ReflectionTestUtils.setField(board, "version", 0); // [ADR-0040 결정 10] 상세에서 읽은 버전과 같다
        securityUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of(userId));

        boardService.updatePost(bbsId, pstSn, request);

        verify(board).update(any(), any(), any(), any(), any(), any(), any(), any(),
                eq(java.time.LocalDate.of(2026, 3, 1).atStartOfDay()), any(), any(), any());
    }

    @Test
    @DisplayName("잘못된 행사 날짜 형식이 포함된 게시글 수정 (예외 처리 확인)")
    void updatePost_InvalidEventDate() {
        // given
        String bbsId = "BBS_01";
        Long pstSn = 1L;
        String userId = "user1";
        BoardSaveRequest request = new BoardSaveRequest(bbsId, "Upd", "Cont", null, null, null, "invalid-date", null, null, null, null, null, 0);
        Board board = org.mockito.Mockito.spy(Board.builder().bbsId("BBS_01").pstSn(pstSn).userId(userId).build());
        given(boardRepository.findById(pstSn)).willReturn(Optional.of(board));
        org.springframework.test.util.ReflectionTestUtils.setField(board, "version", 0); // [ADR-0040 결정 10] 상세에서 읽은 버전과 같다
        securityUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of(userId));

        // when
        boardService.updatePost(bbsId, pstSn, request);

        // then
        verify(board).update(any(), any(), any(), any(), any(), any(), any(), any(), isNull(), any(), any(), any());
    }

    @Test
    @DisplayName("새 파일을 업로드하며 게시글 수정 (첨부파일 ID 없음)")
    void updatePostWithFiles_NewFiles() throws IOException {
        // given
        String bbsId = "BBS_01";
        Long pstSn = 1L;
        BoardSaveRequest request = new BoardSaveRequest(bbsId, "Upd", "Cont", null, null, null, null, null, null, null,
                null, null, 0);
        org.springframework.web.multipart.MultipartFile file = mock(
                org.springframework.web.multipart.MultipartFile.class);
        java.util.List<org.springframework.web.multipart.MultipartFile> files = java.util.Collections
                .singletonList(file);

        Board board = Board.builder().bbsId("BBS_01").pstSn(pstSn).userId("user1").build();
        given(boardRepository.findById(pstSn)).willReturn(Optional.of(board));
        org.springframework.test.util.ReflectionTestUtils.setField(board, "version", 0); // [ADR-0040 결정 10] 상세에서 읽은 버전과 같다
        given(boardMasterRepository.findById("BBS_01")).willReturn(Optional.of(attachableMaster("BBS_01")));
        securityUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of("user1"));
        given(fileService.uploadBoardFiles(files)).willReturn(102L);

        // when
        boardService.updatePostWithFiles(bbsId, pstSn, request, files);

        // then
        verify(fileService).uploadBoardFiles(files);
        assertThat(board.getAtchFileSn()).isEqualTo(102L);
    }

    @Test
    @DisplayName("🚨 요청이 첨부 번호를 싣지 않아도 글의 기존 첨부 묶음에 더한다 — 기존 첨부가 떨어져 나가지 않는다 (DIP I1)")
    void updatePostWithFiles_appendsToExistingGroupWhenRequestOmitsIt() throws IOException {
        String bbsId = "BBS_01";
        Long pstSn = 1L;
        BoardSaveRequest request = new BoardSaveRequest(bbsId, "Upd", "Cont", null, null, null, null, null, null, null,
                null, null, 0);
        org.springframework.web.multipart.MultipartFile file = mock(
                org.springframework.web.multipart.MultipartFile.class);
        java.util.List<org.springframework.web.multipart.MultipartFile> files = java.util.Collections
                .singletonList(file);
        Board board = Board.builder().bbsId("BBS_01").pstSn(pstSn).userId("user1").atchFileSn(77L).build();
        given(boardRepository.findById(pstSn)).willReturn(Optional.of(board));
        org.springframework.test.util.ReflectionTestUtils.setField(board, "version", 0); // [ADR-0040 결정 10] 상세에서 읽은 버전과 같다
        given(boardMasterRepository.findById("BBS_01")).willReturn(Optional.of(attachableMaster("BBS_01")));
        securityUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of("user1"));

        boardService.updatePostWithFiles(bbsId, pstSn, request, files);

        verify(fileService).updateBoardFiles(77L, files);
        verify(fileService, never()).uploadBoardFiles(any());
        assertThat(board.getAtchFileSn()).isEqualTo(77L);
    }

    @Test
    @DisplayName("🚨 없는 게시판이면 파일을 저장하기 전에 거부한다 — 거부된 요청이 디스크에 파일을 남기지 않는다 (DIP I2)")
    void createPostWithFiles_rejectsMissingBoardBeforeUpload() throws IOException {
        BoardSaveRequest request = new BoardSaveRequest("MISSING", "Subj", "Cont", null, null, null, null, null, null, null, null, null, null);
        java.util.List<org.springframework.web.multipart.MultipartFile> files = java.util.Collections
                .singletonList(mock(org.springframework.web.multipart.MultipartFile.class));
        given(boardMasterRepository.findById("MISSING")).willReturn(Optional.empty());

        assertThatThrownBy(() -> boardService.createPostWithFiles("user1", request, files))
                .isInstanceOf(BusinessException.class);

        verify(fileService, never()).uploadBoardFiles(any());
        verify(boardRepository, never()).save(any(Board.class));
    }

    @Test
    @DisplayName("🚨 회원 전용 게시판의 비회원은 파일을 저장하기 전에 거부된다 (DIP I2)")
    void createPostWithFiles_rejectsNonMemberBeforeUpload() throws IOException {
        BoardSaveRequest request = new BoardSaveRequest("CMNTY_BBS", "Subj", "Cont", null, null, null, null, null, null, null, null, null, null);
        java.util.List<org.springframework.web.multipart.MultipartFile> files = java.util.Collections
                .singletonList(mock(org.springframework.web.multipart.MultipartFile.class));
        given(boardMasterRepository.findById("CMNTY_BBS"))
                .willReturn(Optional.of(BoardMaster.builder().bbsId("CMNTY_BBS").cmntySn(7L).build()));
        securityUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of("outsider"));
        given(communityBoardAccess.isApprovedMember(7L, "outsider")).willReturn(false);

        assertThatThrownBy(() -> boardService.createPostWithFiles("outsider", request, files))
                .isInstanceOf(BusinessException.class);

        verify(fileService, never()).uploadBoardFiles(any());
    }

    @Test
    @DisplayName("수정 화면용 상세 조회는 조회수를 올리지 않는다 — 열람 가드는 같다 (DIP I8)")
    void getPostDetail_withoutViewCount() {
        BoardDetailResult detail = BoardDetailResult.builder()
                .pstSn(5L).bbsId("BBS_01").userId("ESNTL_owner").scrtYn("N").build();
        given(boardRepository.findActiveArticleDetail("BBS_01", 5L)).willReturn(Optional.of(detail));

        assertThat(boardService.getPostDetail("BBS_01", 5L, false).pstSn()).isEqualTo(5L);
        verify(viewCountService, never()).increaseViewCount(anyLong());

        boardService.getPostDetail("BBS_01", 5L, true);
        verify(viewCountService).increaseViewCount(5L);
    }

    @Test
    @DisplayName("Q&A 질문은 작성자가 해결됨으로 표시할 수 있다 (DIP I3)")
    void markQuestionSolved_byAuthor() {
        given(boardMasterRepository.findById("QNA")).willReturn(Optional.of(
                BoardMaster.builder().bbsId("QNA").tmpltId("TMPLT_QNA").build()));
        Board board = Board.builder().bbsId("QNA").pstSn(9L).userId("author").qnaSttsCd("QA01").build();
        given(boardRepository.findById(9L)).willReturn(Optional.of(board));
        securityUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of("author"));

        boardService.markQuestionSolved("QNA", 9L);

        assertThat(board.getQnaSttsCd()).isEqualTo("SOLVED");
        assertThat(board.getPstTtl()).as("다른 필드는 건드리지 않는다").isNull();
    }

    @Test
    @DisplayName("🔐 작성자가 아니고 전체 수정 권한도 없으면 해결 표시를 거부한다 (DIP I3)")
    void markQuestionSolved_rejectsOthers() {
        given(boardMasterRepository.findById("QNA")).willReturn(Optional.of(
                BoardMaster.builder().bbsId("QNA").tmpltId("TMPLT_QNA").build()));
        Board board = Board.builder().bbsId("QNA").pstSn(9L).userId("author").qnaSttsCd("QA01").build();
        given(boardRepository.findById(9L)).willReturn(Optional.of(board));
        securityUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of("stranger"));

        assertThatThrownBy(() -> boardService.markQuestionSolved("QNA", 9L)).isInstanceOf(BusinessException.class);
        assertThat(board.getQnaSttsCd()).isEqualTo("QA01");
    }

    @Test
    @DisplayName("Q&A 템플릿이 아닌 게시판의 글은 해결 상태가 없으므로 400 이다 (DIP I3)")
    void markQuestionSolved_rejectsNonQnaBoard() {
        given(boardMasterRepository.findById("NOTICE")).willReturn(Optional.of(
                BoardMaster.builder().bbsId("NOTICE").tmpltId("TMPLT_LIST").build()));

        assertThatThrownBy(() -> boardService.markQuestionSolved("NOTICE", 9L))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);
        verify(boardRepository, never()).findById(anyLong());
    }

    @Test
    @DisplayName("기존 파일을 갱신하며 게시글 수정 (첨부파일 ID 존재)")
    void updatePostWithFiles_ExistingFiles() throws IOException {
        // given
        String bbsId = "BBS_01";
        Long pstSn = 1L;
        Long atchFileSn = 101L;
        BoardSaveRequest request = new BoardSaveRequest(bbsId, "Upd", "Cont", null, null, atchFileSn, null, null, null, null, null, null, 0);
        org.springframework.web.multipart.MultipartFile file = mock(
                org.springframework.web.multipart.MultipartFile.class);
        java.util.List<org.springframework.web.multipart.MultipartFile> files = java.util.Collections
                .singletonList(file);

        Board board = Board.builder().bbsId("BBS_01").pstSn(pstSn).userId("user1").build();
        given(boardRepository.findById(pstSn)).willReturn(Optional.of(board));
        org.springframework.test.util.ReflectionTestUtils.setField(board, "version", 0); // [ADR-0040 결정 10] 상세에서 읽은 버전과 같다
        given(boardMasterRepository.findById("BBS_01")).willReturn(Optional.of(attachableMaster("BBS_01")));
        securityUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of("user1"));

        // when
        boardService.updatePostWithFiles(bbsId, pstSn, request, files);

        // then
        org.mockito.InOrder authorizationBeforeFileMutation = inOrder(attachmentAssignmentPolicy, fileService);
        authorizationBeforeFileMutation.verify(attachmentAssignmentPolicy).assertAssignable(atchFileSn);
        authorizationBeforeFileMutation.verify(fileService).updateBoardFiles(eq(atchFileSn), eq(files));
    }

    @Test
    @DisplayName("파일 포함 수정 - 게시글 비소유자는 기존 첨부의 물리 갱신 전에 거부한다")
    void updatePostWithFiles_nonOwnerCannotMutateExistingAttachment() throws IOException {
        Long pstSn = 1L;
        Long atchFileSn = 101L;
        Board board = Board.builder().bbsId("BBS_01")
                .pstSn(pstSn)
                .userId("owner")
                .atchFileSn(atchFileSn)
                .build();
        given(boardRepository.findById(pstSn)).willReturn(Optional.of(board));
        securityUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId)
                .thenReturn(Optional.of("other-user"));
        BoardSaveRequest request = new BoardSaveRequest(
                "BBS_01", "Upd", "Cont", null, null, atchFileSn,
                null, null, null, null, null, null, null);
        org.springframework.web.multipart.MultipartFile file = mock(
                org.springframework.web.multipart.MultipartFile.class);
        java.util.List<org.springframework.web.multipart.MultipartFile> files = java.util.List.of(file);

        assertThatThrownBy(() -> boardService.updatePostWithFiles("BBS_01", pstSn, request, files))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);

        verify(fileService, never()).updateBoardFiles(anyLong(), anyList());
        verify(fileService, never()).uploadBoardFiles(anyList());
    }

    @Test
    @DisplayName("파일 포함 수정 - 게시글 비소유자는 새 파일 업로드 전에 거부한다")
    void updatePostWithFiles_nonOwnerCannotUploadNewAttachment() throws IOException {
        Long pstSn = 1L;
        Board board = Board.builder().bbsId("BBS_01").pstSn(pstSn).userId("owner").build();
        given(boardRepository.findById(pstSn)).willReturn(Optional.of(board));
        securityUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId)
                .thenReturn(Optional.of("other-user"));
        BoardSaveRequest request = new BoardSaveRequest(
                "BBS_01", "Upd", "Cont", null, null, null,
                null, null, null, null, null, null, null);
        org.springframework.web.multipart.MultipartFile file = mock(
                org.springframework.web.multipart.MultipartFile.class);
        java.util.List<org.springframework.web.multipart.MultipartFile> files = java.util.List.of(file);

        assertThatThrownBy(() -> boardService.updatePostWithFiles("BBS_01", pstSn, request, files))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);

        verify(fileService, never()).uploadBoardFiles(anyList());
        verify(fileService, never()).updateBoardFiles(anyLong(), anyList());
    }

    @Test
    @DisplayName("기여자가 없으면 지어내지 않고 없음을 그대로 내린다")
    void getBoardStats_NoContributor() {
        /*
         * [2026-08-29] 종전 이 테스트는 기여자가 없을 때 "System" 을 내리는 것을 **의도된
         * 동작으로 고정**하고 있었다. 그러나 화면은 그 값을 '최다 기여자' 로 그대로 보여 준다 —
         * 글이 한 건도 없는 게시판에서도 '최다 기여자: System' 이 떠서, 관리자는 그런 계정이
         * 실제로 있다고 믿는다. 같은 웨이브에서 커뮤니티 상세의 'System_Admin' 도 같은 이유로
         * 걷어냈다(서버가 채우지 않는 값을 화면이 기본값으로 지어내지 않는다).
         *
         * null 을 그대로 내리면 화면이 '-' 로 렌더해 '없음' 과 '있음' 이 구분된다.
         */
        String bbsId = "BBS_01";
        given(boardMasterRepository.findById(bbsId)).willReturn(Optional.of(
                BoardMaster.builder().bbsId(bbsId).useYn("Y").build()));
        given(boardRepository.aggregateVisibleStats(any(BoardSearchCondition.class)))
                .willReturn(new BoardStatsResult(0L, 0L, null));

        BoardStatsResponse result = boardService.getBoardStats(bbsId);

        assertThat(result.getTopContributor())
                .as("기여자가 없는데 이름을 지어내면 화면이 없는 사용자를 최다 기여자로 보여 준다")
                .isNull();
    }

    @Test
    @DisplayName("존재하지 않는 게시글 조회 시 예외 발생")
    void getPostDetail_NotFound() {
        // given
        given(boardRepository.findActiveArticleDetail(anyString(), any(Long.class))).willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> boardService.getPostDetail("BBS_01", 999L, true))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("게시글 수정 - 작성자 본인이 아니고 관리자도 아니면 접근 거부")
    void updatePost_AccessDenied() {
        Long pstSn = 1L;
        Board board = Board.builder().bbsId("BBS_01").pstSn(pstSn).userId("owner").build();
        given(boardRepository.findById(pstSn)).willReturn(Optional.of(board));
        securityUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of("other_user"));

        BoardSaveRequest request = new BoardSaveRequest("BBS_01", "Upd", "Cont", null, null, null, null, null, null, null, null, null, null);

        assertThatThrownBy(() -> boardService.updatePost("BBS_01", pstSn, request))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
    }

    @Test
    @DisplayName("게시글 삭제 - 작성자 본인이 아니고 관리자도 아니면 접근 거부")
    void deletePost_AccessDenied() {
        Long pstSn = 1L;
        Board board = Board.builder().bbsId("BBS_01").pstSn(pstSn).userId("owner").build();
        given(boardRepository.findById(pstSn)).willReturn(Optional.of(board));
        securityUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of("other_user"));

        assertThatThrownBy(() -> boardService.deletePost("BBS_01", pstSn, "other_user"))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
    }

    @Test
    @DisplayName("파일 업로드 메서드에서 files가 null 이거나 비어있을 때")
    void fileUploadMethods_EmptyFiles() throws IOException {
        String userId = "user1";
        BoardSaveRequest request = new BoardSaveRequest("BBS_01", "Subj", "Cont", null, null, 101L, null, null, null, null, null, null, 0);
        BoardMaster master = BoardMaster.builder().bbsId("BBS_01").build();
        
        // create
        given(boardMasterRepository.findById("BBS_01")).willReturn(Optional.of(master));
        given(boardMasterRepository.findByIdWithPessimisticLock("BBS_01")).willReturn(Optional.of(master));
        given(boardRepository.save(any(Board.class))).willAnswer(invocation -> persistWithGeneratedPstSn(invocation.getArgument(0)));
        
        boardService.createPostWithFiles(userId, request, null);
        boardService.createPostWithFiles(userId, request, Collections.emptyList());
        
        // update
        Board board = Board.builder().bbsId("BBS_01").pstSn(1L).userId(userId).build();
        given(boardRepository.findById(1L)).willReturn(Optional.of(board));
        org.springframework.test.util.ReflectionTestUtils.setField(board, "version", 0); // [ADR-0040 결정 10] 상세에서 읽은 버전과 같다
        securityUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of(userId));
        
        boardService.updatePostWithFiles("BBS_01", 1L, request, null);
        boardService.updatePostWithFiles("BBS_01", 1L, request, Collections.emptyList());

        // reply
        Board parent = Board.builder().bbsId("BBS_01").pstSn(1L).sortOrdr(100L).ansLv(0).build();
        given(boardRepository.findById(1L)).willReturn(Optional.of(parent));
        
        boardService.replyPostWithFiles(userId, 1L, request, null);
        boardService.replyPostWithFiles(userId, 1L, request, Collections.emptyList());

        verify(fileService, never()).uploadBoardFiles(any());
        verify(fileService, never()).updateBoardFiles(any(), any());
    }

    // ------------------------------------------------------------------
    // 통합 검색 (searchAcrossBoards)
    //
    // 이 엔드포인트가 생기기 전까지 /search 화면의 게시글 탭은 항상 빈 결과였다.
    // 아래 테스트들은 "결과가 나온다"보다 **가시성 계약이 새지 않는가**를 고정한다.
    // ------------------------------------------------------------------

    @Test
    @DisplayName("통합 검색 - 게시판을 한정하지 않고 제목으로 활성 글을 찾는다")
    void searchAcrossBoards_searchesTitlesWithoutBoardFilter() {
        Pageable pageable = PageRequest.of(0, 20);
        org.mockito.ArgumentCaptor<BoardSearchCondition> captor =
                org.mockito.ArgumentCaptor.forClass(BoardSearchCondition.class);
        given(boardRepository.searchArticles(captor.capture(), any(Pageable.class)))
                .willReturn(new PageImpl<>(Collections.singletonList(
                        BoardSearchResult.builder().pstSn(7L).pstTtl("연차 신청 안내").build())));

        Page<BoardDto> result = boardService.searchAcrossBoards("연차", pageable);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).pstSn()).isEqualTo(7L);

        BoardSearchCondition condition = captor.getValue();
        // 게시판 한정 술어가 빠져야 전 게시판을 훑는다. 활성 게시판 조인은 저장소 쪽에 있다.
        //   BoardPredicate 는 StringUtils.hasText 로 판정하므로 null 과 "" 가 같은 뜻이다 —
        //   기본 생성자가 어느 쪽을 넣든 술어가 빠지는 것이 계약이다.
        assertThat(org.springframework.util.StringUtils.hasText(condition.getBbsId()))
                .as("게시판 한정 술어가 붙으면 전 게시판 검색이 아니다")
                .isFalse();
        assertThat(condition.getUseYn()).isEqualTo("Y");
        assertThat(condition.getSearchCnd()).as("0 = 제목").isEqualTo("0");
        assertThat(condition.getSearchWrd()).isEqualTo("연차");
    }

    /**
     * 본문은 에디터 HTML 원문이라 검색하면 태그·속성이 매칭된다. 검색 대상이 제목임을
     * 계약으로 고정해, 나중에 조용히 본문 검색으로 넓히지 못하게 한다.
     */
    @Test
    @DisplayName("통합 검색 - 본문(searchCnd=1)으로 넓히지 않는다")
    void searchAcrossBoards_neverSearchesContent() {
        org.mockito.ArgumentCaptor<BoardSearchCondition> captor =
                org.mockito.ArgumentCaptor.forClass(BoardSearchCondition.class);
        given(boardRepository.searchArticles(captor.capture(), any(Pageable.class)))
                .willReturn(new PageImpl<>(Collections.emptyList()));

        boardService.searchAcrossBoards("공지", PageRequest.of(0, 20));

        assertThat(captor.getValue().getSearchCnd()).isNotEqualTo("1");
    }

    @Test
    @DisplayName("통합 검색 - 검색어가 2자 미만이면 저장소를 조회하지 않고 빈 결과를 준다")
    void searchAcrossBoards_rejectsTooShortKeyword() {
        assertThat(boardService.searchAcrossBoards("가", PageRequest.of(0, 20)).getContent()).isEmpty();
        assertThat(boardService.searchAcrossBoards("", PageRequest.of(0, 20)).getContent()).isEmpty();
        assertThat(boardService.searchAcrossBoards(null, PageRequest.of(0, 20)).getContent()).isEmpty();
        assertThat(boardService.searchAcrossBoards("  ", PageRequest.of(0, 20)).getContent()).isEmpty();

        verify(boardRepository, never()).searchArticles(any(BoardSearchCondition.class), any(Pageable.class));
    }

    /**
     * 페이지를 넘겨 가며 전량 수집하는 경로를 만들지 않는다 — 담당자 검색 API 와 같은 이유다.
     */
    @Test
    @DisplayName("통합 검색 - 요청 페이지·크기와 무관하게 첫 페이지 20건으로 상한을 건다")
    void searchAcrossBoards_capsPageSizeAndPageNumber() {
        org.mockito.ArgumentCaptor<Pageable> captor = org.mockito.ArgumentCaptor.forClass(Pageable.class);
        given(boardRepository.searchArticles(any(BoardSearchCondition.class), captor.capture()))
                .willReturn(new PageImpl<>(Collections.emptyList()));

        boardService.searchAcrossBoards("공지", PageRequest.of(9, 500));

        assertThat(captor.getValue().getPageNumber()).isZero();
        assertThat(captor.getValue().getPageSize()).isEqualTo(BoardService.GLOBAL_SEARCH_MAX_RESULTS);
    }

    /**
     * 관리자가 아니면 비밀글은 작성자 본인 것만 보여야 한다. 통합 검색이 게시판 목록과
     * 다른 가시성을 쓰면 목록에서 못 보던 글이 검색으로 새어 나온다(H3 인가 의미 보존).
     */
    @Test
    @DisplayName("통합 검색 - 비관리자에게는 조회자 기준 비밀글 가시성이 적용된다")
    void searchAcrossBoards_appliesSecretPostVisibilityForNonAdmin() {
        securityUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId)
                .thenReturn(Optional.of("USRCNFRM_0001"));
        org.mockito.ArgumentCaptor<BoardSearchCondition> captor =
                org.mockito.ArgumentCaptor.forClass(BoardSearchCondition.class);
        given(boardRepository.searchArticles(captor.capture(), any(Pageable.class)))
                .willReturn(new PageImpl<>(Collections.emptyList()));

        boardService.searchAcrossBoards("공지", PageRequest.of(0, 20));

        assertThat(captor.getValue().isSecretPostAdminOverride()).isFalse();
        assertThat(captor.getValue().getViewerEsntlId()).isEqualTo("USRCNFRM_0001");
    }

    @Test
    @DisplayName("통합 검색 - 관리자에게는 비밀글 우회가 적용된다(게시판 목록과 동일)")
    void searchAcrossBoards_appliesAdminOverride() {
        securityUtilMock.when(() -> nuri.business.security.util.SecurityUtil
                .hasPermission("BOARD_READ_ALL")).thenReturn(true);
        org.mockito.ArgumentCaptor<BoardSearchCondition> captor =
                org.mockito.ArgumentCaptor.forClass(BoardSearchCondition.class);
        given(boardRepository.searchArticles(captor.capture(), any(Pageable.class)))
                .willReturn(new PageImpl<>(Collections.emptyList()));

        boardService.searchAcrossBoards("공지", PageRequest.of(0, 20));

        assertThat(captor.getValue().isSecretPostAdminOverride()).isTrue();
        assertThat(captor.getValue().getViewerEsntlId()).isNull();
    }

    // ── [2026-10-23 ADR-0040 B1] 예약 게시 집행·게시 상태·게시 기간 쓰기 규칙·운영 화면 일정 변경 ─────────────────

    private static nuri.business.service.board.dto.BoardPostPeriodRequest period(String start, String end, Integer version) {
        return new nuri.business.service.board.dto.BoardPostPeriodRequest(start, end, version);
    }

    private static nuri.business.service.board.dto.BoardPostPeriodBatchRequest batch(String action, String end, Long... pstSns) {
        return new nuri.business.service.board.dto.BoardPostPeriodBatchRequest(action, java.util.Arrays.asList(pstSns), end);
    }

    private static Board versionedPost(String bbsId, long pstSn, String userId, String start, String end) {
        Board board = Board.builder().bbsId(bbsId).pstSn(pstSn).userId(userId).pstTtl("제목")
                .pstBgngYmd(start).pstEndYmd(end).build();
        org.springframework.test.util.ReflectionTestUtils.setField(board, "version", 3);
        return board;
    }

    private static BoardSaveRequest edit(String bbsId, String start, String end, Integer version) {
        return new BoardSaveRequest(bbsId, "고친 제목", "고친 본문", start, end, null, null, null, null, null, null, null, version);
    }

    private void allow(String... permissions) {
        for (String permission : permissions) {
            securityUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission(permission)).thenReturn(true);
        }
    }

    private void actAs(String esntlId) {
        securityUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of(esntlId));
    }

    @Test
    @DisplayName("🚨 예약 글(시작일 전)은 남에게 상세·댓글·추천·만족도 경계에서 없는 글과 같은 404 이고, 작성자·조회 대행 권한자에게는 열린다 (ADR-0040 결정 3)")
    void getPostDetail_hidesScheduledPostingFromOthers() {
        BoardDetailResult scheduled = BoardDetailResult.builder().pstSn(8L).bbsId("BBS_01").userId("ESNTL_owner")
                .scrtYn("N").pstBgngYmd(TOMORROW).build();
        given(boardRepository.findActiveArticleDetail("BBS_01", 8L)).willReturn(Optional.of(scheduled));

        actAs("ESNTL_other");
        assertThatThrownBy(() -> boardService.getPostDetail("BBS_01", 8L, false))
                .hasFieldOrPropertyWithValue("errorCode", BoardErrorCode.ARTICLE_NOT_FOUND);
        assertThatThrownBy(() -> boardService.assertCommentAccess("BBS_01", 8L))
                .hasFieldOrPropertyWithValue("errorCode", BoardErrorCode.ARTICLE_NOT_FOUND);
        assertThatThrownBy(() -> boardService.assertCommentReadAccess("BBS_01", 8L))
                .hasFieldOrPropertyWithValue("errorCode", BoardErrorCode.ARTICLE_NOT_FOUND);
        assertThatThrownBy(() -> boardService.incrementLike("BBS_01", 8L))
                .hasFieldOrPropertyWithValue("errorCode", BoardErrorCode.ARTICLE_NOT_FOUND);
        verify(viewCountService, never()).increaseViewCount(anyLong());
        verify(recommendationRepository, never()).saveAndFlush(any());

        actAs("ESNTL_owner");
        assertThat(boardService.getPostDetail("BBS_01", 8L, false).postingStatus())
                .isEqualTo(nuri.business.service.board.dto.PostingStatus.SCHEDULED);

        actAs("ESNTL_other");
        allow("BOARD_READ_ALL");
        assertThat(boardService.getPostDetail("BBS_01", 8L, false).postingStatus())
                .isEqualTo(nuri.business.service.board.dto.PostingStatus.SCHEDULED);
    }

    @Test
    @DisplayName("🚨 KST 자정 경계: 시작일 20261023 글은 2026-10-22T14:59:59Z 에 남에게 404, 15:00:00Z 에 열린다 (ADR-0040 결정 3)")
    void scheduledPostOpensAtSeoulMidnight() {
        given(boardRepository.findActiveArticleDetail("BBS_01", 9L)).willReturn(Optional.of(BoardDetailResult.builder()
                .pstSn(9L).bbsId("BBS_01").userId("ESNTL_owner").scrtYn("N").pstBgngYmd("20261023").build()));
        actAs("ESNTL_other");

        boardService.useClock(java.time.Clock.fixed(java.time.Instant.parse("2026-10-22T14:59:59Z"), java.time.ZoneOffset.UTC));
        assertThatThrownBy(() -> boardService.getPostDetail("BBS_01", 9L, false))
                .hasFieldOrPropertyWithValue("errorCode", BoardErrorCode.ARTICLE_NOT_FOUND);

        boardService.useClock(java.time.Clock.fixed(java.time.Instant.parse("2026-10-22T15:00:00Z"), java.time.ZoneOffset.UTC));
        assertThat(boardService.getPostDetail("BBS_01", 9L, false).postingStatus())
                .isEqualTo(nuri.business.service.board.dto.PostingStatus.POSTING);
    }

    @Test
    @DisplayName("목록 응답에 서버 판정 게시 상태(SCHEDULED·POSTING·ENDED)를 싣는다 — 시작 '' 와 종료일 당일은 게시 중이다")
    void getBoardPosts_carriesServerPostingStatus() {
        Pageable pageable = PageRequest.of(0, 10);
        given(boardRepository.searchArticles(any(BoardSearchCondition.class), eq(pageable))).willReturn(new PageImpl<>(java.util.List.of(
                BoardSearchResult.builder().pstSn(1L).pstBgngYmd(TOMORROW).build(),
                BoardSearchResult.builder().pstSn(2L).pstBgngYmd("").pstEndYmd(TODAY).build(),
                BoardSearchResult.builder().pstSn(3L).pstEndYmd(YESTERDAY).build(),
                BoardSearchResult.builder().pstSn(4L).pstBgngYmd("20261030").pstEndYmd(YESTERDAY).build())));

        Page<BoardDto> page = boardService.getBoardPosts("BBS_01", pageable);

        assertThat(page.getContent()).extracting(BoardDto::postingStatus).containsExactly(
                nuri.business.service.board.dto.PostingStatus.SCHEDULED,
                nuri.business.service.board.dto.PostingStatus.POSTING,
                nuri.business.service.board.dto.PostingStatus.ENDED,
                nuri.business.service.board.dto.PostingStatus.ENDED);
    }

    @Test
    @DisplayName("게시 상태 조건은 서버 기준일과 함께 조건에 실린다 — 조회 대행 권한자도 기준일을 받는다")
    void getBoardPosts_bindsPostingStatusFilterWithBaseDate() {
        Pageable pageable = PageRequest.of(0, 10);
        org.mockito.ArgumentCaptor<BoardSearchCondition> captor = org.mockito.ArgumentCaptor.forClass(BoardSearchCondition.class);
        given(boardRepository.searchArticles(captor.capture(), eq(pageable))).willReturn(Page.empty(pageable));
        allow("BOARD_READ_ALL");

        boardService.getBoardPosts("BBS_01", "0", "", null, null, null, null, null, null, pageable,
                BoardPostListFilter.of("ENDED", null));

        assertThat(captor.getValue().getPostingStatus()).isEqualTo(nuri.business.service.board.dto.PostingStatus.ENDED);
        assertThat(captor.getValue().getBaseYmd()).isEqualTo(TODAY);
        assertThat(captor.getValue().getPostingOpenOn()).as("가시성은 조회 대행 권한자에게 열려 있다").isNull();
        assertThat(captor.getValue().isPinFirst()).as("게시판 목록은 고정 글을 앞에 둔다(B2)").isTrue();
    }

    @Test
    @DisplayName("🚨 예약 게시를 받지 않는 게시판의 미래 시작일 등록은 채번·업로드 전에 400 이다 (ADR-0040 결정 3·6)")
    void createPost_rejectsFutureStartWhenBoardDoesNotTakeReservations() throws IOException {
        given(boardMasterRepository.findByIdWithPessimisticLock("BBS_01"))
                .willReturn(Optional.of(BoardMaster.builder().bbsId("BBS_01").fileAtchPsbltyYn("Y").build()));
        BoardSaveRequest scheduled = new BoardSaveRequest("BBS_01", "예약", "본문", TOMORROW, null, null,
                null, null, null, null, null, null, null);

        assertThatThrownBy(() -> boardService.createPost("user1", scheduled))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_STATE)
                .hasMessageContaining("이 게시판은 예약 게시를 받지 않습니다");
        assertThatThrownBy(() -> boardService.createPostWithFiles("user1", scheduled,
                java.util.List.of(upload("a.txt", 1))))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_STATE);
        verify(fileService, never()).uploadBoardFiles(any());
        verify(boardRepository, never()).findMaxSortOrdr(anyString());
        verify(boardRepository, never()).save(any(Board.class));
    }

    @Test
    @DisplayName("예약 게시를 받는 게시판은 미래 시작일을 저장하고, 빈 날짜는 저장하지 않는다(null)")
    void createPost_storesFutureStartWhenReservationsAreOnAndBlankDatesAsNull() {
        given(boardMasterRepository.findByIdWithPessimisticLock("BBS_01"))
                .willReturn(Optional.of(BoardMaster.builder().bbsId("BBS_01").rsvtPstgPsbltyYn("Y").build()));
        given(boardRepository.save(any(Board.class))).willAnswer(invocation -> persistWithGeneratedPstSn(invocation.getArgument(0)));

        boardService.createPost("user1", new BoardSaveRequest("BBS_01", "예약", "본문", TOMORROW, "", null,
                null, null, null, null, null, null, null));

        Board saved = captureSavedBoard();
        assertThat(saved.getPstBgngYmd()).isEqualTo(TOMORROW);
        assertThat(saved.getPstEndYmd()).isNull();
    }

    @Test
    @DisplayName("🚨 수정은 읽은 버전을 요구한다 — 없으면 400, 다르면 409 이고 파일을 건드리지 않는다 (ADR-0040 결정 10)")
    void updatePost_requiresCurrentVersionBeforeFiles() throws IOException {
        Board board = versionedPost("BBS_01", 21L, "ESNTL_owner", null, null);
        given(boardRepository.findById(21L)).willReturn(Optional.of(board));
        actAs("ESNTL_owner");

        assertThatThrownBy(() -> boardService.updatePost("BBS_01", 21L, edit("BBS_01", null, null, null)))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE)
                .hasMessage(nuri.foundation.core.util.EntityVersions.MISSING_VERSION_MESSAGE);
        assertThatThrownBy(() -> boardService.updatePostWithFiles("BBS_01", 21L, edit("BBS_01", null, null, 2),
                java.util.List.of(upload("a.txt", 1))))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.CONCURRENT_MODIFICATION);
        verify(fileService, never()).uploadBoardFiles(any());
        verify(fileService, never()).updateBoardFiles(any(), any());
        assertThat(board.getPstTtl()).isEqualTo("제목");

        org.springframework.test.util.ReflectionTestUtils.setField(board, "version", null);
        // 버전이 비어 있는 옛 행은 버전을 보내도 막는다(fail-closed). 409 가 아니라 400 이다 — 화면이 409 를 '다시 불러오면
        //   된다' 로 읽기 때문이다(다시 불러와도 버전이 없다).
        assertThatThrownBy(() -> boardService.updatePost("BBS_01", 21L, edit("BBS_01", null, null, 3)))
                .as("버전이 비어 있는 옛 행도 막는다(fail-closed)")
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_STATE)
                .hasMessage(BoardPolicySupport.UNVERSIONED_POST_MESSAGE);
    }

    @Test
    @DisplayName("수정의 기간 순서는 저장값과 합친 값으로 보고, 빈 날짜는 저장값을 지우지 않는다 (D-19)")
    void updatePost_checksMergedPeriodAndKeepsBlankDates() {
        Board board = versionedPost("BBS_01", 22L, "ESNTL_owner", "20261110", "20261231");
        given(boardRepository.findById(22L)).willReturn(Optional.of(board));
        actAs("ESNTL_owner");
        allow("BOARD_UPDATE_ALL"); // 공개 뒤 시작일 변경 제한과 따로 순서만 본다.

        assertThatThrownBy(() -> boardService.updatePost("BBS_01", 22L, edit("BBS_01", null, "20261101", 3)))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);

        boardService.updatePost("BBS_01", 22L, edit("BBS_01", "", "", 3));
        assertThat(board.getPstBgngYmd()).isEqualTo("20261110");
        assertThat(board.getPstEndYmd()).isEqualTo("20261231");
        assertThat(board.getPstTtl()).isEqualTo("고친 제목");
        verifyNoInteractions(changeRecorder); // 작성 화면 수정은 이력을 남기지 않는다(결정 9).
    }

    @Test
    @DisplayName("🚨 시작일 판정 세 사례: 같은 값 재전송·형식만 다른 같은 날짜는 통과, 공개 글의 실제 변경은 작성자에게 403 (ADR-0040 결정 3)")
    void updatePost_startDateRulesForAuthors() {
        actAs("ESNTL_owner");
        Board published = versionedPost("BBS_01", 23L, "ESNTL_owner", "20261001", null);
        given(boardRepository.findById(23L)).willReturn(Optional.of(published));

        boardService.updatePost("BBS_01", 23L, edit("BBS_01", "20261001", null, 3));
        boardService.updatePost("BBS_01", 23L, edit("BBS_01", "2026-10-01", null, 3));
        assertThat(published.getPstBgngYmd()).isEqualTo("20261001");
        assertThatThrownBy(() -> boardService.updatePost("BBS_01", 23L, edit("BBS_01", "20261030", null, 3)))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED)
                .hasMessageContaining("게시가 시작된 글의 시작일은");
        assertThat(published.getPstBgngYmd()).isEqualTo("20261001");

        // 예약 게시를 받지 않는 게시판에 남은 옛 미래 시작일 글: 같은 값은 통과, 다른 미래 날짜는 400, 오늘로 당기면 통과.
        Board scheduled = versionedPost("BBS_01", 24L, "ESNTL_owner", "20261101", null);
        given(boardRepository.findById(24L)).willReturn(Optional.of(scheduled));
        boardService.updatePost("BBS_01", 24L, edit("BBS_01", "20261101", null, 3));
        assertThatThrownBy(() -> boardService.updatePost("BBS_01", 24L, edit("BBS_01", "20261105", null, 3)))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_STATE);
        boardService.updatePost("BBS_01", 24L, edit("BBS_01", TODAY, null, 3));
        assertThat(scheduled.getPstBgngYmd()).isEqualTo(TODAY);
    }

    @Test
    @DisplayName("🚨 운영 일정 변경은 BOARD_UPDATE_ALL 이 없으면 저장소를 읽기 전에 403 이다")
    void updatePostPeriod_requiresUpdateAllBeforeReading() {
        assertThatThrownBy(() -> boardService.updatePostPeriod("BBS_01", 30L, period(null, TOMORROW, 3)))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
        assertThatThrownBy(() -> boardService.updatePostPeriodsInBatch("BBS_01", batch("END_DATE", TOMORROW, 30L)))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
        verifyNoInteractions(boardRepository, changeRecorder);
        verify(boardMasterRepository, never()).findById(anyString());
    }

    @Test
    @DisplayName("운영 일정 변경은 쓰기 진입 판정을 지난다 — 지정 게시판 편집 권한 403, 사용 안 함 게시판 404, 다른 게시판 글 404")
    void updatePostPeriod_passesWriteGateAndBoardMembership() {
        allow("BOARD_UPDATE_ALL");
        assertThatThrownBy(() -> boardService.updatePostPeriod("BBSMSTR_AAAAAAAAAAAA", 30L, period(null, TOMORROW, 3)))
                .as("공지·FAQ 지정 게시판은 그 편집 권한도 필요하다")
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);

        given(boardMasterRepository.findById("CLOSED")).willReturn(Optional.of(
                BoardMaster.builder().bbsId("CLOSED").useYn("N").build()));
        assertThatThrownBy(() -> boardService.updatePostPeriod("CLOSED", 30L, period(null, TOMORROW, 3)))
                .hasFieldOrPropertyWithValue("errorCode", BoardErrorCode.BOARD_NOT_FOUND);

        given(boardRepository.findById(30L)).willReturn(Optional.of(versionedPost("OTHER", 30L, "ESNTL_owner", null, null)));
        assertThatThrownBy(() -> boardService.updatePostPeriod("BBS_01", 30L, period(null, TOMORROW, 3)))
                .hasFieldOrPropertyWithValue("errorCode", BoardErrorCode.ARTICLE_NOT_FOUND);
        verifyNoInteractions(changeRecorder);
    }

    @Test
    @DisplayName("운영 일정 변경: 버전 409·과거 종료일 400·예약 미허용 미래 시작일 400, 통과하면 바뀐 항목만 이력에 남긴다")
    void updatePostPeriod_validatesAndRecordsChangedItems() {
        allow("BOARD_UPDATE_ALL");
        Board board = versionedPost("BBS_01", 31L, "ESNTL_owner", "20261001", "20261031");
        given(boardRepository.findById(31L)).willReturn(Optional.of(board));

        assertThatThrownBy(() -> boardService.updatePostPeriod("BBS_01", 31L, period(null, "20261130", 2)))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.CONCURRENT_MODIFICATION);
        assertThatThrownBy(() -> boardService.updatePostPeriod("BBS_01", 31L, period(null, YESTERDAY, 3)))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);
        assertThatThrownBy(() -> boardService.updatePostPeriod("BBS_01", 31L, period(TOMORROW, null, 3)))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_STATE);
        verifyNoInteractions(changeRecorder);
        assertThat(board.getPstEndYmd()).isEqualTo("20261031");

        // 대행 권한 경로라 공개 뒤 시작일도 바꾼다(오늘 이전). 같은 종료일은 변경이 아니다.
        boardService.updatePostPeriod("BBS_01", 31L, period("20261015", "20261031", 3));

        assertThat(board.getPstBgngYmd()).isEqualTo("20261015");
        assertThat(board.getPstEndYmd()).isEqualTo("20261031");
        verify(changeRecorder).recordPost("BBS_01", 31L, BoardChangeRecorder.ChangeType.PERIOD, "게시 시작일",
                "20261001", "20261015");
        verify(changeRecorder).recordPost("BBS_01", 31L, BoardChangeRecorder.ChangeType.PERIOD, "게시 종료일",
                "20261031", "20261031");
    }

    @Test
    @DisplayName("🚨 일괄 종료일: 하나라도 시작일보다 앞이 되면 글 번호와 함께 400 이고 아무것도 바꾸거나 남기지 않는다 (ADR-0040 결정 10)")
    void updatePostPeriodsInBatch_isAllOrNothing() {
        allow("BOARD_UPDATE_ALL");
        Board fine = versionedPost("BBS_01", 41L, "ESNTL_a", "20261001", null);
        Board late = versionedPost("BBS_01", 42L, "ESNTL_b", "20261205", "20261231");
        given(boardRepository.findById(41L)).willReturn(Optional.of(fine));
        given(boardRepository.findById(42L)).willReturn(Optional.of(late));

        assertThatThrownBy(() -> boardService.updatePostPeriodsInBatch("BBS_01", batch("END_DATE", "20261130", 41L, 42L)))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE)
                .hasMessageContaining("42");
        assertThat(fine.getPstEndYmd()).isNull();
        assertThat(late.getPstEndYmd()).isEqualTo("20261231");
        verifyNoInteractions(changeRecorder);

        given(boardRepository.findById(43L)).willReturn(Optional.of(versionedPost("OTHER", 43L, "ESNTL_c", null, null)));
        assertThatThrownBy(() -> boardService.updatePostPeriodsInBatch("BBS_01", batch("END_DATE", "20261130", 41L, 43L)))
                .hasFieldOrPropertyWithValue("errorCode", BoardErrorCode.ARTICLE_NOT_FOUND);
        assertThat(fine.getPstEndYmd()).isNull();
        verifyNoInteractions(changeRecorder);
    }

    /**
     * tb_bbs_item.version 은 NOT NULL 이 아니다. 버전이 비어 있는 옛 글을 저장하면 Hibernate 가 NULL 버전을 올리지 못해 500 이
     * 된다 — 작성 화면 수정·운영 단건·운영 일괄 모두 판정 단계에서 400(INVALID_STATE)으로 막고 아무것도 바꾸거나 남기지 않는다.
     */
    @Test
    @DisplayName("🚨 버전이 비어 있는 옛 글은 수정·단건·일괄 일정 변경 모두 400(INVALID_STATE)이고 아무것도 바꾸지 않는다")
    void unversionedLegacyPostsAreRejectedBeforeAnyChange() {
        allow("BOARD_UPDATE_ALL");
        Board fine = versionedPost("BBS_01", 61L, "ESNTL_a", null, null);
        Board legacy = versionedPost("BBS_01", 62L, "ESNTL_owner", null, "20261231");
        org.springframework.test.util.ReflectionTestUtils.setField(legacy, "version", null);
        given(boardRepository.findById(61L)).willReturn(Optional.of(fine));
        given(boardRepository.findById(62L)).willReturn(Optional.of(legacy));

        assertThatThrownBy(() -> boardService.updatePostPeriodsInBatch("BBS_01", batch("END_DATE", "20261130", 61L, 62L)))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_STATE)
                .hasMessageContaining("버전 정보가 없는 옛 글")
                .hasMessageContaining("62");
        assertThatThrownBy(() -> boardService.updatePostPeriod("BBS_01", 62L, period(null, "20261130", 0)))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_STATE);
        actAs("ESNTL_owner");
        assertThatThrownBy(() -> boardService.updatePost("BBS_01", 62L, edit("BBS_01", null, null, null)))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_STATE)
                .hasMessage(BoardPolicySupport.UNVERSIONED_POST_MESSAGE);
        assertThat(fine.getPstEndYmd()).isNull();
        assertThat(legacy.getPstEndYmd()).isEqualTo("20261231");
        assertThat(legacy.getPstTtl()).isEqualTo("제목");
        verifyNoInteractions(changeRecorder);
    }

    @Test
    @DisplayName("일괄 처리: END_DATE 는 바꾼 글만, CLEAR_END 는 종료일이 있던 글만 남기고 중복 번호는 한 번만 처리한다")
    void updatePostPeriodsInBatch_appliesAndRecordsOncePerPost() {
        allow("BOARD_UPDATE_ALL");
        Board open = versionedPost("BBS_01", 51L, "ESNTL_a", null, null);
        Board same = versionedPost("BBS_01", 52L, "ESNTL_b", null, "20261130");
        given(boardRepository.findById(51L)).willReturn(Optional.of(open));
        given(boardRepository.findById(52L)).willReturn(Optional.of(same));

        boardService.updatePostPeriodsInBatch("BBS_01", batch("END_DATE", "20261130", 51L, 52L, 51L));

        assertThat(open.getPstEndYmd()).isEqualTo("20261130");
        verify(changeRecorder, times(1)).recordPost("BBS_01", 51L, BoardChangeRecorder.ChangeType.PERIOD, "게시 종료일",
                null, "20261130");
        verify(changeRecorder, never()).recordPost(eq("BBS_01"), eq(52L), any(), any(), any(), any());
        verify(boardRepository, times(1)).findById(51L);

        boardService.updatePostPeriodsInBatch("BBS_01", batch("CLEAR_END", null, 51L, 52L));
        assertThat(open.getPstEndYmd()).isNull();
        assertThat(same.getPstEndYmd()).isNull();
        verify(changeRecorder).recordPost("BBS_01", 52L, BoardChangeRecorder.ChangeType.PERIOD, "게시 종료일",
                "20261130", null);
    }

    @Test
    @DisplayName("일괄 처리의 동작·날짜 짝: END_DATE 에 날짜 없음·과거 날짜, CLEAR_END 에 날짜가 있으면 400")
    void updatePostPeriodsInBatch_rejectsMismatchedActionAndDate() {
        allow("BOARD_UPDATE_ALL");
        for (var request : java.util.List.of(batch("END_DATE", null, 61L), batch("END_DATE", YESTERDAY, 61L),
                batch("CLEAR_END", TOMORROW, 61L))) {
            assertThatThrownBy(() -> boardService.updatePostPeriodsInBatch("BBS_01", request))
                    .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);
        }
        verify(boardRepository, never()).findById(anyLong());
        verifyNoInteractions(changeRecorder);
    }

    // ── [2026-10-23 ADR-0040 B2] 상단 고정 — 권한·잠금·정책·상한·종료일·이력·응답 판정 ─────────────────────────────

    private static nuri.business.service.board.dto.BoardPostPinRequest pin(String yn, String end) {
        return new nuri.business.service.board.dto.BoardPostPinRequest(yn, end);
    }

    private static nuri.business.service.board.dto.BoardPostPinBatchRequest pins(String yn, String end, Long... pstSns) {
        return new nuri.business.service.board.dto.BoardPostPinBatchRequest(java.util.Arrays.asList(pstSns), yn, end);
    }

    /** 고정 컬럼은 엔티티에서 쓰지 않으므로(updatable=false) 저장된 상태를 그대로 꾸민다. */
    private static Board pinnablePost(String bbsId, long pstSn, String yn, String end) {
        Board board = versionedPost(bbsId, pstSn, "ESNTL_writer", null, null);
        org.springframework.test.util.ReflectionTestUtils.setField(board, "upendFixYn", yn);
        org.springframework.test.util.ReflectionTestUtils.setField(board, "upendFixEndYmd", end);
        return board;
    }

    private void givenPinBoard(String psbltyYn, int limit) {
        given(boardMasterRepository.findByIdWithPessimisticLock("BBS_01")).willReturn(Optional.of(BoardMaster.builder()
                .bbsId("BBS_01").upendFixPsbltyYn(psbltyYn).upendFixUplmtNocs(java.math.BigInteger.valueOf(limit)).build()));
    }

    @Test
    @DisplayName("🚨 상단 고정은 BOARD_PIN 이 없으면 마스터를 잠그거나 글을 읽기 전에 403 이다 — 게시글 전체 수정 권한으로 대신하지 않는다")
    void pin_requiresBoardPinBeforeLockingOrReading() {
        allow("BOARD_UPDATE_ALL", "BBS_MST_UPDATE");

        assertThatThrownBy(() -> boardService.updatePostPin("BBS_01", 71L, pin("Y", null)))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
        assertThatThrownBy(() -> boardService.updatePostPinsInBatch("BBS_01", pins("N", null, 71L)))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
        verifyNoInteractions(boardRepository, changeRecorder);
        verify(boardMasterRepository, never()).findByIdWithPessimisticLock(anyString());
    }

    @Test
    @DisplayName("🚨 고정은 마스터 행을 잠근 뒤 글을 읽고, 잠근 상태에서 센 고정 수로 상한을 본 다음 한 문장으로 쓴다 (ADR-0040 결정 5)")
    void pin_locksMasterThenCountsThenWrites() {
        allow("BOARD_PIN");
        givenPinBoard("Y", 5);
        given(boardRepository.findById(71L)).willReturn(Optional.of(pinnablePost("BBS_01", 71L, "N", null)));
        given(boardRepository.countActivePins("BBS_01", TODAY)).willReturn(2L);
        given(boardRepository.updatePin("BBS_01", java.util.List.of(71L), "Y", "20261122")).willReturn(1);

        boardService.updatePostPin("BBS_01", 71L, pin("Y", null));

        org.mockito.InOrder order = inOrder(boardMasterRepository, boardRepository, changeRecorder);
        order.verify(boardMasterRepository).findByIdWithPessimisticLock("BBS_01");
        order.verify(boardRepository).findById(71L);
        order.verify(boardRepository).countActivePins("BBS_01", TODAY);
        order.verify(boardRepository).updatePin("BBS_01", java.util.List.of(71L), "Y", "20261122");
        order.verify(changeRecorder).recordPost("BBS_01", 71L, BoardChangeRecorder.ChangeType.PIN, "상단 고정", "N", "Y");
        order.verify(changeRecorder).recordPost("BBS_01", 71L, BoardChangeRecorder.ChangeType.PIN, "상단 고정 종료일",
                null, "20261122");
        verify(boardMasterRepository, never()).findById(anyString());
    }

    @Test
    @DisplayName("고정을 받지 않는 게시판의 새 고정은 400 이고, 해제는 설정과 상관없이 된다(종료일도 비운다)")
    void pin_rejectedWhenBoardDoesNotTakePinsButUnpinAlwaysWorks() {
        allow("BOARD_PIN");
        givenPinBoard("N", 5);
        given(boardRepository.findById(72L)).willReturn(Optional.of(pinnablePost("BBS_01", 72L, "Y", "20261130")));

        assertThatThrownBy(() -> boardService.updatePostPin("BBS_01", 72L, pin("Y", "20261201")))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_STATE)
                .hasMessage("이 게시판은 상단 고정을 받지 않습니다.");
        verify(boardRepository, never()).updatePin(anyString(), any(), anyString(), any());
        verifyNoInteractions(changeRecorder);

        given(boardRepository.updatePin("BBS_01", java.util.List.of(72L), "N", null)).willReturn(1);
        boardService.updatePostPinsInBatch("BBS_01", pins("N", null, 72L));

        verify(boardRepository, never()).countActivePins(anyString(), anyString());
        verify(changeRecorder).recordPost("BBS_01", 72L, BoardChangeRecorder.ChangeType.UNPIN, "상단 고정", "Y", "N");
        verify(changeRecorder).recordPost("BBS_01", 72L, BoardChangeRecorder.ChangeType.UNPIN, "상단 고정 종료일",
                "20261130", null);
    }

    @Test
    @DisplayName("🚨 상한: 새로 고정 중이 되는 글만 세고, 하나라도 넘으면 전체를 거부한다 — 이미 고정 중인 글의 종료일 변경은 상한에 걸리지 않는다")
    void pin_limitCountsOnlyNewlyActivePosts() {
        allow("BOARD_PIN");
        givenPinBoard("Y", 2);
        given(boardRepository.findById(73L)).willReturn(Optional.of(pinnablePost("BBS_01", 73L, "Y", "20261130")));
        given(boardRepository.findById(74L)).willReturn(Optional.of(pinnablePost("BBS_01", 74L, "Y", YESTERDAY)));
        given(boardRepository.countActivePins("BBS_01", TODAY)).willReturn(2L, 2L, 1L);
        given(boardRepository.updatePin(eq("BBS_01"), anyList(), eq("Y"), anyString())).willReturn(1);

        // 73 은 이미 고정 중, 74 는 종료일이 지난 옛 고정이라 새로 센다 → 2 + 1 > 2.
        assertThatThrownBy(() -> boardService.updatePostPinsInBatch("BBS_01", pins("Y", "20261201", 73L, 74L)))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_STATE)
                .hasMessageContaining("최대 2건까지 둡니다(지금 2건)");
        verify(boardRepository, never()).updatePin(anyString(), any(), anyString(), any());
        verifyNoInteractions(changeRecorder);

        boardService.updatePostPinsInBatch("BBS_01", pins("Y", "20261201", 73L));
        verify(boardRepository).updatePin("BBS_01", java.util.List.of(73L), "Y", "20261201");

        boardService.updatePostPin("BBS_01", 74L, pin("Y", null));
        verify(boardRepository).updatePin("BBS_01", java.util.List.of(74L), "Y", "20261122");
    }

    @Test
    @DisplayName("고정 종료일: 오늘보다 이르면 400, 오늘은 받는다. 해제에 종료일을 보내면 400")
    void pin_endDateRules() {
        allow("BOARD_PIN");
        givenPinBoard("Y", 5);
        given(boardRepository.findById(75L)).willReturn(Optional.of(pinnablePost("BBS_01", 75L, "N", null)));

        assertThatThrownBy(() -> boardService.updatePostPin("BBS_01", 75L, pin("Y", YESTERDAY)))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);
        assertThatThrownBy(() -> boardService.updatePostPin("BBS_01", 75L, pin("N", TOMORROW)))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE)
                .hasMessageContaining("고정 해제에는 고정 종료일을 보내지 않습니다");
        verify(boardRepository, never()).updatePin(anyString(), any(), anyString(), any());

        given(boardRepository.countActivePins("BBS_01", TODAY)).willReturn(0L);
        given(boardRepository.updatePin("BBS_01", java.util.List.of(75L), "Y", TODAY)).willReturn(1);
        boardService.updatePostPin("BBS_01", 75L, pin("Y", TODAY));
        verify(boardRepository).updatePin("BBS_01", java.util.List.of(75L), "Y", TODAY);
    }

    @Test
    @DisplayName("고정 대상은 경로 게시판의 지우지 않은 원글이다 — 다른 게시판·지운 글은 404, 답글은 400 이고 아무것도 쓰지 않는다")
    void pin_targetsMustBeLiveRootPostsOfTheBoard() {
        allow("BOARD_PIN");
        givenPinBoard("Y", 5);
        given(boardRepository.findById(76L)).willReturn(Optional.of(pinnablePost("BBS_01", 76L, "N", null)));
        given(boardRepository.findById(77L)).willReturn(Optional.of(pinnablePost("OTHER", 77L, "N", null)));
        Board deleted = pinnablePost("BBS_01", 78L, "N", null);
        deleted.delete();
        given(boardRepository.findById(78L)).willReturn(Optional.of(deleted));
        Board reply = Board.builder().bbsId("BBS_01").pstSn(79L).upPstSn(76L).build();
        given(boardRepository.findById(79L)).willReturn(Optional.of(reply));

        assertThatThrownBy(() -> boardService.updatePostPinsInBatch("BBS_01", pins("Y", null, 76L, 77L)))
                .hasFieldOrPropertyWithValue("errorCode", BoardErrorCode.ARTICLE_NOT_FOUND);
        assertThatThrownBy(() -> boardService.updatePostPin("BBS_01", 78L, pin("N", null)))
                .hasFieldOrPropertyWithValue("errorCode", BoardErrorCode.ARTICLE_NOT_FOUND);
        assertThatThrownBy(() -> boardService.updatePostPinsInBatch("BBS_01", pins("Y", null, 76L, 79L)))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_STATE)
                .hasMessageContaining("답글은 상단에 고정할 수 없습니다");
        verify(boardRepository, never()).countActivePins(anyString(), anyString());
        verify(boardRepository, never()).updatePin(anyString(), any(), anyString(), any());
        verifyNoInteractions(changeRecorder);
    }

    @Test
    @DisplayName("이미 그 상태인 글은 쓰지도 남기지도 않고, 중복 번호는 한 번만 다룬다")
    void pin_isNoOpForPostsAlreadyInTargetState() {
        allow("BOARD_PIN");
        givenPinBoard("Y", 5);
        given(boardRepository.findById(80L)).willReturn(Optional.of(pinnablePost("BBS_01", 80L, "Y", "20261122")));
        given(boardRepository.findById(81L)).willReturn(Optional.of(pinnablePost("BBS_01", 81L, "N", null)));
        given(boardRepository.countActivePins("BBS_01", TODAY)).willReturn(1L);

        boardService.updatePostPinsInBatch("BBS_01", pins("Y", null, 80L, 80L));
        boardService.updatePostPin("BBS_01", 81L, pin("N", null));

        verify(boardRepository, times(1)).findById(80L);
        verify(boardRepository, never()).updatePin(anyString(), any(), anyString(), any());
        verifyNoInteractions(changeRecorder);
    }

    @Test
    @DisplayName("판정 뒤 글이 지워져 쓴 수가 대상 수와 다르면 404 로 전체를 되돌리고 이력을 남기지 않는다")
    void pin_rollsBackWhenAffectedRowsDiffer() {
        allow("BOARD_PIN");
        givenPinBoard("Y", 5);
        given(boardRepository.findById(82L)).willReturn(Optional.of(pinnablePost("BBS_01", 82L, "N", null)));
        given(boardRepository.findById(83L)).willReturn(Optional.of(pinnablePost("BBS_01", 83L, "N", null)));
        given(boardRepository.countActivePins("BBS_01", TODAY)).willReturn(0L);
        given(boardRepository.updatePin("BBS_01", java.util.List.of(82L, 83L), "Y", "20261122")).willReturn(1);

        assertThatThrownBy(() -> boardService.updatePostPinsInBatch("BBS_01", pins("Y", null, 82L, 83L)))
                .hasFieldOrPropertyWithValue("errorCode", BoardErrorCode.ARTICLE_NOT_FOUND);
        verifyNoInteractions(changeRecorder);
    }

    @Test
    @DisplayName("🚨 목록·상세 응답의 고정 여부는 서버 기준일 판정이다 — 종료일 당일까지 고정이고, 지난 옛 고정은 false 와 빈 종료일이다")
    void listAndDetailCarryServerPinnedFlag() {
        Pageable pageable = PageRequest.of(0, 10);
        given(boardRepository.searchArticles(any(BoardSearchCondition.class), eq(pageable))).willReturn(new PageImpl<>(java.util.List.of(
                BoardSearchResult.builder().pstSn(1L).upendFixYn("Y").upendFixEndYmd(TODAY).build(),
                BoardSearchResult.builder().pstSn(2L).upendFixYn("Y").upendFixEndYmd(YESTERDAY).build(),
                BoardSearchResult.builder().pstSn(3L).upendFixYn("N").build())));

        Page<BoardDto> page = boardService.getBoardPosts("BBS_01", pageable);

        assertThat(page.getContent()).extracting(BoardDto::pinned).containsExactly(true, false, false);
        assertThat(page.getContent()).extracting(BoardDto::upendFixEndYmd).containsExactly(TODAY, null, null);

        given(boardRepository.findActiveArticleDetail("BBS_01", 4L)).willReturn(Optional.of(BoardDetailResult.builder()
                .pstSn(4L).bbsId("BBS_01").scrtYn("N").upendFixYn("Y").upendFixEndYmd(TOMORROW).build()));
        BoardDto detail = boardService.getPostDetail("BBS_01", 4L, false);
        assertThat(detail.pinned()).isTrue();
        assertThat(detail.upendFixEndYmd()).isEqualTo(TOMORROW);
    }

    @Test
    @DisplayName("고정 조건은 서버 기준일과 함께 조건에 실리고, 통합 검색은 고정 우선을 끄고 고정 여부를 싣지 않는다")
    void pinnedFilterAndGlobalSearch() {
        Pageable pageable = PageRequest.of(0, 10);
        org.mockito.ArgumentCaptor<BoardSearchCondition> captor = org.mockito.ArgumentCaptor.forClass(BoardSearchCondition.class);
        given(boardRepository.searchArticles(captor.capture(), any(Pageable.class))).willReturn(new PageImpl<>(java.util.List.of(
                BoardSearchResult.builder().pstSn(9L).upendFixYn("Y").upendFixEndYmd(TOMORROW).build())));

        boardService.getBoardPosts("BBS_01", "0", "", null, null, null, null, null, null, pageable,
                BoardPostListFilter.of(null, true));
        assertThat(captor.getValue().getPinned()).isTrue();
        assertThat(captor.getValue().getBaseYmd()).isEqualTo(TODAY);

        Page<BoardDto> found = boardService.searchAcrossBoards("공지", PageRequest.of(0, 20));
        assertThat(captor.getValue().isPinFirst()).as("고정은 게시판 단위 개념이라 통합 검색에는 두지 않는다").isFalse();
        assertThat(found.getContent()).extracting(BoardDto::pinned).containsOnlyNulls();
        assertThat(found.getContent()).extracting(BoardDto::upendFixEndYmd).containsOnlyNulls();
    }

    // ── [2026-10-23 ADR-0040 B3] 비밀글 정책(결정 7)·추천 받기와 추천 취소(결정 6) ─────────────────────────────

    private static BoardMaster policyMaster(String bbsId, String prvtPstPlcyCd, String rcmdtnUseYn) {
        return BoardMaster.builder().bbsId(bbsId).fileAtchPsbltyYn("Y").prvtPstPlcyCd(prvtPstPlcyCd).rcmdtnUseYn(rcmdtnUseYn)
                .build();
    }

    private static BoardSaveRequest secretRequest(String scrtYn, Integer version) {
        return new BoardSaveRequest("BBS_01", "Subject", "Content", null, null, null, null, null, null, scrtYn, null, null,
                version);
    }

    private Board savedAfterCreate(String policy, String requestedScrtYn) {
        org.mockito.Mockito.reset(boardRepository);
        given(boardMasterRepository.findByIdWithPessimisticLock("BBS_01"))
                .willReturn(Optional.of(policyMaster("BBS_01", policy, null)));
        lenient().when(userService.getUserById("user1")).thenReturn(UserDto.builder().userId("user1").userNm("Tester").build());
        given(boardRepository.findMaxSortOrdr("BBS_01")).willReturn(0L);
        given(boardRepository.save(any(Board.class))).willAnswer(invocation -> persistWithGeneratedPstSn(invocation.getArgument(0)));
        boardService.createPost("user1", secretRequest(requestedScrtYn, null));
        return captureSavedBoard();
    }

    @Test
    @DisplayName("🔐 비밀글 정책 REQUIRED 게시판은 등록 요청의 N·빈 값도 비밀글로 저장한다 (ADR-0040 결정 7)")
    void createPost_requiredPolicyForcesSecret() {
        assertThat(savedAfterCreate("REQUIRED", "N").getScrtYn()).isEqualTo("Y");
        assertThat(savedAfterCreate("REQUIRED", null).getScrtYn()).isEqualTo("Y");
    }

    @Test
    @DisplayName("🔐 비밀글 정책 NONE 은 요청값 그대로다 — 도움말 1:1 문의의 Y 를 지키고 N 은 N 이다(H3), OPTIONAL 도 요청값이다")
    void createPost_noneAndOptionalKeepRequestedSecretFlag() {
        assertThat(savedAfterCreate("NONE", "Y").getScrtYn()).as("1:1 문의는 Q&A 게시판(NONE)에 Y 로 남는다").isEqualTo("Y");
        assertThat(savedAfterCreate("NONE", "N").getScrtYn()).isEqualTo("N");
        assertThat(savedAfterCreate("OPTIONAL", "Y").getScrtYn()).isEqualTo("Y");
        assertThat(savedAfterCreate("OPTIONAL", "N").getScrtYn()).isEqualTo("N");
    }

    @Test
    @DisplayName("🔐 비밀글 정책 REQUIRED 게시판의 답글도 비밀글로 저장한다 (ADR-0040 결정 7)")
    void replyPost_requiredPolicyForcesSecret() {
        Board parent = Board.builder().bbsId("BBS_01").pstSn(1L).sortOrdr(100L).ansLv(0).scrtYn("N").build();
        given(boardMasterRepository.findByIdWithPessimisticLock("BBS_01"))
                .willReturn(Optional.of(policyMaster("BBS_01", "REQUIRED", null)));
        given(boardRepository.findById(1L)).willReturn(Optional.of(parent));
        given(userService.getUserById("user1")).willReturn(UserDto.builder().userId("user1").userNm("Tester").build());
        given(boardRepository.findMaxAnsSn("BBS_01", 100L)).willReturn(0L);
        given(boardRepository.save(any(Board.class))).willAnswer(invocation -> persistWithGeneratedPstSn(invocation.getArgument(0)));

        boardService.replyPost("user1", 1L, secretRequest("N", null));

        assertThat(captureSavedBoard().getScrtYn()).isEqualTo("Y");
    }

    @Test
    @DisplayName("🔐 비밀글 정책 REQUIRED 게시판에서 글을 고치면 요청의 N·빈 값과 공개로 남아 있던 옛 글도 비밀글이 된다 (ADR-0040 결정 7)")
    void updatePost_requiredPolicyForcesSecret() {
        actAs("ESNTL_owner");
        given(boardMasterRepository.findById("BBS_01")).willReturn(Optional.of(policyMaster("BBS_01", "REQUIRED", null)));
        Board legacyPublic = versionedPost("BBS_01", 31L, "ESNTL_owner", null, null);
        org.springframework.test.util.ReflectionTestUtils.setField(legacyPublic, "scrtYn", "N");
        given(boardRepository.findById(31L)).willReturn(Optional.of(legacyPublic));

        boardService.updatePost("BBS_01", 31L, secretRequest(null, 3));
        assertThat(legacyPublic.getScrtYn()).as("요청이 비어 있어도 저장값 N 을 두지 않는다").isEqualTo("Y");

        org.springframework.test.util.ReflectionTestUtils.setField(legacyPublic, "scrtYn", "N");
        boardService.updatePost("BBS_01", 31L, secretRequest("N", 3));
        assertThat(legacyPublic.getScrtYn()).as("명시한 N 도 400 이 아니라 비밀글로 저장한다").isEqualTo("Y");
    }

    @Test
    @DisplayName("🔐 비밀글 정책 NONE 의 수정은 요청이 없으면 저장값(1:1 문의의 Y)을 지키고, 보낸 값은 그대로 쓴다 (H3)")
    void updatePost_nonePolicyKeepsStoredSecretFlag() {
        actAs("ESNTL_owner");
        Board inquiry = versionedPost("BBS_01", 32L, "ESNTL_owner", null, null);
        org.springframework.test.util.ReflectionTestUtils.setField(inquiry, "scrtYn", "Y");
        given(boardRepository.findById(32L)).willReturn(Optional.of(inquiry));

        boardService.updatePost("BBS_01", 32L, secretRequest(null, 3));
        assertThat(inquiry.getScrtYn()).isEqualTo("Y");
        boardService.updatePost("BBS_01", 32L, secretRequest("N", 3));
        assertThat(inquiry.getScrtYn()).isEqualTo("N");
    }

    @Test
    @DisplayName("🔐 비밀글 정책 REQUIRED 게시판의 첨부 동반 수정도 비밀글로 저장한다 (ADR-0040 결정 7)")
    void updatePostWithFiles_requiredPolicyForcesSecret() throws IOException {
        actAs("ESNTL_owner");
        given(boardMasterRepository.findById("BBS_01")).willReturn(Optional.of(policyMaster("BBS_01", "REQUIRED", null)));
        Board board = versionedPost("BBS_01", 33L, "ESNTL_owner", null, null);
        org.springframework.test.util.ReflectionTestUtils.setField(board, "scrtYn", "N");
        given(boardRepository.findById(33L)).willReturn(Optional.of(board));
        java.util.List<org.springframework.web.multipart.MultipartFile> files = java.util.List.of(upload("a.txt", 1));
        given(fileService.uploadBoardFiles(files)).willReturn(55L);

        boardService.updatePostWithFiles("BBS_01", 33L, secretRequest("N", 3), files);

        assertThat(board.getScrtYn()).isEqualTo("Y");
        assertThat(board.getAtchFileSn()).isEqualTo(55L);
    }

    // ── [2026-10-29] 비밀 여부가 비어 있는(NULL) 글 — 열람 판정은 모두 NULL 을 공개 글로 본다. 표현과 새 저장만 'N' 으로 맞춘다 ──────────

    @Test
    @DisplayName("🔐 비밀 여부를 보내지 않은 등록은 NULL 이 아니라 N 으로 저장한다 — REQUIRED 는 그대로 Y 다")
    void createPost_omittedSecretFlagStoresN() {
        assertThat(savedAfterCreate(null, null).getScrtYn()).as("정책 미설정 게시판").isEqualTo("N");
        assertThat(savedAfterCreate("NONE", null).getScrtYn()).isEqualTo("N");
        assertThat(savedAfterCreate("OPTIONAL", null).getScrtYn()).isEqualTo("N");
        assertThat(savedAfterCreate("REQUIRED", null).getScrtYn()).isEqualTo("Y");
    }

    @Test
    @DisplayName("🔐 비밀 여부를 보내지 않은 답글도 N 으로 저장하고, 비밀 여부가 NULL 인 부모에는 지금처럼 남도 답글을 단다")
    void replyPost_omittedSecretFlagStoresN() {
        Board parent = Board.builder().bbsId("BBS_01").pstSn(1L).sortOrdr(100L).ansLv(0).userId("ESNTL_owner").build();
        given(boardMasterRepository.findByIdWithPessimisticLock("BBS_01"))
                .willReturn(Optional.of(policyMaster("BBS_01", "NONE", null)));
        given(boardRepository.findById(1L)).willReturn(Optional.of(parent));
        given(userService.getUserById("user1")).willReturn(UserDto.builder().userId("user1").userNm("Tester").build());
        given(boardRepository.findMaxAnsSn("BBS_01", 100L)).willReturn(0L);
        given(boardRepository.save(any(Board.class))).willAnswer(invocation -> persistWithGeneratedPstSn(invocation.getArgument(0)));

        boardService.replyPost("user1", 1L, secretRequest(null, null));

        assertThat(captureSavedBoard().getScrtYn()).isEqualTo("N");
        assertThat(parent.getScrtYn()).as("부모 행은 읽기만 한다").isNull();
    }

    @Test
    @DisplayName("🔐 비밀 여부가 NULL 로 남은 옛 글을 비밀 여부 없이 고치면 N 으로 저장한다 — 저장값이 있으면 지금처럼 둔다")
    void updatePost_omittedSecretFlagOnNullRowStoresN() {
        actAs("ESNTL_owner");
        Board legacy = versionedPost("BBS_01", 34L, "ESNTL_owner", null, null);
        assertThat(legacy.getScrtYn()).as("전제: 저장값이 NULL").isNull();
        given(boardRepository.findById(34L)).willReturn(Optional.of(legacy));

        boardService.updatePost("BBS_01", 34L, secretRequest(null, 3));

        assertThat(legacy.getScrtYn()).isEqualTo("N");
    }

    @Test
    @DisplayName("비밀 여부가 NULL 인 조회 결과는 scrtYn N 으로 읽힌다 — Y·N 은 그대로다")
    void nullSecretFlagResultsReadAsN() {
        assertThat(BoardSearchResult.builder().build().getScrtYn()).isEqualTo("N");
        assertThat(BoardSearchResult.builder().scrtYn("Y").build().getScrtYn()).isEqualTo("Y");
        assertThat(BoardDetailResult.builder().build().getScrtYn()).isEqualTo("N");
        assertThat(BoardDetailResult.builder().scrtYn("Y").build().getScrtYn()).isEqualTo("Y");
    }

    @Test
    @DisplayName("엔티티에서 옮긴 게시글 DTO 도 비어 있는 비밀 여부를 N 으로 싣고 Y 는 그대로 둔다")
    void mapperCarriesNullEntitySecretFlagAsN() {
        BoardMapperImpl mapper = new BoardMapperImpl();
        assertThat(mapper.toDto(Board.builder().bbsId("BBS_01").build()).scrtYn()).as("엔티티 경로").isEqualTo("N");
        assertThat(mapper.toDto(Board.builder().bbsId("BBS_01").scrtYn("Y").build()).scrtYn()).isEqualTo("Y");
    }

    @Test
    @DisplayName("비밀 여부가 NULL 인 글은 게시판 목록·통합 검색·공개 FAQ 목록 응답에서 scrtYn N 이다")
    void nullSecretFlagListsAsN() {
        BoardSearchResult legacy = BoardSearchResult.builder().pstSn(1L).bbsId("BBSMSTR_AAAAAAAAAAAA").pstTtl("옛 FAQ")
                .useYn("Y").build();
        given(boardMasterRepository.findById("BBSMSTR_AAAAAAAAAAAA"))
                .willReturn(Optional.of(BoardMaster.builder().bbsId("BBSMSTR_AAAAAAAAAAAA").useYn("Y").build()));
        given(boardRepository.searchPublicFaqArticles(eq("BBSMSTR_AAAAAAAAAAAA"), any(), eq(TODAY), any(Pageable.class)))
                .willReturn(new PageImpl<>(Collections.singletonList(legacy)));
        given(boardRepository.searchArticles(any(BoardSearchCondition.class), any(Pageable.class)))
                .willReturn(new PageImpl<>(Collections.singletonList(legacy)));

        assertThat(boardService.getPublicFaqPosts("", PageRequest.of(0, 10)).getContent())
                .extracting(BoardDto::scrtYn).containsExactly("N");
        assertThat(boardService.getBoardPosts("BBSMSTR_AAAAAAAAAAAA", PageRequest.of(0, 10)).getContent())
                .extracting(BoardDto::scrtYn).containsExactly("N");
        assertThat(boardService.searchAcrossBoards("옛 FAQ", PageRequest.of(0, 20)).getContent())
                .extracting(BoardDto::scrtYn).containsExactly("N");
    }

    @Test
    @DisplayName("🔐 비밀 여부가 NULL 인 글의 상세는 지금처럼 남에게도 열리고 scrtYn N 으로 나간다 — 공개 FAQ 상세도 N 이다")
    void nullSecretFlagDetailReadsAsN() {
        actAs("ESNTL_stranger");
        given(boardRepository.findActiveArticleDetail("BBS_01", 5L)).willReturn(Optional.of(
                BoardDetailResult.builder().pstSn(5L).bbsId("BBS_01").userId("ESNTL_owner").useYn("Y").build()));
        given(boardRepository.findPublicArticleDetail("BBSMSTR_AAAAAAAAAAAA", 15L, TODAY)).willReturn(Optional.of(
                BoardDetailResult.builder().pstSn(15L).bbsId("BBSMSTR_AAAAAAAAAAAA").useYn("Y").build()));

        assertThat(boardService.getPostDetail("BBS_01", 5L, false).scrtYn()).isEqualTo("N");
        assertThat(boardService.getPublicFaqDetail(15L).scrtYn()).isEqualTo("N");
    }

    @Test
    @DisplayName("🚨 추천을 받지 않는 게시판의 새 추천은 400 이고 이력·추천 수를 건드리지 않는다 (ADR-0040 결정 6)")
    void incrementLike_rejectsWhenRecommendationsOff() {
        given(boardMasterRepository.findById("BBS_01")).willReturn(Optional.of(policyMaster("BBS_01", null, "N")));
        givenReadablePost("BBS_01", 1L, "writer");
        actAs("liker");

        assertThatThrownBy(() -> boardService.incrementLike("BBS_01", 1L))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_STATE)
                .hasMessage("이 게시판은 추천을 받지 않습니다.");
        verify(recommendationRepository, never()).existsById(any());
        verify(recommendationRepository, never()).saveAndFlush(any());
        verify(boardRepository, never()).incrementLikeCntAtomic(any(Long.class));
    }

    @Test
    @DisplayName("🔐 읽을 수 없는 남의 비밀글이면 추천을 꺼 둔 게시판이라도 설정보다 열람 거부가 먼저다 — 읽을 수 없는 글에 설정을 드러내지 않는다")
    void incrementLike_accessCheckPrecedesRecommendationSetting() {
        given(boardMasterRepository.findById("BBS_01")).willReturn(Optional.of(policyMaster("BBS_01", null, "N")));
        given(boardRepository.findActiveArticleDetail("BBS_01", 1L)).willReturn(Optional.of(
                BoardDetailResult.builder().pstSn(1L).bbsId("BBS_01").userId("writer").scrtYn("Y").build()));
        actAs("stranger");

        assertThatThrownBy(() -> boardService.incrementLike("BBS_01", 1L))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
        verify(recommendationRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("[ADR-0040 결정 6] 내 추천 취소는 이력을 한 문장으로 지웠을 때만 추천 수를 하나 줄이고, 다시 읽은 수를 돌려준다")
    void cancelLike_decrementsOnlyWhenHistoryDeleted() {
        givenReadablePost("BBS_01", 1L, "writer");
        actAs("liker");
        given(recommendationRepository.deleteRecommendation(1L, "liker")).willReturn(1);
        given(boardRepository.findById(1L)).willReturn(Optional.of(Board.builder().pstSn(1L).likeCnt(4).build()));

        assertThat(boardService.cancelLike("BBS_01", 1L)).isEqualTo(4);

        org.mockito.InOrder order = inOrder(recommendationRepository, boardRepository);
        order.verify(recommendationRepository).deleteRecommendation(1L, "liker");
        order.verify(boardRepository).decrementLikeCntAtomic(1L);
        verify(recommendationRepository, never()).existsById(any());
        verify(recommendationRepository, never()).deleteById(any());
    }

    @Test
    @DisplayName("[ADR-0040 결정 6] 내 추천이 없으면 취소는 아무것도 줄이지 않고 지금 수를 돌려준다 — 이력 없는 옛 추천 수는 그대로다(GAP-DOMAIN-001)")
    void cancelLike_withoutHistoryKeepsCount() {
        givenReadablePost("BBS_01", 1L, "writer");
        actAs("liker");
        given(recommendationRepository.deleteRecommendation(1L, "liker")).willReturn(0);
        given(boardRepository.findById(1L)).willReturn(Optional.of(Board.builder().pstSn(1L).likeCnt(5).build()));

        assertThat(boardService.cancelLike("BBS_01", 1L)).isEqualTo(5);

        verify(boardRepository, never()).decrementLikeCntAtomic(any(Long.class));
    }

    @Test
    @DisplayName("[ADR-0040 결정 6] 추천을 꺼 둔 게시판에서도 내 추천은 취소된다")
    void cancelLike_allowedWhenRecommendationsOff() {
        given(boardMasterRepository.findById("BBS_01")).willReturn(Optional.of(policyMaster("BBS_01", null, "N")));
        givenReadablePost("BBS_01", 1L, "writer");
        actAs("liker");
        given(recommendationRepository.deleteRecommendation(1L, "liker")).willReturn(1);
        given(boardRepository.findById(1L)).willReturn(Optional.of(Board.builder().pstSn(1L).likeCnt(2).build()));

        assertThat(boardService.cancelLike("BBS_01", 1L)).isEqualTo(2);
        verify(boardRepository).decrementLikeCntAtomic(1L);
    }

    @Test
    @DisplayName("🔐 읽을 수 없는 글(남의 비밀글·예약 글·사용 안 함 게시판)의 추천 취소는 이력을 건드리기 전에 거부한다")
    void cancelLike_rejectsUnreadablePostsBeforeTouchingHistory() {
        actAs("stranger");
        given(boardRepository.findActiveArticleDetail("BBS_01", 1L)).willReturn(Optional.of(
                BoardDetailResult.builder().pstSn(1L).bbsId("BBS_01").userId("writer").scrtYn("Y").build()));
        assertThatThrownBy(() -> boardService.cancelLike("BBS_01", 1L))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);

        given(boardRepository.findActiveArticleDetail("BBS_01", 2L)).willReturn(Optional.of(
                BoardDetailResult.builder().pstSn(2L).bbsId("BBS_01").userId("writer").scrtYn("N").pstBgngYmd(TOMORROW).build()));
        assertThatThrownBy(() -> boardService.cancelLike("BBS_01", 2L))
                .hasFieldOrPropertyWithValue("errorCode", BoardErrorCode.ARTICLE_NOT_FOUND);

        given(boardMasterRepository.findById("OFF_BOARD")).willReturn(Optional.of(
                BoardMaster.builder().bbsId("OFF_BOARD").useYn("N").build()));
        assertThatThrownBy(() -> boardService.cancelLike("OFF_BOARD", 3L))
                .hasFieldOrPropertyWithValue("errorCode", BoardErrorCode.BOARD_NOT_FOUND);

        verify(recommendationRepository, never()).deleteRecommendation(any(), any());
        verify(boardRepository, never()).decrementLikeCntAtomic(any(Long.class));
    }

    @Test
    @DisplayName("🔐 인증 주체를 알 수 없으면 추천 취소는 403 이고 이력을 건드리지 않는다")
    void cancelLike_requiresCurrentPrincipal() {
        givenReadablePost("BBS_01", 1L, "writer");
        securityUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId).thenReturn(Optional.empty());

        assertThatThrownBy(() -> boardService.cancelLike("BBS_01", 1L))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
        verify(recommendationRepository, never()).deleteRecommendation(any(), any());
    }

    // ── [2026-10-26 ADR-0043] 미리 올린 첨부 묶음의 게시판 첨부 설정(SET-02)·Q&A 상태 ─────────────────────────────

    private static nuri.business.service.file.dto.FileDto storedFile(Long atchFileSn, long bytes) {
        return nuri.business.service.file.dto.FileDto.builder().atchFileSn(atchFileSn).fileSn(1).fileMg(bytes).build();
    }

    /** 첨부 묶음 77 이 붙은 user1 의 글 1번(버전 0). 수정 시험이 공유한다. */
    private Board givenOwnedPostWithGroup77() {
        Board board = Board.builder().bbsId("BBS_01").pstSn(1L).userId("user1").atchFileSn(77L).build();
        org.springframework.test.util.ReflectionTestUtils.setField(board, "version", 0);
        given(boardRepository.findById(1L)).willReturn(Optional.of(board));
        securityUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of("user1"));
        return board;
    }

    @Test
    @DisplayName("[ADR-0043, SET-02] 묶음을 바꾸는 JSON 수정은 새 묶음으로 첨부 허용·파일당 크기를 본다 — 첨부를 끈 게시판에 붙지 않는다")
    void updatePostWithChangedGroupEnforcesBoardAttachmentSettings() {
        Board board = givenOwnedPostWithGroup77();
        given(fileService.getFileList(88L)).willReturn(java.util.List.of(storedFile(88L, 2L * 1024 * 1024)));
        BoardSaveRequest changed = new BoardSaveRequest("BBS_01", "Upd", "Cont", null, null, 88L, null, null, null, null, null, null, 0);

        given(boardMasterRepository.findById("BBS_01")).willReturn(Optional.of(BoardMaster.builder().bbsId("BBS_01")
                .fileAtchPsbltyYn("N").build()));
        assertThatThrownBy(() -> boardService.updatePost("BBS_01", 1L, changed))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_STATE)
                .hasMessageContaining("파일 첨부를 받지 않습니다");

        given(boardMasterRepository.findById("BBS_01")).willReturn(Optional.of(BoardMaster.builder().bbsId("BBS_01")
                .fileAtchPsbltyYn("Y").atchPsbltyFileQty(3).atchPsbltyFileSz(1024L * 1024L).build()));
        assertThatThrownBy(() -> boardService.updatePost("BBS_01", 1L, changed))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE)
                .hasMessageContaining("최대 1MB");
        assertThat(board.getAtchFileSn()).isEqualTo(77L);
        assertThat(board.getPstTtl()).isNull();
    }

    @Test
    @DisplayName("[ADR-0043, SET-02] 같은 묶음 번호를 다시 보내는 화면 수정은 첨부 설정을 다시 보지 않는다 — 설정을 줄여도 이미 붙은 파일은 그대로다")
    void updatePostWithSameGroupDoesNotRecheckAttachments() {
        Board board = givenOwnedPostWithGroup77();
        given(boardMasterRepository.findById("BBS_01")).willReturn(Optional.of(BoardMaster.builder().bbsId("BBS_01")
                .fileAtchPsbltyYn("N").build()));

        boardService.updatePost("BBS_01", 1L,
                new BoardSaveRequest("BBS_01", "Upd", "Cont", null, null, 77L, null, null, null, null, null, null, 0));

        assertThat(board.getPstTtl()).isEqualTo("Upd");
        assertThat(board.getAtchFileSn()).isEqualTo(77L);
        verify(fileService, never()).getFileList(any());
    }

    @Test
    @DisplayName("[ADR-0043, SET-02] 첨부 포함 수정도 새 파일 없이 묶음만 바꾸면 그 묶음으로 첨부 설정을 본다")
    void updatePostWithFilesChecksChangedGroupWithoutNewFiles() throws IOException {
        givenOwnedPostWithGroup77();
        given(fileService.getFileList(88L)).willReturn(java.util.List.of(storedFile(88L, 10)));
        given(boardMasterRepository.findById("BBS_01")).willReturn(Optional.of(BoardMaster.builder().bbsId("BBS_01")
                .fileAtchPsbltyYn("N").build()));

        assertThatThrownBy(() -> boardService.updatePostWithFiles("BBS_01", 1L,
                new BoardSaveRequest("BBS_01", "Upd", "Cont", null, null, 88L, null, null, null, null, null, null, 0),
                java.util.List.of()))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_STATE);
        verify(fileService, never()).updateBoardFiles(any(), any());
    }

    @Test
    @DisplayName("[ADR-0043, SET-02] 미리 올린 묶음을 붙이는 등록은 파일 수에 더해 파일당 크기도 본다")
    void createPostWithAssignedGroupEnforcesFileSize() {
        given(boardMasterRepository.findByIdWithPessimisticLock("BBS_01")).willReturn(Optional.of(BoardMaster.builder()
                .bbsId("BBS_01").fileAtchPsbltyYn("Y").atchPsbltyFileQty(3).atchPsbltyFileSz(1024L * 1024L).build()));
        given(fileService.getFileList(101L)).willReturn(java.util.List.of(storedFile(101L, 1024L * 1024L + 1)));

        assertThatThrownBy(() -> boardService.createPost("user1",
                new BoardSaveRequest("BBS_01", "Subj", "Cont", null, null, 101L, null, null, null, null, null, null, null)))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE)
                .hasMessageContaining("최대 1MB");
        verify(boardRepository, never()).save(any(Board.class));
    }

    @Test
    @DisplayName("[ADR-0043] Q&A 상태는 Q&A 게시판(TMPLT_QNA)의 글에만 받는다 — 다른 게시판의 등록·첨부 등록·수정은 400 이고 저장하지 않는다")
    void qnaStatusIsRejectedOutsideQnaBoards() throws IOException {
        given(boardMasterRepository.findByIdWithPessimisticLock("BBS_01"))
                .willReturn(Optional.of(BoardMaster.builder().bbsId("BBS_01").build())); // 화면 유형이 없는 게시판
        assertThatThrownBy(() -> boardService.createPost("user1", saveRequest(null, "OPEN", null)))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE)
                .hasMessageContaining("Q&A 상태는 Q&A 게시판의 글에만");
        verify(boardRepository, never()).save(any(Board.class));

        given(boardMasterRepository.findById("BBS_01")).willReturn(Optional.of(BoardMaster.builder().bbsId("BBS_01")
                .tmpltId("TMPLT_LIST").fileAtchPsbltyYn("Y").build()));
        assertThatThrownBy(() -> boardService.createPostWithFiles("user1", saveRequest(null, "SOLVED", null),
                java.util.List.of(upload("a.txt", 1))))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);
        verify(fileService, never()).uploadBoardFiles(any());

        Board board = givenOwnedPostWithGroup77();
        assertThatThrownBy(() -> boardService.updatePost("BBS_01", 1L,
                new BoardSaveRequest("BBS_01", "Upd", "Cont", null, null, null, null, "SOLVED", null, null, null, null, 0)))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);
        assertThat(board.getPstTtl()).isNull();
    }

    @Test
    @DisplayName("[ADR-0043] Q&A 게시판은 상태를 받고, 상태를 보내지 않은 다른 게시판의 글은 지금처럼 저장한다(도움말 1:1 문의 경로)")
    void qnaStatusIsAcceptedOnQnaBoardsAndOmittedElsewhere() {
        givenCreatePostContext(0L);
        boardService.createPost("user1", saveRequest(null, null, null));
        assertThat(captureSavedBoard().getQnaSttsCd()).isEqualTo("OPEN");

        Board board = givenOwnedPostWithGroup77();
        given(boardMasterRepository.findById("BBS_01")).willReturn(Optional.of(BoardMaster.builder().bbsId("BBS_01")
                .tmpltId("TMPLT_QNA").build()));
        boardService.updatePost("BBS_01", 1L,
                new BoardSaveRequest("BBS_01", "Upd", "Cont", null, null, null, null, "SOLVED", null, null, null, null, 0));
        assertThat(board.getQnaSttsCd()).isEqualTo("SOLVED");
    }

    @Test
    @DisplayName("[ADR-0043, NAV-10] 통합 검색은 결과마다 게시판 이름을 싣고, 게시판 목록은 싣지 않는다(매퍼가 옮기지 않는다)")
    void searchAcrossBoardsCarriesBoardNameOnlyInSearch() {
        BoardSearchResult row = BoardSearchResult.builder().pstSn(7L).bbsId("BBS_01").bbsTtl("업무게시판").pstTtl("연차 신청 안내").build();
        given(boardRepository.searchArticles(any(BoardSearchCondition.class), any(Pageable.class)))
                .willReturn(new PageImpl<>(Collections.singletonList(row)));

        assertThat(boardService.searchAcrossBoards("연차", PageRequest.of(0, 20)).getContent().get(0).bbsTtl())
                .isEqualTo("업무게시판");
        assertThat(new BoardMapperImpl().toDto(row).bbsTtl()).as("목록·상세 경로는 게시판 이름을 싣지 않는다").isNull();
    }
}
