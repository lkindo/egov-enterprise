package nuri.business.service.comment;
import nuri.business.domain.board.exception.BoardErrorCode;

import nuri.business.domain.comment.Comment;
import nuri.business.domain.comment.CommentRepository;
import nuri.business.service.comment.dto.CommentDto;
import nuri.foundation.core.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;

    @Transactional(readOnly = true)
    public Page<CommentDto> getComments(String pstId, String bbsId, Pageable pageable) {
        return commentRepository.findByBbsIdAndPstId(bbsId, pstId, pageable)
                .map(this::toDto);
    }

    @Transactional
    public Long createComment(CommentDto commentDto) {
        Comment comment = Comment.builder()
                .pstId(commentDto.getPstId())
                .bbsId(commentDto.getBbsId())
                .wrterId(commentDto.getWrterId())
                .wrterNm(commentDto.getWrterNm())
                .pswd(commentDto.getPswd())
                .ansCn(commentDto.getAnsCn())
                .useYn("Y")
                .build();

        return commentRepository.save(comment).getAnsSn();
    }

    @Transactional
    public void updateComment(Long commentNo, String content) {
        Comment comment = commentRepository.findById(commentNo)
                .orElseThrow(() -> new BusinessException(BoardErrorCode.COMMENT_NOT_FOUND));
        nuri.business.security.util.SecurityUtil.assertOwnerOrAdmin(comment.getFrstRgtrId()); // [IDOR] 작성자/관리자만 수정
        comment.update(content);
    }

    @Transactional
    public void deleteComment(Long commentNo) {
        Comment comment = commentRepository.findById(commentNo)
                .orElseThrow(() -> new BusinessException(BoardErrorCode.COMMENT_NOT_FOUND));
        nuri.business.security.util.SecurityUtil.assertOwnerOrAdmin(comment.getFrstRgtrId()); // [IDOR] 작성자/관리자만 삭제
        comment.delete();
    }

    private CommentDto toDto(Comment entity) {
        return CommentDto.builder()
                .ansSn(entity.getAnsSn())
                .pstId(entity.getPstId())
                .bbsId(entity.getBbsId())
                .wrterId(entity.getWrterId())
                .wrterNm(entity.getWrterNm())
                .pswd(entity.getPswd())
                .ansCn(entity.getAnsCn())
                .crtDt(entity.getCrtDt() != null ? entity.getCrtDt().toString() : null)
                .build();
    }
}
