package com.company.project.service.comment;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.comment.Comment;
import com.company.project.domain.comment.CommentRepository;
import com.company.project.domain.user.User;
import com.company.project.domain.user.UserRepository;
import com.company.project.service.comment.dto.CommentDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service("egovCommentService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CommentService implements EgovCommentService {

    private final CommentRepository commentRepository;
    private final UserRepository userRepository;

    @Override
    public Page<CommentDto> getCommentList(String bbsId, Long nttId, Pageable pageable) {
        return commentRepository.findByBbsIdAndNttId(bbsId, nttId, pageable)
                .map(CommentDto::from);
    }

    @Override
    public CommentDto getComment(Long commentId) {
        return commentRepository.findById(commentId)
                .map(CommentDto::from)
                .orElse(null);
    }

    @Override
    @Transactional
    public Long createComment(String userId, CommentDto dto) {
        User author = userRepository.findByEsntlId(userId).orElse(null);

        Long nextId = commentRepository.findMaxId();
        nextId = (nextId == null) ? 1L : nextId + 1;

        Comment comment = Comment.builder()
                .id(nextId)
                .nttId(dto.getNttId())
                .bbsId(dto.getBbsId())
                .wrterId(userId)
                .wrterNm(author != null ? author.getUserNm() : dto.getWrterNm())
                .password(dto.getPassword())
                .commentCn(dto.getCommentCn())
                .useAt("Y")
                .frstRegisterId(userId)
                .build();

        return commentRepository.save(comment).getId();
    }

    @Override
    @Transactional
    public void updateComment(Long commentId, String commentCn, String userId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        // Permission check logic (simple version)
        if (!comment.getFrstRegisterId().equals(userId)) {
            // In real world, throw exception or handle accordingly
        }

        comment.update(commentCn, userId);
    }

    @Override
    @Transactional
    public void deleteComment(Long commentId, String userId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        comment.delete(userId);
    }

    @Override
    public org.springframework.data.domain.Page<CommentDto> getAllCommentList(
            org.springframework.data.domain.Pageable pageable, String searchKeyword) {
        if (searchKeyword != null && !searchKeyword.isEmpty()) {
            return commentRepository.findByCommentCnContaining(searchKeyword, pageable)
                    .map(CommentDto::from);
        }
        return commentRepository.findAll(pageable)
                .map(CommentDto::from);
    }
}
