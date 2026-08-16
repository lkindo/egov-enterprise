package nuri.business.service.blog.listener;

import java.util.List;

import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nuri.business.domain.blog.BlogUserRepository;
import nuri.business.service.user.event.UserDeletionEvent;

/** 사용자 삭제 전에 블로그 멤버십을 제거한다. */
@Slf4j
@Component
@RequiredArgsConstructor
public class BlogUserDeletionCleanupListener {

    private final BlogUserRepository blogUserRepository;

    @EventListener
    @Transactional(propagation = Propagation.MANDATORY)
    public void onUserDeletion(UserDeletionEvent event) {
        List<String> esntlIds = event.esntlIds();
        if (esntlIds == null || esntlIds.isEmpty()) {
            return;
        }

        int memberships = blogUserRepository.deleteByUserIdIn(esntlIds);
        log.info("사용자 삭제 블로그 정리: 대상 {}명 — 멤버십 삭제 {}건", esntlIds.size(), memberships);
    }
}
