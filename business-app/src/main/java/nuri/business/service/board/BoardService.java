package nuri.business.service.board;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.business.domain.user.exception.UserErrorCode;
import nuri.business.domain.board.exception.BoardErrorCode;

import nuri.foundation.core.exception.BusinessException;
import nuri.business.core.config.BoardIdProperties;
import nuri.business.core.service.BaseAbstractService;
import nuri.business.domain.board.Board;
import nuri.business.domain.board.BoardDetailResult;
import nuri.business.domain.board.BoardMaster;
import nuri.business.domain.board.BoardMasterRepository;
import nuri.business.domain.board.BoardRecommendation;
import nuri.business.domain.board.BoardRecommendationId;
import nuri.business.domain.board.BoardRecommendationRepository;
import nuri.business.domain.board.BoardRepository;
import nuri.business.domain.board.BoardSearchCondition;
import nuri.business.domain.board.BoardStatsResult;
import nuri.business.service.board.dto.BoardDto;
import nuri.business.service.board.dto.BoardMapper;
import nuri.business.service.board.dto.BoardSaveRequest;
import nuri.business.service.board.dto.BoardStatsResponse;
import nuri.foundation.core.event.PostCreatedEvent;
import nuri.business.service.file.AttachmentAssignmentPolicy;
import nuri.business.service.file.FileService;
import nuri.business.service.user.UserService;
import nuri.business.service.user.dto.UserDto;
import nuri.business.security.util.SecurityUtil;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import nuri.foundation.core.community.CommunityBoardAccessPort;
import org.jspecify.annotations.NonNull;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.List;

import static nuri.business.service.board.BoardPolicySupport.*;


/**
 * JPA 기반 게시판 비즈니스 로직 서비스
 * - BaseAbstractService(공통 유틸 POJO) 상속 (구 EgovAbstractServiceImpl 상속·인터페이스는 2026-07 제거)
 */
@Slf4j
@Service
public class BoardService extends BaseAbstractService {

        private final BoardRepository boardRepository;
        private final BoardMasterRepository boardMasterRepository;
        private final UserService userService;
        private final FileService fileService;
        private final AttachmentAssignmentPolicy attachmentAssignmentPolicy;
        private final ApplicationEventPublisher eventPublisher;
        private final MeterRegistry meterRegistry;
        private final BoardViewCountService viewCountService;
        private final BoardMapper boardMapper;
        /**
         * 게시판 인스턴스 ID 설정({@code nuri.boards.*}) — 종전 {@code PUBLIC_FAQ_BOARD_ID}
         * 리터럴({@code BBSMSTR_AAAAAAAAAAAA})을 설정 소비로 역전. 기본값이 종전 리터럴과
         * 동일하므로 설정이 없어도 거동이 같다. FAQ 통합 축(공지 게시판과 같은 인스턴스)의
         * 의미는 {@link BoardIdProperties} javadoc 참조 — 값 정합화는 제품 판단 대기.
         */
        private final BoardIdProperties boardIdProperties;

        /**
         * 커뮤니티 귀속 게시판({@code tb_bbs_master.cmnty_sn} 이 있는 게시판)의 접근 판정 포트.
         *
         * <p>커뮤니티 도메인이 base projection 에서 빠지면 이 빈이 없다 — 그때는 {@code null} 이며
         * 호출부는 <b>거부</b>로 해석한다(fail-closed). 판정할 수 없는데 통과시키면 회원 전용
         * 게시판이 전원 공개로 뒤집히기 때문이다(H3).
         */
        private final CommunityBoardAccessPort communityBoardAccess;

        /** 게시글 추천 이력 — 한 사람이 한 글을 한 번만 추천한다(2026-09-26 DIP I6 ④). */
        private final BoardRecommendationRepository recommendationRepository;

        public BoardService(BoardRepository boardRepository,
                        BoardMasterRepository boardMasterRepository,
                        UserService userService,
                        FileService fileService,
                        AttachmentAssignmentPolicy attachmentAssignmentPolicy,
                        ApplicationEventPublisher eventPublisher,
                        MeterRegistry meterRegistry,
                        BoardViewCountService viewCountService,
                        BoardMapper boardMapper,
                        BoardIdProperties boardIdProperties,
                        BoardRecommendationRepository recommendationRepository,
                        @Nullable CommunityBoardAccessPort communityBoardAccess) {
                this.boardRepository = required(boardRepository, "boardRepository 는 null 일 수 없습니다");
                this.boardMasterRepository = required(boardMasterRepository, "boardMasterRepository 는 null 일 수 없습니다");
                this.userService = required(userService, "userService 는 null 일 수 없습니다");
                this.fileService = required(fileService, "fileService 는 null 일 수 없습니다");
                this.attachmentAssignmentPolicy = required(attachmentAssignmentPolicy,
                                "attachmentAssignmentPolicy 는 null 일 수 없습니다");
                this.eventPublisher = required(eventPublisher, "eventPublisher 는 null 일 수 없습니다");
                this.meterRegistry = required(meterRegistry, "meterRegistry 는 null 일 수 없습니다");
                this.viewCountService = required(viewCountService, "viewCountService 는 null 일 수 없습니다");
                this.boardMapper = required(boardMapper, "boardMapper 는 null 일 수 없습니다");
                this.boardIdProperties = required(boardIdProperties, "boardIdProperties 는 null 일 수 없습니다");
                this.recommendationRepository = required(recommendationRepository,
                                "recommendationRepository 는 null 일 수 없습니다");
                // 포트는 선택 주입이다 — 커뮤니티 도메인이 없는 프로필에서는 null 이고, 그때 커뮤니티
                // 귀속 게시판은 관리자 외에게 닫힌다(아래 assertCommunityAccess).
                this.communityBoardAccess = communityBoardAccess;
        }


