package nuri.business.service.informalsanction;

import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

/**
 * [2026-11-19] 결재 알림을 받을 수 있는 사람 — 계정이 있는 사람만, 정렬·중복 제거·null 제외, 조회는 한 번(esntlId 축).
 */
@ExtendWith(MockitoExtension.class)
class ApprovalRecipientsTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private ApprovalRecipients recipients;

    @Test
    @DisplayName("지워진 계정은 빼고, 남은 사람을 정렬해 한 번의 조회로 고른다")
    void keepsOnlyExistingAccountsSortedAndDistinct() {
        given(userRepository.findAllById(List.of("a", "b", "gone")))
                .willReturn(List.of(user("b"), user("a")));

        assertThat(recipients.existing(Arrays.asList("b", null, "gone", "a", "b"))).containsExactly("a", "b");
        verify(userRepository).findAllById(List.of("a", "b", "gone"));
    }

    @Test
    @DisplayName("후보가 없으면 조회하지 않고, 한 사람 판정은 같은 규칙을 쓴다")
    void emptyCandidatesSkipLookupAndSingleCheckFollowsTheSameRule() {
        assertThat(recipients.existing(Arrays.asList((String) null))).isEmpty();
        assertThat(recipients.exists(null)).isFalse();
        verify(userRepository, never()).findAllById(any());

        given(userRepository.findAllById(List.of("gone"))).willReturn(List.of());
        given(userRepository.findAllById(List.of("kept"))).willReturn(List.of(user("kept")));
        assertThat(recipients.exists("gone")).isFalse();
        assertThat(recipients.exists("kept")).isTrue();
    }

    private static User user(String esntlId) {
        return User.builder().esntlId(esntlId).userId(esntlId).userNm(esntlId).userSttsCd("P").build();
    }
}
