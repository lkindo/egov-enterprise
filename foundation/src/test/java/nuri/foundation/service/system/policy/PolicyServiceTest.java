package nuri.foundation.service.system.policy;

import nuri.foundation.domain.system.policy.SystemPolicy;
import nuri.foundation.domain.system.policy.SystemPolicyRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("PolicyService (시스템 정책 서비스) 테스트")
class PolicyServiceTest {

    @Mock
    private SystemPolicyRepository repository;

    @InjectMocks
    private PolicyService service;

    @Test
    @DisplayName("정책 조회 성공 테스트")
    void getPolicy_success() {
        // Given
        String type = "PRIVACY";
        SystemPolicy entity = SystemPolicy.builder()
                .policyType(type)
                .title("개인정보처리방침")
                .content("내용")
                .build();
        when(repository.findById(type)).thenReturn(Optional.of(entity));

        // When
        Optional<PolicyService.Policy> result = service.getPolicy(type);

        // Then
        assertThat(result).isPresent();
        assertThat(result.get().getTitle()).isEqualTo("개인정보처리방침");
    }

    @Test
    @DisplayName("정책 업데이트 테스트 (신규 및 수정)")
    void updatePolicy_test() {
        // Given
        String type = "COPYRIGHT";
        String title = "저작권";
        String content = "새로운 내용";
        
        when(repository.findById(type)).thenReturn(Optional.empty());

        // When
        service.updatePolicy(type, title, content);

        // Then
        verify(repository).save(any(SystemPolicy.class));
    }
}
