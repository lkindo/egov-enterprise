package com.company.project.foundation.domain.log;

import com.company.project.foundation.TestApplication;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ContextConfiguration;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ContextConfiguration(classes = TestApplication.class)
@DisplayName("PrivacyLog 리포지토리 테스트")
class PrivacyLogRepositoryTest {

    @Autowired
    private PrivacyLogRepository repository;

    @Test
    @DisplayName("개인정보 로그 검색 테스트 (검색어, 날짜구간-하이픈타입)")
    void searchPrivacyLogsTest() {
        // given
        LocalDateTime yesterday = LocalDateTime.now().minusDays(1);
        PrivacyLog log1 = PrivacyLog.builder()
                .requestId("REQ-001")
                .inquiryDatetime(yesterday)
                .inquiryInfo("PersonalInfo-Search1")
                .build();
        repository.save(log1);

        PrivacyLog log2 = PrivacyLog.builder()
                .requestId("REQ-002")
                .inquiryDatetime(LocalDateTime.now())
                .inquiryInfo("OtherInfo")
                .build();
        repository.save(log2);

        // yyyy-MM-dd pattern
        String bgnDe = yesterday.format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        String endDe = yesterday.format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));

        // when (검색어 필터)
        Page<PrivacyLog> searchByInfo = repository.searchPrivacyLogs("PersonalInfo", null, null, PageRequest.of(0, 10));

        // then
        assertThat(searchByInfo.getContent()).hasSize(1);
        assertThat(searchByInfo.getContent().get(0).getRequestId()).isEqualTo("REQ-001");

        // when (날짜 필터 - yyyy-MM-dd)
        Page<PrivacyLog> searchByDate = repository.searchPrivacyLogs(null, bgnDe, endDe, PageRequest.of(0, 10));

        // then
        assertThat(searchByDate.getContent()).hasSize(1);
        assertThat(searchByDate.getContent().get(0).getRequestId()).isEqualTo("REQ-001");
        
        // when (Exception test for coverage)
        Page<PrivacyLog> searchError = repository.searchPrivacyLogs(null, "INVALID", "INVALID", PageRequest.of(0, 10));
        assertThat(searchError).isNotNull();
    }
}
