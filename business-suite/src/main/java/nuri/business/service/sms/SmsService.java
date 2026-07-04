package nuri.business.service.sms;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.business.domain.sms.Sms;
import nuri.business.domain.sms.SmsRecptn;
import nuri.business.domain.sms.SmsRecptnRepository;
import nuri.business.domain.sms.SmsRepository;
import nuri.business.service.sms.dto.SmsDto;
import nuri.business.service.sms.dto.SmsRecptnDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
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
public class SmsService implements EgovSmsService {

    private final SmsRepository smsRepository;
    private final SmsRecptnRepository smsRecptnRepository;
    private final SmsAsyncProcessor smsAsyncProcessor;

    @Override
    public Page<SmsDto> getSmsList(String keyword, Pageable pageable) {
        log.debug("Fetching SMS list with keyword: {}", keyword);
        return getSmsList("1", keyword, pageable); // Default to content search
    }

    @Override
    public Page<SmsDto> getSmsList(String searchCondition, String searchKeyword, Pageable pageable) {
        log.debug("Searching SMS with condition: {}, keyword: {}", searchCondition, searchKeyword);
        return smsRepository.searchSms(searchCondition, searchKeyword, pageable).map(SmsDto::from);
    }

    @Override
    public SmsDto getSms(String smsId) {
        log.debug("Fetching SMS details for ID: {}", smsId);
        return smsRepository.findById(Objects.requireNonNull(smsId))
                .map(SmsDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public String sendSms(String userId, SmsDto dto) {
        log.info("Sending SMS requested by user: {}, sender: {}", userId, dto.getSndngTelno());
        String smsId = nuri.foundation.core.util.IdGenerationUtil.generateSmsId();

        Sms sms = Sms.builder()
                .smsId(smsId)
                .sndngTelno(dto.getSndngTelno())
                .sndngCn(dto.getSndngCn())
                .build();

        smsRepository.save(Objects.requireNonNull(sms));

        if (dto.getRecipients() != null) {
            log.info("Registering {} recipients for SMS ID: {}", dto.getRecipients().size(), smsId);
            for (SmsRecptnDto recptnDto : dto.getRecipients()) {
                SmsRecptn recptn = SmsRecptn.builder()
                        .smsId(smsId)
                        .rcptnTelno(recptnDto.getRcptnTelno())
                        .rsltCd("P") // Pending
                        .build();
                smsRecptnRepository.save(Objects.requireNonNull(recptn));
            }
            
            // 비동기 발송은 이 트랜잭션이 커밋된 뒤에만 실행해야 한다. 커밋 전에 실행하면
            // REQUIRES_NEW 로 여는 별도 트랜잭션이 아직 커밋되지 않은 수신자 행을 못 보고
            // 아무것도 발송하지 못한 채 끝난다(발송 누락). 활성 트랜잭션이 없으면(예: 테스트) 즉시 실행한다.
            if (TransactionSynchronizationManager.isSynchronizationActive()) {
                TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        smsAsyncProcessor.processSending(smsId, dto.getSndngTelno(), dto.getSndngCn());
                    }
                });
            } else {
                smsAsyncProcessor.processSending(smsId, dto.getSndngTelno(), dto.getSndngCn());
            }
        }

        log.info("SMS request registered successfully for ID: {}", smsId);
        return smsId;
    }

    @Override
    public List<SmsRecptnDto> getSmsRecipients(String smsId) {
        return smsRecptnRepository.findByIdSmsId(smsId).stream()
                .map(SmsRecptnDto::from)
                .collect(Collectors.toList());
    }
}
