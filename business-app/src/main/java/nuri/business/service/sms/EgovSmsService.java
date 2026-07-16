package nuri.business.service.sms;

import nuri.business.service.sms.dto.SmsDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * SMS 서비스 인터페이스
 */
public interface EgovSmsService {

    Page<SmsDto> getSmsList(String keyword, Pageable pageable);

    Page<SmsDto> getSmsList(String searchCondition, String searchKeyword, Pageable pageable);

    SmsDto getSms(String smsId);

    String sendSms(String userId, SmsDto dto);

    java.util.List<nuri.business.service.sms.dto.SmsRecptnDto> getSmsRecipients(String smsId);
}
