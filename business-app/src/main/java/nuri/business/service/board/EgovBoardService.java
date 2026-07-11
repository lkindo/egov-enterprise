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
 * 게시판 비즈니스 로직 인터페이스
 */
public interface EgovBoardService {

        Page<BoardDto> getBoardPosts(@NonNull String bbsId, @NonNull Pageable pageable);

        Page<BoardDto> getBoardPosts(@NonNull String bbsId, String searchCnd, String searchWrd, @NonNull Pageable pageable);

        Page<BoardDto> getBoardPosts(@NonNull String bbsId, String searchCnd, String searchWrd,
                        String orderBy, String startDate, String endDate, String qnaStatus, String qnaCategory,
                        @NonNull Pageable pageable);

        BoardStatsResponse getBoardStats(@NonNull String bbsId);

        String createPost(@NonNull String userId, @NonNull BoardSaveRequest request);

        String createPostWithFiles(@NonNull String userId, @NonNull BoardSaveRequest request, List<MultipartFile> files)
                        throws IOException;

        String replyPost(@NonNull String userId, @NonNull String parentId, @NonNull BoardSaveRequest request);

        String replyPostWithFiles(@NonNull String userId, @NonNull String parentId, @NonNull BoardSaveRequest request,
                        List<MultipartFile> files) throws IOException;

        BoardDto getPostDetail(@NonNull String bbsId, @NonNull String pstId);

        void updatePost(@NonNull String bbsId, @NonNull String pstId, @NonNull BoardSaveRequest request);

        void updatePostWithFiles(@NonNull String bbsId, @NonNull String pstId, @NonNull BoardSaveRequest request,
                        List<MultipartFile> files) throws IOException;

        void deletePost(@NonNull String bbsId, @NonNull String pstId, String authorId);

        Integer incrementLike(@NonNull String bbsId, @NonNull String pstId);
}
