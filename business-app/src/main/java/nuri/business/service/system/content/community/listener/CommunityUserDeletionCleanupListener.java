package nuri.business.service.system.content.community.listener;

import java.util.List;

import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nuri.business.domain.system.content.community.CommunityUserRepository;
import nuri.business.service.user.event.UserDeletionEvent;

/** 사용자 삭제 전에 커뮤니티 멤버십을 제거한다. */
@Slf4j
@Component
@RequiredArgsConstructor
public class CommunityUserDeletionCleanupListener {

    private final CommunityUserRepository communityUserRepository;

    @EventListener
    @Transactional(propagation = Propagation.MANDATORY)
    public void onUserDeletion(UserDeletionEvent event) {
        List<String> esntlIds = event.esntlIds();
        if (esntlIds == null || esntlIds.isEmpty()) {
            return;
        }

        communityUserRepository.deleteByIdUserIdIn(esntlIds);
        // 파생 delete의 remove 예약을 부모 사용자 bulk DELETE보다 먼저 SQL로 반영한다.
        communityUserRepository.flush();
        log.info("사용자 삭제 커뮤니티 정리: 대상 {}명 — 멤버십 삭제", esntlIds.size());
    }
}
