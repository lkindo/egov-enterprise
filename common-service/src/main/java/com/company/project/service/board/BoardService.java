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
                return getBoardPosts(bbsId, "", "", pageable);
        }

        /**
         * 게시물 검색 페이징 목록 조회
         */
        @Override
        @Transactional(readOnly = true)
        public Page<BoardDto> getBoardPosts(String bbsId, String searchCnd, String searchWrd, Pageable pageable) {
                BoardMaster master = boardMasterRepository.findById(bbsId)
                                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

                Page<Board> result;
                if (searchWrd == null || searchWrd.isEmpty()) {
                        result = boardRepository.findByBoardMasterAndUseAtOrderBySortOrdrDescNttNoAsc(master, "Y",
                                        pageable);
                } else if ("0".equals(searchCnd)) { // 제목
                        result = boardRepository.findByBoardMasterAndUseAtAndNttSjContainingOrderBySortOrdrDescNttNoAsc(
                                        master, "Y", searchWrd, pageable);
                } else if ("1".equals(searchCnd)) { // 내용
                        result = boardRepository.findByBoardMasterAndUseAtAndNttCnContainingOrderBySortOrdrDescNttNoAsc(
                                        master, "Y", searchWrd, pageable);
                } else if ("2".equals(searchCnd)) { // 작성자
                        result = boardRepository
                                        .findByBoardMasterAndUseAtAndAuthorUserNmContainingOrderBySortOrdrDescNttNoAsc(
                                                        master, "Y", searchWrd, pageable);
                } else {
                        result = boardRepository.findByBoardMasterAndUseAtOrderBySortOrdrDescNttNoAsc(master, "Y",
                                        pageable);
                }

                return result.map(BoardDto::from);
        }

        /**
         * 게시물 등록
         */
        @Override
        @Transactional
        public Long createPost(String userId, BoardSaveRequest request) {
                BoardMaster master = boardMasterRepository.findById(request.bbsId())
                                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

                User author = userRepository.findByEsntlId(userId)
                                .orElse(null);

                Long nttId = boardRepository.getNextNttId();
                Long sortOrdr = boardRepository.getMaxSortOrdr(master);

                Board board = Board.builder()
                                .id(nttId)
                                .boardMaster(master)
                                .nttSj(request.nttSj())
                                .nttCn(request.nttCn())
                                .ntceBgnde(request.ntceBgnde())
                                .ntceEndde(request.ntceEndde())
                                .author(author)
                                .ntcrNm(author != null ? author.getUserNm() : "익명")
                                .atchFileId(request.atchFileId())
                                .nttNo(1L)
                                .sortOrdr(sortOrdr)
                                .parnts("0")
                                .replyAt("N")
                                .replyLc(0)
                                .build();

                return boardRepository.save(board).getId();
        }

        /**
         * 답변 등록
         */
        @Override
        @Transactional
        public Long replyPost(String userId, Long parentId, BoardSaveRequest request) {
                BoardMaster master = boardMasterRepository.findById(request.bbsId())
                                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

                Board parent = boardRepository.findByNttId(parentId)
                                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

                User author = userRepository.findByEsntlId(userId)
                                .orElse(null);

                Long nttId = boardRepository.getNextNttId();
                Long nttNo = boardRepository.getMaxNttNo(master, parent.getSortOrdr());

                Board board = Board.builder()
                                .id(nttId)
                                .boardMaster(master)
                                .nttSj(request.nttSj())
                                .nttCn(request.nttCn())
                                .ntceBgnde(request.ntceBgnde())
                                .ntceEndde(request.ntceEndde())
                                .author(author)
                                .ntcrNm(author != null ? author.getUserNm() : "익명")
                                .atchFileId(request.atchFileId())
                                .parnts(parentId.toString())
                                .nttNo(nttNo)
                                .sortOrdr(parent.getSortOrdr())
                                .replyAt("Y")
                                .replyLc(parent.getReplyLc() + 1)
                                .build();

                return boardRepository.save(board).getId();
        }

        /**
         * 게시물 상세 조회
         */
        @Override
        @Transactional
        public BoardDto getPostDetail(Long id) {
                Board board = boardRepository.findByNttId(id)
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
                Board board = boardRepository.findByNttId(id)
                                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

                board.update(request.nttSj(), request.nttCn(), request.ntceBgnde(), request.ntceEndde(),
                                request.atchFileId());
        }

        /**
         * 게시물 삭제
         */
        @Override
        @Transactional
        public void deletePost(Long id, String authorId) {
                Board board = boardRepository.findByNttId(id)
                                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

                if (board != null) {
                        board.delete(); // Soft delete
                }
        }
}
