package nuri.business.service.board;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.foundation.core.service.BaseAbstractService;
import nuri.business.domain.board.Board;
import nuri.business.domain.board.BoardDetailResult;
import nuri.business.domain.board.BoardMaster;
import nuri.business.domain.board.BoardMasterRepository;
import nuri.business.domain.board.BoardRepository;
import nuri.business.domain.board.BoardSearchCondition;
import nuri.business.service.board.dto.BoardDto;
import nuri.business.service.board.dto.BoardSaveRequest;
import nuri.business.service.board.event.PostCreatedEvent;
import nuri.business.service.file.EgovFileService;
import nuri.foundation.service.user.EgovUserService;
import nuri.foundation.service.user.dto.UserDto;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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

        public BoardService(BoardRepository boardRepository,
                        BoardMasterRepository boardMasterRepository,
                        EgovUserService userService,
                        EgovFileService fileService,
                        ApplicationEventPublisher eventPublisher,
                        MeterRegistry meterRegistry) {
                this.boardRepository = required(boardRepository, "boardRepository 는 null 일 수 없습니다");
                this.boardMasterRepository = required(boardMasterRepository, "boardMasterRepository 는 null 일 수 없습니다");
                this.userService = required(userService, "userService 는 null 일 수 없습니다");
                this.fileService = required(fileService, "fileService 는 null 일 수 없습니다");
                this.eventPublisher = required(eventPublisher, "eventPublisher 는 null 일 수 없습니다");
                this.meterRegistry = required(meterRegistry, "meterRegistry 는 null 일 수 없습니다");
        }

        @Override
        @Transactional(readOnly = true)
        public Page<BoardDto> getBoardPosts(@NonNull String bbsId, @NonNull Pageable pageable) {
                return getBoardPosts(bbsId, "", "", pageable);
        }

        @Override
        @Transactional(readOnly = true)
        public Page<BoardDto> getBoardPosts(@NonNull String bbsId, String searchCnd, String searchWrd,
                        @NonNull Pageable pageable) {
                boardMasterRepository.findById(required(bbsId, "bbsId 는 null 일 수 없습니다"))
                                .orElseThrow(() -> new BusinessException(ErrorCode.BOARD_NOT_FOUND));

                BoardSearchCondition condition = new BoardSearchCondition();
                condition.setBbsId(bbsId);
                condition.setUseAt("Y");
                condition.setSearchCnd(searchCnd);
                condition.setSearchWrd(searchWrd);

                return boardRepository.searchArticles(condition, required(pageable, "pageable 는 null 일 수 없습니다"))
                                .map(BoardDto::from);
        }

        @Override
        @Transactional
        public Long createPost(@NonNull String userId, @NonNull BoardSaveRequest request) {
                Timer.Sample sample = Timer.start(meterRegistry);

                try {
                        BoardMaster master = boardMasterRepository
                                        .findById(required(request.bbsId(), "request.bbsId() 는 null 일 수 없습니다"))
                                        .orElseThrow(() -> new BusinessException(ErrorCode.BOARD_NOT_FOUND));

                        // 사용자 정보 조회 (실패 시 익명 처리)
                        UserDto author = null;
                        try {
                                author = userService.getUserById(required(userId, "userId 는 null 일 수 없습니다"));
                        } catch (BusinessException e) {
                                if (e.getErrorCode() == ErrorCode.USER_NOT_FOUND) {
                                        log.warn("게시글 작성자를 찾을 수 없습니다 (ID: {}), 익명 처리합니다.", userId, e);
                                } else {
                                        log.error("게시글 작성자 조회 중 예외 발생 (ID: {})", userId, e);
                                }
                        } catch (Exception e) {
                                log.error("게시글 작성자 조회 중 예외 발생 (ID: {})", userId, e);
                        }

                        Long sortOrdr = boardRepository.findMaxSortOrdr(master.getBbsId()) + 1;

                        Board board = Board.builder()
                                        .bbsId(required(master.getBbsId(), "master.getBbsId() 는 null 일 수 없습니다"))
                                        .nttSj(request.nttSj())
                                        .nttCn(request.nttCn())
                                        .ntceBgnde(request.ntceBgnde())
                                        .ntceEndde(request.ntceEndde())
                                        .ntcrId(userId)
                                        .ntcrNm(author != null ? author.getUserNm() : "익명")
                                        .atchFileId(request.atchFileId())
                                        .nttNo(1L)
                                        .sortOrdr(sortOrdr)
                                        .parnts(0L)
                                        .replyAt("N")
                                        .replyLc(0)
                                        .build();

                        Long nttId = required(boardRepository.save(required(board, "board 는 null 일 수 없습니다")),
                                        "boardRepository.save() 결과는 null 일 수 없습니다")
                                        .getNttId();

                        // 이벤트 발행 (통계 동기화 등)
                        eventPublisher.publishEvent(new PostCreatedEvent(this, master.getBbsId(), nttId, userId));

                        return nttId;
                } finally {
                        sample.stop(meterRegistry.timer("egov.board.create.post", "bbsId", request.bbsId()));
                }
        }

        @Override
        @Transactional
        public Long createPostWithFiles(@NonNull String userId, @NonNull BoardSaveRequest request,
                        List<MultipartFile> files)
                        throws IOException {
                String atchFileId = request.atchFileId();
                if (files != null && !files.isEmpty()) {
                        atchFileId = fileService.uploadFiles(files);
                }

                BoardSaveRequest newRequest = new BoardSaveRequest(
                                request.bbsId(), request.nttSj(), request.nttCn(),
                                request.ntceBgnde(), request.ntceEndde(), atchFileId);

                return createPost(userId, newRequest);
        }

        @Override
        @Transactional
        public Long replyPost(@NonNull String userId, @NonNull Long parentId, @NonNull BoardSaveRequest request) {
                BoardMaster master = boardMasterRepository
                                .findById(required(request.bbsId(), "request.bbsId() 는 null 일 수 없습니다"))
                                .orElseThrow(() -> new BusinessException(ErrorCode.BOARD_NOT_FOUND));

                Board parent = boardRepository
                                .findById(required(parentId, "parentId 는 null 일 수 없습니다"))
                                .orElseThrow(() -> new BusinessException(ErrorCode.ARTICLE_NOT_FOUND));

                // 사용자 정보 조회 (실패 시 익명 처리)
                UserDto author = null;
                try {
                        author = userService.getUserById(required(userId, "userId 는 null 일 수 없습니다"));
                } catch (BusinessException e) {
                        if (e.getErrorCode() == ErrorCode.USER_NOT_FOUND) {
                                log.warn("답글 작성자를 찾을 수 없습니다 (ID: {}), 익명 처리합니다.", userId, e);
                        } else {
                                log.error("답글 작성자 조회 중 예외 발생 (ID: {})", userId, e);
                        }
                } catch (Exception e) {
                        log.error("답글 작성자 조회 중 예외 발생 (ID: {})", userId, e);
                }

                Long nttNo = boardRepository.findMaxNttNo(master.getBbsId(), parent.getSortOrdr()) + 1;

                Board board = Board.builder()
                                .bbsId(required(master.getBbsId(), "master.getBbsId() 는 null 일 수 없습니다"))
                                .nttSj(request.nttSj())
                                .nttCn(request.nttCn())
                                .ntceBgnde(request.ntceBgnde())
                                .ntceEndde(request.ntceEndde())
                                .ntcrId(userId)
                                .ntcrNm(author != null ? author.getUserNm() : "익명")
                                .atchFileId(request.atchFileId())
                                .parnts(parentId)
                                .nttNo(nttNo)
                                .sortOrdr(parent.getSortOrdr())
                                .replyAt("Y")
                                .replyLc(parent.getReplyLc() + 1)
                                .build();

                Long nttId = required(boardRepository.save(required(board, "board 는 null 일 수 없습니다")),
                                "boardRepository.save() 결과는 null 일 수 없습니다")
                                .getNttId();

                eventPublisher.publishEvent(new PostCreatedEvent(this, master.getBbsId(), nttId, userId));

                return nttId;
        }

        @Override
        @Transactional
        public Long replyPostWithFiles(@NonNull String userId, @NonNull Long parentId,
                        @NonNull BoardSaveRequest request,
                        List<MultipartFile> files) throws IOException {
                String atchFileId = request.atchFileId();
                if (files != null && !files.isEmpty()) {
                        atchFileId = fileService.uploadFiles(files);
                }

                BoardSaveRequest newRequest = new BoardSaveRequest(
                                request.bbsId(), request.nttSj(), request.nttCn(),
                                request.ntceBgnde(), request.ntceEndde(), atchFileId);

                return replyPost(userId, parentId, newRequest);
        }

        @Override
        @Transactional
        public BoardDto getPostDetail(@NonNull String bbsId, @NonNull Long nttId) {
                BoardDetailResult detail = boardRepository.findArticleDetail(nttId)
                                .orElseThrow(() -> new BusinessException(ErrorCode.ARTICLE_NOT_FOUND));

                boardRepository.findById(required(nttId, "nttId 는 null 일 수 없습니다")).ifPresent(Board::increaseInqireCo);

                return BoardDto.from(detail);
        }

        @Override
        @Transactional
        public void updatePost(@NonNull String bbsId, @NonNull Long nttId, @NonNull BoardSaveRequest request) {
                Board board = boardRepository
                                .findById(required(nttId, "nttId 는 null 일 수 없습니다"))
                                .orElseThrow(() -> new BusinessException(ErrorCode.ARTICLE_NOT_FOUND));

                board.update(request.nttSj(), request.nttCn(), board.getNtcrId(), board.getNtcrNm(),
                                board.getPassword(), request.ntceBgnde(), request.ntceEndde(),
                                request.atchFileId());
        }

        @Override
        @Transactional
        public void updatePostWithFiles(@NonNull String bbsId, @NonNull Long nttId, @NonNull BoardSaveRequest request,
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
                                request.bbsId(), request.nttSj(), request.nttCn(),
                                request.ntceBgnde(), request.ntceEndde(), atchFileId);

                updatePost(required(bbsId, "bbsId 는 null 일 수 없습니다"), required(nttId, "nttId 는 null 일 수 없습니다"),
                                newRequest);
        }

        @Override
        @Transactional
        public void deletePost(@NonNull String bbsId, @NonNull Long nttId, String authorId) {
                Board board = boardRepository
                                .findById(required(nttId, "nttId 는 null 일 수 없습니다"))
                                .orElseThrow(() -> new BusinessException(ErrorCode.ARTICLE_NOT_FOUND));

                board.delete();
        }
}
