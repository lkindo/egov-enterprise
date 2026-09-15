package nuri.business.service.informalsanction.event;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import nuri.business.service.user.UserService;
import nuri.business.service.user.dto.UserDto;
import nuri.foundation.core.event.MailRequestedEvent;
import nuri.foundation.core.event.NotificationRequestedEvent;
import nuri.foundation.core.event.SmsRequestedEvent;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.LoggerFactory;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

/**
 * 이 리스너는 세 채널을 모두 <b>foundation 이벤트 발행</b>으로 요청한다.
 *
 * <p>종전에는 {@code SmsService}·{@code MailService} 를 주입해 직접 불렀고, 그 두 주입이 GAP-ARCH-001 의
 * 잔여 app→app 결합 4건 중 둘이었다. 실제 발송은 {@code SmsRequestListener}·{@code MailRequestListener}
 * 가 소유하므로 발신 번호 미설정 같은 채널 규칙은 그쪽 테스트가 고정한다 — 여기서는 <b>무엇을 요청하는가</b>만 본다.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("SanctionEventListener 단위 테스트")
class SanctionEventListenerTest {

    @Mock
    private UserService userService;

    /** 문자·메일·앱 내 알림이 모두 이 발행자를 지난다. 채널 구분은 이벤트 타입으로 한다. */
    @Mock
    private org.springframework.context.ApplicationEventPublisher eventPublisher;

    private SanctionEventListener sanctionEventListener;

    @org.junit.jupiter.api.BeforeEach
    void setUp() {
        sanctionEventListener = new SanctionEventListener(userService, eventPublisher);
    }

    /** 발행된 이벤트 중 해당 타입만 순서대로 모은다. */
    private <T> List<T> published(Class<T> type) {
        ArgumentCaptor<Object> captor = ArgumentCaptor.forClass(Object.class);
        verify(eventPublisher, atLeast(0)).publishEvent(captor.capture());
        return captor.getAllValues().stream().filter(type::isInstance).map(type::cast).toList();
    }

    private <T> T onlyPublished(Class<T> type) {
        List<T> events = published(type);
        assertThat(events).as("%s 는 정확히 한 번 발행돼야 합니다", type.getSimpleName()).hasSize(1);
        return events.get(0);
    }

    @Test
    @DisplayName("결재 상태 변경 시 문자·메일 발송을 요청한다")
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
        SmsRequestedEvent sms = onlyPublished(SmsRequestedEvent.class);
        MailRequestedEvent mail = onlyPublished(MailRequestedEvent.class);
        assertThat(sms.requesterId()).isEqualTo("SANCTIONER_001");
        assertThat(mail.requesterId()).isEqualTo("SANCTIONER_001");

        // 수신처는 발행 측이 해석해 싣는다 — 소비 도메인이 연락처를 다시 조회하지 않는다.
        assertThat(sms.recipientTelno()).isEqualTo("01011112222");
        assertThat(mail.recipientAddress()).isEqualTo("hong@egov.com");

        // [2026-09-05] 사용자에게 가는 본문에 enum 상수명(APPROVED)과 내부 ID 표기가 실리지 않고,
        //   승인에는 사유 절이 붙지 않는다.
        assertThat(sms.content())
                .contains("결재(번호 1)가 승인되었습니다.")
                .doesNotContain("APPROVED")
                .doesNotContain("ID:")
                .doesNotContain("사유");
        assertThat(mail.content()).isEqualTo(sms.content());
        assertThat(mail.subject()).isEqualTo("[eGov] 결재 상태 변경 알림");
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

        assertThat(onlyPublished(SmsRequestedEvent.class).content())
                .contains("결재(번호 3)가 반려되었습니다. 반려 사유: 예산 코드 누락")
                .doesNotContain("REJECTED");
    }

    @Test
    @DisplayName("actor 가 비어 있으면 SYSTEM 으로 폴백한다")
    void fallsBackToSystemWhenActorAbsent() {
        // Given — 배치·시스템 트리거처럼 사람 actor 가 없는 경로.
        SanctionStatusChangedEvent event = new SanctionStatusChangedEvent(
                2L, "USER_001", null,
                nuri.business.domain.informalsanction.SanctionStatus.APPROVED, "승인되었습니다.");

        given(userService.getUserById("USER_001")).willReturn(UserDto.builder()
                .userId("USER_001")
                .userNm("홍길동")
                .mblTelno("01011112222")
                .emlAddr("hong@egov.com")
                .build());

        // When
        sanctionEventListener.handleStatusChanged(event);

        // Then
        assertThat(onlyPublished(SmsRequestedEvent.class).requesterId()).isEqualTo("SYSTEM");
        assertThat(onlyPublished(MailRequestedEvent.class).requesterId()).isEqualTo("SYSTEM");
    }

    @Test
    @DisplayName("사용자 정보가 없는 경우 외부 채널을 요청하지 않음")
    void handleStatusChangedNoUserTest() {
        // Given
        SanctionStatusChangedEvent event = new SanctionStatusChangedEvent(
                1L, "USER_001", "SANCTIONER_001", nuri.business.domain.informalsanction.SanctionStatus.APPROVED, "승인되었습니다.");

        given(userService.getUserById("USER_001")).willReturn(null);

        // When
        sanctionEventListener.handleStatusChanged(event);

        // Then
        assertThat(published(SmsRequestedEvent.class)).isEmpty();
        assertThat(published(MailRequestedEvent.class)).isEmpty();
    }

    @Test
    @DisplayName("연락처 정보가 없는 경우 해당 수단을 요청하지 않음")
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

        // Then — 수신처 없는 요청은 보낼 곳이 없는 이력만 남긴다. 발행 자체를 하지 않는다.
        assertThat(published(SmsRequestedEvent.class)).isEmpty();
        assertThat(published(MailRequestedEvent.class)).isEmpty();
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

        NotificationRequestedEvent requested = onlyPublished(NotificationRequestedEvent.class);
        assertThat(requested.receiverEsntlId()).isEqualTo("USER_001");
        assertThat(requested.content()).contains("7").contains("승인되었습니다.");
        assertThat(requested.linkUrl()).isEqualTo("/approvals");
    }

    /**
     * 사용자 조회부터 외부 채널 요청까지가 한 경로다. 그 안에서 예외가 나면 통째로 빠져나오는데,
     * 앱 내 알림까지 같은 경로에 있으면 <b>가장 중요한 경로가 부수적인 실패에 함께 묻힌다</b>.
     * 별도 경로임을 고정한다.
     */
    @Test
    @DisplayName("사용자 조회가 실패해도 앱 내 알림 요청은 살아 있다")
    void requestsInAppNotificationEvenWhenUserLookupFails() {
        SanctionStatusChangedEvent event = new SanctionStatusChangedEvent(
                9L, "USER_002", "SANCTIONER_001",
                nuri.business.domain.informalsanction.SanctionStatus.REJECTED, null);
        given(userService.getUserById("USER_002")).willThrow(new IllegalStateException("user store down"));

        sanctionEventListener.handleStatusChanged(event);

        NotificationRequestedEvent requested = onlyPublished(NotificationRequestedEvent.class);
        assertThat(requested.receiverEsntlId()).isEqualTo("USER_002");
        assertThat(requested.content()).contains("사유: 없음");
    }

    @Test
    @DisplayName("최대 길이 반려 사유도 문자·메일·앱 알림의 최종 본문 한도를 넘지 않는다")
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

        assertThat(onlyPublished(SmsRequestedEvent.class).content())
                .hasSize(4_000)
                .startsWith("[eGov Enterprise]")
                .endsWith("가");
        assertThat(onlyPublished(MailRequestedEvent.class).content())
                .hasSize(4_000)
                .startsWith("[eGov Enterprise]")
                .endsWith("가");
        assertThat(onlyPublished(NotificationRequestedEvent.class).content())
                .hasSize(4_000)
                .startsWith("결재(번호 10)")
                .endsWith("가");
    }

    @Test
    @DisplayName("문자 요청 실패가 메일과 앱 내 알림을 막지 않는다")
    void smsFailureDoesNotSkipOtherChannels() {
        SanctionStatusChangedEvent event = new SanctionStatusChangedEvent(
                11L, "USER_004", "SANCTIONER_001",
                nuri.business.domain.informalsanction.SanctionStatus.REJECTED, "반려 사유");
        given(userService.getUserById("USER_004")).willReturn(UserDto.builder()
                .userId("USER_004")
                .mblTelno("01011112222")
                .emlAddr("user4@egov.com")
                .build());
        // 동기 리스너의 예외는 발행 호출로 되돌아온다 — 그 실패가 나머지 채널을 삼키면 안 된다.
        doThrow(new IllegalStateException("sms unavailable"))
                .when(eventPublisher).publishEvent(any(SmsRequestedEvent.class));

        sanctionEventListener.handleStatusChanged(event);

        assertThat(published(MailRequestedEvent.class)).hasSize(1);
        assertThat(published(NotificationRequestedEvent.class)).hasSize(1);
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
                    .when(eventPublisher).publishEvent(any(SmsRequestedEvent.class));
            doThrow(new UnsupportedOperationException("PII_MAIL_EXCEPTION\r\nFORGED_MAIL_EXCEPTION"))
                    .when(eventPublisher).publishEvent(any(MailRequestedEvent.class));
            doThrow(new SecurityException("PII_APP_EXCEPTION\r\nFORGED_APP_EXCEPTION"))
                    .when(eventPublisher).publishEvent(any(NotificationRequestedEvent.class));
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
