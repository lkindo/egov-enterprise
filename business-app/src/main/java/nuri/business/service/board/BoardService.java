package nuri.business.service.board;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.business.domain.user.exception.UserErrorCode;
import nuri.business.domain.board.exception.BoardErrorCode;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
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
import nuri.business.service.file.EgovFileService;
import nuri.business.service.user.EgovUserService;
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
 * JPA 기반 게시판 비즈니스 로직 구현 클래스
 * - 전자정부 표준프레임워크 5.0 명세에 맞춘 기능 구현
 * - EgovAbstractServiceImpl 상속 및 BoardService 인터페이스 구현
 */
@Slf4j
@Service("egovBoardService")
public class BoardService extends BaseAbstractService implements EgovBoardService {

        private final BoardRepository boardRepository;
        private final BoardMasterRepository boardMasterRepository;
        private final EgovUserService userService;
        private final EgovFileService fileService;
        private final ApplicationEventPublisher eventPublisher;
        private final MeterRegistry meterRegistry;
        private final BoardViewCountService viewCountService;
        private final BoardMapper boardMapper;

        public BoardService(BoardRepository boardRepository,
                        BoardMasterRepository boardMasterRepository,
                        EgovUserService userService,
                        EgovFileService fileService,
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


        @Override
        @Transactional(readOnly = true)
        public Page<BoardDto> getBoardPosts(@NonNull String bbsId, @NonNull Pageable pageable) {
                return getBoardPosts(bbsId, "0", "", null, null, null, null, null, pageable);
        }

        @Override
        @Transactional(readOnly = true)
        public Page<BoardDto> getBoardPosts(@NonNull String bbsId, String searchCnd, String searchWrd,
                        @NonNull Pageable pageable) {
                return getBoardPosts(bbsId, searchCnd, searchWrd, null, null, null, null, null, pageable);
        }

        @Override
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

        @Override
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

        @Override
        @Transactional
        public String createPost(@NonNull String userId, @NonNull BoardSaveRequest request) {
                Timer.Sample sample = Timer.start(meterRegistry);

                try {
                        BoardMaster master = boardMasterRepository
                                        .findById(request.bbsId())
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

                        String userIdToSet = request.userId() != null ? request.userId() : userId;
                        String userNmToSet = request.userNm() != null ? request.userNm() : (author != null ? author.userNm() : "익명");

                        // DB 시퀀스를 사용하여 유니크한 ID 생성
                        String pstIdToSet = String.valueOf(boardRepository.getNextPstId());

                        Board board = Board.builder()
                                        .bbsId(master.getBbsId())
                                        .ansSn(1L)
                                        .upPstId("0")
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
                                        .pstBgngYmd(request.pstBgngYmd())
                                        .pstEndYmd(request.pstEndYmd())
                                        .atchFileId(request.atchFileId())
                                        .qnaCatCd(request.qnaCatCd())
                                        .scrtYn(request.scrtYn())
                                        .pswd(request.pswd())
                                        .build();
                        board.changePstId(pstIdToSet);

                        String pstId = required(boardRepository.save(required(board, "board 는 null 일 수 없습니다")),
                                        "boardRepository.save() 결과는 null 일 수 없습니다")
                                        .getPstId();

                        // 이벤트 발행 (통계 동기화 등)
                        eventPublisher.publishEvent(new PostCreatedEvent(this, master.getBbsId(), pstId, userId));

                        return pstId;
                } finally {
                        sample.stop(meterRegistry.timer("egov.board.create.post", "bbsId", request.bbsId()));
                }
        }

        @Override
        @Transactional
        public String createPostWithFiles(@NonNull String userId, @NonNull BoardSaveRequest request,
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
                                request.scrtYn(), request.useYn(), request.userId(), request.userNm(), request.pswd());

                return createPost(userId, newRequest);
        }

        @Override
        @Transactional
        public String replyPost(@NonNull String userId, @NonNull String parentId, @NonNull BoardSaveRequest request) {
                BoardMaster master = boardMasterRepository
                                .findById(request.bbsId())
                                .orElseThrow(() -> new BusinessException(BoardErrorCode.BOARD_NOT_FOUND));

                Board parent = boardRepository
                                .findById(parentId)
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
                                .upPstId(parentId)
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
                                .pstBgngYmd(request.pstBgngYmd())
                                .pstEndYmd(request.pstEndYmd())
                                .atchFileId(request.atchFileId())
                                .qnaCatCd(request.qnaCatCd())
                                .scrtYn(request.scrtYn())
                                .pswd(request.pswd())
                                .build();
                
                // ID 생성 — createPost 와 동일하게 DB 시퀀스 사용(System.currentTimeMillis()는 동시 답글 시 ms 충돌로 PK 중복 위험).
                board.changePstId(String.valueOf(boardRepository.getNextPstId()));

                String pstId = required(boardRepository.save(required(board, "board 는 null 일 수 없습니다")),
                                "boardRepository.save() 결과는 null 일 수 없습니다")
                                .getPstId();

                eventPublisher.publishEvent(new PostCreatedEvent(this, master.getBbsId(), pstId, userId));

                return pstId;
        }

