package nuri.business.service.log;

import nuri.business.domain.log.LoginLogRepository;
import nuri.business.domain.log.SysLogRepository;
import nuri.business.domain.log.UserLogRepository;
import nuri.business.domain.log.WebLogRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

/**
 * LogRetentionScheduler 안전 가드 단위 테스트.
 * 핵심: 보존월이 법정 최저(12) 미만이면 삭제를 건너뛰어 '접속기록 전량파기 사고'를 막는다.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("LogRetentionScheduler months 하한 가드")
class LogRetentionSchedulerTest {

    @Mock private WebLogRepository webLogRepository;
    @Mock private SysLogRepository sysLogRepository;
    @Mock private LoginLogRepository loginLogRepository;
    @Mock private UserLogRepository userLogRepository;

    @InjectMocks private LogRetentionScheduler scheduler;

    private void setMonths(int web, int sys, int login, int user) {
        ReflectionTestUtils.setField(scheduler, "webMonths", web);
        ReflectionTestUtils.setField(scheduler, "sysMonths", sys);
        ReflectionTestUtils.setField(scheduler, "loginMonths", login);
        ReflectionTestUtils.setField(scheduler, "userMonths", user);
    }

    @Test
    @DisplayName("미설정(0) — 전 테이블 삭제 skip (전량파기 방지)")
    void unset_skipsAll() {
        setMonths(0, 0, 0, 0);
        scheduler.purgeExpiredLogs();
        verify(webLogRepository, never()).deleteOldLogs(org.mockito.ArgumentMatchers.anyInt());
        verify(sysLogRepository, never()).deleteOldLogs(org.mockito.ArgumentMatchers.anyInt());
        verify(loginLogRepository, never()).deleteOldLogs(org.mockito.ArgumentMatchers.anyInt());
        verify(userLogRepository, never()).deleteOldLogs(org.mockito.ArgumentMatchers.anyInt());
    }

    @Test
    @DisplayName("법정 최저 미만(음수/11) — 삭제 skip")
    void belowLegalMin_skips() {
        setMonths(-1, 11, 0, 6);
        scheduler.purgeExpiredLogs();
        verify(webLogRepository, never()).deleteOldLogs(org.mockito.ArgumentMatchers.anyInt());
        verify(sysLogRepository, never()).deleteOldLogs(org.mockito.ArgumentMatchers.anyInt());
        verify(loginLogRepository, never()).deleteOldLogs(org.mockito.ArgumentMatchers.anyInt());
        verify(userLogRepository, never()).deleteOldLogs(org.mockito.ArgumentMatchers.anyInt());
    }

    @Test
    @DisplayName("법정 최저 이상(12/24) — 해당 월수로 삭제 수행")
    void atOrAboveLegalMin_deletes() {
        setMonths(12, 24, 12, 13);
        scheduler.purgeExpiredLogs();
        verify(webLogRepository).deleteOldLogs(12);
        verify(sysLogRepository).deleteOldLogs(24);
        verify(loginLogRepository).deleteOldLogs(12);
        verify(userLogRepository).deleteOldLogs(13);
    }
}
