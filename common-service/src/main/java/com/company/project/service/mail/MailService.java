package com.company.project.service.mail;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.mail.SentMail;
import com.company.project.domain.mail.SentMailRepository;
import com.company.project.service.mail.dto.SentMailDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 메일 서비스 구현체
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MailService implements EgovMailService {

    private final SentMailRepository sentMailRepository;

    @Override
    public Page<SentMailDto> getSentMailList(String keyword, Pageable pageable) {
        if (keyword == null || keyword.isEmpty()) {
            return sentMailRepository.findAll(pageable).map(SentMailDto::from);
        }
        return sentMailRepository.findBySjContaining(keyword, pageable).map(SentMailDto::from);
    }

    @Override
    public SentMailDto getSentMail(String mssageId) {
        SentMail sentMail = sentMailRepository.findById(mssageId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        return SentMailDto.from(sentMail);
    }

    @Override
    @Transactional
    public String sendMail(String userId, SentMailDto dto) {
        String mssageId = "MAIL_" + String.format("%013d", System.currentTimeMillis());

        SentMail sentMail = SentMail.builder()
                .mssageId(mssageId)
                .sj(dto.getSj())
                .emailCn(dto.getEmailCn())
                .dsptchPerson(dto.getDsptchPerson())
                .recptnPerson(dto.getRecptnPerson())
                .sndngResultCode("P") // Pending
                .frstRegisterId(userId)
                .build();

        sentMailRepository.save(sentMail);

        // TODO: 실제 메일 발송 로직 연동

        return mssageId;
    }

    @Override
    @Transactional
    public void updateMailResult(String mssageId, String resultCode) {
        SentMail sentMail = sentMailRepository.findById(mssageId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        sentMail.updateResult(resultCode);
    }
}
