package nuri.business.service.board;

import nuri.business.core.config.BoardIdProperties;
import nuri.business.core.service.BaseAbstractService;
import nuri.business.domain.board.Board;
import nuri.business.domain.board.BoardDetailResult;
import nuri.business.domain.board.BoardMaster;
import nuri.business.domain.board.BoardMasterRepository;
import nuri.business.domain.board.BoardRepository;
import nuri.business.domain.board.BoardScrapCandidate;
import nuri.business.domain.board.exception.BoardErrorCode;
import nuri.business.security.util.SecurityUtil;
import nuri.business.service.board.dto.PostingStatus;
import nuri.foundation.core.board.BoardPostAccessPort;
import nuri.foundation.core.community.CommunityBoardAccessPort;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Clock;
import java.util.List;

import static nuri.business.service.board.BoardPolicySupport.*;

/**
 * 게시판·게시글 접근 판정 — 게시판 진입(엄격·열람·쓰기), 글 소속, 댓글·만족도·추천·스크랩의 열람 경계.
 *
 * <p>[2026-11-25 품질 평가 3순위 11] {@link BoardService} 에서 떼어 냈다. 댓글·만족도 컨트롤러와 스크랩({@link BoardPostAccessPort})은
 * 이 판정만 쓰는데 게시판 서비스 전체(첨부·작성자·운영 일정·추천)에 의존하고 있었다. 판정 본문과 순서는 옮기기 전과 같다.
 *
 * <p>{@link BoardService} 는 같은 의존성으로 이 클래스를 직접 만들어 쓴다 — 패키지 범위 헬퍼(진입 판정·글 소속)를 프록시 없이 자기
 * 트랜잭션 안에서 부르기 위해서다(잠금 조회가 등록 트랜잭션에 그대로 참여한다). 상태는 시계뿐이고 판정은 요청마다 저장소에서 다시 읽으므로
 * 두 인스턴스의 판정이 갈라지지 않는다.
 */
@Service
@Transactional(readOnly = true)
public class BoardAccessService extends BaseAbstractService implements BoardPostAccessPort {

        private final BoardRepository boardRepository;
        private final BoardMasterRepository boardMasterRepository;
        private final BoardIdProperties boardIdProperties;

        /**
         * 커뮤니티 귀속 게시판({@code tb_bbs_master.cmnty_sn} 이 있는 게시판)의 접근 판정 포트.
         *
         * <p>커뮤니티 도메인이 base projection 에서 빠지면 이 빈이 없다 — 그때는 {@code null} 이며
         * 호출부는 <b>거부</b>로 해석한다(fail-closed). 판정할 수 없는데 통과시키면 회원 전용
         * 게시판이 전원 공개로 뒤집히기 때문이다(H3).
         */
        private final @Nullable CommunityBoardAccessPort communityBoardAccess;

        /** 게시 기간 판정의 시계(ADR-0040 결정 3). {@link BoardService#useClock} 가 시험에서 함께 고정한다. */
        private Clock clock = Clock.system(BoardPolicySupport.SERVICE_ZONE);

        public BoardAccessService(BoardRepository boardRepository,
                        BoardMasterRepository boardMasterRepository,
                        BoardIdProperties boardIdProperties,
                        @Nullable CommunityBoardAccessPort communityBoardAccess) {
                this.boardRepository = required(boardRepository, "boardRepository 는 null 일 수 없습니다");
                this.boardMasterRepository = required(boardMasterRepository, "boardMasterRepository 는 null 일 수 없습니다");
                this.boardIdProperties = required(boardIdProperties, "boardIdProperties 는 null 일 수 없습니다");
                // 포트는 선택 주입이다 — 커뮤니티 도메인이 없는 프로필에서는 null 이고, 그때 커뮤니티
                // 귀속 게시판은 관리자 외에게 닫힌다(아래 assertCommunityAccess).
                this.communityBoardAccess = communityBoardAccess;
        }

        /** 날짜 경계 회귀 시험에서 운영과 같은 시간대의 시계를 고정한다(ADR-0040 결정 3). */
        void useClock(Clock clock) {
                this.clock = java.util.Objects.requireNonNull(clock, "clock");
        }

