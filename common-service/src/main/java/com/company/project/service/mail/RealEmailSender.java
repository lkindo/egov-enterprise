package com.company.project.service.mail;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

/**
 * Real implementation of EmailSender that sends actual emails using JavaMailSender.
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

        helper.setSubject(subject);
        helper.setText(content, true);
        helper.setFrom(from);
        helper.setTo(to);

        javaMailSender.send(message);
    }
}
