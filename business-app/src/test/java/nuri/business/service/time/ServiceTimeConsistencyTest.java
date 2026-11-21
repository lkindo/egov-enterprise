package nuri.business.service.time;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.verify;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.TimeZone;
import nuri.business.domain.event.ExternalHr;
import nuri.business.domain.promotion.popup.Popup;
import nuri.business.domain.promotion.popup.PopupDomainRepository;
import nuri.business.service.promotion.popup.PopupService;
import nuri.foundation.core.util.ServiceTime;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;

@DisplayName("JVM 기본 시간대가 UTC 여도 Asia/Seoul 기준 날짜·시각을 사용하는지 검증")
class ServiceTimeConsistencyTest {

    @Test
    @DisplayName("UTC 2026-11-21T16:00Z 는 KST 2026-11-22 01:00 이므로 PopupService 와 ExternalHr 가 2026-11-22 기준으로 동작한다")
    void utcJvmStillUsesAsiaSeoulForPopupAndExternalHr() {
        TimeZone previous = TimeZone.getDefault();
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
        Instant kstNextDayUtc = Instant.parse("2026-11-21T16:00:00Z");
        Clock fixedKst = Clock.fixed(kstNextDayUtc, ZoneId.of("Asia/Seoul"));
        try (MockedStatic<ServiceTime> serviceTime = mockStatic(ServiceTime.class)) {
            serviceTime.when(ServiceTime::clock).thenReturn(fixedKst);
            serviceTime.when(ServiceTime::now).thenReturn(LocalDateTime.ofInstant(kstNextDayUtc, ZoneId.of("Asia/Seoul")));

            PopupDomainRepository popupRepository = mock(PopupDomainRepository.class);
            given(popupRepository.findActivePopups(LocalDate.of(2026, 11, 22))).willReturn(List.of());
            Popup kstTodayOnly = Popup.builder()
                    .popupSn(1L)
                    .popupTtlNm("KST 오늘 시작 팝업")
                    .ntceYn("Y")
                    .ntceBgnde(LocalDate.of(2026, 11, 22))
                    .ntceEndde(LocalDate.of(2026, 11, 23))
                    .build();
            given(popupRepository.findById(1L)).willReturn(Optional.of(kstTodayOnly));

            PopupService popupService = new PopupService(popupRepository, null);
            assertThat(popupService.getActivePopups()).isEmpty();
            verify(popupRepository).findActivePopups(eq(LocalDate.of(2026, 11, 22)));
            assertThat(popupService.getPublishedPopup(1L).getPopupSn()).isEqualTo(1L);

            ExternalHr hr = ExternalHr.builder().evntSn(1L).otsdHrId("HR1").otsdHrNm("홍길동").build();
            assertThat(hr.getCrtDt()).isEqualTo(LocalDateTime.of(2026, 11, 22, 1, 0));
            assertThat(hr.getMdfcnDt()).isEqualTo(LocalDateTime.of(2026, 11, 22, 1, 0));
        } finally {
            TimeZone.setDefault(previous);
        }
    }
}
