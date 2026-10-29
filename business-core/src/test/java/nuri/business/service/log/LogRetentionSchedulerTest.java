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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
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

    @Mock private nuri.business.domain.log.SensitiveAuditLogRepository sensitiveAuditLogRepository;
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

    @Test
    @DisplayName("첫 테이블 정리가 실패해도 나머지 정리를 시도한 뒤 실패를 전달한다")
    void firstFailureDoesNotSkipRemainingRetentionPolicies() {
        setMonths(12, 24, 12, 13, 24);
        ReflectionTestUtils.setField(scheduler, "sensitiveMonths", 24);
        var webFailure = new IllegalStateException("web retention unavailable");
        doThrow(webFailure).when(webLogRepository).deleteOldLogs(12);

        Throwable failure = catchThrowable(scheduler::purgeExpiredLogs);

        verify(webLogRepository).deleteOldLogs(12);
        verify(sysLogRepository).deleteOldLogs(24);
        verify(loginLogRepository).deleteOldLogs(12);
        verify(userLogRepository).deleteOldLogs(13);
        verify(privacyLogRepository).deleteOldLogs(24);
        verify(sensitiveAuditLogRepository).deleteBefore(any());
        assertThat(failure).isInstanceOf(RuntimeException.class);
        assertThat(failure.getSuppressed()).containsExactly(webFailure);
    }

    @Test
    @DisplayName("여러 테이블의 정리 실패를 마지막 민감 감사 정리까지 모아 전달한다")
    void multipleFailuresArePreservedAfterEveryTableIsAttempted() {
        setMonths(24, 24, 24, 24, 24);
        ReflectionTestUtils.setField(scheduler, "sensitiveMonths", 24);
        var webFailure = new IllegalStateException("web retention unavailable");
        var privacyFailure = new IllegalArgumentException("privacy retention unavailable");
        var sensitiveFailure = new IllegalStateException("sensitive retention unavailable");
        doThrow(webFailure).when(webLogRepository).deleteOldLogs(24);
        doThrow(privacyFailure).when(privacyLogRepository).deleteOldLogs(24);
        doThrow(sensitiveFailure).when(sensitiveAuditLogRepository).deleteBefore(any());

        Throwable failure = catchThrowable(scheduler::purgeExpiredLogs);

        verify(webLogRepository).deleteOldLogs(24);
        verify(sysLogRepository).deleteOldLogs(24);
        verify(loginLogRepository).deleteOldLogs(24);
        verify(userLogRepository).deleteOldLogs(24);
        verify(privacyLogRepository).deleteOldLogs(24);
        verify(sensitiveAuditLogRepository).deleteBefore(any());
        assertThat(failure).isInstanceOf(RuntimeException.class);
        assertThat(failure.getSuppressed()).containsExactly(webFailure, privacyFailure, sensitiveFailure);
    }

    @Test
    @DisplayName("다른 테이블이 실패해도 12개월·24개월 보존 하한은 그대로 지킨다")
    void failureDoesNotBypassRetentionMinimums() {
        setMonths(12, 11, 0, -1, 11);
        ReflectionTestUtils.setField(scheduler, "sensitiveMonths", 23);
        var webFailure = new IllegalStateException("web retention unavailable");
        doThrow(webFailure).when(webLogRepository).deleteOldLogs(12);

        Throwable failure = catchThrowable(scheduler::purgeExpiredLogs);

        verify(sysLogRepository, never()).deleteOldLogs(org.mockito.ArgumentMatchers.anyInt());
        verify(loginLogRepository, never()).deleteOldLogs(org.mockito.ArgumentMatchers.anyInt());
        verify(userLogRepository, never()).deleteOldLogs(org.mockito.ArgumentMatchers.anyInt());
        verify(privacyLogRepository, never()).deleteOldLogs(org.mockito.ArgumentMatchers.anyInt());
        verify(sensitiveAuditLogRepository, never()).deleteBefore(any());
        assertThat(failure).isInstanceOf(RuntimeException.class);
        assertThat(failure.getSuppressed()).containsExactly(webFailure);
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
    @Test
    void sensitiveRetentionCannotBeReducedBelow24Months() {
        ReflectionTestUtils.setField(scheduler, "sensitiveMonths", 23);
        scheduler.purgeExpiredLogs();
        verify(sensitiveAuditLogRepository, never()).deleteBefore(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void sensitiveRetentionUses24CalendarMonths() {
        var before = java.time.LocalDateTime.now().minusMonths(24);
        ReflectionTestUtils.setField(scheduler, "sensitiveMonths", 24);
        scheduler.purgeExpiredLogs();
        var cutoff = org.mockito.ArgumentCaptor.forClass(java.time.LocalDateTime.class);
        verify(sensitiveAuditLogRepository).deleteBefore(cutoff.capture());
        org.assertj.core.api.Assertions.assertThat(cutoff.getValue()).isBetween(before, java.time.LocalDateTime.now().minusMonths(24));
    }
}