        /**
         * 업무 홈 카드용 최근 글. [2026-10-23 ADR-0040 결정 1] 운영자 열람 예외를 두지 않는다 — 홈 카드는 이용자와 같은
         * 결과를 보여야 일괄 사용 안 함의 영향 확인(설계서 §5.2)과 맞는다.
         */
        @Transactional(readOnly = true)
        public Page<BoardDto> getBoardPosts(@NonNull String bbsId, @NonNull Pageable pageable) {
                return listPosts(false, bbsId, "0", "", null, null, null, null, null, null, pageable);
        }

        /**
         * @param dateBasis 기간 조건을 어느 날짜로 볼지. 비어 있거나 {@code CREATED} 면 작성일, {@code EVENT} 면
         *                  행사일(없으면 작성일)이다. [2026-09-26 DIP V6] 캘린더 템플릿은 칸을 행사일로 배치하는데
         *                  조회는 작성일로 걸러, 지난달에 등록한 이달 행사가 달력에서 사라졌다.
         */
        @Transactional(readOnly = true)
        public Page<BoardDto> getBoardPosts(@NonNull String bbsId, String searchCnd, String searchWrd,
                        String orderBy, String startDate, String endDate, String qnaStatus, String qnaCategory,
                        String dateBasis, @NonNull Pageable pageable) {
                return listPosts(true, bbsId, searchCnd, searchWrd, orderBy, startDate, endDate, qnaStatus, qnaCategory,
                                dateBasis, pageable);
        }

        /**
         * @param operatorMayReadInactive 조회 대행 권한자(BOARD_READ_ALL)에게 사용 안 함 게시판의 목록을 열지. 게시판 목록 API 만
         *                                켠다(ADR-0040 결정 1).
         */
        private Page<BoardDto> listPosts(boolean operatorMayReadInactive, String bbsId, String searchCnd, String searchWrd,
                        String orderBy, String startDate, String endDate, String qnaStatus, String qnaCategory,
                        String dateBasis, Pageable pageable) {
                log.info("Fetching board posts - bbsId: {}, searchApplied: {}, orderBy: {}",
                                nuri.foundation.security.util.SafeLog.text(bbsId), StringUtils.hasText(searchWrd), nuri.foundation.security.util.SafeLog.text(orderBy));
                BoardMaster master = operatorMayReadInactive
                                ? loadReadableMaster(bbsId, false)
                                : assertActiveBoardMaster(bbsId);
                BoardSearchCondition condition = buildArticleSearchCondition(
                                bbsId, searchCnd, searchWrd, orderBy, startDate, endDate, qnaStatus, qnaCategory, dateBasis);
                // 사용 안 함 게시판이 여기까지 왔다면 조회 대행 권한자다(loadReadableMaster). 그때만 마스터 조건을 푼다.
                condition.setIncludeInactiveBoard(!"Y".equals(master.getUseYn()));
                Page<BoardDto> page = boardRepository.searchArticles(condition, required(pageable, "pageable 는 null 일 수 없습니다"))
                                .map(boardMapper::toDto);
                return withRecommendedMarks(page);
        }

        /**
         * [2026-10-01] 목록의 각 글에 현재 사용자의 추천 여부를 한 번의 조회로 싣는다. 종전 화면은 알 수 없어
         * 이미 추천한 글에도 추천 버튼이 그대로였고, 누르면 409 로 비로소 알았다. 사용자를 모르면 null 로 둔다.
         */
        private Page<BoardDto> withRecommendedMarks(Page<BoardDto> page) {
                java.util.Optional<String> esntlId = SecurityUtil.getCurrentEsntlId();
                if (esntlId.isEmpty() || page.isEmpty()) {
                        return page;
                }
                List<Long> pstSns = page.getContent().stream().map(BoardDto::pstSn)
                                .filter(java.util.Objects::nonNull).toList();
                java.util.Set<Long> recommended = pstSns.isEmpty() ? java.util.Set.of()
                                : new java.util.HashSet<>(recommendationRepository.findRecommendedPstSns(esntlId.get(), pstSns));
                return page.map(dto -> dto.toBuilder().recommended(recommended.contains(dto.pstSn())).build());
        }

        /** 통합 검색이 요구하는 최소 검색어 길이. 담당자 검색({@code UserService})과 같은 값이다. */
        public static final int GLOBAL_SEARCH_MIN_KEYWORD_LENGTH = 2;

        /** 통합 검색 1회 응답의 최대 건수. 페이지 번호를 받지 않으므로 이 값이 곧 상한이다. */
        public static final int GLOBAL_SEARCH_MAX_RESULTS = 20;

        /**
         * 활성 게시판 전체에서 <b>게시글 제목</b>을 검색한다(통합 검색 전용).
         *
         * <p><b>왜 신설했나.</b> {@code /search} 화면에는 게시글 탭이 있었지만 전역 검색
         * 엔드포인트가 없어 결과가 <b>항상 빈 배열</b>이었다. 화면은 그 사실을 라벨('미지원')로
         * 정직하게 드러내고 있었을 뿐, 기능 자체가 비어 있었다.
         *
         * <p><b>왜 제목만인가.</b> 본문({@code pst_cn})은 에디터가 만든 HTML 원문이라
         * {@code contains} 로 훑으면 태그·속성이 그대로 매칭된다("div", "style" 같은 검색어가
         * 무관한 글을 무더기로 물어 온다). 전문 검색 인덱스가 없는 상태에서 본문 검색을 켜면
         * 결과 품질이 사용자를 오도하므로, 지금 정직하게 지킬 수 있는 범위인 제목으로 한정한다.
         * 화면 문구도 같은 범위를 말한다.
         *
         * <p><b>인가.</b> 새 노출 경로를 만들지 않는다 — 기존 게시판 목록 조회와 <b>같은 술어</b>
         * ({@code BoardPredicate.searchBoard} + 활성 게시판 조인)를 그대로 쓰고, 비밀글은
         * 작성자 본인과 관리자에게만 보인다({@link BoardPolicySupport#bindCurrentViewerVisibility}). 즉 이 API 로
         * 볼 수 있는 글은 모두 해당 게시판 목록에서 이미 볼 수 있는 글이다.
         *
         * <p>검색어가 {@value #GLOBAL_SEARCH_MIN_KEYWORD_LENGTH}자 미만이면 빈 결과를 준다 —
         * 한 글자 검색은 사실상 전량 열람이라 통합 검색을 인명부·게시글 수집 창구로 만든다.
         */
        @Transactional(readOnly = true)
        public Page<BoardDto> searchAcrossBoards(String keyword, @NonNull Pageable pageable) {
                String trimmed = keyword == null ? "" : keyword.trim();
                Pageable capped = capGlobalSearchPageable(required(pageable, "pageable 는 null 일 수 없습니다"), GLOBAL_SEARCH_MAX_RESULTS);
                if (trimmed.length() < GLOBAL_SEARCH_MIN_KEYWORD_LENGTH) {
                        return Page.empty(capped);
                }
                BoardSearchCondition condition = buildGlobalSearchCondition(trimmed);
                return boardRepository.searchArticles(condition, capped).map(boardMapper::toDto);
        }

