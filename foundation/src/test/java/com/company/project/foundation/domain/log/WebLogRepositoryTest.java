package com.company.project.foundation.domain.log;

import com.company.project.TestApplication;
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
@DisplayName("WebLog 리포지?�리 ?�스??)
class WebLogRepositoryTest {

    @Autowired
    private WebLogRepository repository;

    @Test
    @DisplayName("??로그 검???�스??(검?�어, ?�짜구간-?�이??")
    void searchWebLogsTest() {
        // given
        LocalDateTime yesterday = LocalDateTime.now().minusDays(1);
        WebLog log1 = WebLog.builder()
                .requstId("REQ-001")
                .url("/api/user/login")
                .rqesterId("user01")
                .occrrncDe(yesterday)
                .build();
        repository.save(log1);

        WebLog log2 = WebLog.builder()
                .requstId("REQ-002")
                .url("/api/menu/list")
                .rqesterId("admin")
                .occrrncDe(LocalDateTime.now())
                .build();
        repository.save(log2);

        String bgnDe = yesterday.format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        String endDe = yesterday.format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));

        // when (URL ?�터)
        Page<WebLog> searchByUrl = repository.searchWebLogs("/user/login", null, null, PageRequest.of(0, 10));

        // then
        assertThat(searchByUrl.getContent()).hasSize(1);
        assertThat(searchByUrl.getContent().get(0).getRequstId()).isEqualTo("REQ-001");

        // when (?�짜 ?�터)
        Page<WebLog> searchByDate = repository.searchWebLogs(null, bgnDe, endDe, PageRequest.of(0, 10));

        // then
        assertThat(searchByDate.getContent()).hasSize(1);
        assertThat(searchByDate.getContent().get(0).getRequstId()).isEqualTo("REQ-001");
        
        // when (Exception coverage)
        Page<WebLog> searchError = repository.searchWebLogs(null, "INVALID", "INVALID", PageRequest.of(0, 10));
        assertThat(searchError).isNotNull();

        // when (Native Query Coverage)
        repository.insertLogSummary();
        repository.deleteOldLogs(6);
    }
}
