package com.company.project.service.comment;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import com.company.project.service.comment.dto.CommentDto;

public interface EgovCommentService {
    Page<CommentDto> getCommentList(String bbsId, Long nttId, Pageable pageable);

    CommentDto getComment(Long commentId);

    Long createComment(String userId, CommentDto commentDto);

    void updateComment(Long commentId, String commentCn, String userId);

    void deleteComment(Long commentId, String userId);

    org.springframework.data.domain.Page<CommentDto> getAllCommentList(
            org.springframework.data.domain.Pageable pageable, String searchKeyword);
}