        @Transactional(readOnly = true)
        public Page<BoardDto> getPublicFaqPosts(
                        String searchWrd, @NonNull Pageable pageable) {
                assertPublicFaqBoardAvailable();

                return boardRepository.searchPublicFaqArticles(
                                boardIdProperties.getFaqId(),
                                searchWrd,
                                todayYmd(),
                                required(pageable, "pageable 는 null 일 수 없습니다"))
                                .map(boardMapper::toDto);
        }

        /**
         * 게시글 목록·상세 화면용 게시판 메타. [2026-09-26 DIP V5]
         *
         * <p>[2026-10-23 ADR-0040 결정 1] 사용 안 함 게시판의 메타는 조회 대행 권한자에게만 준다(목록·상세와 같은 열람 판정).
         * 사용 여부를 커뮤니티 가드보다 먼저 본다 — 사용 안 함 커뮤니티 게시판에서 비회원이 403 으로 존재를 알지 못하게.
         */
        @Transactional(readOnly = true)
        public nuri.business.service.board.dto.BoardMetaDto getBoardMeta(@NonNull String bbsId) {
                BoardMaster master = loadReadableMaster(bbsId, false);
                return nuri.business.service.board.dto.BoardMetaDto.from(master, requiredEditPermissions(bbsId));
        }

        /** 두 설정이 같은 게시판을 가리키면 두 편집 권한이 모두 필요하다. */
        private List<String> requiredEditPermissions(String bbsId) {
                var permissions = new java.util.ArrayList<String>();
                if (bbsId.equals(boardIdProperties.getNoticeId())) permissions.add("NOTICE_EDIT");
                if (bbsId.equals(boardIdProperties.getFaqId())) permissions.add("FAQ_EDIT");
                return List.copyOf(permissions);
        }

        private void assertSpecialBoardEdit(String bbsId) {
                requiredEditPermissions(bbsId).forEach(SecurityUtil::assertPermission);
        }

        @Transactional(readOnly = true)
        public BoardStatsResponse getBoardStats(@NonNull String bbsId) {
                assertActiveBoardMaster(bbsId);
                BoardSearchCondition condition = new BoardSearchCondition(bbsId);
                condition.setUseYn("Y");
                bindCurrentViewerVisibility(condition);
                BoardStatsResult stats = boardRepository.aggregateVisibleStats(condition);
                return toStatsResponse(stats);
        }

