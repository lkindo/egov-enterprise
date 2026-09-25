package nuri.business.service.mail.listener;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nuri.business.service.mail.MailService;
import nuri.business.service.mail.dto.SentMailDto;
import nuri.foundation.core.event.MailRequestedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * 업무 도메인이 요청한 메일을 실제 발송으로 만든다.
 *
 * <p><b>왜 이벤트로 받는가</b> — 발행 도메인이 {@link MailService} 를 직접 주입하면 결재·게시판·설문이
 * 저마다 mail 에 결합돼 교차 도메인 결합 census 가 늘어난다(GAP-ARCH-001 이 줄여 온 축이다).
 * {@code NotificationRequestListener} 와 같은 자리이며, 발행 측은 foundation 이벤트만 안다.
 *
 * <p><b>{@code @Async} 가 아닌 것은 의도다.</b> 현재 유일한 발행부인 {@code SanctionEventListener} 는 이미
 * {@code @Async("logExecutor")} 위에서 돌아 요청 스레드를 막지 않는다. 반면 {@code notificationExecutor} 는
 * 그 리스너가 알림을 다시 발행할 때의 교착을 막으려고 <b>앱 내 알림 전용으로 격리된</b> 자원이고 포화 시
 * 거부하므로, 외부 채널 발송이 그 큐를 나눠 쓰면 이 배포에서 사실상 유일하게 도달하는 통지가 밀려날 수 있다.
 * 동기 실행은 종전(같은 스레드에서 순차 발송)과 동일한 형태다.
 *
 * <p>[비파괴 원칙] 메일 발송 실패가 원 업무(결재 승인 등)를 되돌리면 안 된다. 예외를 흡수하고 로그만 남긴다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MailRequestListener {

    private final MailService mailService;

    @EventListener
    public void onMailRequested(MailRequestedEvent event) {
        if (!event.hasRecipient()) {
            // 발행 측에서 걸러야 하지만, 수신자 없는 발송은 보낼 곳이 없는 이력만 남긴다.
            log.warn("수신 주소 없는 메일 요청을 무시합니다");
            return;
        }
        try {
            // SMTP From 과 발신자 표시명은 MailService 가 설정(nuri.mail.from)과 요청자에서 정한다 —
            // 여기서 주소를 지어내지 않는다. 수신 주소는 발송에만 쓰이고 이력에는 이름이 남는다(DIP D8).
            mailService.sendToResolvedAddress(event.requesterId(), SentMailDto.builder()
                    .sj(event.subject())
                    .emailCn(event.content())
                    .build(), event.recipientAddress(), event.recipientName());
            log.info("요청된 메일을 발송했습니다");
        } catch (Exception e) {
            log.error("메일 발송 실패(업무 처리에는 영향 없음) — 예외유형={}", e.getClass().getSimpleName());
        }
    }
}
