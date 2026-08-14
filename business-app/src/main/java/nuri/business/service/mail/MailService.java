package nuri.business.service.mail;
import nuri.foundation.core.exception.CommonErrorCode;

import java.util.Objects;
import nuri.foundation.core.exception.BusinessException;
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
public class MailService {

    private final SentMailRepository sentMailRepository;
    private final MailAsyncProcessor mailAsyncProcessor;

    /** 제목 키워드 조회. 검색조건 "1"(제목)로 위임하여 발신자 스코프가 동일하게 적용되도록 한다. */
    public Page<SentMailDto> getSentMailList(String keyword, Pageable pageable) {
        return getSentMailList("1", keyword, Objects.requireNonNull(pageable));
    }

    public Page<SentMailDto> getSentMailList(String searchCondition, String searchKeyword, Pageable pageable) {
        log.debug("Searching sent mails with condition: {}, keyword: {}", searchCondition, searchKeyword);
        // [IDOR] 일반 사용자는 자신이 발송한 건만, 관리자는 전건 — 발송메일 전건 노출 차단
        String senderLoginId = resolveSenderScope();
        return sentMailRepository
                .searchSentMails(senderLoginId, searchCondition, searchKeyword, Objects.requireNonNull(pageable))
                .map(SentMailDto::from);
    }

    public SentMailDto getSentMail(Long emlDsptchSn) {
        log.debug("Fetching mail details for dispatch serial number: {}", emlDsptchSn);
        SentMail sentMail = sentMailRepository.findById(Objects.requireNonNull(emlDsptchSn))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        nuri.business.security.util.SecurityUtil.assertOwnerOrAdmin(sentMail.getFrstRgtrId()); // [IDOR] 발신자/관리자만 열람
        return SentMailDto.from(sentMail);
    }

    /**
     * 발송메일 조회 스코프를 결정한다. 관리자(ADMIN/SYSTEM)는 전건({@code null}),
     * 일반 사용자는 자신의 loginId 로 한정한다.
     *
     * <p>소유 축은 감사 컬럼 {@code frstRgtrId}(=loginId, {@code LoginUserAuditorAware})이며
     * esntlId 가 아니다. — 백엔드 헌법 제8조(서비스 레이어 권한 재검증)</p>
     */
    private String resolveSenderScope() {
        if (nuri.business.security.util.SecurityUtil.hasRole(nuri.business.security.AuthorityConstants.ROLE_ADMIN)
                || nuri.business.security.util.SecurityUtil
                        .hasRole(nuri.business.security.AuthorityConstants.ROLE_SYSTEM)) {
            return null;
        }
        return nuri.business.security.util.SecurityUtil.getCurrentLoginId()
                .orElseThrow(() -> new BusinessException(CommonErrorCode.ACCESS_DENIED));
    }

    @Transactional
    public Long sendMail(String userId, SentMailDto dto) {
        log.info("Mail dispatch requested");

        SentMail sentMail = Objects.requireNonNull(SentMail.builder()
                .emlTtl(dto.getSj())
                .emlCn(dto.getEmailCn())
                .sndptyNm(dto.getDsptchPerson())
                .rcvrNm(dto.getRecptnPerson())
                .dsptchRsltCd("P") // Pending
                .atchFileId(dto.getAtchFileId())
                .build());

        SentMail savedMail = sentMailRepository.save(Objects.requireNonNull(sentMail));
        Long emlDsptchSn = Objects.requireNonNull(savedMail.getEmlDsptchSn(),
                "Generated email dispatch serial number must not be null");

        // 부모 트랜잭션 커밋 후 비동기 발송을 기동한다. 커밋 전 기동하면 processSending 의 REQUIRES_NEW
        // 새 트랜잭션이 미커밋 SentMail 을 못 봐(READ_COMMITTED) 상태 갱신이 스킵되어 'P' 로 영구 고착되던 문제 방지.
        final String subject = dto.getSj();
        final String emailCn = dto.getEmailCn();
        final String dsptchPerson = dto.getDsptchPerson();
        final String recptnPerson = dto.getRecptnPerson();
        nuri.foundation.core.util.TransactionUtils.runAfterCommit(() -> {
            try {
                mailAsyncProcessor.processSending(emlDsptchSn, subject, emailCn, dsptchPerson, recptnPerson);
            } catch (RuntimeException rejected) {
                // @Async 본문 예외는 호출자에게 나오지 않는다. 여기서 보이는 예외는 제출 거부다.
                // 커밋된 P 행을 방치하지 않고 명시적 실패로 바꿔 운영자가 재처리할 수 있게 한다.
                log.error("Mail dispatch queue rejected dispatch serial number: {}, errorType: {}",
                        emlDsptchSn, rejected.getClass().getSimpleName());
                mailAsyncProcessor.markResult(emlDsptchSn, "F");
            }
        });

        log.info("Mail request registered successfully for dispatch serial number: {}", emlDsptchSn);
        return emlDsptchSn;
    }

    @Transactional
    public void updateMailResult(Long emlDsptchSn, String resultCode) {
        SentMail sentMail = sentMailRepository.findById(Objects.requireNonNull(emlDsptchSn))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        sentMail.updateResult(resultCode);
    }

    @Transactional
    public void deleteMail(Long emlDsptchSn) {
        SentMail sentMail = sentMailRepository.findById(Objects.requireNonNull(emlDsptchSn))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        nuri.business.security.util.SecurityUtil.assertOwnerOrAdmin(sentMail.getFrstRgtrId()); // [IDOR] 발신자/관리자만 삭제
        sentMailRepository.delete(Objects.requireNonNull(sentMail));
    }
}