        /**
         * 엄격한 게시판 진입 판정 — 사용 중인 게시판만 통과한다(운영자 예외 없음). 없는 게시판과 사용 안 함 게시판은 같은
         * 404 다. 사용 여부를 커뮤니티 가드보다 먼저 본다.
         */
        private BoardMaster assertActiveBoardMaster(String bbsId) {
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
         * @param pessimisticLock 등록·답글처럼 채번을 직렬화하는 경로는 마스터 행을 잠가 읽는다. 같은 트랜잭션이 잠근 행을 읽으므로
         *                        동시에 사용 안 함으로 바뀌어도 커밋된 값을 본다.
         */
        private BoardMaster loadReadableMaster(String bbsId, boolean pessimisticLock) {
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
         */
        private BoardMaster loadWritableMaster(String bbsId, boolean pessimisticLock) {
                assertSpecialBoardEdit(bbsId);
                return loadReadableMaster(bbsId, pessimisticLock);
        }

        /**
         * 호출자가 이용할 수 있는 게시판 선택지(ADR-0040 결정 11). 사용 중인 게시판만 싣는다 — 조회 대행 권한자에게도 사용 안 함
         * 게시판은 이용 선택지가 아니다(운영 화면이 따로 연다). 커뮤니티 귀속 게시판은 {@link #assertCommunityAccess} 와 같은 규칙을
         * 거부 대신 거르기로 적용한다: 조회 대행 권한(BOARD_READ_ALL) 보유자이거나 승인 회원이어야 하고, 판정 포트가 없으면
         * 뺀다(fail-closed). 커뮤니티마다 한 번만 판정한다. 응답에는 ID·이름만 싣는다.
         */
        @Transactional(readOnly = true)
        public List<nuri.business.service.board.dto.BoardOptionDto> getBoardOptions() {
                boolean readAll = SecurityUtil.hasPermission("BOARD_READ_ALL");
                String esntlId = SecurityUtil.getCurrentEsntlId().orElse(null);
                java.util.Map<Long, Boolean> memberships = new java.util.HashMap<>();
                return boardMasterRepository.findActiveBoardOptions().stream()
                                .filter(row -> row.cmntySn() == null || readAll
                                                || memberships.computeIfAbsent(row.cmntySn(), cmntySn -> esntlId != null
                                                                && communityBoardAccess != null
                                                                && communityBoardAccess.isApprovedMember(cmntySn, esntlId)))
                                .map(row -> new nuri.business.service.board.dto.BoardOptionDto(row.bbsId(), row.bbsTtl()))
                                .toList();
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
        private Board findPostInBoard(String bbsId, Long pstSn) {
                Board board = boardRepository
                                .findById(required(pstSn, "pstSn 는 null 일 수 없습니다"))
                                .orElseThrow(() -> new BusinessException(BoardErrorCode.ARTICLE_NOT_FOUND));
                if (!java.util.Objects.equals(bbsId, board.getBbsId()) || "N".equals(board.getUseYn())) {
                        throw new BusinessException(BoardErrorCode.ARTICLE_NOT_FOUND);
                }
                return board;
        }

        @Transactional
        public Long createPost(@NonNull String userId, @NonNull BoardSaveRequest request) {
                // [2026-10-23 ADR-0040 결정 1] 지정 게시판 가드 → 사용 여부(운영자 예외) → 커뮤니티 가드. 채번 직렬화를 위해
                //   마스터 행을 잠가 읽는다. [2026-09-08 PD-CMTY-001] 읽을 수 없는 게시판에는 쓸 수도 없다.
                BoardMaster master = loadWritableMaster(request.bbsId(), true);
                Timer.Sample sample = Timer.start(meterRegistry);

                try {
                        if (request.atchFileSn() != null) {
                                attachmentAssignmentPolicy.assertAssignable(request.atchFileSn());
                                // [2026-09-27 DIP B5 F9] 미리 올린 첨부 묶음을 붙이는 경로도 게시판 첨부 설정을 지난다.
                                assertAttachmentPolicy(master, 0, fileService.getFileList(request.atchFileSn()).size());
                        }

                        // 사용자 정보 조회 (실패 시 익명 처리)
                        String userNmToSet = resolveAuthorName(userId);

                        Long sortOrdr = boardRepository.findMaxSortOrdr(master.getBbsId()) + 1;

                        // 저자 식별은 인증 주체로 고정 — request.userId()/userNm() 로 저자 위조를 막는다(replyPost 와 동일).
                        String userIdToSet = userId;

                        Board board = Board.builder()
                                        .bbsId(master.getBbsId())
                                        .ansSn(1L)
                                        .useYn(request.useYn() != null ? request.useYn() : "Y")
                                        .qnaSttsCd(request.qnaSttsCd() != null ? request.qnaSttsCd() : "OPEN")
                                        .evntDt(parseDateTime(request.evntDt()))
                                        .inqCnt(0)
                                        .likeCnt(0)
                                        .userId(userIdToSet)
                                        .userNm(userNmToSet)
                                        .sortOrdr(sortOrdr)
                                        .pstTtl(request.pstTtl())
                                        .pstCn(request.pstCn())
                                        .pstBgngYmd(normalizeYmd(request.pstBgngYmd()))
                                        .pstEndYmd(normalizeYmd(request.pstEndYmd()))
                                        .atchFileSn(request.atchFileSn())
                                        .qnaCatCd(request.qnaCatCd())
                                        .scrtYn(request.scrtYn())
                                        // [2026-09-27 DIP B5 F9] 게시글 비밀번호는 확인 경로가 없는 폐기 필드다. 화면이 '1' 을
                                        //   채워 평문으로 쌓이고 있었다 — 요청 값을 저장하지 않는다.
                                        .pswd(null)
                                        .build();
                        Long pstSn = required(boardRepository.save(required(board, "board 는 null 일 수 없습니다")),
                                        "boardRepository.save() 결과는 null 일 수 없습니다")
                                        .getPstSn();

                        // 커밋 뒤 생성 이벤트 발행 — 저장소 안 구독자는 없고 파생 제품의 확장 지점이다(PostCreatedEvent 참조)
                        nuri.foundation.core.util.TransactionUtils.runAfterCommit(
                                () -> eventPublisher.publishEvent(new PostCreatedEvent(this, master.getBbsId(), pstSn, userId)));

                        return pstSn;
                } finally {
                        sample.stop(meterRegistry.timer("egov.board.create.post", "bbsId", request.bbsId()));
                }
        }

        @Transactional
        public Long createPostWithFiles(@NonNull String userId, @NonNull BoardSaveRequest request,
                        List<MultipartFile> files)
                        throws IOException {
                // [2026-09-25 DIP I2] 게시판·커뮤니티 검증을 업로드보다 먼저 한다. 종전에는 파일을 먼저 저장한 뒤
                //   createPost 가 없는 게시판·비회원을 거부해, 거부된 요청마다 접근할 수 없는 파일이 디스크에 남았다.
                //   (그 뒤 단계의 실패는 FileService 가 트랜잭션 롤백 때 이번 호출로 저장한 파일을 지운다.)
                //   [2026-10-23 ADR-0040 결정 1] 사용 안 함 게시판도 업로드 전에 거부한다.
                BoardMaster master = loadWritableMaster(request.bbsId(), false);
                Long atchFileSn = request.atchFileSn();
                if (files != null && !files.isEmpty()) {
                        // [2026-09-27 DIP B5 F9] 게시판 첨부 설정(허용·파일 수·파일당 크기)을 저장 전에 본다.
                        assertNewFilesAllowed(master, 0, files);
                        atchFileSn = fileService.uploadBoardFiles(files);
                }

                BoardSaveRequest newRequest = withAtchFileSn(request, atchFileSn);

                return createPost(userId, newRequest);
        }

        @Transactional
        public Long replyPost(@NonNull String userId, @NonNull Long parentSn, @NonNull BoardSaveRequest request) {
                // [2026-09-08 PD-CMTY-001·2026-10-23 ADR-0040 결정 1] 등록과 같은 경계.
                BoardMaster master = loadWritableMaster(request.bbsId(), true);

                Board parent = findReplyParent(request.bbsId(), parentSn);
                if (request.atchFileSn() != null) {
                        attachmentAssignmentPolicy.assertAssignable(request.atchFileSn());
                }

                // 사용자 정보 조회 (실패 시 익명 처리)
                String userNmToSet = resolveAuthorName(userId);

                Long ansSn = boardRepository.findMaxAnsSn(master.getBbsId(), parent.getSortOrdr()) + 1;

                String userIdToSet = userId;

                Board board = Board.builder()
                                .bbsId(master.getBbsId())
                                .ansSn(ansSn)
                                .upPstSn(parentSn)
                                .useYn(request.useYn() != null ? request.useYn() : "Y")
                                .qnaSttsCd(request.qnaSttsCd() != null ? request.qnaSttsCd() : "OPEN")
                                .evntDt(parseDateTime(request.evntDt()))
                                .inqCnt(0)
                                .likeCnt(0)
                                .userId(userIdToSet)
                                .userNm(userNmToSet)
                                .sortOrdr(parent.getSortOrdr())
                                .ansLv(0)
                                .pstTtl(request.pstTtl())
                                .pstCn(request.pstCn())
                                .pstBgngYmd(normalizeYmd(request.pstBgngYmd()))
                                .pstEndYmd(normalizeYmd(request.pstEndYmd()))
                                .atchFileSn(request.atchFileSn())
                                .qnaCatCd(request.qnaCatCd())
                                .scrtYn(request.scrtYn())
                                .pswd(null) // [2026-09-27 DIP B5 F9] 폐기 필드 — 등록과 같이 저장하지 않는다.
                                .build();
                
                Long pstSn = required(boardRepository.save(required(board, "board 는 null 일 수 없습니다")),
                                "boardRepository.save() 결과는 null 일 수 없습니다")
                                .getPstSn();

                nuri.foundation.core.util.TransactionUtils.runAfterCommit(
                                () -> eventPublisher.publishEvent(new PostCreatedEvent(this, master.getBbsId(), pstSn, userId)));

                return pstSn;
        }

        @Transactional
        public Long replyPostWithFiles(@NonNull String userId, @NonNull Long parentSn,
                        @NonNull BoardSaveRequest request,
                        List<MultipartFile> files) throws IOException {
                BoardMaster master = loadWritableMaster(request.bbsId(), false);
                findReplyParent(request.bbsId(), parentSn);
                Long atchFileSn = request.atchFileSn();
                if (files != null && !files.isEmpty()) {
                        // [2026-09-27 DIP B5 F9] 답글도 게시판 첨부 설정을 저장 전에 본다(등록과 같은 순서).
                        assertNewFilesAllowed(master, 0, files);
                        atchFileSn = fileService.uploadBoardFiles(files);
                }

                BoardSaveRequest newRequest = withAtchFileSn(request, atchFileSn);

                return replyPost(userId, parentSn, newRequest);
        }

        /** 답글은 실제 부모 게시판·열람 경계를 지나며 파일 저장보다 먼저 검사한다. */
        private Board findReplyParent(String bbsId, Long parentSn) {
                // 논리 삭제된 부모는 findPostInBoard 가 없는 글로 거부한다.
                Board parent = findPostInBoard(bbsId, parentSn);
                if ("Y".equalsIgnoreCase(parent.getScrtYn())) {
                        SecurityUtil.assertOwnerOrPermissionByEsntlId(parent.getUserId(), "BOARD_READ_ALL");
                }
                return parent;
        }

        /**
         * 게시글 상세. {@code countView=false} 는 조회수를 올리지 않는다 — 수정 화면처럼 글을 "읽는" 것이 아닌
         * 진입에 쓴다(2026-09-25 DIP I8). 종전에는 작성자가 수정 화면을 열거나 새로고침할 때마다 조회수가 올랐다.
         * 열람 가드(커뮤니티·비밀글·논리 삭제)는 조회수 여부와 무관하게 같다.
         */
        @Transactional(readOnly = true)
        public BoardDto getPostDetail(@NonNull String bbsId, @NonNull Long pstSn, boolean countView) {
                // [2026-10-23 ADR-0040 결정 1] 사용 여부(조회 대행 권한 예외)를 먼저, 커뮤니티 회원 가드를 그다음에 본다
                //   ([2026-09-08 PD-CMTY-001] 커뮤니티 귀속 게시판이면 승인된 회원만 본다).
                // [2026-08-22 제품 결정] 논리 삭제(useYn='N') 게시글은 일반 사용자에게 404 지만
                // **관리자에게는 열람을 허용**한다. 복구·감사 경로가 404 로 막히면 관리자가 삭제된 글의
                // 내용을 확인할 방법이 사라진다. 아래 비밀글 소유권 가드는 삭제 여부와 무관하게 계속 적용된다.
                // '관리자' 판정은 조회 대행 권한 BOARD_READ_ALL 보유 여부다(기본 그룹 ROLE_ADMIN·ROLE_SYSTEM).
                BoardDetailResult detail = readableDetail(loadReadableMaster(bbsId, false), bbsId, pstSn,
                                SecurityUtil.hasPermission("BOARD_READ_ALL"));

                // 비밀글은 인증됐다는 사실만으로 본문을 공개하지 않는다. Board.userId 는 생성 시
                // UserDetails.getUsername() (= esntlId)으로 고정되므로 같은 축의 owner-or-admin 가드를 쓴다.
                // 비밀번호 검증 입력/계약이 없는 상세 API에서 저장 비밀번호를 임의로 재사용하지 않는다.
                if ("Y".equalsIgnoreCase(detail.getScrtYn())) {
                        SecurityUtil.assertOwnerOrPermissionByEsntlId(detail.getUserId(), "BOARD_READ_ALL");
                }
                // [2026-10-01 결정 23] 게시 종료일이 지난 글은 작성자·전체 열람 권한자만 연다. 남에게는 없는 글과 같다(404) —
                //   403 으로 답하면 번호만으로 글의 존재를 알 수 있다.
                assertPostingVisible(detail);

                // Redis 기반 쓰기 지연 처리
                if (countView) {
                        viewCountService.increaseViewCount(pstSn);
                }

                BoardDto dto = boardMapper.toDto(detail);
                // [2026-10-01] 이미 추천했는지 알린다 — 화면이 추천 버튼을 '추천함' 으로 바꿔 409 를 미리 막는다.
                return dto.toBuilder()
                                .recommended(SecurityUtil.getCurrentEsntlId()
                                                .map(id -> recommendationRepository.existsById(new BoardRecommendationId(pstSn, id)))
                                                .orElse(null))
                                .build();
        }

        /** Q&A 템플릿 게시판 — 해결 상태를 가진 게시판은 이것뿐이다(화면 BoardTemplates 와 같은 판정). */
        private static final String QNA_TEMPLATE_ID = "TMPLT_QNA";

        /** Q&A 해결 상태 값(화면 isQnaSolved 와 같은 값). */
        private static final String QNA_SOLVED = "SOLVED";

        /**
         * 질문을 해결됨으로 표시한다(2026-09-25 DIP I3). 작성자 또는 게시글 전체 수정 권한자만 한다.
         *
         * <p>종전에는 해결 상태 컬럼과 화면 배지는 있는데 그 값을 SOLVED 로 바꾸는 경로가 없어, 답을 받은 질문도
         * 영원히 "접수" 로 남았다. Q&A 템플릿이 아닌 게시판의 글은 해결 상태가 없으므로 거부한다.
         * 이미 해결된 질문을 다시 표시해도 오류가 아니다(같은 결과).
         */
        @Transactional
        public void markQuestionSolved(@NonNull String bbsId, @NonNull Long pstSn) {
                BoardMaster master = loadWritableMaster(bbsId, false);
                if (!QNA_TEMPLATE_ID.equals(master.getTmpltId())) {
                        throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                                        "Q&A 게시판의 질문만 해결됨으로 표시할 수 있습니다.");
                }
                Board board = findOwnedPost(bbsId, pstSn);
                board.markQnaStatus(QNA_SOLVED);
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
                // [2026-09-08 PD-CMTY-001] 상세와 같은 경계 — 회원 전용 게시판의 댓글도 회원만 읽고 쓴다. 사용 여부를 먼저 본다.
                assertActiveBoardMaster(bbsId);
                BoardDetailResult detail = boardRepository.findActiveArticleDetail(bbsId, pstSn)
                                .orElseThrow(() -> new BusinessException(BoardErrorCode.ARTICLE_NOT_FOUND));
                if ("Y".equalsIgnoreCase(detail.getScrtYn())) {
                        SecurityUtil.assertOwnerOrPermissionByEsntlId(detail.getUserId(), "BOARD_READ_ALL");
                }
                // [2026-10-01 결정 23] 게시가 끝난 글의 댓글·추천도 상세와 같은 사람만 닿는다.
                assertPostingVisible(detail);
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
                BoardDetailResult detail = readableDetail(loadReadableMaster(bbsId, false), bbsId, pstSn, false);
                if ("Y".equalsIgnoreCase(detail.getScrtYn())) {
                        SecurityUtil.assertOwnerOrPermissionByEsntlId(detail.getUserId(), "BOARD_READ_ALL");
                }
                assertPostingVisible(detail);
        }

        /**
         * 열람 판정을 지난 게시판에서 글 상세를 읽는다. 사용 중인 게시판이면 활성 경로를, 사용 안 함 게시판(이미 조회 대행 권한으로
         * 통과했다)이면 운영자 전용 경로를 쓴다.
         *
         * @param includeDeleted 논리 삭제 글까지 볼지 — 호출부가 조회 대행 권한을 이미 판정한 경우에만 true 다
         */
        private BoardDetailResult readableDetail(BoardMaster master, String bbsId, Long pstSn, boolean includeDeleted) {
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

        private BoardMaster findBoardMaster(String bbsId) {
                return boardMasterRepository.findById(required(bbsId, "bbsId 는 null 일 수 없습니다"))
                                .orElseThrow(() -> new BusinessException(BoardErrorCode.BOARD_NOT_FOUND));
        }

        /**
         * 게시글·답글 작성자의 표시 이름. 사용자를 찾지 못하거나 조회가 실패하면 "익명" 으로 대체한다.
         *
         * <p>로그에는 예외 클래스의 단순명만 남긴다(등록 경로의 최소 로깅). 종전 답글 경로는 사용자 식별자와
         * 스택까지 남겨, 같은 사건이 경로에 따라 다르게 기록됐다.
         */
        private String resolveAuthorName(String userId) {
                UserDto author = null;
                try {
                        author = userService.getUserById(required(userId, "userId 는 null 일 수 없습니다"));
                } catch (BusinessException e) {
                        if (e.getErrorCode() == UserErrorCode.USER_NOT_FOUND) {
                                log.warn("게시글 작성자를 찾을 수 없어 익명 처리합니다.");
                        } else {
                                log.error("게시글 작성자 조회 실패: {}", e.getClass().getSimpleName());
                        }
                } catch (Exception e) {
                        log.error("게시글 작성자 조회 실패: {}", e.getClass().getSimpleName());
                }
                return author != null ? author.userNm() : "익명";
        }

        /**
         * 첨부 번호만 바꾼 요청 사본. 나머지 필드는 그대로 옮긴다 — 요청 필드가 늘면 이 한 곳만 함께 고친다
         * (종전에는 첨부 포함 등록·답글·수정이 같은 복사를 따로 써, 한 곳을 빠뜨리면 그 필드가 조용히 사라졌다).
         */
        private static BoardSaveRequest withAtchFileSn(BoardSaveRequest request, Long atchFileSn) {
                return new BoardSaveRequest(
                                request.bbsId(), request.pstTtl(), request.pstCn(),
                                request.pstBgngYmd(), request.pstEndYmd(), atchFileSn,
                                request.evntDt(), request.qnaSttsCd(), request.qnaCatCd(),
                                request.scrtYn(), request.useYn(), request.pswd());
        }

        @Transactional(readOnly = true)
        public BoardDto getPublicFaqDetail(@NonNull Long pstSn) {
                BoardDetailResult detail = boardRepository
                                .findPublicArticleDetail(boardIdProperties.getFaqId(), pstSn, todayYmd())
                                .orElseThrow(() -> new BusinessException(BoardErrorCode.ARTICLE_NOT_FOUND));

                viewCountService.increaseViewCount(pstSn);
                return toPublicFaqDetailDto(detail);
        }

        private void assertPublicFaqBoardAvailable() {
                boardMasterRepository.findById(boardIdProperties.getFaqId())
                                .filter(master -> "Y".equalsIgnoreCase(master.getUseYn()))
                                .orElseThrow(() -> new BusinessException(BoardErrorCode.BOARD_NOT_FOUND));
        }

        @Transactional
        public void updatePost(@NonNull String bbsId, @NonNull Long pstSn, @NonNull BoardSaveRequest request) {
                loadWritableMaster(bbsId, false); // [2026-09-08 PD-CMTY-001·2026-10-23 ADR-0040 결정 1]
                Board board = findOwnedPost(bbsId, pstSn);
                updateOwnedPost(board, request, false);
        }

        /** 게시글 변경 및 파일 I/O보다 먼저 현재 주체의 게시글 소유권을 확정한다. */
        private Board findOwnedPost(String bbsId, Long pstSn) {
                Board board = findPostInBoard(bbsId, pstSn);

                // [보안] 권한 및 소유권 확인 (Board는 esntlId 축 사용 -> SecurityUtil.assertOwnerOrPermissionByEsntlId 기준 비교)
                SecurityUtil.assertOwnerOrPermissionByEsntlId(board.getUserId(), "BOARD_UPDATE_ALL");
                return board;
        }

        private void updateOwnedPost(Board board, BoardSaveRequest request, boolean attachmentAlreadyValidated) {
                if (!attachmentAlreadyValidated
                                && request.atchFileSn() != null
                                && !java.util.Objects.equals(board.getAtchFileSn(), request.atchFileSn())) {
                        attachmentAssignmentPolicy.assertAssignable(request.atchFileSn());
                }

                // [2026-08-27] 전용 파서를 걷어내고 createPost(:217)·replyPost 와 같은 헬퍼로 통일한다.
                //   종전 블록은 LocalDateTime.parse 만 시도해 **'YYYY-MM-DD'(10자)를 파싱하지 못했다.**
                //   화면의 날짜 입력은 type="date" 라 정확히 그 10자로 들어오므로, 수정 시 행사 일자가
                //   경고 로그 한 줄만 남기고 조용히 null 이 됐다. parseDateTime 은 10자를 자정으로
                //   해석하고 그보다 긴 문자열은 LocalDateTime 으로 처리한다.
                java.time.LocalDateTime eventDate = parseDateTime(request.evntDt());

                /*
                 * [2026-08-28] **부분 갱신 의미로 통일한다.**
                 *
                 * 종전에는 같은 호출 안에서 두 규칙이 섞여 있었다 — pswd·qnaSttsCd 는 "안 보내면
                 * 기존 값 유지", 나머지는 "안 보내면 null 로 덮어쓰기". Board.update 는 널 가드가
                 * 없어 전달값을 그대로 대입하므로, 요청에 없던 값이 **조용히 지워졌다**.
                 *
                 * 수정 화면은 제목·본문 위주의 폼이라 게시 기간·행사 일자·Q&A 분류를 싣지 않는다.
                 * 그래서 일정 게시판 글의 제목 오타 하나를 고치면 evntDt 가 사라져 그 글이
                 * 캘린더에서 없어졌다. 저장은 성공하고 화면도 정상으로 보이므로 아무도 눈치채지
                 * 못한다 — 조용한 데이터 손실이다.
                 *
                 * 프런트는 빈 문자열을 undefined 로 정규화해 보내므로(boardActions.ts) '값을
                 * 비우겠다'는 의도가 null 로 표현되지 않는다. 즉 null=미전송 으로 읽어도 안전하다.
                 * 값을 비우는 경로가 필요해지면 그때 명시적 clear 플래그를 설계한다.
                 */
                board.update(request.pstTtl(), request.pstCn(),
                                board.getUserId(),   // 저자(userId/userNm)는 불변 — request 로 재지정 금지(정체성 위조 방지)
                                board.getUserNm(),
                                board.getPswd(),     // [2026-09-27 DIP B5 F9] 폐기 필드 — 요청 값으로 바꾸지 않는다(기존 값은 지우지 않는다).
                                request.pstBgngYmd() != null ? normalizeYmd(request.pstBgngYmd()) : board.getPstBgngYmd(),
                                request.pstEndYmd() != null ? normalizeYmd(request.pstEndYmd()) : board.getPstEndYmd(),
                                request.atchFileSn() != null ? request.atchFileSn() : board.getAtchFileSn(),
                                eventDate != null ? eventDate : board.getEvntDt(),
                                request.qnaSttsCd() != null ? request.qnaSttsCd() : board.getQnaSttsCd(),
                                request.qnaCatCd() != null ? request.qnaCatCd() : board.getQnaCatCd(),
                                request.scrtYn() != null ? request.scrtYn() : board.getScrtYn());
        }

        @Transactional
        public void updatePostWithFiles(@NonNull String bbsId, @NonNull Long pstSn, @NonNull BoardSaveRequest request,
                        List<MultipartFile> files)
                        throws IOException {
                // [2026-09-14 DEC-OPS-092] JSON 수정(updatePost)과 같은 커뮤니티 가드. 이 경로에만 빠져 있었다.
                //   [2026-10-23 ADR-0040 결정 1] 사용 여부도 같은 판정에서 본다.
                BoardMaster master = loadWritableMaster(bbsId, false);
                Board board = findOwnedPost(bbsId, pstSn);
                // [2026-09-25 DIP I1] 요청이 첨부 번호를 싣지 않으면 글의 기존 첨부 묶음에 더한다. 종전에는 새 묶음을
                //   만들어 글을 그쪽으로 옮겨, 수정 중 파일 하나를 더하면 기존 첨부가 글에서 조용히 떨어져 나갔다.
                Long atchFileSn = request.atchFileSn() != null ? request.atchFileSn() : board.getAtchFileSn();
                boolean attachmentAlreadyValidated = false;

                // 클라이언트가 기존 첨부 식별자를 골랐다면 물리 파일 변경보다 먼저 원 업로더인지 확인한다.
                if (atchFileSn != null && !java.util.Objects.equals(board.getAtchFileSn(), atchFileSn)) {
                        attachmentAssignmentPolicy.assertAssignable(atchFileSn);
                        attachmentAlreadyValidated = true;
                }

                if (files != null && !files.isEmpty()) {
                        // [2026-09-27 DIP B5 F9] 이미 붙은 파일과 새 파일을 합쳐 게시판 첨부 설정을 본다.
                        assertNewFilesAllowed(master, fileService.getFileList(atchFileSn).size(), files);
                        if (atchFileSn == null) {
                                // 게시글 소유권을 먼저 확인한 뒤 이 호출에서 새로 만든 첨부는
                                // 클라이언트가 선택한 외부 식별자가 아니므로 재할당 조회가 필요 없다.
                                atchFileSn = fileService.uploadBoardFiles(files);
                                attachmentAlreadyValidated = true;
                        } else {
                                fileService.updateBoardFiles(atchFileSn, files);
                        }
                }

                BoardSaveRequest newRequest = withAtchFileSn(request, atchFileSn);

                updateOwnedPost(board, newRequest, attachmentAlreadyValidated);
        }

        @Transactional
        public void deletePost(@NonNull String bbsId, @NonNull Long pstSn, String authorId) {
                loadWritableMaster(bbsId, false); // [2026-09-08 PD-CMTY-001·2026-10-23 ADR-0040 결정 1]
                Board board = findPostInBoard(bbsId, pstSn);

                // [보안] 권한 및 소유권 확인 (Board는 esntlId 축 사용 -> SecurityUtil.assertOwnerOrPermissionByEsntlId 기준 비교)
                SecurityUtil.assertOwnerOrPermissionByEsntlId(board.getUserId(), "BOARD_DELETE_ALL");

                board.delete();
        }

        /**
         * 좋아요 수 증가.
         *
         * <p>[W1-17 재작성] 종전에는 비관적 쓰기 락으로 행을 잡고 엔티티 필드를 증가시켰다.
         * 증분 유실은 없었지만 두 가지 대가가 있었다.
         * <ol>
         *   <li><b>{@code @Version} 이 올라간다.</b> 좋아요가 눌릴 때마다 버전이 오르므로,
         *       인기글을 편집하던 사용자가 <b>아무도 고치지 않았는데</b> 409 편집 충돌을 받았다.
         *       조회수와 정확히 같은 뿌리의 증상이다.</li>
         *   <li>행 락을 잡고 있어 같은 글에 대한 좋아요가 직렬화된다.</li>
         * </ol>
         * 원자 UPDATE 는 둘 다 없앤다 — version 을 건드리지 않고 락도 잡지 않는다.
         *
         * <p>갱신 후 값을 응답에 실어야 하므로 재조회한다. 리포지토리 메서드가
         * {@code clearAutomatically} 라 1차 캐시가 비워져 있어 이 조회는 실제 값을 읽는다.
         * 그 사이 다른 사용자의 증가분이 포함될 수 있는데, 그것은 오차가 아니라 더 최신 값이다.
         */
        @Transactional
        public Integer incrementLike(@NonNull String bbsId, @NonNull Long pstSn) {
                Long id = required(pstSn, "pstSn 는 null 일 수 없습니다");
                // [2026-09-26 DIP I6 ④] 추천은 글을 읽을 수 있는 사람만, 한 번만 한다.
                //   종전에는 게시판 일치·커뮤니티 회원·비밀글 판정 없이 카운터만 올려, 읽을 수 없는 글도
                //   번호만 알면 추천할 수 있었고 같은 사람이 몇 번이고 누를 수 있었다.
                assertCommentAccess(bbsId, id);
                String esntlId = SecurityUtil.getCurrentEsntlId()
                                .orElseThrow(() -> new BusinessException(CommonErrorCode.ACCESS_DENIED));
                if (recommendationRepository.existsById(new BoardRecommendationId(id, esntlId))) {
                        throw new BusinessException(CommonErrorCode.DUPLICATE_RESOURCE, "이미 추천한 게시글입니다.");
                }
                try {
                        recommendationRepository.saveAndFlush(BoardRecommendation.of(id, esntlId));
                } catch (org.springframework.dao.DataIntegrityViolationException concurrentDuplicate) {
                        // 같은 사람의 동시 요청 — 먼저 들어간 추천만 센다.
                        throw new BusinessException(CommonErrorCode.DUPLICATE_RESOURCE, "이미 추천한 게시글입니다.");
                }
                int affected = boardRepository.incrementLikeCntAtomic(id);
                if (affected == 0) {
                        throw new BusinessException(BoardErrorCode.ARTICLE_NOT_FOUND);
                }
                return boardRepository.findById(id)
                                .map(Board::getLikeCnt)
                                .orElseThrow(() -> new BusinessException(BoardErrorCode.ARTICLE_NOT_FOUND));
        }
}
