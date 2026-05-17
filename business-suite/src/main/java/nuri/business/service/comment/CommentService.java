package nuri.business.service.comment;

import nuri.business.service.comment.dto.CommentDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface CommentService {
    Page<CommentDto> getComments(String pstId, String bbsId, Pageable pageable);

    Long createComment(CommentDto commentDto);

    void updateComment(Long commentNo, String content);

    void deleteComment(Long commentNo);
}
