package nuri.business.service.mail;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * SMTP 미설정 시 진단 이벤트를 기록하고 발송 불가를 명시하는 구현.
 *
 * <p>⚠ 이름 그대로 <b>메일이 나가지 않는다</b>. 이 빈이 활성인 배포에서는 비밀번호 재발급·알림 메일이
 * 전부 로그로만 남는다. 운영에서 이 상태가 되지 않도록 {@code application-prod.yml} 이
 * {@code spring.mail.host} 를 무기본값으로 요구해 미설정 시 기동을 막는다(W1-13).
 *
 * <p>[W1-13] 종전에는 수신자와 <b>본문 전문</b>을 평문으로 기록했다. 본문에는 비밀번호 재발급 링크나
 * 인증 코드가 실릴 수 있어, 로그를 읽을 수 있는 사람이 계정을 탈취할 수 있는 경로였다.
 * 수신자·제목·본문은 기록하지 않으며, 미발송 상태가 성공으로 저장되지 않도록 예외를 반환한다.
 */
@Slf4j
@Component
@ConditionalOnProperty(prefix = "spring.mail", name = "host", havingValue = "false", matchIfMissing = true)
public class LoggingEmailSender implements EmailSender {

    @Override
    public void send(String subject, String content, String from, String to) {
        log.warn("Email delivery unavailable: SMTP is not configured");
        throw new MailDeliveryUnavailableException();
    }
}