        /** 게시 기간 판정의 기준일(yyyyMMdd, Asia/Seoul). 공개 메서드가 요청마다 한 번 부른다. */
        private String today() {
                return todayYmd(clock);
        }

        /** 두 설정이 같은 게시판을 가리키면 두 편집 권한이 모두 필요하다. */
        List<String> requiredEditPermissions(String bbsId) {
                var permissions = new java.util.ArrayList<String>();
                if (bbsId.equals(boardIdProperties.getNoticeId())) permissions.add("NOTICE_EDIT");
                if (bbsId.equals(boardIdProperties.getFaqId())) permissions.add("FAQ_EDIT");
                return List.copyOf(permissions);
        }

        private void assertSpecialBoardEdit(String bbsId) {
                requiredEditPermissions(bbsId).forEach(SecurityUtil::assertPermission);
        }

        /**
         * 엄격한 게시판 진입 판정 — 사용 중인 게시판만 통과한다(운영자 예외 없음). 없는 게시판과 사용 안 함 게시판은 같은
         * 404 다. 사용 여부를 커뮤니티 가드보다 먼저 본다.
         */
        BoardMaster assertActiveBoardMaster(String bbsId) {
                BoardMaster master = boardMasterRepository.findById(required(bbsId, "bbsId 는 null 일 수 없습니다"))
                                .filter(candidate -> "Y".equals(candidate.getUseYn()))
                                .orElseThrow(() -> new BusinessException(BoardErrorCode.BOARD_NOT_FOUND));
                assertCommunityAccess(master);
                return master;
        }

        /**
         * 열람 판정 — 사용 중인 게시판, 또는 조회 대행 권한(BOARD_READ_ALL) 보유자에게 사용 안 함 게시판이 통과한다
         * (ADR-0040 결정 1의 운영자 예외). 없는 게시판과 이용자에게 닫힌 사용 안 함 게시판은 같은 404 다 — 목록과 같은 응답이라
         * 존재를 드러내지 않는다. 사용 여부를 커뮤니티 가드보다 먼저 본다(사용 안 함 커뮤니티 게시판의 비회원도 404).
         *
         * @param pessimisticLock 등록처럼 채번을 직렬화하는 경로는 마스터 행을 잠가 읽는다. 같은 트랜잭션이 잠근 행을 읽으므로
         *                        동시에 사용 안 함으로 바뀌어도 커밋된 값을 본다.
         *
         * <p>공개 메서드인 것은 인가 원장(수동 가드)이 접근 제한자가 있는 선언만 본문으로 찾기 때문이다 — 판정만 하고 마스터를
         * 돌려주므로 다른 패키지에서 불러도 우회 경로가 생기지 않는다. 잠금 조회({@code pessimisticLock})는 부르는 쪽의 쓰기
         * 트랜잭션 안에서만 뜻이 있다.
         */
        public BoardMaster loadReadableMaster(String bbsId, boolean pessimisticLock) {
                String id = required(bbsId, "bbsId 는 null 일 수 없습니다");
                BoardMaster master = (pessimisticLock
                                ? boardMasterRepository.findByIdWithPessimisticLock(id)
                                : boardMasterRepository.findById(id))
                                .filter(candidate -> "Y".equals(candidate.getUseYn())
                                                || SecurityUtil.hasPermission("BOARD_READ_ALL"))
                                .orElseThrow(() -> new BusinessException(BoardErrorCode.BOARD_NOT_FOUND));
                assertCommunityAccess(master);
                return master;
        }

        /**
         * 쓰기 진입 판정 — 지정 게시판 편집 가드, 사용 여부(조회 대행 권한 예외, 404), 커뮤니티 가드를 이 순서로 본다. 글 소속·
         * 논리 삭제 판정은 호출부가 뒤이어 한다(findPostInBoard). 파일 저장보다 먼저 부른다(ADR-0040 결정 1).
         *
         * <p>지정 게시판 가드를 맨 앞에 두어도 존재가 드러나지 않는다 — 설정으로 알려진 ID 만 보기 때문이다. 사용 안 함 게시판에
         * 글을 준비·정리하는 운영자도 그 동작의 권한(BOARD_CREATE·BOARD_UPDATE_ALL·BOARD_DELETE_ALL)은 따로 지난다.
         * 공개인 까닭은 {@link #loadReadableMaster} 와 같다.
         */
        public BoardMaster loadWritableMaster(String bbsId, boolean pessimisticLock) {
                assertSpecialBoardEdit(bbsId);
                return loadReadableMaster(bbsId, pessimisticLock);
        }

