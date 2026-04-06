package nuri.foundation.domain.log;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

@DisplayName("LoginLog 도메인 테스트")
class LoginLogTest {

    @Test
    @DisplayName("LoginLog 빌더 확인")
    void testBuilder() {
        LoginLog log = LoginLog.builder()
                .loginId("user01")
                .loginIp("127.0.0.1")
                .loginMthd("ID/PWD")
                .build();

        assertEquals("user01", log.getLoginId());
        assertEquals("127.0.0.1", log.getLoginIp());
    }
}