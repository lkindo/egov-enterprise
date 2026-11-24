package nuri.business.service.informalsanction.event;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import nuri.business.domain.informalsanction.InformalSanctionHistory;
import nuri.business.domain.informalsanction.InformalSanctionHistoryId;
import nuri.business.domain.informalsanction.InformalSanctionHistoryRepository;
import nuri.business.domain.informalsanction.SanctionStatus;
import nuri.business.service.user.UserService;
import nuri.business.service.user.dto.UserDto;
import nuri.foundation.core.event.MailRequestedEvent;
import nuri.foundation.core.event.SmsRequestedEvent;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.core.job.DurableWork;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

/**
 * 결재 결과의 문자·메일 요청 작업. 작업은 커밋 뒤 작업자가 실행하고, 완료 기록 전에 끊기면 다시 실행된다.
 * 문구 규칙(한국어 상태명·반려에만 사유·본문 상한)은 종전 {@code SanctionEventListener} 시험에서 옮겼다.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("SanctionExternalNotificationWorkHandler 단위 테스트")
class SanctionExternalNotificationWorkHandlerTest {

    @Mock private UserService userService;
    @Mock private InformalSanctionHistoryRepository historyRepository;
    @Mock private ApplicationEventPublisher eventPublisher;

    private SanctionExternalNotificationWorkHandler handler;

    @BeforeEach
    void setUp() {
        handler = new SanctionExternalNotificationWorkHandler(userService, historyRepository, eventPublisher);
    }

    private static DurableWork work(SanctionStatusChangedEvent event) {
        return new DurableWork(SanctionExternalNotificationWorkHandler.key(event),
                SanctionExternalNotificationWorkHandler.TYPE, SanctionExternalNotificationWorkHandler.payload(event));
    }

    private static SanctionStatusChangedEvent event(long sn, String applicant, String actor, SanctionStatus status,
                                                    String reason) {
        return new SanctionStatusChangedEvent(sn, applicant, actor, status, reason, "문서", BigDecimal.ONE);
    }

    private void historyHas(long sn, String reason) {
        InformalSanctionHistory history = mock(InformalSanctionHistory.class);
        lenient().when(history.getRjctRsnCn()).thenReturn(reason);
        given(historyRepository.findById(new InformalSanctionHistoryId(sn, BigDecimal.ONE))).willReturn(Optional.of(history));
    }

    private static UserDto user(String phone, String mail) {
        return UserDto.builder().userId("USER_001").esntlId("ESNTL_001").userNm("홍길동").mblTelno(phone).emlAddr(mail).build();
    }

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
    @DisplayName("작업 원장에는 식별자만 남고 반려 사유·연락처는 남지 않는다")
    void payloadCarriesReferencesOnly() {
        SanctionStatusChangedEvent event = event(3L, "ESNTL_001", "SANCTIONER_001", SanctionStatus.REJECTED,
                "PII_REASON 예산 코드 누락");

        String payload = SanctionExternalNotificationWorkHandler.payload(event);

        assertThat(payload).contains("\"sanctionSn\":3", "\"status\":\"REJECTED\"", "ESNTL_001", "SANCTIONER_001")
                .doesNotContain("PII_REASON", "예산");
        // 같은 사건은 같은 작업이다.
        assertThat(SanctionExternalNotificationWorkHandler.key(event))
                .isEqualTo(SanctionExternalNotificationWorkHandler.key(event))
                .isNotEqualTo(SanctionExternalNotificationWorkHandler.key(event(3L, "ESNTL_001", "SANCTIONER_001",
                        SanctionStatus.REJECTED, "PII_REASON 예산 코드 누락")));
    }

    @Test
    @DisplayName("결재 결과를 결재자 이름으로 문자·메일 요청하고 채널마다 작업에서 정한 서로 다른 의도 키를 싣는다")
    void requestsBothChannelsWithDerivedIntentKeys() {
        SanctionStatusChangedEvent event = event(1L, "ESNTL_001", "SANCTIONER_001", SanctionStatus.APPROVED, "승인 의견");
        historyHas(1L, null);
        given(userService.getUserById("ESNTL_001")).willReturn(user("01011112222", "hong@egov.com"));
        DurableWork work = work(event);

        handler.execute(work);

        SmsRequestedEvent sms = onlyPublished(SmsRequestedEvent.class);
        MailRequestedEvent mail = onlyPublished(MailRequestedEvent.class);
        assertThat(sms.requesterId()).isEqualTo("SANCTIONER_001");
        assertThat(mail.requesterId()).isEqualTo("SANCTIONER_001");
        assertThat(sms.recipientTelno()).isEqualTo("01011112222");
        assertThat(sms.recipientEsntlId()).isEqualTo("ESNTL_001");
        assertThat(mail.recipientAddress()).isEqualTo("hong@egov.com");
        assertThat(mail.recipientName()).isEqualTo("홍길동");
        assertThat(sms.content())
                .isEqualTo("[eGov Enterprise] 귀하의 결재(번호 1)가 승인되었습니다.")
                .doesNotContain("APPROVED", "사유");
        assertThat(mail.content()).isEqualTo(sms.content());
        assertThat(mail.subject()).isEqualTo("[eGov] 결재 상태 변경 알림");

        assertThat(sms.intentKey()).isEqualTo(SanctionExternalNotificationWorkHandler.channelKey(work, "SMS"));
        assertThat(mail.intentKey()).isEqualTo(SanctionExternalNotificationWorkHandler.channelKey(work, "MAIL"));
        assertThat(sms.intentKey()).isNotEqualTo(mail.intentKey()).isNotEqualTo(work.key());
    }

    @Test
    @DisplayName("다시 실행해도 같은 의도 키를 싣는다 — 받는 서비스가 두 번째 접수를 만들지 않는 근거다")
    void replayCarriesTheSameIntentKeys() {
        SanctionStatusChangedEvent event = event(2L, "ESNTL_001", "SANCTIONER_001", SanctionStatus.APPROVED, null);
        historyHas(2L, null);
        given(userService.getUserById("ESNTL_001")).willReturn(user("01011112222", "hong@egov.com"));
        DurableWork work = work(event);

        handler.execute(work);
        handler.execute(work);

        assertThat(published(SmsRequestedEvent.class)).extracting(SmsRequestedEvent::intentKey).hasSize(2)
                .containsOnly(SanctionExternalNotificationWorkHandler.channelKey(work, "SMS"));
        assertThat(published(MailRequestedEvent.class)).extracting(MailRequestedEvent::intentKey).hasSize(2)
                .containsOnly(SanctionExternalNotificationWorkHandler.channelKey(work, "MAIL"));
    }

    @Test
    @DisplayName("반려 본문은 그 차수 이력의 반려 사유를 싣는다 — 작업 원장에서 읽지 않는다")
    void rejectionReasonComesFromTheCycleHistory() {
        SanctionStatusChangedEvent event = event(3L, "ESNTL_001", "SANCTIONER_001", SanctionStatus.REJECTED, "예산 코드 누락");
        historyHas(3L, "예산 코드 누락");
        given(userService.getUserById("ESNTL_001")).willReturn(user("01011112222", null));

        handler.execute(work(event));

        assertThat(onlyPublished(SmsRequestedEvent.class).content())
                .isEqualTo("[eGov Enterprise] 귀하의 결재(번호 3)가 반려되었습니다. 반려 사유: 예산 코드 누락");
        assertThat(published(MailRequestedEvent.class)).isEmpty();
    }

    @Test
    @DisplayName("문서가 지워졌으면 문자·메일을 요청하지 않는다")
    void deletedDocumentIsNotReconstructedFromTheQueue() {
        SanctionStatusChangedEvent event = event(4L, "ESNTL_001", "SANCTIONER_001", SanctionStatus.REJECTED, "사유");
        given(historyRepository.findById(any())).willReturn(Optional.empty());
        given(userService.getUserById("ESNTL_001")).willReturn(user("01011112222", "hong@egov.com"));

        handler.execute(work(event));

        verifyNoInteractions(eventPublisher);
    }

    @Test
    @DisplayName("actor 가 비어 있으면 SYSTEM 으로 폴백한다")
    void fallsBackToSystemWhenActorAbsent() {
        SanctionStatusChangedEvent event = event(5L, "ESNTL_001", null, SanctionStatus.APPROVED, null);
        historyHas(5L, null);
        given(userService.getUserById("ESNTL_001")).willReturn(user("01011112222", "hong@egov.com"));

        handler.execute(work(event));

        assertThat(onlyPublished(SmsRequestedEvent.class).requesterId()).isEqualTo("SYSTEM");
        assertThat(onlyPublished(MailRequestedEvent.class).requesterId()).isEqualTo("SYSTEM");
    }

    @Test
    @DisplayName("기안자 계정이 없으면 다시 시도하지 않고 건너뛴다")
    void missingApplicantIsSkippedWithoutRetry() {
        SanctionStatusChangedEvent event = event(6L, "GONE_001", "SANCTIONER_001", SanctionStatus.APPROVED, null);
        given(userService.getUserById("GONE_001")).willThrow(new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));

        handler.execute(work(event));

        verifyNoInteractions(eventPublisher, historyRepository);
    }

    @Test
    @DisplayName("사용자 저장소 장애는 되던져 작업을 다시 시도한다")
    void userStoreFailureRetriesTheWork() {
        SanctionStatusChangedEvent event = event(7L, "ESNTL_001", "SANCTIONER_001", SanctionStatus.APPROVED, null);
        given(userService.getUserById("ESNTL_001")).willThrow(new IllegalStateException("user store down"));

        assertThatThrownBy(() -> handler.execute(work(event))).isInstanceOf(IllegalStateException.class);
        verifyNoInteractions(eventPublisher);
    }

    @Test
    @DisplayName("연락처가 없는 수단은 요청하지 않는다")
    void skipsChannelsWithoutContact() {
        SanctionStatusChangedEvent event = event(8L, "ESNTL_001", "SANCTIONER_001", SanctionStatus.APPROVED, null);
        historyHas(8L, null);
        given(userService.getUserById("ESNTL_001")).willReturn(user("", null));

        handler.execute(work(event));

        verifyNoInteractions(eventPublisher);
    }

    @Test
    @DisplayName("문자 접수가 실패해도 메일은 요청하고, 그 실패를 되던져 작업을 다시 시도한다")
    void smsFailureStillRequestsMailThenRetries() {
        SanctionStatusChangedEvent event = event(9L, "ESNTL_001", "SANCTIONER_001", SanctionStatus.REJECTED, "사유");
        historyHas(9L, "사유");
        given(userService.getUserById("ESNTL_001")).willReturn(user("01011112222", "hong@egov.com"));
        doThrow(new IllegalStateException("sms storage unavailable"))
                .when(eventPublisher).publishEvent(any(SmsRequestedEvent.class));

        assertThatThrownBy(() -> handler.execute(work(event)))
                .isInstanceOf(IllegalStateException.class).hasMessage("sms storage unavailable");
        assertThat(published(MailRequestedEvent.class)).hasSize(1);
    }

    @Test
    @DisplayName("최대 길이 반려 사유도 문자·메일 본문 한도를 넘지 않는다")
    void boundsFinalChannelMessagesForMaximumReason() {
        SanctionStatusChangedEvent event = event(10L, "ESNTL_003", "SANCTIONER_001", SanctionStatus.REJECTED, "가".repeat(4_000));
        historyHas(10L, "가".repeat(4_000));
        given(userService.getUserById("ESNTL_003")).willReturn(user("01011112222", "user3@egov.com"));

        handler.execute(work(event));

        assertThat(onlyPublished(SmsRequestedEvent.class).content())
                .hasSize(4_000).startsWith("[eGov Enterprise]").endsWith("가");
        assertThat(onlyPublished(MailRequestedEvent.class).content())
                .hasSize(4_000).startsWith("[eGov Enterprise]").endsWith("가");
    }

    @Test
    @DisplayName("다른 유형의 작업은 실행하지 않는다")
    void rejectsForeignWork() {
        DurableWork foreign = new DurableWork(java.util.UUID.randomUUID(), "MAIL_DELIVERY", "{}");

        assertThatThrownBy(() -> handler.execute(foreign)).isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(userService, historyRepository, eventPublisher);
    }

    @Test
    @DisplayName("로그에는 결재 번호·상태·예외 타입만 남기고 외부 문자열과 개행을 기록하지 않는다")
    void logsOnlySafeSanctionMetadata() {
        Logger logger = (Logger) LoggerFactory.getLogger(SanctionExternalNotificationWorkHandler.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        String reason = "PII_REASON\r\nFORGED_REASON";
        UserDto user = UserDto.builder().userId("PII_USER_ID").esntlId("PII_ESNTL").userNm("PII_USER_NAME")
                .mblTelno("01098765432").emlAddr("pii-mail-marker@secret.invalid").build();
        try {
            historyHas(71L, reason);
            given(userService.getUserById("PII_APPLICANT_SUCCESS")).willReturn(user);
            handler.execute(work(event(71L, "PII_APPLICANT_SUCCESS", "PII_ACTOR", SanctionStatus.REJECTED, reason)));

            given(userService.getUserById("PII_APPLICANT_MISSING"))
                    .willThrow(new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND, "PII_LOOKUP\r\nFORGED_LOOKUP"));
            handler.execute(work(event(72L, "PII_APPLICANT_MISSING", "PII_ACTOR", SanctionStatus.REJECTED, reason)));

            historyHas(73L, reason);
            given(userService.getUserById("PII_APPLICANT_CHANNEL")).willReturn(user);
            doThrow(new IllegalArgumentException("PII_SMS_EXCEPTION\r\nFORGED_SMS_EXCEPTION"))
                    .when(eventPublisher).publishEvent(any(SmsRequestedEvent.class));
            doThrow(new UnsupportedOperationException("PII_MAIL_EXCEPTION\r\nFORGED_MAIL_EXCEPTION"))
                    .when(eventPublisher).publishEvent(any(MailRequestedEvent.class));
            assertThatThrownBy(() -> handler.execute(work(event(73L, "PII_APPLICANT_CHANNEL", "PII_ACTOR",
                    SanctionStatus.REJECTED, reason)))).isInstanceOf(IllegalArgumentException.class);

            given(historyRepository.findById(new InformalSanctionHistoryId(74L, BigDecimal.ONE))).willReturn(Optional.empty());
            given(userService.getUserById("PII_APPLICANT_DELETED")).willReturn(user);
            handler.execute(work(event(74L, "PII_APPLICANT_DELETED", "PII_ACTOR", SanctionStatus.REJECTED, reason)));
        } finally {
            logger.detachAppender(appender);
            appender.stop();
        }

        java.util.Set<Object> allowedArguments = java.util.Set.of(71L, 72L, 73L, 74L, SanctionStatus.REJECTED,
                "BusinessException", "IllegalArgumentException", "UnsupportedOperationException");
        assertThat(appender.list).isNotEmpty();
        for (ILoggingEvent loggingEvent : appender.list) {
            assertThat(loggingEvent.getThrowableProxy()).isNull();
            assertThat(loggingEvent.getFormattedMessage()).doesNotContain("\r", "\n");
            for (Object argument : loggingEvent.getArgumentArray()) {
                assertThat(allowedArguments).as("동적 로그 인자는 결재 번호·상태·예외 타입으로 제한한다").contains(argument);
            }
        }
        String formattedLogs = appender.list.stream().map(ILoggingEvent::getFormattedMessage)
                .collect(java.util.stream.Collectors.joining("|"));
        assertThat(formattedLogs)
                .contains("sanctionSn=71", "status=REJECTED", "exceptionType=BusinessException",
                        "exceptionType=IllegalArgumentException", "exceptionType=UnsupportedOperationException",
                        "sanctionSn=74")
                .doesNotContain("PII_", "FORGED_", "98765432", "secret.invalid");
    }
}
