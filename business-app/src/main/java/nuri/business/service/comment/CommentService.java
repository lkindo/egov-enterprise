package nuri.business.service.comment;

import nuri.business.domain.comment.Comment;
import nuri.business.domain.comment.CommentRepository;
import nuri.business.domain.comment.exception.CommentErrorCode;
import nuri.business.service.comment.dto.CommentDto;
import nuri.foundation.core.event.PostCommentCountChangedEvent;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.util.TransactionUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;
    private final ApplicationEventPublisher eventPublisher;

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

        Long ansSn = commentRepository.save(comment).getAnsSn();
        publishCountAfterCommit(comment.getBbsId(), comment.getPstSn());
        publishCommentedAfterCommit(comment.getBbsId(), comment.getPstSn(), wrterEsntlId, wrterNm);
        return ansSn;
    }

    @Transactional
    public void updateComment(Long commentNo, String content) {
        Comment comment = commentRepository.findById(commentNo)
                .orElseThrow(() -> new BusinessException(CommentErrorCode.COMMENT_NOT_FOUND));
        nuri.business.security.util.SecurityUtil.assertOwnerOrAdmin(comment.getFrstRgtrId()); // [IDOR] 작성자/관리자만 수정
        comment.update(content);
    }

    @Transactional
    public void deleteComment(Long commentNo) {
        Comment comment = commentRepository.findById(commentNo)
                .orElseThrow(() -> new BusinessException(CommentErrorCode.COMMENT_NOT_FOUND));
        nuri.business.security.util.SecurityUtil.assertOwnerOrAdmin(comment.getFrstRgtrId()); // [IDOR] 작성자/관리자만 삭제
        comment.delete();
        publishCountAfterCommit(comment.getBbsId(), comment.getPstSn());
    }

    /**
     * 댓글 수 변경을 <b>커밋 이후</b>에 알린다.
     *
     * <p>개수는 커밋 뒤에 다시 센다 — 트랜잭션 안에서 센 값은 같은 게시글에 동시에 달린 다른
     * 댓글을 보지 못해, 늦게 커밋된 쪽이 오래된 값으로 덮어쓸 수 있다.
     *
     * <p>board 를 직접 부르지 않는다. 게시글의 {@code cmnt_cnt} 는 board 소유이고, 그 쪽
     * 리스너가 이 이벤트를 받아 벌크 UPDATE 로 반영한다.
     */
    private void publishCountAfterCommit(String bbsId, Long pstSn) {
        if (bbsId == null || pstSn == null) return;
        TransactionUtils.runAfterCommit(() -> {
            long count = commentRepository.countByBbsIdAndPstSnAndUseYn(bbsId, pstSn, "Y");
            eventPublisher.publishEvent(
                    new PostCommentCountChangedEvent(bbsId, pstSn, (int) count));
        });
    }

    /**
     * 댓글이 <b>새로 달렸음</b>을 커밋 이후에 알린다 — 게시글 작성자 알림의 출발점이다.
     *
     * <p><b>왜 개수 이벤트를 재사용하지 않는가</b> — 그 이벤트는 삭제에도 발행되고 누가 썼는지를
     * 나르지 않는다. 하나로 겸하게 하면 댓글을 지웠을 때도 "댓글이 달렸다" 알림이 나간다.
     *
     * <p><b>왜 게시글 작성자를 여기서 찾지 않는가</b> — comment 는 게시글의 작성자를 모른다.
     * 알아내려면 board 를 조회해야 하고 그 순간 comment→board 결합이 되살아난다
     * (GAP-ARCH-001 이 2026-08-29 에 역전시킨 바로 그 방향이다). 게시글을 소유한 board 가
     * 이 이벤트를 받아 작성자를 판정한다.
     */
    private void publishCommentedAfterCommit(String bbsId, Long pstSn, String wrterEsntlId, String wrterNm) {
        if (bbsId == null || pstSn == null) return;
        TransactionUtils.runAfterCommit(() -> eventPublisher.publishEvent(
                new nuri.foundation.core.event.PostCommentedEvent(bbsId, pstSn, wrterEsntlId, wrterNm)));
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
