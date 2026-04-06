package com.company.project.foundation.domain.log;

import com.company.project.foundation.support.PersistenceTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;

@DisplayName("WebLogRepository 테스트")
class WebLogRepositoryTest extends PersistenceTestSupport {

    @Autowired
    private WebLogRepository repository;

    @Test
    @DisplayName("웹 로그 검색")
    void testSearchWebLogs() {
        // given
        repository.save(WebLog.builder()
                .requstId("WEBREQ_001")
                .url("http://example.com/test")
                .occrrncDe(LocalDateTime.of(2026, 4, 1, 10, 0))
                .build());

        // when (search by URL)
        Page<WebLog> results = repository.searchWebLogs("test", null, null, PageRequest.of(0, 10));

        // then
        assertEquals(1, results.getTotalElements());
        assertEquals("WEBREQ_001", results.getContent().get(0).getRequstId());
    }

    @Test
    @DisplayName("로그 요약 이행 확인")
    void testInsertLogSummary() {
        // given
        repository.save(WebLog.builder()
                .requstId("WEBREQ_1")
                .url("http://example.com/1")
                .occrrncDe(LocalDateTime.now().minusDays(1))
                .build());

        // when
        repository.insertLogSummary();

        // then: No exception
    }

    @Test
    @DisplayName("오래된 로그 삭제 확인")
    void testDeleteOldLogs() {
        // given
        repository.save(WebLog.builder()
                .requstId("WEBREQ_OLD")
                .url("http://example.com/old")
                .occrrncDe(LocalDateTime.now().minusMonths(6).minusDays(1))
                .build());

        // when
        repository.deleteOldLogs(6);

        // then
        Page<WebLog> results = repository.searchWebLogs(null, null, null, PageRequest.of(0, 10));
        assertEquals(0, results.getTotalElements());
    }
}