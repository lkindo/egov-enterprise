package com.company.project.service.board;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.board.Board;
import com.company.project.domain.board.BoardMaster;
import com.company.project.domain.board.BoardMasterRepository;
import com.company.project.domain.board.BoardRepository;
import com.company.project.domain.user.User;
import com.company.project.domain.user.UserRepository;
import com.company.project.service.board.dto.BoardDto;
import com.company.project.service.board.dto.BoardSaveRequest;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * JPA 기반 게시판 서비스 구현체
 * - 전자정부프레임워크 5.0 호환성 인증 요건 충족
 * - EgovAbstractServiceImpl 상속 및 EgovBoardService 인터페이스 구현
 */
@Service("egovBoardService")
public class BoardService extends EgovAbstractServiceImpl implements EgovBoardService {

        private final BoardRepository boardRepository;
        private final BoardMasterRepository boardMasterRepository;
        private final UserRepository userRepository;

        public BoardService(BoardRepository boardRepository,
                        BoardMasterRepository boardMasterRepository,
                        UserRepository userRepository) {
                this.boardRepository = boardRepository;
                this.boardMasterRepository = boardMasterRepository;
                this.userRepository = userRepository;
        }

        /**
         * 게시물 페이징 목록 조회
         */
        @Override
        @Transactional(readOnly = true)
        public Page<BoardDto> getBoardPosts(String bbsId, Pageable pageable) {
                BoardMaster master = boardMasterRepository.findById(bbsId)
                                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

                return boardRepository.findByBoardMasterAndUseAt(master, "Y", pageable)
                                .map(BoardDto::from);
        }

        /**
         * 게시물 등록
         */
        @Override
        @Transactional
        public Long createPost(String userId, BoardSaveRequest request) {
                BoardMaster master = boardMasterRepository.findById(request.bbsId())
                                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

                User author = userRepository.findById(userId)
                                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

                Board board = Board.builder()
                                .id(generateNextNttId())
                                .boardMaster(master)
                                .nttSj(request.nttSj())
                                .nttCn(request.nttCn())
                                .ntceBgnde(request.ntceBgnde())
                                .ntceEndde(request.ntceEndde())
                                .author(author)
                                .atchFileId(request.atchFileId())
                                .build();

                return boardRepository.save(board).getId();
        }

        /**
         * 게시물 상세 조회
         */
        @Override
        @Transactional
        public BoardDto getPostDetail(Long id) {
                Board board = boardRepository.findByIdOnly(id)
                                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

                board.increaseInqireCo(); // 조회수 증가
                return BoardDto.from(board);
        }

        /**
         * 게시물 수정
         */
        @Override
        @Transactional
        public void updatePost(Long id, BoardSaveRequest request) {
                Board board = boardRepository.findByIdOnly(id)
                                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

                board.update(request.nttSj(), request.nttCn(), request.ntceBgnde(), request.ntceEndde(),
                                request.atchFileId());
        }

        /**
         * 게시물 삭제
         */
        @Override
        @PreAuthorize("hasRole('ADMIN') or #authorId == authentication.name")
        @Transactional
        public void deletePost(Long id, String authorId) {
                Board board = boardRepository.findByIdOnly(id)
                                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

                boardRepository.delete(board);
        }

        private Long generateNextNttId() {
                return System.currentTimeMillis();
        }
}
