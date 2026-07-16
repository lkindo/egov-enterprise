package nuri.business.service.user.listener;

import java.util.List;

import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nuri.business.domain.addressbook.AddressBookRepository;
import nuri.business.domain.board.BlogUserRepository;
import nuri.business.domain.board.BoardRepository;
import nuri.business.domain.comment.CommentRepository;
import nuri.business.domain.notification.NotificationRepository;
import nuri.business.service.user.event.UserDeletionEvent;
import nuri.foundation.constants.Constants;

/**
 * 사용자 삭제 시 business-app 도메인 종속 데이터 정리 리스너.
 *
 * <p>[V2_12 FK 결속] tb_bbs_item·tb_bbs_comment·tb_adbk_manage·tb_user_noti 가
 * tb_user_info(esntl_id) 를 FK(NO ACTION)로 참조한다. UserService(business-core)는 모듈 의존
 * 방향상 이 도메인들의 리포지토리를 직접 참조할 수 없으므로, {@link UserDeletionEvent} 를
 * 확장 seam 으로 받아 정리한다.
 * <ul>
 *   <li>콘텐츠(게시글/댓글/주소록): 시스템 계정(webmaster) <b>재귀속</b> — 콘텐츠 보존 정책(2026-07-16 승인)</li>
 *   <li>알림(수신함): <b>삭제</b> — 수신자 소멸 시 의미 없는 데이터</li>
 * </ul>
 *
 * <p>⚠ 반드시 <b>동기</b> 리스너여야 한다({@code @Async} 금지). 사용자 행 DELETE 가 flush 되기
 * 전, 같은 트랜잭션 안에서 실행되어야 FK 를 통과한다. 비동기 전환 시 발행 트랜잭션 밖으로
 * 이탈하여 사용자 삭제가 FK 위반으로 실패하고, 정리 자체도 정합성을 잃는다.
 * (이 프로젝트는 @TransactionalEventListener+@Async 조합이
 * RestrictedTransactionalEventListenerFactory 로 금지돼 있기도 하다 — BoardEventListener 주석 참조)
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class UserDeletionCleanupListener {

    private final BoardRepository boardRepository;
    private final CommentRepository commentRepository;
    private final AddressBookRepository addressBookRepository;
    private final NotificationRepository notificationRepository;
    private final BlogUserRepository blogUserRepository;

    @EventListener
    @Transactional(propagation = Propagation.MANDATORY) // 삭제 트랜잭션 밖 발행은 프로그래밍 오류 — 조기 실패
    public void onUserDeletion(UserDeletionEvent event) {
        List<String> esntlIds = event.esntlIds();
        if (esntlIds == null || esntlIds.isEmpty()) {
            return;
        }
        String systemAdmin = Constants.User.SYSTEM_ADMIN_ESNTL_ID;
        int notifications = notificationRepository.deleteByRcvrIdIn(esntlIds);
        int blogMemberships = blogUserRepository.deleteByUserIdIn(esntlIds); // [V2_13] 멤버십은 삭제(알림과 동일 정책)
        int posts = boardRepository.reassignAuthorByUserIdIn(esntlIds, systemAdmin);
        int comments = commentRepository.reassignWriterByWrterIdIn(esntlIds, systemAdmin);
        int addressBooks = addressBookRepository.reassignWriterByWrterIdIn(esntlIds, systemAdmin);
        log.info("사용자 삭제 종속 정리: 대상 {}명 — 알림/블로그멤버십 삭제 {}/{}건, 게시글/댓글/주소록 재귀속 {}/{}/{}건",
                esntlIds.size(), notifications, blogMemberships, posts, comments, addressBooks);
    }
}
