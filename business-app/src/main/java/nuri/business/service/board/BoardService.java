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
         * 게시판 인스턴스 ID 설정({@code nuri.boards.*}). FAQ 통합 축(공지 게시판과 같은 인스턴스)의 의미는
         * {@link BoardIdProperties} 참조 — 값 정합화는 제품 판단 대기.
         */
        private final BoardIdProperties boardIdProperties;

        /**
         * 커뮤니티 귀속 게시판({@code tb_bbs_master.cmnty_sn} 이 있는 게시판)의 접근 판정 포트. 커뮤니티 도메인이 base projection 에서
         * 빠지면 {@code null} 이고, 그때 커뮤니티 귀속 게시판은 관리자 외에게 닫힌다(fail-closed,
         * {@code BoardAccessService#assertCommunityAccess}) — 통과시키면 회원 전용 게시판이 전원 공개로 뒤집힌다(H3).
         */
        private final CommunityBoardAccessPort communityBoardAccess;

        /** 게시글 추천 이력 — 한 사람이 한 글을 한 번만 추천한다. */
        private final BoardRecommendationRepository recommendationRepository;

        /**
         * 게시판 진입·글 소속·열람 경계 판정. 같은 의존성으로 직접 만든다 — 패키지 범위 헬퍼를 프록시 없이 이 서비스의 트랜잭션
         * 안에서 부른다(잠금 조회가 등록 트랜잭션에 그대로 참여한다). 댓글·만족도·스크랩은 같은 클래스의 빈을 쓴다.
         */
        private final BoardAccessService accessGate;

        /** 게시 기간 판정의 시계(ADR-0040 결정 3). 생성자 인자가 아니다 — Clock 빈이 없고 직접 생성하는 시험이 많다. */
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
         * 업무 홈 카드용 최근 글. 운영자 열람 예외를 두지 않는다(ADR-0040 결정 1) — 홈 카드는 이용자와 같은 결과를 보여야
         * 일괄 사용 안 함의 영향 확인(설계서 §5.2)과 맞는다.
         */
        @Transactional(readOnly = true)
        public Page<BoardDto> getBoardPosts(@NonNull String bbsId, @NonNull Pageable pageable) {
                return listPosts(false, bbsId, "0", "", null, null, null, null, null, null, pageable,
                                BoardPostListFilter.NONE);
        }

        /**
         * @param dateBasis 기간 조건을 어느 날짜로 볼지. 비어 있거나 {@code CREATED} 면 작성일, {@code EVENT} 면
         *                  행사일(없으면 작성일)이다 — 캘린더 템플릿은 칸을 행사일로 배치한다.
         * @param filter    서버 기준일로 판정하는 운영 조건(게시 상태·고정, ADR-0040 결정 3·5). 가시성을 넓히지 않는다 —
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
         * 목록 응답에 현재 사용자의 추천 여부를 한 번의 조회로 싣는다 — 화면이 이미 추천한 글의 추천 버튼을 미리 바꿔 409 를 막는다.
         * 사용자를 모르면 null 로 둔다. 게시 상태·고정은 {@link #decorate(BoardDto, String, String, String)} 가 이미 판정했다.
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
         * 한 글의 서버 판정 값을 싣는다 — 게시 상태(ADR-0040 결정 3), 지금 고정 중인지와 그 종료일(결정 5). 같은 기준일로
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
         * 활성 게시판 전체에서 <b>게시글 제목</b>을 검색한다(통합 검색 전용). 본문({@code pst_cn})은 에디터 HTML 원문이라
         * {@code contains} 로 훑으면 태그·속성이 매칭되고 전문 검색 인덱스가 없어 제목으로 한정한다. 화면 문구도 같은 범위를 말한다.
         *
         * <p>새 노출 경로를 만들지 않는다 — 게시판 목록과 같은 술어({@code BoardPredicate.searchBoard} + 활성 게시판 조인)를 쓰고,
         * 비밀글은 작성자 본인과 관리자에게만 보인다({@link BoardPolicySupport#bindCurrentViewerVisibility}).
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
                // 결과마다 게시판 이름을 싣는다(ADR-0043) — 메뉴가 없는 게시판은 검색이 거의 유일한 발견 경로다. 값은 검색 질의가
                //   이미 잇는 게시판 마스터에서 온다.
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
         * 게시글 목록·상세 화면용 게시판 메타. 사용 안 함 게시판의 메타는 조회 대행 권한자에게만 준다(목록·상세와 같은 열람 판정,
         * ADR-0040 결정 1). 사용 여부를 커뮤니티 가드보다 먼저 본다 — 사용 안 함 커뮤니티 게시판에서 비회원이 403 으로 존재를 알지 못하게.
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

        /**
         * 호출자가 이용할 수 있는 게시판 선택지(ADR-0040 결정 11). 사용 중인 게시판만 싣는다 — 조회 대행 권한자에게도 사용 안 함
         * 게시판은 이용 선택지가 아니다(운영 화면이 따로 연다). 커뮤니티 귀속 게시판은 {@code BoardAccessService#assertCommunityAccess} 와
         * 같은 규칙을 거부 대신 거르기로 적용한다: BOARD_READ_ALL 보유자는 싣고, 그 밖은 승인 회원이어야 하며 회원 판정 포트가 없으면
         * 뺀다(fail-closed).
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
                // 지정 게시판 가드 → 사용 여부(운영자 예외) → 커뮤니티 가드 순이다(ADR-0040 결정 1). 채번 직렬화를 위해 마스터 행을
                //   잠가 읽는다. 읽을 수 없는 게시판에는 쓸 수도 없다(PD-CMTY-001).
                BoardMaster master = accessGate.loadWritableMaster(request.bbsId(), true);
                assertQnaStatusAllowed(master, request.qnaSttsCd());
                // 받지 않는 미래 시작일은 채번 전에 거부한다(ADR-0040 결정 3·6).
                String pstBgngYmd = requestedYmd(request.pstBgngYmd());
                assertFutureStartAllowed(master, pstBgngYmd, today());
                Timer.Sample sample = Timer.start(meterRegistry);

                try {
                        if (request.atchFileSn() != null) {
                                attachmentAssignmentPolicy.assertAssignable(request.atchFileSn());
                                // 미리 올린 첨부 묶음을 붙이는 경로도 게시판 첨부 설정(파일 수·파일당 크기)을 지난다(ADR-0043).
                                assertGroupAttachable(master, request.atchFileSn());
                        }

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
                                        // 빈 날짜는 저장하지 않는다(null, ADR-0040 결정 12).
                                        .pstBgngYmd(pstBgngYmd)
                                        .pstEndYmd(requestedYmd(request.pstEndYmd()))
                                        .atchFileSn(request.atchFileSn())
                                        .qnaCatCd(request.qnaCatCd())
                                        // 비밀글 정책이 REQUIRED 면 요청과 관계없이 비밀글이다(ADR-0040 결정 7). 그 밖은 요청값, 비어 있으면 'N' 이다.
                                        .scrtYn(resolveSecretYn(master, request.scrtYn(), null))
                                        // 게시글 비밀번호는 확인 경로가 없는 폐기 필드다 — 요청 값을 평문으로 저장하지 않는다.
                                        .pswd(null)
                                        .build();
                        Long pstSn = required(boardRepository.save(required(board, "board 는 null 일 수 없습니다")),
                                        "boardRepository.save() 결과는 null 일 수 없습니다")
                                        .getPstSn();

                        // 커밋 뒤 생성 이벤트 발행 — 저장소 안 구독자는 없고 파생 제품의 확장 지점이다(PostCreatedEvent 참조).
                        //   생성은 공개가 아니다(ADR-0040 결정 3) — 시작일이 미래인 글은 그날까지 작성자·조회 대행 권한자에게만
                        //   보이므로 구독자는 가시성을 다시 판정해야 한다. 공개 시점 이벤트는 없다.
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
                // 게시판·커뮤니티·사용 여부·Q&A 상태·미래 시작일 검증을 업로드보다 먼저 한다(createPost 가 다시 본다) — 거부된
                //   요청이 접근할 수 없는 파일을 디스크에 남기지 않게. 그 뒤 단계의 실패는 FileService 가 트랜잭션 롤백 때
                //   이번 호출로 저장한 파일을 지운다.
                BoardMaster master = accessGate.loadWritableMaster(request.bbsId(), false);
                assertQnaStatusAllowed(master, request.qnaSttsCd());
                assertFutureStartAllowed(master, requestedYmd(request.pstBgngYmd()), today());
                Long atchFileSn = request.atchFileSn();
                if (files != null && !files.isEmpty()) {
                        assertNewFilesAllowed(master, 0, files);
                        atchFileSn = fileService.uploadBoardFiles(files);
                }

                BoardSaveRequest newRequest = withAtchFileSn(request, atchFileSn);

                return createPost(userId, newRequest);
        }

        // 답글 등록(replyPost·replyPostWithFiles)은 걷었다(DEC-OPS-431). 되살리려면 목록·상세의 계층 표현과 함께 설계부터 다시 한다.
        //   이미 저장된 답글 행(up_pst_sn)은 그대로 두며 상단 고정 판정은 여전히 답글을 거부한다.

        /**
         * 게시글 상세. {@code countView=false} 는 조회수를 올리지 않는다 — 수정 화면처럼 글을 "읽는" 것이 아닌 진입에 쓴다.
         * 열람 가드(커뮤니티·비밀글·논리 삭제)는 조회수 여부와 무관하게 같다.
         */
        @Transactional(readOnly = true)
        public BoardDto getPostDetail(@NonNull String bbsId, @NonNull Long pstSn, boolean countView) {
                String today = today();
                // 사용 여부(조회 대행 권한 예외) → 커뮤니티 회원 가드 순이다(ADR-0040 결정 1, PD-CMTY-001).
                // 논리 삭제(useYn='N') 글은 일반 사용자에게 404 지만 BOARD_READ_ALL 보유자에게는 연다 — 복구·감사 경로가 막히면
                //   삭제된 글의 내용을 확인할 방법이 없다. 아래 비밀글 소유권 가드는 삭제 여부와 무관하게 적용된다.
                BoardDetailResult detail = accessGate.readableDetail(accessGate.loadReadableMaster(bbsId, false), bbsId, pstSn,
                                SecurityUtil.hasPermission("BOARD_READ_ALL"));

                // 비밀글은 인증됐다는 사실만으로 본문을 공개하지 않는다. Board.userId 는 생성 시 esntlId 로 고정되므로 같은 축의
                //   owner-or-admin 가드를 쓴다. 비밀번호 검증 계약이 없는 상세 API 에서 저장 비밀번호를 재사용하지 않는다.
                if ("Y".equalsIgnoreCase(detail.getScrtYn())) {
                        SecurityUtil.assertOwnerOrPermissionByEsntlId(detail.getUserId(), "BOARD_READ_ALL");
                }
                assertPostingVisible(detail, today);

                // Redis 기반 쓰기 지연 처리
                if (countView) {
                        viewCountService.increaseViewCount(pstSn);
                }

                BoardDto dto = boardMapper.toDto(detail);
                // 목록과 같은 기준일로 판정한 게시 상태·고정 여부와 추천 여부를 싣는다 — 화면이 추천 버튼을 '추천함' 으로 바꿔
                //   409 를 미리 막는다.
                return decorate(dto, detail.getUpendFixYn(), detail.getUpendFixEndYmd(), today).toBuilder()
                                .recommended(SecurityUtil.getCurrentEsntlId()
                                                .map(id -> recommendationRepository.existsById(new BoardRecommendationId(pstSn, id)))
                                                .orElse(null))
                                .build();
        }

        /** Q&A 해결 상태 값(화면 isQnaSolved 와 같은 값). */
        private static final String QNA_SOLVED = "SOLVED";

        /**
         * 질문을 해결됨으로 표시한다. 작성자 또는 게시글 전체 수정 권한자만 한다. Q&A 템플릿이 아닌 게시판의 글은 해결 상태가
         * 없어 거부하고, 이미 해결된 질문을 다시 표시해도 오류가 아니다(같은 결과).
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
         * 게시글 작성자의 표시 이름. 대체 이름을 두지 않는다 — 사용자를 찾지 못하면 {@code USER_NOT_FOUND}(404, U001), 그 밖의
         * 조회 실패는 원래 예외로 등록이 실패한다. 없는 작성자는 FK({@code fk_tb_bbs_item_tb_user_info})가 거부하고, 사용자 서비스는
         * 등록 트랜잭션에 참여해 조회 예외를 잡아도 커밋이 {@code UnexpectedRollbackException} 으로 원인을 가린다(GAP-BOARD-004).
         */
        private String resolveAuthorName(String userId) {
                return userService.getUserById(required(userId, "userId 는 null 일 수 없습니다")).userNm();
        }

        /**
         * 미리 올린 첨부 묶음을 글에 새로 붙여도 되는지 그 묶음의 파일 목록으로 본다(ADR-0043). 판정은
         * {@link BoardPolicySupport#assertAttachedGroupAllowed} 가 하고, 이 메서드는 파일 도메인에서 크기만 꺼내 넘긴다.
         */
        private void assertGroupAttachable(BoardMaster master, Long atchFileSn) {
                List<Long> sizes = fileService.getFileList(atchFileSn).stream()
                                .map(file -> file == null ? null : file.getFileMg())
                                .toList();
                assertAttachedGroupAllowed(master, sizes);
        }

        /** 첨부 번호만 바꾼 요청 사본. 요청 필드가 늘면 이 한 곳만 함께 고친다 — 빠뜨린 필드는 조용히 사라진다. */
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
                BoardMaster master = accessGate.loadWritableMaster(bbsId, false);
                Board board = findOwnedPost(bbsId, pstSn);
                // Q&A 상태 규칙은 소유·존재 판정(404·403) 뒤에 본다.
                assertQnaStatusAllowed(master, request.qnaSttsCd());
                assertPeriodChange(master, board, request);
                updateOwnedPost(master, board, request, false);
        }

        /**
         * 작성 화면 수정의 버전·게시 기간 규칙(ADR-0040 결정 3·10·12). 소유·존재 판정(404·403) 뒤, 첨부 판정과 파일 저장보다 먼저
         * 부른다 — 거부된 수정이 파일을 남기지 않게.
         *
         * <ol>
         *   <li>버전: 상세에서 받은 버전이 없으면 400, 다르면 409 다. 버전이 비어 있는 옛 행은 400(INVALID_STATE)으로 막는다
         *       (fail-closed, {@code assertVersioned}).</li>
         *   <li>시작일 변경(정규화한 값이 저장값과 다를 때만): 게시가 시작된 글의 시작일은 게시글 전체 수정 권한이 없으면 403,
         *       예약 게시를 받지 않는 게시판의 미래 시작일은 400 이다(이 순서로 본다).</li>
         *   <li>합친 값의 순서: 한쪽 날짜만 보내도 저장값과 합쳐 시작이 종료보다 뒤면 400 이다.</li>
         * </ol>
         * 작성 화면 경로는 과거 종료일을 받는다(운영 화면 경로만 막는다). 이 경로는 게시 기간 변경 이력을 남기지 않는다(결정 9).
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

                SecurityUtil.assertOwnerOrPermissionByEsntlId(board.getUserId(), "BOARD_UPDATE_ALL");
                return board;
        }

        private void updateOwnedPost(BoardMaster master, Board board, BoardSaveRequest request,
                        boolean attachmentAlreadyValidated) {
                if (!attachmentAlreadyValidated
                                && request.atchFileSn() != null
                                && !java.util.Objects.equals(board.getAtchFileSn(), request.atchFileSn())) {
                        attachmentAssignmentPolicy.assertAssignable(request.atchFileSn());
                        // 묶음을 바꾸는 JSON 수정도 새 묶음으로 게시판 첨부 설정을 본다(ADR-0043). 화면은 같은 묶음 번호를 다시
                        //   보내므로 이 판정에 오지 않는다.
                        assertGroupAttachable(master, request.atchFileSn());
                }

                java.time.LocalDateTime eventDate = parseDateTime(request.evntDt());

                /*
                 * 부분 갱신이다 — null 은 '보내지 않음' 이라 저장값을 둔다(Board.update 는 널 가드 없이 대입한다). 필드를 생략한
                 * 요청(수정 폼은 Q&A 분류를 보내지 않는다)을 덮어쓰면 기존 값이 조용히 사라진다.
                 * 프런트는 빈 문자열을 undefined 로 보내므로(boardActions.ts) null=미전송 으로 읽어도 안전하다. 값을 비우는 경로가
                 * 필요해지면 명시적 clear 플래그를 설계한다. 게시 기간은 빈 문자열('')도 '바꾸지 않음'이고, 종료일 해제는 운영 화면
                 * 일괄 처리의 CLEAR_END 만 한다(ADR-0040 결정 12).
                 */
                String requestedStart = requestedYmd(request.pstBgngYmd());
                String requestedEnd = requestedYmd(request.pstEndYmd());
                String sanitizedContent = BoardPolicySupport.sanitizeAndValidateContent(request.pstCn());
                board.update(request.pstTtl(), sanitizedContent,
                                board.getUserId(),   // 저자(userId/userNm)는 불변 — request 로 재지정 금지(정체성 위조 방지)
                                board.getUserNm(),
                                board.getPswd(),     // 폐기 필드 — 요청 값으로 바꾸지 않는다(기존 값은 지우지 않는다).
                                requestedStart != null ? requestedStart : board.getPstBgngYmd(),
                                requestedEnd != null ? requestedEnd : board.getPstEndYmd(),
                                request.atchFileSn() != null ? request.atchFileSn() : board.getAtchFileSn(),
                                eventDate != null ? eventDate : board.getEvntDt(),
                                request.qnaSttsCd() != null ? request.qnaSttsCd() : board.getQnaSttsCd(),
                                request.qnaCatCd() != null ? request.qnaCatCd() : board.getQnaCatCd(),
                                // 비밀글 정책이 REQUIRED 면 공개로 남아 있던 옛 글도 고치면 비밀글이다(ADR-0040 결정 7 — 열람 범위를
                                //   좁히기만 한다). 그 밖은 요청값, 없으면 저장값, 둘 다 없으면 'N' 이다.
                                resolveSecretYn(master, request.scrtYn(), board.getScrtYn()));
        }

        @Transactional
        public void updatePostWithFiles(@NonNull String bbsId, @NonNull Long pstSn, @NonNull BoardSaveRequest request,
                        List<MultipartFile> files)
                        throws IOException {
                // JSON 수정(updatePost)과 같은 커뮤니티·사용 여부 가드다(DEC-OPS-092, ADR-0040 결정 1).
                BoardMaster master = accessGate.loadWritableMaster(bbsId, false);
                Board board = findOwnedPost(bbsId, pstSn);
                // Q&A 상태·버전·게시 기간 규칙을 첨부 판정과 파일 저장보다 먼저 본다(ADR-0040 결정 3·10).
                assertQnaStatusAllowed(master, request.qnaSttsCd());
                assertPeriodChange(master, board, request);
                // 요청이 첨부 번호를 싣지 않으면 글의 기존 첨부 묶음에 더한다 — 새 묶음으로 옮기면 기존 첨부가 글에서 떨어진다.
                Long atchFileSn = request.atchFileSn() != null ? request.atchFileSn() : board.getAtchFileSn();
                boolean attachmentAlreadyValidated = false;

                // 클라이언트가 기존 첨부 식별자를 골랐다면 물리 파일 변경보다 먼저 원 업로더인지 확인한다.
                if (atchFileSn != null && !java.util.Objects.equals(board.getAtchFileSn(), atchFileSn)) {
                        attachmentAssignmentPolicy.assertAssignable(atchFileSn);
                        // 바꿔 붙일 묶음 자체도 게시판 첨부 설정을 지난다(ADR-0043). 새 파일은 아래에서 이미 붙은 파일과 합쳐 센다.
                        assertGroupAttachable(master, atchFileSn);
                        attachmentAlreadyValidated = true;
                }

                if (files != null && !files.isEmpty()) {
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

        @Transactional
        public void deletePost(@NonNull String bbsId, @NonNull Long pstSn, String authorId) {
                accessGate.loadWritableMaster(bbsId, false);
                Board board = accessGate.findPostInBoard(bbsId, pstSn);

                SecurityUtil.assertOwnerOrPermissionByEsntlId(board.getUserId(), "BOARD_DELETE_ALL");

                board.delete();
        }

        /**
         * 추천 수를 원자 UPDATE 로 올린다 — 엔티티 필드를 고치면 {@code @Version} 이 올라 그 글을 편집하던 사용자가 409 편집 충돌을
         * 받고, 행 락은 같은 글의 추천을 직렬화한다. 갱신 후 값은 재조회한다 — {@code clearAutomatically} 라 1차 캐시가 비어 실제 값을
         * 읽고, 그 사이 섞인 남의 증가분은 오차가 아니라 더 최신 값이다.
         */
        @Transactional
        public Integer incrementLike(@NonNull String bbsId, @NonNull Long pstSn) {
                Long id = required(pstSn, "pstSn 는 null 일 수 없습니다");
                // 추천은 글을 읽을 수 있는 사람(게시판 일치·커뮤니티 회원·비밀글 판정)만, 한 번만 한다.
                accessGate.assertCommentAccess(bbsId, id);
                String esntlId = SecurityUtil.getCurrentEsntlId()
                                .orElseThrow(() -> new BusinessException(CommonErrorCode.ACCESS_DENIED));
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
         * 내 추천 취소(ADR-0040 결정 6). 내 추천 이력이 있을 때만 지우고 추천 수를 하나 줄이며, 없으면 지금 추천 수를 돌려준다(멱등 —
         * 이중 클릭·재시도가 오류가 되지 않는다). 그래서 이력이 없는 옛 추천 수와 남의 추천은 줄지 않는다(GAP-DOMAIN-001 남은 경계).
         *
         * <p>판정은 추천과 같은 엄격 경계({@link BoardAccessService#assertCommentAccess})로 이력을 건드리기 전에 거부한다. 추천 받기
         * 설정은 보지 않는다 — 추천을 꺼도 내 추천은 거둘 수 있다.
         *
         * <p>감소의 근거는 이력 행 DELETE 의 영향 수 하나다 — 같은 사람의 동시 취소에서 두 번째 DELETE 는 첫 커밋을 기다렸다가 0행이
         * 되므로 감소는 한 번이다. existsById → deleteById 는 둘 다 '있음' 을 보고 두 번 줄일 수 있어 쓰지 않는다. 감소 문장은 0 아래로
         * 내려가지 않는다(이중 방어).
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
