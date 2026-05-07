package nuri.business.service.mail;

import java.util.Objects;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.business.domain.mail.SentMail;
import nuri.business.domain.mail.SentMailRepository;
import nuri.business.service.mail.dto.SentMailDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 메일 서비스 구현체
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MailService implements EgovMailService {

    private final SentMailRepository sentMailRepository;
    private final MailAsyncProcessor mailAsyncProcessor;

    @Override
    public Page<SentMailDto> getSentMailList(String keyword, Pageable pageable) {
        log.debug("Fetching sent mail list with keyword: {}", keyword);
        if (keyword == null || keyword.isEmpty()) {
            return sentMailRepository.findAll(Objects.requireNonNull(pageable)).map(SentMailDto::from);
        }
        return sentMailRepository.findBySjContaining(keyword, Objects.requireNonNull(pageable)).map(SentMailDto::from);
    }

    @Override
    public Page<SentMailDto> getSentMailList(String searchCondition, String searchKeyword, Pageable pageable) {
        log.debug("Searching sent mails with condition: {}, keyword: {}", searchCondition, searchKeyword);
        return sentMailRepository.searchSentMails(searchCondition, searchKeyword, Objects.requireNonNull(pageable))
                .map(SentMailDto::from);
    }

    @Override
    public SentMailDto getSentMail(String mssageId) {
        log.debug("Fetching mail details for ID: {}", mssageId);
        SentMail sentMail = sentMailRepository.findById(Objects.requireNonNull(mssageId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        return SentMailDto.from(sentMail);
    }

    @Override
    @Transactional
    public String sendMail(String userId, SentMailDto dto) {
        log.info("Sending mail requested by user: {}, subject: {}", userId, dto.getSj());
        String mssageId = nuri.foundation.core.util.IdGenerationUtil.generateMailId();

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

        // 비동기로 실제 발송 처리 요청
        mailAsyncProcessor.processSending(mssageId, dto.getSj(), dto.getEmailCn(), dto.getDsptchPerson(), dto.getRecptnPerson());

        log.info("Mail request registered successfully for ID: {}", mssageId);
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