        /**
         * 커뮤니티 귀속 게시판이면 <b>승인된 회원</b>만 통과시킨다(관리자는 예외).
         *
         * <p>[2026-09-08 PD-CMTY-001] {@code cmnty_sn} 은 V2_0 부터 있었지만 읽는 코드가 없어
         * 귀속이 아무것도 뜻하지 않았다(GAP-CMTY-001 — 회원이 되어도 열리는 기능이 없었다).
         * 이제 이 값이 있는 게시판은 회원 전용이다.
         *
         * <p>귀속이 없는 게시판({@code cmntySn == null})의 거동은 <b>전혀 바뀌지 않는다</b> —
         * 현재 저장소의 모든 게시판이 여기 해당한다.
         */
        private void assertCommunityAccess(BoardMaster master) {
                Long cmntySn = master == null ? null : master.getCmntySn();
                if (cmntySn == null) {
                        return;
                }
                // 조회 대행 권한(BOARD_READ_ALL) 보유자는 다른 열람 경로와 같은 이유로 통과한다(운영·감사).
                if (SecurityUtil.hasPermission("BOARD_READ_ALL")) {
                        return;
                }
                String esntlId = SecurityUtil.getCurrentEsntlId().orElse(null);
                if (esntlId == null || communityBoardAccess == null
                                || !communityBoardAccess.isApprovedMember(cmntySn, esntlId)) {
                        throw new BusinessException(CommonErrorCode.ACCESS_DENIED,
                                        "커뮤니티 회원만 이용할 수 있는 게시판입니다.");
                }
        }

        /**
         * URL 의 게시판에 실제로 속한 글만 돌려준다 — 다르면 없는 글로 본다. 논리 삭제된 글도 없는 글이다
         * ([2026-10-23 ADR-0040 결정 1] findById 는 soft-delete 필터를 받지 않아 종전에는 지운 글도 고치고 다시 지웠다).
         *
         * <p>[2026-09-14 DEC-OPS-092] 수정·삭제는 커뮤니티 가드를 URL 의 {@code bbsId} 로 판정하는데,
         * 종전에는 글을 번호로만 읽어 그 글의 실제 게시판과 대조하지 않았다. 그래서 커뮤니티 게시판의 글을
         * 커뮤니티가 아닌 게시판 ID 로 요청하면 가드를 건너뛸 수 있었다. 상세 조회는 이미 (게시판, 글번호)
         * 쌍으로 읽어 불일치를 404 로 처리하므로 같은 의미로 맞춘다. 가드를 먼저 두는 순서는 유지한다 —
         * 뒤로 옮기면 비회원이 404/403 차이로 글의 존재를 알아낼 수 있다.
         */
        Board findPostInBoard(String bbsId, Long pstSn) {
                Board board = boardRepository
                                .findById(required(pstSn, "pstSn 는 null 일 수 없습니다"))
                                .orElseThrow(() -> new BusinessException(BoardErrorCode.ARTICLE_NOT_FOUND));
                if (!java.util.Objects.equals(bbsId, board.getBbsId()) || "N".equals(board.getUseYn())) {
                        throw new BusinessException(BoardErrorCode.ARTICLE_NOT_FOUND);
                }
                return board;
        }

