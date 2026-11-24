package nuri.business.service.informalsanction.event;

import nuri.foundation.core.event.MailRequestedEvent;
import nuri.foundation.core.event.NotificationRequestedEvent;
import nuri.foundation.core.event.SmsRequestedEvent;
import nuri.foundation.core.job.DurableWork;
import nuri.foundation.core.job.DurableWorkPort;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.function.Supplier;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

/**
 * 이 리스너는 결재 트랜잭션 안에서 앱 내 알림을 요청하고 문자·메일 요청 의도를 함께 저장한다.
 *
 * <p>문자·메일 요청 자체({@link SanctionExternalNotificationWorkHandler})와 실제 발송(문자·메일 리스너)은 각자의 시험이 고정한다.
 * 여기서는 <b>무엇을 결재와 함께 저장·요청하는가</b>만 본다.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("SanctionEventListener 단위 테스트")
class SanctionEventListenerTest {

    /** 앱 내 알림이 이 발행자를 지난다. 문자·메일은 이제 여기서 발행하지 않는다. */
    @Mock
    private org.springframework.context.ApplicationEventPublisher eventPublisher;

    /** 앱 알림 전 기안자 계정 존재 확인. 기본은 '있다' — 지워진 기안자는 그 시험에서만 따로 정한다. */
    @Mock
    private nuri.business.service.informalsanction.ApprovalRecipients approvalRecipients;

    @Mock
    private DurableWorkPort durableWork;

    private SanctionEventListener sanctionEventListener;

    @org.junit.jupiter.api.BeforeEach
    void setUp() {
        sanctionEventListener = new SanctionEventListener(eventPublisher, approvalRecipients, durableWork);
        lenient().when(approvalRecipients.exists(any())).thenReturn(true);
        lenient().when(durableWork.enqueueOnce(any(), anyString(), any())).thenAnswer(call ->
                new DurableWork(call.getArgument(0), call.getArgument(1), call.<Supplier<String>>getArgument(2).get()));
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

    /** 저장한 외부 채널 의도의 payload. */
    @SuppressWarnings("unchecked")
    private String storedExternalIntent(UUID key) {
        ArgumentCaptor<Supplier<String>> payload = ArgumentCaptor.forClass((Class<Supplier<String>>) (Class<?>) Supplier.class);
        verify(durableWork).enqueueOnce(eq(key), eq(SanctionExternalNotificationWorkHandler.TYPE), payload.capture());
        return payload.getValue().get();
    }

    // ------------------------------------------------------------------
    // 문자·메일 — 결재와 같은 트랜잭션에 의도를 저장한다(2026-11-25).
    // ------------------------------------------------------------------

    @Test
    @DisplayName("결재 결과의 문자·메일 요청 의도를 사건 키로 결재와 함께 저장하고, 이 자리에서 직접 발행하지 않는다")
    void storesTheExternalChannelIntentWithTheDecision() {
        SanctionStatusChangedEvent event = new SanctionStatusChangedEvent(
                3L, "USER_001", "SANCTIONER_001", nuri.business.domain.informalsanction.SanctionStatus.REJECTED,
                "PII_REASON 예산 코드 누락", "출장비 정산", BigDecimal.valueOf(2));

        sanctionEventListener.handleStatusChanged(event);

        String payload = storedExternalIntent(SanctionExternalNotificationWorkHandler.key(event));
        assertThat(payload).contains("\"sanctionSn\":3", "\"cycle\":2", "\"status\":\"REJECTED\"", "USER_001", "SANCTIONER_001")
                .doesNotContain("PII_REASON", "출장비");
        // 커밋 뒤의 @Async 이벤트로 요청하지 않는다 — 그 사이 프로세스가 끝나면 통지가 사라졌다.
        assertThat(published(SmsRequestedEvent.class)).isEmpty();
        assertThat(published(MailRequestedEvent.class)).isEmpty();
    }

    @Test
    @DisplayName("기안자가 비어 있거나 계정이 지워졌으면 문자·메일 의도를 저장하지 않는다")
    void doesNotStoreExternalIntentWithoutAnApplicant() {
        given(approvalRecipients.exists("GONE_001")).willReturn(false);

        sanctionEventListener.handleStatusChanged(new SanctionStatusChangedEvent(
                21L, "GONE_001", "SANCTIONER_001", nuri.business.domain.informalsanction.SanctionStatus.APPROVED, null));
        sanctionEventListener.handleStatusChanged(new SanctionStatusChangedEvent(
                22L, " ", "SANCTIONER_001", nuri.business.domain.informalsanction.SanctionStatus.APPROVED, null));

        verifyNoInteractions(durableWork);
    }

    @Test
    @DisplayName("문자·메일 의도 저장이 실패하면 결재도 되돌린다 — 삼키면 통지 의도를 잃는다")
    void externalIntentFailurePropagates() {
        doThrow(new IllegalStateException("intent unavailable")).when(durableWork).enqueueOnce(any(), anyString(), any());
        var event = new SanctionStatusChangedEvent(23L, "USER_001", "SANCTIONER_001",
                nuri.business.domain.informalsanction.SanctionStatus.APPROVED, null);

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> sanctionEventListener.handleStatusChanged(event))
                .isInstanceOf(IllegalStateException.class);
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

        sanctionEventListener.handleStatusChanged(event);

        NotificationRequestedEvent requested = onlyPublished(NotificationRequestedEvent.class);
        assertThat(requested.receiverEsntlId()).isEqualTo("USER_001");
        assertThat(requested.content()).isEqualTo("결재(번호 7)가 승인되었습니다.");
        assertThat(requested.linkUrl()).isEqualTo("/approvals?tab=SUBMITTED&doc=7");
    }

    /**
     * [2026-11-19] 기안자 계정이 지워졌으면 앱 알림을 요청하지 않는다 — 알림 행은 사용자 FK 가 있고 결재와 같은 트랜잭션에 저장돼,
     * 요청하면 결재자의 최종 승인·반려가 FK 위반으로 되돌아갔다. 존재 확인은 예외를 던지지 않는 저장소 질의로 한다.
     */
    @Test
    @DisplayName("기안자 계정이 지워졌으면 앱 내 알림을 요청하지 않는다")
    void skipsInAppNotificationForDeletedApplicant() {
        SanctionStatusChangedEvent event = new SanctionStatusChangedEvent(
                11L, "GONE_001", "SANCTIONER_001",
                nuri.business.domain.informalsanction.SanctionStatus.APPROVED, "승인되었습니다.");
        given(approvalRecipients.exists("GONE_001")).willReturn(false);

        sanctionEventListener.handleStatusChanged(event);

        assertThat(published(NotificationRequestedEvent.class)).isEmpty();
        verify(approvalRecipients).exists("GONE_001");
    }

    @Test
    @DisplayName("반려 앱 내 알림은 한국어 상태명과 반려 사유를 싣는다")
    void rejectionInAppNotificationCarriesReason() {
        sanctionEventListener.handleStatusChanged(new SanctionStatusChangedEvent(
                9L, "USER_002", "SANCTIONER_001",
                nuri.business.domain.informalsanction.SanctionStatus.REJECTED, null));

        assertThat(onlyPublished(NotificationRequestedEvent.class).content())
                .isEqualTo("결재(번호 9)가 반려되었습니다. 반려 사유: 없음");
    }

    @Test
    @DisplayName("앱 내 알림은 문서 제목을 함께 말한다 — 번호만으로는 어느 결재인지 알 수 없다")
    void inAppNotificationNamesTheDocument() {
        // [2026-10-01] 종전 본문은 '결재(번호 N)' 뿐이었고 결재함 목록에는 번호가 보이지 않았다.
        SanctionStatusChangedEvent event = new SanctionStatusChangedEvent(
                12L, "USER_004", "SANCTIONER_001",
                nuri.business.domain.informalsanction.SanctionStatus.APPROVED, null, "출장비 정산");

        sanctionEventListener.handleStatusChanged(event);

        assertThat(onlyPublished(NotificationRequestedEvent.class).content())
                .isEqualTo("「출장비 정산」 결재(번호 12)가 승인되었습니다.");
    }

    @Test
    @DisplayName("최대 길이 반려 사유도 앱 알림의 최종 본문 한도를 넘지 않는다")
    void boundsInAppMessageForMaximumReason() {
        sanctionEventListener.handleStatusChanged(new SanctionStatusChangedEvent(
                10L, "USER_003", "SANCTIONER_001",
                nuri.business.domain.informalsanction.SanctionStatus.REJECTED, "가".repeat(4_000)));

        assertThat(onlyPublished(NotificationRequestedEvent.class).content())
                .hasSize(4_000)
                .startsWith("결재(번호 10)")
                .endsWith("가");
    }

    @Test
    @DisplayName("앱 내 알림 의도 저장이 실패하면 문자·메일 의도도 저장하지 않고 결재를 되돌린다")
    void inAppIntentFailurePropagatesBeforeExternalChannelsAreScheduled() {
        var event = new SanctionStatusChangedEvent(99L, "receiver", "actor",
                nuri.business.domain.informalsanction.SanctionStatus.APPROVED, null);
        doThrow(new IllegalStateException("intent unavailable"))
                .when(eventPublisher).publishEvent(any(NotificationRequestedEvent.class));

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> sanctionEventListener.handleStatusChanged(event))
                .isInstanceOf(IllegalStateException.class);
        verifyNoInteractions(durableWork);
    }
}
