package nuri.business.service.mail;
import nuri.foundation.core.exception.CommonErrorCode;

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
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        return SentMailDto.from(sentMail);
    }

    @Override
    @Transactional
    public String sendMail(String userId, SentMailDto dto) {
        log.info("Sending mail requested by user: {}, subject: {}", userId, dto.getSj());
        String mssageId = nuri.foundation.core.util.IdGenerationUtil.generateMailId();

        SentMail sentMail = Objects.requireNonNull(SentMail.builder()
                .msgId(mssageId)
                .emlTtl(dto.getSj())
                .emlCn(dto.getEmailCn())
                .sndptyNm(dto.getDsptchPerson())
                .rcvrNm(dto.getRecptnPerson())
                .dsptchRsltCd("P") // Pending
                .atchFileId(dto.getAtchFileId())
                .build());

        sentMailRepository.save(Objects.requireNonNull(sentMail));

        // 부모 트랜잭션 커밋 후 비동기 발송을 기동한다. 커밋 전 기동하면 processSending 의 REQUIRES_NEW
        // 새 트랜잭션이 미커밋 SentMail 을 못 봐(READ_COMMITTED) 상태 갱신이 스킵되어 'P' 로 영구 고착되던 문제 방지.
        final String subject = dto.getSj();
        final String emailCn = dto.getEmailCn();
        final String dsptchPerson = dto.getDsptchPerson();
        final String recptnPerson = dto.getRecptnPerson();
        nuri.foundation.core.util.TransactionUtils.runAfterCommit(
                () -> mailAsyncProcessor.processSending(mssageId, subject, emailCn, dsptchPerson, recptnPerson));

        log.info("Mail request registered successfully for ID: {}", mssageId);
        return mssageId;
    }

    @Override
    @Transactional
    public void updateMailResult(String mssageId, String resultCode) {
        SentMail sentMail = sentMailRepository.findById(Objects.requireNonNull(mssageId))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        sentMail.updateResult(resultCode);
    }

    @Override
    @Transactional
    public void deleteMail(String mssageId) {
        SentMail sentMail = sentMailRepository.findById(Objects.requireNonNull(mssageId))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        sentMailRepository.delete(Objects.requireNonNull(sentMail));
    }
}
