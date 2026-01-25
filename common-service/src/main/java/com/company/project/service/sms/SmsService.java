package com.company.project.service.sms;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.sms.Sms;
import com.company.project.domain.sms.SmsRecptn;
import com.company.project.domain.sms.SmsRepository;
import com.company.project.service.sms.dto.SmsDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.stream.Collectors;

/**
 * SMS 서비스 구현체
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SmsService implements EgovSmsService {

    private final SmsRepository smsRepository;
    private final SmsSender smsSender;

    @Override
    public Page<SmsDto> getSmsList(String keyword, Pageable pageable) {
        if (keyword == null || keyword.isEmpty()) {
            return smsRepository.findAll(pageable).map(SmsDto::from);
        }
        return smsRepository.findByTrnsmitCnContaining(keyword, pageable).map(SmsDto::from);
    }

    @Override
    public SmsDto getSms(String smsId) {
        Sms sms = smsRepository.findById(smsId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        return SmsDto.from(sms);
    }

    @Override
    @Transactional
    public String sendSms(String userId, SmsDto dto) {
        String smsId = "SMS_" + String.format("%016d", System.currentTimeMillis());

        Sms sms = Sms.builder()
                .smsId(smsId)
                .trnsmitTelno(dto.getTrnsmitTelno())
                .trnsmitCn(dto.getTrnsmitCn())
                .recptnCnt(dto.getRecipients().size())
                .uniqId(userId)
                .frstRegisterId(userId)
                .build();

        // 수신자 목록 추가
        sms.getRecipients().addAll(dto.getRecipients().stream()
                .map(r -> SmsRecptn.builder()
                        .smsId(smsId)
                        .recptnTelno(r.getRecptnTelno())
                        .resultCode("9000") // Ready to send
                        .resultMssage("Ready")
                        .build())
                .collect(Collectors.toList()));

        smsRepository.save(sms);

        // 실제 SMS 발송 로직 연동
        for (SmsRecptn recipient : sms.getRecipients()) {
            boolean success = smsSender.send(recipient.getRecptnTelno(), sms.getTrnsmitCn(), sms.getTrnsmitTelno());
            if (success) {
                recipient.updateResult("0000", "SUCCESS");
            } else {
                recipient.updateResult("9999", "FAILED");
            }
        }

        return smsId;
    }
}
