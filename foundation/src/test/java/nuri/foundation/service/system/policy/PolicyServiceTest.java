package nuri.foundation.service.system.policy;

import nuri.foundation.domain.system.policy.SystemPolicy;
import nuri.foundation.domain.system.policy.SystemPolicyRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("PolicyService 단위 테스트")
class PolicyServiceTest {

    @InjectMocks
    private PolicyService policyService;

    @Mock
    private SystemPolicyRepository systemPolicyRepository;

    @Test
    @DisplayName("정책 목록 조회 성공")
    void getPolicies_Success() {
        // given
        SystemPolicy policy = SystemPolicy.builder().policyType("COPYRIGHT").title("Title").build();
        given(systemPolicyRepository.findAll()).willReturn(List.of(policy));

        // when
        List<PolicyService.Policy> result = policyService.getPolicies();

        // then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo("COPYRIGHT");
    }

    @Test
    @DisplayName("정책 상세 조회 성공")
    void getPolicy_Success() {
        // given
        SystemPolicy policy = SystemPolicy.builder().policyType("COPYRIGHT").title("Title").build();
        given(systemPolicyRepository.findById("COPYRIGHT")).willReturn(Optional.of(policy));

        // when
        Optional<PolicyService.Policy> result = policyService.getPolicy("COPYRIGHT");

        // then
        assertThat(result).isPresent();
        assertThat(result.get().getTitle()).isEqualTo("Title");
    }

    @Test
    @DisplayName("정책 수정 성공 - 기존 데이터 있음")
    void updatePolicy_Existing() {
        // given
        SystemPolicy policy = SystemPolicy.builder().policyType("COPYRIGHT").build();
        given(systemPolicyRepository.findById("COPYRIGHT")).willReturn(Optional.of(policy));

        // when
        policyService.updatePolicy("COPYRIGHT", "New Title", "New Content");

        // then
        assertThat(policy.getTitle()).isEqualTo("New Title");
        verify(systemPolicyRepository).save(policy);
    }

    @Test
    @DisplayName("정책 수정 성공 - 신규 데이터")
    void updatePolicy_New() {
        // given
        given(systemPolicyRepository.findById("COPYRIGHT")).willReturn(Optional.empty());

        // when
        policyService.updatePolicy("COPYRIGHT", "New Title", "New Content");

        // then
        verify(systemPolicyRepository).save(any());
    }
}
