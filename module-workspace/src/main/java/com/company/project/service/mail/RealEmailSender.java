package com.company.project.service.mail;

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
        helper.setFrom(Objects.requireNonNull(from));
        helper.setTo(Objects.requireNonNull(to));

        javaMailSender.send(message);
    }
}
