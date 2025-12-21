package com.company.project.service.board;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.code.Board;
import com.company.project.domain.code.BoardMaster;
import com.company.project.domain.code.BoardMasterRepository;
import com.company.project.domain.code.BoardRepository;
import com.company.project.domain.user.User;
import com.company.project.domain.user.UserRepository;
import com.company.project.service.board.dto.BoardDto;
import com.company.project.service.board.dto.BoardSaveRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class BoardService {

        private final BoardRepository boardRepository;
        private final BoardMasterRepository boardMasterRepository;
        private final UserRepository userRepository;

        @Transactional(readOnly = true)
        public Page<BoardDto> getBoardPosts(String bbsId, Pageable pageable) {
                BoardMaster master = boardMasterRepository.findById(bbsId)
                                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

                return boardRepository.findByBoardMasterAndUseAt(master, "Y", pageable)
                                .map(BoardDto::from);
        }

        @Transactional
        public Long createPost(String userId, BoardSaveRequest request) {
                BoardMaster master = boardMasterRepository.findById(request.bbsId())
                                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

                User author = userRepository.findById(userId)
                                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

                Board board = Board.builder()
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

        @Transactional
        public BoardDto getPostDetail(Long id) {
                Board board = boardRepository.findByIdOnly(id)
                                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

                board.increaseInqireCo(); // 조회수 증가
                return BoardDto.from(board);
        }

        @PreAuthorize("hasRole('ADMIN') or #authorId == authentication.name")
        @Transactional
        public void deletePost(Long id, String authorId) {
                Board board = boardRepository.findByIdOnly(id)
                                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

                // Soft delete
                // board.updateUseAt("N");
                boardRepository.delete(board);
        }
}
