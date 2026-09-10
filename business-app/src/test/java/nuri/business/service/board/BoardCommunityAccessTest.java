package nuri.business.service.board;

import nuri.business.domain.board.BoardMaster;
import nuri.business.domain.board.BoardMasterRepository;
import nuri.business.domain.board.BoardRepository;
import nuri.business.domain.board.BoardSearchCondition;
import nuri.business.domain.board.BoardSearchResult;
import nuri.business.service.board.dto.BoardMapperImpl;
import nuri.business.service.board.dto.BoardMasterMapperImpl;
import nuri.business.service.board.dto.CommunityBoardDto;
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
import static org.mockito.ArgumentMatchers.eq;
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
                new BoardMapperImpl(), new nuri.business.core.config.BoardIdProperties(), port);
    }

    private BoardMasterService boardMasterService(CommunityBoardAccessPort port) {
        return new BoardMasterService(boardMasterRepository, boardRepository,
                new BoardMasterMapperImpl(), port);
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

            assertThatThrownBy(() -> service.getPostDetail(COMMUNITY_BBS, 1L))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
            verify(boardRepository, never()).findActiveArticleDetail(anyString(), any());
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
}
