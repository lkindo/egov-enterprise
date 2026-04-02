package com.company.project.foundation.domain.log;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

@DisplayName("UserLog 도메인 테스트")
class UserLogTest {

    @Test
    @DisplayName("UserLog 빌더 확인")
    void testBuilder() {
        UserLog log = UserLog.builder()
                .rqsterId("user01")
                .occrrncDe("20240101")
                .build();

        assertEquals("user01", log.getRqsterId());
    }
}