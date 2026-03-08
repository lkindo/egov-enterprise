package com.company.project.service.comment;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.comment.Comment;
import com.company.project.domain.comment.CommentRepository;
import com.company.project.service.comment.dto.CommentDto;
import com.company.project.service.comment.dto.CommentSaveRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CommentServiceImpl implements CommentService {

    private final CommentRepository commentRepository;

    @Override
    public Page<CommentDto> getComments(Long nttId, String bbsId, Pageable pageable) {
        return commentRepository
                .findByBbsIdAndNttId(Objects.requireNonNull(bbsId), Objects.requireNonNull(nttId),
                        Objects.requireNonNull(pageable))
                .map(this::convertToDto);
    }

    @Override
    public CommentDto getComment(Long id) {
        return commentRepository.findById(Objects.requireNonNull(id))
                .map(this::convertToDto)
                .orElse(null);
    }

    @Override
    @Transactional
    public Long createComment(String userId, String userNm, CommentSaveRequest request) {
        Comment comment = Comment.builder()
                .nttId(request.getNttId())
                .bbsId(request.getBbsId())
                .wrterId(userId)
                .wrterNm(userNm)
                .password(request.getPassword())
                .commentCn(request.getCommentCn())
                .build();

        return Objects.requireNonNull(commentRepository.save(Objects.requireNonNull(comment)))
                .getId();
    }

    @Override
    @Transactional
    public void updateComment(Long id, String userId, CommentSaveRequest request) {
        Comment comment = commentRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        comment.update(request.getCommentCn());
    }

    @Override
    @Transactional
    public void deleteComment(Long id, String userId) {
        Comment comment = commentRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        comment.delete();
    }

    private CommentDto convertToDto(Comment entity) {
        return CommentDto.builder()
                .id(entity.getId())
                .nttId(entity.getNttId())
                .bbsId(entity.getBbsId())
                .wrterId(entity.getWrterId())
                .wrterNm(entity.getWrterNm())
                .commentCn(entity.getCommentCn())
                .useAt(entity.getUseAt())
                .createdDate(entity.getCreatedDate())
                .modifiedDate(entity.getModifiedDate())
                .build();
    }
}
