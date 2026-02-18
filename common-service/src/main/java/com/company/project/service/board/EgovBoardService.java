package com.company.project.service.board;

import com.company.project.service.board.dto.BoardDto;
import com.company.project.service.board.dto.BoardSaveRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.lang.NonNull;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.List;

/**
 * 게시판 관리 서비스 인터페이스
 * - 전자정부프레임워크 5.0 호환성 인증 요건 충족을 위한 인터페이스 분리
 */
public interface EgovBoardService {

        Page<BoardDto> getBoardPosts(@NonNull String bbsId, @NonNull Pageable pageable);

        Page<BoardDto> getBoardPosts(@NonNull String bbsId, String searchCnd, String searchWrd,
                        @NonNull Pageable pageable);

        Long createPost(@NonNull String userId, BoardSaveRequest request);

        Long createPostWithFiles(String userId, BoardSaveRequest request, List<MultipartFile> files) throws IOException;

        Long replyPost(String userId, Long parentId, BoardSaveRequest request);

        Long replyPostWithFiles(String userId, Long parentId, BoardSaveRequest request, List<MultipartFile> files)
                        throws IOException;

        BoardDto getPostDetail(@NonNull String bbsId, @NonNull Long nttId);

        void updatePost(@NonNull String bbsId, @NonNull Long nttId, BoardSaveRequest request);

        void updatePostWithFiles(String bbsId, Long nttId, BoardSaveRequest request, List<MultipartFile> files)
                        throws IOException;

        void deletePost(@NonNull String bbsId, @NonNull Long nttId, String authorId);
}
