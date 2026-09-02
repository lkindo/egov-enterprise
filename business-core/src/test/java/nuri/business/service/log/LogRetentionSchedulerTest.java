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
    /** [2026-09-02] 개인정보 접근 로그가 파기 대상에 편입됐다 — 종전에는 파기 경로 자체가 없었다. */
    @Mock private nuri.business.domain.log.PrivacyLogRepository privacyLogRepository;

    @InjectMocks private LogRetentionScheduler scheduler;

    private void setMonths(int web, int sys, int login, int user, int privacy) {
        ReflectionTestUtils.setField(scheduler, "webMonths", web);
        ReflectionTestUtils.setField(scheduler, "sysMonths", sys);
        ReflectionTestUtils.setField(scheduler, "loginMonths", login);
        ReflectionTestUtils.setField(scheduler, "userMonths", user);
        ReflectionTestUtils.setField(scheduler, "privacyMonths", privacy);
    }

    @Test
    @DisplayName("미설정(0) — 전 테이블 삭제 skip (전량파기 방지)")
    void unset_skipsAll() {
        setMonths(0, 0, 0, 0, 0);
        scheduler.purgeExpiredLogs();
        verify(webLogRepository, never()).deleteOldLogs(org.mockito.ArgumentMatchers.anyInt());
        verify(sysLogRepository, never()).deleteOldLogs(org.mockito.ArgumentMatchers.anyInt());
        verify(loginLogRepository, never()).deleteOldLogs(org.mockito.ArgumentMatchers.anyInt());
        verify(userLogRepository, never()).deleteOldLogs(org.mockito.ArgumentMatchers.anyInt());
        verify(privacyLogRepository, never()).deleteOldLogs(org.mockito.ArgumentMatchers.anyInt());
    }

    @Test
    @DisplayName("법정 최저 미만(음수/11) — 삭제 skip")
    void belowLegalMin_skips() {
        setMonths(-1, 11, 0, 6, 11);
        scheduler.purgeExpiredLogs();
        verify(webLogRepository, never()).deleteOldLogs(org.mockito.ArgumentMatchers.anyInt());
        verify(sysLogRepository, never()).deleteOldLogs(org.mockito.ArgumentMatchers.anyInt());
        verify(loginLogRepository, never()).deleteOldLogs(org.mockito.ArgumentMatchers.anyInt());
        verify(userLogRepository, never()).deleteOldLogs(org.mockito.ArgumentMatchers.anyInt());
        // 개인정보 접근 증적은 법정 최저 보존기간이 있다 — 11개월 설정으로 전량파기되면 안 된다.
        verify(privacyLogRepository, never()).deleteOldLogs(org.mockito.ArgumentMatchers.anyInt());
    }

    @Test
    @DisplayName("법정 최저 이상(12/24) — 해당 월수로 삭제 수행")
    void atOrAboveLegalMin_deletes() {
        setMonths(12, 24, 12, 13, 24);
        scheduler.purgeExpiredLogs();
        verify(webLogRepository).deleteOldLogs(12);
        verify(sysLogRepository).deleteOldLogs(24);
        verify(loginLogRepository).deleteOldLogs(12);
        verify(userLogRepository).deleteOldLogs(13);
        verify(privacyLogRepository).deleteOldLogs(24);
    }

    /**
     * 다른 네 테이블만 파기하고 개인정보 로그만 빠지는 회귀를 막는다. 리스너가 기록을 시작한 뒤라
     * 이 한 줄이 빠지면 접근 증적이 무한히 쌓인다.
     */
    @Test
    @DisplayName("개인정보 로그만 미설정이면 그 테이블만 건너뛰고 나머지는 정리한다")
    void privacyUnset_skipsOnlyPrivacy() {
        setMonths(24, 24, 24, 24, 0);
        scheduler.purgeExpiredLogs();
        verify(webLogRepository).deleteOldLogs(24);
        verify(privacyLogRepository, never()).deleteOldLogs(org.mockito.ArgumentMatchers.anyInt());
    }
}
