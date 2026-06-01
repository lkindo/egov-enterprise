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

    private final nuri.business.service.user.EgovUserService userService;
    private final nuri.business.service.sms.SmsService smsService;
    private final nuri.business.service.mail.MailService mailService;

    public SanctionEventListener(nuri.business.service.user.EgovUserService userService,
                                nuri.business.service.sms.SmsService smsService,
                                nuri.business.service.mail.MailService mailService) {
        this.userService = userService;
        this.smsService = smsService;
        this.mailService = mailService;
    }

    @Async("logExecutor")
    @EventListener
    public void handleStatusChanged(SanctionStatusChangedEvent event) {
        log.info(">>> [Event] Sanction Status Changed: ID={}, Applicant={}, NewStatus={}, Reason={}",
                event.getInformalSanctionId(), event.getApplicantId(), event.getNewStatus(), event.getReason());
        
        try {
            nuri.business.service.user.dto.UserDto user = userService.getUserById(event.getApplicantId());
            if (user == null) {
                log.warn("Applicant not found: {}", event.getApplicantId());
                return;
            }

            String message = String.format("[eGov Enterprise] 귀하의 결재(ID:%s)가 %s 되었습니다. 사유: %s",
                    event.getInformalSanctionId(), event.getNewStatus(), 
                    event.getReason() != null ? event.getReason() : "없음");

            // SMS 발송
            if (org.springframework.util.StringUtils.hasText(user.getMblTelno())) {
                nuri.business.service.sms.dto.SmsDto smsDto = nuri.business.service.sms.dto.SmsDto.builder()
                        .trnsmitTelno("02-1234-5678") // 대표번호
                        .trnsmitCn(message)
                        .recipients(java.util.List.of(nuri.business.service.sms.dto.SmsRecptnDto.builder()
                                .rcptnTelno(user.getMblTelno())
                                .build()))
                        .build();
                smsService.sendSms("SYSTEM", smsDto);
                log.info("SMS notification sent to {}", user.getMblTelno());
            }

            // Mail 발송
            if (org.springframework.util.StringUtils.hasText(user.getEmlAddr())) {
                nuri.business.service.mail.dto.SentMailDto mailDto = nuri.business.service.mail.dto.SentMailDto.builder()
                        .dsptchPerson("admin@egov.enterprise")
                        .sj("[eGov] 결재 상태 변경 알림")
                        .emailCn(message)
                        .recptnPerson(user.getEmlAddr())
                        .build();
                mailService.sendMail("SYSTEM", mailDto);
                log.info("Mail notification sent to {}", user.getEmlAddr());
            }

        } catch (Exception e) {
            log.error("Failed to send notification for sanction {}", event.getInformalSanctionId(), e);
        }
    }
}
