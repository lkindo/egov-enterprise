package com.company.project.domain.sms;

import com.company.project.domain.sms.Sms;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface SmsRepositoryCustom {
    Page<Sms> searchSmsUnits(String searchCondition, String searchKeyword, Pageable pageable);
}
