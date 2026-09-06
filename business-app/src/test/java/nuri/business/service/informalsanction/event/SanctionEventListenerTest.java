package nuri.business.service.informalsanction.event;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import nuri.business.service.mail.MailService;
import nuri.business.service.mail.dto.SentMailDto;
import nuri.business.service.sms.SmsService;
import nuri.business.service.sms.dto.SmsDto;
import nuri.business.service.user.UserService;
import nuri.business.service.user.dto.UserDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.LoggerFactory;



import static org.assertj.core.api.Assertions.assertThat;
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

    /** 앱 내 알림은 NotificationService 주입 대신 foundation 이벤트로 요청한다. */
    @Mock
    private org.springframework.context.ApplicationEventPublisher eventPublisher;

    /** 발신 번호는 설정 주입이라 @InjectMocks 가 채울 수 없다 — 값을 준 생성자로 직접 만든다. */
    private static final String SENDER_TEL = "0212340000";

    private SanctionEventListener sanctionEventListener;

    @org.junit.jupiter.api.BeforeEach
    void setUp() {
        sanctionEventListener = new SanctionEventListener(
                userService, smsService, mailService, eventPublisher, SENDER_TEL);
    }

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
        org.mockito.ArgumentCaptor<SmsDto> smsCaptor = org.mockito.ArgumentCaptor.forClass(SmsDto.class);
        org.mockito.ArgumentCaptor<SentMailDto> mailCaptor = org.mockito.ArgumentCaptor.forClass(SentMailDto.class);
        verify(smsService).sendSms(eq("SANCTIONER_001"), smsCaptor.capture());
        verify(mailService).sendMail(eq("SANCTIONER_001"), mailCaptor.capture());

        // 발신 번호는 설정값이다 — 코드에 박힌 대표번호가 아니다.
        assertThat(smsCaptor.getValue().getSndngTelno()).isEqualTo(SENDER_TEL);
        // [2026-09-05] 사용자에게 가는 본문에 enum 상수명(APPROVED)과 내부 ID 표기가 실리지 않고,
        //   승인에는 사유 절이 붙지 않는다.
        assertThat(smsCaptor.getValue().getSndngCn())
                .contains("결재(번호 1)가 승인되었습니다.")
                .doesNotContain("APPROVED")
                .doesNotContain("ID:")
                .doesNotContain("사유");
        assertThat(mailCaptor.getValue().getEmailCn()).isEqualTo(smsCaptor.getValue().getSndngCn());
        // SMTP From 은 MailService 가 설정에서 정한다 — 리스너가 주소를 지어내지 않는다.
        assertThat(mailCaptor.getValue().getDsptchPerson()).isNull();
    }

    @Test
    @DisplayName("반려 본문은 한국어 상태명과 반려 사유를 싣는다")
    void rejectionMessageCarriesKoreanStatusAndReason() {
        SanctionStatusChangedEvent event = new SanctionStatusChangedEvent(
                3L, "USER_001", "SANCTIONER_001",
                nuri.business.domain.informalsanction.SanctionStatus.REJECTED, "예산 코드 누락");
        given(userService.getUserById("USER_001")).willReturn(UserDto.builder()
                .userId("USER_001").userNm("홍길동").mblTelno("01011112222").emlAddr("hong@egov.com").build());

        sanctionEventListener.handleStatusChanged(event);

        org.mockito.ArgumentCaptor<SmsDto> smsCaptor = org.mockito.ArgumentCaptor.forClass(SmsDto.class);
        verify(smsService).sendSms(eq("SANCTIONER_001"), smsCaptor.capture());
        assertThat(smsCaptor.getValue().getSndngCn())
                .contains("결재(번호 3)가 반려되었습니다. 반려 사유: 예산 코드 누락")
                .doesNotContain("REJECTED");
    }

    @Test
    @DisplayName("발신 번호가 설정되지 않으면 문자만 건너뛰고 메일·앱 내 알림은 발송한다")
    void skipsSmsWhenSenderTelIsNotConfigured() {
        SanctionEventListener unconfigured = new SanctionEventListener(
                userService, smsService, mailService, eventPublisher, " ");
        SanctionStatusChangedEvent event = new SanctionStatusChangedEvent(
                4L, "USER_001", "SANCTIONER_001",
                nuri.business.domain.informalsanction.SanctionStatus.APPROVED, null);
        given(userService.getUserById("USER_001")).willReturn(UserDto.builder()
                .userId("USER_001").userNm("홍길동").mblTelno("01011112222").emlAddr("hong@egov.com").build());

        unconfigured.handleStatusChanged(event);

        verify(smsService, never()).sendSms(anyString(), any());
        verify(mailService).sendMail(eq("SANCTIONER_001"), any(SentMailDto.class));
        verify(eventPublisher).publishEvent(any(nuri.foundation.core.event.NotificationRequestedEvent.class));
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

    // ------------------------------------------------------------------
    // 앱 내 알림.
    //
    // 이 배포에는 실 SMS 게이트웨이가 없고 메일도 설정에 따라 비활성이라, 앱 내 알림이
    // 사실상 유일하게 도달하는 통지다. 그래서 연락처 유무·외부 발송 성패와 독립이어야 한다.
    // ------------------------------------------------------------------

    @Test
    @DisplayName("결재 상태 변경 시 신청자에게 앱 내 알림을 요청한다")
    void requestsInAppNotificationForApplicant() {
        SanctionStatusChangedEvent event = new SanctionStatusChangedEvent(
                7L, "USER_001", "SANCTIONER_001",
                nuri.business.domain.informalsanction.SanctionStatus.APPROVED, "승인되었습니다.");
        given(userService.getUserById("USER_001")).willReturn(UserDto.builder()
                .userId("USER_001").userNm("홍길동").mblTelno("").emlAddr(null).build());

        sanctionEventListener.handleStatusChanged(event);

        org.mockito.ArgumentCaptor<nuri.foundation.core.event.NotificationRequestedEvent> captor =
                org.mockito.ArgumentCaptor.forClass(nuri.foundation.core.event.NotificationRequestedEvent.class);
        verify(eventPublisher).publishEvent(captor.capture());
        assertThat(captor.getValue().receiverEsntlId()).isEqualTo("USER_001");
        assertThat(captor.getValue().content()).contains("7").contains("승인되었습니다.");
        assertThat(captor.getValue().linkUrl()).isEqualTo("/approvals");
    }

    /**
     * SMS·메일 블록은 사용자 조회부터 발송까지를 한 try 로 감싼다. 그 안에서 예외가 나면
     * 통째로 빠져나오는데, 앱 내 알림까지 같은 try 에 있으면 <b>가장 중요한 경로가 부수적인
     * 실패에 함께 묻힌다</b>. 별도 경로임을 고정한다.
     */
    @Test
    @DisplayName("사용자 조회가 실패해도 앱 내 알림 요청은 살아 있다")
    void requestsInAppNotificationEvenWhenUserLookupFails() {
        SanctionStatusChangedEvent event = new SanctionStatusChangedEvent(
                9L, "USER_002", "SANCTIONER_001",
                nuri.business.domain.informalsanction.SanctionStatus.REJECTED, null);
        given(userService.getUserById("USER_002")).willThrow(new IllegalStateException("user store down"));

        sanctionEventListener.handleStatusChanged(event);

        org.mockito.ArgumentCaptor<nuri.foundation.core.event.NotificationRequestedEvent> captor =
                org.mockito.ArgumentCaptor.forClass(nuri.foundation.core.event.NotificationRequestedEvent.class);
        verify(eventPublisher).publishEvent(captor.capture());
        assertThat(captor.getValue().receiverEsntlId()).isEqualTo("USER_002");
        assertThat(captor.getValue().content()).contains("사유: 없음");
    }

    @Test
    @DisplayName("최대 길이 반려 사유도 SMS·메일·앱 알림의 최종 본문 한도를 넘지 않는다")
    void boundsFinalChannelMessagesForMaximumReason() {
        SanctionStatusChangedEvent event = new SanctionStatusChangedEvent(
                10L, "USER_003", "SANCTIONER_001",
                nuri.business.domain.informalsanction.SanctionStatus.REJECTED, "가".repeat(4_000));
        given(userService.getUserById("USER_003")).willReturn(UserDto.builder()
                .userId("USER_003")
                .mblTelno("01011112222")
                .emlAddr("user3@egov.com")
                .build());

        sanctionEventListener.handleStatusChanged(event);

        org.mockito.ArgumentCaptor<SmsDto> smsCaptor = org.mockito.ArgumentCaptor.forClass(SmsDto.class);
        org.mockito.ArgumentCaptor<SentMailDto> mailCaptor = org.mockito.ArgumentCaptor.forClass(SentMailDto.class);
        org.mockito.ArgumentCaptor<nuri.foundation.core.event.NotificationRequestedEvent> appCaptor =
                org.mockito.ArgumentCaptor.forClass(nuri.foundation.core.event.NotificationRequestedEvent.class);
        verify(smsService).sendSms(eq("SANCTIONER_001"), smsCaptor.capture());
        verify(mailService).sendMail(eq("SANCTIONER_001"), mailCaptor.capture());
        verify(eventPublisher).publishEvent(appCaptor.capture());

        assertThat(smsCaptor.getValue().getSndngCn())
                .hasSize(4_000)
                .startsWith("[eGov Enterprise]")
                .endsWith("가");
        assertThat(mailCaptor.getValue().getEmailCn())
                .hasSize(4_000)
                .startsWith("[eGov Enterprise]")
                .endsWith("가");
        assertThat(appCaptor.getValue().content())
                .hasSize(4_000)
                .startsWith("결재(번호 10)")
                .endsWith("가");
    }

    @Test
    @DisplayName("SMS 채널 실패가 메일과 앱 내 알림을 막지 않는다")
    void smsFailureDoesNotSkipOtherChannels() {
        SanctionStatusChangedEvent event = new SanctionStatusChangedEvent(
                11L, "USER_004", "SANCTIONER_001",
                nuri.business.domain.informalsanction.SanctionStatus.REJECTED, "반려 사유");
        given(userService.getUserById("USER_004")).willReturn(UserDto.builder()
                .userId("USER_004")
                .mblTelno("01011112222")
                .emlAddr("user4@egov.com")
                .build());
        doThrow(new IllegalStateException("sms unavailable"))
                .when(smsService).sendSms(eq("SANCTIONER_001"), any(SmsDto.class));

        sanctionEventListener.handleStatusChanged(event);

        verify(mailService).sendMail(eq("SANCTIONER_001"), any(SentMailDto.class));
        verify(eventPublisher).publishEvent(any(nuri.foundation.core.event.NotificationRequestedEvent.class));
    }

    @Test
    @DisplayName("로그에는 결재 번호·상태·예외 타입만 남기고 외부 문자열과 개행을 기록하지 않는다")
    void logsOnlySafeSanctionMetadata() {
        Logger logger = (Logger) LoggerFactory.getLogger(SanctionEventListener.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);

        String successApplicant = "PII_APPLICANT_SUCCESS\r\nFORGED_APPLICANT_SUCCESS";
        String failedApplicant = "PII_APPLICANT_LOOKUP\r\nFORGED_APPLICANT_LOOKUP";
        String channelApplicant = "PII_APPLICANT_CHANNEL\r\nFORGED_APPLICANT_CHANNEL";
        String missingApplicant = "PII_APPLICANT_MISSING\r\nFORGED_APPLICANT_MISSING";
        String reason = "PII_REASON\r\nFORGED_REASON";
        UserDto user = UserDto.builder()
                .userId("PII_USER_ID")
                .userNm("PII_USER_NAME")
                .mblTelno("01098765432")
                .emlAddr("pii-mail-marker@secret.invalid")
                .build();

        try {
            given(userService.getUserById(successApplicant)).willReturn(user);
            sanctionEventListener.handleStatusChanged(new SanctionStatusChangedEvent(
                    71L, successApplicant, "PII_ACTOR",
                    nuri.business.domain.informalsanction.SanctionStatus.REJECTED, reason));

            given(userService.getUserById(failedApplicant))
                    .willThrow(new IllegalStateException("PII_LOOKUP_EXCEPTION\r\nFORGED_LOOKUP_EXCEPTION"));
            sanctionEventListener.handleStatusChanged(new SanctionStatusChangedEvent(
                    72L, failedApplicant, "PII_ACTOR",
                    nuri.business.domain.informalsanction.SanctionStatus.REJECTED, reason));

            given(userService.getUserById(channelApplicant)).willReturn(user);
            doThrow(new IllegalArgumentException("PII_SMS_EXCEPTION\r\nFORGED_SMS_EXCEPTION"))
                    .when(smsService).sendSms(anyString(), any(SmsDto.class));
            doThrow(new UnsupportedOperationException("PII_MAIL_EXCEPTION\r\nFORGED_MAIL_EXCEPTION"))
                    .when(mailService).sendMail(anyString(), any(SentMailDto.class));
            doThrow(new SecurityException("PII_APP_EXCEPTION\r\nFORGED_APP_EXCEPTION"))
                    .when(eventPublisher)
                    .publishEvent(any(nuri.foundation.core.event.NotificationRequestedEvent.class));
            sanctionEventListener.handleStatusChanged(new SanctionStatusChangedEvent(
                    73L, channelApplicant, "PII_ACTOR",
                    nuri.business.domain.informalsanction.SanctionStatus.REJECTED, reason));

            given(userService.getUserById(missingApplicant)).willReturn(null);
            sanctionEventListener.handleStatusChanged(new SanctionStatusChangedEvent(
                    74L, missingApplicant, "PII_ACTOR",
                    nuri.business.domain.informalsanction.SanctionStatus.REJECTED, reason));
        } finally {
            logger.detachAppender(appender);
            appender.stop();
        }

        java.util.Set<Object> allowedArguments = java.util.Set.of(
                71L, 72L, 73L, 74L,
                nuri.business.domain.informalsanction.SanctionStatus.REJECTED,
                "IllegalStateException", "IllegalArgumentException",
                "UnsupportedOperationException", "SecurityException");
        assertThat(appender.list).isNotEmpty();
        for (ILoggingEvent loggingEvent : appender.list) {
            assertThat(loggingEvent.getThrowableProxy())
                    .as("Throwable 원문/stack은 로그 이벤트에 결합하지 않는다: %s",
                            loggingEvent.getFormattedMessage())
                    .isNull();
            assertThat(loggingEvent.getFormattedMessage())
                    .as("외부 문자열의 개행으로 별도 로그 행을 위조할 수 없어야 한다")
                    .doesNotContain("\r", "\n");
            for (Object argument : loggingEvent.getArgumentArray()) {
                assertThat(allowedArguments)
                        .as("동적 로그 인자는 결재 번호·상태·예외 타입으로 제한한다")
                        .contains(argument);
            }
        }

        String formattedLogs = appender.list.stream()
                .map(ILoggingEvent::getFormattedMessage)
                .collect(java.util.stream.Collectors.joining("|"));
        assertThat(formattedLogs)
                .contains("sanctionSn=71", "status=REJECTED", "exceptionType=IllegalStateException",
                        "exceptionType=IllegalArgumentException", "exceptionType=UnsupportedOperationException",
                        "exceptionType=SecurityException")
                .doesNotContain("PII_", "FORGED_", "98765432", "secret.invalid");
    }
}
