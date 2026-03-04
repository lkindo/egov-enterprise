package com.company.project.service.mail;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Default implementation of EmailSender that logs the email details.
 * This serves as a placeholder for actual Email sending integration when SMTP
 * is not configured.
 */
@Slf4j
@Component
@ConditionalOnProperty(prefix = "spring.mail", name = "host", havingValue = "false", matchIfMissing = true)
public class LoggingEmailSender implements EmailSender {

    @Override
    public void send(String subject, String content, String from, String to) {
        log.info("[EMAIL SENT] To: {}, From: {}, Subject: {}, Content: {}", to, from, subject, content);
    }
}
