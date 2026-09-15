package nuri.business.service.sms.listener;

import lombok.extern.slf4j.Slf4j;
import nuri.business.service.sms.SmsService;
import nuri.business.service.sms.dto.SmsDto;
import nuri.business.service.sms.dto.SmsRecptnDto;
import nuri.foundation.core.event.SmsRequestedEvent;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * 업무 도메인이 요청한 문자를 실제 발송으로 만든다.
 *
 * <p>{@code MailRequestListener} 와 같은 이유로 이벤트로 받고, 같은 이유로 {@code @Async} 를 쓰지 않는다.
 *
 * <p><b>발신 번호가 여기 있는 이유</b> — {@code nuri.notification.sender.tel} 은 업무 사실이 아니라 배포
 * 설정이고, 그것을 쓰는 것은 sms 도메인이다. 종전에는 {@code SanctionEventListener} 가 들고 있어 결재에서
 * 나가는 문자만 이 규칙을 따랐다. 이제 모든 문자 요청에 같은 규칙이 걸린다.
 *
 * <p>비어 있으면 문자 채널을 <b>건너뛴다</b>. 가짜 번호로 발송을 흉내 내면 실 게이트웨이가 거부하거나
 * 엉뚱한 번호로 귀속되므로, 안 보내고 warn 을 남기는 쪽이 정직하다.
 */
@Slf4j
@Component
public class SmsRequestListener {

    private final SmsService smsService;

    /** 시스템 발신 문자의 발신 번호. 비어 있으면 문자 채널을 건너뛴다. */
    private final String senderTel;

    public SmsRequestListener(SmsService smsService,
                              @Value("${nuri.notification.sender.tel:}") String senderTel) {
        this.smsService = smsService;
        this.senderTel = senderTel == null ? "" : senderTel.trim();
    }

    @EventListener
    public void onSmsRequested(SmsRequestedEvent event) {
        if (!event.hasRecipient()) {
            // 발행 측에서 걸러야 하지만, 수신 번호 없는 발송은 보낼 곳이 없는 이력만 남긴다.
            log.warn("수신 번호 없는 문자 요청을 무시합니다");
            return;
        }
        if (senderTel.isEmpty()) {
            log.warn("문자 발송을 건너뜁니다 — nuri.notification.sender.tel 이 설정되지 않았습니다");
            return;
        }
        try {
            smsService.sendSms(event.requesterId(), SmsDto.builder()
                    .sndngTelno(senderTel)
                    .sndngCn(event.content())
                    .recipients(List.of(SmsRecptnDto.builder()
                            .rcptnTelno(event.recipientTelno())
                            .build()))
                    .build());
            log.info("요청된 문자를 발송했습니다");
        } catch (Exception e) {
            log.error("문자 발송 실패(업무 처리에는 영향 없음) — 예외유형={}", e.getClass().getSimpleName());
        }
    }
}
