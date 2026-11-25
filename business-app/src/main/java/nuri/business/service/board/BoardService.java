package nuri.business.service.board;
import nuri.foundation.core.exception.CommonErrorCode;
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
import nuri.business.service.board.dto.BoardPostListFilter;
import nuri.business.service.board.dto.BoardSaveRequest;
import nuri.business.service.board.dto.BoardStatsResponse;
import nuri.foundation.core.event.PostCreatedEvent;
import nuri.foundation.core.util.EntityVersions;
import nuri.business.service.file.AttachmentAssignmentPolicy;
import nuri.business.service.file.FileService;
import nuri.business.service.user.UserService;
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
import java.time.Clock;
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

        /**
         * 게시판 진입·글 소속·열람 경계 판정. 같은 의존성으로 직접 만든다 — 패키지 범위 헬퍼를 프록시 없이 이 서비스의 트랜잭션
         * 안에서 부른다(잠금 조회가 등록 트랜잭션에 그대로 참여한다). 댓글·만족도·스크랩은 같은 클래스의 빈을 쓴다.
         */
        private final BoardAccessService accessGate;

        /**
         * 게시 기간 판정의 시계(ADR-0040 결정 3). 공개 메서드가 요청마다 한 번 {@link #today()} 로 기준일을 계산해 넘긴다.
         * 생성자 인자가 아니다 — Clock 빈이 없고, 직접 생성하는 시험이 많다(RealTimeDashboardService 선례).
         */
        private Clock clock = Clock.system(BoardPolicySupport.SERVICE_ZONE);

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
                // 귀속 게시판은 관리자 외에게 닫힌다(BoardAccessService#assertCommunityAccess).
                this.communityBoardAccess = communityBoardAccess;
                this.accessGate = new BoardAccessService(this.boardRepository, this.boardMasterRepository,
                                this.boardIdProperties, communityBoardAccess);
        }

        /** 날짜 경계 회귀 시험에서 운영과 같은 시간대의 시계를 고정한다(ADR-0040 결정 3). 접근 판정도 같은 시계를 쓴다. */
        void useClock(Clock clock) {
                this.clock = java.util.Objects.requireNonNull(clock, "clock");
                accessGate.useClock(clock);
        }

        /** 게시 기간 판정의 기준일(yyyyMMdd, Asia/Seoul). 공개 메서드가 요청마다 한 번 부른다. */
        private String today() {
                return todayYmd(clock);
        }


        /**
         * 업무 홈 카드용 최근 글. [2026-10-23 ADR-0040 결정 1] 운영자 열람 예외를 두지 않는다 — 홈 카드는 이용자와 같은
         * 결과를 보여야 일괄 사용 안 함의 영향 확인(설계서 §5.2)과 맞는다.
         */
        @Transactional(readOnly = true)
        public Page<BoardDto> getBoardPosts(@NonNull String bbsId, @NonNull Pageable pageable) {
                return listPosts(false, bbsId, "0", "", null, null, null, null, null, null, pageable,
                                BoardPostListFilter.NONE);
        }

        /**
         * @param dateBasis 기간 조건을 어느 날짜로 볼지. 비어 있거나 {@code CREATED} 면 작성일, {@code EVENT} 면
         *                  행사일(없으면 작성일)이다. [2026-09-26 DIP V6] 캘린더 템플릿은 칸을 행사일로 배치하는데
         *                  조회는 작성일로 걸러, 지난달에 등록한 이달 행사가 달력에서 사라졌다.
         * @param filter    [2026-10-23 ADR-0040 결정 3·5] 서버 기준일로 판정하는 운영 조건(게시 상태·고정). 가시성을 넓히지 않는다 —
         *                  일반 사용자에게는 기존 가시성 안에서만 좁혀진다.
         */
        @Transactional(readOnly = true)
        public Page<BoardDto> getBoardPosts(@NonNull String bbsId, String searchCnd, String searchWrd,
                        String orderBy, String startDate, String endDate, String qnaStatus, String qnaCategory,
                        String dateBasis, @NonNull Pageable pageable, @NonNull BoardPostListFilter filter) {
                return listPosts(true, bbsId, searchCnd, searchWrd, orderBy, startDate, endDate, qnaStatus, qnaCategory,
                                dateBasis, pageable, filter);
        }

        /**
         * @param operatorMayReadInactive 조회 대행 권한자(BOARD_READ_ALL)에게 사용 안 함 게시판의 목록을 열지. 게시판 목록 API 만
         *                                켠다(ADR-0040 결정 1).
         */
        private Page<BoardDto> listPosts(boolean operatorMayReadInactive, String bbsId, String searchCnd, String searchWrd,
                        String orderBy, String startDate, String endDate, String qnaStatus, String qnaCategory,
                        String dateBasis, Pageable pageable, BoardPostListFilter filter) {
                String today = today();
                log.info("Fetching board posts - bbsId: {}, searchApplied: {}, orderBy: {}",
                                nuri.foundation.security.util.SafeLog.text(bbsId), StringUtils.hasText(searchWrd), nuri.foundation.security.util.SafeLog.text(orderBy));
                BoardMaster master = operatorMayReadInactive
                                ? accessGate.loadReadableMaster(bbsId, false)
                                : accessGate.assertActiveBoardMaster(bbsId);
                BoardSearchCondition condition = buildArticleSearchCondition(
                                bbsId, searchCnd, searchWrd, orderBy, startDate, endDate, qnaStatus, qnaCategory, dateBasis, today);
                // 사용 안 함 게시판이 여기까지 왔다면 조회 대행 권한자다(loadReadableMaster). 그때만 마스터 조건을 푼다.
                condition.setIncludeInactiveBoard(!"Y".equals(master.getUseYn()));
                BoardPostListFilter conditions = required(filter, "filter 는 null 일 수 없습니다");
                condition.setPostingStatus(conditions.postingStatus());
                condition.setPinned(conditions.pinned());
                Page<BoardDto> page = boardRepository.searchArticles(condition, required(pageable, "pageable 는 null 일 수 없습니다"))
                                .map(result -> decorate(boardMapper.toDto(result), result.getUpendFixYn(),
                                                result.getUpendFixEndYmd(), today));
                return withRecommendedMarks(page);
        }

        /**
         * 목록 응답에 현재 사용자의 추천 여부를 싣는다.
         *
         * <p>[2026-10-01] 추천 여부는 한 번의 조회로 싣는다. 종전 화면은 알 수 없어 이미 추천한 글에도 추천 버튼이 그대로였고,
         * 누르면 409 로 비로소 알았다. 사용자를 모르면 null 로 둔다. 게시 상태·고정은 각 글을 옮길 때 같은 기준일로 이미 판정했다
         * ({@link #decorate(BoardDto, String, String, String)}).
         */
        private Page<BoardDto> withRecommendedMarks(Page<BoardDto> page) {
                java.util.Optional<String> esntlId = SecurityUtil.getCurrentEsntlId();
                java.util.Set<Long> recommended;
                if (esntlId.isEmpty() || page.isEmpty()) {
                        recommended = null;
                } else {
                        List<Long> pstSns = page.getContent().stream().map(BoardDto::pstSn)
                                        .filter(java.util.Objects::nonNull).toList();
                        recommended = pstSns.isEmpty() ? java.util.Set.of()
                                        : new java.util.HashSet<>(recommendationRepository.findRecommendedPstSns(esntlId.get(), pstSns));
                }
                if (recommended == null) {
                        return page;
                }
                return page.map(dto -> dto.toBuilder().recommended(recommended.contains(dto.pstSn())).build());
        }

        /**
         * 한 글의 서버 판정 값을 싣는다 — [2026-10-23 ADR-0040 결정 3] 게시 상태, [결정 5] 지금 고정 중인지와 그 종료일. 같은 기준일로
         * 판정하고 화면은 날짜를 다시 계산하지 않는다(DEC-OPS-140). 고정 중이 아니면(종료일이 지난 옛 고정 포함) 종료일을 비운다.
         * 게시판 목록·상세에서만 부른다 — 통합 검색·공개 FAQ 응답은 이 값들을 싣지 않는다.
         */
        private static BoardDto decorate(BoardDto dto, String upendFixYn, String upendFixEndYmd, String today) {
                boolean pinned = pinActive(upendFixYn, upendFixEndYmd, today);
                return dto.toBuilder()
                                .postingStatus(postingStatusOf(dto.pstBgngYmd(), dto.pstEndYmd(), today))
                                .pinned(pinned)
                                .upendFixEndYmd(pinned ? upendFixEndYmd : null)
                                .build();
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
                String today = today();
                String trimmed = keyword == null ? "" : keyword.trim();
                Pageable capped = capGlobalSearchPageable(required(pageable, "pageable 는 null 일 수 없습니다"), GLOBAL_SEARCH_MAX_RESULTS);
                if (trimmed.length() < GLOBAL_SEARCH_MIN_KEYWORD_LENGTH) {
                        return Page.empty(capped);
                }
                BoardSearchCondition condition = buildGlobalSearchCondition(trimmed, today);
                // [2026-10-26 ADR-0043, NAV-10] 결과마다 게시판 이름을 싣는다 — 메뉴가 없는 게시판은 검색이 거의 유일한 발견 경로인데
                //   결과가 어느 게시판의 글인지 말하지 않았다. 값은 검색 질의가 이미 잇는 게시판 마스터에서 온다.
                return boardRepository.searchArticles(condition, capped)
                                .map(result -> boardMapper.toDto(result).toBuilder().bbsTtl(result.getBbsTtl()).build());
        }

        @Transactional(readOnly = true)
        public Page<BoardDto> getPublicFaqPosts(
                        String searchWrd, @NonNull Pageable pageable) {
                String today = today();
                assertPublicFaqBoardAvailable();

                return boardRepository.searchPublicFaqArticles(
                                boardIdProperties.getFaqId(),
                                searchWrd,
                                today,
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
                BoardMaster master = accessGate.loadReadableMaster(bbsId, false);
                return nuri.business.service.board.dto.BoardMetaDto.from(master, accessGate.requiredEditPermissions(bbsId),
                                nuri.business.service.board.dto.BoardMasterCommunity.of(master.getCmntySn(), communityBoardAccess));
        }

        @Transactional(readOnly = true)
        public BoardStatsResponse getBoardStats(@NonNull String bbsId) {
                String today = today();
                accessGate.assertActiveBoardMaster(bbsId);
                BoardSearchCondition condition = new BoardSearchCondition(bbsId);
                condition.setUseYn("Y");
                bindCurrentViewerVisibility(condition, today);
                BoardStatsResult stats = boardRepository.aggregateVisibleStats(condition);
                return toStatsResponse(stats);
        }

        // 게시판 진입 판정(엄격 assertActiveBoardMaster·열람 loadReadableMaster·쓰기 loadWritableMaster)과 글 소속(findPostInBoard)은
        //   [2026-11-25] BoardAccessService 로 옮겼다 — 댓글·만족도·스크랩이 같은 판정을 이 서비스 없이 쓴다. 본문·순서는 같다.

        /**
         * 호출자가 이용할 수 있는 게시판 선택지(ADR-0040 결정 11). 사용 중인 게시판만 싣는다 — 조회 대행 권한자에게도 사용 안 함
         * 게시판은 이용 선택지가 아니다(운영 화면이 따로 연다). 커뮤니티 귀속 게시판은 {@code BoardAccessService#assertCommunityAccess} 와 같은 규칙을
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

        @Transactional
        public Long createPost(@NonNull String userId, @NonNull BoardSaveRequest request) {
                // [2026-10-23 ADR-0040 결정 1] 지정 게시판 가드 → 사용 여부(운영자 예외) → 커뮤니티 가드. 채번 직렬화를 위해
                //   마스터 행을 잠가 읽는다. [2026-09-08 PD-CMTY-001] 읽을 수 없는 게시판에는 쓸 수도 없다.
                BoardMaster master = accessGate.loadWritableMaster(request.bbsId(), true);
                // [2026-10-26 ADR-0043] Q&A 상태는 Q&A 게시판의 글에만 둔다.
                assertQnaStatusAllowed(master, request.qnaSttsCd());
                // [2026-10-23 ADR-0040 결정 3·6] 예약 게시를 받지 않는 게시판은 오늘보다 뒤의 새 시작일을 채번 전에 거부한다.
                String pstBgngYmd = requestedYmd(request.pstBgngYmd());
                assertFutureStartAllowed(master, pstBgngYmd, today());
                Timer.Sample sample = Timer.start(meterRegistry);

                try {
                        if (request.atchFileSn() != null) {
                                attachmentAssignmentPolicy.assertAssignable(request.atchFileSn());
                                // [2026-09-27 DIP B5 F9] 미리 올린 첨부 묶음을 붙이는 경로도 게시판 첨부 설정을 지난다.
                                //   [2026-10-26 ADR-0043, SET-02] 파일 수에 더해 파일당 크기도 본다.
                                assertGroupAttachable(master, request.atchFileSn());
                        }

                        // 작성자 이름 조회 — 실패하면 등록도 실패한다(대체 이름 없음, resolveAuthorName 참조)
                        String userNmToSet = resolveAuthorName(userId);

                        Long sortOrdr = boardRepository.findMaxSortOrdr(master.getBbsId()) + 1;

                        // 저자 식별은 인증 주체로 고정 — request.userId()/userNm() 로 저자 위조를 막는다.
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
                                        .pstCn(sanitizeAndValidateContent(request.pstCn()))
                                        // [2026-10-23 ADR-0040 결정 12] 빈 날짜는 저장하지 않는다(null).
                                        .pstBgngYmd(pstBgngYmd)
                                        .pstEndYmd(requestedYmd(request.pstEndYmd()))
                                        .atchFileSn(request.atchFileSn())
                                        .qnaCatCd(request.qnaCatCd())
                                        // [ADR-0040 결정 7] 비밀글 정책이 REQUIRED 면 요청과 관계없이 비밀글이다. 그 밖은 요청값 그대로이고,
                                        //   요청이 비어 있으면 'N' 이다(2026-10-29 — NULL 로 저장하지 않는다).
                                        .scrtYn(resolveSecretYn(master, request.scrtYn(), null))
                                        // [2026-09-27 DIP B5 F9] 게시글 비밀번호는 확인 경로가 없는 폐기 필드다. 화면이 '1' 을
                                        //   채워 평문으로 쌓이고 있었다 — 요청 값을 저장하지 않는다.
                                        .pswd(null)
                                        .build();
                        Long pstSn = required(boardRepository.save(required(board, "board 는 null 일 수 없습니다")),
                                        "boardRepository.save() 결과는 null 일 수 없습니다")
                                        .getPstSn();

                        // 커밋 뒤 생성 이벤트 발행 — 저장소 안 구독자는 없고 파생 제품의 확장 지점이다(PostCreatedEvent 참조).
                        //   [2026-10-23 ADR-0040 결정 3] 생성은 공개가 아니다 — 시작일이 미래인 글은 그날까지 작성자·조회 대행
                        //   권한자에게만 보인다. 구독자는 가시성을 다시 판정해야 하며, 공개 시점 이벤트는 없다.
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
                BoardMaster master = accessGate.loadWritableMaster(request.bbsId(), false);
                // [2026-10-26 ADR-0043] Q&A 상태도 업로드 전에 거부한다(createPost 가 다시 본다).
                assertQnaStatusAllowed(master, request.qnaSttsCd());
                // [2026-10-23 ADR-0040 결정 3·6] 받지 않는 미래 시작일도 업로드 전에 거부한다(createPost 가 다시 본다).
                assertFutureStartAllowed(master, requestedYmd(request.pstBgngYmd()), today());
                Long atchFileSn = request.atchFileSn();
                if (files != null && !files.isEmpty()) {
                        // [2026-09-27 DIP B5 F9] 게시판 첨부 설정(허용·파일 수·파일당 크기)을 저장 전에 본다.
                        assertNewFilesAllowed(master, 0, files);
                        atchFileSn = fileService.uploadBoardFiles(files);
                }

                BoardSaveRequest newRequest = withAtchFileSn(request, atchFileSn);

                return createPost(userId, newRequest);
        }

        // [2026-11-25 DEC-OPS-431] 답글 등록(replyPost·replyPostWithFiles)은 HTTP 경로·화면 없이 서비스에만 남아 있어 걷었다.
        //   되살리려면 목록·상세의 계층 표현과 함께 설계부터 다시 한다. 이미 저장된 답글 행(up_pst_sn)은 그대로 두며 상단 고정 판정은
        //   여전히 답글을 거부한다.

        /**
         * 게시글 상세. {@code countView=false} 는 조회수를 올리지 않는다 — 수정 화면처럼 글을 "읽는" 것이 아닌
         * 진입에 쓴다(2026-09-25 DIP I8). 종전에는 작성자가 수정 화면을 열거나 새로고침할 때마다 조회수가 올랐다.
         * 열람 가드(커뮤니티·비밀글·논리 삭제)는 조회수 여부와 무관하게 같다.
         */
        @Transactional(readOnly = true)
        public BoardDto getPostDetail(@NonNull String bbsId, @NonNull Long pstSn, boolean countView) {
                String today = today();
                // [2026-10-23 ADR-0040 결정 1] 사용 여부(조회 대행 권한 예외)를 먼저, 커뮤니티 회원 가드를 그다음에 본다
                //   ([2026-09-08 PD-CMTY-001] 커뮤니티 귀속 게시판이면 승인된 회원만 본다).
                // [2026-08-22 제품 결정] 논리 삭제(useYn='N') 게시글은 일반 사용자에게 404 지만
                // **관리자에게는 열람을 허용**한다. 복구·감사 경로가 404 로 막히면 관리자가 삭제된 글의
                // 내용을 확인할 방법이 사라진다. 아래 비밀글 소유권 가드는 삭제 여부와 무관하게 계속 적용된다.
                // '관리자' 판정은 조회 대행 권한 BOARD_READ_ALL 보유 여부다(기본 그룹 ROLE_ADMIN·ROLE_SYSTEM).
                BoardDetailResult detail = accessGate.readableDetail(accessGate.loadReadableMaster(bbsId, false), bbsId, pstSn,
                                SecurityUtil.hasPermission("BOARD_READ_ALL"));

                // 비밀글은 인증됐다는 사실만으로 본문을 공개하지 않는다. Board.userId 는 생성 시
                // UserDetails.getUsername() (= esntlId)으로 고정되므로 같은 축의 owner-or-admin 가드를 쓴다.
                // 비밀번호 검증 입력/계약이 없는 상세 API에서 저장 비밀번호를 임의로 재사용하지 않는다.
                if ("Y".equalsIgnoreCase(detail.getScrtYn())) {
                        SecurityUtil.assertOwnerOrPermissionByEsntlId(detail.getUserId(), "BOARD_READ_ALL");
                }
                // [2026-10-01 결정 23·2026-10-23 ADR-0040 결정 3] 게시 기간 밖의 글(시작일 전·종료일 뒤)은 작성자·전체 열람
                //   권한자만 연다. 남에게는 없는 글과 같다(404) — 403 으로 답하면 번호만으로 글의 존재를 알 수 있다.
                assertPostingVisible(detail, today);

                // Redis 기반 쓰기 지연 처리
                if (countView) {
                        viewCountService.increaseViewCount(pstSn);
                }

                BoardDto dto = boardMapper.toDto(detail);
                // [2026-10-01] 이미 추천했는지 알린다 — 화면이 추천 버튼을 '추천함' 으로 바꿔 409 를 미리 막는다.
                //   [2026-10-23 ADR-0040 결정 3·5] 목록과 같은 기준일로 판정한 게시 상태·고정 여부를 싣는다.
                return decorate(dto, detail.getUpendFixYn(), detail.getUpendFixEndYmd(), today).toBuilder()
                                .recommended(SecurityUtil.getCurrentEsntlId()
                                                .map(id -> recommendationRepository.existsById(new BoardRecommendationId(pstSn, id)))
                                                .orElse(null))
                                .build();
        }

        // Q&A 템플릿 게시판 판정(QNA_TEMPLATE_ID)은 BoardPolicySupport 가 등록·수정의 상태 검사와 함께 쓴다(2026-10-26 ADR-0043).

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
                BoardMaster master = accessGate.loadWritableMaster(bbsId, false);
                if (!QNA_TEMPLATE_ID.equals(master.getTmpltId())) {
                        throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                                        "Q&A 게시판의 질문만 해결됨으로 표시할 수 있습니다.");
                }
                Board board = findOwnedPost(bbsId, pstSn);
                board.markQnaStatus(QNA_SOLVED);
        }

        // 댓글·만족도·추천·스크랩의 열람 경계(assertCommentAccess·assertCommentReadAccess)와 댓글·만족도 설정 판정, 스크랩 포트
        //   (BoardPostAccessPort)는 [2026-11-25] BoardAccessService 로 옮겼다.

        /**
         * 새 추천 전 게시판 설정(추천 받기 {@code rcmdtnUseYn})을 본다(ADR-0040 결정 6). 열람 판정({@code BoardAccessService#assertCommentAccess})
         * 뒤에 부른다 — 읽을 수 없는 글에는 설정을 드러내지 않는다. 추천 취소({@link #cancelLike})는 부르지 않는다 — 추천을 꺼도 각자
         * 자기 추천은 거둘 수 있어야 한다. 이미 받은 추천 수는 그대로다.
         */
        private void assertRecommendationEnabled(String bbsId) {
                if (!accessGate.findBoardMaster(bbsId).acceptsRecommendations()) {
                        throw new BusinessException(CommonErrorCode.INVALID_STATE, "이 게시판은 추천을 받지 않습니다.");
                }
        }

        /**
         * 게시글 작성자의 표시 이름. 대체 이름을 두지 않는다 — 사용자를 찾지 못하면 {@code USER_NOT_FOUND}(404, U001) 업무
         * 예외로, 그 밖의 조회 실패는 원래 예외로 등록이 실패한다. 미조회는 인증 뒤 계정이 삭제된 요청에서 도달한다(인증 전에 없던
         * 계정은 인증 단계에서 막힌다).
         *
         * <p>[2026-11-23 GAP-BOARD-004] 종전에는 예외를 잡아 "익명" 으로 바꿨지만 그 이름은 저장되지 않았다. 재현에서 없는 사용자의
         * 글은 작성자 FK({@code fk_tb_bbs_item_tb_user_info})가 INSERT 를 거부했다. 사용자 서비스는 등록 트랜잭션에 참여하므로 그
         * 안에서 난 조회 예외는 트랜잭션을 rollback-only 로 표시한다 — 재현한 사례(주민번호 암호문 손상으로 조회가 실패)에서는 "익명"
         * INSERT 뒤 커밋이 {@code UnexpectedRollbackException} 으로 실패해 원인이 가려졌다.
         */
        private String resolveAuthorName(String userId) {
                return userService.getUserById(required(userId, "userId 는 null 일 수 없습니다")).userNm();
        }

        /**
         * 미리 올린 첨부 묶음을 글에 새로 붙여도 되는지 그 묶음의 파일 목록으로 본다(2026-10-26 ADR-0043, SET-02). 판정은
         * {@link BoardPolicySupport#assertAttachedGroupAllowed} 가 하고, 이 메서드는 파일 도메인에서 크기만 꺼내 넘긴다.
         */
        private void assertGroupAttachable(BoardMaster master, Long atchFileSn) {
                List<Long> sizes = fileService.getFileList(atchFileSn).stream()
                                .map(file -> file == null ? null : file.getFileMg())
                                .toList();
                assertAttachedGroupAllowed(master, sizes);
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
                                request.scrtYn(), request.useYn(), request.pswd(), request.version());
        }

        @Transactional(readOnly = true)
        public BoardDto getPublicFaqDetail(@NonNull Long pstSn) {
                String today = today();
                BoardDetailResult detail = boardRepository
                                .findPublicArticleDetail(boardIdProperties.getFaqId(), pstSn, today)
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
                // [2026-09-08 PD-CMTY-001·2026-10-23 ADR-0040 결정 1]
                BoardMaster master = accessGate.loadWritableMaster(bbsId, false);
                Board board = findOwnedPost(bbsId, pstSn);
                // [2026-10-26 ADR-0043] Q&A 상태는 Q&A 게시판의 글에만 둔다(소유·존재 판정 뒤).
                assertQnaStatusAllowed(master, request.qnaSttsCd());
                assertPeriodChange(master, board, request);
                updateOwnedPost(master, board, request, false);
        }

        /**
         * 작성 화면 수정의 버전·게시 기간 규칙(ADR-0040 결정 3·10·12). 소유·존재 판정(404·403) 뒤, 첨부 판정과 파일 저장보다 먼저
         * 부른다 — 거부된 수정이 파일을 남기지 않게.
         *
         * <ol>
         *   <li>버전: 상세에서 받은 버전이 없으면 400, 다르면 409 다. 버전이 비어 있는 옛 행은 버전과 무관하게 400(INVALID_STATE)
         *       으로 막는다(fail-closed) — 겹친 저장을 막을 근거가 없고, 저장하면 Hibernate 가 NULL 버전을 올리지 못한다.</li>
         *   <li>시작일 변경(정규화한 값이 저장값과 다를 때만): 게시가 시작된 글의 시작일은 게시글 전체 수정 권한이 없으면 403,
         *       예약 게시를 받지 않는 게시판의 미래 시작일은 400 이다(이 순서로 본다). 같은 시작일을 다시 보낸 수정은 변경이 아니다.</li>
         *   <li>합친 값의 순서: 한쪽 날짜만 보내도 저장값과 합쳐 시작이 종료보다 뒤면 400 이다.</li>
         * </ol>
         * 작성 화면 경로의 과거 종료일은 종전대로 받는다(운영 화면 경로만 막는다, D-13). 이 경로는 게시 기간 변경 이력을 남기지
         * 않는다(결정 9 — 작성 화면 수정 이력은 후속 설계).
         */
        private void assertPeriodChange(BoardMaster master, Board board, BoardSaveRequest request) {
                assertVersioned(board);
                EntityVersions.assertCurrent(request.version(), board.getVersion());
                String today = today();
                String start = requestedYmd(request.pstBgngYmd());
                String end = requestedYmd(request.pstEndYmd());
                if (startDateChanged(board.getPstBgngYmd(), start)) {
                        // 바꿀 자격(403)을 값의 허용 여부(400)보다 먼저 본다 — 공개된 글의 작성자는 날짜를 고쳐도 바꿀 수 없다.
                        assertStartDateChangeAllowed(board.getPstBgngYmd(), start, today);
                        assertFutureStartAllowed(master, start, today);
                }
                assertPeriodOrder(start != null ? start : board.getPstBgngYmd(), end != null ? end : board.getPstEndYmd());
        }

        /** 게시글 변경 및 파일 I/O보다 먼저 현재 주체의 게시글 소유권을 확정한다. */
        private Board findOwnedPost(String bbsId, Long pstSn) {
                Board board = accessGate.findPostInBoard(bbsId, pstSn);

                // [보안] 권한 및 소유권 확인 (Board는 esntlId 축 사용 -> SecurityUtil.assertOwnerOrPermissionByEsntlId 기준 비교)
                SecurityUtil.assertOwnerOrPermissionByEsntlId(board.getUserId(), "BOARD_UPDATE_ALL");
                return board;
        }

        private void updateOwnedPost(BoardMaster master, Board board, BoardSaveRequest request,
                        boolean attachmentAlreadyValidated) {
                if (!attachmentAlreadyValidated
                                && request.atchFileSn() != null
                                && !java.util.Objects.equals(board.getAtchFileSn(), request.atchFileSn())) {
                        attachmentAssignmentPolicy.assertAssignable(request.atchFileSn());
                        // [2026-10-26 ADR-0043, SET-02] 묶음을 바꾸는 JSON 수정도 새 묶음의 파일로 게시판 첨부 설정(허용·파일 수·
                        //   파일당 크기)을 본다. 종전에는 이 경로만 설정을 거치지 않아, 첨부를 끈 게시판에도 미리 올린 묶음이 붙었다.
                        //   화면은 같은 묶음 번호를 다시 보내므로 이 판정에 오지 않는다.
                        assertGroupAttachable(master, request.atchFileSn());
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
                 *
                 * [2026-10-23 ADR-0040 결정 12, D-19] 게시 기간은 빈 문자열('')도 '바꾸지 않음'이다 — 종전에는 ''
                 * 가 저장값을 지웠다. 종료일 해제는 운영 화면 일괄 처리의 명시적 동작(CLEAR_END)만 한다.
                 */
                String requestedStart = requestedYmd(request.pstBgngYmd());
                String requestedEnd = requestedYmd(request.pstEndYmd());
                String sanitizedContent = BoardPolicySupport.sanitizeAndValidateContent(request.pstCn());
                board.update(request.pstTtl(), sanitizedContent,
                                board.getUserId(),   // 저자(userId/userNm)는 불변 — request 로 재지정 금지(정체성 위조 방지)
                                board.getUserNm(),
                                board.getPswd(),     // [2026-09-27 DIP B5 F9] 폐기 필드 — 요청 값으로 바꾸지 않는다(기존 값은 지우지 않는다).
                                requestedStart != null ? requestedStart : board.getPstBgngYmd(),
                                requestedEnd != null ? requestedEnd : board.getPstEndYmd(),
                                request.atchFileSn() != null ? request.atchFileSn() : board.getAtchFileSn(),
                                eventDate != null ? eventDate : board.getEvntDt(),
                                request.qnaSttsCd() != null ? request.qnaSttsCd() : board.getQnaSttsCd(),
                                request.qnaCatCd() != null ? request.qnaCatCd() : board.getQnaCatCd(),
                                // [ADR-0040 결정 7] 비밀글 정책이 REQUIRED 면 고친 글도 비밀글이다(공개로 남아 있던 옛 글 포함 —
                                //   열람 범위를 좁히기만 한다). 그 밖은 지금처럼 요청값, 없으면 저장값이다(저장값도 NULL 이면 'N').
                                resolveSecretYn(master, request.scrtYn(), board.getScrtYn()));
        }

        @Transactional
        public void updatePostWithFiles(@NonNull String bbsId, @NonNull Long pstSn, @NonNull BoardSaveRequest request,
                        List<MultipartFile> files)
                        throws IOException {
                // [2026-09-14 DEC-OPS-092] JSON 수정(updatePost)과 같은 커뮤니티 가드. 이 경로에만 빠져 있었다.
                //   [2026-10-23 ADR-0040 결정 1] 사용 여부도 같은 판정에서 본다.
                BoardMaster master = accessGate.loadWritableMaster(bbsId, false);
                Board board = findOwnedPost(bbsId, pstSn);
                // [2026-10-26 ADR-0043] JSON 수정과 같은 Q&A 상태 규칙 — 파일 저장보다 먼저 본다.
                assertQnaStatusAllowed(master, request.qnaSttsCd());
                // [2026-10-23 ADR-0040 결정 3·10] 버전·게시 기간 규칙을 첨부 판정과 파일 저장보다 먼저 본다.
                assertPeriodChange(master, board, request);
                // [2026-09-25 DIP I1] 요청이 첨부 번호를 싣지 않으면 글의 기존 첨부 묶음에 더한다. 종전에는 새 묶음을
                //   만들어 글을 그쪽으로 옮겨, 수정 중 파일 하나를 더하면 기존 첨부가 글에서 조용히 떨어져 나갔다.
                Long atchFileSn = request.atchFileSn() != null ? request.atchFileSn() : board.getAtchFileSn();
                boolean attachmentAlreadyValidated = false;

                // 클라이언트가 기존 첨부 식별자를 골랐다면 물리 파일 변경보다 먼저 원 업로더인지 확인한다.
                if (atchFileSn != null && !java.util.Objects.equals(board.getAtchFileSn(), atchFileSn)) {
                        attachmentAssignmentPolicy.assertAssignable(atchFileSn);
                        // [2026-10-26 ADR-0043, SET-02] 바꿔 붙일 묶음 자체도 게시판 첨부 설정을 지난다 — 종전에는 새 파일이
                        //   없으면 이 묶음의 허용·파일 수·크기를 아무도 보지 않았다. 새 파일은 아래에서 합쳐 센다.
                        assertGroupAttachable(master, atchFileSn);
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

                updateOwnedPost(master, board, newRequest, attachmentAlreadyValidated);
        }

        // 운영 화면의 게시 기간·상단 고정 처리(단건·일괄·변경 이력)는 [2026-11-25] BoardPostOperationService 로 옮겼다.

        @Transactional
        public void deletePost(@NonNull String bbsId, @NonNull Long pstSn, String authorId) {
                accessGate.loadWritableMaster(bbsId, false); // [2026-09-08 PD-CMTY-001·2026-10-23 ADR-0040 결정 1]
                Board board = accessGate.findPostInBoard(bbsId, pstSn);

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
                accessGate.assertCommentAccess(bbsId, id);
                String esntlId = SecurityUtil.getCurrentEsntlId()
                                .orElseThrow(() -> new BusinessException(CommonErrorCode.ACCESS_DENIED));
                // [2026-10-23 ADR-0040 결정 6] 추천을 받지 않는 게시판은 새 추천을 400 으로 거부한다. 열람 판정 뒤라 읽을 수 없는
                //   글에는 설정을 드러내지 않는다.
                assertRecommendationEnabled(bbsId);
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

        /**
         * 내 추천 취소(ADR-0040 결정 6, 설계서 §7 B3). 지금 사용자의 추천 이력이 있을 때만 그 이력을 지우고 추천 수를 하나 줄인다.
         * 이력이 없으면 아무것도 바꾸지 않고 지금 추천 수를 돌려준다(멱등 — 이중 클릭·재시도가 오류가 되지 않는다). 그래서 이력이 없는
         * 옛 추천 수와 남의 추천은 줄지 않는다(GAP-DOMAIN-001 남은 경계). 취소 뒤에는 다시 추천할 수 있다.
         *
         * <p>판정은 추천과 같은 엄격 경계({@link BoardAccessService#assertCommentAccess})다 — 사용 안 함 게시판·읽을 수 없는 글(비밀글·게시 기간 밖)은
         * 이력을 건드리기 전에 거부한다. 추천 받기 설정은 보지 않는다 — 추천을 꺼도 내 추천은 거둘 수 있다.
         *
         * <p>[동시성] 감소의 근거는 이력 행 DELETE 의 영향 수 하나다. 같은 사람의 동시 취소에서 두 번째 DELETE 는 첫 커밋을 기다렸다가
         * 0행이 되므로 감소는 정확히 한 번이다. 있는지 먼저 읽고 지우는 방식(existsById → deleteById)은 둘 다 '있음' 을 보고 두 번
         * 줄일 수 있어 쓰지 않는다. 감소 문장은 0 아래로 내려가지 않는다(이중 방어).
         */
        @Transactional
        public Integer cancelLike(@NonNull String bbsId, @NonNull Long pstSn) {
                Long id = required(pstSn, "pstSn 는 null 일 수 없습니다");
                accessGate.assertCommentAccess(bbsId, id);
                String esntlId = SecurityUtil.getCurrentEsntlId()
                                .orElseThrow(() -> new BusinessException(CommonErrorCode.ACCESS_DENIED));
                if (recommendationRepository.deleteRecommendation(id, esntlId) == 1) {
                        boardRepository.decrementLikeCntAtomic(id);
                }
                return boardRepository.findById(id)
                                .map(Board::getLikeCnt)
                                .orElseThrow(() -> new BusinessException(BoardErrorCode.ARTICLE_NOT_FOUND));
        }
}
