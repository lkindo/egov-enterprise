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
    public Page<CommentDto> getComments(Long pstSn, String bbsId, Pageable pageable) {
        return commentRepository.findByBbsIdAndPstSn(bbsId, pstSn, pageable)
                .map(this::toDto);
    }

    /**
     * 댓글을 등록한다. 작성자 신원은 <b>인증 주체에서 온 값만</b> 저장한다.
     *
     * <p>종전에는 {@code commentDto.getWrterId()/getWrterNm()} 을 그대로 썼는데 화면이 그 두 필드를
     * 보내지 않아 전 건이 null 로 저장됐다(작성자 칸 공백). 게시글이 이미 쓰는 규칙과 같게 맞춘다.
     *
     * @param wrterEsntlId 인증 주체의 고유 식별자(esntlId) — 요청 본문에서 오지 않는다
     * @param wrterNm      인증 주체의 성명
     */
    @Transactional
    public Long createComment(String wrterEsntlId, String wrterNm, CommentDto commentDto) {
        Comment comment = Comment.builder()
                .pstSn(commentDto.getPstSn())
                .bbsId(commentDto.getBbsId())
                .wrterId(wrterEsntlId)
                .wrterNm(wrterNm)
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
                .pstSn(entity.getPstSn())
                .bbsId(entity.getBbsId())
                .wrterId(entity.getWrterId())
                .wrterNm(entity.getWrterNm())
                // 화면의 수정·삭제 버튼 판정은 아래 두 가드가 보는 축(frstRgtrId)과 같아야 한다.
                .frstRgtrId(entity.getFrstRgtrId())
                .pswd(entity.getPswd())
                .ansCn(entity.getAnsCn())
                .crtDt(entity.getCrtDt() != null ? entity.getCrtDt().toString() : null)
                .build();
    }
}
