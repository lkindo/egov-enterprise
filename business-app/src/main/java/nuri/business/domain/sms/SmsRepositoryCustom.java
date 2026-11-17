package nuri.business.domain.sms;

import org.jspecify.annotations.Nullable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface SmsRepositoryCustom {
    Page<Sms> searchSms(String searchCondition, String searchKeyword, @Nullable String senderLoginId, Pageable pageable);
}
