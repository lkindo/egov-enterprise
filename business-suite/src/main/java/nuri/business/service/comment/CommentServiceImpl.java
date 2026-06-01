package nuri.business.service.comment;

import nuri.business.domain.comment.Comment;
import nuri.business.domain.comment.CommentRepository;
import nuri.business.service.comment.dto.CommentDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CommentServiceImpl implements CommentService {

    private final CommentRepository commentRepository;

    @Override
    @Transactional(readOnly = true)
    public Page<CommentDto> getComments(String pstId, String bbsId, Pageable pageable) {
        return commentRepository.findByBbsIdAndPstId(bbsId, pstId, pageable)
                .map(this::toDto);
    }

    @Override
    @Transactional
    public Long createComment(CommentDto commentDto) {
        Comment comment = Comment.builder()
                .pstId(commentDto.getPstId())
                .bbsId(commentDto.getBbsId())
                .wrterId(commentDto.getWrterId())
                .wrterNm(commentDto.getWrterNm())
                .pswd(commentDto.getPassword())
                .ansCn(commentDto.getAnsCn())
                .useYn("Y")
                .build();

        return commentRepository.save(comment).getAnsSn();
    }

    @Override
    @Transactional
    public void updateComment(Long commentNo, String content) {
        Comment comment = commentRepository.findById(commentNo)
                .orElseThrow(() -> new BusinessException(ErrorCode.COMMENT_NOT_FOUND));
        comment.update(content);
    }

    @Override
    @Transactional
    public void deleteComment(Long commentNo) {
        Comment comment = commentRepository.findById(commentNo)
                .orElseThrow(() -> new BusinessException(ErrorCode.COMMENT_NOT_FOUND));
        comment.delete();
    }

    private CommentDto toDto(Comment entity) {
        return CommentDto.builder()
                .ansSn(entity.getAnsSn())
                .pstId(entity.getPstId())
                .bbsId(entity.getBbsId())
                .wrterId(entity.getWrterId())
                .wrterNm(entity.getWrterNm())
                .ansCn(entity.getAnsCn())
                .createdDate(entity.getFrstRegistPnttm().toString())
                .build();
    }
}
