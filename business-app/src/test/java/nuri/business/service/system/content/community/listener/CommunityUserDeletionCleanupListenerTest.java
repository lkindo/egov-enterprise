package nuri.business.service.system.content.community.listener;

import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.verifyNoInteractions;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import nuri.business.domain.system.content.community.CommunityUserRepository;
import nuri.business.service.user.event.UserDeletionEvent;

@ExtendWith(MockitoExtension.class)
class CommunityUserDeletionCleanupListenerTest {

    @Mock
    private CommunityUserRepository communityUserRepository;

    @InjectMocks
    private CommunityUserDeletionCleanupListener listener;

    @Test
    void deletesCommunityMemberships() {
        List<String> esntlIds = List.of("user-1", "user-2");

        listener.onUserDeletion(new UserDeletionEvent(esntlIds));

        var ordered = inOrder(communityUserRepository);
        ordered.verify(communityUserRepository).deleteByIdUserIdIn(esntlIds);
        ordered.verify(communityUserRepository).flush();
    }

    @Test
    void skipsRepositoryWhenTargetIsEmpty() {
        listener.onUserDeletion(new UserDeletionEvent(List.of()));

        verifyNoInteractions(communityUserRepository);
    }
}
