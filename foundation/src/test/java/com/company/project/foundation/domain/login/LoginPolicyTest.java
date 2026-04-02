package com.company.project.foundation.domain.login;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("LoginPolicy ?îÌã∞???åÏä§??)
class LoginPolicyTest {

    @Test
    @DisplayName("Î°úÍ∑∏???ïÏ±Ö ?ùÏÑ± Î∞??òÏ†ï ?åÏä§??)
    void loginPolicyUpdateTest() {
        // Given
        LoginPolicy policy = LoginPolicy.builder()
                .emplyrId("USER_01")
                .ipInfo("127.0.0.1")
                .dplctPermAt("Y")
                .lmttAt("N")
                .build();

        // When
        policy.update("192.168.0.1", "N", "Y");

        // Then
        assertThat(policy.getEmplyrId()).isEqualTo("USER_01");
        assertThat(policy.getIpInfo()).isEqualTo("192.168.0.1");
        assertThat(policy.getDplctPermAt()).isEqualTo("N");
        assertThat(policy.getLmttAt()).isEqualTo("Y");
    }

    @Test
    @DisplayName("Í∏∞Î≥∏ ?ùÏÑ±???åÏä§??(NoArgsConstructor)")
    void noArgsConstructorTest() {
        // Given
        LoginPolicy policy = LoginPolicy.builder().build();
        
        // Then
        assertThat(policy).isNotNull();
    }
}
