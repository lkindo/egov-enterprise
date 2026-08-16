package nuri.business.service.addressbook.listener;

import java.util.List;

import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nuri.business.domain.addressbook.AddressBookRepository;
import nuri.business.service.user.event.UserDeletionEvent;
import nuri.foundation.constants.Constants;

/** 사용자 삭제 전에 주소록 작성자를 시스템 계정으로 재귀속한다. */
@Slf4j
@Component
@RequiredArgsConstructor
public class AddressBookUserDeletionCleanupListener {

    private final AddressBookRepository addressBookRepository;

    @EventListener
    @Transactional(propagation = Propagation.MANDATORY)
    public void onUserDeletion(UserDeletionEvent event) {
        List<String> esntlIds = event.esntlIds();
        if (esntlIds == null || esntlIds.isEmpty()) {
            return;
        }

        int addressBooks = addressBookRepository.reassignWriterByWrterIdIn(
                esntlIds, Constants.User.SYSTEM_ADMIN_ESNTL_ID);
        log.info("사용자 삭제 주소록 정리: 대상 {}명 — 주소록 재귀속 {}건", esntlIds.size(), addressBooks);
    }
}
