package com.company.project.foundation.domain.log;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("SysLogSummary 도메인 테스트")
class SysLogSummaryTest {

    @Test
    @DisplayName("SysLogSummary 생성 테스트")
    void testSysLogSummaryCreation() {
        // Given
        SysLogSummary summary = SysLogSummary.builder()
                .occrrncDe("20240101")
                .svcNm("TestService")
                .methodNm("testMethod")
                .creatCnt(10)
                .updtCnt(5)
                .rdCnt(100)
                .delCnt(2)
                .build();

        // Then
        assertNotNull(summary);
        assertEquals("20240101", summary.getOccrrncDe());
        assertEquals("TestService", summary.getSvcNm());
        assertEquals(10, summary.getCreatCnt());
    }
}