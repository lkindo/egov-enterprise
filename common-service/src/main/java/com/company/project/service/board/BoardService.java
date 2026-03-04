package com.company.project.service.board;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.board.Board;
import com.company.project.domain.board.BoardDetailResult;
import com.company.project.domain.board.BoardMaster;
import com.company.project.domain.board.BoardMasterRepository;
import com.company.project.domain.board.BoardRepository;
import com.company.project.domain.board.BoardSearchCondition;
import com.company.project.service.board.dto.BoardDto;
import com.company.project.service.board.dto.BoardSaveRequest;
import com.company.project.service.board.event.PostCreatedEvent;
import com.company.project.service.file.EgovFileService;
import com.company.project.service.user.EgovUserService;
import com.company.project.service.user.dto.UserDto;
import org.springframework.context.ApplicationEventPublisher;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Objects;

/**
 * JPA 기반 게시??비즈?스 로직 구현 ?래?? * - ?자?? ?? ?레?워??5.0 명세??맞춘 기능 구현
 * - EgovAbstractServiceImpl ?속 ?BoardService ?터?이??구현
 */
@Service("egovBoardService")
public class BoardService extends EgovAbstractServiceImpl implements EgovBoardService {

        private final BoardRepository boardRepository;
        private final BoardMasterRepository boardMasterRepository;
        private final EgovUserService userService;
        private final EgovFileService fileService;
        private final ApplicationEventPublisher eventPublisher;

        public BoardService(BoardRepository boardRepository,
                        BoardMasterRepository boardMasterRepository,
                        EgovUserService userService,
                        EgovFileService fileService,
                        ApplicationEventPublisher eventPublisher) {
                this.boardRepository = boardRepository;
                this.boardMasterRepository = boardMasterRepository;
                this.userService = userService;
                this.fileService = fileService;
                this.eventPublisher = eventPublisher;
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
                boardMasterRepository.findById(Objects.requireNonNull(bbsId))
                                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

                BoardSearchCondition condition = new BoardSearchCondition();
                condition.setBbsId(bbsId);
                condition.setUseAt("Y");
                condition.setSearchCnd(searchCnd);
                condition.setSearchWrd(searchWrd);

                return boardRepository.searchArticles(condition, Objects.requireNonNull(pageable)).map(BoardDto::from);
        }

        @Override
        @Transactional
        public Long createPost(@NonNull String userId, @NonNull BoardSaveRequest request) {
                BoardMaster master = boardMasterRepository.findById(Objects.requireNonNull(request.bbsId()))
                                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

                // ?비???코?이???턴 ?는 모듈??비???출 (?벤??권장)
                UserDto author = null;
                try {
                        author = userService.getUserById(Objects.requireNonNull(userId));
                } catch (Exception e) {
                        // ignore or handle
                }

                Long sortOrdr = boardRepository.findMaxSortOrdr(master.getBbsId()) + 1;

                Board board = Board.builder()
                                .bbsId(Objects.requireNonNull(master.getBbsId()))
                                .nttSj(request.nttSj())
                                .nttCn(request.nttCn())
                                .ntceBgnde(request.ntceBgnde())
                                .ntceEndde(request.ntceEndde())
                                .ntcrId(userId)
                                .ntcrNm(author != null ? author.getUserNm() : "?명")
                                .atchFileId(request.atchFileId())
                                .nttNo(1L)
                                .sortOrdr(sortOrdr)
                                .parnts(0L)
                                .replyAt("N")
                                .replyLc(0)
                                .build();

                Long nttId = Objects.requireNonNull(boardRepository.save(Objects.requireNonNull(board)))
                                .getNttId();

                // Point 22: ?벤??발행 (?계 ?기????목적)
                eventPublisher.publishEvent(new PostCreatedEvent(this, master.getBbsId(), nttId, userId));

                return nttId;
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
                BoardMaster master = boardMasterRepository.findById(Objects.requireNonNull(request.bbsId()))
                                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

                Board parent = boardRepository
                                .findById(Objects.requireNonNull(parentId))
                                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

                UserDto author = null;
                try {
                        author = userService.getUserById(Objects.requireNonNull(userId));
                } catch (Exception e) {
                        // ignore
                }

                Long nttNo = boardRepository.findMaxNttNo(master.getBbsId(), parent.getSortOrdr()) + 1;

                Board board = Board.builder()
                                .bbsId(Objects.requireNonNull(master.getBbsId()))
                                .nttSj(request.nttSj())
                                .nttCn(request.nttCn())
                                .ntceBgnde(request.ntceBgnde())
                                .ntceEndde(request.ntceEndde())
                                .ntcrId(userId)
                                .ntcrNm(author != null ? author.getUserNm() : "?명")
                                .atchFileId(request.atchFileId())
                                .parnts(parentId)
                                .nttNo(nttNo)
                                .sortOrdr(parent.getSortOrdr())
                                .replyAt("Y")
                                .replyLc(parent.getReplyLc() + 1)
                                .build();

                Long nttId = Objects.requireNonNull(boardRepository.save(Objects.requireNonNull(board)))
                                .getNttId();

                // ?벤??발행
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
                                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

                boardRepository.findById(Objects.requireNonNull(nttId)).ifPresent(Board::increaseInqireCo);

                return BoardDto.from(detail);
        }

        @Override
        @Transactional
        public void updatePost(@NonNull String bbsId, @NonNull Long nttId, @NonNull BoardSaveRequest request) {
                Board board = boardRepository
                                .findById(Objects.requireNonNull(nttId))
                                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

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

                updatePost(Objects.requireNonNull(bbsId), Objects.requireNonNull(nttId), newRequest);
        }

        @Override
        @Transactional
        public void deletePost(@NonNull String bbsId, @NonNull Long nttId, String authorId) {
                Board board = boardRepository
                                .findById(Objects.requireNonNull(nttId))
                                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

                board.delete();
        }
}
