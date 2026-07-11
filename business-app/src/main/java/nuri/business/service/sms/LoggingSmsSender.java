package nuri.business.service.sms;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Default implementation of SmsSender that logs the message.
 * This serves as a placeholder for actual SMS gateway integration.
 */
@Component
public class LoggingSmsSender implements SmsSender {

    private static final Logger LOGGER = LoggerFactory.getLogger(LoggingSmsSender.class);

    @Override
    public boolean send(String recipientPhone, String message, String senderPhone) {
        LOGGER.info("[SMS SENT] To: {}, From: {}, Message: {}", recipientPhone, senderPhone, message);
        return true;
    }
}
