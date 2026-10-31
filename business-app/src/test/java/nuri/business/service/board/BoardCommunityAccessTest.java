package nuri.business.service.board;

import nuri.business.domain.board.BoardMaster;
import nuri.business.domain.board.BoardMasterRepository;
import nuri.business.domain.board.BoardRepository;
import nuri.business.domain.board.BoardSearchCondition;
import nuri.business.domain.board.BoardSearchResult;
import nuri.business.service.board.dto.BoardMapperImpl;
import nuri.business.service.board.dto.BoardMasterMapperImpl;
import nuri.business.service.board.dto.CommunityBoardDto;
import nuri.business.service.board.dto.BoardPostListFilter;
import nuri.business.service.file.AttachmentAssignmentPolicy;
import nuri.business.service.file.FileService;
import nuri.business.service.user.UserService;
import nuri.foundation.core.community.CommunityBoardAccessPort;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

/**
 * 커뮤니티 귀속 게시판({@code tb_bbs_master.cmnty_sn})의 접근 경계 계약 — 2026-09-08 PD-CMTY-001.
 *
 * <p>이 게이트가 생기기 전에는 {@code cmnty_sn} 을 읽는 코드가 저장소 전체에 없었다(GAP-CMTY-001).
 * 즉 커뮤니티 회원이 되어도 열리는 것이 아무것도 없었고, 귀속은 저장만 되는 값이었다.
 *
 * <p>여기서 고정하는 것은 넷이다.
 * <ol>
 *   <li><b>귀속이 없는 게시판의 거동은 조금도 바뀌지 않는다</b> — 포트를 부르지도 않는다.
 *       현재 저장소의 모든 게시판이 여기 해당하므로 이 단언이 회귀의 1차 방어선이다.</li>
 *   <li>귀속 게시판은 <b>승인된 회원</b>만 통과한다. 가입 신청 상태는 회원이 아니다(포트가 판정).</li>
 *   <li>관리자는 통과한다 — 다른 열람 경로와 같은 이유(운영·감사)다.</li>
 *   <li><b>포트가 없으면 거부한다</b>(fail-closed). 커뮤니티 도메인이 빠진 파생 제품에서
 *       "판정할 수 없으니 통과" 로 다루면 회원 전용 게시판이 전원 공개로 뒤집힌다(H3).</li>
 * </ol>
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("커뮤니티 귀속 게시판 접근 경계")
class BoardCommunityAccessTest {

    private static final String COMMUNITY_BBS = "BBS_CMNTY";
    private static final String PLAIN_BBS = "BBS_PLAIN";
    private static final Long CMNTY_SN = 7L;
    private static final String VIEWER = "USRCNFRM_00000000001";

    @Mock private BoardRepository boardRepository;
    @Mock private BoardMasterRepository boardMasterRepository;
    @Mock private UserService userService;
    @Mock private FileService fileService;
    @Mock private AttachmentAssignmentPolicy attachmentAssignmentPolicy;
    @Mock private ApplicationEventPublisher eventPublisher;
    @Mock private nuri.business.service.board.BoardViewCountService viewCountService;
    @Mock private CommunityBoardAccessPort communityBoardAccess;
    @Mock private nuri.business.domain.board.BoardRecommendationRepository recommendationRepository;

    private MockedStatic<nuri.business.security.util.SecurityUtil> securityUtil;

    @BeforeEach
    void setUp() {
        securityUtil = mockStatic(nuri.business.security.util.SecurityUtil.class,
                org.mockito.Mockito.CALLS_REAL_METHODS);
        // 기본은 비관리자·인증된 사용자다. isAdmin() 은 hasRole 을 실제로 호출하므로 여기서 갈린다.
        securityUtil.when(() -> nuri.business.security.util.SecurityUtil.hasPermission(anyString())).thenReturn(false);
        securityUtil.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId)
                .thenReturn(Optional.of(VIEWER));

        given(boardMasterRepository.findById(PLAIN_BBS))
                .willReturn(Optional.of(BoardMaster.builder().bbsId(PLAIN_BBS).build()));
        given(boardMasterRepository.findById(COMMUNITY_BBS))
                .willReturn(Optional.of(BoardMaster.builder().bbsId(COMMUNITY_BBS).cmntySn(CMNTY_SN).build()));
    }

    @AfterEach
    void tearDown() {
        securityUtil.close();
    }

    private BoardService boardService(CommunityBoardAccessPort port) {
        return new BoardService(boardRepository, boardMasterRepository, userService, fileService,
                attachmentAssignmentPolicy, eventPublisher, new SimpleMeterRegistry(), viewCountService,
                new BoardMapperImpl(), new nuri.business.core.config.BoardIdProperties(), recommendationRepository,
                org.mockito.Mockito.mock(BoardChangeRecorder.class), port);
    }

    private BoardMasterService boardMasterService(CommunityBoardAccessPort port) {
        return new BoardMasterService(boardMasterRepository, boardRepository,
                new BoardMasterMapperImpl(), port, org.mockito.Mockito.mock(BoardChangeRecorder.class),
                new nuri.business.core.config.BoardIdProperties(),
                org.mockito.Mockito.mock(nuri.foundation.core.audit.SensitiveAuditPort.class));
    }

    @Nested
    @DisplayName("게시글 목록")
    class Listing {

        @Test
        @DisplayName("귀속이 없는 게시판은 종전 그대로다 — 포트를 부르지도 않는다")
        void plainBoardUnchanged() {
            given(boardRepository.searchArticles(any(BoardSearchCondition.class), any(Pageable.class)))
                    .willReturn(new PageImpl<>(List.of(BoardSearchResult.builder().pstSn(1L).build())));

            assertThat(boardService(communityBoardAccess).getBoardPosts(PLAIN_BBS, PageRequest.of(0, 10)))
                    .hasSize(1);
            verify(communityBoardAccess, never()).isApprovedMember(any(), anyString());
        }

        @Test
        @DisplayName("승인된 회원은 커뮤니티 게시판 목록을 본다")
        void approvedMemberPasses() {
            given(communityBoardAccess.isApprovedMember(CMNTY_SN, VIEWER)).willReturn(true);
            given(boardRepository.searchArticles(any(BoardSearchCondition.class), any(Pageable.class)))
                    .willReturn(new PageImpl<>(List.of(BoardSearchResult.builder().pstSn(2L).build())));

            assertThat(boardService(communityBoardAccess).getBoardPosts(COMMUNITY_BBS, PageRequest.of(0, 10)))
                    .hasSize(1);
        }

        @Test
        @DisplayName("회원이 아니면 403 이고 목록 질의 자체가 일어나지 않는다")
        void nonMemberDenied() {
            given(communityBoardAccess.isApprovedMember(CMNTY_SN, VIEWER)).willReturn(false);
            BoardService service = boardService(communityBoardAccess);

            assertThatThrownBy(() -> service.getBoardPosts(COMMUNITY_BBS, PageRequest.of(0, 10)))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
            verify(boardRepository, never()).searchArticles(any(BoardSearchCondition.class), any(Pageable.class));
        }

        @Test
        @DisplayName("관리자는 통과한다")
        void adminPasses() {
            securityUtil.when(() -> nuri.business.security.util.SecurityUtil.hasPermission(anyString())).thenReturn(true);
            given(boardRepository.searchArticles(any(BoardSearchCondition.class), any(Pageable.class)))
                    .willReturn(new PageImpl<>(List.of()));

            boardService(communityBoardAccess).getBoardPosts(COMMUNITY_BBS, PageRequest.of(0, 10));
            verify(communityBoardAccess, never()).isApprovedMember(any(), anyString());
        }

        @Test
        @DisplayName("포트가 없으면 거부한다 — 판정 불가를 통과로 다루면 회원 전용이 전원 공개가 된다")
        void missingPortFailsClosed() {
            BoardService service = boardService(null);

            assertThatThrownBy(() -> service.getBoardPosts(COMMUNITY_BBS, PageRequest.of(0, 10)))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
        }

        @Test
        @DisplayName("인증 주체를 알 수 없으면 거부한다")
        void anonymousDenied() {
            securityUtil.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId)
                    .thenReturn(Optional.empty());
            BoardService service = boardService(communityBoardAccess);

            assertThatThrownBy(() -> service.getBoardPosts(COMMUNITY_BBS, PageRequest.of(0, 10)))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
        }
    }

    @Nested
    @DisplayName("상세·댓글·쓰기")
    class OtherEntryPoints {

        @Test
        @DisplayName("상세도 같은 경계다 — 회원이 아니면 본문을 읽을 수 없다")
        void detailDenied() {
            given(communityBoardAccess.isApprovedMember(CMNTY_SN, VIEWER)).willReturn(false);
            BoardService service = boardService(communityBoardAccess);

            assertThatThrownBy(() -> service.getPostDetail(COMMUNITY_BBS, 1L, true))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
            verify(boardRepository, never()).findActiveArticleDetail(anyString(), any());
        }

        @Test
        @DisplayName("🚨 게시판 메타는 인증 사용자에게 제목·템플릿을 준다 — 관리자 권한을 요구하지 않는다 (DIP V5)")
        void metaForPlainBoard() {
            given(boardMasterRepository.findById(PLAIN_BBS)).willReturn(Optional.of(BoardMaster.builder()
                    .bbsId(PLAIN_BBS).bbsTtl("자유게시판").bbsExpln("설명").tmpltId("TMPLT_FAQ").build()));

            nuri.business.service.board.dto.BoardMetaDto meta = boardService(communityBoardAccess).getBoardMeta(PLAIN_BBS);

            assertThat(meta.bbsTtl()).isEqualTo("자유게시판");
            assertThat(meta.tmpltId()).isEqualTo("TMPLT_FAQ");
            // [2026-10-26 ADR-0043 1차 UX-09] 귀속이 없으면 커뮤니티 요약은 null 이다 — 작성 화면이 '로그인한 모든 사용자'라고 말한다.
            assertThat(meta.community()).isNull();
            verify(communityBoardAccess, never()).isApprovedMember(any(), anyString());
        }

        @Test
        @DisplayName("귀속 게시판의 메타는 커뮤니티 이름·이용 가능 여부를 싣고, 포트가 없으면 확인 불가 요약이다 (ADR-0043 1차 UX-09)")
        void metaCarriesCommunitySummary() {
            given(communityBoardAccess.isApprovedMember(CMNTY_SN, VIEWER)).willReturn(true);
            given(communityBoardAccess.summary(CMNTY_SN))
                    .willReturn(Optional.of(new nuri.foundation.core.community.CommunityBoardAccessPort.CommunitySummary("신규 입사자", true)));

            nuri.business.service.board.dto.BoardMetaDto meta = boardService(communityBoardAccess).getBoardMeta(COMMUNITY_BBS);

            assertThat(meta.community()).isNotNull();
            assertThat(meta.community().cmntySn()).isEqualTo(CMNTY_SN);
            assertThat(meta.community().cmntyNm()).isEqualTo("신규 입사자");
            assertThat(meta.community().inUse()).isTrue();

            given(communityBoardAccess.summary(CMNTY_SN)).willReturn(Optional.empty());
            assertThat(boardService(communityBoardAccess).getBoardMeta(COMMUNITY_BBS).community())
                    .isEqualTo(nuri.business.service.board.dto.BoardMasterCommunity.unknown(CMNTY_SN));
        }

        @Test
        @DisplayName("🚨 커뮤니티 게시판의 메타는 회원만 본다 — 비회원에게 제목도 알리지 않는다 (DIP V5)")
        void metaDeniedForNonMember() {
            given(communityBoardAccess.isApprovedMember(CMNTY_SN, VIEWER)).willReturn(false);
            BoardService service = boardService(communityBoardAccess);

            assertThatThrownBy(() -> service.getBoardMeta(COMMUNITY_BBS))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
        }

        @Test
        @DisplayName("없는 게시판의 메타는 404 다")
        void metaMissingBoard() {
            given(boardMasterRepository.findById("BBS_NONE")).willReturn(Optional.empty());
            BoardService service = boardService(communityBoardAccess);

            assertThatThrownBy(() -> service.getBoardMeta("BBS_NONE"))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", nuri.business.domain.board.exception.BoardErrorCode.BOARD_NOT_FOUND);
        }

        @Test
        @DisplayName("댓글 접근도 같은 경계다")
        void commentDenied() {
            given(communityBoardAccess.isApprovedMember(CMNTY_SN, VIEWER)).willReturn(false);
            BoardService service = boardService(communityBoardAccess);

            assertThatThrownBy(() -> service.assertCommentAccess(COMMUNITY_BBS, 1L))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
        }

        @Test
        @DisplayName("읽을 수 없는 게시판에는 쓸 수도 없다 — 삭제도 마찬가지다")
        void writeDenied() {
            given(communityBoardAccess.isApprovedMember(CMNTY_SN, VIEWER)).willReturn(false);
            BoardService service = boardService(communityBoardAccess);

            assertThatThrownBy(() -> service.deletePost(COMMUNITY_BBS, 1L, VIEWER))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
            verify(boardRepository, never()).findById(any());
        }

        /** [2026-09-14 DEC-OPS-092] 첨부를 싣는 수정 경로에만 이 경계가 빠져 있었다. 파일 I/O 전에 막아야 한다. */
        @Test
        @DisplayName("첨부를 싣는 수정도 같은 경계다 — 파일을 만들거나 바꾸기 전에 거부한다")
        void multipartUpdateDenied() {
            given(communityBoardAccess.isApprovedMember(CMNTY_SN, VIEWER)).willReturn(false);
            BoardService service = boardService(communityBoardAccess);

            assertThatThrownBy(() -> service.updatePostWithFiles(COMMUNITY_BBS, 1L, saveRequest(COMMUNITY_BBS),
                    List.of(new org.springframework.mock.web.MockMultipartFile("file", "a.txt", "text/plain", new byte[] {1}))))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
            verify(boardRepository, never()).findById(any());
            org.mockito.Mockito.verifyNoInteractions(fileService);
        }

        /** [2026-10-23 ADR-0040 §6 B1] 운영 화면의 게시 기간 변경도 쓰기 진입 판정을 지난다 — 대행 권한이 회원 자격을 대신하지 않는다. */
        @Test
        @DisplayName("운영 게시 기간 변경(단건·일괄)도 같은 경계다 — 비회원은 대행 권한이 있어도 글을 읽기 전에 거부된다")
        void operatorPeriodChangeDenied() {
            securityUtil.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("BOARD_UPDATE_ALL")).thenReturn(true);
            given(communityBoardAccess.isApprovedMember(CMNTY_SN, VIEWER)).willReturn(false);
            BoardService service = boardService(communityBoardAccess);

            assertThatThrownBy(() -> service.updatePostPeriod(COMMUNITY_BBS, 1L,
                    new nuri.business.service.board.dto.BoardPostPeriodRequest(null, "20991231", 0)))
                    .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
            assertThatThrownBy(() -> service.updatePostPeriodsInBatch(COMMUNITY_BBS,
                    new nuri.business.service.board.dto.BoardPostPeriodBatchRequest("CLEAR_END", List.of(1L), null)))
                    .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
            verify(boardRepository, never()).findById(any());
        }

        /** [2026-10-23 ADR-0040 §6 B2] 운영 화면의 상단 고정도 쓰기 진입 판정을 지난다 — 고정 권한이 회원 자격을 대신하지 않는다. */
        @Test
        @DisplayName("상단 고정(단건·일괄)도 같은 경계다 — 비회원은 고정 권한이 있어도 글을 읽거나 집계하기 전에 거부된다")
        void operatorPinDenied() {
            securityUtil.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("BOARD_PIN")).thenReturn(true);
            given(boardMasterRepository.findByIdWithPessimisticLock(COMMUNITY_BBS)).willReturn(Optional.of(BoardMaster.builder()
                    .bbsId(COMMUNITY_BBS).cmntySn(CMNTY_SN).upendFixPsbltyYn("Y").build()));
            given(communityBoardAccess.isApprovedMember(CMNTY_SN, VIEWER)).willReturn(false);
            BoardService service = boardService(communityBoardAccess);

            assertThatThrownBy(() -> service.updatePostPin(COMMUNITY_BBS, 1L,
                    new nuri.business.service.board.dto.BoardPostPinRequest("Y", null)))
                    .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
            assertThatThrownBy(() -> service.updatePostPinsInBatch(COMMUNITY_BBS,
                    new nuri.business.service.board.dto.BoardPostPinBatchRequest(List.of(1L), "N", null)))
                    .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
            verify(boardRepository, never()).findById(any());
            verify(boardRepository, never()).countActivePins(anyString(), anyString());
            verify(boardRepository, never()).updatePin(anyString(), any(), anyString(), any());
        }

        /**
         * [2026-09-14 DEC-OPS-092] 가드는 URL 의 게시판 ID 로 판정한다. 글을 번호로만 읽으면 커뮤니티 게시판의 글을
         * 일반 게시판 ID 로 요청해 가드를 건너뛸 수 있었다. 여기서는 작성자 본인이라 소유권 검사가 통과하므로,
         * 게시판 대조가 없으면 세 요청 모두 성공한다.
         */
        @Test
        @DisplayName("다른 게시판 ID 로 커뮤니티 글을 수정·삭제할 수 없다 — 없는 글로 본다")
        void crossBoardPathIsNotFound() throws Exception {
            nuri.business.domain.board.Board post = org.mockito.Mockito.spy(nuri.business.domain.board.Board.builder()
                    .bbsId(COMMUNITY_BBS).pstSn(1L).userId(VIEWER).useYn("Y").build());
            given(boardRepository.findById(1L)).willReturn(Optional.of(post));
            BoardService service = boardService(communityBoardAccess);

            assertThatThrownBy(() -> service.updatePost(PLAIN_BBS, 1L, saveRequest(PLAIN_BBS)))
                    .hasFieldOrPropertyWithValue("errorCode", nuri.business.domain.board.exception.BoardErrorCode.ARTICLE_NOT_FOUND);
            assertThatThrownBy(() -> service.updatePostWithFiles(PLAIN_BBS, 1L, saveRequest(PLAIN_BBS), List.of()))
                    .hasFieldOrPropertyWithValue("errorCode", nuri.business.domain.board.exception.BoardErrorCode.ARTICLE_NOT_FOUND);
            assertThatThrownBy(() -> service.deletePost(PLAIN_BBS, 1L, VIEWER))
                    .hasFieldOrPropertyWithValue("errorCode", nuri.business.domain.board.exception.BoardErrorCode.ARTICLE_NOT_FOUND);

            verify(post, never()).update(any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any());
            verify(post, never()).delete();
            verify(communityBoardAccess, never()).isApprovedMember(any(), any());
        }
    }

    private static nuri.business.service.board.dto.BoardSaveRequest saveRequest(String bbsId) {
        return new nuri.business.service.board.dto.BoardSaveRequest(
                bbsId, "제목", "본문", null, null, null, null, null, null, null, null, null, null);
    }

    @Nested
    @DisplayName("통합 검색")
    class GlobalSearch {

        @Test
        @DisplayName("커뮤니티 귀속 게시판을 결과에서 제외한다 — 회원 여부를 술어로 나르지 않는다")
        void excludesCommunityBoards() {
            ArgumentCaptor<BoardSearchCondition> captor = ArgumentCaptor.forClass(BoardSearchCondition.class);
            given(boardRepository.searchArticles(captor.capture(), any(Pageable.class)))
                    .willReturn(new PageImpl<>(List.of()));

            boardService(communityBoardAccess).searchAcrossBoards("공지사항", PageRequest.of(0, 10));

            assertThat(captor.getValue().isExcludeCommunityBoards()).isTrue();
        }

        @Test
        @DisplayName("게시판 한정 목록은 제외 축을 켜지 않는다 — 회원이 자기 게시판을 못 보게 된다")
        void perBoardListingDoesNotExclude() {
            ArgumentCaptor<BoardSearchCondition> captor = ArgumentCaptor.forClass(BoardSearchCondition.class);
            given(boardRepository.searchArticles(captor.capture(), any(Pageable.class)))
                    .willReturn(new PageImpl<>(List.of()));
            given(communityBoardAccess.isApprovedMember(CMNTY_SN, VIEWER)).willReturn(true);

            boardService(communityBoardAccess).getBoardPosts(COMMUNITY_BBS, PageRequest.of(0, 10));

            assertThat(captor.getValue().isExcludeCommunityBoards()).isFalse();
        }
    }

    @Nested
    @DisplayName("커뮤니티 게시판 목록 API")
    class CommunityBoardListing {

        @Test
        @DisplayName("승인된 회원은 귀속 게시판 목록을 받는다")
        void memberSeesBoards() {
            given(communityBoardAccess.isApprovedMember(CMNTY_SN, VIEWER)).willReturn(true);
            given(boardMasterRepository.findByCmntySnAndUseYn(CMNTY_SN, "Y"))
                    .willReturn(List.of(BoardMaster.builder().bbsId(COMMUNITY_BBS).bbsTtl("회원 게시판")
                            .cmntySn(CMNTY_SN).build()));

            List<CommunityBoardDto> boards = boardMasterService(communityBoardAccess).getCommunityBoards(CMNTY_SN);

            assertThat(boards).singleElement()
                    .satisfies(board -> {
                        assertThat(board.bbsId()).isEqualTo(COMMUNITY_BBS);
                        assertThat(board.bbsTtl()).isEqualTo("회원 게시판");
                    });
        }

        @Test
        @DisplayName("회원이 아니면 403 이고 목록 질의도 하지 않는다")
        void nonMemberDenied() {
            given(communityBoardAccess.isApprovedMember(CMNTY_SN, VIEWER)).willReturn(false);
            BoardMasterService service = boardMasterService(communityBoardAccess);

            assertThatThrownBy(() -> service.getCommunityBoards(CMNTY_SN))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
            verify(boardMasterRepository, never()).findByCmntySnAndUseYn(any(), anyString());
        }

        @Test
        @DisplayName("[DIP B4 P5] 게시판 진입 게이트가 통과시키는 전체 열람 권한자는 회원이 아니어도 목록을 본다")
        void boardReadAllSeesBoardsWithoutMembership() {
            securityUtil.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("BOARD_READ_ALL")).thenReturn(true);
            given(boardMasterRepository.findByCmntySnAndUseYn(CMNTY_SN, "Y"))
                    .willReturn(List.of(BoardMaster.builder().bbsId(COMMUNITY_BBS).bbsTtl("회원 게시판")
                            .cmntySn(CMNTY_SN).build()));

            assertThat(boardMasterService(communityBoardAccess).getCommunityBoards(CMNTY_SN)).hasSize(1);
            verify(communityBoardAccess, never()).isApprovedMember(any(), anyString());
        }

        @Test
        @DisplayName("포트가 없으면 거부한다")
        void missingPortFailsClosed() {
            BoardMasterService service = boardMasterService(null);

            assertThatThrownBy(() -> service.getCommunityBoards(CMNTY_SN))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
        }
    }

    @Nested
    @DisplayName("게시판 생성 시 커뮤니티 존재 검증")
    class CreationValidation {
        @org.junit.jupiter.api.BeforeEach
        void authorizeCreation() {
            securityUtil.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("BBS_MST_CREATE")).thenReturn(true);
        }


        @Test
        @DisplayName("없는 커뮤니티에 귀속시키면 404 다 — 아무도 회원일 수 없는 게시판을 만들지 않는다")
        void unknownCommunityRejected() {
            given(communityBoardAccess.exists(CMNTY_SN)).willReturn(false);
            BoardMasterService service = boardMasterService(communityBoardAccess);
            nuri.business.service.board.dto.BoardMasterDto dto = new nuri.business.service.board.dto.BoardMasterDto();
            dto.setBbsTtl("회원 게시판");
            dto.setCmntySn(CMNTY_SN);

            assertThatThrownBy(() -> service.createBoardMaster("admin", dto))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.RESOURCE_NOT_FOUND);
        }

        @Test
        @DisplayName("귀속이 없으면 검증하지 않는다 — 종전 생성 경로는 그대로다")
        void plainCreationSkipsValidation() {
            // 포트를 아예 주지 않는다(커뮤니티 도메인이 빠진 프로필). 귀속이 없는 게시판 생성은
            // 그 상황에서도 종전과 똑같이 성공해야 한다 — 여기서 막히면 회귀다.
            BoardMasterService service = boardMasterService(null);
            jakarta.persistence.EntityManager entityManager =
                    org.mockito.Mockito.mock(jakarta.persistence.EntityManager.class);
            org.springframework.test.util.ReflectionTestUtils.setField(service, "entityManager", entityManager);
            nuri.business.service.board.dto.BoardMasterDto dto = new nuri.business.service.board.dto.BoardMasterDto();
            dto.setBbsTtl("일반 게시판");

            String bbsId = service.createBoardMaster("admin", dto);

            assertThat(bbsId).startsWith("BBSMSTR_");
            verify(entityManager).persist(any(BoardMaster.class));
        }

        @Test
        @DisplayName("존재하는 커뮤니티에 귀속시키면 통과한다")
        void knownCommunityAccepted() {
            given(communityBoardAccess.exists(CMNTY_SN)).willReturn(true);
            BoardMasterService service = boardMasterService(communityBoardAccess);
            jakarta.persistence.EntityManager entityManager =
                    org.mockito.Mockito.mock(jakarta.persistence.EntityManager.class);
            org.springframework.test.util.ReflectionTestUtils.setField(service, "entityManager", entityManager);
            nuri.business.service.board.dto.BoardMasterDto dto = new nuri.business.service.board.dto.BoardMasterDto();
            dto.setBbsTtl("회원 게시판");
            dto.setCmntySn(CMNTY_SN);

            service.createBoardMaster("admin", dto);

            ArgumentCaptor<BoardMaster> captor = ArgumentCaptor.forClass(BoardMaster.class);
            verify(entityManager).persist(captor.capture());
            assertThat(captor.getValue().getCmntySn()).isEqualTo(CMNTY_SN);
        }
    }

    /**
     * [2026-10-23 ADR-0040 결정 1] 사용 안 함 게시판은 이용자에게 읽기·쓰기 모두 닫힌다. 거부는 없는 게시판과 같은 404 라 존재를
     * 드러내지 않고, 사용 여부를 커뮤니티 가드보다 먼저 봐서 사용 안 함 커뮤니티 게시판의 비회원도 403 이 아니라 404 를 받는다.
     * 조회 대행 권한(BOARD_READ_ALL) 보유자는 목록·상세·메타·댓글 조회와 (해당 동작 권한이 있으면) 글 정리를 한다. 새 참여
     * (댓글·만족도 등록, 추천)와 업무 홈 카드·통계는 운영자에게도 닫힌다.
     */
    @Nested
    @DisplayName("사용 안 함 게시판(ADR-0040 결정 1)")
    class InactiveBoard {

        private static final String CLOSED_COMMUNITY = "BBS_CLOSED_CMNTY";
        private static final String CLOSED_PLAIN = "BBS_CLOSED";
        private static final String MISSING = "BBS_NONE";

        @BeforeEach
        void closeBoards() {
            given(boardMasterRepository.findById(CLOSED_COMMUNITY)).willReturn(Optional.of(
                    BoardMaster.builder().bbsId(CLOSED_COMMUNITY).cmntySn(CMNTY_SN).useYn("N").build()));
            given(boardMasterRepository.findByIdWithPessimisticLock(CLOSED_COMMUNITY)).willReturn(Optional.of(
                    BoardMaster.builder().bbsId(CLOSED_COMMUNITY).cmntySn(CMNTY_SN).useYn("N").build()));
            given(boardMasterRepository.findById(CLOSED_PLAIN)).willReturn(Optional.of(
                    BoardMaster.builder().bbsId(CLOSED_PLAIN).useYn("N").build()));
            given(boardMasterRepository.findById(MISSING)).willReturn(Optional.empty());
            given(boardMasterRepository.findByIdWithPessimisticLock(MISSING)).willReturn(Optional.empty());
        }

        /** 수정 요청은 상세에서 읽은 게시글 버전을 싣는다(ADR-0040 결정 10). */
        private nuri.business.service.board.dto.BoardSaveRequest versioned(
                nuri.business.service.board.dto.BoardSaveRequest request, int version) {
            return new nuri.business.service.board.dto.BoardSaveRequest(request.bbsId(), request.pstTtl(), request.pstCn(),
                    request.pstBgngYmd(), request.pstEndYmd(), request.atchFileSn(), request.evntDt(), request.qnaSttsCd(),
                    request.qnaCatCd(), request.scrtYn(), request.useYn(), request.pswd(), version);
        }

        private nuri.business.service.board.dto.BoardSaveRequest request(String bbsId) {
            return new nuri.business.service.board.dto.BoardSaveRequest(
                    bbsId, "제목", "본문", null, null, null, null, null, null, null, null, null, null);
        }

        private List<org.springframework.web.multipart.MultipartFile> oneFile() {
            return List.of(new org.springframework.mock.web.MockMultipartFile(
                    "file", "a.txt", "text/plain", "a".getBytes()));
        }

        /** 거부가 없는 게시판과 같은 오류 코드·문구인지 — 다르면 응답으로 존재를 알 수 있다. */
        private void assertSameAsMissing(org.assertj.core.api.ThrowableAssert.ThrowingCallable closed,
                org.assertj.core.api.ThrowableAssert.ThrowingCallable missing) {
            Throwable expected = org.assertj.core.api.Assertions.catchThrowable(missing);
            assertThat(expected).isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", nuri.business.domain.board.exception.BoardErrorCode.BOARD_NOT_FOUND);
            assertThatThrownBy(closed).isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ((BusinessException) expected).getErrorCode())
                    .hasMessage(expected.getMessage());
        }

        @Test
        @DisplayName("🔒 비회원은 사용 안 함 커뮤니티 게시판의 열람·쓰기 모두 없는 게시판과 같은 404 다 — 회원 판정도, 파일 저장도 없다")
        void nonMemberGetsTheSameNotFoundAsAMissingBoard() {
            BoardService service = boardService(communityBoardAccess);
            securityUtil.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("BOARD_CREATE")).thenReturn(true);

            assertSameAsMissing(() -> service.getBoardMeta(CLOSED_COMMUNITY), () -> service.getBoardMeta(MISSING));
            assertSameAsMissing(() -> service.getBoardPosts(CLOSED_COMMUNITY, "0", "", null, null, null, null, null, null,
                    PageRequest.of(0, 10), BoardPostListFilter.NONE), () -> service.getBoardPosts(MISSING, "0", "", null, null, null, null, null,
                    null, PageRequest.of(0, 10), BoardPostListFilter.NONE));
            assertSameAsMissing(() -> service.getPostDetail(CLOSED_COMMUNITY, 1L, true),
                    () -> service.getPostDetail(MISSING, 1L, true));
            assertSameAsMissing(() -> service.assertCommentReadAccess(CLOSED_COMMUNITY, 1L),
                    () -> service.assertCommentReadAccess(MISSING, 1L));
            assertSameAsMissing(() -> service.createPost("writer", request(CLOSED_COMMUNITY)),
                    () -> service.createPost("writer", request(MISSING)));
            assertSameAsMissing(() -> service.createPostWithFiles("writer", request(CLOSED_COMMUNITY), oneFile()),
                    () -> service.createPostWithFiles("writer", request(MISSING), oneFile()));
            assertSameAsMissing(() -> service.replyPost("writer", 1L, request(CLOSED_COMMUNITY)),
                    () -> service.replyPost("writer", 1L, request(MISSING)));
            assertSameAsMissing(() -> service.replyPostWithFiles("writer", 1L, request(CLOSED_COMMUNITY), oneFile()),
                    () -> service.replyPostWithFiles("writer", 1L, request(MISSING), oneFile()));
            assertSameAsMissing(() -> service.updatePost(CLOSED_COMMUNITY, 1L, request(CLOSED_COMMUNITY)),
                    () -> service.updatePost(MISSING, 1L, request(MISSING)));
            assertSameAsMissing(() -> service.updatePostWithFiles(CLOSED_COMMUNITY, 1L, request(CLOSED_COMMUNITY), oneFile()),
                    () -> service.updatePostWithFiles(MISSING, 1L, request(MISSING), oneFile()));
            assertSameAsMissing(() -> service.deletePost(CLOSED_COMMUNITY, 1L, "writer"),
                    () -> service.deletePost(MISSING, 1L, "writer"));
            assertSameAsMissing(() -> service.markQuestionSolved(CLOSED_COMMUNITY, 1L),
                    () -> service.markQuestionSolved(MISSING, 1L));

            verify(communityBoardAccess, never()).isApprovedMember(any(), anyString());
            org.mockito.Mockito.verifyNoInteractions(fileService);
            verify(boardRepository, never()).findById(any());
            verify(boardRepository, never()).save(any());
        }

        @Test
        @DisplayName("작성자 본인이라도 조회 대행 권한이 없으면 사용 안 함 게시판의 자기 글을 고칠 수 없다")
        void authorWithoutReadAllCannotEditInClosedBoard() {
            securityUtil.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of("author"));
            assertThatThrownBy(() -> boardService(communityBoardAccess).updatePost(CLOSED_PLAIN, 1L, request(CLOSED_PLAIN)))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", nuri.business.domain.board.exception.BoardErrorCode.BOARD_NOT_FOUND);
            verify(boardRepository, never()).findById(any());
        }

        @Test
        @DisplayName("조회 대행 권한자는 사용 안 함 게시판의 목록·메타·상세·댓글 조회를 한다 — 목록은 마스터 조건을 풀어 질의한다")
        void operatorReadsClosedBoard() {
            securityUtil.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("BOARD_READ_ALL")).thenReturn(true);
            given(boardRepository.searchArticles(any(BoardSearchCondition.class), any(Pageable.class)))
                    .willReturn(new PageImpl<>(List.of(BoardSearchResult.builder().pstSn(3L).build())));
            given(boardRepository.findArticleDetailOnInactiveBoard(CLOSED_PLAIN, 3L, false)).willReturn(Optional.of(
                    nuri.business.domain.board.BoardDetailResult.builder().bbsId(CLOSED_PLAIN).pstSn(3L).build()));
            BoardService service = boardService(communityBoardAccess);

            assertThat(service.getBoardPosts(CLOSED_PLAIN, "0", "", null, null, null, null, null, null,
                    PageRequest.of(0, 10), BoardPostListFilter.NONE)).hasSize(1);
            ArgumentCaptor<BoardSearchCondition> condition = ArgumentCaptor.forClass(BoardSearchCondition.class);
            verify(boardRepository).searchArticles(condition.capture(), any(Pageable.class));
            assertThat(condition.getValue().isIncludeInactiveBoard()).isTrue();

            assertThat(service.getBoardMeta(CLOSED_PLAIN).inUse()).isFalse();
            assertThat(service.getPostDetail(CLOSED_PLAIN, 3L, false).pstSn()).isEqualTo(3L);
            service.assertCommentReadAccess(CLOSED_PLAIN, 3L);
            verify(boardRepository, never()).findActiveArticleDetail(anyString(), any());
        }

        @Test
        @DisplayName("사용 중인 게시판의 목록은 마스터 조건을 풀지 않는다 — 운영자라도 같다")
        void operatorOnActiveBoardKeepsTheMasterCondition() {
            securityUtil.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("BOARD_READ_ALL")).thenReturn(true);
            given(boardRepository.searchArticles(any(BoardSearchCondition.class), any(Pageable.class)))
                    .willReturn(new PageImpl<>(List.of()));

            boardService(communityBoardAccess).getBoardPosts(PLAIN_BBS, "0", "", null, null, null, null, null, null,
                    PageRequest.of(0, 10), BoardPostListFilter.NONE);

            ArgumentCaptor<BoardSearchCondition> condition = ArgumentCaptor.forClass(BoardSearchCondition.class);
            verify(boardRepository).searchArticles(condition.capture(), any(Pageable.class));
            assertThat(condition.getValue().isIncludeInactiveBoard()).isFalse();
            assertThat(boardService(communityBoardAccess).getBoardMeta(PLAIN_BBS).inUse()).isTrue();
        }

        @Test
        @DisplayName("🔒 새 참여와 업무 홈 카드·통계는 운영자에게도 닫힌다 — 댓글·만족도 등록, 추천·추천 취소는 엄격 경계다")
        void participationAndHomeStayClosedForOperators() {
            securityUtil.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("BOARD_READ_ALL")).thenReturn(true);
            BoardService service = boardService(communityBoardAccess);

            for (org.assertj.core.api.ThrowableAssert.ThrowingCallable closed : List.<org.assertj.core.api.ThrowableAssert.ThrowingCallable>of(
                    () -> service.assertCommentAccess(CLOSED_PLAIN, 3L),
                    () -> service.incrementLike(CLOSED_PLAIN, 3L),
                    // [ADR-0040 결정 6] 추천 취소도 추천과 같은 엄격 경계다 — 사용 안 함 게시판은 운영자에게도 닫힌다.
                    () -> service.cancelLike(CLOSED_PLAIN, 3L),
                    () -> service.getBoardPosts(CLOSED_PLAIN, PageRequest.of(0, 5)),
                    () -> service.getBoardStats(CLOSED_PLAIN))) {
                assertThatThrownBy(closed).isInstanceOf(BusinessException.class)
                        .hasFieldOrPropertyWithValue("errorCode", nuri.business.domain.board.exception.BoardErrorCode.BOARD_NOT_FOUND);
            }
            verify(boardRepository, never()).searchArticles(any(), any());
            verify(recommendationRepository, never()).saveAndFlush(any());
            verify(recommendationRepository, never()).deleteRecommendation(any(), any());
        }

        @Test
        @DisplayName("조회 대행 권한과 수정 대행 권한이 있는 운영자는 사용 안 함 게시판의 글을 정리한다")
        void operatorTidiesClosedBoard() {
            securityUtil.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("BOARD_READ_ALL")).thenReturn(true);
            securityUtil.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("BOARD_UPDATE_ALL")).thenReturn(true);
            nuri.business.domain.board.Board post = nuri.business.domain.board.Board.builder()
                    .bbsId(CLOSED_PLAIN).pstSn(3L).userId("someone").pstTtl("옛 제목").build();
            given(boardRepository.findById(3L)).willReturn(Optional.of(post));
            org.springframework.test.util.ReflectionTestUtils.setField(post, "version", 0); // [ADR-0040 결정 10]

            boardService(communityBoardAccess).updatePost(CLOSED_PLAIN, 3L, versioned(request(CLOSED_PLAIN), 0));

            assertThat(post.getPstTtl()).isEqualTo("제목");
        }

        @Test
        @DisplayName("🔒 사용 안 함 게시판의 상단 고정은 조회 대행 권한이 없으면 없는 게시판과 같은 404 다 — 커뮤니티 가드보다 먼저 본다")
        void pinOnClosedBoardIsNotFoundWithoutReadAll() {
            securityUtil.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("BOARD_PIN")).thenReturn(true);
            given(boardMasterRepository.findByIdWithPessimisticLock(CLOSED_PLAIN)).willReturn(Optional.of(
                    BoardMaster.builder().bbsId(CLOSED_PLAIN).useYn("N").upendFixPsbltyYn("Y").build()));
            BoardService service = boardService(communityBoardAccess);

            for (String board : List.of(CLOSED_PLAIN, CLOSED_COMMUNITY)) {
                assertThatThrownBy(() -> service.updatePostPin(board, 3L,
                        new nuri.business.service.board.dto.BoardPostPinRequest("Y", null)))
                        .isInstanceOf(BusinessException.class)
                        .hasFieldOrPropertyWithValue("errorCode", nuri.business.domain.board.exception.BoardErrorCode.BOARD_NOT_FOUND);
            }
            verify(boardRepository, never()).findById(any());
            verify(communityBoardAccess, never()).isApprovedMember(any(), any());
        }

        @Test
        @DisplayName("논리 삭제된 글은 고치거나 다시 지울 수 없다 — 없는 글과 같다")
        void logicallyDeletedPostIsNotFoundForWrites() {
            securityUtil.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("BOARD_UPDATE_ALL")).thenReturn(true);
            securityUtil.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("BOARD_DELETE_ALL")).thenReturn(true);
            nuri.business.domain.board.Board deleted = nuri.business.domain.board.Board.builder()
                    .bbsId(PLAIN_BBS).pstSn(4L).userId("someone").pstTtl("지운 글").useYn("N").build();
            given(boardRepository.findById(4L)).willReturn(Optional.of(deleted));
            BoardService service = boardService(communityBoardAccess);

            for (org.assertj.core.api.ThrowableAssert.ThrowingCallable write : List.<org.assertj.core.api.ThrowableAssert.ThrowingCallable>of(
                    () -> service.updatePost(PLAIN_BBS, 4L, request(PLAIN_BBS)),
                    () -> service.deletePost(PLAIN_BBS, 4L, "someone"))) {
                assertThatThrownBy(write).isInstanceOf(BusinessException.class)
                        .hasFieldOrPropertyWithValue("errorCode", nuri.business.domain.board.exception.BoardErrorCode.ARTICLE_NOT_FOUND);
            }
            assertThat(deleted.getPstTtl()).isEqualTo("지운 글");
        }
    }

    /**
     * [2026-10-23 ADR-0040 결정 11] 이용 화면의 게시판 선택지. 사용 여부는 저장소 질의가 거르고(사용 중만), 커뮤니티 귀속은
     * 진입 가드와 같은 규칙을 거부 대신 거르기로 적용한다. 화면의 시드 폴백·클라이언트 사용 여부 필터는 이 판정으로 대체했다.
     */
    @Nested
    @DisplayName("게시판 선택지")
    class Options {

        private static final Long OTHER_CMNTY = 9L;

        @BeforeEach
        void rows() {
            given(boardMasterRepository.findActiveBoardOptions()).willReturn(List.of(
                    new nuri.business.domain.board.BoardOptionRow(PLAIN_BBS, "공지", null),
                    new nuri.business.domain.board.BoardOptionRow(COMMUNITY_BBS, "동호회 게시판", CMNTY_SN),
                    new nuri.business.domain.board.BoardOptionRow("BBS_CMNTY_2", "동호회 자료실", CMNTY_SN),
                    new nuri.business.domain.board.BoardOptionRow("BBS_OTHER", "다른 모임", OTHER_CMNTY)));
        }

        private List<String> optionIds() {
            return boardService(communityBoardAccess).getBoardOptions().stream()
                    .map(nuri.business.service.board.dto.BoardOptionDto::bbsId).toList();
        }

        @Test
        @DisplayName("비회원에게는 귀속 없는 게시판만 보이고, 커뮤니티마다 한 번만 판정한다")
        void nonMemberSeesOnlyUnaffiliatedBoards() {
            given(communityBoardAccess.isApprovedMember(anyLong(), anyString())).willReturn(false);

            assertThat(optionIds()).containsExactly(PLAIN_BBS);
            verify(communityBoardAccess, org.mockito.Mockito.times(1)).isApprovedMember(CMNTY_SN, VIEWER);
            verify(communityBoardAccess, org.mockito.Mockito.times(1)).isApprovedMember(OTHER_CMNTY, VIEWER);
        }

        @Test
        @DisplayName("승인 회원에게는 자기 커뮤니티 게시판이 순서대로 더해지고, 응답은 ID·이름뿐이다")
        void approvedMemberSeesOwnCommunity() {
            given(communityBoardAccess.isApprovedMember(CMNTY_SN, VIEWER)).willReturn(true);
            given(communityBoardAccess.isApprovedMember(OTHER_CMNTY, VIEWER)).willReturn(false);

            List<nuri.business.service.board.dto.BoardOptionDto> options = boardService(communityBoardAccess).getBoardOptions();

            assertThat(options).extracting(nuri.business.service.board.dto.BoardOptionDto::bbsId)
                    .containsExactly(PLAIN_BBS, COMMUNITY_BBS, "BBS_CMNTY_2");
            assertThat(options.get(1).bbsTtl()).isEqualTo("동호회 게시판");
            assertThat(nuri.business.service.board.dto.BoardOptionDto.class.getRecordComponents())
                    .extracting(java.lang.reflect.RecordComponent::getName).containsExactly("bbsId", "bbsTtl");
        }

        @Test
        @DisplayName("조회 대행 권한 보유자는 판정 없이 모든 사용 중 게시판을 본다")
        void readAllSeesEveryActiveBoardWithoutPort() {
            securityUtil.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("BOARD_READ_ALL")).thenReturn(true);

            assertThat(optionIds()).containsExactly(PLAIN_BBS, COMMUNITY_BBS, "BBS_CMNTY_2", "BBS_OTHER");
            verify(communityBoardAccess, never()).isApprovedMember(anyLong(), anyString());
        }

        @Test
        @DisplayName("🔒 판정 포트가 없거나 로그인 주체가 없으면 귀속 게시판을 뺀다(fail-closed)")
        void failsClosedWithoutPortOrPrincipal() {
            assertThat(boardService(null).getBoardOptions())
                    .extracting(nuri.business.service.board.dto.BoardOptionDto::bbsId).containsExactly(PLAIN_BBS);

            securityUtil.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId).thenReturn(Optional.empty());
            given(communityBoardAccess.isApprovedMember(anyLong(), anyString())).willReturn(true);
            assertThat(optionIds()).containsExactly(PLAIN_BBS);
            verify(communityBoardAccess, never()).isApprovedMember(anyLong(), anyString());
        }
    }
}
