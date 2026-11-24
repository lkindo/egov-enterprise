package nuri.business.service.informalsanction.event;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * 결재 이벤트 리스너
 * - 결재 승인/반려 시 알림 발송 로직 등을 처리한다.
 */
@Slf4j
@Component
public class SanctionEventListener {

    /**
     * 세 채널(문자·메일·앱 내 알림)을 모두 foundation 이벤트로 요청한다.
     *
     * <p>{@code SmsService}·{@code MailService}·{@code NotificationService} 를 주입하면 결재가 세 도메인에
     * 결합돼 교차 도메인 결합 census 가 늘어난다. 앱 내 알림은 처음부터 발행만 했고, 문자·메일도 이제
     * 같은 자리로 옮겼다 — GAP-ARCH-001 의 잔여 app→app 4건 중 이 리스너가 갖고 있던 둘이 그것이다.
     * 어느 쪽도 상대를 import 하지 않으므로 census 숫자만 내려가는 것이 아니라 실제로 떼어 낼 수 있다.
     * 문자·메일 요청은 {@link SanctionExternalNotificationWorkHandler} 가 커밋 뒤에 발행한다.
     */
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;

    /** 앱 알림 전에 기안자 계정이 있는지 본다 — 예외 없이 묻는다(업무 트랜잭션 안이라 던지면 결재까지 되돌아간다). */
    private final nuri.business.service.informalsanction.ApprovalRecipients approvalRecipients;

    /** 문자·메일 요청 의도를 결재와 같은 트랜잭션에 저장한다. */
    private final nuri.foundation.core.job.DurableWorkPort durableWork;

    public SanctionEventListener(org.springframework.context.ApplicationEventPublisher eventPublisher,
                                nuri.business.service.informalsanction.ApprovalRecipients approvalRecipients,
                                nuri.foundation.core.job.DurableWorkPort durableWork) {
        this.eventPublisher = eventPublisher;
        this.approvalRecipients = approvalRecipients;
        this.durableWork = durableWork;
    }

    @EventListener
    @org.springframework.transaction.annotation.Transactional(propagation = org.springframework.transaction.annotation.Propagation.MANDATORY)
    public void handleStatusChanged(SanctionStatusChangedEvent event) {
        boolean applicantExists = publishInAppNotification(event);
        if (applicantExists) {
            requestExternalChannels(event);
        }
    }

    /**
     * 문자·메일 요청 의도를 결재와 함께 저장한다(2026-11-25).
     *
     * <p>종전에는 커밋 뒤 {@code @Async} 이벤트로 요청해, 그 사이 프로세스 종료·실행기 거부가 외부 통지를 흔적 없이 잃었다.
     * 이제 의도가 결재와 같이 커밋되고 커밋 뒤 작업자가 요청한다. 저장 실패는 결재도 되돌린다 — 앱 내 알림 의도와 같은 규칙이다.
     * 기안자 계정이 지워졌으면 저장하지 않는다(보낼 사람이 없다).
     */
    private void requestExternalChannels(SanctionStatusChangedEvent event) {
        durableWork.enqueueOnce(SanctionExternalNotificationWorkHandler.key(event),
                SanctionExternalNotificationWorkHandler.TYPE,
                () -> SanctionExternalNotificationWorkHandler.payload(event));
    }

    /**
     * 앱 내 알림 요청.
     *
     * <p><b>SMS·메일과 별개의 실패 경계로 두는 이유</b> — 연락처 조회나 한 외부 채널이 실패해도
     * 앱 내 알림은 전달 가능한 유일한 경로다. 특히 이 배포에는 실 SMS 게이트웨이가 없어
     * <b>사실상 유일하게 도달하는 통지</b>이므로 부수적인 실패에 함께 묻히지 않게 한다.
     *
     * <p>이 경로는 업무 트랜잭션 안에서 동기 실행한다. 저장 실패를 삼키면 전달 의도를 잃는다.
     *
     * @return 기안자 계정이 있으면 true — 외부 채널 의도도 그때만 저장한다
     */
    private boolean publishInAppNotification(SanctionStatusChangedEvent event) {
        if (!org.springframework.util.StringUtils.hasText(event.getApplicantId())) {
            return false;
        }
        // [2026-11-19] 기안자 계정이 지워졌으면 앱 알림을 남기지 않는다. 결재 행은 사용자 삭제 뒤에도 남지만 알림 행은 사용자
        //   FK 가 있고 이 업무 트랜잭션 안에서 저장된다 — 보내면 FK 위반으로 결재자의 최종 승인·반려가 되돌아갔다.
        if (!approvalRecipients.exists(event.getApplicantId())) {
            log.warn("Applicant account no longer exists; result notices skipped: sanctionSn={}",
                    event.getInformalSanctionSn());
            return false;
        }
        eventPublisher.publishEvent(new nuri.foundation.core.event.NotificationRequestedEvent(
                event.getEventId(),
                event.getApplicantId(),
                "결재 상태 변경",
                SanctionResultText.bound(String.format("%s가 %s되었습니다.%s",
                        documentLabel(event), SanctionResultText.statusLabel(event.getNewStatus()),
                        SanctionResultText.reasonSuffix(event.getNewStatus(), event.getReason()))),
                // [2026-10-03 D1] 결과 알림은 내가 올린 결재의 그 문서로 바로 간다.
                "/approvals?tab=SUBMITTED&doc=" + event.getInformalSanctionSn()));
        return true;
    }

    /** 제목이 있으면 제목으로, 번호는 결재함 목록에서 찾는 열쇠로 함께 싣는다. 문자·메일 본문은 종전대로 번호만 쓴다. */
    private static String documentLabel(SanctionStatusChangedEvent event) {
        String number = "결재(번호 " + event.getInformalSanctionSn() + ")";
        return org.springframework.util.StringUtils.hasText(event.getDocumentTitle())
                ? "「" + event.getDocumentTitle().trim() + "」 " + number
                : number;
    }
}
