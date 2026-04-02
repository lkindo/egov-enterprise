package com.company.project.foundation.domain.log;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

@DisplayName("LogSummary 도메인 테스트")
class LogSummaryTest {

    @Test
    @DisplayName("LogSummary 생성 확인")
    void testCreation() {
        LogSummary summary = LogSummary.builder()
                .logId("LOG_001")
                .occrrncDe("20240101")
                .build();

        assertEquals("LOG_001", summary.getLogId());
    }
}