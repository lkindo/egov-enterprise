package com.company.project.service.mail;

import java.util.Objects;
import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.mail.SentMail;
import com.company.project.domain.mail.SentMailRepository;
import com.company.project.service.mail.dto.SentMailDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 硫붿????퉬???ы쁽?
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MailService implements EgovMailService {

    private final SentMailRepository sentMailRepository;
    private final EmailSender emailSender;

    @Override
    public Page<SentMailDto> getSentMailList(String keyword, Pageable pageable) {
        if (keyword == null || keyword.isEmpty()) {
            return sentMailRepository.findAll(Objects.requireNonNull(pageable)).map(SentMailDto::from);
        }
        return sentMailRepository.findBySjContaining(keyword, Objects.requireNonNull(pageable)).map(SentMailDto::from);
    }

    @Override
    public Page<SentMailDto> getSentMailList(String searchCondition, String searchKeyword, Pageable pageable) {
        return sentMailRepository.searchSentMails(searchCondition, searchKeyword, Objects.requireNonNull(pageable))
                .map(SentMailDto::from);
    }

    @Override
    public SentMailDto getSentMail(String mssageId) {
        SentMail sentMail = sentMailRepository.findById(Objects.requireNonNull(mssageId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        return SentMailDto.from(sentMail);
    }

    @Override
    @Transactional
    public String sendMail(String userId, SentMailDto dto) {
        String mssageId = "MAIL_" + String.format("%013d", System.currentTimeMillis());

        SentMail sentMail = Objects.requireNonNull(SentMail.builder()
                .mssageId(mssageId)
                .sj(dto.getSj())
                .emailCn(dto.getEmailCn())
                .dsptchPerson(dto.getDsptchPerson())
                .recptnPerson(dto.getRecptnPerson())
                .sndngResultCode("P") // Pending
                .atchFileId(dto.getAtchFileId())
                .build());

        sentMailRepository.save(Objects.requireNonNull(sentMail));

        try {
            emailSender.send(dto.getSj(), dto.getEmailCn(), dto.getDsptchPerson(), dto.getRecptnPerson());

            sentMail.updateResult("S"); // Success
        } catch (Exception e) {
            log.error("Failed to send mail: {}", e.getMessage(), e);
            sentMail.updateResult("F"); // Failure
        }

        return mssageId;
    }

    @Override
    @Transactional
    public void updateMailResult(String mssageId, String resultCode) {
        SentMail sentMail = sentMailRepository.findById(Objects.requireNonNull(mssageId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        sentMail.updateResult(resultCode);
    }

    @Override
    @Transactional
    public void deleteMail(String mssageId) {
        SentMail sentMail = sentMailRepository.findById(Objects.requireNonNull(mssageId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        sentMailRepository.delete(Objects.requireNonNull(sentMail));
    }
}
