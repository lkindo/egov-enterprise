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
 * 寃뚯떆??愿由??쒕퉬???명꽣?섏씠??
 * - ?꾩옄?뺣??꾨젅?꾩썙??5.0 ?명솚???몄쬆 ?붽굔 異⑹”???꾪븳 ?명꽣?섏씠??遺꾨━
 */
public interface EgovBoardService {

        Page<BoardDto> getBoardPosts(@NonNull String bbsId, @NonNull Pageable pageable);

        Page<BoardDto> getBoardPosts(@NonNull String bbsId, String searchCnd, String searchWrd,
                        @NonNull Pageable pageable);

        Long createPost(@NonNull String userId, @NonNull BoardSaveRequest request);

        Long createPostWithFiles(@NonNull String userId, @NonNull BoardSaveRequest request, List<MultipartFile> files)
                        throws IOException;

        Long replyPost(@NonNull String userId, @NonNull Long parentId, @NonNull BoardSaveRequest request);

        Long replyPostWithFiles(@NonNull String userId, @NonNull Long parentId, @NonNull BoardSaveRequest request,
                        List<MultipartFile> files)
                        throws IOException;

        BoardDto getPostDetail(@NonNull String bbsId, @NonNull Long nttId);

        void updatePost(@NonNull String bbsId, @NonNull Long nttId, @NonNull BoardSaveRequest request);

        void updatePostWithFiles(@NonNull String bbsId, @NonNull Long nttId, @NonNull BoardSaveRequest request,
                        List<MultipartFile> files)
                        throws IOException;

        void deletePost(@NonNull String bbsId, @NonNull Long nttId, String authorId);
}
