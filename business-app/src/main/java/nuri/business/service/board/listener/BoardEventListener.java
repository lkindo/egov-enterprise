package nuri.business.service.board.listener;

import nuri.business.domain.board.BoardRepository;
import nuri.foundation.core.event.NotificationRequestedEvent;
import nuri.foundation.core.event.PostCommentCountChangedEvent;
import nuri.foundation.core.event.PostCommentedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 게시글 통계(댓글 수) 반영 리스너.
 *
 * <p><b>[2026-08-29] 무엇이 고쳐졌는가</b> — 종전에는 {@code PostCreatedEvent}(게시글 생성)를
 * 구독해 {@code CommentRepository} 로 댓글 수를 세어 반영했다. 그런데 <b>게시글이 막 생성된
 * 시점의 댓글 수는 언제나 0</b> 이고, 댓글이 달리거나 지워질 때는 이 경로가 아예 돌지 않았다.
 * 저장소 전체에서 {@code syncCmntCntAtomic} 호출부는 여기 하나뿐이었고 comment 서비스에는
 * {@code cmntCnt} 를 건드리는 코드가 없었으므로, <b>화면의 '댓글 N' 은 영원히 0 이었다</b>.
 *
 * <p>이제 comment 도메인이 커밋 이후 {@link PostCommentCountChangedEvent} 를 발행하고 이 리스너가
 * 반영한다. 개수를 이벤트가 나르므로 board 는 {@code CommentRepository} 를 주입하지 않는다 —
 * 교차 도메인 결합(app→app board→comment)이 실제로 사라진다. 이벤트는 foundation 에 있어
 * 양쪽 어느 도메인도 상대를 import 하지 않는다.
 *
 * <p>{@code PostCreatedEvent} 구독을 걷어낸 것은 그 핸들러가 하던 일이 "새 글에 0 을 쓰는 것"
 * 뿐이었기 때문이다. 같은 이벤트의 다른 소비자({@code RealTimeDashboardService})는 그대로다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class BoardEventListener {

    private final BoardRepository boardRepository;

    /**
     * 알림은 {@code NotificationService} 를 주입하지 않고 foundation 이벤트로 요청한다 —
     * board→notification 이라는 새 교차 도메인 결합을 만들지 않기 위해서다.
     */
    private final ApplicationEventPublisher eventPublisher;

    // 발행부가 TransactionUtils.runAfterCommit 으로 감싸 커밋 이후에만 발행한다.
    // (@TransactionalEventListener + @Async 조합은 AsyncTransactionalListenerArchTest 게이트로 금지된다.)
    @Async
    @EventListener
    @Transactional
    public void handleCommentCountChanged(PostCommentCountChangedEvent event) {
        syncCommentCount(event.pstSn(), event.commentCount());
    }

    /**
     * 댓글 수 반영.
     *
     * <p>[W1-D5] 종전에는 {@code findById → changeCmntCnt → save} 더티체킹 저장이었다.
     * 이 메서드는 {@code @Async} 스레드에서 도는데 그 스레드에는 SecurityContext 가 없어
     * 감사 컬럼 {@code last_mdfr_id} 가 실제 수정자를 지우고 {@code SYSTEM} 으로 덮였고,
     * 동시에 {@code version} 이 올라 글을 편집 중이던 사용자가 409 를 맞았다.
     * 감사 컬럼·version 을 건드리지 않는 벌크 UPDATE 로 전환한다.
     */
    private void syncCommentCount(Long pstSn, int count) {
        int affected = boardRepository.syncCmntCntAtomic(pstSn, count);
        if (affected == 0) {
            // 이미 삭제된 글에 달린 댓글 등 — 정상 경로이므로 실패로 다루지 않는다.
            log.debug(">>> comment count sync skipped (post not found): pstSn={}", pstSn);
            return;
        }
        log.info(">>> Updated comment count for pstSn {}: {}", pstSn, count);
    }

    /**
     * 내 글에 댓글이 달리면 글쓴이에게 알린다.
     *
     * <p><b>왜 board 가 이 일을 하는가</b> — 게시글의 작성자는 board 가 소유한 사실이다.
     * comment 가 알아내려면 board 를 조회해야 하고, 그 순간 GAP-ARCH-001 이 역전시킨
     * comment→board 결합이 되살아난다. 그래서 comment 는 "댓글이 달렸다" 만 알리고,
     * 작성자 판정은 글을 가진 쪽이 한다.
     *
     * <p><b>자기 글에 자기가 단 댓글은 알리지 않는다.</b> 자기 행동을 자기에게 통지하면
     * 알림함이 자기 발자국으로 채워져 정작 남이 남긴 반응이 묻힌다.
     *
     * <p>[비파괴 원칙] 알림 실패가 댓글 등록을 되돌리면 안 된다. 이미 커밋된 뒤이므로
     * 되돌릴 수도 없다 — 예외를 흡수하고 로그로 남긴다.
     */
    @Async
    @EventListener
    public void handlePostCommented(PostCommentedEvent event) {
        try {
            boardRepository.findById(event.pstSn()).ifPresent(post -> {
                String authorEsntlId = post.getUserId();
                if (!org.springframework.util.StringUtils.hasText(authorEsntlId)) {
                    return;
                }
                if (authorEsntlId.equals(event.commenterEsntlId())) {
                    return;
                }
                String commenter = org.springframework.util.StringUtils.hasText(event.commenterName())
                        ? event.commenterName()
                        : "누군가";
                eventPublisher.publishEvent(new NotificationRequestedEvent(
                        authorEsntlId,
                        "새 댓글",
                        String.format("%s 님이 '%s' 글에 댓글을 남겼습니다.",
                                commenter,
                                org.springframework.util.StringUtils.hasText(post.getPstTtl())
                                        ? post.getPstTtl()
                                        : "(제목 없음)"),
                        String.format("/admin/community/boards/detail?bbsId=%s&pstSn=%d",
                                event.bbsId(), event.pstSn())));
            });
        } catch (Exception e) {
            log.error("댓글 알림 요청 실패(댓글 등록에는 영향 없음) — pstSn={}, 사유={}",
                    event.pstSn(), e.toString());
        }
    }
}
