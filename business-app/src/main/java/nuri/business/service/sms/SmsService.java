package nuri.business.service.sms;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.foundation.core.exception.BusinessException;
import nuri.business.domain.sms.Sms;
import nuri.business.domain.sms.SmsRecptn;
import nuri.business.domain.sms.SmsRecptnRepository;
import nuri.business.domain.sms.SmsRepository;
import nuri.business.service.sms.dto.SmsDto;
import nuri.business.service.sms.dto.SmsRecptnDto;
import nuri.business.service.sms.dto.SmsMapper;
import nuri.business.service.sms.dto.SmsRecptnMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import jakarta.validation.Valid;
import java.util.Objects;
import java.util.List;
import java.util.stream.Collectors;

/**
 * SMS 서비스 구현체
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Validated
public class SmsService {

    private final SmsRepository smsRepository;
    private final SmsRecptnRepository smsRecptnRepository;
    private final SmsAsyncProcessor smsAsyncProcessor;
    private final SmsMapper smsMapper;
    private final SmsRecptnMapper smsRecptnMapper;

    public Page<SmsDto> getSmsList(String keyword, Pageable pageable) {
        log.debug("Fetching SMS list with keyword: {}", keyword);
        return getSmsList("1", keyword, pageable); // Default to content search
    }

    public Page<SmsDto> getSmsList(String searchCondition, String searchKeyword, Pageable pageable) {
        log.debug("Searching SMS with condition: {}, keyword: {}", searchCondition, searchKeyword);
        return smsRepository.searchSms(searchCondition, searchKeyword, pageable).map(smsMapper::toDto);
    }

    public SmsDto getSms(Long smsTrsmSn) {
        log.debug("Fetching SMS details for transmission serial number: {}", smsTrsmSn);
        return smsRepository.findById(Objects.requireNonNull(smsTrsmSn))
                .map(smsMapper::toDto)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
    }

    @Transactional
    public Long sendSms(String userId, @Valid SmsDto dto) {
        log.info("Sending SMS requested by user: {}, sender: {}", userId, nuri.foundation.core.util.PiiMaskUtil.phone(dto.getSndngTelno()));

        Sms sms = Sms.builder()
                .sndngTelno(dto.getSndngTelno())
                .sndngCn(dto.getSndngCn())
                .build();

        Sms savedSms = smsRepository.save(Objects.requireNonNull(sms));
        Long smsTrsmSn = Objects.requireNonNull(savedSms.getSmsTrsmSn(),
                "DB must generate SMS transmission serial number");

        if (dto.getRecipients() != null) {
            log.info("Registering {} recipients for SMS transmission serial number: {}",
                    dto.getRecipients().size(), smsTrsmSn);
            for (SmsRecptnDto recptnDto : dto.getRecipients()) {
                SmsRecptn recptn = SmsRecptn.builder()
                        .smsTrsmSn(smsTrsmSn)
                        .rcptnTelno(recptnDto.getRcptnTelno())
                        .rsltCd("P") // Pending
                        .build();
                smsRecptnRepository.save(Objects.requireNonNull(recptn));
            }
            
            // 부모 트랜잭션 커밋 후 비동기 발송을 기동한다. 커밋 전 기동하면 processSending 의 REQUIRES_NEW
            // 새 트랜잭션이 미커밋 수신자(READ_COMMITTED)를 못 봐 발송 루프가 no-op → SMS 영구 미발송되던 문제 방지.
            final String senderTel = dto.getSndngTelno();
            final String content = dto.getSndngCn();
            nuri.foundation.core.util.TransactionUtils.runAfterCommit(() -> {
                try {
                    smsAsyncProcessor.processSending(smsTrsmSn, senderTel, content);
                } catch (RuntimeException rejected) {
                    log.error("SMS dispatch queue rejected transmission serial number: {}, errorType: {}",
                            smsTrsmSn, rejected.getClass().getSimpleName());
                    smsAsyncProcessor.markBatchRejected(smsTrsmSn);
                }
            });
        }

        log.info("SMS request registered successfully for transmission serial number: {}", smsTrsmSn);
        return smsTrsmSn;
    }

    public List<SmsRecptnDto> getSmsRecipients(Long smsTrsmSn) {
        return smsRecptnRepository.findByIdSmsTrsmSn(smsTrsmSn).stream()
                .map(smsRecptnMapper::toDto)
                .collect(Collectors.toList());
    }
}
