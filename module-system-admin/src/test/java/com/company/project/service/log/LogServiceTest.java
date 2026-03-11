package com.company.project.service.log;

import com.company.project.domain.log.LoginLog;
import com.company.project.domain.log.LoginLogRepository;
import com.company.project.service.log.dto.LogDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class LogServiceTest {

    @Mock
    private LoginLogRepository loginLogRepository;

    @InjectMocks
    private LogService logService;

    private LoginLog testLog;

    @BeforeEach
    void setUp() {
        testLog = LoginLog.builder()
                .logId("LGN_TEST_001")
                .loginId("testuser")
                .loginIp("127.0.0.1")
                .loginMthd("LOGIN")
                .errOccrrAt("N")
                .creatDt(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("로그인 로그 기록 성공 테스트")
    void logLogin_success() {
        // when
        logService.logLogin("testuser", "127.0.0.1", "LOGIN", "N", "");

        // then
        verify(loginLogRepository, times(1)).save(any(LoginLog.class));
    }

    @Test
    @DisplayName("최근 로그인 로그 목록 조회 테스트")
    void getRecentLoginLogs_success() {
        // given
        given(loginLogRepository.findTop100ByOrderByCreatDtDesc()).willReturn(Arrays.asList(testLog));

        // when
        List<LogDto> result = logService.getRecentLoginLogs();

        // then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getConectId()).isEqualTo("testuser");
        assertThat(result.get(0).getLogId()).isEqualTo("LGN_TEST_001");
        verify(loginLogRepository, times(1)).findTop100ByOrderByCreatDtDesc();
    }
}
