package nuri.business.service.user;

import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;

@ExtendWith(MockitoExtension.class)
class UserDisplayNameLookupServiceTest {
    @Mock private UserRepository userRepository;
    @InjectMocks private UserDisplayNameLookupService service;

    @Test
    void resolvesOnlyRequestedIdsInOneBatchIncludingInactiveUsers() {
        given(userRepository.findByEsntlIdIn(anyCollection())).willReturn(List.of(
                User.builder().esntlId("USR_ACTIVE").userNm("활성 작성자").userSttsCd("P").build(),
                User.builder().esntlId("USR_DISABLED").userNm("이전 수신자").userSttsCd("D").build(),
                User.builder().esntlId("USR_BLANK").userNm(" ").build(),
                User.builder().esntlId("USR_OTHER").userNm("조회 범위 밖").build()));

        Map<String, String> result = service.findDisplayNames(Arrays.asList(
                "USR_ACTIVE", "USR_DISABLED", "USR_ACTIVE", "USR_BLANK", "USR_MISSING", "", null));

        assertThat(result).containsExactlyInAnyOrderEntriesOf(Map.of(
                "USR_ACTIVE", "활성 작성자", "USR_DISABLED", "이전 수신자"));
        verify(userRepository).findByEsntlIdIn(argThat(ids -> ids.size() == 4
                && ids.containsAll(List.of("USR_ACTIVE", "USR_DISABLED", "USR_BLANK", "USR_MISSING"))));
        verifyNoMoreInteractions(userRepository);
    }

    @Test
    void missingAndBlankInputNeverTriggersAUserLookup() {
        assertThat(service.findDisplayNames(null)).isEmpty();
        assertThat(service.findDisplayNames(List.of())).isEmpty();
        assertThat(service.findDisplayNames(Arrays.asList(null, "", " "))).isEmpty();
        verifyNoInteractions(userRepository);
    }
}
