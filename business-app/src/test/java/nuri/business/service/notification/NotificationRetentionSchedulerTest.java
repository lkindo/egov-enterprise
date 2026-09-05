package nuri.business.service.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import nuri.business.domain.notification.NotificationRepository;

/**
 * NotificationRetentionScheduler 안전 가드 단위 테스트 (DEC-OPS-038).
 * 핵심: read-months 가 1 미만이면 삭제를 건너뛰어 '읽은 알림 전량파기 사고'를 막고,
 * 설정되면 읽은 알림만 보존월 이전 cutoff 로 지운다.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("NotificationRetentionScheduler read-months 하한 가드")
class NotificationRetentionSchedulerTest {

    @Mock private NotificationRepository notificationRepository;
    @InjectMocks private NotificationRetentionScheduler scheduler;

    private void setMonths(int months) {
        ReflectionTestUtils.setField(scheduler, "readMonths", months);
    }

    @Test
    @DisplayName("미설정(0) — 삭제 skip (전량파기 방지)")
    void unset_skips() {
        setMonths(0);
        scheduler.purgeReadNotifications();
        verify(notificationRepository, never()).deleteReadBefore(any());
    }

    @Test
    @DisplayName("음수 — 삭제 skip")
    void negative_skips() {
        setMonths(-3);
        scheduler.purgeReadNotifications();
        verify(notificationRepository, never()).deleteReadBefore(any());
    }

    @Test
    @DisplayName("설정(6개월) — 6개월 이전 cutoff 로 읽은 알림만 삭제")
    void configured_deletesReadBeforeCutoff() {
        setMonths(6);
        when(notificationRepository.deleteReadBefore(any())).thenReturn(42);

        scheduler.purgeReadNotifications();

        ArgumentCaptor<LocalDateTime> cutoff = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(notificationRepository).deleteReadBefore(cutoff.capture());
        LocalDateTime expected = LocalDateTime.now(ZoneId.of("Asia/Seoul")).minusMonths(6);
        assertThat(ChronoUnit.MINUTES.between(cutoff.getValue(), expected)).isBetween(-5L, 5L);
    }
}
