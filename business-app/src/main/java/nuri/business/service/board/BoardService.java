package nuri.business.service.board;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.business.domain.user.exception.UserErrorCode;
import nuri.business.domain.board.exception.BoardErrorCode;

import nuri.foundation.core.exception.BusinessException;
import nuri.business.core.service.BaseAbstractService;
import nuri.business.domain.board.Board;
import nuri.business.domain.board.BoardDetailResult;
import nuri.business.domain.board.BoardMaster;
import nuri.business.domain.board.BoardMasterRepository;
import nuri.business.domain.board.BoardRepository;
import nuri.business.domain.board.BoardSearchCondition;
import nuri.business.service.board.dto.BoardDto;
import nuri.business.service.board.dto.BoardMapper;
import nuri.business.service.board.dto.BoardSaveRequest;
import nuri.business.service.board.dto.BoardStatsResponse;
import nuri.business.service.board.event.PostCreatedEvent;
import nuri.business.service.file.FileService;
import nuri.business.service.user.UserService;
import nuri.business.service.user.dto.UserDto;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.List;


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
        private final ApplicationEventPublisher eventPublisher;
        private final MeterRegistry meterRegistry;
        private final BoardViewCountService viewCountService;
        private final BoardMapper boardMapper;

        public BoardService(BoardRepository boardRepository,
                        BoardMasterRepository boardMasterRepository,
                        UserService userService,
                        FileService fileService,
                        ApplicationEventPublisher eventPublisher,
                        MeterRegistry meterRegistry,
                        BoardViewCountService viewCountService,
                        BoardMapper boardMapper) {
                this.boardRepository = required(boardRepository, "boardRepository 는 null 일 수 없습니다");
                this.boardMasterRepository = required(boardMasterRepository, "boardMasterRepository 는 null 일 수 없습니다");
                this.userService = required(userService, "userService 는 null 일 수 없습니다");
                this.fileService = required(fileService, "fileService 는 null 일 수 없습니다");
                this.eventPublisher = required(eventPublisher, "eventPublisher 는 null 일 수 없습니다");
                this.meterRegistry = required(meterRegistry, "meterRegistry 는 null 일 수 없습니다");
                this.viewCountService = required(viewCountService, "viewCountService 는 null 일 수 없습니다");
                this.boardMapper = required(boardMapper, "boardMapper 는 null 일 수 없습니다");
        }


        @Transactional(readOnly = true)
        public Page<BoardDto> getBoardPosts(@NonNull String bbsId, @NonNull Pageable pageable) {
                return getBoardPosts(bbsId, "0", "", null, null, null, null, null, pageable);
        }

        @Transactional(readOnly = true)
        public Page<BoardDto> getBoardPosts(@NonNull String bbsId, String searchCnd, String searchWrd,
                        @NonNull Pageable pageable) {
                return getBoardPosts(bbsId, searchCnd, searchWrd, null, null, null, null, null, pageable);
        }

        @Transactional(readOnly = true)
        public Page<BoardDto> getBoardPosts(@NonNull String bbsId, String searchCnd, String searchWrd,
                        String orderBy, String startDate, String endDate, String qnaStatus, String qnaCategory,
                        @NonNull Pageable pageable) {
                log.info("Fetching board posts - bbsId: {}, searchWrd: '{}', orderBy: {}", bbsId, searchWrd, orderBy);
                boardMasterRepository.findById(required(bbsId, "bbsId 는 null 일 수 없습니다"))
                                .orElseThrow(() -> new BusinessException(BoardErrorCode.BOARD_NOT_FOUND));

                BoardSearchCondition condition = new BoardSearchCondition();
                condition.setBbsId(bbsId);
                condition.setUseYn("Y");
                condition.setSearchCnd(searchCnd);
                condition.setSearchWrd(searchWrd);
                condition.setOrderBy(orderBy);
                condition.setQnaSttsCd(qnaStatus);
                condition.setQnaCatCd(qnaCategory);

                if (StringUtils.hasText(startDate)) {
                        try {
                                condition.setStartDate(java.time.LocalDate.parse(startDate).atStartOfDay());
                        } catch (Exception e) {
                                log.warn("Failed to parse startDate: {}", startDate);
                        }
                }

                if (StringUtils.hasText(endDate)) {
                        try {
                                condition.setEndDate(java.time.LocalDate.parse(endDate).atTime(java.time.LocalTime.MAX));
                        } catch (Exception e) {
                                log.warn("Failed to parse endDate: {}", endDate);
                        }
                }

                condition.validateDates();

                return boardRepository.searchArticles(condition, required(pageable, "pageable 는 null 일 수 없습니다"))
                                .map(boardMapper::toDto);

        }

        @Transactional(readOnly = true)
        public BoardStatsResponse getBoardStats(@NonNull String bbsId) {
                long totalArticles = boardRepository.countByBbsIdAndUseYn(bbsId, "Y");
                long totalViews = boardRepository.sumInqCntByBbsIdAndUseYn(bbsId, "Y");
                String topContributor = boardRepository.findTopContributorByBbsIdAndUseYn(bbsId, "Y");

                // Logic derived from frontend: (count * 2) + 70, capped at 100
                int intelligenceScore = (int) Math.min(100, (totalArticles * 2) + 70);

                return BoardStatsResponse.builder()
                                .totalArticles(totalArticles)
                                .totalViews(totalViews)
                                .topContributor(topContributor != null ? topContributor : "System")
                                .intelligenceScore(intelligenceScore)
                                .build();
        }

        @Transactional
        public Long createPost(@NonNull String userId, @NonNull BoardSaveRequest request) {
                Timer.Sample sample = Timer.start(meterRegistry);

                try {
                        BoardMaster master = boardMasterRepository
                                        .findByIdWithPessimisticLock(request.bbsId())
                                        .orElseThrow(() -> new BusinessException(BoardErrorCode.BOARD_NOT_FOUND));

                        // 사용자 정보 조회 (실패 시 익명 처리)
                        UserDto author = null;
                        try {
                                author = userService.getUserById(required(userId, "userId 는 null 일 수 없습니다"));
                        } catch (BusinessException e) {
                                if (e.getErrorCode() == UserErrorCode.USER_NOT_FOUND) {
                                        log.warn("게시글 작성자를 찾을 수 없습니다 (ID: {}), 익명 처리합니다.", userId, e);
                                } else {
                                        log.error("게시글 작성자 조회 중 예외 발생 (ID: {})", userId, e);
                                }
                        } catch (Exception e) {
                                log.error("게시글 작성자 조회 중 예외 발생 (ID: {})", userId, e);
                        }

                        Long sortOrdr = boardRepository.findMaxSortOrdr(master.getBbsId()) + 1;

                        // 저자 식별은 인증 주체로 고정 — request.userId()/userNm() 로 저자 위조를 막는다(replyPost 와 동일).
                        String userIdToSet = userId;
                        String userNmToSet = author != null ? author.userNm() : "익명";

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
                                        .atchFileId(request.atchFileId())
                                        .qnaCatCd(request.qnaCatCd())
                                        .scrtYn(request.scrtYn())
                                        .pswd(request.pswd())
                                        .build();
                        Long pstSn = required(boardRepository.save(required(board, "board 는 null 일 수 없습니다")),
                                        "boardRepository.save() 결과는 null 일 수 없습니다")
                                        .getPstSn();

                        // 이벤트 발행 (통계 동기화 등)
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
                String atchFileId = request.atchFileId();
                if (files != null && !files.isEmpty()) {
                        atchFileId = fileService.uploadFiles(files);
                }

                BoardSaveRequest newRequest = new BoardSaveRequest(
                                request.bbsId(), request.pstTtl(), request.pstCn(),
                                request.pstBgngYmd(), request.pstEndYmd(), atchFileId,
                                request.evntDt(), request.qnaSttsCd(), request.qnaCatCd(), 
                                request.scrtYn(), request.useYn(), request.pswd());

                return createPost(userId, newRequest);
        }

        @Transactional
        public Long replyPost(@NonNull String userId, @NonNull Long parentSn, @NonNull BoardSaveRequest request) {
                BoardMaster master = boardMasterRepository
                                .findByIdWithPessimisticLock(request.bbsId())
                                .orElseThrow(() -> new BusinessException(BoardErrorCode.BOARD_NOT_FOUND));

                Board parent = boardRepository
                                .findById(parentSn)
                                .orElseThrow(() -> new BusinessException(BoardErrorCode.ARTICLE_NOT_FOUND));

                // 사용자 정보 조회 (실패 시 익명 처리)
                UserDto author = null;
                try {
                        author = userService.getUserById(required(userId, "userId 는 null 일 수 없습니다"));
                } catch (BusinessException e) {
                        if (e.getErrorCode() == UserErrorCode.USER_NOT_FOUND) {
                                log.warn("답글 작성자를 찾을 수 없습니다 (ID: {}), 익명 처리합니다.", userId, e);
                        } else {
                                log.error("답글 작성자 조회 중 예외 발생 (ID: {})", userId, e);
                        }
                } catch (Exception e) {
                        log.error("답글 작성자 조회 중 예외 발생 (ID: {})", userId, e);
                }

                Long ansSn = boardRepository.findMaxAnsSn(master.getBbsId(), parent.getSortOrdr()) + 1;

                String userIdToSet = userId;
                String userNmToSet = author != null ? author.userNm() : "익명";

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
                                .atchFileId(request.atchFileId())
                                .qnaCatCd(request.qnaCatCd())
                                .scrtYn(request.scrtYn())
                                .pswd(request.pswd())
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
                String atchFileId = request.atchFileId();
                if (files != null && !files.isEmpty()) {
                        atchFileId = fileService.uploadFiles(files);
                }

                BoardSaveRequest newRequest = new BoardSaveRequest(
                                request.bbsId(), request.pstTtl(), request.pstCn(),
                                request.pstBgngYmd(), request.pstEndYmd(), atchFileId,
                                request.evntDt(), request.qnaSttsCd(), request.qnaCatCd(), 
                                request.scrtYn(), request.useYn(), request.pswd());

                return replyPost(userId, parentSn, newRequest);
        }

        @Transactional(readOnly = true)
        public BoardDto getPostDetail(@NonNull String bbsId, @NonNull Long pstSn) {
                BoardDetailResult detail = boardRepository.findArticleDetail(pstSn)
                                .orElseThrow(() -> new BusinessException(BoardErrorCode.ARTICLE_NOT_FOUND));

                // Redis 기반 쓰기 지연 처리
                viewCountService.increaseViewCount(pstSn);

                return boardMapper.toDto(detail);
        }

        @Transactional
        public void updatePost(@NonNull String bbsId, @NonNull Long pstSn, @NonNull BoardSaveRequest request) {
                Board board = boardRepository
                                .findById(required(pstSn, "pstSn 는 null 일 수 없습니다"))
                                .orElseThrow(() -> new BusinessException(BoardErrorCode.ARTICLE_NOT_FOUND));

                // [보안] 권한 및 소유권 확인 (Board는 esntlId 축 사용 -> SecurityUtil.assertOwnerOrAdminByEsntlId 기준 비교)
                nuri.business.security.util.SecurityUtil.assertOwnerOrAdminByEsntlId(board.getUserId());

                java.time.LocalDateTime eventDate = null;
                if (StringUtils.hasText(request.evntDt())) {
                        try {
                                eventDate = java.time.LocalDateTime.parse(request.evntDt());
                        } catch (Exception e) {
                                log.warn("Failed to parse eventDate for update: {}", request.evntDt());
                        }
                }

                board.update(request.pstTtl(), request.pstCn(),
                                board.getUserId(),   // 저자(userId/userNm)는 불변 — request 로 재지정 금지(정체성 위조 방지)
                                board.getUserNm(),
                                request.pswd() != null ? request.pswd() : board.getPswd(),
                                normalizeYmd(request.pstBgngYmd()), normalizeYmd(request.pstEndYmd()),
                                request.atchFileId(), eventDate,
                                request.qnaSttsCd() != null ? request.qnaSttsCd() : board.getQnaSttsCd(),
                                request.qnaCatCd(), request.scrtYn());
        }

        @Transactional
        public void updatePostWithFiles(@NonNull String bbsId, @NonNull Long pstSn, @NonNull BoardSaveRequest request,
                        List<MultipartFile> files)
                        throws IOException {
                String atchFileId = request.atchFileId();

                if (files != null && !files.isEmpty()) {
                        if (atchFileId == null || atchFileId.isEmpty()) {
                                atchFileId = fileService.uploadFiles(files);
                        } else {
                                fileService.updateFiles(atchFileId, files);
                        }
                }

                BoardSaveRequest newRequest = new BoardSaveRequest(
                                request.bbsId(), request.pstTtl(), request.pstCn(),
                                request.pstBgngYmd(), request.pstEndYmd(), atchFileId,
                                request.evntDt(), request.qnaSttsCd(), request.qnaCatCd(), 
                                request.scrtYn(), request.useYn(), request.pswd());

                updatePost(required(bbsId, "bbsId 는 null 일 수 없습니다"), required(pstSn, "pstSn 는 null 일 수 없습니다"),
                                newRequest);
        }

        @Transactional
        public void deletePost(@NonNull String bbsId, @NonNull Long pstSn, String authorId) {
                Board board = boardRepository
                                .findById(required(pstSn, "pstSn 는 null 일 수 없습니다"))
                                .orElseThrow(() -> new BusinessException(BoardErrorCode.ARTICLE_NOT_FOUND));

                // [보안] 권한 및 소유권 확인 (Board는 esntlId 축 사용 -> SecurityUtil.assertOwnerOrAdminByEsntlId 기준 비교)
                nuri.business.security.util.SecurityUtil.assertOwnerOrAdminByEsntlId(board.getUserId());

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
                int affected = boardRepository.incrementLikeCntAtomic(id);
                if (affected == 0) {
                        throw new BusinessException(BoardErrorCode.ARTICLE_NOT_FOUND);
                }
                return boardRepository.findById(id)
                                .map(Board::getLikeCnt)
                                .orElseThrow(() -> new BusinessException(BoardErrorCode.ARTICLE_NOT_FOUND));
        }

        /**
         * 게시 시작/종료일자(YYYY-MM-DD 또는 YYYYMMDD)를 물리 컬럼 표준(YYYYMMDD, varchar(8))으로 정규화한다.
         * V2_18 스키마 동기화 — 하이픈 데이터 유입 경로 봉쇄.
         */
        private static String normalizeYmd(String ymd) {
                return ymd == null ? null : ymd.replace("-", "");
        }

        private java.time.LocalDateTime parseDateTime(String dateStr) {
                if (dateStr == null || dateStr.isEmpty()) return null;
                try {
                        if (dateStr.length() == 10) {
                                return java.time.LocalDate.parse(dateStr).atStartOfDay();
                        }
                        return java.time.LocalDateTime.parse(dateStr);
                } catch (Exception e) {
                        return null;
                }
        }
}
