package com.company.project.service.mail;

import com.company.project.domain.mail.SentMail;
import com.company.project.domain.mail.SentMailRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * 메일 비동기 발송 처리를 담당하는 컴포넌트
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MailAsyncProcessor {

    private final EmailSender emailSender;
    private final SentMailRepository sentMailRepository;

    /**
     * 메일을 비동기로 발송하고 결과를 업데이트한다.
     */
    @Async("taskExecutor")
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void processSending(String mssageId, String sj, String emailCn, String dsptchPerson, String recptnPerson) {
        log.info("Async mail processing started for Message ID: {}", mssageId);
        
        try {
            emailSender.send(sj, emailCn, dsptchPerson, recptnPerson);
            
            SentMail sentMail = sentMailRepository.findById(mssageId).orElse(null);
            if (sentMail != null) {
                sentMail.updateResult("S"); // Success
                log.info("Mail sent successfully for ID: {}", mssageId);
            }
        } catch (Exception e) {
            log.error("Failed to send mail ID: {}, error: {}", mssageId, e.getMessage(), e);
            SentMail sentMail = sentMailRepository.findById(mssageId).orElse(null);
            if (sentMail != null) {
                sentMail.updateResult("F"); // Failure
            }
        }
    }
}