        /**
         * 댓글·만족도 등록과 추천, 댓글 수정·삭제 전에 게시글의 실제 소속과 현재 사용자의 열람 권한을 확인한다 — <b>엄격</b>
         * 경계다. 상세 조회와 같은 repository/비밀글 정책을 쓰되 조회수는 올리지 않는다.
         *
         * <p>[2026-10-23 ADR-0040 결정 1] 사용 안 함 게시판은 운영자에게도 닫는다(새 참여를 받지 않는다). 열람만 하는
         * 경로는 {@link #assertCommentReadAccess} 를 쓴다. 이 이름이 엄격 경계로 남아 있어, 옮기지 않은 호출부는 계속 닫힌다.
         */
        @Transactional(readOnly = true)
        public void assertCommentAccess(String bbsId, Long pstSn) {
                if (!StringUtils.hasText(bbsId) || pstSn == null) {
                        throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                                        "댓글의 bbsId와 pstSn은 필수입니다.");
                }
                String today = today();
                // [2026-09-08 PD-CMTY-001] 상세와 같은 경계 — 회원 전용 게시판의 댓글도 회원만 읽고 쓴다. 사용 여부를 먼저 본다.
                assertActiveBoardMaster(bbsId);
                BoardDetailResult detail = boardRepository.findActiveArticleDetail(bbsId, pstSn)
                                .orElseThrow(() -> new BusinessException(BoardErrorCode.ARTICLE_NOT_FOUND));
                if ("Y".equalsIgnoreCase(detail.getScrtYn())) {
                        SecurityUtil.assertOwnerOrPermissionByEsntlId(detail.getUserId(), "BOARD_READ_ALL");
                }
                // [2026-10-01 결정 23·2026-10-23 ADR-0040 결정 3] 게시 기간 밖의 글의 댓글·추천·만족도도 상세와 같은 사람만 닿는다.
                assertPostingVisible(detail, today);
        }

        @Override
        @Transactional(readOnly = true)
        public void assertScrapablePost(String bbsId, Long pstSn) {
                assertCommentAccess(bbsId, pstSn);
        }

        @Override
        @Transactional(readOnly = true)
        public java.util.Set<PostRef> findScrapablePosts(java.util.Collection<PostRef> targets) {
                if (targets == null || targets.isEmpty() || !SecurityUtil.hasPermission("BOARD_READ")) {
                        return java.util.Set.of();
                }
                java.util.List<PostRef> distinct = targets.stream()
                                .filter(ref -> ref != null && StringUtils.hasText(ref.bbsId()) && ref.pstSn() > 0)
                                .distinct()
                                .toList();
                if (distinct.isEmpty()) {
                        return java.util.Set.of();
                }
                java.util.List<BoardScrapCandidate> candidates = boardRepository.findScrapCandidates(distinct);
                if (candidates.isEmpty()) {
                        return java.util.Set.of();
                }
                boolean readAll = SecurityUtil.hasPermission("BOARD_READ_ALL");
                String viewerEsntlId = SecurityUtil.getCurrentEsntlId()
                                .filter(StringUtils::hasText)
                                .orElse(null);
                boolean needsCommunityLookup = !readAll && candidates.stream().anyMatch(c -> c.cmntySn() != null);
                java.util.Set<Long> accessibleCommunities = java.util.Set.of();
                if (needsCommunityLookup && viewerEsntlId != null && communityBoardAccess != null) {
                        java.util.Set<Long> resolved = communityBoardAccess.accessibleCommunityIds(viewerEsntlId);
                        if (resolved != null) {
                                accessibleCommunities = resolved;
                        }
                }
                String today = today();
                java.util.Set<PostRef> accessible = new java.util.LinkedHashSet<>();
                for (BoardScrapCandidate candidate : candidates) {
                        if (candidate.cmntySn() != null && !readAll
                                        && !accessibleCommunities.contains(candidate.cmntySn())) {
                                continue;
                        }
                        boolean isOwner = viewerEsntlId != null && viewerEsntlId.equals(candidate.userId());
                        if ("Y".equalsIgnoreCase(candidate.scrtYn()) && !readAll && !isOwner) {
                                continue;
                        }
                        if (postingStatusOf(candidate.pstBgngYmd(), candidate.pstEndYmd(), today) != PostingStatus.POSTING
                                        && !readAll && !isOwner) {
                                continue;
                        }
                        accessible.add(new PostRef(candidate.bbsId(), candidate.pstSn()));
                }
                return java.util.Collections.unmodifiableSet(accessible);
        }

        /**
         * 댓글 목록, 만족도 목록·평균, 만족도 수정·삭제 전의 <b>열람</b> 경계. 엄격 경계({@link #assertCommentAccess})와 같되
         * 조회 대행 권한(BOARD_READ_ALL) 보유자는 사용 안 함 게시판의 글에도 닿는다(ADR-0040 결정 1의 운영자 열람 예외 —
         * 상세 화면의 댓글·만족도 조회). 지정 게시판 편집 가드는 두지 않는다 — 일반 사용자의 '내 평가 수정' 을 새로 막는다(H3).
         */
        @Transactional(readOnly = true)
        public void assertCommentReadAccess(String bbsId, Long pstSn) {
                if (!StringUtils.hasText(bbsId) || pstSn == null) {
                        throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                                        "댓글의 bbsId와 pstSn은 필수입니다.");
                }
                String today = today();
                BoardDetailResult detail = readableDetail(loadReadableMaster(bbsId, false), bbsId, pstSn, false);
                if ("Y".equalsIgnoreCase(detail.getScrtYn())) {
                        SecurityUtil.assertOwnerOrPermissionByEsntlId(detail.getUserId(), "BOARD_READ_ALL");
                }
                assertPostingVisible(detail, today);
        }

        /**
         * 열람 판정을 지난 게시판에서 글 상세를 읽는다. 사용 중인 게시판이면 활성 경로를, 사용 안 함 게시판(이미 조회 대행 권한으로
         * 통과했다)이면 운영자 전용 경로를 쓴다.
         *
         * @param includeDeleted 논리 삭제 글까지 볼지 — 호출부가 조회 대행 권한을 이미 판정한 경우에만 true 다
         */
        BoardDetailResult readableDetail(BoardMaster master, String bbsId, Long pstSn, boolean includeDeleted) {
                boolean boardInUse = "Y".equals(master.getUseYn());
                java.util.Optional<BoardDetailResult> active = boardInUse
                                ? boardRepository.findActiveArticleDetail(bbsId, pstSn)
                                : boardRepository.findArticleDetailOnInactiveBoard(bbsId, pstSn, false);
                return active
                                .or(() -> !includeDeleted ? java.util.Optional.empty()
                                                : boardInUse ? boardRepository.findArticleDetailIncludingDeleted(bbsId, pstSn)
                                                : boardRepository.findArticleDetailOnInactiveBoard(bbsId, pstSn, true))
                                .orElseThrow(() -> new BusinessException(BoardErrorCode.ARTICLE_NOT_FOUND));
        }

        /**
         * 댓글 등록 전 게시판 설정(댓글 사용 여부 {@code ansYn})을 본다(2026-09-27 DIP B5 F9). 회원·비밀글 가드
         * ({@link #assertCommentAccess}) 뒤에 부른다. 이미 달린 댓글의 수정·삭제는 막지 않는다 — 설정을 끈 뒤에도
         * 작성자가 자기 댓글을 정리할 수 있어야 한다.
         */
        @Transactional(readOnly = true)
        public void assertCommentsEnabled(String bbsId) {
                if (!"Y".equals(findBoardMaster(bbsId).getAnsYn())) {
                        throw new BusinessException(CommonErrorCode.INVALID_STATE, "이 게시판은 댓글을 받지 않습니다.");
                }
        }

        /** 만족도 등록 전 게시판 설정(만족도 조사 사용 여부 {@code stsfdgYn})을 본다(2026-09-27 DIP B5 F9). */
        @Transactional(readOnly = true)
        public void assertSatisfactionEnabled(String bbsId) {
                if (!"Y".equals(findBoardMaster(bbsId).getStsfdgYn())) {
                        throw new BusinessException(CommonErrorCode.INVALID_STATE, "이 게시판은 만족도 조사를 받지 않습니다.");
                }
        }

        BoardMaster findBoardMaster(String bbsId) {
                return boardMasterRepository.findById(required(bbsId, "bbsId 는 null 일 수 없습니다"))
                                .orElseThrow(() -> new BusinessException(BoardErrorCode.BOARD_NOT_FOUND));
        }
}
