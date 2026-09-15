package nuri.business.service.notification.dashboard;

import nuri.business.domain.notification.NotificationRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
@DisplayName("NotificationPendingAlertContributor 단위 테스트")
class NotificationPendingAlertContributorTest {

    @Mock
    private NotificationRepository notificationRepository;

    @InjectMocks
    private NotificationPendingAlertContributor contributor;

    /** 읽지 않음 판정은 종전 {@code RealTimeDashboardService} 와 같은 {@code read_yn='N'} 이다. */
    @Test
    @DisplayName("읽지 않은 알림만 센다")
    void countsUnreadNotifications() {
        given(notificationRepository.countByReadYn("N")).willReturn(12L);

        assertThat(contributor.countPendingAlerts()).isEqualTo(12L);
    }
}
