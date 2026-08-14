package nuri.business.service.informalsanction.event;

import nuri.business.service.mail.MailService;
import nuri.business.service.mail.dto.SentMailDto;
import nuri.business.service.sms.SmsService;
import nuri.business.service.sms.dto.SmsDto;
import nuri.business.service.user.UserService;
import nuri.business.service.user.dto.UserDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;



import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("SanctionEventListener 단위 테스트")
class SanctionEventListenerTest {

    @Mock
    private UserService userService;

    @Mock
    private SmsService smsService;

    @Mock
    private MailService mailService;

    @InjectMocks
    private SanctionEventListener sanctionEventListener;

    @Test
    @DisplayName("결재 상태 변경 시 SMS 및 메일 알림 발송 테스트")
    void handleStatusChangedTest() {
        // Given
        SanctionStatusChangedEvent event = new SanctionStatusChangedEvent(
                1L, "USER_001", "SANCTIONER_001", nuri.business.domain.informalsanction.SanctionStatus.APPROVED, "승인되었습니다.");

        UserDto userDto = UserDto.builder()
                .userId("USER_001")
                .userNm("홍길동")
                .mblTelno("01011112222")
                .emlAddr("hong@egov.com")
                .build();

        given(userService.getUserById("USER_001")).willReturn(userDto);

        // When
        sanctionEventListener.handleStatusChanged(event);

        // Then
        // [W1-D5] 발송 요청자는 리터럴 "SYSTEM" 이 아니라 **이벤트가 싣고 온 actor(결재자)** 여야 한다.
        //   이 리스너는 @Async 라 SecurityContext 가 없고(TaskDecorator 는 프로덕션에서 의도적 no-op),
        //   그래서 종전에는 실제로 승인/반려한 사람이 발송 이력에서 사라졌다.
        //   전파(Composite 데코레이터) 대신 손해가 확정된 이 지점만 봉합한다.
        verify(smsService).sendSms(eq("SANCTIONER_001"), any(SmsDto.class));
        verify(mailService).sendMail(eq("SANCTIONER_001"), any(SentMailDto.class));
    }

    @Test
    @DisplayName("actor 가 비어 있으면 SYSTEM 으로 폴백한다")
    void fallsBackToSystemWhenActorAbsent() {
        // Given — 배치·시스템 트리거처럼 사람 actor 가 없는 경로.
        SanctionStatusChangedEvent event = new SanctionStatusChangedEvent(
                2L, "USER_001", null,
                nuri.business.domain.informalsanction.SanctionStatus.APPROVED, "승인되었습니다.");

        UserDto userDto = UserDto.builder()
                .userId("USER_001")
                .userNm("홍길동")
                .mblTelno("01011112222")
                .emlAddr("hong@egov.com")
                .build();

        given(userService.getUserById("USER_001")).willReturn(userDto);

        // When
        sanctionEventListener.handleStatusChanged(event);

        // Then
        verify(smsService).sendSms(eq("SYSTEM"), any(SmsDto.class));
        verify(mailService).sendMail(eq("SYSTEM"), any(SentMailDto.class));
    }

    @Test
    @DisplayName("사용자 정보가 없는 경우 알림을 발송하지 않음")
    void handleStatusChangedNoUserTest() {
        // Given
        SanctionStatusChangedEvent event = new SanctionStatusChangedEvent(
                1L, "USER_001", "SANCTIONER_001", nuri.business.domain.informalsanction.SanctionStatus.APPROVED, "승인되었습니다.");

        given(userService.getUserById("USER_001")).willReturn(null);

        // When
        sanctionEventListener.handleStatusChanged(event);

        // Then
        verify(smsService, never()).sendSms(anyString(), any());
        verify(mailService, never()).sendMail(anyString(), any());
    }

    @Test
    @DisplayName("연락처 정보가 없는 경우 해당 수단으로 발송하지 않음")
    void handleStatusChangedNoContactTest() {
        // Given
        SanctionStatusChangedEvent event = new SanctionStatusChangedEvent(
                1L, "USER_001", "SANCTIONER_001", nuri.business.domain.informalsanction.SanctionStatus.APPROVED, "승인되었습니다.");

        UserDto userDto = UserDto.builder()
                .userId("USER_001")
                .userNm("홍길동")
                .mblTelno("") // 휴대폰 없음
                .emlAddr(null) // 이메일 없음
                .build();

        given(userService.getUserById("USER_001")).willReturn(userDto);

        // When
        sanctionEventListener.handleStatusChanged(event);

        // Then
        verify(smsService, never()).sendSms(anyString(), any());
        verify(mailService, never()).sendMail(anyString(), any());
    }
}
