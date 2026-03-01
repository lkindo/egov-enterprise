package com.company.project.service.sms;

import com.company.project.service.sms.dto.SmsDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * SMS ??�퉬???명꽣??�씠??
 */
public interface EgovSmsService {

    Page<SmsDto> getSmsList(String keyword, Pageable pageable);

    Page<SmsDto> getSmsList(String searchCondition, String searchKeyword, Pageable pageable);

    SmsDto getSms(String smsId);

    String sendSms(String userId, SmsDto dto);

    java.util.List<com.company.project.service.sms.dto.SmsRecptnDto> getSmsRecipients(String smsId);
}
