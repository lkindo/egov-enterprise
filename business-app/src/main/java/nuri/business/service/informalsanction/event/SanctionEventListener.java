package nuri.business.service.informalsanction.event;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * 결재 이벤트 리스너
 * - 결재 승인/반려 시 알림 발송 로직 등을 처리한다.
 */
@Slf4j
@Component
public class SanctionEventListener {

    /** SMS·메일 저장 본문과 앱 알림 본문의 공통 물리 상한. */
    private static final int CHANNEL_CONTENT_MAX_LENGTH = 4_000;

    private final nuri.business.service.user.UserService userService;
    private final nuri.business.service.sms.SmsService smsService;
    private final nuri.business.service.mail.MailService mailService;

    /**
     * 앱 내 알림은 {@code NotificationService} 를 주입하지 않고 foundation 이벤트로 요청한다.
     *
     * <p>주입하면 informalsanction→notification 이라는 <b>새 교차 도메인 결합</b>이 생긴다.
     * 이 리스너는 이미 sms·mail 두 결합을 갖고 있고(GAP-ARCH-001 의 잔여 4건 중 둘),
     * 그 목록을 늘리는 대신 발행만 한다 — 어느 쪽도 상대를 import 하지 않는다.
     */
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;

    public SanctionEventListener(nuri.business.service.user.UserService userService,
                                nuri.business.service.sms.SmsService smsService,
                                nuri.business.service.mail.MailService mailService,
                                org.springframework.context.ApplicationEventPublisher eventPublisher) {
        this.userService = userService;
        this.smsService = smsService;
        this.mailService = mailService;
        this.eventPublisher = eventPublisher;
    }

    // 발행 자체가 커밋 후 이뤄지도록 발행부(confirmInformalSanction)에서 TransactionUtils.runAfterCommit 로 감싼다.
    // (@TransactionalEventListener + @Async 조합은 AsyncTransactionalListenerArchTest 게이트로 금지된다 — 커밋-전-async 방지.)
    @Async("logExecutor")
    @EventListener
    public void handleStatusChanged(SanctionStatusChangedEvent event) {
        log.info(">>> [Event] Sanction Status Changed: sanctionSn={}, status={}",
                event.getInformalSanctionSn(), event.getNewStatus());
        
        // [W1-D5] 이 리스너는 @Async 라 SecurityContext 가 없는 스레드에서 돈다(TaskDecorator 는
        //   프로덕션에서 의도적 no-op — 전파하면 비동기 경로 전체의 인가 판정 거동이 바뀐다).
        //   그래서 종전에는 발송 요청자를 리터럴 "SYSTEM" 으로 넘겨, 결재를 실제로 승인/반려한
        //   사람이 발송 이력에서 사라졌다. 이벤트가 이미 sanctionerId 를 싣고 오므로 그것을 쓴다.
        //   (sendSms/sendMail 의 첫 인자는 '요청자' 로그·이력 용도이며 인가 판정에 쓰이지 않는다 —
        //    권한 완화가 아니다. AGENTS.md Evidence guardrails H3)
        final String actorId = org.springframework.util.StringUtils.hasText(event.getSanctionerId())
                ? event.getSanctionerId()
                : "SYSTEM";

        nuri.business.service.user.dto.UserDto user = findApplicant(event);
        if (user != null) {
            String message = boundChannelContent(String.format(
                    "[eGov Enterprise] 귀하의 결재(ID:%s)가 %s 되었습니다. 사유: %s",
                    event.getInformalSanctionSn(), event.getNewStatus(), reasonOrDefault(event)));
            sendSms(event, actorId, user, message);
            sendMail(event, actorId, user, message);
        }

        publishInAppNotification(event);
    }

    private nuri.business.service.user.dto.UserDto findApplicant(SanctionStatusChangedEvent event) {
        try {
            nuri.business.service.user.dto.UserDto user = userService.getUserById(event.getApplicantId());
            if (user == null) {
                log.warn("Applicant not found: sanctionSn={}, status={}",
                        event.getInformalSanctionSn(), event.getNewStatus());
            }
            return user;
        } catch (Exception e) {
            log.error("Failed to load applicant: sanctionSn={}, status={}, exceptionType={}",
                    event.getInformalSanctionSn(), event.getNewStatus(), e.getClass().getSimpleName());
            return null;
        }
    }

