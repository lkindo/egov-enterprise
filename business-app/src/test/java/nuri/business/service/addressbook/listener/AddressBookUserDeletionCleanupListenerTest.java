package nuri.business.service.addressbook.listener;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import nuri.business.domain.addressbook.AddressBookRepository;
import nuri.business.service.user.event.UserDeletionEvent;
import nuri.foundation.constants.Constants;

@ExtendWith(MockitoExtension.class)
class AddressBookUserDeletionCleanupListenerTest {

    @Mock
    private AddressBookRepository addressBookRepository;

    @InjectMocks
    private AddressBookUserDeletionCleanupListener listener;

    @Test
    void reassignsAddressBookOwners() {
        List<String> esntlIds = List.of("user-1", "user-2");

        listener.onUserDeletion(new UserDeletionEvent(esntlIds));

        verify(addressBookRepository).reassignWriterByWrterIdIn(
                esntlIds, Constants.User.SYSTEM_ADMIN_ESNTL_ID);
    }

    @Test
    void skipsRepositoryWhenTargetIsEmpty() {
        listener.onUserDeletion(new UserDeletionEvent(List.of()));

        verifyNoInteractions(addressBookRepository);
    }
}
