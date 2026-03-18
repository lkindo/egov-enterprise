package com.company.project.service.system.policy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
@DisplayName("PolicyService 단위 테스트")
class PolicyServiceTest {

    @InjectMocks
    private PolicyService policyService;

    @Test
    @DisplayName("정책 조회 테스트 (현재는 빈 Optional 반환)")
    void getPolicyTest() {
        // When
        Optional<PolicyService.Policy> result = policyService.getPolicy("privacy");

        // Then
        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("정책 업데이트 테스트 (현재는 보이드 반환)")
    void updatePolicyTest() {
        // When & Then (No exception means success)
        policyService.updatePolicy("privacy", "Title", "Content");
    }
}
