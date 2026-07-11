package nuri.business.service.sms;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
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
    private final SmsMapper smsMapper;
    private final SmsRecptnMapper smsRecptnMapper;

    @Override
    public Page<SmsDto> getSmsList(String keyword, Pageable pageable) {
        log.debug("Fetching SMS list with keyword: {}", keyword);
        return getSmsList("1", keyword, pageable); // Default to content search
    }

    @Override
    public Page<SmsDto> getSmsList(String searchCondition, String searchKeyword, Pageable pageable) {
        log.debug("Searching SMS with condition: {}, keyword: {}", searchCondition, searchKeyword);
        return smsRepository.searchSms(searchCondition, searchKeyword, pageable).map(smsMapper::toDto);
    }

    @Override
    public SmsDto getSms(String smsId) {
        log.debug("Fetching SMS details for ID: {}", smsId);
        return smsRepository.findById(Objects.requireNonNull(smsId))
                .map(smsMapper::toDto)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
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
            
            // 비동기로 실제 발송 처리 요청
            // 주의: 현재 트랜잭션이 커밋된 후에 가동되도록 보장하거나, 
            // 별도 컴포넌트에서 REQUIRES_NEW로 조회하도록 설계됨
            smsAsyncProcessor.processSending(smsId, dto.getSndngTelno(), dto.getSndngCn());
        }

        log.info("SMS request registered successfully for ID: {}", smsId);
        return smsId;
    }

    @Override
    public List<SmsRecptnDto> getSmsRecipients(String smsId) {
        return smsRecptnRepository.findByIdSmsId(smsId).stream()
                .map(smsRecptnMapper::toDto)
                .collect(Collectors.toList());
    }
}