        @Override
        @Transactional
        public String replyPostWithFiles(@NonNull String userId, @NonNull String parentId,
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
                                request.scrtYn(), request.useYn(), request.userId(), request.userNm(), request.pswd());

                return replyPost(userId, parentId, newRequest);
        }

        @Override
        @Transactional(readOnly = true)
        public BoardDto getPostDetail(@NonNull String bbsId, @NonNull String pstId) {
                BoardDetailResult detail = boardRepository.findArticleDetail(pstId)
                                .orElseThrow(() -> new BusinessException(BoardErrorCode.ARTICLE_NOT_FOUND));

                // Redis 기반 쓰기 지연 처리
                viewCountService.increaseViewCount(pstId);

                return boardMapper.toDto(detail);
        }

        @Override
        @Transactional
        public void updatePost(@NonNull String bbsId, @NonNull String pstId, @NonNull BoardSaveRequest request) {
                Board board = boardRepository
                                .findById(required(pstId, "pstId 는 null 일 수 없습니다"))
                                .orElseThrow(() -> new BusinessException(BoardErrorCode.ARTICLE_NOT_FOUND));

                // [보안] 권한 확인 (작성자 본인 또는 관리자)
                String currentUserId = nuri.business.security.util.SecurityUtil.getCurrentUserId()
                                .orElseThrow(() -> new BusinessException(CommonErrorCode.UNAUTHORIZED));
                boolean isAdmin = nuri.business.security.util.SecurityUtil.hasRole(nuri.business.security.AuthorityConstants.ROLE_ADMIN);

                if (!isAdmin && !currentUserId.equals(board.getUserId())) {
                        throw new BusinessException(CommonErrorCode.ACCESS_DENIED);
                }

                java.time.LocalDateTime eventDate = null;
                if (StringUtils.hasText(request.evntDt())) {
                        try {
                                eventDate = java.time.LocalDateTime.parse(request.evntDt());
                        } catch (Exception e) {
                                log.warn("Failed to parse eventDate for update: {}", request.evntDt());
                        }
                }

                board.update(request.pstTtl(), request.pstCn(), 
                                request.userId() != null ? request.userId() : board.getUserId(), 
                                request.userNm() != null ? request.userNm() : board.getUserNm(),
                                request.pswd() != null ? request.pswd() : board.getPswd(), 
                                request.pstBgngYmd(), request.pstEndYmd(),
                                request.atchFileId(), eventDate,
                                request.qnaSttsCd() != null ? request.qnaSttsCd() : board.getQnaSttsCd(),
                                request.qnaCatCd(), request.scrtYn());
        }

        @Override
        @Transactional
        public void updatePostWithFiles(@NonNull String bbsId, @NonNull String pstId, @NonNull BoardSaveRequest request,
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
                                request.scrtYn(), request.useYn(), request.userId(), request.userNm(), request.pswd());

                updatePost(required(bbsId, "bbsId 는 null 일 수 없습니다"), required(pstId, "pstId 는 null 일 수 없습니다"),
                                newRequest);
        }

        @Override
        @Transactional
        public void deletePost(@NonNull String bbsId, @NonNull String pstId, String authorId) {
                Board board = boardRepository
                                .findById(required(pstId, "pstId 는 null 일 수 없습니다"))
                                .orElseThrow(() -> new BusinessException(BoardErrorCode.ARTICLE_NOT_FOUND));

                // [보안] 권한 확인 (작성자 본인 또는 관리자)
                String currentUserId = nuri.business.security.util.SecurityUtil.getCurrentUserId()
                                .orElseThrow(() -> new BusinessException(CommonErrorCode.UNAUTHORIZED));
                boolean isAdmin = nuri.business.security.util.SecurityUtil.hasRole(nuri.business.security.AuthorityConstants.ROLE_ADMIN);

                if (!isAdmin && !currentUserId.equals(board.getUserId())) {
                        throw new BusinessException(CommonErrorCode.ACCESS_DENIED);
                }

                board.delete();
        }

        @Override
        @Transactional
        public Integer incrementLike(@NonNull String bbsId, @NonNull String pstId) {
                Board board = boardRepository
                                .findByPstIdWithPessimisticLock(required(pstId, "pstId 는 null 일 수 없습니다"))
                                .orElseThrow(() -> new BusinessException(BoardErrorCode.ARTICLE_NOT_FOUND));

                board.increaseLikeCnt();
                return board.getLikeCnt();
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
