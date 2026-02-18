package com.company.project.service.sms;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.sms.Sms;
import com.company.project.domain.sms.SmsRecptn;
import com.company.project.domain.sms.SmsRecptnRepository;
import com.company.project.domain.sms.SmsRepository;
import com.company.project.service.sms.dto.SmsDto;
import com.company.project.service.sms.dto.SmsRecptnDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Objects;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SmsService implements EgovSmsService {

    private final SmsRepository smsRepository;
    private final SmsRecptnRepository smsRecptnRepository;
    private final SmsSender smsSender;

    @Override
    public Page<SmsDto> getSmsList(String keyword, Pageable pageable) {
        return getSmsList("1", keyword, pageable); // Default to content search
    }

    @Override
    public Page<SmsDto> getSmsList(String searchCondition, String searchKeyword, Pageable pageable) {
        return smsRepository.searchSms(searchCondition, searchKeyword, pageable).map(SmsDto::from);
    }

    @Override
    public SmsDto getSms(String smsId) {
        return smsRepository.findById(Objects.requireNonNull(smsId))
                .map(SmsDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public String sendSms(String userId, SmsDto dto) {
        String smsId = "SMS_" + String.format("%013d", System.currentTimeMillis());

        Sms sms = Sms.builder()
                .smsId(smsId)
                .trnsmitTelno(dto.getTrnsmitTelno())
                .trnsmitCn(dto.getTrnsmitCn())
                .build();

        smsRepository.save(Objects.requireNonNull(sms));

        if (dto.getRecipients() != null) {
            for (SmsRecptnDto recptnDto : dto.getRecipients()) {
                SmsRecptn recptn = SmsRecptn.builder()
                        .smsId(smsId)
                        .recptnTelno(recptnDto.getRecptnTelno())
                        .resultCode("P") // Pending
                        .build();
                smsRecptnRepository.save(Objects.requireNonNull(recptn));

                // 실제 SMS 발송 처리 (비동기 처리 고려 가능)
                try {
                    smsSender.send(dto.getTrnsmitTelno(), recptnDto.getRecptnTelno(), dto.getTrnsmitCn());
                    recptn.updateResult("S", "Success");
                } catch (Exception e) {
                    recptn.updateResult("F", e.getMessage());
                }
            }
        }

        return smsId;
    }

    @Override
    public List<SmsRecptnDto> getSmsRecipients(String smsId) {
        return smsRecptnRepository.findByIdSmsId(smsId).stream()
                .map(SmsRecptnDto::from)
                .collect(Collectors.toList());
    }
}
