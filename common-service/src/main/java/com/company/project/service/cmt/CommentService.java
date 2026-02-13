package com.company.project.service.cmt;

import com.company.project.service.cmt.dto.CommentDto;
import com.company.project.service.cmt.dto.CommentSaveRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface CommentService {
    Page<CommentDto> getComments(Long nttId, String bbsId, Pageable pageable);

    CommentDto getComment(Long id);

    Long createComment(String userId, String userNm, CommentSaveRequest request);

    void updateComment(Long id, String userId, CommentSaveRequest request);

    void deleteComment(Long id, String userId);
}
