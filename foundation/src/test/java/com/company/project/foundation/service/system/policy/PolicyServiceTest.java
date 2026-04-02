package com.company.project.foundation.service.system.policy;

import com.company.project.foundation.domain.system.policy.SystemPolicy;
import com.company.project.foundation.domain.system.policy.SystemPolicyRepository;
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
@DisplayName("PolicyService ?µÌï© Î∞??®ÏúÑ ?åÏä§??)
class PolicyServiceTest {

    @Mock
    private SystemPolicyRepository repository;

    @InjectMocks
    private PolicyService service;

    @Test
    @DisplayName("?ïÏ±Ö Ï°∞Ìöå ?±Í≥µ ?åÏä§??)
    void getPolicy_success() {
        // Given
        String type = "PRIVACY";
        SystemPolicy entity = SystemPolicy.builder()
                .policyType(type)
                .title("Í∞úÏù∏?ïÎ≥¥Ï≤òÎ¶¨Î∞©Ïπ®")
                .content("?¥Ïö©")
                .build();
        when(repository.findById(type)).thenReturn(Optional.of(entity));

        // When
        Optional<PolicyService.Policy> result = service.getPolicy(type);

        // Then
        assertThat(result).isPresent();
        assertThat(result.get().getTitle()).isEqualTo("Í∞úÏù∏?ïÎ≥¥Ï≤òÎ¶¨Î∞©Ïπ®");
    }

    @Test
    @DisplayName("?ïÏ±Ö ?ÖÎç∞?¥Ìä∏ ?åÏä§??(?†Í∑ú Î∞??òÏ†ï)")
    void updatePolicy_test() {
        // Given
        String type = "COPYRIGHT";
        String title = "?Ä?ëÍ∂å";
        String content = "?àÎ°ú???¥Ïö©";
        
        when(repository.findById(type)).thenReturn(Optional.empty());

        // When
        service.updatePolicy(type, title, content);

        // Then
        verify(repository).save(any(SystemPolicy.class));
    }
}
