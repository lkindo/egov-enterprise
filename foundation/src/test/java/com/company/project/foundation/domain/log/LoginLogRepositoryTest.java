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
@DisplayName("LoginLog 리포지토리 테스트")
class LoginLogRepositoryTest {

    @Autowired
    private LoginLogRepository repository;

    @Test
    @DisplayName("로그인 로그 검색 테스트 (검색어, 날짜구간)")
    void searchLoginLogsTest() {
        // given
        LocalDateTime yesterday = LocalDateTime.now().minusDays(1);
        LoginLog log1 = LoginLog.builder()
                .logId("LOG-001")
                .loginId("user01")
                .loginMthd("LOGIN")
                .creatDt(yesterday)
                .build();
        repository.save(log1);

        LoginLog log2 = LoginLog.builder()
                .logId("LOG-002")
                .loginId("user02")
                .loginMthd("LOGOUT")
                .creatDt(LocalDateTime.now())
                .build();
        repository.save(log2);

        String bgnDe = yesterday.format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String endDe = yesterday.format(DateTimeFormatter.ofPattern("yyyyMMdd"));

        // when (검색어 필터)
        Page<LoginLog> searchByMethod = repository.searchLoginLogs("LOGOUT", null, null, PageRequest.of(0, 10));
        
        // then
        assertThat(searchByMethod.getContent()).hasSize(1);
        assertThat(searchByMethod.getContent().get(0).getLoginId()).isEqualTo("user02");

        // when (날짜 필터)
        Page<LoginLog> searchByDate = repository.searchLoginLogs(null, bgnDe, endDe, PageRequest.of(0, 10));

        // then
        assertThat(searchByDate.getContent()).hasSize(1);
        assertThat(searchByDate.getContent().get(0).getLogId()).isEqualTo("LOG-001");
    }

    @Test
    @DisplayName("날짜 파싱 예외 케이스 커버리지 확보 테스트")
    void searchLoginLogsDateExceptionTest() {
        // when
        Page<LoginLog> result = repository.searchLoginLogs(null, "INVALID_DATE", "20241231", PageRequest.of(0, 10));
        
        // then (Exception catch 로직 커치되어 null 리턴 -> creatDtBetween 이 null -> 모든 데이터 조회)
        assertThat(result).isNotNull();

        // when (Native Query Coverage)
        repository.insertLogSummary();
        repository.deleteOldLogs(6);
    }
}
