package nuri.business.service.mail;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * SMTP 가 설정되지 않았을 때 쓰이는 대체 구현. 실제로 발송하지 않고 <b>기록만</b> 한다.
 *
 * <p>⚠ 이름 그대로 <b>메일이 나가지 않는다</b>. 이 빈이 활성인 배포에서는 비밀번호 재발급·알림 메일이
 * 전부 로그로만 남는다. 운영에서 이 상태가 되지 않도록 {@code application-prod.yml} 이
 * {@code spring.mail.host} 를 무기본값으로 요구해 미설정 시 기동을 막는다(W1-13).
 *
 * <p>[W1-13] 종전에는 수신자와 <b>본문 전문</b>을 평문으로 기록했다. 본문에는 비밀번호 재발급 링크나
 * 인증 코드가 실릴 수 있어, 로그를 읽을 수 있는 사람이 계정을 탈취할 수 있는 경로였다.
 * 이제 수신자는 마스킹하고 본문은 길이만 남긴다 — "빈 메일이 나갔는가"를 판별하는 데는 충분하다.
 */
@Slf4j
@Component
@ConditionalOnProperty(prefix = "spring.mail", name = "host", havingValue = "false", matchIfMissing = true)
public class LoggingEmailSender implements EmailSender {

    @Override
    public void send(String subject, String content, String from, String to) {
        log.info("[EMAIL NOT SENT — SMTP 미설정] To: {}, From: {}, Subject: {}, Content: {}",
                nuri.foundation.core.util.PiiMaskUtil.email(to),
                nuri.foundation.core.util.PiiMaskUtil.email(from),
                subject,
                nuri.foundation.core.util.PiiMaskUtil.contentSummary(content));
    }
}
