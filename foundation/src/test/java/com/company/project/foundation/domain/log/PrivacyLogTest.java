package com.company.project.foundation.domain.log;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

@DisplayName("PrivacyLog 도메인 테스트")
class PrivacyLogTest {

    @Test
    @DisplayName("PrivacyLog 빌더 확인")
    void testBuilder() {
        PrivacyLog log = PrivacyLog.builder()
                .rqesterId("user01")
                .processMthdCode("READ")
                .build();

        assertEquals("user01", log.getRqesterId());
    }
}