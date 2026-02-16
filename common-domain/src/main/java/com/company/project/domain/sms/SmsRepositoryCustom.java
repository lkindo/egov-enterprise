package com.company.project.domain.sms;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface SmsRepositoryCustom {
    Page<Sms> searchSmsUnits(String searchCondition, String searchKeyword, Pageable pageable);

    Page<Sms> searchSms(String searchCondition, String searchKeyword, Pageable pageable);
}
