package com.company.project.service.board;

import com.company.project.service.board.dto.BoardDto;
import com.company.project.service.board.dto.BoardSaveRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * 게시판 관리 서비스 인터페이스
 * - 전자정부프레임워크 5.0 호환성 인증 요건 충족을 위한 인터페이스 분리
 */
public interface EgovBoardService {

    /**
     * 게시물 페이징 목록 조회
     */
    Page<BoardDto> getBoardPosts(String bbsId, Pageable pageable);

    /**
     * 게시물 등록
     */
    Long createPost(String userId, BoardSaveRequest request);

    /**
     * 게시물 상세 조회
     */
    BoardDto getPostDetail(Long id);

    /**
     * 게시물 수정
     */
    void updatePost(Long id, BoardSaveRequest request);

    /**
     * 게시물 삭제
     */
    void deletePost(Long id, String authorId);
}