    private void sendSms(SanctionStatusChangedEvent event, String actorId,
            nuri.business.service.user.dto.UserDto user, String message) {
        if (!org.springframework.util.StringUtils.hasText(user.mblTelno())) {
            return;
        }
        try {
            nuri.business.service.sms.dto.SmsDto smsDto = nuri.business.service.sms.dto.SmsDto.builder()
                    .sndngTelno("02-1234-5678") // 대표번호
                    .sndngCn(message)
                    .recipients(java.util.List.of(nuri.business.service.sms.dto.SmsRecptnDto.builder()
                            .rcptnTelno(user.mblTelno())
                            .build()))
                    .build();
            smsService.sendSms(actorId, smsDto);
            log.info("SMS notification sent: sanctionSn={}, status={}",
                    event.getInformalSanctionSn(), event.getNewStatus());
        } catch (Exception e) {
            log.error("Failed to send SMS notification: sanctionSn={}, status={}, exceptionType={}",
                    event.getInformalSanctionSn(), event.getNewStatus(), e.getClass().getSimpleName());
        }
    }

    private void sendMail(SanctionStatusChangedEvent event, String actorId,
            nuri.business.service.user.dto.UserDto user, String message) {
        if (!org.springframework.util.StringUtils.hasText(user.emlAddr())) {
            return;
        }
        try {
            nuri.business.service.mail.dto.SentMailDto mailDto = nuri.business.service.mail.dto.SentMailDto.builder()
                    .dsptchPerson("admin@egov.enterprise")
                    .sj("[eGov] 결재 상태 변경 알림")
                    .emailCn(message)
                    .recptnPerson(user.emlAddr())
                    .build();
            mailService.sendMail(actorId, mailDto);
            log.info("Mail notification sent: sanctionSn={}, status={}",
                    event.getInformalSanctionSn(), event.getNewStatus());
        } catch (Exception e) {
            log.error("Failed to send mail notification: sanctionSn={}, status={}, exceptionType={}",
                    event.getInformalSanctionSn(), event.getNewStatus(), e.getClass().getSimpleName());
        }
    }

    /**
     * 앱 내 알림 요청.
     *
     * <p><b>SMS·메일과 별개의 실패 경계로 두는 이유</b> — 연락처 조회나 한 외부 채널이 실패해도
     * 앱 내 알림은 전달 가능한 유일한 경로다. 특히 이 배포에는 실 SMS 게이트웨이가 없어
     * <b>사실상 유일하게 도달하는 통지</b>이므로 부수적인 실패에 함께 묻히지 않게 한다.
     *
     * <p>이 리스너는 발행부가 커밋 이후 발행하도록 감싸 두었으므로 여기서 추가 트랜잭션 경계를
     * 두지 않는다.
     */
    private void publishInAppNotification(SanctionStatusChangedEvent event) {
        if (!org.springframework.util.StringUtils.hasText(event.getApplicantId())) {
            return;
        }
        try {
            eventPublisher.publishEvent(new nuri.foundation.core.event.NotificationRequestedEvent(
                    event.getApplicantId(),
                    "결재 상태 변경",
                    boundChannelContent(String.format("결재(ID:%s)가 %s 되었습니다. 사유: %s",
                            event.getInformalSanctionSn(), event.getNewStatus(), reasonOrDefault(event))),
                    "/approvals"));
        } catch (Exception e) {
            log.error("Failed to request in-app notification: sanctionSn={}, status={}, exceptionType={}",
                    event.getInformalSanctionSn(), event.getNewStatus(), e.getClass().getSimpleName());
        }
    }

    private static String reasonOrDefault(SanctionStatusChangedEvent event) {
        return org.springframework.util.StringUtils.hasText(event.getReason()) ? event.getReason() : "없음";
    }

    /** 접두어를 포함해 완성된 채널 본문을 자르며 UTF-16 surrogate pair는 분리하지 않는다. */
    private static String boundChannelContent(String content) {
        if (content.length() <= CHANNEL_CONTENT_MAX_LENGTH) {
            return content;
        }
        int end = CHANNEL_CONTENT_MAX_LENGTH;
        if (Character.isHighSurrogate(content.charAt(end - 1))) {
            end--;
        }
        return content.substring(0, end);
    }
}
