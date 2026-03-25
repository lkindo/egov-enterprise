package com.company.project.business.service.mail;

/**
 * Interface for Email sending logic.
 */
public interface EmailSender {

    /**
     * Sends an email.
     *
     * @param subject the email subject
     * @param content the email content (HTML supported)
     * @param from    the sender's email address
     * @param to      the recipient's email address
     * @throws Exception if sending fails
     */
    void send(String subject, String content, String from, String to) throws Exception;
}
