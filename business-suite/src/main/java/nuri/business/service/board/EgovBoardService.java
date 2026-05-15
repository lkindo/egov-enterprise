package nuri.business.service.board;

import nuri.business.service.board.dto.BoardDto;
import nuri.business.service.board.dto.BoardSaveRequest;
import nuri.business.service.board.dto.BoardStatsResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.lang.NonNull;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.List;

/**
 * 게시판 서비스 인터페이스
 * - 전자정부 표준프레임워크 5.0 호환성 인증 요건을 충족하기 위한 인터페이스 정의 (v5 standardized)
 */
public interface EgovBoardService {

        Page<BoardDto> getBoardPosts(@NonNull String bbsId, @NonNull Pageable pageable);

        Page<BoardDto> getBoardPosts(@NonNull String bbsId, String searchCnd, String searchWrd,
                        @NonNull Pageable pageable);

        Page<BoardDto> getBoardPosts(@NonNull String bbsId, String searchCnd, String searchWrd,
                        String orderBy, String startDate, String endDate, String qnaStatus, String qnaCategory,
                        @NonNull Pageable pageable);

        BoardStatsResponse getBoardStats(@NonNull String bbsId);

        Long createPost(@NonNull String userId, @NonNull BoardSaveRequest request);

        Long createPostWithFiles(@NonNull String userId, @NonNull BoardSaveRequest request, List<MultipartFile> files)
                        throws IOException;

        Long replyPost(@NonNull String userId, @NonNull Long parentId, @NonNull BoardSaveRequest request);

        Long replyPostWithFiles(@NonNull String userId, @NonNull Long parentId, @NonNull BoardSaveRequest request,
                        List<MultipartFile> files)
                        throws IOException;

        BoardDto getPostDetail(@NonNull String bbsId, @NonNull Long pstId);

        void updatePost(@NonNull String bbsId, @NonNull Long pstId, @NonNull BoardSaveRequest request);

        void updatePostWithFiles(@NonNull String bbsId, @NonNull Long pstId, @NonNull BoardSaveRequest request,
                        List<MultipartFile> files)
                        throws IOException;

        void deletePost(@NonNull String bbsId, @NonNull Long pstId, String authorId);

        Integer incrementLike(@NonNull String bbsId, @NonNull Long pstId);
}
