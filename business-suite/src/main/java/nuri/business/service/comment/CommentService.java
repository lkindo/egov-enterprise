package nuri.business.service.comment;

import nuri.business.service.comment.dto.CommentDto;
import nuri.business.service.comment.dto.CommentSaveRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface CommentService {
    Page<CommentDto> getComments(Long pstId, String bbsId, Pageable pageable);

    Page<CommentDto> getAllComments(Pageable pageable);

    Page<CommentDto> searchComments(String keyword, Pageable pageable);

    CommentDto getComment(Long id);

    Long createComment(String userId, String userNm, CommentSaveRequest request);

    void updateComment(Long id, String userId, CommentSaveRequest request);

    void deleteComment(Long id, String userId);
}
