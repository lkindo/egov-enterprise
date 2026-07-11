package nuri.business.domain.login;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

@DisplayName("LoginPolicy 도메인 테스트")
class LoginPolicyTest {

    @Test
    @DisplayName("LoginPolicy 빌더 확인")
    void testBuilder() {
        LoginPolicy policy = LoginPolicy.builder()
                .userId("user01")
                .ipAddr("127.0.0.1")
                .build();

        assertEquals("user01", policy.getUserId());
    }
}