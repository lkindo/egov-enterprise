package nuri.business.service.notification.listener;

import java.util.List;

import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nuri.business.domain.notification.NotificationRepository;
import nuri.business.service.user.event.UserDeletionEvent;

/** 사용자 삭제 전에 더 이상 전달할 수 없는 수신 알림을 제거한다. */
@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationUserDeletionCleanupListener {

    private final NotificationRepository notificationRepository;

    @EventListener
    @Transactional(propagation = Propagation.MANDATORY)
    public void onUserDeletion(UserDeletionEvent event) {
        List<String> esntlIds = event.esntlIds();
        if (esntlIds == null || esntlIds.isEmpty()) {
            return;
        }

        int notifications = notificationRepository.deleteByRcvrIdIn(esntlIds);
        log.info("사용자 삭제 알림 정리: 대상 {}명 — 수신 알림 삭제 {}건", esntlIds.size(), notifications);
    }
}
