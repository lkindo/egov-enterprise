package com.company.project.business.service.sms;

/**
 * Interface for SMS sending logic
 */
public interface SmsSender {

    /**
     * Sends an SMS message.
     *
     * @param recipientPhone the recipient's phone number
     * @param message the message content
     * @param senderPhone the sender's phone number
     * @return true if sending was successful, false otherwise
     */
    boolean send(String recipientPhone, String message, String senderPhone);
}
