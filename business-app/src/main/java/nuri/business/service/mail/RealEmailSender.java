package nuri.business.service.mail;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;
import java.util.Objects;

/**
 * Real implementation of EmailSender that sends actual emails using
 * JavaMailSender.
 * Active only when 'spring.mail.host' property is configured.
 */
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "spring.mail", name = "host")
public class RealEmailSender implements EmailSender {

    private final JavaMailSender javaMailSender;

    @Override
    public void send(String subject, String content, String from, String to) throws Exception {
        MimeMessage message = javaMailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        helper.setSubject(Objects.requireNonNull(subject));
        helper.setText(Objects.requireNonNull(content), true);
        // 종전에는 requireNonNull(from) 이 NullPointerException 으로 죽어 3회 재시도 뒤 실패로만 남았고,
        // 운영자는 "왜 실패했는가" 를 로그의 NPE 스택에서 역추적해야 했다. 원인을 문장으로 남긴다.
        if (from == null || from.isBlank()) {
            throw new IllegalStateException(
                    "발신 메일 주소가 비어 있습니다. nuri.mail.from 또는 spring.mail.username 을 설정하세요.");
        }
        helper.setFrom(from);
        helper.setTo(Objects.requireNonNull(to));

        javaMailSender.send(message);
    }
}
